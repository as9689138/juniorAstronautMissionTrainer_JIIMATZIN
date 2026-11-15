"""Mide qué tan fácil de leer es el texto del juego (índice INFLESZ, para español).

Uso:  python herramientas/legibilidad.py [archivo.docx ...]

Mide:
  - las frases del robot (src/compania/robot.js),
  - la historia en Ink (historia/*.ink) cuando el rol 5 la suba,
  - y cualquier .docx que se pase (por ejemplo, el guion narrativo).
Escribe el informe en docs/legibilidad.md.

INFLESZ (Barrio-Cantalejo y otros, 2008) usa la fórmula de perspicuidad de Szigriszt-Pazos:
    P = 206,835 − 62,3 × (sílabas / palabras) − (palabras / frases)
Escala: < 40 muy difícil · 40-55 algo difícil · 55-65 normal · 65-80 bastante fácil · > 80 muy fácil.
Meta para niños de 7 a 12 años: 65 o más ("bastante fácil"). Es una guía, no una nota:
una frase corta con una palabra difícil puede puntuar bien y aun así confundir.
"""
import re
import sys
import zipfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
INFORME = RAIZ / "docs-internos" / "legibilidad.md"
META = 65
MAX_CARACTERES = 90           # burbujas del mapa (docs/aprendizaje.md)
MIN_PALABRAS = 8              # con menos palabras la fórmula no es fiable (títulos, pistas)
# Palabras largas que el juego ENSEÑA a propósito: no cuentan como "raras"
PALABRAS_DEL_JUEGO = {"astronauta", "astronautas", "oxígeno", "emergencia", "energía", "radiación", "pronóstico",
    "llamarada", "llamaradas", "comunicaciones", "invernadero", "opportunity", "tripulación", "estación",
    "espacial", "espaciales", "explorador", "exploradora", "memoria", "blindaje", "minijuego", "científica",
    "ingeniero", "temperatura", "batería", "paneles", "naturaleza", "probabilidad"}

FUERTES = set("aeoáéóíú")     # í y ú con tilde rompen el diptongo (hiato)
DEBILES = set("iuü")
VOCALES = FUERTES | DEBILES


# --- Sílabas en español (aproximado, ~95 % de acierto) -------------------------------
def silabas(palabra: str) -> int:
    p = palabra.lower()
    p = re.sub(r"(?<=[qg])u(?=[eiéí])", "", p)          # que, qui, gue, gui: la u no suena
    p = re.sub(r"y$", "i", p)                            # hoy, muy: la y final es vocal
    n, anterior = 0, None
    for ch in p:
        if ch in VOCALES:
            if anterior is None:
                n += 1                                   # empieza un núcleo nuevo
            elif anterior in FUERTES and ch in FUERTES:
                n += 1                                   # hiato: dos fuertes (o débil con tilde)
            anterior = ch
        else:
            anterior = None
    return max(1, n)


def inflesz(texto: str):
    frases = [f for f in re.split(r"[.!?¡¿…:;]+", texto) if re.search(r"[a-záéíóúñü]", f, re.I)]
    palabras = re.findall(r"[a-záéíóúñü]+", texto, re.I)
    if not palabras or not frases:
        return None
    s = sum(silabas(w) for w in palabras)
    return 206.835 - 62.3 * s / len(palabras) - len(palabras) / len(frases)


def nivel(p):
    return ("muy difícil" if p < 40 else "algo difícil" if p < 55 else "normal" if p < 65
            else "bastante fácil" if p < 80 else "muy fácil")


# --- Fuentes de texto ---------------------------------------------------------------------
def textos_robot():
    js = (RAIZ / "src" / "compania" / "robot.js").read_text(encoding="utf-8")
    js = re.sub(r"^\s*//.*$", "", js, flags=re.M)                     # sin comentarios
    salida = []
    for m in re.finditer(r"'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`", js):
        t = m.group(1) if m.group(1) is not None else m.group(2)
        # Valores de ejemplo para las plantillas ${...}
        t = re.sub(r"\$\{[^}]*porcentaje[^}]*\}", "13", t)
        t = re.sub(r"\$\{cuantos\}", "en 3", t)
        t = re.sub(r"\$\{[^}]*fecha[^}]*\}", "5 de noviembre", t)
        t = re.sub(r"\$\{[^}]*titulo[^}]*\}", "El rompecabezas del Apolo 13", t)
        t = re.sub(r"\$\{String\([^}]*\}", "02", t)
        t = re.sub(r"\$\{[^}]*(abiertas|size)[^}]*\}", "3", t)
        t = re.sub(r"\$\{[^}]*length[^}]*\}", "8", t)
        t = re.sub(r"\$\{[^}]*\}", "", t)
        if len(re.findall(r"[a-záéíóúñü]+", t, re.I)) >= 4 and re.search(r"[áéíóúñ¡¿]|\b(el|la|de|que|en)\b", t):
            salida.append(("Robot (mapa)", t.strip()))
    return salida


