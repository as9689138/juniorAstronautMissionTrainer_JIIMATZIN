"""Voz de la IA para lo que no grabó el rol 5: los avisos que arma el juego (español e inglés) y las líneas de la IA
de historia.ink en inglés. MISMA voz y mismos ajustes que el rol 5 (8_casting_voces/generar_voz.py):
  - Chatterbox Multilingual (Resemble AI, MIT), en CPU, clonando SIEMPRE voces/IA.wav;
    español: la versión latinoamericana (t3_es_mx_latam); inglés: el modelo multilingüe base;
  - expresividad 0,55 (la etiqueta cara la sube o baja un poco), variante "natural" (cfg 0,5, temp. 0,8) en líneas
    cortas y "conversacional" (cfg 0,3, temp. 0,9) en las de 120 caracteres o más; semilla 7; reintento si se
    salta palabras (más de 18 caracteres por segundo);
  - después, como organiza.py: recorta silencios, -16 LUFS, 0,12 s al inicio y 0,25 s al final, MP3 24 kHz mono.

Entrada: lineas_ia.json (node enumerar.mjs <frontend>).
Salida: <frontend>/public/assets/audio/voces/ia/{es,en}/<id>.mp3 e indice.json (texto normalizado -> archivo).
Se puede cortar y retomar: solo genera lo que falta (borra wav_ia/<id>.wav para rehacer una línea).

Uso: .venv-cb\\Scripts\\python generar.py <frontend> [--idioma es|en] [--solo-indice]
"""
import argparse
import json
import re
import shutil
import subprocess
import time
import unicodedata
from pathlib import Path

AQUI = Path(__file__).resolve().parent
WAV = AQUI / "wav_ia"
REFERENCIA = AQUI / "voces" / "IA.wav"
SEMILLA = 7
LARGA = 120
VARIANTE = {"B": {"cfg_weight": 0.5, "temperature": 0.8}, "C": {"cfg_weight": 0.3, "temperature": 0.9}}
EXPRESIVIDAD = 0.55
AJUSTE_CARA = {"feliz": 0.05, "sonriente": 0.05, "asombrada": 0.1, "curiosa": 0.05, "orgulloso": 0.05,
               "sorprendido": 0.1, "sereno": -0.05, "procesando": -0.05, "preocupado": -0.05}
MAX_CARACTERES_POR_SEG = 18
FILTRO = ("silenceremove=start_periods=1:start_threshold=-50dB,areverse,"
          "silenceremove=start_periods=1:start_threshold=-50dB,areverse,"
          "loudnorm=I=-16:TP=-1.5:LRA=11,aresample=24000,"
          "adelay=120:all=1,apad=pad_dur=0.25")


def normalizar(t: str) -> str:
    """Igual que normalizar() de src/motor/idioma.js: sin acentos, minúsculas, solo letras y números."""
    t = unicodedata.normalize("NFD", t)
    t = "".join(c for c in t if not unicodedata.combining(c)).lower()
    return re.sub(r"[^a-z0-9]+", " ", t).strip()


def ffmpeg_exe() -> str:
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


class Chatterbox:
    def __init__(self, idioma: str):
        import torch
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS
        torch.set_num_threads(10)
        self.torch = torch
        # modelos/: los de ResembleAI/Chatterbox-Multilingual-es-mx-latam y ResembleAI/chatterbox; el decodificador v3
        # (s3gen_v3.pt) va como s3gen.pt, que es el nombre que lee from_local
        t3 = {"es": "t3_es_mx_latam.safetensors", "en": "t3_mtl23ls_v3.safetensors"}[idioma]
        self.m = ChatterboxMultilingualTTS.from_local(AQUI / "modelos", "cpu", t3_model=t3)
        self.idioma = idioma

    def __call__(self, l):
        texto = l["texto_tts"]
        variante = "C" if len(texto) >= LARGA else "B"
        exa = round(EXPRESIVIDAD + AJUSTE_CARA.get(l.get("cara") or "", 0), 2)
        for intento in range(3):
            v = variante if intento < 2 else "B"
            self.torch.manual_seed(SEMILLA + intento)
            wav = self.m.generate(texto, language_id=self.idioma, audio_prompt_path=str(REFERENCIA),
                                  exaggeration=exa, **VARIANTE[v])
            audio = wav.squeeze(0).cpu().numpy()
            ritmo = len(texto) / max(len(audio) / self.m.sr, 0.1)
            if ritmo <= MAX_CARACTERES_POR_SEG:
                break
        return audio, self.m.sr, f"variante {v}, expresividad {exa}" + (f", {intento} reintento(s)" if intento else "")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("frontend")
    ap.add_argument("--idioma", choices=["es", "en"], action="append")
    ap.add_argument("--solo-indice", action="store_true", help="no genera: solo convierte y rehace el índice")
    ap.add_argument("--limite", type=int, default=0, help="genera solo las primeras N que falten (para probar)")
    a = ap.parse_args()
    idiomas = a.idioma or ["es", "en"]
    destino = Path(a.frontend) / "public/assets/audio/voces/ia"
    lineas = json.loads((AQUI / "lineas_ia.json").read_text(encoding="utf-8"))
    WAV.mkdir(exist_ok=True)
    ffmpeg = ffmpeg_exe()

    for idioma in idiomas:
        mias = [l for l in lineas if l["idioma"] == idioma]
        faltan = [l for l in mias if not (WAV / f"{l['id']}.wav").exists()]
        if a.limite:
            faltan = faltan[:a.limite]
        print(f"[{idioma}] {len(mias)} líneas, faltan {len(faltan)}", flush=True)
        if faltan and not a.solo_indice:
            import soundfile as sf
            t0 = time.time()
            motor = Chatterbox(idioma)
            print(f"[{idioma}] modelo cargado en {time.time() - t0:.0f} s", flush=True)
            for i, l in enumerate(faltan, 1):
                t = time.time()
                audio, sr, nota = motor(l)
                sf.write(WAV / f"{l['id']}.wav", audio, sr)
                print(f"[{idioma}] {i}/{len(faltan)} {l['id']}: {len(audio) / sr:.1f} s en {time.time() - t:.0f} s · {nota}",
                      flush=True)

        # MP3 + índice
        (destino / idioma).mkdir(parents=True, exist_ok=True)
        for l in mias:
            wav, mp3 = WAV / f"{l['id']}.wav", destino / idioma / f"{l['id']}.mp3"
            if not wav.exists() or (mp3.exists() and mp3.stat().st_mtime >= wav.stat().st_mtime):
                continue
            subprocess.run([ffmpeg, "-y", "-loglevel", "error", "-i", str(wav), "-af", FILTRO, "-ac", "1",
                            "-codec:a", "libmp3lame", "-b:a", "48k", str(mp3)], check=True)
        indice_ruta = destino / "indice.json"
        indice = json.loads(indice_ruta.read_text(encoding="utf-8")) if indice_ruta.exists() else {}
        indice[idioma] = {normalizar(l["texto"]): f"{l['id']}.mp3" for l in mias
                          if (destino / idioma / f"{l['id']}.mp3").exists()}
        indice_ruta.write_text(json.dumps(indice, ensure_ascii=False, indent=0), encoding="utf-8")
        textos = {l["id"]: l["texto"] for l in mias}
        (destino / f"textos_{idioma}.json").write_text(json.dumps(textos, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"[{idioma}] índice: {len(indice[idioma])} de {len(mias)} con audio", flush=True)


if __name__ == "__main__":
    main()
