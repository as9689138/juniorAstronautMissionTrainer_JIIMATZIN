"""Pinta las piezas de la interfaz siguiendo docs/estilo-mapa.md.

Uso:  python herramientas/pintar_interfaz.py

Crea en assets/interfaz/ (todo al doble de resolución; el juego las muestra a la mitad):
  placa.png    placa de instrumentos (nine-slice): violeta oscuro, tinta y luz arriba a la izquierda
  papel.png    hoja de bitácora (nine-slice): papel crema con doble marco de tinta
  tecla.png    tecla dibujada en 3/4 para el aviso "E"
  icono_energia.png, icono_oxigeno.png, icono_blindaje.png    insignias de los recursos
  fase_manana.png, fase_dia.png, fase_noche.png, fase_emergencia.png    iconos de la fase del día
"""
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "public" / "assets" / "interfaz"
SS = 4   # se dibuja a 4x y se reduce para suavizar bordes

TINTA = (20, 16, 38)
PLACA = (30, 26, 58)
PLACA_LUZ = (246, 190, 146)   # luz de borde cálida, como en el mapa
PAPEL = (233, 223, 200)
PAPEL_OSC = (205, 190, 160)
SELLO = (184, 71, 61)
LUZ = (243, 227, 195)
AMBAR = (255, 200, 61)
CIELO_MARTE = (214, 160, 110)
COLOR = {"energia": (255, 200, 61), "oxigeno": (94, 200, 242), "blindaje": (181, 140, 255)}


