"""Pinta el arte del mapa a partir de assets/mapas/base.json, siguiendo docs/estilo-mapa.md.

Uso:  python herramientas/pintar_mapa.py

Crea dos imágenes al doble de resolución (64 px por casilla):
  assets/mapas/fondo_base.png   suelo, muros, máquinas (parte baja), luces y grano
  assets/mapas/encima_base.png  parte alta de las máquinas (tapa al astronauta al pasar por detrás)

El mapa de Tiled sigue mandando: si se mueve un muro o una máquina en Tiled,
se vuelve a ejecutar este script y el dibujo se actualiza solo.
Todo es determinista (semilla fija): el mismo mapa da siempre la misma imagen.
"""
import json
import math
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

RAIZ = Path(__file__).resolve().parent.parent
MAPA = RAIZ / "public" / "assets" / "mapas" / "base.json"
SALIDA = RAIZ / "public" / "assets" / "mapas"

T = 32          # casilla en el juego
SS = 4          # dibujamos a 4x y reducimos (bordes suaves)
FINAL = 2       # resolución final: 2x (64 px por casilla)
K = SS          # px de lienzo por px de juego

# --- Paleta (docs/estilo-mapa.md): la del interior aprobado ------------------
# Basada en Mars Dune Alpha (NASA CHAPEA): paredes impresas en 3D con regolito, suelo claro,
# luz en círculos planos, acentos rosa. La "tinta" es violeta oscuro, no negro.
TINTA = (40, 34, 86)
SUELO = (138, 130, 210)
SUELO_JUNTA = (122, 114, 198)
SUELO_BRILLO = (160, 152, 226)
PASILLO = (124, 116, 200)
MURO_TAPA = (172, 164, 232)       # regolito impreso, visto desde arriba
MURO_TAPA_LUZ = (206, 200, 244)
MURO_FRENTE = (96, 88, 170)
MURO_FRENTE_OSC = (66, 58, 130)
NERVIO = (84, 76, 156)            # nervaduras de la impresión 3D
ZOCALO = (52, 44, 104)
SOMBRA = (106, 98, 182)
ROSA = (228, 138, 216)
ROSA_CL = (247, 182, 238)
INV_SUELO = (70, 34, 84)          # invernadero: luz LED magenta
INV_REJILLA = (90, 48, 104)
TIERRA = (120, 52, 120)
HOJA = (124, 200, 150)
HOJA_CALIDA = (111, 179, 167)
LUZ = (246, 244, 250)
AMBAR = (255, 200, 61)
CIELO_MARTE = (214, 160, 110)
SUELO_MARTE = (84, 52, 84)
SUELO_MARTE_OSC = (54, 28, 50)
CIELO_ATARDECER = [(26, 22, 64), (40, 36, 94), (58, 64, 134), (78, 116, 186), (110, 170, 230)]   # atardecer azul de Gale

ACENTO = {
    "mando": (228, 138, 216),
    "energia": (255, 200, 61),
    "oxigeno": (94, 200, 242),
    "blindaje": (181, 140, 255),
    "comunicaciones": (124, 240, 160),
}
SISTEMA_DE_SALA = {
    "Energia": "energia", "Mando": "mando", "Comunicaciones": "comunicaciones",
    "Invernadero": "oxigeno", "Soporte vital": "oxigeno", "Refugio": "blindaje",
}


