"""Entrena el pronóstico de llamaradas solares que usa la IA de la base.

Uso:  python herramientas/entrenar_pronostico.py            (descarga lo que falte y entrena)
      python herramientas/entrenar_pronostico.py --sin-red   (solo con los datos ya guardados)

Qué hace:
1. Descarga el archivo diario del Sol de NOAA SWPC ("Daily Solar Data", 1996-hoy) a
   data/noaa/dsd/. Cada día trae: flujo de radio 10,7 cm, número de manchas, área de
   manchas, regiones nuevas, fondo de rayos X y cuántas llamaradas C, M y X hubo.
2. Para cada día calcula unas pocas señales (manchas, llamaradas recientes...) y la
   respuesta: ¿hubo al menos una llamarada M o X AL DÍA SIGUIENTE?
3. Entrena una regresión logística (numpy, sin más librerías) con 1996-2016 y la
   evalúa con 2017-2025, años que el modelo nunca vio.
4. Guarda el modelo en data/modelo_pronostico.json (pesos + métricas honestas) y los
   últimos 30 días en data/sol_reciente.json (respaldo si no hay internet en el juego).

Es un modelo pequeño a propósito: se ejecuta en el navegador con unas multiplicaciones
y se puede explicar a una niña o un niño ("aprendí mirando 30 años del Sol").
"""
import json
import math
import re
import sys
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import numpy as np

RAIZ = Path(__file__).resolve().parent.parent
CRUDO = RAIZ / "datos-originales" / "noaa" / "dsd"   # crudos de NOAA: fuera del repo
SALIDA_MODELO = RAIZ / "public" / "data" / "modelo_pronostico.json"
SALIDA_RECIENTE = RAIZ / "public" / "data" / "sol_reciente.json"
SIN_RED = "--sin-red" in sys.argv

FTP = "ftp://ftp.swpc.noaa.gov/pub"
VIVO = "https://services.swpc.noaa.gov/text/daily-solar-indices.txt"
AÑO_INICIO, AÑO_FIN_ENTRENO = 1996, 2016
HOY = datetime.now(timezone.utc).date()

