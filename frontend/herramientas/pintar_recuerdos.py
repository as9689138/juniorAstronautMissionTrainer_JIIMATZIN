"""Ilustraciones de los recuerdos de la IA (los flashbacks de la historia).

Cada recuerdo (src/mecanicas/recuerdos.js) tiene una ilustración en estilo holograma: líneas cian con brillo, rellenos
transparentes y algún acento ámbar (el Sol, el calor). Es lo que "proyecta" el robotcito de la base cuando recuerda.
Salen en public/assets/recuerdos/<id>.png con fondo transparente, recortadas a su dibujo (lienzo de 960 x 540).

    python frontend/herramientas/pintar_recuerdos.py            # todas
    python frontend/herramientas/pintar_recuerdos.py apolo13    # solo una

Requiere Python 3.11 con Pillow. Los dibujos son esquemas para niños de 7 a 12 años, no planos exactos: muestran
lo que cuenta la historia (historia/paquete_historia.md, sección 7) y nada más.
"""
import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

SALIDA = Path(__file__).resolve().parents[1] / "public" / "assets" / "recuerdos"
W, H = 960, 540
SS = 2                                   # se dibuja al doble y se reduce (bordes suaves)
CIAN = (94, 200, 242)
CLARO = (214, 246, 255)
AMBAR = (255, 190, 92)
ROJO = (255, 120, 100)