def mezcla(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


# --- Detalle de cada sala ------------------------------------------------------
# Todo es decoración plana (suelo o pared): no cambia las colisiones del mapa.
# Coordenadas en px del juego (casilla de 32). Las ventanas del muro norte están en
# las columnas 1, 4, 7, 10...: lo que va en esa pared evita esas columnas.
NOMBRE_VISIBLE = {"Energia": "ENERGÍA", "Mando": "MANDO", "Comunicaciones": "COMUNICACIONES",
                  "Invernadero": "INVERNADERO", "Soporte vital": "SOPORTE VITAL", "Refugio": "REFUGIO"}
PAPEL = (233, 223, 200)
SELLO = (184, 71, 61)
MAGENTA_CULTIVO = (232, 96, 200)   # luces LED rojas + azules de los invernaderos reales


def fuente(tam):
    from PIL import ImageFont
    for nombre in ("arialbd.ttf", "Arial Bold.ttf", "DejaVuSans-Bold.ttf", "LiberationSans-Bold.ttf"):
        try:
            return ImageFont.truetype(nombre, tam)
        except OSError:
            pass
    return ImageFont.load_default(size=tam)


class Pincel:
    """Atajos de dibujo en coordenadas del juego sobre el lienzo ampliado."""

    def __init__(self, d):
        self.d = d

    def p(self, x, y):
        return (x * K, y * K)

    def _w(self, kw):
        if "width" in kw:
            kw["width"] = max(1, int(kw["width"] * K))
        return kw

    def rect(self, x0, y0, x1, y1, **kw):
        self.d.rectangle([x0 * K, y0 * K, x1 * K - 1, y1 * K - 1], **self._w(kw))

    def redondo(self, x0, y0, x1, y1, radio, **kw):
        self.d.rounded_rectangle([x0 * K, y0 * K, x1 * K - 1, y1 * K - 1], radio * K, **self._w(kw))

    def elipse(self, x0, y0, x1, y1, **kw):
        self.d.ellipse([x0 * K, y0 * K, x1 * K, y1 * K], **self._w(kw))

    def linea(self, puntos, color, ancho):
        self.d.line([self.p(*q) for q in puntos], fill=color, width=max(1, int(ancho * K)), joint="curve")

    def poligono(self, puntos, **kw):
        self.d.polygon([self.p(*q) for q in puntos], **kw)

    def texto(self, x, y, txt, tam, color, centro=True):
        self.d.text((x * K, y * K), txt, font=fuente(int(tam * K)), fill=color, anchor="mm" if centro else "lm")

    def curva(self, a, ctrl, b, n=24):
        return [((1 - t) ** 2 * a[0] + 2 * (1 - t) * t * ctrl[0] + t * t * b[0],
                 (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * ctrl[1] + t * t * b[1])
                for t in (i / n for i in range(n + 1))]

    def cable(self, a, ctrl, b, color, ancho=3):
        pts = self.curva(a, ctrl, b)
        self.linea(pts, TINTA, ancho + 1.5)
        self.linea(pts, color, ancho)
        self.linea([(x - 0.5, y - 0.6) for x, y in pts], mezcla(color, LUZ, 0.45), 0.8)   # brillo

    def discontinuo(self, x0, y0, x1, y1, color, ancho=1.2, paso=6):
        for xa in range(int(x0), int(x1), paso):
            self.linea([(xa, y0), (min(xa + paso / 2, x1), y0)], color, ancho)
            self.linea([(xa, y1), (min(xa + paso / 2, x1), y1)], color, ancho)
        for ya in range(int(y0), int(y1), paso):
            self.linea([(x0, ya), (x0, min(ya + paso / 2, y1))], color, ancho)
            self.linea([(x1, ya), (x1, min(ya + paso / 2, y1))], color, ancho)


def detalles_suelo(d, puertas, sala_en):
    pz = Pincel(d)
    # Energía: cables gruesos de las baterías a la estación y zona de peligro
    for bx in (112, 240):
        pz.discontinuo(bx - 14, 90, bx + 14, 134, AMBAR, 1.2)
    for a, c, b in (((112, 126), (128, 150), (166, 116)), ((240, 126), (220, 150), (187, 116))):
        pz.cable(a, c, b, (64, 58, 46))
        pz.linea(pz.curva(a, c, b), AMBAR, 0.8)

    # Mando: alfombra circular bajo la consola (foco de atención)
    m = ACENTO["mando"]
    pz.elipse(450, 118, 542, 176, fill=mezcla(SUELO, m, 0.12))
    pz.elipse(450, 118, 542, 176, outline=mezcla(SUELO, m, 0.55), width=1.2)
    pz.elipse(462, 126, 530, 168, outline=mezcla(SUELO, m, 0.3), width=0.8)

    # Comunicaciones: mazos de cables de los servidores a la antena
    v = ACENTO["comunicaciones"]
    pz.cable((816, 126), (850, 150), (900, 118), mezcla(v, TINTA, 0.45), 2.2)
    pz.cable((1040, 126), (990, 150), (925, 118), mezcla(v, TINTA, 0.45), 2.2)
    pz.cable((1046, 126), (1000, 160), (928, 124), mezcla(AMBAR, TINTA, 0.5), 1.6)

    # Pasillo: nombre de cada sala pintado en el suelo junto a su puerta, con flecha
    for cx, fila in puertas:
        y_puerta = fila * T
        hacia_arriba = fila < 8
        sala = sala_en(cx, y_puerta - 8 if hacia_arriba else y_puerta + T + 8)
        if sala not in NOMBRE_VISIBLE:
            continue
        color = mezcla(PASILLO, ACENTO[SISTEMA_DE_SALA[sala]], 0.85)
        ty = y_puerta + T + 16 if hacia_arriba else y_puerta - 16
        pz.texto(cx, ty, NOMBRE_VISIBLE[sala], 8.5, color)
        s = -1 if hacia_arriba else 1
        fy = ty + 9 * s
        pz.poligono([(cx - 5, fy - 2 * s), (cx + 5, fy - 2 * s), (cx, fy + 3 * s)], fill=color)

    # Invernadero: macetas al pie del muro, manguera y charcos
    for x in list(range(40, 186, 16)) + list(range(264, 312, 16)):
        pz.poligono([(x, 353), (x + 10, 353), (x + 8, 360), (x + 2, 360)], fill=(176, 92, 60), outline=TINTA)
        for i, dx in enumerate((-1, 3, 7)):
            pz.elipse(x + dx, 346 + (i % 2) * 2, x + dx + 5, 354 + (i % 2) * 2,
                      fill=HOJA if (x // 16 + i) % 3 else HOJA_CALIDA, outline=TINTA, width=0.6)
    pz.cable((176, 474), (140, 500), (112, 446), (70, 130, 170), 2)
    pz.cable((176, 474), (210, 500), (208, 446), (70, 130, 170), 2)
    for cx, cy, rx in ((90, 490, 12), (250, 410, 9), (140, 420, 7)):
        pz.elipse(cx - rx, cy - rx * 0.45, cx + rx, cy + rx * 0.45, fill=(52, 110, 120))
        pz.linea([(cx - rx * 0.5, cy - 1), (cx, cy - 1.5)], (150, 210, 215), 0.8)

    # Soporte vital: tubería en el suelo del tanque a la pared y desagüe
    o = ACENTO["oxigeno"]
    pz.cable((448, 444), (420, 470), (362, 470), mezcla(o, TINTA, 0.4), 3)
    pz.elipse(586, 474, 610, 486, fill=SUELO_JUNTA, outline=TINTA, width=0.8)
    for k in range(3):
        pz.linea([(592 + k * 6, 476), (592 + k * 6, 484)], SUELO, 0.8)

    # Refugio: zona segura marcada alrededor de la estación
    b = ACENTO["blindaje"]
    pz.rect(892, 398, 996, 470, fill=mezcla(SUELO, b, 0.1))
    pz.discontinuo(892, 398, 996, 470, mezcla(SUELO, b, 0.7), 1.4, 8)
    pz.texto(944, 480, "ZONA SEGURA", 6.5, mezcla(SUELO, b, 0.7))


def detalles_muro(d):
    pz = Pincel(d)
    # Salas de arriba: frente del muro norte (fila 0) en y 14..27
    # Energía: señal de alto voltaje y cuadro eléctrico
    pz.poligono([(80, 15), (89, 27), (71, 27)], fill=AMBAR, outline=TINTA)
    pz.poligono([(81, 18), (78, 22.5), (81, 22.5), (79, 26), (84, 21), (81, 21)], fill=TINTA)
    pz.redondo(258, 15, 286, 27, 1.5, fill=(96, 92, 120), outline=TINTA, width=1)
    for i in range(4):
        pz.rect(262 + i * 6, 18, 265 + i * 6, 24, fill=AMBAR if i != 2 else (230, 80, 60))

    # Mando: pantalla con la órbita de Marte y panel con los 3 recursos
    m = ACENTO["mando"]
    pz.redondo(548, 14, 606, 28, 1.5, fill=(26, 22, 50), outline=TINTA, width=1)
    pz.elipse(556, 17, 598, 26, outline=mezcla(m, TINTA, 0.3), width=0.6)
    pz.elipse(574, 19, 580, 24, fill=(214, 110, 70))                      # Marte
    pz.elipse(593, 19, 596, 22, fill=LUZ)                                  # nave
    pz.rect(549, 15, 605, 16, fill=m)
    pz.redondo(358, 15, 410, 27, 1.5, fill=(26, 22, 50), outline=TINTA, width=1)
    for i, c in enumerate((ACENTO["energia"], ACENTO["oxigeno"], ACENTO["blindaje"])):
        pz.rect(362, 17.5 + i * 3, 362 + (40, 30, 22)[i], 19 + i * 3, fill=c)

    # Comunicaciones: monitores con ondas de radio y póster de antena (estilo carta antigua)
    v = ACENTO["comunicaciones"]
    for x in (738, 770):
        pz.redondo(x, 15, x + 28, 27, 1.5, fill=(20, 30, 32), outline=TINTA, width=1)
        pz.linea([(x + 3 + i * 1.5, 21 + 3.5 * math.sin(i * 0.9 + x)) for i in range(15)], v, 0.8)
    pz.rect(934, 14, 966, 28, fill=PAPEL, outline=TINTA, width=0.8)
    pz.poligono([(940, 25), (950, 17), (956, 23)], outline=TINTA)           # plato de la antena
    pz.linea([(948, 21), (948, 26)], TINTA, 0.8)
    pz.linea([(953, 18), (958, 15.5)], TINTA, 0.6)
    pz.elipse(958, 22, 964, 27, outline=SELLO, width=0.7)                   # sello

    # Salas de abajo: frente del muro de la fila 10, en y 334..347
    # Invernadero: luces de cultivo magenta
    for x in list(range(40, 186, 10)) + list(range(262, 316, 10)):
        pz.elipse(x, 343, x + 4, 346, fill=MAGENTA_CULTIVO)
    # Soporte vital: tuberías con manómetros y etiquetas O2 / CO2
    o = ACENTO["oxigeno"]
    for xa, xb in ((354, 478), (546, 638)):
        pz.rect(xa, 336, xb, 339, fill=mezcla(o, TINTA, 0.35), outline=TINTA, width=0.6)
        pz.rect(xa, 342, xb, 345, fill=(120, 116, 150), outline=TINTA, width=0.6)
    for x, txt in ((400, "O2"), (590, "CO2")):
        pz.elipse(x - 5, 334, x + 5, 344, fill=PAPEL, outline=TINTA, width=0.8)
        pz.linea([(x, 339), (x + 3, 336.5)], SELLO, 0.7)
        pz.texto(x + 8, 339, txt, 5.5, LUZ, centro=False)
    # Refugio: paneles de agua (el agua protege de la radiación)
    for x in list(range(678, 826, 24)) + list(range(900, 1112, 24)):
        pz.redondo(x, 334, x + 20, 347, 1.5, fill=(60, 110, 200), outline=TINTA, width=0.8)
        pz.linea([(x + 2 + i, 339 + math.sin(i * 0.8) * 0.8) for i in range(17)], (150, 200, 250), 0.6)


# --- Muebles con colisión ------------------------------------------------------
# Cada mueble es un rectángulo de tipo "mueble" en Tiled (la huella que choca).
# Se dibuja en vista 3/4: lo que sube por encima de la huella va a la capa "encima"
# para que el astronauta pase por detrás.
CAJA = (228, 138, 216)         # contenedores rosas, como los acentos del interior
CAJA_TAPA = (247, 182, 238)


def caja3d(pz, x0, x1, y_tapa, y_frente, y_base, tapa, frente):
    """Bloque en 3/4: tapa clara arriba, frente más oscuro abajo, con tinta."""
    pz.redondo(x0, y_tapa, x1, y_base, 1.5, fill=frente, outline=TINTA, width=1.4)
    pz.redondo(x0, y_tapa, x1, y_frente, 1.5, fill=tapa, outline=TINTA, width=1.4)
    pz.linea([(x0 + 1.5, y_tapa + 1.2), (x1 - 2, y_tapa + 1.2)], mezcla(tapa, LUZ, 0.5), 0.8)   # luz arriba


def dibujar_mueble(pz, tipo, x, y, w, h, sala):
    ac = ACENTO.get(SISTEMA_DE_SALA.get(sala, ""), LUZ)
    base = y + h - 2
    if tipo == "cajas":
        for i, cx in enumerate(range(int(x), int(x + w), T)):
            alta = (cx // T + int(y) // T) % 2 == 0
            caja3d(pz, cx + 3, cx + T - 3, base - 22, base - 12, base, CAJA_TAPA, CAJA)
            pz.rect(cx + 6, base - 9, cx + 14, base - 5, fill=PAPEL)                       # etiqueta
            pz.linea([(cx + 18, base - 10), (cx + 26, base - 3)], TINTA, 0.8)
            if alta:                                                                       # caja apilada
                caja3d(pz, cx + 7, cx + T - 7, base - 34, base - 27, base - 20, CAJA_TAPA, CAJA)
                pz.rect(cx + 11, base - 26, cx + 15, base - 23, fill=ac)
    elif tipo == "banco":
        caja3d(pz, x + 2, x + w - 2, base - 26, base - 12, base, MURO_TAPA, MURO_FRENTE)
        for i in range(int(w // 16)):                                                      # cajones
            dx = x + 6 + i * 16
            pz.redondo(dx, base - 10, dx + 11, base - 3, 1, fill=MURO_FRENTE_OSC, outline=TINTA, width=0.7)
            pz.rect(dx + 4, base - 7.5, dx + 7, base - 6.5, fill=LUZ)
        pz.linea([(x + 10, base - 21), (x + 22, base - 16)], (160, 160, 180), 1.6)          # llave inglesa
        pz.elipse(x + 7, base - 23, x + 12, base - 18, outline=(160, 160, 180), width=1.2)
        pz.redondo(x + 34, base - 23, x + 50, base - 15, 1, fill=AMBAR, outline=TINTA, width=0.7)   # batería de repuesto
        pz.rect(x + 37, base - 21, x + 41, base - 17, fill=TINTA)
    elif tipo == "estanteria":
        caja3d(pz, x + 2, x + w - 2, base - 38, base - 32, base, MURO_TAPA, MURO_FRENTE_OSC)
        for k, yy in enumerate((base - 29, base - 19, base - 9)):
            pz.rect(x + 4, yy + 7, x + w - 4, yy + 8.5, fill=MURO_TAPA)                   # balda
            for j in range(int((w - 10) // 7)):
                ix = x + 6 + j * 7
                if sala == "Invernadero":       # frascos de semillas
                    pz.redondo(ix, yy + 1, ix + 5, yy + 7, 1, fill=(HOJA, HOJA_CALIDA, (150, 120, 80))[(j + k) % 3], outline=TINTA, width=0.5)
                elif sala == "Soporte vital":   # cartuchos de filtro
                    pz.redondo(ix, yy, ix + 5, yy + 7, 2, fill=mezcla(ac, LUZ, 0.2 * ((j + k) % 2)), outline=TINTA, width=0.5)
                else:                           # carpetas de la misión
                    pz.rect(ix, yy + (j % 2), ix + 5, yy + 7, fill=(ac, AMBAR, LUZ, CAJA)[(j + k) % 4], outline=TINTA, width=0.5)
    elif tipo == "mesa":
        silla = mezcla(ac, LUZ, 0.25)
        for sx, sy in ((x - 8, y + 14), (x - 8, y + 38), (x + w + 1, y + 14), (x + w + 1, y + 38), (x + 18, y + h + 1), (x + 38, y + h + 1)):
            pz.redondo(sx, sy, sx + 8, sy + 9, 2, fill=silla, outline=TINTA, width=0.8)    # sillas rosas
        caja3d(pz, x + 1, x + w - 1, y - 6, base - 8, base, MURO_TAPA, MURO_FRENTE)
        cx, cy = x + w / 2, y + (base - 8 - y) / 2 - 2
        pz.elipse(cx - 20, cy - 13, cx + 20, cy + 13, fill=mezcla(MURO_TAPA, ac, 0.35))     # proyector
        pz.elipse(cx - 11, cy - 11, cx + 11, cy + 11, fill=(198, 102, 64), outline=TINTA, width=0.8)   # Marte
        pz.elipse(cx - 7, cy - 9, cx + 1, cy - 3, fill=(226, 150, 100))                    # luz
        pz.linea([(cx - 11, cy), (cx + 11, cy)], (120, 50, 34), 0.6)                         # ecuador
        pz.elipse(cx + 2, cy + 3, cx + 7, cy + 6, fill=(120, 50, 34))                         # Valles Marineris (aprox.)
        pz.elipse(cx - 4, cy - 11, cx + 4, cy - 9, fill=(240, 236, 230))                      # casquete polar
    elif tipo == "escritorio":
        caja3d(pz, x + 2, x + w - 2, base - 22, base - 12, base, MURO_TAPA, MURO_FRENTE)
        v = ACENTO["comunicaciones"]
        for i, mx in enumerate((x + 8, x + 36)):                                           # monitores
            pz.redondo(mx, base - 40, mx + 22, base - 24, 1.5, fill=(20, 30, 32), outline=TINTA, width=1)
            pz.linea([(mx + 3 + j * 1.2, base - 32 + 3 * math.sin(j * (0.8 + i * 0.5))) for j in range(14)], v, 0.8)
            pz.rect(mx + 9, base - 24, mx + 13, base - 21, fill=MURO_FRENTE_OSC)
        pz.redondo(x + 66, base - 30, x + 88, base - 20, 1.5, fill=(96, 92, 120), outline=TINTA, width=1)   # radio
        for j in range(3):
            pz.elipse(x + 69 + j * 6, base - 27, x + 73 + j * 6, base - 23, fill=(AMBAR, v, LUZ)[j], outline=TINTA, width=0.5)
        pz.linea([(x + 84, base - 30), (x + 88, base - 42)], TINTA, 0.9)                     # antena de la radio
    elif tipo == "litera":
        for nivel, alto in ((0, 0), (1, 16)):
            yb = base - alto
            caja3d(pz, x + 2, x + w - 2, yb - 22, yb - 8, yb, PAPEL, MURO_FRENTE)
            pz.redondo(x + 5, yb - 20, x + 15, yb - 11, 2, fill=(250, 246, 236), outline=TINTA, width=0.6)   # almohada
            pz.redondo(x + 18, yb - 21, x + w - 4, yb - 9, 2, fill=mezcla(ac, TINTA, 0.15 * nivel), outline=TINTA, width=0.6)  # manta
            pz.linea([(x + 22, yb - 15), (x + w - 8, yb - 15)], mezcla(ac, LUZ, 0.4), 0.7)
        pz.rect(x + 2, base - 24, x + 4, base, fill=MURO_FRENTE_OSC)                       # postes
        pz.rect(x + w - 4, base - 24, x + w - 2, base, fill=MURO_FRENTE_OSC)
    elif tipo == "taquilla":
        caja3d(pz, x + 4, x + w - 4, base - 40, base - 34, base, MURO_TAPA, MURO_FRENTE)
        for j in range(3):
            pz.linea([(x + 9, base - 30 + j * 3), (x + w - 9, base - 30 + j * 3)], MURO_FRENTE_OSC, 1)   # rejilla
        pz.rect(x + 8, base - 18, x + w - 8, base - 15, fill=ac)                           # placa de nombre
        pz.rect(x + w - 10, base - 12, x + w - 8, base - 6, fill=LUZ)                      # tirador
    else:
        caja3d(pz, x + 2, x + w - 2, base - 20, base - 10, base, MURO_TAPA, MURO_FRENTE)


def dibujar_muebles(tam, objetos, sala_en):
    """Devuelve dos capas RGBA: la parte de los muebles que va al fondo y la que va "encima".
    Cada mueble se parte por su propia huella, así un mueble no tapa al astronauta
    cuando este está delante de él aunque haya otro mueble justo detrás."""
    fondo_m = Image.new("RGBA", tam, (0, 0, 0, 0))
    encima_m = Image.new("RGBA", tam, (0, 0, 0, 0))
    muebles = sorted((o for o in objetos if o["type"] == "mueble"), key=lambda o: o["y"] + o["height"])
    for o in muebles:
        props = {p["name"]: p["value"] for p in o.get("properties", [])}
        x, y, w, h = o["x"], o["y"], o["width"], o["height"]
        capa = Image.new("RGBA", tam, (0, 0, 0, 0))
        pz = Pincel(ImageDraw.Draw(capa))
        pz.elipse(x - 1, y + h - 8, x + w + 3, y + h + 3, fill=mezcla(SUELO, TINTA, 0.6) + (200,))   # sombra
        dibujar_mueble(pz, props.get("tipo", ""), x, y, w, h, sala_en(x + 1, y + 1))
        caja = (int((x - 16) * K), int((y - 60) * K), int((x + w + 16) * K), int((y + h + 8) * K))
        trozo = capa.crop(caja)
        corte = int(y * K) - caja[1]                       # fila del trozo donde empieza la huella
        arriba_t = trozo.copy(); arriba_t.paste((0, 0, 0, 0), (0, corte, trozo.width, trozo.height))
        abajo_t = trozo.copy(); abajo_t.paste((0, 0, 0, 0), (0, 0, trozo.width, corte))
        for destino, t in ((fondo_m, abajo_t), (encima_m, arriba_t)):
            base_t = destino.crop(caja)
            destino.paste(Image.alpha_composite(base_t, t), caja[:2])
    return fondo_m, encima_m



def pictograma(pz, nombre, x, y):
    """Icono sencillo en la pantalla de cada estación (instrucciones con iconos, no solo texto)."""
    c, a = LUZ, 1.1
    if nombre == "tarea_paneles":          # panel solar y Sol
        pz.poligono([(x - 6, y + 4), (x - 3, y - 2), (x + 5, y - 2), (x + 2, y + 4)], outline=c)
        pz.linea([(x - 4.5, y + 1), (x + 3.5, y + 1)], c, 0.7)
        pz.linea([(x + 1, y - 2), (x - 2, y + 4)], c, 0.7)
        pz.elipse(x + 3, y - 6, x + 7, y - 2, fill=AMBAR)
    elif nombre == "tarea_filtro":         # ventilador del filtro de aire
        pz.elipse(x - 5, y - 5, x + 5, y + 5, outline=c, width=0.8)
        for k in range(3):
            t = k * 2 * math.pi / 3
            pz.linea([(x, y), (x + 4 * math.cos(t), y + 4 * math.sin(t))], c, a)
    elif nombre == "tarea_invernadero":    # brote con dos hojas y una gota
        pz.linea([(x, y + 5), (x, y - 2)], (90, 200, 140), 1.6)
        pz.elipse(x - 7, y - 5, x, y, fill=(90, 200, 140), outline=TINTA, width=0.5)
        pz.elipse(x, y - 7, x + 7, y - 2, fill=(130, 220, 120), outline=TINTA, width=0.5)
        pz.elipse(x + 4, y + 1, x + 7, y + 4, fill=(120, 200, 240))
    elif nombre == "refugio":              # escudo
        pz.poligono([(x, y - 6), (x + 5, y - 4), (x + 4, y + 2), (x, y + 6), (x - 4, y + 2), (x - 5, y - 4)], outline=c)
        pz.linea([(x, y - 4), (x, y + 4)], c, 0.7)
    elif nombre == "antena":               # plato de antena con ondas
        pz.poligono([(x - 5, y + 2), (x + 1, y - 4), (x + 3, y + 2)], outline=c)
        pz.linea([(x - 1, y + 1), (x - 3, y + 5)], c, a)
        pz.linea([(x + 4, y - 4), (x + 6, y - 6)], c, 0.7)
        pz.linea([(x + 5, y - 2), (x + 7, y - 3)], c, 0.7)
    else:                                  # consola: repartir la energía (tres barras distintas)
        for k, (alto, col) in enumerate(((7, ACENTO["energia"]), (4, ACENTO["oxigeno"]), (9, ACENTO["blindaje"]))):
            pz.rect(x - 5 + k * 4, y + 4 - alto, x - 2 + k * 4, y + 4, fill=col)


# --- Estilo de impresión ---------------------------------------------------------
# Lo que acerca el mapa a las referencias (cartel pulp, cómic entintado, grabado):
#   1. tinta gruesa en todos los bordes        (cómic y grabado)
#   2. sombras con rayado, no con degradado    (grabado)
#   3. puntos de trama en lo oscuro            (cartel pulp)
#   4. sombras frías teal y luces cálidas      (naranja contra teal)
#   5. tinta un poco corrida, como imprenta    (serigrafía / riso)
SOMBRA_FRIA = np.array([0.07, 0.22, 0.27], np.float32)    # teal profundo
LUZ_CALIDA = np.array([1.00, 0.66, 0.40], np.float32)     # naranja crema
TINTA_F = np.array(TINTA, np.float32) / 255
TRAMA_TEAL = np.array([0.05, 0.16, 0.20], np.float32)


def tono_partido(a, fuerza_sombra=0.30, fuerza_luz=0.14):
    """Sombras hacia el teal, luces hacia el naranja (como las referencias 1 y 4).
    Respeta los colores saturados (acentos de sistema, cables, señales)."""
    l = a.mean(axis=2, keepdims=True)
    sat = (a.max(axis=2, keepdims=True) - a.min(axis=2, keepdims=True))
    gris = np.clip(1 - sat * 2.2, 0, 1)
    a = a + gris * (1 - l) ** 2 * (SOMBRA_FRIA - a) * fuerza_sombra
    return a + gris * l ** 2 * (LUZ_CALIDA - a) * fuerza_luz


def bordes_tinta(a, umbral=0.16, grosor=0):
    """Líneas de tinta donde hay un cambio fuerte de tono (antes de añadir texturas)."""
    from scipy import ndimage
    l = a.mean(axis=2)
    g = np.maximum(np.abs(ndimage.sobel(l, 0)), np.abs(ndimage.sobel(l, 1))) / 4
    borde = g > umbral
    if grosor:
        borde = ndimage.binary_dilation(borde, iterations=grosor)
    return borde


def estilo_impresion(a, luz, sombra, alfa=None):
    """a: imagen RGB 0-1 · luz: 0-1 (lámparas) · sombra: 0-1 (sombra de muros y objetos).
    alfa: si se da (capa "encima"), solo se tiñe y se entinta donde hay dibujo."""
    alto, ancho = a.shape[:2]
    yy, xx = np.mgrid[0:alto, 0:ancho].astype(np.float32)
    borde = bordes_tinta(a)
    a = serigrafia(tono_partido(a))
    if alfa is None:
        # Trama de puntos a 45°: más grandes cuanto más lejos de la luz
        oscuro = np.clip(1 - luz * 1.7, 0, 1) ** 1.8
        paso = 6.0
        u = (xx + yy) / math.sqrt(2) % paso - paso / 2
        v = (xx - yy) / math.sqrt(2) % paso - paso / 2
        punto = (u * u + v * v) < (paso * 0.5 * np.sqrt(oscuro) * 0.85) ** 2
        a[punto] = a[punto] * 0.62 + TRAMA_TEAL * 0.38
        # Rayado de grabado en las sombras: una dirección, y cruzado donde es más oscuro
        diag = (xx + yy) % 5 < 1.25
        cruz = (xx - yy) % 5 < 1.25
        rayas = (diag & (sombra > 0.22)) | (cruz & (sombra > 0.55))
        a[rayas] = a[rayas] * 0.55 + TINTA_F * 0.45
    # Tinta (un poco corrida hacia abajo-derecha en violeta, como una imprenta)
    corrida = np.roll(np.roll(borde, 1, 0), 1, 1) & ~borde
    a[corrida] = a[corrida] * 0.7 + np.array([0.35, 0.12, 0.30], np.float32) * 0.3
    a[borde] = a[borde] * 0.3 + TINTA_F * 0.7
    return np.clip(a, 0, 1)


# Tintas de "serigrafía": cada píxel termina en uno de estos colores (como un cartel impreso
# con pocas tintas). Sacadas de las cuatro referencias + los colores de sistema.
TINTAS = [
    (20, 16, 38), (30, 26, 60), (44, 40, 86), (62, 56, 116), (86, 80, 150), (102, 94, 170), (118, 110, 190), (138, 128, 208), (160, 150, 226), (190, 178, 238),  # violetas
    (14, 34, 44), (22, 58, 66), (36, 92, 98), (47, 143, 138), (111, 179, 167),                                 # teales
    (243, 227, 195), (250, 246, 236), (246, 190, 146), (232, 120, 60), (196, 120, 70), (170, 84, 52), (112, 52, 36),  # cálidos
    (255, 200, 61), (228, 138, 216), (94, 200, 242), (124, 240, 160), (181, 140, 255), (232, 96, 200),          # sistemas
    (60, 110, 200), (184, 71, 61), (214, 160, 110), (150, 126, 108),
    (64, 140, 140), (96, 172, 160),                                                                             # teal iluminado (invernadero)
]


def serigrafia(a):
    """Reduce la imagen a las TINTAS, sin tramado: zonas planas y bandas de luz, como un cartel."""
    pal = Image.new("P", (1, 1))
    plano = [c for t in TINTAS for c in t]
    pal.putpalette(plano + plano[:3] * (256 - len(TINTAS)))
    img = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8), "RGB")
    q = img.quantize(palette=pal, dither=Image.Dither.NONE).convert("RGB")
    return np.asarray(q).astype(np.float32) / 255


TINTAS_INTERIOR = [
    (20, 16, 38), (40, 34, 86), (52, 44, 104), (66, 58, 130), (84, 76, 156), (96, 88, 170), (106, 98, 182), (118, 110, 196),
    (124, 116, 200), (138, 130, 210), (150, 142, 218), (160, 152, 226), (172, 164, 232), (190, 184, 236), (206, 200, 244),
    (212, 206, 246), (246, 244, 250),                                                                  # violetas y blancos
    (228, 138, 216), (247, 182, 238), (196, 150, 220), (232, 96, 200), (70, 34, 84), (90, 48, 104), (120, 52, 120),  # rosas y cultivo
    (255, 200, 61), (94, 200, 242), (181, 140, 255), (124, 240, 160),                                  # sistemas
    (124, 200, 150), (111, 179, 167), (60, 120, 100),                                                  # plantas
    (26, 22, 64), (40, 36, 94), (58, 64, 134), (78, 116, 186), (110, 170, 230), (200, 230, 255), (130, 140, 210),  # atardecer azul
    (84, 52, 84), (54, 28, 50), (255, 236, 190), (233, 223, 200), (184, 71, 61), (60, 110, 200), (150, 200, 250),
    (230, 80, 60), (64, 58, 46), (170, 150, 130),
]


def acabado_interior(a, sombra, capa_encima=False):
    """Línea del interior aprobado: colores planos de una lista corta, contornos violeta oscuro (no negro),
    rayado violeta en la sombra de los muros y nada de trama de puntos."""
    alto, ancho = a.shape[:2]
    borde = bordes_tinta(a, umbral=0.2)
    pal = Image.new("P", (1, 1))
    plano = [c for t in TINTAS_INTERIOR for c in t]
    pal.putpalette(plano + plano[:3] * (256 - len(TINTAS_INTERIOR)))
    q = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).quantize(palette=pal, dither=Image.Dither.NONE)
    a = np.asarray(q.convert("RGB")).astype(np.float32) / 255
    if not capa_encima:
        yy, xx = np.mgrid[0:alto, 0:ancho]
        rayas = ((xx + yy) % 6 < 1.4) & (sombra > 0.3)
        a[rayas] = a[rayas] * 0.6 + np.array(NERVIO, np.float32) / 255 * 0.4
    a[borde] = a[borde] * 0.35 + np.array(TINTA, np.float32) / 255 * 0.65
    return np.clip(a, 0, 1)


def manchas_papel(alto, ancho, semilla=11):
    """Variación suave de tinta, como papel impreso (manchas grandes y difusas)."""
    from scipy import ndimage
    r = np.random.default_rng(semilla).normal(0, 1, (alto // 16 + 1, ancho // 16 + 1)).astype(np.float32)
    r = ndimage.zoom(ndimage.gaussian_filter(r, 1.2), 16, order=1)[:alto, :ancho]
    return r / (np.abs(r).max() + 1e-6)


def leer_mapa():
    m = json.loads(MAPA.read_text(encoding="utf-8"))
    W, H = m["width"], m["height"]
    capas = {l["name"]: l for l in m["layers"]}
    rejilla = lambda n: [capas[n]["data"][y * W:(y + 1) * W] for y in range(H)]
    return m, W, H, rejilla("suelo"), rejilla("paredes"), rejilla("encima"), capas["objetos"]["objects"]


def main():
    m, W, H, suelo, paredes, encima, objetos = leer_mapa()
    rnd = random.Random(7)
    es_muro = lambda c, r: 0 <= c < W and 0 <= r < H and paredes[r][c] == 3
    es_maquina = lambda c, r: 0 <= c < W and 0 <= r < H and paredes[r][c] == 4
    salas = [(o["name"], o["x"], o["y"], o["width"], o["height"]) for o in objetos if o["type"] == "habitacion"]

    def sala_en(px, py):
        for n, x, y, w, h in salas:
            if x <= px < x + w and y <= py < y + h:
                return n
        return None

    fondo = Image.new("RGB", (W * T * K, H * T * K), TINTA)
    arriba = Image.new("RGBA", fondo.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(fondo)
    da = ImageDraw.Draw(arriba)
    R = lambda x0, y0, x1, y1: [x0 * K, y0 * K, x1 * K - 1, y1 * K - 1]
    linea = 1.5 * K   # grosor de la tinta

    # --- 1. Suelo -------------------------------------------------------------
    for r in range(H):
        for c in range(W):
            g = suelo[r][c]
            if not g:
                continue
            x, y = c * T, r * T
            sala = sala_en(x + 1, y + 1)
            if g == 2:                                    # invernadero: suelo oscuro bajo la luz LED magenta
                d.rectangle(R(x, y, x + T, y + T), fill=INV_SUELO)
                d.line([(x * K, (y + T - 1) * K), ((x + T) * K, (y + T - 1) * K)], fill=INV_REJILLA, width=K)
                if c % 2 == 0:
                    d.line([((x + T - 1) * K, y * K), ((x + T - 1) * K, (y + T) * K)], fill=INV_REJILLA, width=K)
                continue
            base = PASILLO if sala == "Pasillo" else SUELO
            d.rectangle(R(x, y, x + T, y + T), fill=base)
            if c % 2 == 0:                                # paneles grandes de 2 x 2 casillas
                d.line([(x * K, y * K), (x * K, (y + T) * K)], fill=SUELO_JUNTA, width=K)
            if r % 2 == 0:
                d.line([(x * K, y * K), ((x + T) * K, y * K)], fill=SUELO_JUNTA, width=K)
            azar = rnd.random()
            if g == 6:                                    # umbral de la puerta: placa clara con guías rosas
                d.rectangle(R(x, y + 2, x + T, y + T - 2), fill=SUELO_BRILLO)
                for yy in (y + 5, y + T - 7):
                    d.rounded_rectangle(R(x + 6, yy, x + T - 6, yy + 2), K, fill=ROSA)
            elif azar < 0.06:                             # rejilla de ventilación (pocas: lo recargado distrae)
                d.rounded_rectangle(R(x + 7, y + 9, x + T - 7, y + T - 9), 2 * K, fill=SUELO_JUNTA)
                for k in range(y + 11, y + T - 10, 3):
                    d.line([((x + 9) * K, k * K), ((x + T - 9) * K, k * K)], fill=base, width=K)
            elif azar < 0.12:                             # remaches
                for px, py in ((x + 5, y + 5), (x + T - 6, y + 5), (x + 5, y + T - 6), (x + T - 6, y + T - 6)):
                    d.ellipse(R(px, py, px + 2, py + 2), fill=SUELO_BRILLO)
            if sala == "Pasillo" and r in (7, 9):         # guía luminosa a lo largo del pasillo
                yy = y + (4 if r == 7 else T - 6)
                d.line([(x * K, yy * K), ((x + T) * K, yy * K)], fill=SUELO_BRILLO, width=2 * K)

    # --- 2. Sombra de los muros sobre el suelo (luz desde arriba a la izquierda) ---
    sombra = Image.new("L", fondo.size, 0)
    ds = ImageDraw.Draw(sombra)
    for r in range(H):
        for c in range(W):
            if suelo[r][c] and es_muro(c, r - 1):
                ds.rectangle(R(c * T, r * T, c * T + T, r * T + 9), fill=150)
            if suelo[r][c] and es_muro(c - 1, r):
                ds.rectangle(R(c * T, r * T, c * T + 6, r * T + T), fill=110)
    sombra = sombra.filter(ImageFilter.GaussianBlur(4 * K))
    fondo = Image.composite(Image.new("RGB", fondo.size, SOMBRA), fondo, sombra.point(lambda v: min(255, v * 1.4)))
    d = ImageDraw.Draw(fondo)

    # --- 2b. Detalle de suelo por sala ---------------------------------------
    puertas = []                                       # (centro x, fila) de cada puerta
    for r in range(H):
        c = 0
        while c < W:
            if suelo[r][c] == 6:
                c0 = c
                while c < W and suelo[r][c] == 6:
                    c += 1
                puertas.append(((c0 + c) * T / 2, r))
            c += 1
    detalles_suelo(d, puertas, sala_en)

    # --- 3. Muros en vista 3/4: tapa clara + frente cuando abajo hay suelo ------
    TAPA = 13
    ventanas, tiras = [], []
    for r in range(H):
        for c in range(W):
            if not es_muro(c, r):
                continue
            x, y = c * T, r * T
            frente = not es_muro(c, r + 1) and r + 1 < H
            alto_tapa = TAPA if frente else T
            d.rectangle(R(x, y, x + T, y + alto_tapa), fill=MURO_TAPA)
            if not es_muro(c, r - 1):
                d.rectangle(R(x, y, x + T, y + 3), fill=MURO_TAPA_LUZ)
            if not es_muro(c - 1, r):
                d.rectangle(R(x, y, x + 3, y + alto_tapa), fill=MURO_TAPA_LUZ)
            for yy in range(y + 3, y + alto_tapa - 1, 3):          # tapa: capas de la impresora 3D
                d.line([(x * K, yy * K), ((x + T) * K, yy * K)], fill=MURO_TAPA_LUZ if yy % 6 else (160, 152, 224), width=K // 2)
            if frente:
                d.rectangle(R(x, y + TAPA, x + T, y + T), fill=MURO_FRENTE)
                for yy in range(y + TAPA + 2, y + T - 4, 2):        # frente: nervaduras de regolito impreso
                    d.line([(x * K, yy * K), ((x + T) * K, yy * K)], fill=NERVIO, width=K // 2)
                d.rectangle(R(x, y + T - 4, x + T, y + T), fill=ZOCALO)
                d.line([(x * K, (y + TAPA) * K), ((x + T) * K, (y + TAPA) * K)], fill=MURO_TAPA_LUZ, width=K)
                d.line([((x + T - 1) * K, (y + TAPA + 2) * K), ((x + T - 1) * K, (y + T - 5) * K)], fill=MURO_FRENTE_OSC, width=K)
                if r == 0 and c % 3 == 1:
                    ventanas.append((x, y))
                sala_abajo = sala_en(x + 1, y + T + 1)
                if sala_abajo in SISTEMA_DE_SALA:            # franja de luz con el color de la sala
                    tiras.append((x, y + TAPA + 5, ACENTO[SISTEMA_DE_SALA[sala_abajo]]))
            # tinta en los bordes que dan a algo que no es muro
            if not es_muro(c, r - 1):
                d.line([(x * K, y * K), ((x + T) * K, y * K)], fill=TINTA, width=int(linea))
            if not es_muro(c - 1, r):
                d.line([(x * K, y * K), (x * K, (y + T) * K)], fill=TINTA, width=int(linea))
            if not es_muro(c + 1, r):
                d.line([((x + T) * K - 1, y * K), ((x + T) * K - 1, (y + T) * K)], fill=TINTA, width=int(linea))
            if frente:
                d.line([(x * K, (y + T) * K - 1), ((x + T) * K, (y + T) * K - 1)], fill=TINTA, width=int(linea))

    for x, y, ac in tiras:
        d.rectangle(R(x, y, x + T, y + 2), fill=ac)
    for i, (x, y) in enumerate(ventanas):                  # ventanas: muro grueso y atardecer azul de Gale
        vx0, vy0, vx1, vy1 = x + 3, y + TAPA + 2, x + T - 3, y + T - 5
        d.rectangle(R(vx0 - 1, vy0 - 1, vx1 + 1, vy1 + 1), fill=MURO_FRENTE_OSC)               # derrame del muro
        ix0, iy0, ix1, iy1 = vx0 + 2, vy0 + 1, vx1 - 1, vy1 - 2
        bandas = CIELO_ATARDECER[2:]                       # la ventana es pequeña: solo el tramo azul del atardecer
        for k, c in enumerate(bandas):
            h = (iy1 - iy0) / len(bandas)
            d.rectangle(R(ix0, iy0 + k * h, ix1, iy0 + (k + 1) * h + 0.5), fill=bandas[k])
        if i % 3 == 1:                                     # el Sol pequeño (2/3 del que vemos) con halo azul
            cx, cy = (ix0 + ix1) / 2, iy1 - 3
            d.ellipse(R(cx - 4, cy - 3, cx + 4, cy + 3), fill=(200, 230, 255))
            d.ellipse(R(cx - 1.5, cy - 1.5, cx + 1.5, cy + 1.5), fill=LUZ)
        else:
            for k in range(3):
                sx, sy = ix0 + 2 + (k * 7 + i * 3) % (ix1 - ix0 - 3), iy0 + 1 + (k * 3) % 4
                d.ellipse(R(sx, sy, sx + 0.8, sy + 0.8), fill=LUZ)
        # buttes en el horizonte: mesas de cima plana, en silueta
        bx = ix0 + (i * 5) % 9
        d.polygon([(ix0 * K, iy1 * K), (ix0 * K, (iy1 - 2) * K), (bx * K, (iy1 - 2) * K), ((bx + 1) * K, (iy1 - 5) * K),
                   ((bx + 6) * K, (iy1 - 5) * K), ((bx + 7) * K, (iy1 - 2) * K), (ix1 * K, (iy1 - 2) * K), (ix1 * K, iy1 * K)], fill=SUELO_MARTE)
        d.rectangle(R(ix0, iy1 - 1, ix1, iy1), fill=SUELO_MARTE_OSC)
        d.line([((ix1 - 6) * K, iy0 * K), ((ix1 - 9) * K, iy1 * K)], fill=(130, 140, 210), width=K // 2)   # reflejo
        d.rectangle(R(vx0, vy0, vx1, vy1), outline=TINTA, width=int(linea))

    detalles_muro(d)

    # --- 4. Máquinas: cuerpo en el fondo, tapa en la capa "encima" -------------
    for r in range(H):
        for c in range(W):
            if not es_maquina(c, r):
                continue
            x, y = c * T, r * T
            sistema = SISTEMA_DE_SALA.get(sala_en(x + 1, y + 1), "mando")
            ac = ACENTO[sistema]
            # sombra en el suelo
            d.ellipse(R(x + 1, y + T - 8, x + T + 3, y + T + 3), fill=mezcla(SUELO, TINTA, 0.6))
            # cuerpo (frente) en la casilla que colisiona
            x0, x1 = x + 3, x + T - 3
            d.rounded_rectangle(R(x0, y - 2, x1, y + T - 3), 2 * K, fill=MURO_FRENTE, outline=TINTA, width=int(linea))
            if sistema == "energia":       # baterías: barras de carga
                for i, carga in enumerate((1, 0.7, 0.4)):
                    yy = y + 3 + i * 7
                    d.rectangle(R(x0 + 4, yy, x1 - 4, yy + 4), fill=TINTA)
                    d.rectangle(R(x0 + 5, yy + 1, x0 + 5 + (x1 - x0 - 10) * carga, yy + 3), fill=ac)
            elif sistema == "comunicaciones":   # rack con luces
                for i in range(4):
                    yy = y + 3 + i * 6
                    d.rectangle(R(x0 + 3, yy, x1 - 3, yy + 3), fill=MURO_FRENTE_OSC)
                    d.ellipse(R(x1 - 7, yy + 1, x1 - 5, yy + 3), fill=ac if i % 2 == 0 else AMBAR)
            elif sistema == "oxigeno" and sala_en(x + 1, y + 1) == "Invernadero":   # torre hidropónica
                d.rounded_rectangle(R(x0 + 2, y + 2, x1 - 2, y + T - 7), K, fill=TIERRA)
                for i in range(4):
                    cx, cy = x0 + 6 + (i % 2) * 8, y + 5 + i * 5
                    d.ellipse(R(cx - 3, cy - 2, cx + 3, cy + 2), fill=HOJA if i % 3 else HOJA_CALIDA)
            elif sistema == "oxigeno":     # tanque de filtro
                d.rectangle(R(x0 + 6, y + 2, x1 - 6, y + T - 8), fill=mezcla(ac, TINTA, 0.55))
                d.rectangle(R(x0 + 6, y + 6, x1 - 6, y + 10), fill=ac)
            else:                          # pantalla (mando) o tanques de agua (refugio)
                d.rectangle(R(x0 + 4, y + 3, x1 - 4, y + 14), fill=mezcla(ac, TINTA, 0.25), outline=TINTA, width=K)
                for i in range(3):
                    d.line([((x0 + 6) * K, (y + 6 + i * 3) * K), ((x1 - 6 - i * 3) * K, (y + 6 + i * 3) * K)], fill=LUZ, width=K)
            # tapa (casilla de arriba): va a la capa "encima"
            yt = y - T
            da.rounded_rectangle(R(x0, yt + 8, x1, y + 2), 2 * K, fill=MURO_FRENTE + (255,), outline=TINTA + (255,), width=int(linea))
            da.rounded_rectangle(R(x0, yt + 8, x1, yt + 18), 2 * K, fill=MURO_TAPA + (255,), outline=TINTA + (255,), width=int(linea))
            da.rectangle(R(x0 + 2, yt + 10, x1 - 2, yt + 12), fill=MURO_TAPA_LUZ + (255,))
            da.ellipse(R(x0 + 4, yt + 22, x0 + 8, yt + 26), fill=ac + (255,))
            da.ellipse(R(x0 + 10, yt + 22, x0 + 14, yt + 26), fill=AMBAR + (255,))
            if sistema == "oxigeno" and sala_en(x + 1, y + 1) == "Invernadero":
                for i in range(5):     # hojas que asoman por arriba
                    cx = x0 + 3 + i * 4
                    da.ellipse(R(cx - 3, yt + 3 + (i % 2) * 3, cx + 3, yt + 10 + (i % 2) * 3),
                               fill=(HOJA if i % 2 else HOJA_CALIDA) + (255,), outline=TINTA + (255,), width=K)

    # --- 5. Estaciones: placa en el suelo con el color de su sistema ----------
    for o in objetos:
        if o["type"] != "interaccion":
            continue
        props = {p["name"]: p["value"] for p in o.get("properties", [])}
        ac = ACENTO.get(props.get("sistema"), LUZ)
        x, y = o["x"], o["y"]
        d.ellipse(R(x - 13, y - 10, x + 13, y + 12), fill=mezcla(SUELO, TINTA, 0.5))
        d.rounded_rectangle(R(x - 11, y - 9, x + 11, y + 9), 3 * K, fill=MURO_FRENTE, outline=TINTA, width=int(linea))
        d.rounded_rectangle(R(x - 8, y - 7, x + 8, y + 5), 2 * K, fill=mezcla(ac, TINTA, 0.68), outline=ac, width=K)
        pictograma(Pincel(d), o["name"], x, y - 1)       # qué se hace aquí, sin leer
        d.ellipse(R(x + 7, y + 6, x + 10, y + 9), fill=ac)

    # --- 5b. Muebles: lo de abajo al fondo, lo que sube por encima de la huella a "encima" ---
    fondo_m, encima_m = dibujar_muebles(fondo.size, objetos, sala_en)
    fondo = Image.alpha_composite(fondo.convert("RGBA"), fondo_m).convert("RGB")
    arriba = Image.alpha_composite(arriba, encima_m)
    d = ImageDraw.Draw(fondo)

    # --- 6. Reducir a la resolución final -------------------------------------
    tam = (W * T * FINAL, H * T * FINAL)
    fondo = fondo.resize(tam, Image.LANCZOS)
    arriba = arriba.resize(tam, Image.LANCZOS)
    f = FINAL

    # --- 7. Luz: círculos cálidos bajo las lámparas + brillo de color en estaciones ---
    a = np.asarray(fondo).astype(np.float32) / 255
    yy, xx = np.mgrid[0:tam[1], 0:tam[0]].astype(np.float32)
    luz = np.zeros(tam[::-1], np.float32)
    tinte = np.zeros(tam[::-1] + (3,), np.float32)

    def foco(cx, cy, rx, ry, fuerza):
        return fuerza * np.exp(-(((xx - cx * f) / (rx * f)) ** 2 + ((yy - cy * f) / (ry * f)) ** 2))

    for n, x, y, w, h in salas:
        if n == "Pasillo":
            for cx in range(int(x + 96), int(x + w - 64), 192):
                luz += foco(cx, y + h / 2, 70, 40, 0.8)
        else:
            luz += foco(x + w / 2, y + h / 2 + 10, w * 0.30, h * 0.36, 1.0)
    for o in objetos:
        if o["type"] == "interaccion":
            props = {p["name"]: p["value"] for p in o.get("properties", [])}
            ac = np.array(ACENTO.get(props.get("sistema"), LUZ), np.float32) / 255
            tinte += foco(o["x"], o["y"], 26, 22, 0.55)[..., None] * ac
    for n, x, y, w, h in salas:
        if n == "Invernadero":                         # luz de cultivo magenta
            tinte += foco(x + w / 2, y + h / 2, w * 0.45, h * 0.5, 0.35)[..., None] * (np.array(MAGENTA_CULTIVO, np.float32) / 255)
    luz = np.clip(luz, 0, 1)
    # Los muros reciben luz pareja: los círculos de luz son del suelo (si no, las bandas manchan las tapas)
    muro_f = np.zeros(tam[::-1], bool)
    for r in range(H):
        for c in range(W):
            if es_muro(c, r):
                muro_f[r * T * f:(r + 1) * T * f, c * T * f:(c + 1) * T * f] = True
    luz = np.where(muro_f, 0.42, luz)
    # círculos de luz planos, como en el interior aprobado: un anillo y un centro más claro
    claro = np.array((212, 206, 246), np.float32) / 255
    anillo = (luz > 0.45).astype(np.float32)[..., None]
    centro = (luz > 0.75).astype(np.float32)[..., None]
    a = a * (0.9 + 0.06 * anillo) + (claro - a) * 0.22 * anillo + (claro - a) * 0.22 * centro + tinte * 0.25

    # viñeta suave en los bordes del mapa
    vy = (yy / tam[1] - 0.5) * 2
    vx = (xx / tam[0] - 0.5) * 2
    a *= (1 - 0.10 * np.clip(vx ** 2 + vy ** 2 - 0.5, 0, 1))[..., None]

    # --- 7b. Estilo de impresión (tinta, rayado, trama, teal y naranja) ---------
    sombra_f = np.asarray(sombra.resize(tam, Image.BILINEAR)).astype(np.float32) / 255
    a = acabado_interior(a, sombra_f)
    a *= (1 + 0.03 * manchas_papel(tam[1], tam[0]))[..., None]
    b0 = np.asarray(arriba).astype(np.float32) / 255
    b0[..., :3] = acabado_interior(b0[..., :3].copy(), sombra_f, capa_encima=True)
    arriba = Image.fromarray((np.clip(b0, 0, 1) * 255).astype(np.uint8), "RGBA")

    # --- 8. Grano de impresión (el mismo en las dos capas) --------------------
    ruido = np.random.default_rng(3).normal(0, 0.022, tam[::-1]).astype(np.float32)
    a = np.clip(a + ruido[..., None], 0, 1)
    fondo = Image.fromarray((a * 255).astype(np.uint8))
    b = np.asarray(arriba).astype(np.float32) / 255
    b[..., :3] = np.clip(b[..., :3] * (0.95 + 0.0) + ruido[..., None], 0, 1)
    arriba = Image.fromarray((b * 255).astype(np.uint8), "RGBA")

    SALIDA.mkdir(parents=True, exist_ok=True)
    fondo.save(SALIDA / "fondo_base.png", optimize=True)
    arriba.save(SALIDA / "encima_base.png", optimize=True)
    print(f"Pintado {tam[0]}x{tam[1]}: assets/mapas/fondo_base.png y encima_base.png")


if __name__ == "__main__":
    main()