def textos_ink():
    salida = []
    for f in sorted((RAIZ / "historia").glob("*.ink")) if (RAIZ / "historia").exists() else []:
        for linea in f.read_text(encoding="utf-8").splitlines():
            l = linea.strip()
            if not l or l.startswith(("===", "=", "~", "->", "VAR", "CONST", "//", "INCLUDE", "{")):
                continue
            l = re.sub(r"#.*$", "", l)                         # etiquetas
            l = re.sub(r"^[*+\-]+\s*", "", l)                  # opciones y viñetas
            l = re.sub(r"\[|\]|->\s*\w+", "", l).strip()
            if len(re.findall(r"[a-záéíóúñü]+", l, re.I)) >= 4:
                salida.append((f"Ink: {f.name}", l))
    return salida


def textos_docx(ruta):
    xml = zipfile.ZipFile(ruta).read("word/document.xml").decode("utf-8")
    salida = []
    for p in re.findall(r"<w:p[ >].*?</w:p>", xml, re.S):
        t = "".join(re.findall(r"<w:t[^>]*>(.*?)</w:t>", p, re.S)).strip()
        # Solo lo que se dice en el juego: las citas «...»
        for cita in re.findall(r"«([^»]+)»", t):
            if len(re.findall(r"[a-záéíóúñü]+", cita, re.I)) >= 4:
                salida.append((f"Guion: {Path(ruta).name}", cita.strip()))
    return salida


def main():
    textos = textos_robot() + textos_ink()
    for ruta in sys.argv[1:]:
        textos += textos_docx(ruta)
    filas = [(fuente, t, inflesz(t)) for fuente, t in textos]
    filas = [f for f in filas if f[2] is not None]
    cortos = [f for f in filas if len(re.findall(r"[a-záéíóúñü]+", f[1], re.I)) < MIN_PALABRAS]
    filas = [f for f in filas if f not in cortos]
    # Palabras de 4 o más sílabas que no son del vocabulario que el juego enseña
    from collections import Counter
    raras = Counter(w.lower() for _, t, _ in filas + cortos for w in re.findall(r"[a-záéíóúñü]+", t, re.I)
                    if silabas(w) >= 4 and w.lower() not in PALABRAS_DEL_JUEGO and not w[0].isupper())

    def resumen(fuente):
        ps = [p for f, _, p in filas if f == fuente]
        bien = sum(p >= META for p in ps)
        return len(ps), sum(ps) / len(ps), bien

    fuentes = list(dict.fromkeys(f for f, _, _ in filas))
    lineas = ["# Legibilidad del texto del juego", "",
              "Generado con `python herramientas/legibilidad.py`. Índice **INFLESZ** (Szigriszt-Pazos): "
              "< 40 muy difícil · 40-55 algo difícil · 55-65 normal · 65-80 bastante fácil · > 80 muy fácil. "
              f"**Meta: {META} o más** para niños de 7 a 12 años. Es una guía: también hay que revisar las palabras raras.", "",
              "| Fuente | Textos | Promedio | Con la meta |", "| --- | --- | --- | --- |"]
    for f in fuentes:
        n, media, bien = resumen(f)
        lineas.append(f"| {f} | {n} | {media:.0f} ({nivel(media)}) | {bien} de {n} |")
    lineas += ["", f"## Textos por debajo de {META} o de más de {MAX_CARACTERES} caracteres (los más difíciles primero)", "",
               "| INFLESZ | Caracteres | Fuente | Texto |", "| --- | --- | --- | --- |"]
    revisar = sorted([f for f in filas if f[2] < META or (f[0].startswith("Robot") and len(f[1]) > MAX_CARACTERES)],
                     key=lambda f: f[2])
    for fuente, t, p in revisar:
        lineas.append(f"| {p:.0f} | {len(t)} | {fuente} | {t.replace('|', '/')} |")
    if not revisar:
        lineas.append("| — | — | — | Todo cumple la meta |")
    lineas += ["", f"## Palabras largas poco comunes ({len(raras)})", "",
               "Palabras de 4 o más sílabas que no son del vocabulario que el juego enseña a propósito. "
               "Revisar si un niño de 7 años las entiende o si hay una más sencilla.", "",
               ", ".join(f"{w} ({n})" for w, n in raras.most_common()) or "Ninguna.",
               "", f"Textos de menos de {MIN_PALABRAS} palabras (títulos y pistas) no se puntúan: {len(cortos)}."]
    INFORME.write_text("\n".join(lineas) + "\n", encoding="utf-8")

    for f in fuentes:
        n, media, bien = resumen(f)
        print(f"{f}: {n} textos, promedio {media:.0f} ({nivel(media)}), {bien}/{n} con la meta {META}")
    print(f"Informe: {INFORME.relative_to(RAIZ)} ({len(revisar)} textos para revisar)")


if __name__ == "__main__":
    main()