class Holo:
    def __init__(self):
        self.lin = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
        self.rel = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
        self.est = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))     # las estrellas, aparte: no cuentan al recortar
        self.dl = ImageDraw.Draw(self.lin)
        self.dr = ImageDraw.Draw(self.rel)
        self.de = ImageDraw.Draw(self.est)

    # --- primitivas (coordenadas en 960 x 540) ---
    @staticmethod
    def p(pts):
        return [(x * SS, y * SS) for x, y in pts]

    @staticmethod
    def caja(x0, y0, x1, y1):
        return [min(x0, x1) * SS, min(y0, y1) * SS, max(x0, x1) * SS, max(y0, y1) * SS]

    def linea(self, pts, ancho=3, color=CIAN, alfa=255):
        self.dl.line(self.p(pts), fill=color + (alfa,), width=round(ancho * SS), joint="curve")

    def poli(self, pts, relleno=40, ancho=3, color=CIAN, alfa=255):
        if relleno:
            self.dr.polygon(self.p(pts), fill=color + (relleno,))
        self.dl.line(self.p(pts + [pts[0]]), fill=color + (alfa,), width=round(ancho * SS), joint="curve")

    def rect(self, x0, y0, x1, y1, relleno=40, ancho=3, color=CIAN, radio=0, alfa=255):
        if relleno:
            self.dr.rounded_rectangle(self.caja(x0, y0, x1, y1), radius=radio * SS, fill=color + (relleno,))
        self.dl.rounded_rectangle(self.caja(x0, y0, x1, y1), radius=radio * SS, outline=color + (alfa,), width=round(ancho * SS))

    def elipse(self, cx, cy, rx, ry, relleno=40, ancho=3, color=CIAN, alfa=255):
        b = self.caja(cx - rx, cy - ry, cx + rx, cy + ry)
        if relleno:
            self.dr.ellipse(b, fill=color + (relleno,))
        if ancho:
            self.dl.ellipse(b, outline=color + (alfa,), width=round(ancho * SS))

    def circulo(self, cx, cy, r, **kw):
        self.elipse(cx, cy, r, r, **kw)

    def arco(self, cx, cy, rx, ry, a0, a1, ancho=3, color=CIAN, alfa=255):
        self.dl.arc(self.caja(cx - rx, cy - ry, cx + rx, cy + ry), a0, a1, fill=color + (alfa,), width=round(ancho * SS))

    def punto(self, x, y, r=2.5, color=CIAN, alfa=255):
        self.dl.ellipse(self.caja(x - r, y - r, x + r, y + r), fill=color + (alfa,))

    def discontinua(self, x0, y0, x1, y1, paso=16, ancho=2, color=CIAN, alfa=200):
        largo = math.hypot(x1 - x0, y1 - y0)
        n = max(1, int(largo // paso))
        for i in range(0, n, 2):
            a, b = i / n, min(1, (i + 1) / n)
            self.linea([(x0 + (x1 - x0) * a, y0 + (y1 - y0) * a), (x0 + (x1 - x0) * b, y0 + (y1 - y0) * b)], ancho, color, alfa)

    def estrellas(self, n=40, semilla=1, y_max=H, x0=0, x1=W):
        rnd = random.Random(semilla)
        for _ in range(n):
            x, y, r = rnd.uniform(x0, x1), rnd.uniform(8, y_max), rnd.choice([1.2, 1.6, 2.2])
            self.de.ellipse(self.caja(x - r, y - r, x + r, y + r), fill=CLARO + (rnd.randint(90, 200),))

    def suelo(self, y=440, semilla=3, rocas=True):
        rnd = random.Random(semilla)
        pts = [(x, y + math.sin(x / 70) * 6 + math.sin(x / 23) * 2) for x in range(0, W + 10, 10)]
        self.linea(pts, 3)
        for k in range(1, 4):                                    # rejilla de proyección hacia abajo
            self.linea([(0, y + k * 26), (W, y + k * 26)], 1.2, CIAN, 90 - k * 20)
        if rocas:
            for _ in range(7):
                x = rnd.uniform(40, W - 40)
                r = rnd.uniform(6, 14)
                self.poli([(x - r, y + 2), (x - r * 0.4, y - r * 0.8), (x + r * 0.6, y - r * 0.6), (x + r, y + 2)], 30, 2)

    # --- piezas que se repiten ---
    def sol(self, cx, cy, r, rayos=12, largo=0.35, color=AMBAR):
        self.circulo(cx, cy, r, relleno=60, ancho=3, color=color)
        self.circulo(cx, cy, r * 0.72, relleno=40, ancho=1.5, color=color, alfa=160)
        for i in range(rayos):
            a = i / rayos * math.tau
            self.linea([(cx + math.cos(a) * r * 1.12, cy + math.sin(a) * r * 1.12),
                        (cx + math.cos(a) * r * (1.12 + largo), cy + math.sin(a) * r * (1.12 + largo))], 3, color)

    def planeta(self, cx, cy, r, bandas=3, color=CIAN):
        self.circulo(cx, cy, r, relleno=45, ancho=3, color=color)
        for k in range(1, bandas + 1):                           # paralelos
            yy = cy - r + 2 * r * k / (bandas + 1)
            dx = math.sqrt(max(0, r * r - (yy - cy) ** 2))
            self.arco(cx, yy, dx, r * 0.12, 0, 180, 1.5, color, 150)
        self.arco(cx, cy, r * 0.45, r, 270, 90, 1.5, color, 130)  # un meridiano

    def rueda(self, cx, cy, r):
        self.circulo(cx, cy, r, relleno=50, ancho=3)
        self.circulo(cx, cy, r * 0.35, relleno=0, ancho=2)
        for i in range(6):
            a = i / 6 * math.tau
            self.linea([(cx + math.cos(a) * r * 0.35, cy + math.sin(a) * r * 0.35), (cx + math.cos(a) * r * 0.9, cy + math.sin(a) * r * 0.9)], 1.5)

    def panel(self, x0, y0, x1, y1, cols=6, filas=2, color=CIAN):
        self.rect(x0, y0, x1, y1, relleno=55, ancho=2.5, color=color)
        for c in range(1, cols):
            x = x0 + (x1 - x0) * c / cols
            self.linea([(x, y0), (x, y1)], 1.2, color, 150)
        for f in range(1, filas):
            y = y0 + (y1 - y0) * f / filas
            self.linea([(x0, y), (x1, y)], 1.2, color, 150)

    def rover_mer(self, x, y, s=1.0, polvo=0):
        """Spirit u Opportunity: cubierta de paneles grande, mástil con cámara, seis ruedas."""
        for dx in (-70, 0, 70):
            self.rueda(x + dx * s, y + 46 * s, 17 * s)
        self.linea([(x - 70 * s, y + 46 * s), (x - 36 * s, y + 14 * s), (x, y + 46 * s)], 2.5)
        self.linea([(x - 36 * s, y + 14 * s), (x + 34 * s, y + 14 * s), (x + 70 * s, y + 46 * s)], 2.5)
        self.rect(x - 58 * s, y - 14 * s, x + 58 * s, y + 14 * s, relleno=50, radio=4 * s)
        deck = [(x - 122 * s, y - 16 * s), (x - 104 * s, y - 30 * s), (x + 100 * s, y - 30 * s), (x + 124 * s, y - 16 * s)]
        self.poli(deck, 60, 3)
        for k in range(1, 8):
            xx = x - 110 * s + k * 28 * s
            self.linea([(xx, y - 29 * s), (xx + 3 * s, y - 17 * s)], 1.2, CIAN, 150)
        self.linea([(x + 46 * s, y - 30 * s), (x + 46 * s, y - 104 * s)], 3)
        self.rect(x + 28 * s, y - 122 * s, x + 66 * s, y - 102 * s, relleno=60, radio=3 * s)
        self.circulo(x + 38 * s, y - 112 * s, 4 * s, relleno=0, ancho=1.5)
        self.circulo(x + 56 * s, y - 112 * s, 4 * s, relleno=0, ancho=1.5)
        rnd = random.Random(7)
        for _ in range(polvo):
            self.punto(x + rnd.uniform(-110, 110) * s, y + rnd.uniform(-28, -18) * s, rnd.uniform(1.5, 3) * s, AMBAR, 200)

    def rover_msl(self, x, y, s=1.0):
        """Curiosity o Perseverance: cuerpo grande, aleta de energía atrás, mástil con cabeza, seis ruedas."""
        for dx in (-78, 0, 78):
            self.rueda(x + dx * s, y + 50 * s, 21 * s)
        self.linea([(x - 78 * s, y + 50 * s), (x - 40 * s, y + 18 * s), (x, y + 50 * s)], 3)
        self.linea([(x - 40 * s, y + 18 * s), (x + 40 * s, y + 18 * s), (x + 78 * s, y + 50 * s)], 3)
        self.rect(x - 84 * s, y - 26 * s, x + 76 * s, y + 18 * s, relleno=55, radio=5 * s)
        self.poli([(x - 84 * s, y - 20 * s), (x - 116 * s, y - 34 * s), (x - 116 * s, y + 6 * s), (x - 84 * s, y + 10 * s)], 45, 2.5)
        for k in range(4):
            self.linea([(x - 112 * s, y - 28 * s + k * 9 * s), (x - 88 * s, y - 18 * s + k * 7 * s)], 1.2, CIAN, 150)
        self.linea([(x + 50 * s, y - 26 * s), (x + 50 * s, y - 112 * s)], 3.5)
        self.rect(x + 26 * s, y - 136 * s, x + 80 * s, y - 110 * s, relleno=60, radio=4 * s)
        self.circulo(x + 40 * s, y - 123 * s, 5 * s, relleno=0, ancho=1.5)
        self.circulo(x + 62 * s, y - 123 * s, 5 * s, relleno=0, ancho=1.5)
        self.rect(x - 30 * s, y - 40 * s, x + 6 * s, y - 26 * s, relleno=40, ancho=2)   # una caja de instrumentos

    def astronauta(self, x, y, s=1.0, color=CIAN):
        self.rect(x - 16 * s, y - 20 * s, x + 16 * s, y + 22 * s, relleno=55, ancho=2.5, color=color, radio=8 * s)
        self.rect(x - 22 * s, y - 16 * s, x - 14 * s, y + 14 * s, relleno=40, ancho=2, color=color, radio=3 * s)
        self.circulo(x, y - 34 * s, 15 * s, relleno=50, ancho=2.5, color=color)
        self.elipse(x + 3 * s, y - 34 * s, 9 * s, 7 * s, relleno=80, ancho=1.5, color=CLARO)
        self.linea([(x - 8 * s, y + 22 * s), (x - 10 * s, y + 44 * s)], 5 * s, color)
        self.linea([(x + 8 * s, y + 22 * s), (x + 10 * s, y + 44 * s)], 5 * s, color)
        self.linea([(x + 15 * s, y - 10 * s), (x + 30 * s, y + 6 * s)], 5 * s, color)

    def persona(self, x, y, s=1.0):
        self.circulo(x, y - 46 * s, 11 * s, relleno=60, ancho=2.5)
        self.rect(x - 13 * s, y - 32 * s, x + 13 * s, y + 6 * s, relleno=50, ancho=2.5, radio=6 * s)
        self.linea([(x - 7 * s, y + 6 * s), (x - 8 * s, y + 30 * s)], 4 * s)
        self.linea([(x + 7 * s, y + 6 * s), (x + 8 * s, y + 30 * s)], 4 * s)

    def ondas(self, cx, cy, r0, n, a0, a1, paso=22, ancho=3, color=CIAN):
        for k in range(n):
            self.arco(cx, cy, r0 + k * paso, r0 + k * paso, a0, a1, ancho, color, max(70, 255 - k * 55))

    def molecula_co2(self, x, y, s=1.0):
        self.linea([(x - 22 * s, y), (x + 22 * s, y)], 3)
        self.circulo(x, y, 11 * s, relleno=70, ancho=2.5, color=CLARO)
        self.circulo(x - 26 * s, y, 9 * s, relleno=70, ancho=2.5, color=ROJO)
        self.circulo(x + 26 * s, y, 9 * s, relleno=70, ancho=2.5, color=ROJO)

    def molecula_o2(self, x, y, s=1.0):
        self.linea([(x - 10 * s, y), (x + 10 * s, y)], 3)
        self.circulo(x - 11 * s, y, 10 * s, relleno=70, ancho=2.5, color=ROJO)
        self.circulo(x + 11 * s, y, 10 * s, relleno=70, ancho=2.5, color=ROJO)

    def flecha(self, x0, y0, x1, y1, ancho=3, color=CIAN):
        self.linea([(x0, y0), (x1, y1)], ancho, color)
        a = math.atan2(y1 - y0, x1 - x0)
        for d in (2.6, -2.6):
            self.linea([(x1, y1), (x1 + math.cos(a + d) * 14, y1 + math.sin(a + d) * 14)], ancho, color)

    def guardar(self, nombre):
        glow = self.lin.filter(ImageFilter.GaussianBlur(6 * SS))
        glow.putalpha(glow.getchannel("A").point(lambda a: min(255, int(a * 1.7))))
        # recorte al dibujo (con margen), para que en el visor del flashback se vea grande
        dibujo = Image.alpha_composite(self.rel, self.lin)
        x0, y0, x1, y1 = dibujo.getchannel("A").point(lambda a: 255 if a > 40 else 0).getbbox()
        m = 34 * SS
        x0, y0, x1, y1 = max(0, x0 - m), max(0, y0 - m), min(W * SS, x1 + m), min(H * SS, y1 + m)
        img = Image.new("RGBA", self.lin.size, (0, 0, 0, 0))
        for capa in (self.est, self.rel, glow, self.lin):
            img = Image.alpha_composite(img, capa)
        img = img.crop((x0, y0, x1, y1))
        img = img.resize((round((x1 - x0) / SS), round((y1 - y0) / SS)), Image.LANCZOS)
        SALIDA.mkdir(parents=True, exist_ok=True)
        # paleta de 128 colores con transparencia: pesa menos de la mitad y en pantalla no se nota
        img.quantize(colors=128, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(SALIDA / f"{nombre}.png", optimize=True)
        print("recuerdo", nombre)


# ------------------------------------------------------------------ los 16 recuerdos

def chapea(h):
    h.sol(110, 90, 38, rayos=10)
    h.suelo(440, rocas=False)
    # el hábitat impreso en 3D (capas horizontales) y su cúpula
    h.rect(210, 290, 610, 440, relleno=45, radio=26)
    for y in range(302, 438, 11):
        h.linea([(216, y), (604, y)], 1, CIAN, 90)
    h.arco(705, 440, 115, 115, 180, 360, 3)
    h.dr.pieslice(h.caja(590, 325, 820, 555), 180, 360, fill=CIAN + (40,))
    h.rect(380, 360, 432, 440, relleno=70, radio=6)
    h.rect(250, 320, 320, 360, relleno=70, radio=4)
    h.rect(480, 320, 550, 360, relleno=70, radio=4)
    for i, x in enumerate((640, 690, 740, 790)):                # los cuatro voluntarios
        h.persona(x, 470 - (i % 2) * 6, 0.9)
    # el calendario de la misión (muchos días)
    h.rect(700, 60, 900, 220, relleno=40, radio=8)
    h.rect(700, 60, 900, 92, relleno=80, radio=8)
    for c in range(10):
        for f in range(5):
            h.punto(718 + c * 18.5, 112 + f * 22, 3.2, CLARO, 220)


def viento_limpia(h):
    h.estrellas(25, 2, 200)
    h.suelo(450)
    h.rover_mer(330, 360, 1.45, polvo=26)
    # el remolino de polvo (embudo de óvalos)
    for i in range(10):
        cx = 735 + math.sin(i * 0.9) * 14
        cy = 130 + i * 31
        h.elipse(cx, cy, 96 - i * 8.2, 13 - i * 0.6, relleno=18, ancho=2.5, alfa=230 - i * 12)
    rnd = random.Random(5)
    for _ in range(40):
        a = rnd.uniform(0, math.tau)
        rr = rnd.uniform(20, 130)
        h.punto(735 + math.cos(a) * rr, 280 + math.sin(a) * rr * 0.9, rnd.uniform(1.5, 3.2), AMBAR, 190)
    for k in range(3):                                         # el viento que barre los paneles
        y = 250 + k * 22
        h.linea([(640, y), (600, y - 6), (540, y - 4), (500, y + 4)], 2, CLARO, 160)


def apolo13(h):
    h.estrellas(40, 4)
    # la nave, pequeña, arriba
    h.poli([(820, 70), (780, 150), (860, 150)], 50, 2.5)
    h.rect(780, 150, 860, 190, relleno=40, ancho=2.5)
    # el filtro CUADRADO con su rejilla
    h.rect(250, 170, 430, 350, relleno=50, ancho=3.5)
    for k in range(1, 6):
        h.linea([(250 + k * 30, 176), (250 + k * 30, 344)], 1.2, CIAN, 140)
        h.linea([(256, 170 + k * 30), (424, 170 + k * 30)], 1.2, CIAN, 140)
    # el cartón y la bolsa que lo envuelven
    h.poli([(232, 330), (448, 330), (470, 410), (210, 410)], 35, 2.5, CLARO)
    # la cinta (franjas cruzadas)
    for x in (262, 392):
        h.poli([(x, 160), (x + 16, 160), (x + 30, 420), (x + 14, 420)], 30, 2, AMBAR)
    # la manguera hasta el hueco REDONDO
    pts = []
    for t in range(0, 41):
        u = t / 40
        pts.append((470 + 230 * u, 380 - 150 * math.sin(u * math.pi * 0.9) - 20 * u))
    h.linea(pts, 16, CIAN, 120)
    h.linea(pts, 4)
    for t in range(2, 40, 4):
        x, y = pts[t]
        h.circulo(x, y, 9, relleno=0, ancho=1.5, color=CLARO, alfa=160)
    h.circulo(730, 250, 62, relleno=30, ancho=4)
    h.circulo(730, 250, 40, relleno=60, ancho=2.5)
    h.discontinua(668, 250, 792, 250, 12, 1.5)


def veggie_zinnias(h):
    # la cámara de cultivo Veggie (fuelle a los lados y luces arriba)
    h.rect(290, 130, 670, 430, relleno=30, radio=10)
    h.rect(290, 130, 670, 172, relleno=70, radio=10)
    for x in range(310, 660, 26):
        h.punto(x, 151, 4, AMBAR, 230)
    for lado in (290, 670):
        pts = [(lado + (-14 if (i % 2) else 0) * (1 if lado == 290 else -1), 172 + i * 21) for i in range(13)]
        h.linea(pts, 2, CLARO, 200)
    h.rect(310, 400, 650, 430, relleno=70, radio=4)
    # tres zinnias
    for k, (x, alto) in enumerate(((380, 190), (480, 230), (580, 170))):
        tope = 400 - alto
        h.linea([(x, 400), (x + 8, tope + 60), (x, tope + 16)], 3)
        for lado in (-1, 1):
            h.poli([(x + 2, 340 - k * 10), (x + lado * 44, 320 - k * 10), (x + lado * 10, 350 - k * 10)], 70, 2)
        for i in range(10):
            a = i / 10 * math.tau
            h.elipse(x + math.cos(a) * 20, tope + math.sin(a) * 20, 11, 11, relleno=70, ancho=2, color=ROJO if k != 1 else AMBAR)
        h.circulo(x, tope, 10, relleno=120, ancho=2, color=AMBAR)
    for x, y in ((402, 330), (414, 336), (396, 342)):          # moho en una hoja
        h.circulo(x, y, 3.5, relleno=0, ancho=1.5, color=CLARO)
    # gotas de agua flotando (sin gravedad)
    rnd = random.Random(11)
    for _ in range(14):
        x, y, r = rnd.uniform(320, 640), rnd.uniform(190, 360), rnd.uniform(5, 12)
        h.circulo(x, y, r, relleno=50, ancho=2, color=CLARO)
        h.punto(x - r * 0.35, y - r * 0.35, max(1.2, r * 0.22), CLARO)


def skylab(h):
    h.estrellas(35, 6)
    h.sol(70, 80, 46)
    for k in range(3):                                         # el calor que llega
        h.linea([(150 + k * 30, 140 + k * 10), (230 + k * 30, 190 + k * 10)], 2, AMBAR, 200)
    # el taller (cilindro) y el parasol encima
    h.rect(330, 250, 690, 330, relleno=50, radio=30)
    for x in range(380, 690, 50):
        h.linea([(x, 254), (x, 326)], 1.2, CIAN, 130)
    h.poli([(350, 236), (680, 236), (700, 220), (330, 220)], 90, 3, CLARO)
    for x in (380, 520, 660):
        h.linea([(x, 236), (x, 250)], 2, CLARO)
    # telescopio con sus 4 aspas de paneles
    h.circulo(290, 290, 30, relleno=50, ancho=3)
    for a in (45, 135, 225, 315):
        r = math.radians(a)
        ex, ey = 290 + math.cos(r) * 150, 290 + math.sin(r) * 150
        h.linea([(290, 290), (ex, ey)], 2)
        px, py = -math.sin(r) * 22, math.cos(r) * 22
        mx, my = 290 + math.cos(r) * 60, 290 + math.sin(r) * 60
        h.poli([(mx + px, my + py), (ex + px, ey + py), (ex - px, ey - py), (mx - px, my - py)], 55, 2.5)
    h.panel(560, 330, 640, 470, cols=3, filas=5)
    for k in range(3):                                         # dentro hacía calor
        x = 450 + k * 50
        h.linea([(x, 315), (x + 8, 300), (x, 285), (x + 8, 270)], 2, AMBAR, 220)


def iss_fuga_2013(h):
    h.estrellas(40, 8)
    # la viga larga con su celosía
    h.linea([(110, 240), (850, 240)], 3)
    h.linea([(110, 262), (850, 262)], 3)
    for x in range(110, 850, 22):
        h.linea([(x, 240), (x + 22, 262)], 1.2, CIAN, 150)
    for x in (140, 220, 740, 820):                            # paneles solares grandes
        h.panel(x - 26, 70, x + 26, 236, cols=2, filas=6)
        h.panel(x - 26, 266, x + 26, 432, cols=2, filas=6)
    for x in (380, 560):
        h.panel(x - 30, 270, x + 30, 330, cols=3, filas=2, color=CLARO)
    h.rect(430, 268, 530, 312, relleno=50, radio=20)
    h.rect(455, 300, 505, 380, relleno=50, radio=18)
    # la fuga: copos blancos
    rnd = random.Random(13)
    for i in range(16):
        x = 640 + i * 9 + rnd.uniform(-10, 10)
        y = 228 - i * 10 + rnd.uniform(-8, 8)
        r = rnd.uniform(3, 6)
        for a in range(3):
            ang = a / 3 * math.pi
            h.linea([(x - math.cos(ang) * r, y - math.sin(ang) * r), (x + math.cos(ang) * r, y + math.sin(ang) * r)], 1.6, CLARO)
    # el astronauta de la caminata, con su cable
    h.astronauta(640, 360, 1.0)
    h.linea([(655, 330), (690, 300), (700, 264)], 1.5, CLARO, 200)


def mir_1997(h):
    h.estrellas(40, 9)
    # módulo central y el nodo con los demás módulos
    h.rect(330, 262, 600, 306, relleno=50, radio=22)
    h.circulo(626, 284, 28, relleno=60, ancho=3)
    h.rect(604, 110, 648, 256, relleno=50, radio=20)
    h.rect(604, 312, 648, 440, relleno=50, radio=20)              # Spektr (el del choque)
    h.rect(654, 262, 820, 306, relleno=50, radio=20)
    for y0 in (130, 180):
        h.panel(520, y0, 600, y0 + 34, cols=4, filas=1)
        h.panel(652, y0, 732, y0 + 34, cols=4, filas=1)
    h.panel(530, 350, 600, 400, cols=3, filas=2)
    h.panel(652, 350, 722, 400, cols=3, filas=2)
    h.panel(380, 200, 470, 256, cols=4, filas=2)
    h.panel(380, 312, 470, 368, cols=4, filas=2)
    # el choque: una estrella en Spektr
    cx, cy = 648, 420
    pts = []
    for i in range(16):
        a = i / 16 * math.tau
        r = 34 if i % 2 == 0 else 14
        pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
    h.poli(pts, 90, 2.5, AMBAR)
    # la nave de carga Progress, con líneas de movimiento
    h.rect(740, 440, 840, 476, relleno=50, radio=14)
    h.poli([(740, 446), (712, 458), (740, 470)], 60, 2.5)
    h.panel(770, 478, 812, 520, cols=2, filas=2)
    h.panel(770, 396, 812, 438, cols=2, filas=2)
    for k in range(3):
        h.linea([(860 + k * 18, 448 + k * 10), (900 + k * 18, 448 + k * 10)], 2, CLARO, 170)


def tormentas_polvo(h):
    h.circulo(720, 140, 44, relleno=15, ancho=2, color=AMBAR, alfa=110)   # el Sol, casi tapado
    rnd = random.Random(17)
    for i in range(26):                                       # el cielo lleno de polvo
        y = rnd.uniform(40, 400)
        x0 = rnd.uniform(-60, 700)
        pts = [(x0 + k * 22, y + math.sin(k * 0.8 + i) * 5) for k in range(rnd.randint(6, 14))]
        h.linea(pts, rnd.uniform(1.5, 3), AMBAR, rnd.randint(70, 150))
    h.suelo(450, 19)
    h.rover_mer(400, 368, 1.05, polvo=40)
    # su última señal: ondas que se apagan
    for k in range(4):
        r = 40 + k * 34
        h.arco(448, 250, r, r, 230, 310, 3, CIAN, max(60, 230 - k * 55))


def tormenta_1972(h):
    h.estrellas(30, 21, x0=420)
    h.sol(40, 270, 230, rayos=18, largo=0.12)
    for (a0, a1, r) in ((300, 380, 60), (330, 400, 44), (20, 80, 52)):     # bucles de la llamarada
        h.arco(250, 270, r, r * 1.3, a0, a1, 3, AMBAR)
    rnd = random.Random(23)
    for i in range(46):                                       # partículas que salen hacia la Tierra
        y = 270 + rnd.uniform(-170, 170)
        x = rnd.uniform(310, 690)
        h.linea([(x, y), (x + rnd.uniform(18, 40), y + (y - 270) * 0.05)], 2, AMBAR, rnd.randint(110, 220))
    h.planeta(780, 300, 50, 3)
    h.circulo(880, 210, 15, relleno=50, ancho=2.5, color=CLARO)            # la Luna
    h.discontinua(780, 300, 880, 210, 10, 1.5, CLARO, 150)


def sol_marciano(h):
    h.planeta(150, 110, 38, 2)
    h.planeta(820, 120, 46, 2, AMBAR)
    cx, cy, r = 480, 290, 190
    h.circulo(cx, cy, r, relleno=30, ancho=4)
    h.circulo(cx, cy, r - 18, relleno=0, ancho=1.5, alfa=150)
    for i in range(24):                                       # 24 horas
        a = math.radians(i / 24 * 360 - 90)
        r0 = r - (34 if i % 6 == 0 else 22)
        h.linea([(cx + math.cos(a) * r0, cy + math.sin(a) * r0), (cx + math.cos(a) * (r - 8), cy + math.sin(a) * (r - 8))],
                3 if i % 6 == 0 else 2)
    # los 39 minutos de más (casi 10 grados), en ámbar
    h.dr.pieslice(h.caja(cx - r + 6, cy - r + 6, cx + r - 6, cy + r - 6), -90, -80, fill=AMBAR + (160,))
    h.arco(cx, cy, r + 14, r + 14, -90, -80, 6, AMBAR)
    h.linea([(cx, cy), (cx, cy - r + 50)], 5)
    h.linea([(cx, cy), (cx + 90, cy + 50)], 4)
    h.circulo(cx, cy, 10, relleno=120, ancho=2)


def radiacion_curiosity(h):
    h.planeta(130, 110, 40, 2)                                # la Tierra con su escudo magnético
    for k in range(3):
        h.arco(130, 110, 60 + k * 16, 34 + k * 10, 0, 360, 1.5, CLARO, 170 - k * 40)
    h.planeta(830, 110, 34, 2, AMBAR)                         # Marte, sin escudo
    h.suelo(455, 29)
    h.rover_msl(480, 372, 1.35)
    h.circulo(452, 309, 9, relleno=120, ancho=2, color=CLARO)  # el medidor de radiación
    h.ondas(452, 309, 16, 3, 180, 360, 12, 2, CLARO)
    rnd = random.Random(31)
    for i in range(9):                                        # rayos que bajan
        x = 230 + i * 62 + rnd.uniform(-14, 14)
        pts, y = [], 40
        while y < 250:
            pts.append((x + (12 if len(pts) % 2 else -12), y))
            y += 26
        h.linea(pts, 2.5, AMBAR, 210)
        h.flecha(pts[-2][0], pts[-2][1], pts[-1][0], pts[-1][1] + 10, 2.5, AMBAR)


def clima_espacial(h):
    h.estrellas(35, 37, x0=300)
    h.sol(-10, 270, 180, rayos=14, largo=0.15)
    for k in range(4):                                        # la nube que lanza el Sol
        h.arco(170, 270, 120 + k * 42, 150 + k * 46, 300, 60, 3 - k * 0.4, AMBAR, 230 - k * 45)
    # el satélite que vigila el Sol
    h.rect(450, 120, 500, 170, relleno=60, radio=4)
    h.panel(380, 132, 446, 158, cols=3, filas=1)
    h.panel(504, 132, 570, 158, cols=3, filas=1)
    h.linea([(450, 145), (420, 145)], 2)
    h.ondas(470, 175, 18, 3, 40, 140, 14, 2, CLARO)
    # Marte y MAVEN en su órbita
    h.planeta(800, 320, 62, 3, AMBAR)
    h.arco(800, 320, 130, 44, 0, 360, 2, CLARO, 200)
    h.rect(696, 300, 716, 316, relleno=80, ancho=2, color=CLARO)
    h.poli([(696, 304), (670, 292), (668, 300), (696, 310)], 60, 2, CLARO)
    h.poli([(716, 304), (742, 292), (744, 300), (716, 310)], 60, 2, CLARO)
    h.flecha(560, 360, 650, 360, 2.5, CLARO)


def retraso_comunicacion(h):
    h.estrellas(50, 41)
    h.planeta(150, 300, 80, 3)
    h.planeta(820, 300, 56, 3, AMBAR)
    h.discontinua(230, 300, 764, 300, 18, 2, CLARO, 170)
    h.ondas(230, 300, 30, 3, 300, 60, 26, 3)
    h.ondas(764, 300, 26, 3, 120, 240, 22, 3, AMBAR)
    # el mensaje en camino y un reloj: tarda minutos
    h.rect(430, 268, 530, 332, relleno=70, ancho=3, color=CLARO, radio=6)
    h.linea([(430, 270), (480, 306), (530, 270)], 3, CLARO)
    h.circulo(480, 190, 44, relleno=30, ancho=3)
    for i in range(12):
        a = math.radians(i * 30)
        h.linea([(480 + math.cos(a) * 34, 190 + math.sin(a) * 34), (480 + math.cos(a) * 40, 190 + math.sin(a) * 40)], 2)
    h.linea([(480, 190), (480, 160)], 3.5)
    h.linea([(480, 190), (500, 200)], 3)


def sonidos_perseverance(h):
    h.estrellas(20, 43, 220)
    # la cabeza del mástil, de cerca, con el micrófono
    h.rect(452, 236, 508, 540, relleno=45, ancho=3)
    h.rect(360, 140, 600, 240, relleno=55, radio=10)
    h.circulo(420, 190, 26, relleno=60, ancho=3)
    h.circulo(420, 190, 12, relleno=90, ancho=2, color=CLARO)
    h.circulo(500, 190, 26, relleno=60, ancho=3)
    h.circulo(500, 190, 12, relleno=90, ancho=2, color=CLARO)
    h.rect(600, 176, 640, 204, relleno=90, ancho=2.5, color=CLARO, radio=6)     # el micrófono
    h.ondas(650, 190, 24, 4, 300, 60, 26, 3, CLARO)
    # el viento que suena
    for k in range(4):
        y = 300 + k * 34
        h.linea([(60, y), (140, y - 10), (220, y), (300, y - 8)], 2, CIAN, 170)
    # el helicóptero Ingenuity
    x, y = 790, 100
    h.elipse(x, y - 18, 96, 9, relleno=40, ancho=2.5)
    h.elipse(x, y - 2, 96, 9, relleno=40, ancho=2.5)
    h.linea([(x, y - 30), (x, y + 18)], 3)
    h.rect(x - 18, y + 18, x + 18, y + 44, relleno=60, radio=4)
    for dx in (-30, 30):
        h.linea([(x + dx * 0.4, y + 44), (x + dx, y + 74)], 2.5)


def moxie(h):
    h.estrellas(20, 47, 160)
    # la caja de MOXIE con aletas
    h.rect(360, 190, 600, 390, relleno=60, radio=8, color=AMBAR)
    for y in range(210, 380, 20):
        h.linea([(380, y), (580, y)], 1.5, AMBAR, 160)
    h.rect(330, 260, 362, 320, relleno=60, ancho=2.5)
    h.rect(598, 260, 630, 320, relleno=60, ancho=2.5)
    # entra CO2 (el aire de Marte), sale O2
    for i, (x, y) in enumerate(((110, 240), (200, 300), (120, 360), (230, 220))):
        h.molecula_co2(x, y, 0.95)
    h.flecha(270, 290, 326, 290, 3)
    for x, y in ((700, 230), (780, 290), (700, 350), (850, 220)):
        h.molecula_o2(x, y, 1.0)
    h.flecha(634, 290, 680, 290, 3)
    # un perrito: lo que respira un perro pequeño en 10 horas
    x, y = 800, 450
    h.poli([(x - 50, y), (x - 44, y - 30), (x + 18, y - 32), (x + 30, y - 52), (x + 48, y - 50), (x + 56, y - 34),
            (x + 40, y - 22), (x + 34, y), (x + 22, y), (x + 20, y - 14), (x - 30, y - 14), (x - 34, y)], 60, 2.5, CLARO)
    h.linea([(x - 46, y - 26), (x - 66, y - 44)], 3, CLARO)
    h.punto(x + 42, y - 42, 3, CLARO)


def tierra_desde_marte(h):
    h.estrellas(70, 53, 380)
    # la Tierra: una estrella brillante, con la Luna al lado
    x, y = 600, 150
    h.circulo(x, y, 9, relleno=200, ancho=2, color=CLARO)
    for a in range(4):
        ang = a * math.pi / 2
        h.linea([(x + math.cos(ang) * 14, y + math.sin(ang) * 14), (x + math.cos(ang) * 46, y + math.sin(ang) * 46)], 2, CLARO, 220)
    h.circulo(x, y, 26, relleno=0, ancho=1.5, color=CLARO, alfa=120)
    h.punto(634, 140, 3.5, CLARO, 230)
    # el horizonte de Marte, con colinas
    pts = [(xx, 400 - 40 * math.exp(-((xx - 760) / 120) ** 2) - 18 * math.exp(-((xx - 200) / 90) ** 2) + math.sin(xx / 30) * 3)
           for xx in range(0, W + 10, 10)]
    h.linea(pts, 3, AMBAR)
    h.dr.polygon(h.p(pts + [(W, H), (0, H)]), fill=AMBAR + (25,))
    for k in range(1, 4):
        h.linea([(0, 420 + k * 28), (W, 420 + k * 28)], 1.2, AMBAR, 90 - k * 20)
    # Curiosity mirando al cielo
    h.rover_msl(300, 382, 0.85)
    h.discontinua(345, 270, 590, 160, 12, 1.5, CLARO, 160)


DIBUJOS = {
    "viento_limpia": viento_limpia, "apolo13": apolo13, "veggie_zinnias": veggie_zinnias, "skylab": skylab,
    "iss_fuga_2013": iss_fuga_2013, "mir_1997": mir_1997, "tormentas_polvo": tormentas_polvo,
    "tormenta_1972": tormenta_1972, "sol_marciano": sol_marciano, "radiacion_curiosity": radiacion_curiosity,
    "clima_espacial": clima_espacial, "retraso_comunicacion": retraso_comunicacion, "chapea": chapea,
    "sonidos_perseverance": sonidos_perseverance, "moxie": moxie, "tierra_desde_marte": tierra_desde_marte,
}


def main(nombres):
    for n in nombres or DIBUJOS:
        h = Holo()
        DIBUJOS[n](h)
        h.guardar(n)


if __name__ == "__main__":
    main(sys.argv[1:])
