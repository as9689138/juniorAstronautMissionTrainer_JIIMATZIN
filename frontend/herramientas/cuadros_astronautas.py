"""Hojas de cuadros de los tres astronautas del mapa, con los dibujos de la compañera de arte.

Entrada: una carpeta por personaje con sus PNG de 1280x1280 (fondo transparente), tal como vienen en los zip:
  CIENTIFICA.zip -> judith · enfermero.zip -> atlas · ezyZip.zip -> wenceslao
Los cuadros se ordenan por la hora del nombre ("sin título_AAAAMMDDhhmmss.png"). Son un paso de pato visto de
frente: el cuerpo se balancea de lado a lado dentro del lienzo (centro, izquierda, más a la izquierda, izquierda,
centro, derecha, más a la derecha, derecha). Las copias exactas "(1)" se descartan y el ciclo se arma con los 8
cuadros distintos en ese orden, igual para los tres, para que caminen al mismo ritmo.

Salida (public/assets/personajes/mapa/):
  <personaje>.png  8 cuadros en fila: 0 = parado (centro), 0..7 = ciclo de caminar
  hojas.json       ancho y alto de cuadro y el origen de los pies (lo lee src/motor/recursos.js)

Cada cuadro se centra en su cuerpo y apoya los pies en la misma línea: en el lienzo original el cuerpo se desplaza
hasta un 40 % de su ancho de un cuadro a otro, y en el mapa eso se veía a saltos. Así queda el paso (pies que se
alternan, cuerpo que se inclina, cabeza que sube y baja) y el balanceo suave lo pone el juego (src/escenas/Base.js).
Se guardan al doble de lo que se ve en el mapa, como el resto del arte.

Uso: python herramientas/cuadros_astronautas.py <carpeta_judith> <carpeta_atlas> <carpeta_wenceslao>
"""
import hashlib
import json
import re
import sys
from pathlib import Path

from PIL import Image

AQUI = Path(__file__).resolve().parent.parent
SALIDA = AQUI / "public/assets/personajes/mapa"
ALTO_CUERPO = 176      # px de alto del cuerpo en la textura (en el mapa: 88 px, el doble del astronauta provisional)
MARGEN = 4


def cuadros(carpeta: Path):
    """Cuadros distintos en orden de hora, con su posición horizontal (centro de su caja)."""
    vistos, lista = set(), []
    for f in sorted(carpeta.glob("*.png"), key=lambda p: (re.findall(r"\d{14}", p.name) or [p.name])[0] + p.name):
        im = Image.open(f).convert("RGBA")
        huella = hashlib.md5(im.tobytes()).hexdigest()
        if huella in vistos and "(1)" in f.name:
            continue                      # copia exacta descargada dos veces
        vistos.add(huella)
        caja = im.getbbox()
        lista.append({"im": im, "caja": caja, "x": (caja[0] + caja[2]) / 2, "huella": huella})
    return lista


def ciclo(lista):
    """Los 8 cuadros del paso, por su posición: centro, izq, más izq, izq, centro, der, más der, der."""
    distintos = {}
    for c in lista:
        distintos.setdefault(c["huella"], c)
    unicos = sorted(distintos.values(), key=lambda c: c["x"])
    xs = [c["x"] for c in unicos]
    centro_x = lista[0]["x"]              # el primer cuadro es el de parado (centro)
    centros = [c for c in unicos if abs(c["x"] - centro_x) < 5]
    izq = [c for c in unicos if c["x"] < centro_x - 5]
    der = [c for c in unicos if c["x"] > centro_x + 5]
    if len(izq) < 2 or len(der) < 2:
        raise SystemExit(f"Se esperaban 2 posiciones a cada lado del centro; hay x = {xs}")
    # el centro de parado: el que más se repite (si hay dos versiones)
    cuenta = {c["huella"]: sum(1 for x in lista if x["huella"] == c["huella"]) for c in centros}
    c0 = max(centros, key=lambda c: cuenta[c["huella"]])
    i1, i2 = izq[-1], izq[0]              # izquierda y más a la izquierda
    d1, d2 = der[0], der[-1]
    return [c0, i1, i2, i1, c0, d1, d2, d1]


def main():
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    personajes = dict(zip(["judith", "atlas", "wenceslao"], map(Path, sys.argv[1:])))
    ciclos = {p: ciclo(cuadros(c)) for p, c in personajes.items()}

    # Cuadro común: el más ancho y el más alto, centrado en el cuerpo y con los pies abajo
    cajas = [c["caja"] for cs in ciclos.values() for c in cs]
    ancho = max(c[2] - c[0] for c in cajas) + 2 * MARGEN
    alto = max(c[3] - c[1] for c in cajas) + 2 * MARGEN
    k = ALTO_CUERPO / max(c[3] - c[1] for c in cajas)
    fw, fh = round(ancho * k), round(alto * k)

    SALIDA.mkdir(parents=True, exist_ok=True)
    meta = {"cuadros": 8, "ancho": fw, "alto": fh, "alto_cuerpo": ALTO_CUERPO, "personajes": {}}
    for p, cs in ciclos.items():
        hoja = Image.new("RGBA", (fw * len(cs), fh), (0, 0, 0, 0))
        for i, c in enumerate(cs):
            b = c["caja"]
            cx = (b[0] + b[2]) / 2
            caja = (round(cx - ancho / 2), b[3] + MARGEN - alto, round(cx - ancho / 2) + ancho, b[3] + MARGEN)
            recorte = c["im"].crop(caja).resize((fw, fh), Image.LANCZOS)
            hoja.alpha_composite(recorte, (i * fw, 0))
        hoja.save(SALIDA / f"{p}.png", optimize=True)
        meta["personajes"][p] = {"origen_x": 0.5, "origen_y": round(1 - MARGEN / alto, 4)}   # centro y planta de los pies
        print(f"{p}: {len(cs)} cuadros de {fw}x{fh} -> {SALIDA / (p + '.png')}")
    (SALIDA / "hojas.json").write_text(json.dumps(meta, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