MESES = {m: i + 1 for i, m in enumerate("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split())}


# --- 1. Descarga ----------------------------------------------------------------
def bajar(url: str, destino: Path, forzar=False) -> bool:
    if destino.exists() and not forzar:
        return True
    if SIN_RED:
        return False
    try:
        with urllib.request.urlopen(url, timeout=60) as r:
            datos = r.read()
    except Exception as e:  # el archivo puede no existir todavía (trimestre en curso)
        print(f"  no se pudo bajar {url}: {e}")
        return False
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(datos)
    print(f"  bajado {destino.relative_to(RAIZ)} ({len(datos) // 1024} KB)")
    return True


def descargar():
    print("Datos de NOAA SWPC:")
    for año in range(AÑO_INICIO, HOY.year):
        bajar(f"{FTP}/warehouse/{año}/{año}_DSD.txt", CRUDO / f"{año}_DSD.txt")
    # Año en curso: archivos trimestrales (se vuelven a bajar porque crecen) + últimos 30 días
    for t in range(1, 5):
        if date(HOY.year, 3 * t - 2, 1) <= HOY:
            bajar(f"{FTP}/indices/old_indices/{HOY.year}Q{t}_DSD.txt",
                  CRUDO / f"{HOY.year}Q{t}_DSD.txt", forzar=True)
    bajar(VIVO, CRUDO / "ultimos_30_dias.txt", forzar=True)


# --- 2. Lectura -------------------------------------------------------------------
def numero(txt):
    try:
        v = float(txt)
        return None if v < 0 else v
    except ValueError:
        return None


def rayos_x(txt):
    """Fondo de rayos X: 'B1.2' -> log10 del flujo en W/m2 (A=1e-8 ... X=1e-4)."""
    m = re.fullmatch(r"([ABCMX])(\d+(?:\.\d+)?)", txt or "")
    if not m:
        return None
    base = {"A": -8, "B": -7, "C": -6, "M": -5, "X": -4}[m.group(1)]
    return base + math.log10(max(float(m.group(2)), 1e-3))


def leer_dsd(texto: str) -> dict:
    """Lee un archivo DSD (cambia de formato según el año) -> {fecha: registro}."""
    dias = {}
    for linea in texto.splitlines():
        if not linea.strip() or linea.lstrip()[0] in ":#":
            continue
        t = linea.split()
        try:
            if re.fullmatch(r"\d{4}", t[0]):                       # 2024 01 07 ...
                f = date(int(t[0]), int(t[1]), int(t[2])); resto = t[3:]
            elif len(t) > 2 and t[1] in MESES:                      # 01 Jan 96 ...
                a = int(t[2]); a += 1900 if a > 50 else 2000
                f = date(a, MESES[t[1]], int(t[0])); resto = t[3:]
            else:
                continue
        except (ValueError, IndexError):
            continue
        if len(resto) < 9:
            continue
        dias[f] = {
            "flujo": numero(resto[0]), "manchas": numero(resto[1]), "area": numero(resto[2]),
            "regiones": numero(resto[3]), "rayos_x": rayos_x(resto[5]),
            "c": numero(resto[6]), "m": numero(resto[7]), "x": numero(resto[8]),
        }
    return dias


def cargar_todo() -> dict:
    dias = {}
    archivos = sorted(CRUDO.glob("*_DSD.txt")) + [CRUDO / "ultimos_30_dias.txt"]
    for a in archivos:
        if a.exists():
            dias.update(leer_dsd(a.read_text(encoding="latin-1")))
    return dict(sorted(dias.items()))


# --- 3. Señales -------------------------------------------------------------------
# Lo mismo se calcula en src/ml/pronostico.js: si se cambia aquí, cambiar allí.
SEÑALES = [
    ("flujo_radio", "Flujo de radio del Sol (10,7 cm)"),
    ("manchas", "Número de manchas solares"),
    ("area_manchas", "Área de las manchas"),
    ("regiones_nuevas", "Regiones nuevas de manchas"),
    ("llamaradas_c_hoy", "Llamaradas C de hoy"),
    ("llamaradas_mx_hoy", "Llamaradas M y X de hoy"),
    ("llamaradas_mx_3dias", "Llamaradas M y X de los últimos 3 días"),
    ("subida_flujo_3dias", "Cuánto subió el flujo en 3 días"),
]


def señales(dias: dict, f: date):
    """Vector de señales del día f (usa f, f-1 y f-2). None si faltan datos."""
    d = [dias.get(f - timedelta(days=k)) for k in range(3)]
    if any(x is None for x in d):
        return None
    hoy = d[0]
    if None in (hoy["flujo"], hoy["manchas"], hoy["area"], hoy["c"], hoy["m"], hoy["x"]):
        return None
    mx = lambda r: (r["m"] or 0) + (r["x"] or 0)
    flujo_antes = d[2]["flujo"] or hoy["flujo"]
    return [
        math.log(hoy["flujo"]),
        math.sqrt(hoy["manchas"]),
        math.log1p(hoy["area"]),
        hoy["regiones"] or 0.0,
        math.log1p(hoy["c"]),
        math.log1p(mx(hoy)),
        math.log1p(sum(mx(r) for r in d)),
        math.log(hoy["flujo"] / flujo_antes),
    ]


def tabla(dias: dict):
    fechas, X, y = [], [], []
    for f in dias:
        manana = dias.get(f + timedelta(days=1))
        if manana is None or manana["m"] is None or manana["x"] is None:
            continue
        s = señales(dias, f)
        if s is None:
            continue
        fechas.append(f); X.append(s); y.append(1.0 if manana["m"] + manana["x"] > 0 else 0.0)
    return fechas, np.array(X, float), np.array(y, float)


# --- 4. Modelo ------------------------------------------------------------------------
def sigmoide(z):
    return 1 / (1 + np.exp(-np.clip(z, -30, 30)))


def entrenar(X, y, l2=0.5, pasos=4000, lr=0.3):
    w, b = np.zeros(X.shape[1]), 0.0
    n = len(y)
    for _ in range(pasos):
        p = sigmoide(X @ w + b)
        w -= lr * ((X.T @ (p - y)) / n + l2 * w / n)
        b -= lr * float(np.mean(p - y))
    return w, b


def auc(y, p):
    orden = np.argsort(p)
    rangos = np.empty(len(p)); rangos[orden] = np.arange(1, len(p) + 1)
    pos = y == 1
    n1, n0 = pos.sum(), (~pos).sum()
    return float((rangos[pos].sum() - n1 * (n1 + 1) / 2) / (n1 * n0))


def metricas(y, p, base):
    brier = float(np.mean((p - y) ** 2))
    brier_base = float(np.mean((base - y) ** 2))
    umbrales = np.linspace(0.05, 0.95, 91)
    mejor = max(umbrales, key=lambda u: tss(y, p >= u))
    pred = p >= mejor
    return {
        "dias": int(len(y)), "dias_con_llamarada": int(y.sum()),
        "brier": round(brier, 4), "brier_adivinar_promedio": round(brier_base, 4),
        "mejora_sobre_adivinar": round(1 - brier / brier_base, 3),
        "auc": round(auc(y, p), 3),
        "umbral_aviso": round(float(mejor), 2), "tss": round(tss(y, pred), 3),
        "aciertos_con_llamarada": round(float(pred[y == 1].mean()), 3),
        "falsas_alarmas": round(float(pred[y == 0].mean()), 3),
    }


def tss(y, pred):
    """True Skill Statistic: % de llamaradas avisadas menos % de falsas alarmas."""
    return float(pred[y == 1].mean() - pred[y == 0].mean())


def calibracion(y, p, cortes=(0, .1, .2, .4, .6, 1.01)):
    filas = []
    for a, b in zip(cortes, cortes[1:]):
        sel = (p >= a) & (p < b)
        if sel.sum() >= 20:
            filas.append({"dice": f"{int(a * 100)}-{int(min(b, 1) * 100)} %",
                          "paso_de_verdad": round(float(y[sel].mean()), 3), "dias": int(sel.sum())})
    return filas


def main():
    descargar()
    dias = cargar_todo()
    if not dias:
        raise SystemExit("No hay datos en data/noaa/dsd/. Ejecutar sin --sin-red.")
    fechas, X, y = tabla(dias)
    años = np.array([f.year for f in fechas])
    ent, prueba = años <= AÑO_FIN_ENTRENO, años > AÑO_FIN_ENTRENO
    print(f"Días con datos: {len(dias)} ({min(dias)} a {max(dias)}); ejemplos: {len(y)}")

    # (El fondo de rayos X no se usa: NOAA dejó de publicarlo en 2020, con el retiro de GOES-15)
    media = np.nanmean(X[ent], axis=0)
    X = np.where(np.isnan(X), media, X)
    desv = X[ent].std(axis=0) + 1e-9
    Z = (X - media) / desv

    w, b = entrenar(Z[ent], y[ent])
    p = sigmoide(Z @ w + b)
    clima = float(y[ent].mean())                               # "adivinar el promedio"
    m_prueba = metricas(y[prueba], p[prueba], clima)
    m_ent = metricas(y[ent], p[ent], clima)
    # Persistencia: "si hoy hubo M/X, mañana también"
    persist = (X[prueba, 5] > 0).astype(float)
    print(f"Prueba 2017-2025: AUC {m_prueba['auc']}, TSS {m_prueba['tss']}, "
          f"mejora Brier {m_prueba['mejora_sobre_adivinar']:+.1%}; "
          f"persistencia TSS {tss(y[prueba], persist > 0):.3f}")

    # Reentrenar con todos los años para el juego (las métricas publicadas son las de prueba)
    w_final, b_final = entrenar(Z, y)
    modelo = {
        "nombre": "Pronóstico de llamaradas M/X para mañana",
        "tipo": "regresión logística",
        "entrenado": HOY.isoformat(),
        "fuente": "NOAA SWPC, Daily Solar Data (ftp.swpc.noaa.gov/pub/warehouse)",
        "periodo": f"{min(fechas)} a {max(fechas)}",
        "pregunta": "¿Habrá al menos una llamarada M o X mañana?",
        "señales": [{"id": k, "nombre": n, "media": round(float(mu), 6), "desv": round(float(sd), 6),
                     "peso": round(float(wi), 6)}
                    for (k, n), mu, sd, wi in zip(SEÑALES, media, desv, w_final)],
        "sesgo": round(float(b_final), 6),
        "frecuencia_historica": round(float(y.mean()), 4),
        "evaluacion": {
            "nota": f"Entrenado con {AÑO_INICIO}-{AÑO_FIN_ENTRENO} y medido con "
                    f"{AÑO_FIN_ENTRENO + 1}-2025, años que no vio.",
            "prueba": m_prueba, "entrenamiento": m_ent,
            "persistencia_tss": round(tss(y[prueba], persist > 0), 3),
            "calibracion_prueba": calibracion(y[prueba], p[prueba]),
        },
    }
    SALIDA_MODELO.write_text(json.dumps(modelo, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Guardado {SALIDA_MODELO.relative_to(RAIZ)}")

    # Últimos 30 días disponibles, para jugar sin internet
    ultimos = list(dias.items())[-30:]
    reciente = {"fuente": "NOAA SWPC, Daily Solar Data", "guardado": HOY.isoformat(),
                "dias": [{"fecha": f.isoformat(), **r} for f, r in ultimos]}
    SALIDA_RECIENTE.write_text(json.dumps(reciente, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Guardado {SALIDA_RECIENTE.relative_to(RAIZ)} ({ultimos[0][0]} a {ultimos[-1][0]})")


if __name__ == "__main__":
    main()