def mezcla(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def lienzo(w, h):
    img = Image.new("RGBA", (w * SS, h * SS), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def terminar(img, w, h, grano=0.03, semilla=1):
    img = img.resize((w, h), Image.LANCZOS)
    a = np.asarray(img).astype(np.float32) / 255
    ruido = np.random.default_rng(semilla).normal(0, grano, (h, w)).astype(np.float32)
    a[..., :3] = np.clip(a[..., :3] + ruido[..., None], 0, 1)
    return Image.fromarray((a * 255).astype(np.uint8), "RGBA")


def S(*v):
    return [x * SS for x in v]


def placa():
    w = h = 96
    img, d = lienzo(w, h)
    d.rounded_rectangle(S(2, 2, w - 2, h - 2), 14 * SS, fill=TINTA + (255,))
    d.rounded_rectangle(S(5, 5, w - 5, h - 5), 11 * SS, fill=PLACA + (238,))
    d.arc(S(7, 7, 36, 36), 180, 270, fill=PLACA_LUZ + (255,), width=2 * SS)        # brillo arriba-izquierda
    d.line(S(21, 7.5, w - 21, 7.5), fill=PLACA_LUZ + (255,), width=2 * SS)
    d.line(S(7.5, 21, 7.5, h - 21), fill=PLACA_LUZ + (200,), width=2 * SS)
    for x, y in ((14, 14), (w - 14, 14), (14, h - 14), (w - 14, h - 14)):            # remaches
        d.ellipse(S(x - 2, y - 2, x + 2, y + 2), fill=mezcla(PLACA, PLACA_LUZ, 0.6) + (255,))
    # trama de puntos en la mitad de abajo (sombra impresa, como el cartel pulp)
    for yy in range(h // 2, h - 8, 5):
        for xx in range(8 + (yy // 5 % 2) * 2, w - 8, 5):
            r = 0.4 + 1.1 * (yy - h / 2) / (h / 2)
            d.ellipse(S(xx - r, yy - r, xx + r, yy + r), fill=(14, 34, 44, 120))
    return terminar(img, w, h, 0.035, 2)


def papel():
    w = h = 128
    img, d = lienzo(w, h)
    d.rounded_rectangle(S(3, 3, w - 3, h - 3), 6 * SS, fill=TINTA + (255,))
    d.rounded_rectangle(S(5, 5, w - 5, h - 5), 5 * SS, fill=PAPEL + (255,))
    d.rectangle(S(11, 11, w - 11, h - 11), outline=TINTA + (255,), width=int(1.6 * SS))   # marco de carta antigua
    d.rectangle(S(14, 14, w - 14, h - 14), outline=TINTA + (150,), width=int(0.8 * SS))
    manchas = Image.new("RGBA", img.size, (0, 0, 0, 0))
    dm = ImageDraw.Draw(manchas)
    for x, y, r in ((32, 94, 14), (98, 30, 9)):                                         # manchas de papel viejo
        dm.ellipse(S(x - r, y - r, x + r, y + r), fill=(196, 168, 120, 70))
    img = Image.alpha_composite(img, manchas.filter(ImageFilter.GaussianBlur(5 * SS)))
    return terminar(img, w, h, 0.045, 3)


def tecla():
    w, h = 56, 60
    img, d = lienzo(w, h)
    d.rounded_rectangle(S(4, 8, w - 4, h - 4), 10 * SS, fill=TINTA + (255,))
    d.rounded_rectangle(S(7, 10, w - 7, h - 7), 8 * SS, fill=PAPEL_OSC + (255,))      # frente
    d.rounded_rectangle(S(7, 6, w - 7, h - 15), 8 * SS, fill=TINTA + (255,))
    d.rounded_rectangle(S(9, 8, w - 9, h - 17), 7 * SS, fill=PAPEL + (255,))           # tapa
    d.line(S(15, 11, w - 15, 11), fill=(255, 250, 238, 255), width=2 * SS)
    return terminar(img, w, h, 0.02, 4)


def insignia(sistema):
    w = h = 64
    c = COLOR[sistema]
    img, d = lienzo(w, h)
    d.ellipse(S(3, 3, w - 3, h - 3), fill=TINTA + (255,))
    d.ellipse(S(6, 6, w - 6, h - 6), fill=mezcla(c, TINTA, 0.55) + (255,))
    d.arc(S(9, 9, w - 9, h - 9), 150, 260, fill=mezcla(c, LUZ, 0.3) + (255,), width=3 * SS)
    cx = cy = 32
    if sistema == "energia":
        pts = [(35, 12), (20, 35), (30, 35), (27, 52), (45, 27), (34, 27)]
    else:
        pts = [(32, 12), (47, 18), (45, 34), (32, 50), (19, 34), (17, 18)]
    if sistema == "oxigeno":                                                            # gota
        d.polygon(S(32, 11, 20, 31, 44, 31), fill=TINTA + (255,))
        d.ellipse(S(18, 24, 46, 52), fill=TINTA + (255,))
        d.polygon(S(32, 15, 23, 31, 41, 31), fill=c + (255,))
        d.ellipse(S(21, 27, 43, 49), fill=c + (255,))
        d.ellipse(S(25, 33, 30, 40), fill=(240, 250, 255, 255))
    else:
        d.polygon([(x * SS, y * SS) for x, y in pts], fill=c + (255,), outline=TINTA + (255,), width=int(2.4 * SS))
        if sistema == "blindaje":
            d.line(S(32, 17, 32, 45), fill=mezcla(c, LUZ, 0.5) + (255,), width=2 * SS)
    return terminar(img, w, h, 0.02, 5)


def icono_fase(fase):
    w = h = 64
    img, d = lienzo(w, h)
    base = img
    img, d = lienzo(w, h)                                   # el dibujo se recorta al círculo al final
    fondo = {"manana": (120, 80, 120), "dia": CIELO_MARTE, "noche": (24, 20, 52), "emergencia": (150, 40, 34)}[fase]
    d.ellipse(S(6, 6, w - 6, h - 6), fill=fondo + (255,))
    if fase == "dia":          # Sol pequeño en cielo caramelo (desde Marte se ve más pequeño)
        d.ellipse(S(22, 20, 42, 40), fill=(255, 244, 214, 255), outline=TINTA + (255,), width=2 * SS)
        d.rectangle(S(6, 44, 58, 58), fill=(170, 84, 52, 255))
    elif fase == "manana":     # amanecer: medio Sol sobre el horizonte
        d.pieslice(S(18, 28, 46, 56), 180, 360, fill=AMBAR + (255,), outline=TINTA + (255,), width=2 * SS)
        d.rectangle(S(6, 42, 58, 58), fill=(112, 52, 36, 255))
        d.line(S(8, 42, 56, 42), fill=TINTA + (255,), width=2 * SS)
    elif fase == "noche":      # estrellas y Fobos (pequeña e irregular)
        for x, y in ((18, 20), (44, 16), (40, 40), (20, 44), (30, 28)):
            d.ellipse(S(x - 1.2, y - 1.2, x + 1.2, y + 1.2), fill=LUZ + (255,))
        d.polygon(S(34, 22, 44, 21, 48, 28, 44, 35, 36, 34, 32, 28), fill=(150, 126, 108, 255), outline=TINTA + (255,))
        d.ellipse(S(38, 25, 41, 28), fill=(110, 92, 80, 255))
    else:                      # emergencia: triángulo de alerta
        d.polygon(S(32, 13, 51, 47, 13, 47), fill=AMBAR + (255,), outline=TINTA + (255,), width=int(2.4 * SS))
        d.rectangle(S(30, 24, 34, 37), fill=TINTA + (255,))
        d.ellipse(S(30, 40, 34, 44), fill=TINTA + (255,))
    mascara = Image.new("L", img.size, 0)
    ImageDraw.Draw(mascara).ellipse(S(6, 6, w - 6, h - 6), fill=255)
    recorte = Image.new("RGBA", img.size, (0, 0, 0, 0))
    recorte.paste(img, (0, 0), mascara)
    db = ImageDraw.Draw(base)
    db.ellipse(S(3, 3, w - 3, h - 3), fill=TINTA + (255,))
    base = Image.alpha_composite(base, recorte)
    ImageDraw.Draw(base).ellipse(S(4, 4, w - 4, h - 4), outline=TINTA + (255,), width=3 * SS)
    return terminar(base, w, h, 0.02, 6)


def main():
    SALIDA.mkdir(parents=True, exist_ok=True)
    piezas = {"placa": placa(), "papel": papel(), "tecla": tecla()}
    for s in COLOR:
        piezas[f"icono_{s}"] = insignia(s)
    for f in ("manana", "dia", "noche", "emergencia"):
        piezas[f"fase_{f}"] = icono_fase(f)
    for nombre, img in piezas.items():
        img.save(SALIDA / f"{nombre}.png", optimize=True)
    print("Interfaz pintada:", ", ".join(piezas))


if __name__ == "__main__":
    main()
