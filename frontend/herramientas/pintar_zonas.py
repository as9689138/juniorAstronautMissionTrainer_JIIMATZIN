"""Pinta las zonas de la base al estilo Hades: cada sala es un diorama isométrico con el paisaje de Marte alrededor.

Uso:  python herramientas/pintar_zonas.py            (todas)
      python herramientas/pintar_zonas.py mando      (solo una)

Crea assets/zonas/:
  zonas.json              distribución de cada sala: casillas bloqueadas, estaciones, puertas, objetos
  <zona>_fondo.png        paisaje + suelo + muros del fondo (va detrás de todo)
  <zona>_frente.png       murete delantero (tapa los pies del astronauta en el borde)
  props/<zona>_<n>.png    cada mueble o máquina por separado (el juego decide si va delante o detrás)

Línea de dibujo: la del interior aprobado (Mars Dune Alpha: muros impresos en 3D, violetas planos, acentos rosa)
para dentro, y la del cómic aprobado (Murray Buttes, monte Sharp, atardecer azul de Gale) para el paisaje.
Las salas se editan en ZONAS, más abajo: cada letra es una casilla.
"""
import json
import os
import math
import random
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pintar_mapa as PM  # noqa: E402  (paleta, Pincel, pictogramas y fuente)

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "public" / "assets" / "zonas"
K = 3                 # px de lienzo por px de juego (se reduce a 2x para el juego)
FINAL = 2
PM.K = K              # los pictogramas de pintar_mapa usan el mismo factor

TW, TH = 96, 48       # rombo de una casilla en px de juego
MURO = 128            # altura de los muros del fondo
BAJO = 18             # murete delantero
LOSA = 28             # grosor de la losa de la base
MX, MARR, MABA = 300, 300, 230   # márgenes de paisaje: lados, arriba, abajo

# Colores: interior (PM) + paisaje del cómic aprobado
TINTA = (40, 34, 86)
NEGRO_T = (24, 18, 40)
V0, V1, V2, V3, V4 = (40, 34, 86), (66, 58, 130), (96, 88, 170), (138, 130, 210), (190, 184, 236)
ROSA, ROSA_CL = (228, 138, 216), (247, 182, 238)
MELOCOTON, OXIDO, TEAL, TEAL_OSC, REMATE = (240, 176, 122), (196, 98, 58), (111, 179, 167), (40, 80, 84), (98, 70, 62)
SUELO_M, SUELO_M_OSC = (176, 104, 66), (120, 66, 44)
CIELO = [(22, 18, 28), (30, 24, 36), (42, 34, 48), (56, 48, 70), (52, 80, 120), (70, 120, 176), (110, 170, 220)]
ACENTO = PM.ACENTO
PAPEL = (233, 223, 200)

ESTACIONES = {
    "C": ("consola", "consola", "mando", "Consola de mando"),
    "P": ("tarea_paneles", "minijuego", "energia", "Limpiar paneles solares"),
    "F": ("tarea_filtro", "minijuego", "oxigeno", "Cambiar filtro de CO₂"),
    "V": ("tarea_invernadero", "minijuego", "oxigeno", "Regar el invernadero"),
    "R": ("refugio", "refugio", "blindaje", "Refugio contra radiacion"),
    "A": ("antena", "antena", "comunicaciones", "Antena de comunicaciones"),
}

# Cada sala: nombre (el de EV.HABITACION), sistema, casillas ('.' suelo, letra de ESTACIONES = estación),
# objetos (tipo, columna, fila, ancho, alto) que bloquean, puertas (lado n/s/o/e, posición, destino, índice de llegada)
ZONAS = {
    # Escala real: 1 casilla = 1,3 m. Muros de 2,8 m, puertas de 2,0 × 1,1 m, astronauta de 1,9 m.
    # Las comprueban validar() (huellas reales y si el astronauta cabe) y compuerta_pixeles() (si algo tapa algo).
    "pasillo": dict(nombre="Pasillo", sistema=None, cols=11, filas=5, inicio=(5.5, 2.5),          # 14,3 × 6,5 m
                    objetos=[("mesa", 6, 2, 2, 2), ("banco", 3, 0, 1, 2), ("banco", 3, 3, 1, 2),
                             ("maceta", 0, 0, 1, 1), ("maceta", 0, 4, 1, 1), ("maceta", 10, 2, 1, 1),
                             ("carro", 7, 0, 1, 1)],
                    estaciones=[], lamparas=[(2.5, 2.5), (8.5, 2.5)],
                    puertas=[("n", 1, "energia", 0), ("n", 5, "mando", 0), ("n", 9, "comunicaciones", 0),
                             ("s", 1, "invernadero", 0), ("s", 5, "soporte", 0), ("s", 9, "refugio", 0)]),
    "energia": dict(nombre="Energia", sistema="energia", cols=7, filas=5,                          # 9,1 × 6,5 m
                    objetos=[("maquina", 1, 1, 2, 2), ("maquina", 4, 1, 2, 2), ("banco", 0, 4, 2, 1),
                             ("cajas", 6, 3, 1, 1), ("cajas", 6, 4, 1, 1), ("bidon", 6, 0, 1, 1)],
                    estaciones=[("P", 3, 2)], lamparas=[(3.5, 2.5)],
                    puertas=[("s", 3, "pasillo", 0)]),
    "mando": dict(nombre="Mando", sistema="mando", cols=8, filas=5,                                # 10,4 × 6,5 m
                  objetos=[("maquina", 1, 2, 2, 2), ("maquina", 3, 2, 2, 2), ("mesa", 6, 1, 2, 2),
                           ("estanteria", 3, 0, 2, 1), ("maceta", 7, 0, 1, 1)],
                  estaciones=[("C", 2, 4)], lamparas=[(3, 3), (7, 2.5)],
                  puertas=[("s", 5, "pasillo", 1)]),
    "comunicaciones": dict(nombre="Comunicaciones", sistema="comunicaciones", cols=7, filas=5,     # 9,1 × 6,5 m
                           objetos=[("maquina", 1, 1, 1, 2), ("maquina", 2, 1, 1, 2), ("escritorio", 4, 4, 3, 1),
                                    ("antena", 6, 1, 1, 1), ("cajas", 0, 4, 1, 1)],
                           estaciones=[("A", 5, 2)], lamparas=[(3.5, 2.5)],
                           puertas=[("s", 2, "pasillo", 2)]),
    "invernadero": dict(nombre="Invernadero", sistema="oxigeno", cols=7, filas=5,                  # 9,1 × 6,5 m
                        objetos=[("torre", 1, 1, 2, 1), ("torre", 1, 3, 2, 1), ("torre", 4, 3, 2, 1),
                                 ("bidon", 6, 0, 1, 1)],
                        estaciones=[("V", 5, 1)], lamparas=[(3.5, 2.5)],
                        puertas=[("n", 4, "pasillo", 3)]),
    "soporte": dict(nombre="Soporte vital", sistema="oxigeno", cols=7, filas=5,                    # 9,1 × 6,5 m
                    objetos=[("maquina", 3, 2, 2, 2), ("maquina", 5, 2, 2, 2), ("bidon", 6, 0, 1, 1),
                             ("cajas", 0, 4, 1, 1), ("cajas", 1, 4, 1, 1)],
                    estaciones=[("F", 1, 2)], lamparas=[(3.5, 2.5)],
                    puertas=[("n", 2, "pasillo", 4)]),
    "refugio": dict(nombre="Refugio", sistema="blindaje", cols=9, filas=5,                         # 11,7 × 6,5 m (pocas ventanas: es un refugio)
                    objetos=[("maquina", 2, 1, 2, 2), ("litera", 7, 1, 2, 1), ("litera", 7, 3, 2, 1),
                             ("taquilla", 3, 4, 1, 1), ("taquilla", 4, 4, 1, 1), ("cajas", 5, 4, 1, 1)],
                    estaciones=[("R", 4, 2)], lamparas=[(4.5, 2.5)],
                    puertas=[("n", 1, "pasillo", 5)]),
}
NOMBRE_VISIBLE = {"pasillo": "PASILLO", "energia": "ENERGÍA", "mando": "MANDO", "comunicaciones": "COMUNICACIONES",
                  "invernadero": "INVERNADERO", "soporte": "SOPORTE VITAL", "refugio": "REFUGIO"}


def mezcla(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


# --- Lienzo con coordenadas de juego ------------------------------------------------
class Lienzo:
    grosor = 1.0                                     # se sube al dibujar algo que luego se encoge (utilería a escala real)

    def __init__(self, w, h, fondo=(0, 0, 0, 0)):
        self.w, self.h = w, h
        self.img = Image.new("RGBA", (int(w * K), int(h * K)), fondo)
        self.d = ImageDraw.Draw(self.img)
        self.da = ImageDraw.Draw(self.img, "RGBA")       # mezcla con lo de debajo

    def velo(self, ps, rgba):
        """Polígono semitransparente: luz o sombra que se MEZCLA con lo de debajo (sin tocar el alfa).
        Ojo: en Pillow, dibujar con alfa sobre una imagen RGBA reemplaza el píxel; por eso se compone aparte."""
        xs, ys = [p[0] * K for p in ps], [p[1] * K for p in ps]
        x0, y0 = max(0, int(min(xs)) - 1), max(0, int(min(ys)) - 1)
        x1, y1 = min(self.img.width, int(max(xs)) + 2), min(self.img.height, int(max(ys)) + 2)
        if x1 <= x0 or y1 <= y0:
            return
        mk = Image.new("L", (x1 - x0, y1 - y0), 0)
        ImageDraw.Draw(mk).polygon([(x - x0, y - y0) for x, y in zip(xs, ys)], fill=rgba[3])
        base = self.img.crop((x0, y0, x1, y1))
        a = np.asarray(base).astype(np.float32)
        t = np.asarray(mk).astype(np.float32)[..., None] / 255
        a[..., :3] = a[..., :3] * (1 - t) + np.array(rgba[:3], np.float32) * t
        self.img.paste(Image.fromarray(a.astype(np.uint8), "RGBA"), (x0, y0))

    def sombra_suave(self, ps, color=(40, 30, 90), fuerza=0.55, radio=5):
        """Sombra difusa (desenfocada) sobre el suelo."""
        xs, ys = [p[0] * K for p in ps], [p[1] * K for p in ps]
        m = int(radio * K * 2.5)
        x0, y0 = int(min(xs)) - m, int(min(ys)) - m
        x1, y1 = int(max(xs)) + m, int(max(ys)) + m
        mk = Image.new("L", (x1 - x0, y1 - y0), 0)
        ImageDraw.Draw(mk).polygon([(x - x0, y - y0) for x, y in zip(xs, ys)], fill=int(255 * fuerza))
        mk = mk.filter(ImageFilter.GaussianBlur(radio * K))
        capa = Image.new("RGBA", mk.size, tuple(color) + (255,))
        base = self.img.crop((x0, y0, x1, y1))
        base.paste(capa, (0, 0), mk)
        self.img.paste(base, (x0, y0))

    @staticmethod
    def pts(ps):
        return [(x * K, y * K) for x, y in ps]

    def poli(self, ps, fill=None, outline=None, ancho=0):
        if fill is not None:
            self.d.polygon(self.pts(ps), fill=fill)
        if outline is not None and ancho:
            self.d.line(self.pts(list(ps) + [ps[0]]), fill=outline, width=max(1, int(ancho * K * self.grosor)), joint="curve")

    def linea(self, ps, color, ancho=1.0):
        self.d.line(self.pts(ps), fill=color, width=max(1, int(ancho * K * self.grosor)), joint="curve")

    def elipse(self, x0, y0, x1, y1, fill=None, outline=None, ancho=0):
        self.d.ellipse([x0 * K, y0 * K, x1 * K, y1 * K], fill=fill, outline=outline, width=int(ancho * K))

    def texto(self, x, y, t, tam, color, ancla="mm"):
        self.d.text((x * K, y * K), t, font=PM.fuente(int(tam * K)), fill=color, anchor=ancla)

    def texto_plano(self, x, y, t, tam, color, plano, contorno=None):
        """Texto pintado SOBRE un plano de la isométrica, centrado en (x, y): 'n' (muro del fondo, baja hacia la
        derecha), 'o' (muro izquierdo, sube hacia la derecha) o 'suelo' (sigue las dos diagonales de la rejilla)."""
        f = PM.fuente(int(tam * K))
        bb = f.getbbox(t)
        borde = int(K * 1.2) if contorno else 0
        w, h = bb[2] - bb[0] + 4 + 2 * borde, bb[3] - bb[1] + 4 + 2 * borde
        capa = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(capa).text((2 + borde - bb[0], 2 + borde - bb[1]), t, font=f, fill=color,
                                  stroke_width=borde, stroke_fill=contorno)
        a, b, c, d = {"n": (1, 0, 0.5, 1), "o": (1, 0, -0.5, 1), "suelo": (0.78, -0.78, 0.39, 0.39)}[plano]
        esquinas = [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)]
        xs = [a * u + b * v for u, v in esquinas]
        ys = [c * u + d * v for u, v in esquinas]
        W, H = int(max(xs) - min(xs)) + 2, int(max(ys) - min(ys)) + 2
        ox, oy = -min(xs), -min(ys)
        det = a * d - b * c
        ia, ib, ic, id_ = d / det, -b / det, -c / det, a / det
        datos = (ia, ib, -ia * ox - ib * oy + w / 2, ic, id_, -ic * ox - id_ * oy + h / 2)
        out = capa.transform((W, H), Image.AFFINE, datos, Image.BICUBIC)
        px, py = int(round(x * K - ox)), int(round(y * K - oy))
        cx0, cy0 = max(0, -px), max(0, -py)                      # recortar si se sale por arriba o la izquierda
        out = out.crop((cx0, cy0, W, H))
        if out.width > 0 and out.height > 0:
            self.img.alpha_composite(out, (px + cx0, py + cy0))

    def rayado(self, ps, color, paso=5.0, ang=-60, grosor=1.0, cruzado=False):
        """Rayado de grabado dentro de un polígono (solo en su caja, para ir rápido)."""
        xs, ys = [p[0] * K for p in ps], [p[1] * K for p in ps]
        x0, y0, x1, y1 = int(min(xs)), int(min(ys)), int(max(xs)) + 2, int(max(ys)) + 2
        if x1 - x0 < 2 or y1 - y0 < 2:
            return
        m = Image.new("L", (x1 - x0, y1 - y0), 0)
        ImageDraw.Draw(m).polygon([(x - x0, y - y0) for x, y in zip(xs, ys)], fill=255)
        capa = Image.new("L", m.size, 0)
        dc = ImageDraw.Draw(capa)
        L = (x1 - x0 + y1 - y0) * 2
        for a in ([math.radians(ang), math.radians(ang) + math.pi / 2] if cruzado else [math.radians(ang)]):
            dx, dy, nx, ny = math.cos(a), math.sin(a), -math.sin(a), math.cos(a)
            n = int(L / (paso * K)) + 2
            for k in range(-n, n):
                px, py = m.size[0] / 2 + nx * k * paso * K, m.size[1] / 2 + ny * k * paso * K
                dc.line([(px - dx * L, py - dy * L), (px + dx * L, py + dy * L)], fill=255, width=max(1, int(grosor * K)))
        mm = Image.fromarray((np.asarray(capa).astype(np.uint16) * np.asarray(m) // 255).astype(np.uint8))
        self.img.paste(Image.new("RGBA", m.size, tuple(color) + (255,)), (x0, y0), mm)

    def punteado(self, ps, color, densidad, semilla, tam=(0.5, 1.2)):
        xs, ys = [p[0] for p in ps], [p[1] for p in ps]
        r = random.Random(semilla)
        m = Image.new("L", (int(max(xs) - min(xs)) + 2, int(max(ys) - min(ys)) + 2), 0)
        ImageDraw.Draw(m).polygon([(x - min(xs), y - min(ys)) for x, y in ps], fill=255)
        mp = m.load()
        for _ in range(int(m.size[0] * m.size[1] * densidad)):
            x, y = r.uniform(0, m.size[0] - 1), r.uniform(0, m.size[1] - 1)
            if mp[int(x), int(y)]:
                t = r.uniform(*tam)
                self.elipse(min(xs) + x - t, min(ys) + y - t, min(xs) + x + t, min(ys) + y + t, fill=color)

    def reducir(self, final=None):
        final = FINAL if final is None else final
        return self.img.resize((int(self.w * final), int(self.h * final)), Image.LANCZOS)


class Iso:
    """Proyección isométrica 2:1. (c, r) casillas, z altura en px."""

    def __init__(self, ox, oy):
        self.ox, self.oy = ox, oy

    def __call__(self, c, r, z=0.0):
        return (self.ox + (c - r) * TW / 2, self.oy + (c + r) * TH / 2 - z)


# --- Paisaje de Marte (línea del cómic aprobado) ------------------------------------
def luna(lz, cx, cy, rr, semilla):
    rnd = random.Random(semilla)
    pts = [(cx + math.cos(a) * rr * (0.82 + 0.22 * rnd.random()) * (1.18 if abs(math.cos(a)) > 0.7 else 1),
            cy + math.sin(a) * rr * 0.8 * (0.82 + 0.22 * rnd.random())) for a in np.linspace(0, math.tau, 20, endpoint=False)]
    lz.poli(pts, fill=(190, 160, 130), outline=NEGRO_T, ancho=1.2)
    lz.elipse(cx - rr * 0.35, cy - rr * 0.2, cx - rr * 0.05, cy + rr * 0.1, fill=(120, 96, 80))


def butte(lz, cx, base, ancho, alto, semilla):
    """Mesa como las Murray Buttes: capas finas, cornisas, roca de remate oscura, luz por la izquierda."""
    r = random.Random(semilla)
    gr = [r.uniform(0.5, 1.8) for _ in range(8)]
    y, w = base, ancho
    for k, g in enumerate(gr):
        h = alto * g / sum(gr)
        w_k = w * (r.uniform(1.0, 1.05) if r.random() < 0.3 else r.uniform(0.88, 0.97))
        c = cx + r.uniform(-8, 8)
        x0, x1 = c - w_k / 2, c + w_k / 2
        filo = x0 + (x1 - x0) * 0.6
        tope = k == len(gr) - 1
        lz.poli([(x0, y), (x0, y - h), (filo, y - h), (filo - 3, y)], fill=REMATE if tope else MELOCOTON)
        lz.poli([(filo, y - h), (x1, y - h), (x1, y), (filo - 3, y)], fill=(70, 52, 50) if tope else TEAL)
        lz.rayado([(filo, y - h), (x1, y - h), (x1, y), (filo - 3, y)], TEAL_OSC, 3.4, -72, 0.8)
        if h > alto / 8:
            for j in range(int((filo - x0) / 18)):
                xx = x0 + 6 + j * 18
                lz.linea([(xx, y - 1), (xx + h * 0.9, y - h + 1)], OXIDO, 0.7)
        lz.linea([(x0, y - h), (x1, y - h)], NEGRO_T, 1.2)
        lz.linea([(x0, y), (x0, y - h)], (255, 214, 160), 2)
        lz.poli([(x0, y), (x0, y - h), (x1, y - h), (x1, y)], outline=NEGRO_T, ancho=1.8)
        y -= h
        w = w_k * 0.97
    talud = [(cx - ancho * 0.85, base + 16), (cx - ancho * 0.45, base - 6), (cx + ancho * 0.45, base - 4), (cx + ancho * 0.9, base + 16)]
    lz.poli(talud, fill=(206, 150, 104), outline=NEGRO_T, ancho=1.4)
    lz.rayado(talud[1:] + [(cx + ancho * 0.1, base + 16)], (120, 76, 56), 3.5, -50, 0.8)


def mesa_iso(lz, P, c, r, w, h, alto, semilla):
    """Butte como las Murray Buttes (Curiosity, 2016): planta IRREGULAR, más ancha que alta, paredes casi
    verticales de arenisca en capas finas, una banda de roca de remate oscura solo en lo alto, cimas de altura
    desigual y un TALUD de arena y bloques caídos que entierra el pie. Se construye extruyendo un polígono
    irregular (no con cajas, que la harían parecer un edificio). Luz por la izquierda: lo que mira a +columna
    va en sombra."""
    rnd = random.Random(semilla)
    cc, cr = c + w / 2, r + h / 2
    n = 11
    base, altos = [], []
    for i in range(n):
        a = math.tau * i / n + rnd.uniform(-0.12, 0.12)
        f = rnd.uniform(0.72, 1.08)
        base.append((cc + math.cos(a) * w / 2 * f, cr + math.sin(a) * h / 2 * f))
        altos.append(alto * rnd.uniform(0.82, 1.04))
    zt = alto * rnd.uniform(0.16, 0.24)                                   # hasta dónde entierra el talud
    falda = [(cc + (x - cc) * 1.45, cr + (y - cr) * 1.45) for x, y in base]

    def visible(i):                                                       # la pared mira hacia la cámara (+c, +r)
        (x0, y0), (x1, y1) = base[i], base[(i + 1) % n]
        nx, ny = (y1 - y0), -(x1 - x0)                                    # normal hacia fuera (orden antihorario)
        if (x0 + x1) / 2 - cc < 0 and nx > 0 or (y0 + y1) / 2 - cr < 0 and ny > 0:
            nx, ny = -nx, -ny
        return nx + ny > 0.02, nx, ny

    lz.sombra_suave([P(x, y) for x, y in falda], (150, 96, 66), 0.85, 7)
    lz.poli([P(x, y) for x, y in falda], fill=(206, 150, 104))           # suelo de arena alrededor
    paredes = []
    for i in range(n):
        ok, nx, ny = visible(i)
        if ok:
            j = (i + 1) % n
            paredes.append(((base[i][0] + base[j][0]) + (base[i][1] + base[j][1]), i, j, nx, ny))
    for _, i, j, nx, ny in sorted(paredes):                               # de atrás hacia delante
        (x0, y0), (x1, y1) = base[i], base[j]
        z0, z1 = altos[i], altos[j]
        sombra = nx / (abs(nx) + abs(ny) + 1e-9)                         # 1 = mira a +columna (sombra)
        col = mezcla(MELOCOTON, TEAL, max(0, min(1, sombra * 1.15)))     # mira a +fila: iluminada
        cara = [P(x0, y0, 0), P(x1, y1, 0), P(x1, y1, z1), P(x0, y0, z0)]
        lz.poli(cara, fill=col)
        if sombra > 0.45:
            lz.rayado(cara, TEAL_OSC, 3.2, -72, 0.7)
        zz = 5.0
        while zz < min(z0, z1) * 0.86:                                    # capas finas de la arenisca
            lz.linea([P(x0, y0, zz), P(x1, y1, zz)], OXIDO if sombra < 0.45 else mezcla(TEAL, TEAL_OSC, 0.5), 0.55)
            zz += rnd.uniform(4.5, 6.5)
        for _ in range(2):                                                # cárcavas de erosión
            t = rnd.uniform(0.15, 0.85)
            xm, ym = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            lz.linea([P(xm, ym, 1), P(xm, ym, min(z0, z1) * rnd.uniform(0.3, 0.75))], (176, 112, 78), 0.8)
        banda = [P(x0, y0, z0 * 0.86), P(x1, y1, z1 * 0.86), P(x1, y1, z1), P(x0, y0, z0)]   # roca de remate
        lz.poli(banda, fill=mezcla(REMATE, (40, 30, 30), max(0, sombra) * 0.5))
        lz.poli(cara, outline=NEGRO_T, ancho=1.1)
    cima = [P(x, y, z) for (x, y), z in zip(base, altos)]
    lz.poli(cima, fill=mezcla(REMATE, (150, 110, 90), 0.25), outline=NEGRO_T, ancho=1.4)
    for _ in range(int(w * h * 3)):                                       # cantos sueltos en la cima
        k = rnd.randrange(n)
        t = rnd.uniform(0.2, 0.8)
        x, y = cc + (base[k][0] - cc) * t, cr + (base[k][1] - cr) * t
        px, py = P(x, y, altos[k] * 0.97)
        lz.elipse(px - 1.5, py - 0.8, px + 1.5, py + 0.8, fill=(70, 52, 50))
    # talud: rampa de arena desde el pie enterrado de cada pared visible hasta el suelo
    for _, i, j, nx, ny in sorted(paredes):
        sombra = nx / (abs(nx) + abs(ny) + 1e-9)
        rampa = [P(*base[i], zt), P(*base[j], zt), P(*falda[j], 0), P(*falda[i], 0)]
        lz.poli(rampa, fill=mezcla((214, 158, 110), (160, 104, 74), max(0, min(1, sombra * 1.15))))
        if sombra > 0.45:
            lz.rayado(rampa, (120, 76, 56), 3.6, -50, 0.6)
    for _ in range(int(16 + w * 5)):                                      # bloques caídos sobre el talud
        k = rnd.randrange(n)
        if not visible(k)[0]:
            continue
        t = rnd.uniform(0.3, 0.95)
        x = base[k][0] + (falda[k][0] - base[k][0]) * t
        y = base[k][1] + (falda[k][1] - base[k][1]) * t
        roca_iso(lz, P, x, y, rnd.uniform(0.06, 0.2), rnd.randint(0, 9999))


def roca_iso(lz, P, c, r, t, semilla):
    rnd = random.Random(semilla)
    zz = t * rnd.uniform(18, 34)
    caja(lz, P, c, r, t, t * rnd.uniform(0.6, 1.0), 0, zz, (226, 166, 118), MELOCOTON, TEAL, 1.1)


def paneles_solares(lz, P, c, r, n, m):
    """Campo de paneles solares fuera de la base (en Marte llega menos de la mitad de luz que a la Tierra)."""
    for i in range(n):
        for j in range(m):
            cc, rr = c + i * 1.3, r + j * 1.1
            for pc in (0.3, 0.9):
                lz.linea([P(cc + pc, rr + 0.5, 0), P(cc + pc, rr + 0.5, 14)], V1, 1.6)
            panel = [P(cc, rr + 0.15, 26), P(cc + 1.1, rr + 0.15, 26), P(cc + 1.1, rr + 0.85, 10), P(cc, rr + 0.85, 10)]
            lz.poli(panel, fill=(40, 70, 130), outline=TINTA, ancho=1.2)
            for k in (0.37, 0.73):
                lz.linea([P(cc + k * 1.1, rr + 0.15, 26), P(cc + k * 1.1, rr + 0.85, 10)], (120, 180, 240), 0.8)
            lz.linea([P(cc, rr + 0.5, 18), P(cc + 1.1, rr + 0.5, 18)], (120, 180, 240), 0.8)
            lz.linea([P(cc, rr + 0.15, 26), P(cc + 1.1, rr + 0.15, 26)], (200, 230, 255), 1)


def rover_iso(lz, P, c, r):
    """Vehículo presurizado aparcado fuera."""
    for u, v in ((0.1, 0.9), (1.5, 0.9), (1.5, 0.1)):
        x, y = P(c + u, r + v, 6)
        lz.elipse(x - 7, y - 7, x + 7, y + 7, fill=(60, 58, 66), outline=TINTA, ancho=1)
    caja(lz, P, c, r, 1.7, 1.0, 8, 34, (236, 230, 216), (214, 206, 190), (170, 162, 150), 1.4)
    caja(lz, P, c + 0.2, r + 0.15, 0.7, 0.7, 34, 46, (236, 230, 216), (214, 206, 190), (170, 162, 150), 1.2)
    lz.poli([P(c + 1.7, r + 0.2, 30), P(c + 1.7, r + 0.8, 30), P(c + 1.7, r + 0.8, 18), P(c + 1.7, r + 0.2, 18)], fill=(43, 74, 99))
    lz.linea([P(c + 0.5, r + 0.5, 46), P(c + 0.5, r + 0.5, 64)], TINTA, 1.2)


def tubo_iso(lz, P, c0, r0, c1, r1):
    """Túnel presurizado que une la sala con el resto de la base."""
    if c1 == c0:                                                     # a lo largo de r
        caja(lz, P, c0 + 0.1, min(r0, r1), 0.8, abs(r1 - r0), 0, 40, PM.MURO_TAPA, V3, V2, 1.4)
        for k in range(int(abs(r1 - r0) * 2)):
            rr = min(r0, r1) + k * 0.5
            lz.linea([P(c0 + 0.1, rr, 0), P(c0 + 0.1, rr, 40), P(c0 + 0.9, rr, 40)], PM.NERVIO, 0.9)
    else:
        caja(lz, P, min(c0, c1), r0 + 0.1, abs(c1 - c0), 0.8, 0, 40, PM.MURO_TAPA, V3, V2, 1.4)
        for k in range(int(abs(c1 - c0) * 2)):
            cc = min(c0, c1) + k * 0.5
            lz.linea([P(cc, r0 + 0.9, 0), P(cc, r0 + 0.9, 40), P(cc, r0 + 0.1, 40)], PM.NERVIO, 0.9)


def paisaje_iso(lz, P, ancho, alto, cols, filas, z, semilla):
    """Suelo de Gale visto con la misma cámara que la sala: sin horizonte de frente, todo en isométrico."""
    r = random.Random(semilla)
    # suelo de óxido con estrías del viento en la dirección isométrica y punteado
    suelo = [(0, 0), (ancho, 0), (ancho, alto), (0, alto)]
    lz.poli(suelo, fill=SUELO_M)
    lz.rayado(suelo, SUELO_M_OSC, 7, 26.57, 0.9)
    # a lo lejos (arriba) la bruma de polvo y el cielo del atardecer: perspectiva aérea
    for k, c in enumerate(((22, 18, 28), (36, 28, 40), (60, 46, 56), (96, 66, 64), (140, 90, 70))):
        lz.poli([(0, k * 22), (ancho, k * 22), (ancho, k * 22 + 24), (0, k * 22 + 24)], fill=c)
    sx = ancho * (0.2 if semilla % 2 else 0.8)
    for rr, c in ((150, (52, 80, 120)), (90, (70, 120, 176)), (40, (110, 170, 220))):
        lz.d.pieslice([(sx - rr * 1.6) * K, (110 - rr * 0.5) * K, (sx + rr * 1.6) * K, (110 + rr * 0.5) * K], 180, 360, fill=c)
    lz.elipse(sx - 7, 84, sx + 7, 98, fill=(255, 255, 255))
    for _ in range(60):
        x, y = r.uniform(0, ancho), r.uniform(0, 60)
        lz.elipse(x - 0.8, y - 0.8, x + 0.8, y + 0.8, fill=(243, 227, 195))
    luna(lz, ancho * (0.7 if semilla % 2 else 0.3), 30, 10, semilla)
    # zona prohibida para el paisaje: la sala con sus muros, la losa y las puertas
    x_min, x_max = P(0, filas)[0] - 70, P(cols, 0)[0] + 70
    y_min, y_max = P(0, 0, MURO)[1] - 30, P(cols, filas)[1] + LOSA + 80
    libre = lambda c, rr, m=0: not (x_min - m < P(c, rr)[0] < x_max + m and y_min - m < P(c, rr)[1] < y_max + m)
    # posiciones elegidas en la pantalla y pasadas a casillas (así el paisaje rodea siempre la sala)
    def casilla(x, y):
        u, v = (x - P.ox) / (TW / 2), (y - P.oy) / (TH / 2)
        return (u + v) / 2, (v - u) / 2

    def fuera_de_sala(x, y, m):
        return not (x_min - m < x < x_max + m and y_min - m < y < y_max + m)

    # cada sala con su propio paisaje: qué esquinas tienen mesa, dónde están los paneles y el vehículo
    rl = random.Random(semilla * 7 + 3)
    esquinas = [(0.07, 0.36), (0.93, 0.32), (0.05, 0.98), (0.95, 0.96)]
    rl.shuffle(esquinas)
    mesas = [(fx + rl.uniform(-0.03, 0.03), fy + rl.uniform(-0.05, 0.04)) for fx, fy in esquinas[:rl.randint(2, 4)]]
    sitios = [(0.05, 0.56), (0.9, 0.64), (0.1, 0.78), (0.86, 0.45)]
    sitios = [s_ for s_ in sitios if all(math.hypot(s_[0] - m[0], (s_[1] - m[1]) * 1.6) > 0.18 for m in mesas)] or [(0.05, 0.56)]
    rl.shuffle(sitios)
    sitio_paneles = sitios[0]
    sitio_rover = sitios[1] if len(sitios) > 1 and rl.random() < 0.75 else None
    dunas = rl.sample([(0.12, 0.88), (0.88, 0.2), (0.2, 0.22), (0.82, 0.86)], rl.randint(1, 2))
    # campos de dunas oscuras (arena basáltica, como las dunas Bagnold) con ondas de escala métrica
    for fx, fy in dunas:
        x, y = ancho * fx, alto * fy
        if not fuera_de_sala(x, y, 120):
            continue
        c, rr = casilla(x, y)
        mancha = [P(c - 2.5, rr - 1), P(c + 1.5, rr - 2), P(c + 3, rr + 1), P(c - 1, rr + 2.5)]
        lz.poli(mancha, fill=(70, 50, 52))
        for k in range(9):
            lz.linea([P(c - 2 + k * 0.5, rr - 1.5 + k * 0.2), P(c - 1 + k * 0.5, rr + 2 + k * 0.1)], (96, 70, 66), 1.4)
    # cráteres (elipses 2:1, borde iluminado abajo a la derecha por la luz de la izquierda)
    for _ in range(40):
        x, y = r.uniform(30, ancho - 30), r.uniform(150, alto - 30)
        rad = r.uniform(14, 46)
        if not fuera_de_sala(x, y, 40 + rad):
            continue
        lz.elipse(x - rad, y - rad / 2, x + rad, y + rad / 2, fill=(150, 84, 54), outline=NEGRO_T, ancho=1.2)
        lz.elipse(x - rad * 0.8, y - rad * 0.38, x + rad * 0.8, y + rad * 0.38, fill=(120, 66, 44))
        lz.rayado([(x - rad * 0.8, y), (x - rad * 0.2, y - rad * 0.38), (x + rad * 0.3, y - rad * 0.3), (x - rad * 0.3, y + rad * 0.1)], (92, 50, 36), 2.5, -40, 0.7)
        lz.d.arc([(x - rad) * K, (y - rad / 2) * K, (x + rad) * K, (y + rad / 2) * K], 330, 110, fill=(226, 166, 118), width=2 * K)
    # rocas y losas sueltas (no donde van las buttes, los paneles ni el vehículo)
    reservas = [(ancho * fx, alto * fy, 150) for fx, fy in mesas] + [(ancho * sitio_paneles[0], alto * sitio_paneles[1], 170)] + \
               ([(ancho * sitio_rover[0], alto * sitio_rover[1], 120)] if sitio_rover else [])
    for _ in range(220):
        x, y = r.uniform(10, ancho - 10), r.uniform(150, alto - 10)
        if not fuera_de_sala(x, y, 24) or any(math.hypot(x - rx, (y - ry) * 1.6) < rm for rx, ry, rm in reservas):
            continue
        c, rr = casilla(x, y)
        if r.random() < 0.55:
            roca_iso(lz, P, c, rr, r.uniform(0.12, 0.5), r.randint(0, 9999))
        else:
            caja(lz, P, c, rr, r.uniform(0.3, 0.9), r.uniform(0.2, 0.6), 0, r.uniform(3, 7), (214, 160, 112), (180, 120, 80), (112, 70, 52), 0.9)
    # buttes en las cuatro esquinas, sin tocarse
    for i, (fx, fy) in enumerate(mesas):
        x, y = ancho * fx, alto * fy
        if not fuera_de_sala(x, y, 90):
            continue
        c, rr = casilla(x, y)
        w, h = rl.uniform(2.4, 3.6), rl.uniform(1.6, 2.6)              # más anchas que altas
        mesa_iso(lz, P, c - w / 2, rr - h / 2, w, h, rl.uniform(75, 120) if fy < 0.5 else rl.uniform(50, 80), semilla + i)
    # remolino de polvo pintado a lo lejos
    dx = ancho * (0.85 if semilla % 2 else 0.15)
    for k in range(6):
        lz.linea([(dx - k * 2, 200 - k * 14), (dx + 10 + k * 3, 196 - k * 14)], (200, 150, 120), 2)
    # la base alrededor: paneles solares a un lado y el vehículo aparcado al otro, con sus rodadas
    lado = semilla % 2
    x, y = ancho * sitio_paneles[0], alto * sitio_paneles[1]          # campo de paneles (tamaño variable)
    if fuera_de_sala(x, y, 20):
        c, rr = casilla(x, y)
        paneles_solares(lz, P, c - 1, rr - 1, rl.randint(2, 4), rl.randint(1, 3))
    x, y = (ancho * sitio_rover[0], alto * sitio_rover[1]) if sitio_rover else (-999, -999)   # vehículo (no en todas)
    if sitio_rover and fuera_de_sala(x, y, 20):
        c, rr = casilla(x, y)
        for k in (0.2, 0.75):
            lz.linea([P(c - 8, rr + k), P(c, rr + k)], (120, 66, 44), 2.2)
        rover_iso(lz, P, c, rr)
    # túneles presurizados desde las puertas delanteras hacia el resto de la base
    for lado, pos, destino, _ in z["puertas"]:
        if lado == "s":
            tubo_iso(lz, P, pos, filas + 1.1, pos, filas + 7)


def paisaje(lz, ancho, alto, horizonte, semilla):
    r = random.Random(semilla)
    # cielo del atardecer: pardo oscuro arriba y azul junto al Sol (el polvo dispersa el azul cerca del Sol)
    for k, c in enumerate(CIELO[:4]):
        lz.poli([(0, k * horizonte / 4), (ancho, k * horizonte / 4), (ancho, horizonte), (0, horizonte)], fill=c)
    sx = ancho * (0.18 if semilla % 2 else 0.82)
    for rr, c in ((380, CIELO[4]), (240, CIELO[5]), (130, CIELO[6])):
        lz.d.pieslice([(sx - rr * 1.5) * K, (horizonte - rr * 0.45) * K, (sx + rr * 1.5) * K, (horizonte + rr * 0.45) * K], 180, 360, fill=c)
    lz.elipse(sx - 9, horizonte - 34, sx + 9, horizonte - 16, fill=(255, 255, 255))
    for _ in range(int(ancho * horizonte / 2600)):
        x, y = r.uniform(0, ancho), r.uniform(0, horizonte * 0.55)
        t = r.choice((0.5, 0.7, 0.9, 1.2))
        lz.elipse(x - t, y - t, x + t, y + t, fill=r.choice(((217, 230, 208), (243, 227, 195), (200, 220, 230))))
    luna(lz, ancho * (0.75 if semilla % 2 else 0.25), horizonte * 0.22, 14, semilla)
    # monte Sharp a lo lejos, con capas y ladera en sombra
    mx = ancho * (0.62 if semilla % 2 else 0.38)
    sharp = [(mx - 420, horizonte), (mx - 220, horizonte - 70), (mx - 60, horizonte - 120), (mx + 60, horizonte - 130),
             (mx + 220, horizonte - 90), (mx + 430, horizonte)]
    lz.poli(sharp, fill=(96, 82, 92))
    lz.poli(sharp[3:] + [(mx + 60, horizonte)], fill=(70, 60, 74))
    lz.rayado(sharp[3:] + [(mx + 60, horizonte)], (44, 38, 52), 3.5, -60, 0.8)
    for k in range(1, 8):
        lz.linea([(mx - 400 + k * 30, horizonte - k * 3), (mx, horizonte - 10 - k * 14), (mx + 400 - k * 30, horizonte - k * 4)], (76, 64, 76), 0.9)
    lz.linea(sharp, NEGRO_T, 1.4)
    # dunas Bagnold: arena basáltica oscura
    dunas = [(x, horizonte + 8 + 5 * math.sin(x / 70 + semilla)) for x in range(0, int(ancho) + 20, 20)]
    lz.poli([(0, horizonte)] + [(x, y - 12) for x, y in dunas] + [(ancho, horizonte + 30), (0, horizonte + 30)], fill=(44, 38, 44))
    # suelo de óxido con rayado y punteado
    suelo = [(0, horizonte + 14), (ancho, horizonte + 14), (ancho, alto), (0, alto)]
    lz.poli(suelo, fill=SUELO_M)
    lz.rayado(suelo, SUELO_M_OSC, 6, 6, 1.0)
    for k in range(int(alto - horizonte) // 16):
        y = horizonte + 24 + k * 16
        lz.linea([(x, y + 3 * math.sin(x / 30 + k)) for x in range(0, int(ancho) + 20, 24)], SUELO_M_OSC, 0.9)
    # buttes en el horizonte, a los dos lados
    for i, (cx, an, al) in enumerate(((ancho * 0.08, 210, 150), (ancho * 0.24, 110, 80), (ancho * 0.8, 160, 110), (ancho * 0.95, 240, 180))):
        butte(lz, cx, horizonte + 16, an, al, semilla * 10 + i)
    # remolino de polvo
    dx = ancho * (0.88 if semilla % 2 else 0.12)
    for k in range(7):
        lz.linea([(dx - k * 2, horizonte + 10 - k * 16), (dx + 12 + k * 3, horizonte + 6 - k * 16)], (190, 150, 120), 2.4)
    # losas rotas y piedras por el suelo
    for _ in range(int(ancho * (alto - horizonte) / 9000)):
        x, y = r.uniform(0, ancho), r.uniform(horizonte + 40, alto - 6)
        L, e, inc = r.uniform(10, 34), r.uniform(4, 9), r.uniform(-0.5, 0.2)
        lz.poli([(x, y), (x + L, y + L * inc), (x + L, y + L * inc + e), (x, y + e)], fill=(112, 70, 52), outline=NEGRO_T, ancho=0.9)
        lz.poli([(x, y), (x + L, y + L * inc), (x + L + 5, y + L * inc - e * 0.6), (x + 5, y - e * 0.6)], fill=(214, 160, 112), outline=NEGRO_T, ancho=0.9)


# --- Piezas de la sala ----------------------------------------------------------------
ANG_I, ANG_D = 26.57, 153.43    # dirección de las aristas horizontales de cada cara en pantalla


def caja(lz, P, c, r, w, h, z0, z1, top, izq, der, ancho=1.6, remate=True):
    """Bloque isométrico con volumen: cara izquierda iluminada, derecha en sombra, tapa clara.
    Con remate: degradado por bandas (más oscuro abajo), oclusión en el pie, textura de metal cepillado
    alineada con cada cara, filos iluminados, tornillos en las caras grandes y contorno más grueso por fuera."""
    cara_i = [P(c, r + h, z0), P(c + w, r + h, z0), P(c + w, r + h, z1), P(c, r + h, z1)]
    cara_d = [P(c + w, r + h, z0), P(c + w, r, z0), P(c + w, r, z1), P(c + w, r + h, z1)]
    tapa = [P(c, r, z1), P(c + w, r, z1), P(c + w, r + h, z1), P(c, r + h, z1)]
    lz.poli(cara_i, fill=izq)
    lz.poli(cara_d, fill=der)
    lz.poli(tapa, fill=top)
    alto = z1 - z0
    if remate and alto >= 8 and (w + h) >= 0.45:
        zb = z0 + alto * 0.42
        for cara, col, cid in ((cara_i, izq, "i"), (cara_d, der, "d")):
            pie = (lambda z: [P(c, r + h, z0), P(c + w, r + h, z0), P(c + w, r + h, z), P(c, r + h, z)]) if cid == "i" else \
                  (lambda z: [P(c + w, r + h, z0), P(c + w, r, z0), P(c + w, r, z), P(c + w, r + h, z)])
            lz.velo(pie(zb), V0 + (20,))                                     # degradado por bandas: abajo más oscuro
            lz.velo(pie(z0 + alto * 0.2), V0 + (22,))
            lz.velo(pie(z0 + min(5, alto * 0.18)), V0 + (50,))              # oclusión donde toca el suelo
        lz.rayado(cara_i, mezcla(izq, (255, 255, 255), 0.07), 4.0, ANG_I, 0.3)     # metal cepillado, sutil
        lz.rayado(cara_d, mezcla(der, (255, 255, 255), 0.05), 4.0, ANG_D, 0.3)
        lz.velo([P(c, r + h, z1), P(c + w, r + h, z1), P(c + w, r + h, z1 - min(5, alto * 0.15)), P(c, r + h, z1 - min(5, alto * 0.15))],
                (255, 255, 255, 40))                                       # brillo bajo el filo de arriba
        lz.linea([P(c + w, r + h, z0 + 2), P(c + w, r + h, z1 - 1)], mezcla(izq, (255, 255, 255), 0.35), 0.9)   # arista delantera
        if alto >= 26 and w >= 0.45:                                       # tornillos en las esquinas de la cara clara
            for u, zz in ((0.07, 4), (w - 0.07, 4), (0.07, alto - 4), (w - 0.07, alto - 4)):
                x, y = P(c + u, r + h, z0 + zz)
                lz.elipse(x - 1.1, y - 1.1, x + 1.1, y + 1.1, fill=mezcla(izq, V0, 0.45))
    # brillo del filo de la tapa
    lz.linea([P(c, r + h, z1), P(c + w, r + h, z1)], mezcla(top, (255, 255, 255), 0.45), 1)
    lz.linea([P(c + w, r + h, z1), P(c + w, r, z1)], mezcla(top, (255, 255, 255), 0.2), 0.8)
    # contorno: grueso por fuera (silueta), fino por dentro
    silueta = [P(c, r + h, z0), P(c + w, r + h, z0), P(c + w, r, z0), P(c + w, r, z1), P(c, r, z1), P(c, r + h, z1)]
    lz.poli(silueta, outline=TINTA, ancho=ancho)
    lz.linea([P(c + w, r + h, z0), P(c + w, r + h, z1)], TINTA, ancho * 0.55)
    lz.linea([P(c, r + h, z1), P(c + w, r + h, z1), P(c + w, r, z1)], TINTA, ancho * 0.55)
    return cara_i, cara_d, tapa


def brillo_emisivo(img, radio=5, px=None):
    """Pantallas y luces brillan: los píxeles muy saturados y claros dejan un halo suave alrededor."""
    a = np.asarray(img).astype(np.float32) / 255
    rgb, al = a[..., :3], a[..., 3]
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    azul = (rgb[..., 2] >= mx - 1e-3) & (rgb[..., 0] < 0.6)      # el agua y el metal azul no son luces
    emis = ((mx - mn) > 0.45) & (mx > 0.75) & (al > 0.5) & ~azul
    if not emis.any():
        return img
    capa = np.zeros_like(a)
    capa[..., :3] = rgb * emis[..., None]
    capa[..., 3] = emis.astype(np.float32)
    halo = Image.fromarray((capa * 255).astype(np.uint8), "RGBA").filter(ImageFilter.GaussianBlur(px if px else radio * K))
    h = np.asarray(halo).astype(np.float32) / 255
    fuerza = h[..., 3:4] * 0.55
    out = a.copy()
    out[..., :3] = np.clip(a[..., :3] * (1 - fuerza * 0.4) + h[..., :3] / np.maximum(h[..., 3:4], 1e-3) * fuerza, 0, 1)
    out[..., 3] = np.clip(np.maximum(al, h[..., 3] * 0.5), 0, 1)
    return Image.fromarray((out * 255).astype(np.uint8), "RGBA")


BLANCO, BLANCO_M, BLANCO_S = (246, 242, 236), (220, 214, 206), (182, 174, 168)
AGUA, AGUA_M, AGUA_S, AGUA_L = (120, 170, 230), (60, 110, 200), (40, 80, 160), (170, 210, 250)
VERDE_LED, MAGENTA = (124, 240, 160), (232, 96, 200)


def cilindro(lz, P, cc, rr, rad, z0, z1, lado, sombra, tapa, ancho=1.4):
    """Cilindro vertical: el círculo del suelo en isométrico es una elipse 2:1 (semiejes R·TW/√2 y R·TH/√2)."""
    x, y = P(cc, rr)
    ax, ay = rad * TW / math.sqrt(2), rad * TH / math.sqrt(2)
    lz.poli([(x - ax, y - z0), (x - ax, y - z1), (x + ax, y - z1), (x + ax, y - z0)], fill=lado)
    lz.elipse(x - ax, y - z0 - ay, x + ax, y - z0 + ay, fill=lado)
    lz.poli([(x + ax * 0.25, y - z0 + ay * 0.95), (x + ax * 0.25, y - z1), (x + ax, y - z1), (x + ax, y - z0)], fill=sombra)
    lz.d.chord([(x - ax) * K, (y - z0 - ay) * K, (x + ax) * K, (y - z0 + ay) * K], 0, 75, fill=sombra)
    lz.d.arc([(x - ax) * K, (y - z0 - ay) * K, (x + ax) * K, (y - z0 + ay) * K], 0, 180, fill=TINTA, width=int(ancho * K))
    lz.linea([(x - ax, y - z0), (x - ax, y - z1)], TINTA, ancho)
    lz.linea([(x + ax, y - z0), (x + ax, y - z1)], TINTA, ancho)
    for f0, f1, col in ((-0.78, -0.5, mezcla(lado, (255, 255, 255), 0.22)), (-0.5, -0.38, mezcla(lado, (255, 255, 255), 0.45)),
                        (0.05, 0.25, mezcla(lado, sombra, 0.5))):          # cilindro: reflejo a la izquierda, bandas hacia la sombra
        lz.velo([(x + ax * f0, y - z0 + ay * math.sqrt(max(0, 1 - f0 * f0)) * 0.95), (x + ax * f0, y - z1 + 2),
                 (x + ax * f1, y - z1 + 2), (x + ax * f1, y - z0 + ay * math.sqrt(max(0, 1 - f1 * f1)) * 0.95)], tuple(col) + (150,))
    lz.velo([(x - ax, y - z0), (x + ax, y - z0), (x + ax, y - z0 - min(6, (z1 - z0) * 0.15)), (x - ax, y - z0 - min(6, (z1 - z0) * 0.15))], V0 + (60,))
    lz.elipse(x - ax, y - z1 - ay, x + ax, y - z1 + ay, fill=tapa, outline=TINTA, ancho=ancho)
    lz.d.arc([(x - ax * 0.8) * K, (y - z1 - ay * 0.8) * K, (x + ax * 0.8) * K, (y - z1 + ay * 0.8) * K], 160, 250,
             fill=mezcla(tapa, (255, 255, 255), 0.6), width=max(1, int(1.2 * K)))   # brillo del borde de la tapa
    return x, y, ax, ay


def aro(lz, P, cc, rr, rad, z, color, ancho=1.2):
    x, y = P(cc, rr)
    ax, ay = rad * TW / math.sqrt(2), rad * TH / math.sqrt(2)
    lz.d.arc([(x - ax) * K, (y - z - ay) * K, (x + ax) * K, (y - z + ay) * K], 0, 180, fill=color, width=max(1, int(ancho * K)))


# ======================================================================================
# Detalle máximo (protagonistas). Método procedural-film: ficha con números, reglas de tono
# medibles, capas numeradas, dibujo a 4× y revisión automática (herramientas/revisar_objeto.py).
# Ficha: docs/biblia-objetos.md → "Ficha piloto: rack CDRA".
# ======================================================================================
from contextlib import contextmanager

PX_M = 22.6                     # px por metro en vertical (astronauta de 43 px = 1,9 m)
CASILLA_M = 2.6                 # metros por casilla
K_ALTO = 8                      # 4× el tamaño final (FINAL = 2)

# Paleta del rack (nombres de la ficha)
CDRA = dict(
    tinta=(40, 34, 86), tapa=(196, 190, 240), frente=(150, 142, 218), lateral=(104, 96, 180),
    rebaje=(66, 58, 130), rebaje_fondo=(48, 42, 100), bancada=(88, 80, 158), bancada_lat=(62, 54, 122),
    polvo=(178, 112, 84), polvo_cl=(206, 142, 106), rayon=(228, 224, 250),
    cartucho=(178, 184, 210), cartucho_osc=(120, 124, 160), ambar=(255, 200, 61), azul=(94, 200, 242),
    pantalla=(22, 30, 52), texto=(124, 240, 200), led_v=(124, 240, 160), led_a=(255, 200, 61), led_r=(236, 90, 70),
    etiqueta=(233, 223, 200), tubo=(150, 146, 176), tubo_osc=(108, 102, 146), rejilla=(36, 30, 78), metal=(206, 204, 224),
)


def paleta_cdra():
    """Paleta completa: cada color base con su rampa de tonos (hacia la tinta y hacia el blanco)."""
    tonos = []
    for col in CDRA.values():
        for t in (0, 0.1, 0.2, 0.3, 0.45, 0.6):
            tonos.append(mezcla(col, CDRA["tinta"], t))
        for t in (0.15, 0.3, 0.5):
            tonos.append(mezcla(col, (255, 255, 255), t))
    return tonos


@contextmanager
def resolucion(k):
    """Dibuja a otra resolución (p. ej. 4× para los protagonistas) y vuelve a la normal al terminar."""
    global K
    viejo = K
    K = k
    PM.K = k
    try:
        yield
    finally:
        K = viejo
        PM.K = viejo


def trazo(lz, pts, ancho, color, rnd, presion=0.25):
    """Línea con presión variable (±25 % del grosor a lo largo del trazo), con uniones redondas."""
    fase = rnd.uniform(0, math.tau)
    k = 0
    for a, b in zip(pts, pts[1:]):
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        n = max(1, int(L / 2.0))
        for i in range(n):
            p0 = (a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n)
            p1 = (a[0] + (b[0] - a[0]) * (i + 1) / n, a[1] + (b[1] - a[1]) * (i + 1) / n)
            w = ancho * (1 + presion * math.sin(fase + k * 0.55))
            lz.linea([p0, p1], color, w)
            lz.elipse(p1[0] - w / 2, p1[1] - w / 2, p1[0] + w / 2, p1[1] + w / 2, fill=color)
            k += 1


def trama(lz, cara, direccion, paso, color, rnd, ancho=0.4):
    """Trama de grabado dentro de un polígono convexo: trazos paralelos a `direccion`, separados `paso` px,
    cada uno con temblor (±3°, largo entre el 85 y el 100 % de la cuerda) y presión (±25 %)."""
    dx, dy = direccion
    n = math.hypot(dx, dy)
    dx, dy = dx / n, dy / n
    nx, ny = -dy, dx
    cx = sum(p[0] for p in cara) / len(cara)
    cy = sum(p[1] for p in cara) / len(cara)
    proy = [(p[0] - cx) * nx + (p[1] - cy) * ny for p in cara]
    k = min(proy) + paso * 0.5
    trazos = 0
    while k < max(proy):
        ox, oy = cx + nx * k, cy + ny * k
        t0, t1 = -1e9, 1e9
        for i in range(len(cara)):
            a, b = cara[i], cara[(i + 1) % len(cara)]
            ix, iy = -(b[1] - a[1]), b[0] - a[0]
            if (cx - a[0]) * ix + (cy - a[1]) * iy < 0:
                ix, iy = -ix, -iy
            num = (ox - a[0]) * ix + (oy - a[1]) * iy
            den = dx * ix + dy * iy
            if abs(den) < 1e-9:
                if num < 0:
                    t0, t1 = 1, 0
                continue
            t = -num / den
            if den > 0:
                t0 = max(t0, t)
            else:
                t1 = min(t1, t)
        if t1 - t0 > 0.8:
            L = t1 - t0
            largo = L * rnd.uniform(0.85, 1.0)
            centro = (t0 + t1) / 2 + rnd.uniform(-1, 1) * (L - largo) / 2
            ang = math.radians(rnd.uniform(-3, 3))
            ddx, ddy = dx * math.cos(ang) - dy * math.sin(ang), dx * math.sin(ang) + dy * math.cos(ang)
            mx, my = ox + dx * centro, oy + dy * centro
            lz.linea([(mx - ddx * largo / 2, my - ddy * largo / 2), (mx + ddx * largo / 2, my + ddy * largo / 2)],
                     color, ancho * (1 + rnd.uniform(-0.25, 0.25)))
            trazos += 1
        k += paso
    return trazos


TRAMA = {"suave": 4.5, "media": 3.2, "profunda": 2.2}
DIR_D = (-TW / 2, TH / 2)        # arista horizontal de la cara derecha (153,43°)
DIR_I = (TW / 2, TH / 2)         # arista horizontal de la cara izquierda (26,57°)
DIR_V = (0, 1)                   # vertical


def sombrear(lz, cara, nivel, rnd, direccion=DIR_D, color=None):
    """Trama según lo oscuro de la sombra; la cruzada (vertical) solo en la profunda."""
    color = color or mezcla(CDRA["tinta"], CDRA["lateral"], 0.35)
    n = trama(lz, cara, direccion, TRAMA[nivel], color, rnd, 0.42 if nivel != "suave" else 0.35)
    if nivel == "profunda":
        n += trama(lz, cara, DIR_V, TRAMA[nivel] * 1.15, color, rnd, 0.35)
    return n


def polvo(lz, cara_pts, z_de, rnd, densidad=0.5, color=None):
    """Polvo rojizo de Marte: más denso abajo y cerca de las esquinas de la cara."""
    xs, ys = [p[0] for p in cara_pts], [p[1] for p in cara_pts]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    m = Image.new("L", (int((x1 - x0) * 4) + 2, int((y1 - y0) * 4) + 2), 0)
    ImageDraw.Draw(m).polygon([((x - x0) * 4, (y - y0) * 4) for x, y in cara_pts], fill=255)
    mp = m.load()
    n = int((x1 - x0) * (y1 - y0) * densidad)
    for _ in range(n):
        x, y = rnd.uniform(x0, x1), rnd.uniform(y0, y1)
        if not mp[int((x - x0) * 4), int((y - y0) * 4)]:
            continue
        abajo = (y - y0) / max(1e-6, y1 - y0)              # 0 arriba, 1 abajo
        esquina = 1 - min(x - x0, x1 - x) / max(1e-6, (x1 - x0) / 2)
        if rnd.random() > 0.9 * abajo ** 3 + 0.3 * esquina ** 4:
            continue
        t = rnd.uniform(0.12, 0.3)
        lz.elipse(x - t, y - t * 0.8, x + t, y + t * 0.8, fill=color or rnd.choice((CDRA["polvo"], CDRA["polvo_cl"])))


def rayones(lz, borde, rnd, n=6):
    """Rayones claros a lo largo de un filo (lista de 2 puntos)."""
    (ax, ay), (bx, by) = borde
    for _ in range(n):
        t = rnd.uniform(0.05, 0.95)
        L = rnd.uniform(0.6, 2.0)
        px, py = ax + (bx - ax) * t, ay + (by - ay) * t
        d = math.hypot(bx - ax, by - ay) or 1
        ux, uy = (bx - ax) / d, (by - ay) / d
        lz.linea([(px - ux * L / 2 + rnd.uniform(-0.4, 0.4), py - uy * L / 2), (px + ux * L / 2, py + uy * L / 2)], CDRA["rayon"], 0.35)


def rack_cdra(lz, P, c, r, w, h, cuadro=None):
    """Rack CDRA a escala real (2,01 × 1,05 × 0,86 m sobre bancada), por capas.
    cuadro=None dibuja el cuerpo quieto; cuadro=0..3 dibuja SOLO lo que se anima (aspas, LED, barra del ciclo)."""
    rnd = random.Random(1000 + c * 37 + r * 101)
    C = CDRA
    RW, RD = 1.05 / CASILLA_M, 0.86 / CASILLA_M          # 0,404 × 0,331 casillas
    SW, SD = 1.5 / CASILLA_M, 1.3 / CASILLA_M             # bancada
    ZS = 0.12 * PX_M                                      # alto de la bancada (2,7 px)
    ZT = ZS + 2.01 * PX_M                                 # techo del rack (48,1 px)
    cc, cr = c + 0.5, r + 0.46
    c0, r0 = cc - RW / 2, cr - RD / 2
    fi = lambda u, z, sale=0.0: P(c0 + u, r0 + RD + sale, z)      # cara frontal (izquierda, iluminada)
    fd = lambda v, z, sale=0.0: P(c0 + RW + sale, r0 + v, z)      # cara lateral (derecha, en sombra)
    rect_i = lambda u0, u1, z0, z1: [fi(u0, z0), fi(u1, z0), fi(u1, z1), fi(u0, z1)]
    rect_d = lambda v0, v1, z0, z1: [fd(v0, z0), fd(v1, z0), fd(v1, z1), fd(v0, z1)]
    elipse_i = lambda uc, zc, ru, rz, n=28: [fi(uc + ru * math.cos(t), zc + rz * math.sin(t)) for t in np.linspace(0, math.tau, n, endpoint=False)]
    elipse_d = lambda vc, zc, rv, rz, n=24: [fd(vc + rv * math.cos(t), zc + rz * math.sin(t)) for t in np.linspace(0, math.tau, n, endpoint=False)]
    cara_i = rect_i(0, RW, ZS, ZT)
    cara_d = rect_d(0, RD, ZS, ZT)
    tapa = [P(c0, r0, ZT), P(c0 + RW, r0, ZT), P(c0 + RW, r0 + RD, ZT), P(c0, r0 + RD, ZT)]
    fan = (RW * 0.5, ZS + 7.6, 0.15 / CASILLA_M, 0.15 * PX_M)     # soplante Ø 0,30 m
    leds = [(RW * (0.62 + k * 0.085), ZS + 41.6) for k in range(4)]
    pant = (RW * 0.08, RW * 0.5, ZS + 39.6, ZS + 43.6)

    if cuadro is not None:                               # ---- solo lo que se mueve ----
        uc, zc, ru, rz = fan
        for k in range(4):                               # 4 aspas: 22,5° por cuadro → vuelta sin saltos
            a = math.radians(cuadro * 22.5 + k * 90)
            aspa = [fi(uc + ru * 0.25 * math.cos(a - 0.5), zc + rz * 0.25 * math.sin(a - 0.5)),
                    fi(uc + ru * 0.88 * math.cos(a - 0.22), zc + rz * 0.88 * math.sin(a - 0.22)),
                    fi(uc + ru * 0.88 * math.cos(a + 0.22), zc + rz * 0.88 * math.sin(a + 0.22)),
                    fi(uc + ru * 0.25 * math.cos(a + 0.35), zc + rz * 0.25 * math.sin(a + 0.35))]
            lz.poli(aspa, fill=C["metal"], outline=C["tinta"], ancho=0.3)
        hx, hy = fi(uc, zc)
        lz.elipse(hx - 0.8, hy - 0.8, hx + 0.8, hy + 0.8, fill=C["tinta"])
        estados = [(C["led_v"], True), (C["led_v"], cuadro < 2), (C["led_a"], cuadro % 2 == 0), (C["led_v"], True)]
        for (u, z), (col, on) in zip(leds, estados):
            x, y = fi(u, z)
            lz.elipse(x - 0.55, y - 0.55, x + 0.55, y + 0.55, fill=col if on else mezcla(col, C["rebaje_fondo"], 0.8))
        u0, u1, z0, z1 = pant                            # barra del ciclo de adsorción
        lz.poli(rect_i(u0 + 0.01, u1 - 0.01, z0 + 0.6, z0 + 1.4), fill=C["pantalla"])
        avance = (cuadro + 1) / 4
        lz.poli(rect_i(u0 + 0.01, u0 + 0.01 + (u1 - u0 - 0.02) * avance, z0 + 0.6, z0 + 1.4), fill=C["texto"])
        return

    # ---- capa 1: sombra de contacto y sombra arrojada (suaves, hacia la derecha) ----
    lz.sombra_suave([P(cc - SW / 2, cr + SD / 2 + 0.03), P(cc + SW / 2 + 0.22, cr + SD / 2 + 0.03),
                     P(cc + SW / 2 + 0.3, cr - SD / 2 + 0.12), P(cc + SW / 2, cr - SD / 2)], (30, 22, 70), 0.42, 4)
    lz.sombra_suave([P(cc - SW / 2, cr + SD / 2), P(cc + SW / 2, cr + SD / 2), P(cc + SW / 2, cr - SD / 2), P(cc - SW / 2, cr - SD / 2)],
                    (24, 18, 56), 0.6, 1.2)

    # ---- capa 2: caras. Bancada con 4 patas niveladoras, cuerpo del rack ----
    for u, v in ((0.04, 0.04), (SW - 0.08, 0.04), (0.04, SD - 0.08), (SW - 0.08, SD - 0.08)):
        caja(lz, P, cc - SW / 2 + u, cr - SD / 2 + v, 0.04, 0.04, 0, 1.2, C["metal"], C["tubo"], C["tubo_osc"], 0.4, remate=False)
    sk_i = [P(cc - SW / 2, cr + SD / 2, 1.2), P(cc + SW / 2, cr + SD / 2, 1.2), P(cc + SW / 2, cr + SD / 2, ZS), P(cc - SW / 2, cr + SD / 2, ZS)]
    sk_d = [P(cc + SW / 2, cr + SD / 2, 1.2), P(cc + SW / 2, cr - SD / 2, 1.2), P(cc + SW / 2, cr - SD / 2, ZS), P(cc + SW / 2, cr + SD / 2, ZS)]
    sk_t = [P(cc - SW / 2, cr - SD / 2, ZS), P(cc + SW / 2, cr - SD / 2, ZS), P(cc + SW / 2, cr + SD / 2, ZS), P(cc - SW / 2, cr + SD / 2, ZS)]
    lz.poli(sk_i, fill=C["bancada"])
    lz.poli(sk_d, fill=C["bancada_lat"])
    lz.poli(sk_t, fill=mezcla(C["bancada"], (255, 255, 255), 0.15))
    for k in range(5):                                   # franjas de aviso en el canto de la bancada
        u = cc - SW / 2 + 0.03 + k * (SW - 0.06) / 5
        lz.poli([P(u, cr + SD / 2, 1.4), P(u + 0.03, cr + SD / 2, 1.4), P(u + 0.05, cr + SD / 2, ZS - 0.2), P(u + 0.02, cr + SD / 2, ZS - 0.2)], fill=C["ambar"])
    lz.poli(cara_i, fill=C["frente"])
    lz.poli(cara_d, fill=C["lateral"])
    lz.poli(tapa, fill=C["tapa"])

    # ---- capa 3: material. Pintura mate (piel de naranja) y degradado por bandas ----
    lz.velo(rect_i(0, RW, ZS, ZS + 20), C["tinta"] + (22,))
    lz.velo(rect_i(0, RW, ZS, ZS + 8), C["tinta"] + (22,))
    lz.velo(rect_i(0, RW, ZT - 4, ZT), (255, 255, 255, 30))
    lz.velo(rect_d(0, RD, ZS, ZS + 18), C["tinta"] + (26,))
    for cara, col in ((cara_i, mezcla(C["frente"], (255, 255, 255), 0.1)), (cara_d, mezcla(C["lateral"], (255, 255, 255), 0.07))):
        polvo(lz, cara, None, rnd, 0.35, color=col)      # grano de la pintura, apenas visible

    # ---- capa 4: rebajes y sombras de paneles ----
    def rebaje(u0, u1, z0, z1, fondo, prof=0.8):
        """Hueco en la cara frontal: fondo oscuro, pared de arriba e izquierda en sombra, abajo y derecha con luz."""
        lz.poli(rect_i(u0, u1, z0, z1), fill=fondo)
        arriba = [fi(u0, z1), fi(u1, z1), fi(u1 - 0.006, z1 - prof * 1.6), fi(u0 + 0.006, z1 - prof * 1.6)]
        izq = [fi(u0, z0), fi(u0 + 0.012, z0 + prof), fi(u0 + 0.012, z1 - prof), fi(u0, z1)]
        abajo = [fi(u0, z0), fi(u1, z0), fi(u1 - 0.006, z0 + prof), fi(u0 + 0.006, z0 + prof)]
        lz.poli(arriba, fill=mezcla(fondo, C["tinta"], 0.5))
        lz.poli(izq, fill=mezcla(fondo, C["tinta"], 0.35))
        lz.poli(abajo, fill=mezcla(C["frente"], (255, 255, 255), 0.2))
        return arriba, izq

    pr_bahia = rebaje(RW * 0.07, RW * 0.93, ZS + 15.5, ZS + 36.5, C["rebaje_fondo"])
    pr_panel = rebaje(RW * 0.05, RW * 0.95, ZS + 38.2, ZS + 44.6, C["rebaje"], 0.6)
    lz.poli(rect_i(0, RW, ZS, ZS + 2.2), fill=mezcla(C["frente"], C["tinta"], 0.3))           # zócalo
    for z in (ZS + 14.2, ZS + 37.4):                     # juntas entre paneles
        lz.linea([fi(0.004, z), fi(RW - 0.004, z)], mezcla(C["frente"], C["tinta"], 0.5), 0.45)
        lz.linea([fi(0.004, z - 0.5), fi(RW - 0.004, z - 0.5)], mezcla(C["frente"], (255, 255, 255), 0.35), 0.3)
    lz.linea([fd(RD * 0.5, ZS + 3), fd(RD * 0.5, ZT - 3)], mezcla(C["lateral"], C["tinta"], 0.4), 0.45)   # junta de la tapa lateral

    # ---- capa 5: detalles ----
    # lechos: 4 cartuchos (1 y 4 desecantes, tapa ámbar; 2 y 3 de CO2, tapa azul)
    for k in range(4):
        u = RW * (0.17 + k * 0.22)
        ru = (0.17 / 2) / CASILLA_M
        z0, z1 = ZS + 17, ZS + 34.8
        cuerpo = rect_i(u - ru, u + ru, z0, z1)
        lz.poli(cuerpo, fill=C["cartucho"])
        lz.poli(rect_i(u - ru * 0.75, u - ru * 0.35, z0 + 0.6, z1 - 2.6), fill=mezcla(C["cartucho"], (255, 255, 255), 0.5))   # reflejo
        lz.poli(rect_i(u + ru * 0.35, u + ru, z0, z1), fill=C["cartucho_osc"])
        tapa_col = C["ambar"] if k in (0, 3) else C["azul"]
        lz.poli(rect_i(u - ru, u + ru, z1 - 2.2, z1), fill=tapa_col)
        lz.poli(rect_i(u - ru, u + ru, z0, z0 + 1.2), fill=mezcla(C["cartucho"], C["tinta"], 0.35))
        for z in (z0 + 6, z0 + 11):                       # abrazaderas
            lz.linea([fi(u - ru, z), fi(u + ru, z)], C["cartucho_osc"], 0.5)
        lz.poli(cuerpo, outline=C["tinta"], ancho=0.4)
        x, y = fi(u, z1 + 0.9)                            # número del lecho
        lz.texto(x, y, str(k + 1), 1.6, C["etiqueta"])
    # tubo colector que une los lechos por arriba
    lz.linea([fi(RW * 0.12, ZS + 35.4), fi(RW * 0.88, ZS + 35.4)], C["tubo_osc"], 0.9)
    # soplante en el panel de abajo
    uc, zc, ru, rz = fan
    lz.poli(elipse_i(uc, zc, ru * 1.25, rz * 1.25), fill=mezcla(C["frente"], C["tinta"], 0.15), outline=C["tinta"], ancho=0.4)
    lz.poli(elipse_i(uc, zc, ru, rz), fill=C["rejilla"])
    for f in (0.45, 0.75):                               # aros de la rejilla
        lz.poli(elipse_i(uc, zc, ru * f, rz * f), outline=mezcla(C["rejilla"], C["metal"], 0.35), ancho=0.25)
    for t in np.linspace(0, math.tau, 8, endpoint=False):
        lz.linea([fi(uc + ru * 0.15 * math.cos(t), zc + rz * 0.15 * math.sin(t)), fi(uc + ru * math.cos(t), zc + rz * math.sin(t))], mezcla(C["rejilla"], C["metal"], 0.3), 0.22)
    for u in (RW * 0.12, RW * 0.88):                     # tornillos del panel del soplante
        for z in (ZS + 3.5, ZS + 12.6):
            x, y = fi(u, z)
            lz.elipse(x - 0.4, y - 0.4, x + 0.4, y + 0.4, fill=mezcla(C["frente"], C["tinta"], 0.5))
            lz.linea([(x - 0.3, y), (x + 0.3, y)], C["rayon"], 0.15)
    # panel de control: pantalla del ciclo, 4 LED, etiqueta de CO2
    u0, u1, z0, z1 = pant
    lz.poli(rect_i(u0, u1, z0, z1), fill=C["pantalla"], outline=C["tinta"], ancho=0.3)
    lz.linea([fi(u0 + 0.01, z1 - 1.0), fi(u0 + (u1 - u0) * 0.6, z1 - 1.0)], C["texto"], 0.3)          # texto
    lz.linea([fi(u0 + 0.01, z1 - 1.9), fi(u0 + (u1 - u0) * 0.4, z1 - 1.9)], mezcla(C["texto"], C["pantalla"], 0.4), 0.3)
    lz.poli(rect_i(u0 + 0.01, u1 - 0.01, z0 + 0.6, z0 + 1.4), outline=mezcla(C["texto"], C["pantalla"], 0.5), ancho=0.2)
    lz.poli(rect_i(u0 + 0.01, u0 + (u1 - u0) * 0.5, z0 + 0.6, z0 + 1.4), fill=C["texto"])
    for (u, z), col in zip(leds, (C["led_v"], C["led_v"], C["led_a"], C["led_v"])):
        x, y = fi(u, z)
        lz.elipse(x - 0.7, y - 0.7, x + 0.7, y + 0.7, fill=C["rejilla"])
        lz.elipse(x - 0.5, y - 0.5, x + 0.5, y + 0.5, fill=col)
    lab = rect_i(RW * 0.6, RW * 0.92, ZS + 38.8, ZS + 40.4)                   # etiqueta O=C=O
    lz.poli(lab, fill=C["etiqueta"])
    for k, du in enumerate((-0.03, 0, 0.03)):
        x, y = fi(RW * 0.76 + du, ZS + 39.6)
        rad = 0.35 if k != 1 else 0.45
        lz.elipse(x - rad, y - rad, x + rad, y + rad, fill=(184, 71, 61) if k != 1 else C["tinta"])
    # 4 asas en las esquinas de la cara frontal (salen hacia delante)
    asas = []
    for u in (RW * 0.035, RW * 0.965):
        for z in (ZS + 5, ZS + 45):
            a_, b_ = fi(u, z - 1.6), fi(u, z + 1.6)
            a2, b2 = fi(u, z - 1.6, 0.025), fi(u, z + 1.6, 0.025)
            lz.linea([a_, a2, b2, b_], C["tinta"], 0.95)
            lz.linea([a_, a2, b2, b_], C["metal"], 0.6)
            asas.append((a2, b2))
    # cara lateral: rejillas de ventilación, 2 válvulas selectoras con volante, aviso
    for k in range(9):
        z = ZS + 30 + k * 1.5
        lz.linea([fd(RD * 0.12, z), fd(RD * 0.88, z)], C["rejilla"], 0.5)
        lz.linea([fd(RD * 0.12, z - 0.45), fd(RD * 0.88, z - 0.45)], mezcla(C["lateral"], (255, 255, 255), 0.18), 0.25)
    for v, z in ((RD * 0.3, ZS + 20), (RD * 0.7, ZS + 20)):
        caja(lz, P, c0 + RW, r0 + v - 0.035, 0.03, 0.07, z - 1.8, z + 1.8, C["metal"], C["tubo"], C["tubo_osc"], 0.35, remate=False)
        cx_, cy_ = fd(v, z, 0.045)
        ru_, rz_ = 0.03, 1.4
        rueda = [P(c0 + RW + 0.045, r0 + v + ru_ * math.cos(t), z + rz_ * math.sin(t)) for t in np.linspace(0, math.tau, 20, endpoint=False)]
        lz.poli(rueda, outline=(184, 71, 61), ancho=0.4)
        for t in (0, math.pi / 2):
            lz.linea([P(c0 + RW + 0.045, r0 + v + ru_ * math.cos(t), z + rz_ * math.sin(t)),
                      P(c0 + RW + 0.045, r0 + v - ru_ * math.cos(t), z - rz_ * math.sin(t))], (184, 71, 61), 0.35)
    x, y = fd(RD * 0.5, ZS + 9)
    lz.poli([(x - 1.6, y + 1.2), (x, y - 1.6), (x + 1.6, y + 1.2)], fill=C["ambar"], outline=C["tinta"], ancho=0.25)
    # tapa: rejilla de entrada de aire y 2 cáncamos
    rej = [P(c0 + RW * 0.18, r0 + RD * 0.2, ZT), P(c0 + RW * 0.82, r0 + RD * 0.2, ZT), P(c0 + RW * 0.82, r0 + RD * 0.8, ZT), P(c0 + RW * 0.18, r0 + RD * 0.8, ZT)]
    lz.poli(rej, fill=mezcla(C["tapa"], C["tinta"], 0.3))
    for k in range(6):
        u = RW * (0.22 + k * 0.11)
        lz.linea([P(c0 + u, r0 + RD * 0.24, ZT), P(c0 + u, r0 + RD * 0.76, ZT)], C["rejilla"], 0.35)
    for u, v in ((RW * 0.1, RD * 0.1), (RW * 0.9, RD * 0.9)):
        x, y = P(c0 + u, r0 + v, ZT + 0.8)
        lz.elipse(x - 0.8, y - 0.6, x + 0.8, y + 0.6, outline=C["metal"], ancho=0.35)
    # tubo flexible de salida de aire (anillado) hasta el difusor del suelo
    sal_a = fd(RD * 0.25, ZS + 11, 0.0)
    sal_b = P(c0 + RW + 0.12, r0 + RD * 0.25, ZS + 9)
    sal_c = P(c0 + RW + 0.14, r0 + RD * 0.3, 0.6)
    tubo = [sal_a] + [((1 - t) ** 2 * sal_a[0] + 2 * (1 - t) * t * sal_b[0] + t * t * sal_c[0],
                       (1 - t) ** 2 * sal_a[1] + 2 * (1 - t) * t * sal_b[1] + t * t * sal_c[1]) for t in np.linspace(0.05, 1, 14)]
    dx_, dy_ = P(c0 + RW + 0.2, r0 + RD * 0.3)
    difusor = [P(c0 + RW + 0.08, r0 + RD * 0.3 - 0.06), P(c0 + RW + 0.2, r0 + RD * 0.3 - 0.06), P(c0 + RW + 0.2, r0 + RD * 0.3 + 0.06), P(c0 + RW + 0.08, r0 + RD * 0.3 + 0.06)]
    lz.poli(difusor, fill=C["rejilla"], outline=C["tinta"], ancho=0.35)
    lz.linea(tubo, C["tinta"], 3.6)
    lz.linea(tubo, C["tubo"], 2.9)
    lz.linea([(x - 0.6, y - 0.5) for x, y in tubo], mezcla(C["tubo"], (255, 255, 255), 0.35), 0.5)
    for k in range(1, len(tubo) - 1):                    # anillos del tubo
        (ax_, ay_), (bx_, by_) = tubo[k - 1], tubo[k + 1]
        nx_, ny_ = -(by_ - ay_), bx_ - ax_
        n_ = math.hypot(nx_, ny_) or 1
        x, y = tubo[k]
        lz.linea([(x - nx_ / n_ * 1.35, y - ny_ / n_ * 1.35), (x + nx_ / n_ * 1.35, y + ny_ / n_ * 1.35)], C["tubo_osc"], 0.3)
    # línea de CO2 al exterior: rígida, con cinta ámbar, baja al suelo junto a la esquina trasera
    co_a, co_b = fd(RD * 0.06, ZS + 27, 0.03), fd(RD * 0.06, 0.4, 0.03)
    lz.linea([co_a, co_b], C["tinta"], 1.4)
    lz.linea([co_a, co_b], C["metal"], 0.9)
    for z in (ZS + 22, ZS + 12):
        x, y = fd(RD * 0.06, z, 0.03)
        lz.linea([(x - 0.7, y - 0.2), (x + 0.7, y + 0.2)], C["ambar"], 1.1)
    x, y = co_b
    lz.elipse(x - 1.2, y - 0.6, x + 1.2, y + 0.6, fill=C["tubo_osc"], outline=C["tinta"], ancho=0.3)

    # ---- capa 6: trama (solo en sombra) y desgaste ----
    sombrear(lz, rect_d(0, RD, ZS, ZT), "media", rnd)                  # cara lateral: sombra media
    sombrear(lz, sk_d, "media", rnd)
    for arriba, izq in (pr_bahia, pr_panel):                            # paredes interiores de los rebajes: sombra profunda
        sombrear(lz, arriba, "profunda", rnd, DIR_I)
        sombrear(lz, izq, "profunda", rnd, DIR_V)
    sombrear(lz, rect_i(RW * 0.08, RW * 0.92, ZS + 15.6, ZS + 17), "profunda", rnd, DIR_I)   # fondo de la bahía bajo los lechos
    sombrear(lz, rect_i(0, RW, ZS, ZS + 2.2), "suave", rnd, DIR_I)    # zócalo: sombra suave
    for k, (alto_v, alfa) in enumerate(((10, 18), (5, 22), (2.4, 30))):          # velo de polvo: más denso abajo
        lz.velo(rect_i(0, RW, ZS, ZS + alto_v), C["polvo"] + (alfa,))
        lz.velo(rect_d(0, RD, ZS, ZS + alto_v), C["polvo"] + (alfa,))
    lz.velo(sk_t, C["polvo_cl"] + (60,))
    polvo(lz, cara_i, None, rnd, 0.22, color=mezcla(C["frente"], C["polvo"], 0.5))
    polvo(lz, cara_d, None, rnd, 0.2, color=mezcla(C["lateral"], C["polvo"], 0.45))
    polvo(lz, sk_t, None, rnd, 0.6, color=mezcla(C["bancada"], C["polvo_cl"], 0.5))
    for borde in ((fi(0, ZS), fi(0, ZT)), (fi(RW, ZS), fi(RW, ZT)), (fi(0, ZT), fi(RW, ZT))):
        rayones(lz, borde, rnd, 7)
    for a2, b2 in asas:
        rayones(lz, (a2, b2), rnd, 2)

    # ---- capa 7: luz propia (el halo lo añade brillo_emisivo) ----
    x, y = fi(pant[0] + 0.02, pant[3] - 1.0)
    lz.elipse(x - 0.5, y - 0.4, x + 0.5, y + 0.4, fill=C["texto"])

    # ---- capa 8: tinta. Silueta gruesa (2,2) y aristas interiores finas (0,9), con presión variable ----
    silueta = [P(cc - SW / 2, cr + SD / 2, 1.2), P(cc + SW / 2, cr + SD / 2, 1.2), P(cc + SW / 2, cr - SD / 2, 1.2),
               P(cc + SW / 2, cr - SD / 2, ZS), P(c0 + RW, r0, ZS), P(c0 + RW, r0, ZT), P(c0, r0, ZT), P(c0, r0 + RD, ZT),
               P(c0, r0 + RD, ZS), P(cc - SW / 2, cr + SD / 2, ZS), P(cc - SW / 2, cr + SD / 2, 1.2)]
    trazo(lz, silueta, 1.5, C["tinta"], rnd, presion=0.12)
    for linea in ([fi(RW, ZS), fi(RW, ZT)], [fi(0, ZT), fi(RW, ZT), P(c0 + RW, r0, ZT)],
                  [P(cc - SW / 2, cr + SD / 2, ZS), P(cc + SW / 2, cr + SD / 2, ZS), P(cc + SW / 2, cr - SD / 2, ZS)],
                  [fi(0, ZS), fi(RW, ZS), fd(0, ZS)]):
        trazo(lz, linea, 0.6, C["tinta"], rnd)
    for u0_, u1_, z0_, z1_ in ((RW * 0.07, RW * 0.93, ZS + 15.5, ZS + 36.5), (RW * 0.05, RW * 0.95, ZS + 38.2, ZS + 44.6)):
        trazo(lz, rect_i(u0_, u1_, z0_, z1_) + [fi(u0_, z0_)], 0.45, C["tinta"], rnd)


def grano_final(img, semilla, fuerza=0.018):
    """Capa 9: grano de impresión, igual en cada ejecución (semilla fija)."""
    a = np.asarray(img).astype(np.float32) / 255
    ruido = np.random.default_rng(semilla).normal(0, fuerza, a.shape[:2]).astype(np.float32)
    a[..., :3] = np.clip(a[..., :3] + ruido[..., None] * (a[..., 3:4] > 0.5), 0, 1)
    return Image.fromarray((a * 255).astype(np.uint8), "RGBA")




# --------------------------------------------------------------------------------------
# Las otras 5 estaciones con el mismo método (ficha en docs/biblia-objetos.md).
# Una sola tabla de medidas reales: la usan el dibujo y la revisión automática.
# --------------------------------------------------------------------------------------
from types import SimpleNamespace

EXTRA = dict(agua=(120, 170, 230), agua_m=(60, 110, 200), agua_s=(40, 80, 160), agua_l=(170, 210, 250),
             hoja=(124, 200, 150), hoja_c=(111, 179, 167), hoja_r=(186, 84, 120), magenta=(232, 96, 200),
             camara=(70, 34, 84), rosa=(228, 138, 216), almohada=(214, 196, 160), vidrio=(176, 190, 236),
             energia=(255, 200, 61), blindaje=(181, 140, 255), comms=(124, 240, 160), rojo=(184, 71, 61))

MEDIDAS = {   # metros reales; escala = rango aceptado de alto frente al astronauta (1,9 m)
    "cdra": dict(alto=2.01, ancho=1.05, fondo=0.86, escala=(1.0, 1.35), forma="caja", luz_z=1.0),
    "baterias": dict(alto=1.8, ancho=1.1, fondo=1.0, escala=(0.95, 1.15), forma="caja", luz_z=1.0),
    "consola": dict(alto=1.5, ancho=1.2, fondo=0.8, escala=(0.75, 0.95), forma="caja", luz_z=0.5),
    "servidores": dict(alto=2.0, ancho=0.6, fondo=1.0, escala=(1.0, 1.2), forma="caja", luz_z=1.0),
    "tanque": dict(alto=1.8, ancho=0.9, fondo=0.9, escala=(0.95, 1.15), forma="cilindro", luz_z=1.0),
    "cultivo": dict(alto=1.8, ancho=1.0, fondo=0.6, escala=(0.95, 1.15), forma="caja", luz_z=1.0),
}
ESTACION_DE = {"oxigeno": "cdra", "energia": "baterias", "mando": "consola", "comunicaciones": "servidores", "blindaje": "tanque"}


# Utilería a escala real: (alto real en metros, alto con el que está dibujada en px). Se escala igual en las
# tres dimensiones desde el centro de su huella en el suelo (en isométrica, escalar la imagen = escalar el objeto en 3D).
UTILERIA = {
    "cajas": (0.25, 30),        # bolsa de carga CTB: 0,50 × 0,42 × 0,25 m
    "bidon": (0.9, 47),         # bidón de agua de 200 L
    "maceta": (0.9, 66),        # chile en maceta (de la base del plato a lo alto de la copa)
    "mesa": (0.75, 33),         # mesa a 0,75 m (el holograma, encima)
    "banco_pasillo": (0.45, 23),
    "banco": (0.9, 32),         # banco de trabajo
    "estanteria": (1.8, 84),
    "escritorio": (0.75, 28),
    "litera": (1.75, 58),
    "taquilla": (1.8, 80),
    "carro": (0.95, 46),
    "antena": (1.8, 94),
    "bandeja": (0.8, 22),
}


ESCALA_MUNDO = 2.0       # en el mundo, personas y objetos van al doble: 45,2 px/m, y 1 casilla = 1,3 m
UNIFORMES = {"cajas", "bidon", "maceta"}   # se encogen igual en todo; el resto solo en vertical (su huella es la de la rejilla)


def escala_utileria(tipo, sala):
    clave = "banco_pasillo" if (tipo == "banco" and sala == "Pasillo") else tipo
    alto_m, alto_px = UTILERIA.get(clave, (None, None))
    return 1.0 if alto_m is None else alto_m * PX_M * ESCALA_MUNDO / alto_px


def alto_real(tipo, sistema, sala):
    clave = clave_protagonista(tipo, sistema, sala)
    if clave:
        return MEDIDAS[clave]["alto"] + 0.12
    k = "banco_pasillo" if (tipo == "banco" and sala == "Pasillo") else tipo
    return UTILERIA.get(k, (1.0, 1))[0]


class IsoZ:
    """Proyección que solo estira la altura (utilería: su huella es la de la rejilla, su alto el real)."""

    def __init__(self, base, sz):
        self.base, self.sz, self.ox, self.oy = base, sz, base.ox, base.oy

    def __call__(self, c, r, z=0.0):
        return self.base(c, r, z * self.sz)


def huella(tipo, sistema, sala, c, r, w, h):
    """Rectángulo real que ocupa el objeto en el suelo (en casillas): lo usan la colisión y el orden de dibujo."""
    clave = clave_protagonista(tipo, sistema, sala)
    cc, cr = c + w / 2, r + h / 2
    if clave:                                        # la bancada, al doble (en el mundo cada casilla mide 1,3 m)
        M = MEDIDAS[clave]
        SW = (M["ancho"] + 0.45) / CASILLA_M * ESCALA_MUNDO
        SD = (M["fondo"] + 0.45) / CASILLA_M * ESCALA_MUNDO
        return [cc - SW / 2, cr - SD / 2, cc + SW / 2, cr + SD / 2]
    if tipo in UNIFORMES:
        k = escala_utileria(tipo, sala)
        hw, hh = max(0.06, (w / 2 - 0.1) * k), max(0.06, (h / 2 - 0.1) * k)
        return [cc - hw, cr - hh, cc + hw, cr + hh]
    return [c + 0.1, r + 0.1, c + w - 0.1, r + h - 0.1]


def clave_protagonista(tipo, sistema, sala=None):
    if tipo == "torre":
        return "cultivo"
    return ESTACION_DE.get(sistema) if tipo == "maquina" else None


def es_protagonista(tipo, sistema):          # sustituye a la versión del piloto
    return clave_protagonista(tipo, sistema) is not None


def paleta_protagonistas():
    tonos = paleta_cdra()
    for col in EXTRA.values():
        for t in (0, 0.15, 0.3, 0.45, 0.6):
            tonos.append(mezcla(col, CDRA["tinta"], t))
        for t in (0.2, 0.4, 0.6):
            tonos.append(mezcla(col, (255, 255, 255), t))
    return tonos


class Marco:
    """Caja isométrica con caras frontal (i, iluminada), lateral (d, en sombra) y tapa (t)."""

    def __init__(self, P, cc, cr, RW, RD, z0, z1):
        self.P, self.RW, self.RD, self.z0, self.z1 = P, RW, RD, z0, z1
        self.c0, self.r0 = cc - RW / 2, cr - RD / 2

    def fi(self, u, z, sale=0.0):
        return self.P(self.c0 + u, self.r0 + self.RD + sale, z)

    def fd(self, v, z, sale=0.0):
        return self.P(self.c0 + self.RW + sale, self.r0 + v, z)

    def ft(self, u, v, z=None):
        return self.P(self.c0 + u, self.r0 + v, self.z1 if z is None else z)

    def ri(self, u0, u1, z0, z1):
        return [self.fi(u0, z0), self.fi(u1, z0), self.fi(u1, z1), self.fi(u0, z1)]

    def rd(self, v0, v1, z0, z1):
        return [self.fd(v0, z0), self.fd(v1, z0), self.fd(v1, z1), self.fd(v0, z1)]

    def rt(self, u0, u1, v0, v1, z=None):
        return [self.ft(u0, v0, z), self.ft(u1, v0, z), self.ft(u1, v1, z), self.ft(u0, v1, z)]

    def elipse_i(self, uc, zc, ru, rz, n=28):
        return [self.fi(uc + ru * math.cos(t), zc + rz * math.sin(t)) for t in np.linspace(0, math.tau, n, endpoint=False)]

    def elipse_d(self, vc, zc, rv, rz, n=24):
        return [self.fd(vc + rv * math.cos(t), zc + rz * math.sin(t)) for t in np.linspace(0, math.tau, n, endpoint=False)]

    @property
    def cara_i(self):
        return self.ri(0, self.RW, self.z0, self.z1)

    @property
    def cara_d(self):
        return self.rd(0, self.RD, self.z0, self.z1)

    @property
    def tapa(self):
        return self.rt(0, self.RW, 0, self.RD)


def base_prota(lz, P, cc, cr, ancho_m, fondo_m):
    """Capas 1 y 2 comunes: sombra de contacto y arrojada, bancada con patas y franjas de aviso."""
    C = CDRA
    SW, SD = (ancho_m + 0.45) / CASILLA_M, (fondo_m + 0.45) / CASILLA_M
    ZS = 0.12 * PX_M
    lz.sombra_suave([P(cc - SW / 2, cr + SD / 2 + 0.03), P(cc + SW / 2 + 0.22, cr + SD / 2 + 0.03),
                     P(cc + SW / 2 + 0.3, cr - SD / 2 + 0.12), P(cc + SW / 2, cr - SD / 2)], (30, 22, 70), 0.42, 4)
    lz.sombra_suave([P(cc - SW / 2, cr + SD / 2), P(cc + SW / 2, cr + SD / 2), P(cc + SW / 2, cr - SD / 2), P(cc - SW / 2, cr - SD / 2)],
                    (24, 18, 56), 0.6, 1.2)
    for u, v in ((0.04, 0.04), (SW - 0.08, 0.04), (0.04, SD - 0.08), (SW - 0.08, SD - 0.08)):
        caja(lz, P, cc - SW / 2 + u, cr - SD / 2 + v, 0.04, 0.04, 0, 1.2, C["metal"], C["tubo"], C["tubo_osc"], 0.4, remate=False)
    b = Marco(P, cc, cr, SW, SD, 1.2, ZS)
    lz.poli(b.cara_i, fill=C["bancada"])
    lz.poli(b.cara_d, fill=C["bancada_lat"])
    lz.poli(b.tapa, fill=mezcla(C["bancada"], (255, 255, 255), 0.15))
    for k in range(int(SW / 0.07)):                        # franjas de aviso en el canto
        u = 0.03 + k * 0.07
        if u + 0.05 > SW - 0.02:
            break
        lz.poli([b.fi(u, 1.4), b.fi(u + 0.03, 1.4), b.fi(u + 0.05, ZS - 0.2), b.fi(u + 0.02, ZS - 0.2)], fill=C["ambar"])
    return SimpleNamespace(SW=SW, SD=SD, ZS=ZS, b=b, cc=cc, cr=cr)


def material_prota(lz, m, rnd):
    """Capa 3: pintura mate y degradado por bandas (abajo más oscuro, arriba un brillo)."""
    C = CDRA
    lz.velo(m.ri(0, m.RW, m.z0, m.z0 + (m.z1 - m.z0) * 0.45), C["tinta"] + (22,))
    lz.velo(m.ri(0, m.RW, m.z0, m.z0 + 8), C["tinta"] + (22,))
    lz.velo(m.ri(0, m.RW, m.z1 - 4, m.z1), (255, 255, 255, 30))
    lz.velo(m.rd(0, m.RD, m.z0, m.z0 + (m.z1 - m.z0) * 0.4), C["tinta"] + (26,))
    polvo(lz, m.cara_i, None, rnd, 0.35, color=mezcla(C["frente"], (255, 255, 255), 0.1))
    polvo(lz, m.cara_d, None, rnd, 0.3, color=mezcla(C["lateral"], (255, 255, 255), 0.07))


def rebaje_prota(lz, m, u0, u1, z0, z1, fondo, prof=0.8):
    """Capa 4: hueco en la cara frontal. Devuelve las paredes en sombra (para tramarlas)."""
    C = CDRA
    lz.poli(m.ri(u0, u1, z0, z1), fill=fondo)
    arriba = [m.fi(u0, z1), m.fi(u1, z1), m.fi(u1 - 0.006, z1 - prof * 1.6), m.fi(u0 + 0.006, z1 - prof * 1.6)]
    izq = [m.fi(u0, z0), m.fi(u0 + 0.012, z0 + prof), m.fi(u0 + 0.012, z1 - prof), m.fi(u0, z1)]
    abajo = [m.fi(u0, z0), m.fi(u1, z0), m.fi(u1 - 0.006, z0 + prof), m.fi(u0 + 0.006, z0 + prof)]
    lz.poli(arriba, fill=mezcla(fondo, C["tinta"], 0.5))
    lz.poli(izq, fill=mezcla(fondo, C["tinta"], 0.35))
    lz.poli(abajo, fill=mezcla(C["frente"], (255, 255, 255), 0.2))
    return arriba, izq


def desgaste_prota(lz, m, base, rnd, paredes=(), nivel="media", rayas=True):
    """Capa 6: trama solo en sombra, polvo rojizo asentado abajo y rayones en los filos."""
    C = CDRA
    sombrear(lz, m.cara_d, nivel, rnd)
    sombrear(lz, base.b.cara_d, "media", rnd)
    for arriba, izq in paredes:
        sombrear(lz, arriba, "profunda", rnd, DIR_I)
        sombrear(lz, izq, "profunda", rnd, DIR_V)
    for alto_v, alfa in ((10, 18), (5, 22), (2.4, 30)):
        lz.velo(m.ri(0, m.RW, m.z0, m.z0 + alto_v), C["polvo"] + (alfa,))
        lz.velo(m.rd(0, m.RD, m.z0, m.z0 + alto_v), C["polvo"] + (alfa,))
    lz.velo(base.b.tapa, C["polvo_cl"] + (60,))
    polvo(lz, m.cara_i, None, rnd, 0.22, color=mezcla(C["frente"], C["polvo"], 0.5))
    polvo(lz, m.cara_d, None, rnd, 0.2, color=mezcla(C["lateral"], C["polvo"], 0.45))
    polvo(lz, base.b.tapa, None, rnd, 0.6, color=mezcla(C["bancada"], C["polvo_cl"], 0.5))
    if rayas:
        for borde in ((m.fi(0, m.z0), m.fi(0, m.z1)), (m.fi(m.RW, m.z0), m.fi(m.RW, m.z1)), (m.fi(0, m.z1), m.fi(m.RW, m.z1))):
            rayones(lz, borde, rnd, 7)


def tinta_prota(lz, m, base, rnd, interiores=()):
    """Capa 8: silueta gruesa (1,5) con presión contenida y aristas interiores finas (0,6)."""
    C, P = CDRA, m.P
    cc, cr, SW, SD, ZS = base.cc, base.cr, base.SW, base.SD, base.ZS
    silueta = [P(cc - SW / 2, cr + SD / 2, 1.2), P(cc + SW / 2, cr + SD / 2, 1.2), P(cc + SW / 2, cr - SD / 2, 1.2),
               P(cc + SW / 2, cr - SD / 2, ZS), m.ft(m.RW, 0, ZS), m.ft(m.RW, 0), m.ft(0, 0), m.ft(0, m.RD),
               m.fi(0, ZS), P(cc - SW / 2, cr + SD / 2, ZS), P(cc - SW / 2, cr + SD / 2, 1.2)]
    trazo(lz, silueta, 1.5, C["tinta"], rnd, presion=0.12)
    for linea in ([m.fi(m.RW, m.z0), m.fi(m.RW, m.z1)], [m.fi(0, m.z1), m.fi(m.RW, m.z1), m.ft(m.RW, 0)],
                  [P(cc - SW / 2, cr + SD / 2, ZS), P(cc + SW / 2, cr + SD / 2, ZS), P(cc + SW / 2, cr - SD / 2, ZS)],
                  [m.fi(0, m.z0), m.fi(m.RW, m.z0), m.fd(0, m.z0)]) + tuple(interiores):
        trazo(lz, linea, 0.6, C["tinta"], rnd)


def cable_al_suelo(lz, m, v, z, color, grosor=3.0, sale=0.0):
    """Cable o tubo que sale de la cara lateral y entra al suelo por un pasamuros."""
    C = CDRA
    pts = [m.fd(v, z, sale), m.fd(v + 0.02, z * 0.45, sale + 0.1), m.fd(v + 0.04, 0, sale + 0.24)]
    lz.linea(pts, C["tinta"], grosor + 1.4)
    lz.linea(pts, color, grosor)
    lz.linea([(x - 0.7, y - 0.4) for x, y in pts], mezcla(color, (255, 255, 255), 0.35), max(0.4, grosor * 0.2))
    x, y = pts[-1]
    lz.elipse(x - 2.6, y - 1.3, x + 2.6, y + 1.3, fill=C["bancada_lat"], outline=C["tinta"], ancho=0.5)


# ---------- Energía: armario de 3 módulos de baterías de litio (como los ORU de la Estación) ----------
def armario_baterias(lz, P, c, r, w, h, cuadro=None):
    M, C, E = MEDIDAS["baterias"], CDRA, EXTRA
    rnd = random.Random(2000 + c * 37 + r * 101)
    RW, RD = M["ancho"] / CASILLA_M, M["fondo"] / CASILLA_M
    cc, cr = c + 0.5, r + 0.46
    ZS = 0.12 * PX_M
    m = Marco(P, cc, cr, RW, RD, ZS, ZS + M["alto"] * PX_M)
    mods = [(ZS + 3.0 + k * 12.6, ZS + 3.0 + k * 12.6 + 11.8) for k in range(3)]   # módulos de 0,53 m
    niveles = (5, 4, 3)                                            # segmentos de carga de 5 (el de abajo, cargando)
    if cuadro is not None:                                         # ---- solo lo que se mueve ----
        for k, (z0, z1) in enumerate(mods):
            zc = (z0 + z1) / 2
            n = niveles[k] + (1 if (k == 2 and cuadro in (1, 2)) else 0)
            for s_ in range(5):
                if s_ < n:
                    col = E["energia"] if k == 2 and s_ == n - 1 and cuadro in (1, 2) else C["led_v"]
                    lz.poli(m.ri(RW * (0.25 + s_ * 0.068), RW * (0.305 + s_ * 0.068), zc - 1.6, zc + 1.6), fill=col)
            x, y = m.fi(RW * 0.82, z1 - 2.2)
            on = (cuadro % 2 == 0) if k == 2 else True
            lz.elipse(x - 0.55, y - 0.55, x + 0.55, y + 0.55, fill=(E["energia"] if k == 2 else C["led_v"]) if on else C["rebaje_fondo"])
        return
    base = base_prota(lz, P, cc, cr, M["ancho"], M["fondo"])
    lz.poli(m.cara_i, fill=C["frente"])
    lz.poli(m.cara_d, fill=C["lateral"])
    lz.poli(m.tapa, fill=C["tapa"])
    material_prota(lz, m, rnd)
    paredes = []
    lz.poli(m.ri(0, RW, ZS, ZS + 2.2), fill=mezcla(C["frente"], C["tinta"], 0.3))
    for k, (z0, z1) in enumerate(mods):
        paredes.append(rebaje_prota(lz, m, 0.03, RW - 0.03, z0, z1, C["rebaje_fondo"], 0.6))
        placa = m.ri(0.06, RW - 0.06, z0 + 0.9, z1 - 0.6)                  # frente del módulo
        lz.poli(placa, fill=mezcla(C["frente"], (255, 255, 255), 0.12))
        lz.velo(m.ri(0.06, RW - 0.06, z0 + 0.9, z0 + 3.5), C["tinta"] + (30,))
        zc = (z0 + z1) / 2
        lz.poli(m.ri(RW * 0.22, RW * 0.6, zc - 2.4, zc + 2.4), fill=C["pantalla"], outline=C["tinta"], ancho=0.3)   # indicador de carga
        for s_ in range(5):
            lz.poli(m.ri(RW * (0.25 + s_ * 0.068), RW * (0.305 + s_ * 0.068), zc - 1.6, zc + 1.6), fill=mezcla(C["led_v"], C["pantalla"], 0.75))
        lz.poli(m.ri(RW * 0.6, RW * 0.625, zc - 0.8, zc + 0.8), fill=C["metal"])                          # borne del icono de pila
        x, y = m.fi(RW * 0.72, zc - 1.0)                                                                  # conector de potencia
        lz.elipse(x - 1.6, y - 1.6, x + 1.6, y + 1.6, fill=C["rejilla"], outline=C["tinta"], ancho=0.35)
        for a in range(0, 360, 90):
            lz.elipse(x + math.cos(math.radians(a)) * 0.8 - 0.25, y + math.sin(math.radians(a)) * 0.8 - 0.25,
                      x + math.cos(math.radians(a)) * 0.8 + 0.25, y + math.sin(math.radians(a)) * 0.8 + 0.25, fill=C["metal"])
        x, y = m.fi(RW * 0.82, z1 - 2.2)
        lz.elipse(x - 0.7, y - 0.7, x + 0.7, y + 0.7, fill=C["rejilla"])
        for u in (0.085, RW - 0.085):                                     # asas grandes, como las de los ORU
            a_, b_ = m.fi(u, z0 + 2.4), m.fi(u, z1 - 2.0)
            a2, b2 = m.fi(u, z0 + 2.4, 0.03), m.fi(u, z1 - 2.0, 0.03)
            lz.linea([a_, a2, b2, b_], C["tinta"], 1.1)
            lz.linea([a_, a2, b2, b_], C["metal"], 0.7)
            rayones(lz, (a2, b2), rnd, 2)
        for u in (0.05, RW - 0.05):                                        # tornillos de fijación
            for z in (z0 + 1.6, z1 - 1.2):
                x, y = m.fi(u, z)
                lz.elipse(x - 0.4, y - 0.4, x + 0.4, y + 0.4, fill=mezcla(C["frente"], C["tinta"], 0.5))
    # cara lateral: lamas de refrigeración, ventilador, aviso de alto voltaje, caja de bornes y cables
    for k in range(10):
        z = ZS + 24 + k * 1.5
        lz.linea([m.fd(RD * 0.1, z), m.fd(RD * 0.9, z)], C["rejilla"], 0.5)
        lz.linea([m.fd(RD * 0.1, z - 0.45), m.fd(RD * 0.9, z - 0.45)], mezcla(C["lateral"], (255, 255, 255), 0.18), 0.25)
    lz.poli(m.elipse_d(RD * 0.5, ZS + 12, RD * 0.22, 5.2), fill=C["rejilla"], outline=C["tinta"], ancho=0.4)
    for f in (0.45, 0.8):
        lz.poli(m.elipse_d(RD * 0.5, ZS + 12, RD * 0.22 * f, 5.2 * f), outline=mezcla(C["rejilla"], C["metal"], 0.35), ancho=0.25)
    x, y = m.fd(RD * 0.2, ZS + 21)
    lz.poli([(x - 1.8, y + 1.4), (x, y - 1.8), (x + 1.8, y + 1.4)], fill=E["energia"], outline=C["tinta"], ancho=0.25)
    lz.linea([(x + 0.2, y - 0.9), (x - 0.5, y + 0.2), (x + 0.4, y + 0.1), (x - 0.2, y + 1.0)], C["tinta"], 0.3)
    caja(lz, P, m.c0 + RW, m.r0 + RD * 0.62, 0.04, RD * 0.3, ZS + 4, ZS + 9, (70, 64, 52), (60, 54, 44), (44, 40, 34), 0.5, remate=False)
    for v in (RD * 0.68, RD * 0.82):
        cable_al_suelo(lz, m, v, ZS + 5, (70, 64, 52), 2.4, 0.04)
    # tapa: cáncamos y la tapa de la bandeja de cables
    lz.poli(m.rt(RW * 0.2, RW * 0.8, RD * 0.3, RD * 0.7), fill=mezcla(C["tapa"], C["tinta"], 0.2))
    for u, v in ((RW * 0.1, RD * 0.12), (RW * 0.9, RD * 0.88)):
        x, y = m.ft(u, v, m.z1 + 0.6)
        lz.elipse(x - 0.8, y - 0.6, x + 0.8, y + 0.6, outline=C["metal"], ancho=0.35)
    desgaste_prota(lz, m, base, rnd, paredes)
    tinta_prota(lz, m, base, rnd, [m.ri(0.03, RW - 0.03, z0, z1) + [m.fi(0.03, z0)] for z0, z1 in mods])


# ---------- Mando: consola de mando sentado, con 2 pantallas y los 3 mandos del reparto de energía ----------
def consola_mando(lz, P, c, r, w, h, cuadro=None):
    M, C, E = MEDIDAS["consola"], CDRA, EXTRA
    rnd = random.Random(3000 + c * 37 + r * 101)
    RW, RD = M["ancho"] / CASILLA_M, M["fondo"] / CASILLA_M
    cc, cr = c + 0.5, r + 0.46
    ZS = 0.12 * PX_M
    ZM = ZS + 0.75 * PX_M                       # altura de la mesa: 0,75 m
    ZT = ZS + M["alto"] * PX_M                  # arriba de las pantallas: 1,5 m
    torre = Marco(P, cc, cr - RD * 0.35, RW, RD * 0.3, ZS, ZT)          # puente de pantallas, detrás
    mueble = Marco(P, cc, cr + RD * 0.15, RW, RD * 0.7, ZS, ZM)        # mueble bajo, delante
    pantallas = [(0.05, RW / 2 - 0.02), (RW / 2 + 0.02, RW - 0.05)]
    zp0, zp1 = ZM + 6.0, ZT - 1.6
    if cuadro is not None:                      # ---- pantallas que se actualizan y un botón que parpadea ----
        u0, u1 = pantallas[0]
        for k, col in enumerate((E["energia"], C["azul"], E["blindaje"])):          # reparto de energía en barras
            alto_b = (0.55, 0.3, 0.15)[k] + 0.08 * math.sin(cuadro * math.pi / 2 + k)
            ub = u0 + 0.03 + k * (u1 - u0 - 0.06) / 3
            lz.poli(torre.ri(ub, ub + (u1 - u0 - 0.06) / 3 - 0.012, zp0 + 1.2, zp0 + 1.2 + (zp1 - zp0 - 3) * alto_b, ), fill=col)
        u0, u1 = pantallas[1]                                                       # órbita: la nave avanza
        cu, cz = (u0 + u1) / 2, (zp0 + zp1) / 2
        a = cuadro * math.pi / 2
        x, y = torre.fi(cu + (u1 - u0) * 0.36 * math.cos(a), cz + (zp1 - zp0) * 0.32 * math.sin(a))
        lz.elipse(x - 0.55, y - 0.55, x + 0.55, y + 0.55, fill=(246, 244, 250))
        x, y = mueble.ft(RW * 0.86, RD * 0.7 * 0.7, ZM + 1.2)
        lz.elipse(x - 0.6, y - 0.4, x + 0.6, y + 0.4, fill=(236, 90, 70) if cuadro % 2 == 0 else (110, 40, 40))
        return
    base = base_prota(lz, P, cc, cr, M["ancho"], M["fondo"])
    # puente de pantallas (lo de atrás se pinta primero)
    lz.poli(torre.cara_i, fill=C["lateral"])
    lz.poli(torre.cara_d, fill=mezcla(C["lateral"], C["tinta"], 0.2))
    lz.poli(torre.tapa, fill=C["tapa"])
    for u0, u1 in pantallas:
        lz.poli(torre.ri(u0, u1, zp0, zp1), fill=C["rejilla"], outline=C["tinta"], ancho=0.4)          # marco del monitor
        lz.poli(torre.ri(u0 + 0.012, u1 - 0.012, zp0 + 0.8, zp1 - 0.8), fill=C["pantalla"])
    u0, u1 = pantallas[0]
    lz.texto(*torre.fi((u0 + u1) / 2, zp1 - 1.6), "ENERGÍA", 1.3, C["texto"])
    u0, u1 = pantallas[1]
    cu, cz = (u0 + u1) / 2, (zp0 + zp1) / 2
    orb = [torre.fi(cu + (u1 - u0) * 0.36 * math.cos(t), cz + (zp1 - zp0) * 0.32 * math.sin(t)) for t in np.linspace(0, math.tau, 30)]
    lz.linea(orb, mezcla(E["rosa"], C["pantalla"], 0.3), 0.3)
    x, y = torre.fi(cu, cz)
    lz.elipse(x - 1.4, y - 1.4, x + 1.4, y + 1.4, fill=(214, 110, 70))                               # Marte
    lz.velo(torre.ri(0.05, RW - 0.05, zp1 - 3.5, zp1 - 0.8), (255, 255, 255, 18))                  # reflejo del cristal
    lz.linea([torre.fi(RW * 0.5, ZT), torre.fi(RW * 0.5, ZT + 0.6)], C["tinta"], 0.4)
    # mueble bajo
    lz.poli(mueble.cara_i, fill=C["frente"])
    lz.poli(mueble.cara_d, fill=C["lateral"])
    material_prota(lz, mueble, rnd)
    lz.poli(mueble.ri(0, RW, ZS, ZS + 2.0), fill=mezcla(C["frente"], C["tinta"], 0.3))            # zócalo
    paredes = []
    for u0, u1 in ((0.04, RW / 2 - 0.015), (RW / 2 + 0.015, RW - 0.04)):                             # dos puertas con rejilla
        lz.poli(mueble.ri(u0, u1, ZS + 2.6, ZM - 1.2), outline=mezcla(C["frente"], C["tinta"], 0.5), ancho=0.35)
        for k in range(4):
            z = ZS + 8 + k * 1.3
            lz.linea([mueble.fi(u0 + 0.03, z), mueble.fi(u1 - 0.03, z)], C["rejilla"], 0.4)
        x, y = mueble.fi(u1 - 0.035 if u0 < RW / 3 else u0 + 0.035, ZS + 13.5)
        lz.linea([(x, y - 1.2), (x, y + 1.2)], C["metal"], 0.6)
    # tablero inclinado: de 0,75 m delante a 0,95 m detrás
    tb = [mueble.fi(0, ZM), mueble.fi(RW, ZM), mueble.ft(RW, 0, ZM + 4.5), mueble.ft(0, 0, ZM + 4.5)]
    lz.poli(tb, fill=C["pantalla"], outline=C["tinta"], ancho=0.5)
    lz.poli([mueble.fd(0, ZM + 4.5), mueble.fd(mueble.RD, ZM), mueble.fd(mueble.RD, ZM - 0.01 + 0.0), mueble.fd(0, ZM)], fill=C["lateral"])
    tpt = lambda u, v, dz=0: mueble.ft(u, v, ZM + 4.5 * (1 - v / mueble.RD) + dz)
    for k, col in enumerate((E["energia"], C["azul"], E["blindaje"])):          # 3 mandos deslizantes: el reparto de energía
        u = RW * (0.12 + k * 0.1)
        lz.linea([tpt(u, mueble.RD * 0.2), tpt(u, mueble.RD * 0.8)], mezcla(col, C["pantalla"], 0.4), 0.7)
        v = mueble.RD * (0.3 + (0.4, 0.25, 0.15)[k])
        x, y = tpt(u, v, 0.5)
        lz.poli([(x - 1.2, y - 0.6), (x + 1.2, y - 0.6), (x + 1.2, y + 0.6), (x - 1.2, y + 0.6)], fill=col, outline=C["tinta"], ancho=0.3)
    for k in range(4):                                                          # fila de botones
        x, y = tpt(RW * (0.5 + k * 0.08), mueble.RD * 0.35, 0.3)
        lz.elipse(x - 0.7, y - 0.45, x + 0.7, y + 0.45, fill=(C["led_v"], E["energia"], C["led_v"], C["azul"])[k], outline=C["tinta"], ancho=0.2)
    teclado = [tpt(RW * 0.48, mueble.RD * 0.55), tpt(RW * 0.78, mueble.RD * 0.55), tpt(RW * 0.78, mueble.RD * 0.85), tpt(RW * 0.48, mueble.RD * 0.85)]
    lz.poli(teclado, fill=C["rebaje"], outline=C["tinta"], ancho=0.25)
    for k in range(3):
        lz.linea([tpt(RW * 0.49, mueble.RD * (0.62 + k * 0.08)), tpt(RW * 0.77, mueble.RD * (0.62 + k * 0.08))], C["rejilla"], 0.25)
    x, y = mueble.ft(RW * 0.86, mueble.RD * 0.7, ZM + 1.2)                     # botón de alarma con su tapa
    lz.elipse(x - 1.2, y - 0.8, x + 1.2, y + 0.8, fill=C["rejilla"], outline=C["tinta"], ancho=0.3)
    lz.elipse(x - 0.6, y - 0.4, x + 0.6, y + 0.4, fill=(150, 50, 50))
    for k in range(5):                                                          # lamas en el lateral del mueble
        z = ZS + 6 + k * 1.6
        lz.linea([mueble.fd(mueble.RD * 0.15, z), mueble.fd(mueble.RD * 0.85, z)], C["rejilla"], 0.45)
    cable_al_suelo(lz, mueble, mueble.RD * 0.5, ZS + 4, C["tubo_osc"], 2.0, 0.0)
    desgaste_prota(lz, mueble, base, rnd, paredes)
    sombrear(lz, torre.cara_d, "media", rnd)
    sombrear(lz, torre.ri(0, RW, ZS, zp0 - 0.4), "suave", rnd, DIR_I)        # lo bajo del puente queda en sombra
    # tinta: silueta del conjunto (bancada + puente + mueble)
    cc_, cr_, SW, SD = base.cc, base.cr, base.SW, base.SD
    silueta = [P(cc_ - SW / 2, cr_ + SD / 2, 1.2), P(cc_ + SW / 2, cr_ + SD / 2, 1.2), P(cc_ + SW / 2, cr_ - SD / 2, 1.2),
               P(cc_ + SW / 2, cr_ - SD / 2, ZS), torre.ft(RW, 0, ZS), torre.ft(RW, 0), torre.ft(0, 0), torre.ft(0, torre.RD),
               torre.fi(0, ZM + 4.5), mueble.fi(0, ZM), mueble.fi(0, ZS), P(cc_ - SW / 2, cr_ + SD / 2, ZS), P(cc_ - SW / 2, cr_ + SD / 2, 1.2)]
    trazo(lz, silueta, 1.5, C["tinta"], rnd, presion=0.12)
    for linea in ([torre.fi(0, ZT), torre.fi(RW, ZT), torre.ft(RW, 0)], [torre.fi(RW, ZM + 4.5), torre.fi(RW, ZT)],
                  [mueble.fi(RW, ZS), mueble.fi(RW, ZM)], [mueble.fi(0, ZM), mueble.fi(RW, ZM), mueble.ft(RW, 0, ZM + 4.5)],
                  [P(cc_ - SW / 2, cr_ + SD / 2, ZS), P(cc_ + SW / 2, cr_ + SD / 2, ZS), P(cc_ + SW / 2, cr_ - SD / 2, ZS)]):
        trazo(lz, linea, 0.6, C["tinta"], rnd)


# ---------- Comunicaciones: armario de servidores de 42U (2,0 × 0,6 × 1,0 m) con puerta de cristal ----------
def armario_servidores(lz, P, c, r, w, h, cuadro=None):
    M, C, E = MEDIDAS["servidores"], CDRA, EXTRA
    rnd = random.Random(4000 + c * 37 + r * 101)
    RW, RD = M["ancho"] / CASILLA_M, M["fondo"] / CASILLA_M
    cc, cr = c + 0.5, r + 0.46
    ZS = 0.12 * PX_M
    m = Marco(P, cc, cr, RW, RD, ZS, ZS + M["alto"] * PX_M)
    ranuras = [(ZS + 4.0 + k * 4.9, ZS + 4.0 + k * 4.9 + 4.2) for k in range(8)]       # 8 servidores de 2U
    if cuadro is not None:                      # ---- luces de actividad de red ----
        ra = random.Random(77 + cuadro + c * 7 + r * 13)
        for z0, z1 in ranuras:
            for j in range(3):
                if ra.random() < 0.6:
                    x, y = m.fi(RW * (0.66 + j * 0.08), (z0 + z1) / 2)
                    col = E["comms"] if j < 2 else E["energia"]
                    lz.elipse(x - 0.45, y - 0.45, x + 0.45, y + 0.45, fill=col)
        return
    base = base_prota(lz, P, cc, cr, M["ancho"], M["fondo"])
    lz.poli(m.cara_i, fill=C["frente"])
    lz.poli(m.cara_d, fill=mezcla(C["lateral"], C["tinta"], 0.35))
    lz.poli(m.tapa, fill=mezcla(C["tapa"], C["tinta"], 0.1))
    material_prota(lz, m, rnd)
    paredes = [rebaje_prota(lz, m, 0.025, RW - 0.025, ZS + 3.0, m.z1 - 3.0, (26, 22, 52), 0.5)]
    for z0, z1 in ranuras:                                                       # servidores tras el cristal
        lz.poli(m.ri(0.045, RW - 0.045, z0, z1), fill=(52, 46, 100), outline=C["tinta"], ancho=0.25)
        for j in range(4):                                                       # bahías de disco
            u = 0.06 + j * (RW - 0.24) / 4
            lz.poli(m.ri(u, u + (RW - 0.24) / 4 - 0.008, z0 + 0.8, z1 - 0.8), fill=(36, 32, 76))
            lz.linea([m.fi(u + 0.004, z0 + 1.4), m.fi(u + (RW - 0.24) / 4 - 0.012, z0 + 1.4)], (90, 84, 150), 0.25)
        for j in range(3):
            x, y = m.fi(RW * (0.66 + j * 0.08), (z0 + z1) / 2)
            lz.elipse(x - 0.45, y - 0.45, x + 0.45, y + 0.45, fill=C["rejilla"])
    lz.poli(m.ri(0.045, RW - 0.045, ranuras[-1][1] + 0.6, m.z1 - 3.4), fill=C["rejilla"])          # panel de parcheo
    for j in range(8):
        x, y = m.fi(0.06 + j * (RW - 0.12) / 8, ranuras[-1][1] + 1.6)
        lz.elipse(x - 0.35, y - 0.3, x + 0.35, y + 0.3, fill=(E["comms"], E["energia"], C["azul"], E["rosa"])[j % 4])
    # puerta de cristal: reflejos en diagonal y marco
    lz.velo(m.ri(0.025, RW - 0.025, ZS + 3.0, m.z1 - 3.0), E["vidrio"] + (78,))       # el cristal refleja la luz de la sala
    for f0, f1, alfa in ((0.15, 0.4, 46), (0.5, 0.62, 40), (0.72, 0.78, 30)):              # reflejos en diagonal
        lz.velo([m.fi(RW * f0, ZS + 3.2), m.fi(RW * f1, ZS + 3.2), m.fi(RW * (f1 - 0.25), m.z1 - 3.2), m.fi(RW * (f0 - 0.25), m.z1 - 3.2)],
                (255, 255, 255, alfa))
    lz.poli(m.ri(0.0, RW, ZS, ZS + 3.0), fill=C["frente"])
    lz.poli(m.ri(0.0, RW, m.z1 - 3.0, m.z1), fill=C["frente"])
    for u0, u1 in ((0.0, 0.025), (RW - 0.025, RW)):                                        # montantes del marco
        lz.poli(m.ri(u0, u1, ZS + 3.0, m.z1 - 3.0), fill=C["frente"])
    x0, y0 = m.fi(RW - 0.012, ZS + 20)                                           # tirador
    lz.linea([(x0, y0 - 3), (x0, y0 + 3)], C["metal"], 0.8)
    lz.elipse(x0 - 0.6, y0 - 0.6, x0 + 0.6, y0 + 0.6, fill=C["metal"])
    # lateral: costura, perforado de ventilación abajo, etiqueta del armario
    lz.linea([m.fd(RD * 0.5, ZS + 2), m.fd(RD * 0.5, m.z1 - 2)], mezcla(C["lateral"], C["tinta"], 0.45), 0.45)
    for i in range(10):
        for j in range(3):
            x, y = m.fd(RD * (0.1 + i * 0.08), ZS + 3 + j * 1.4)
            lz.elipse(x - 0.25, y - 0.25, x + 0.25, y + 0.25, fill=C["rejilla"])
    lz.poli(m.rd(RD * 0.62, RD * 0.88, m.z1 - 9, m.z1 - 6), fill=E["energia"] if False else C["etiqueta"], outline=C["tinta"], ancho=0.25)
    x, y = m.fd(RD * 0.75, m.z1 - 7.5)
    for k in range(3):                                                           # pictograma de ondas de radio
        lz.d.arc([(x - 0.6 - k * 0.7) * K, (y - 0.6 - k * 0.7) * K, (x + 0.6 + k * 0.7) * K, (y + 0.6 + k * 0.7) * K], 300, 60,
                 fill=C["tinta"], width=max(1, int(0.25 * K)))
    # tapa: bandeja de ventiladores
    for u, v in ((RW * 0.5, RD * 0.3), (RW * 0.5, RD * 0.7)):
        cx_, cy_ = m.ft(u, v)
        lz.elipse(cx_ - 2.6, cy_ - 1.4, cx_ + 2.6, cy_ + 1.4, fill=C["rejilla"], outline=C["tinta"], ancho=0.3)
        lz.linea([(cx_ - 2.0, cy_), (cx_ + 2.0, cy_)], mezcla(C["rejilla"], C["metal"], 0.3), 0.25)
        lz.linea([(cx_, cy_ - 1.1), (cx_, cy_ + 1.1)], mezcla(C["rejilla"], C["metal"], 0.3), 0.25)
    for v in (RD * 0.25, RD * 0.32, RD * 0.39):
        cable_al_suelo(lz, m, v, ZS + 3, mezcla(E["comms"], C["tinta"], 0.45), 1.2, 0.0)
    desgaste_prota(lz, m, base, rnd, paredes)
    tinta_prota(lz, m, base, rnd, [m.ri(0.025, RW - 0.025, ZS + 3.0, m.z1 - 3.0) + [m.fi(0.025, ZS + 3.0)]])


# ---------- Refugio: tanque de agua de blindaje (Ø 0,9 m, 1,8 m: unos 1100 L) ----------
def tanque_agua(lz, P, c, r, w, h, cuadro=None):
    M, C, E = MEDIDAS["tanque"], CDRA, EXTRA
    rnd = random.Random(5000 + c * 37 + r * 101)
    cc, cr = c + 0.5, r + 0.46
    ZS = 0.12 * PX_M
    ZT = ZS + M["alto"] * PX_M
    R = M["ancho"] / 2 / CASILLA_M
    x, y = P(cc, cr)
    ax, ay = R * TW / math.sqrt(2), R * TH / math.sqrt(2)
    nivel = 0.75
    mirilla_x = x - ax * 0.5
    mirilla_y = lambda z: y + ay * 0.86 - z
    zv0, zv1 = ZS + 4, ZT - 4
    banda = lambda z0, z1, f0=-1.0, f1=1.0: ([(x + ax * t, y + ay * math.sqrt(max(0, 1 - t * t)) - z0) for t in np.linspace(f0, f1, 24)] +
                                             [(x + ax * t, y + ay * math.sqrt(max(0, 1 - t * t)) - z1) for t in np.linspace(f1, f0, 24)])
    if cuadro is not None:                      # ---- burbujas que suben por la mirilla ----
        zn = zv0 + (zv1 - zv0) * nivel
        for k in range(2):
            zb = zv0 + 2 + ((cuadro + k * 2) % 4) / 4 * (zn - zv0 - 4)
            lz.elipse(mirilla_x - 0.35, mirilla_y(zb) - 0.35, mirilla_x + 0.35, mirilla_y(zb) + 0.35, fill=E["agua_l"])
        lz.linea([(mirilla_x - 0.6, mirilla_y(zn) + 0.15 * math.sin(cuadro * 1.6)), (mirilla_x + 0.6, mirilla_y(zn) - 0.15 * math.sin(cuadro * 1.6))],
                 (246, 250, 255), 0.35)
        return
    base = base_prota(lz, P, cc, cr, M["ancho"], M["fondo"])
    # cuerpo: cilindro con bandas de luz (reflejo a la izquierda, sombra a la derecha)
    lz.poli(banda(ZS, ZT), fill=E["agua_m"])
    for f0, f1, col, alfa in ((-0.85, -0.55, (255, 255, 255), 50), (-0.55, -0.42, (255, 255, 255), 80), (0.1, 0.45, E["agua_s"], 160),
                              (0.45, 1.0, mezcla(E["agua_s"], C["tinta"], 0.4), 190)):
        lz.velo(banda(ZS + 0.5, ZT - 0.2, f0, f1), tuple(col) + (alfa,))
    sombra_cil = banda(ZS + 0.5, ZT - 0.5, 0.25, 0.98)
    for z0, z1 in ((ZS + 4.5, ZS + 6.2), (ZS + 20, ZS + 21.7), (ZT - 6.2, ZT - 4.5)):    # 3 flejes
        lz.poli(banda(z0, z1), fill=mezcla(E["agua_s"], C["metal"], 0.35))
        lz.poli(banda(z0, z0 + 0.5), fill=mezcla(E["agua_s"], C["tinta"], 0.3))
        for t in np.linspace(-0.8, 0.8, 5):                                              # remaches del fleje
            px_, py_ = x + ax * t, y + ay * math.sqrt(1 - t * t) - (z0 + z1) / 2
            lz.elipse(px_ - 0.3, py_ - 0.3, px_ + 0.3, py_ + 0.3, fill=C["metal"])
    # placa H2O y pictograma de blindaje
    pl = banda(ZS + 26, ZS + 31.5, -0.22, 0.28)
    lz.poli(pl, fill=C["etiqueta"], outline=C["tinta"], ancho=0.25)
    lz.texto(x + ax * 0.03, y + ay - ZS - 28.8, "H₂O", 1.6, C["tinta"])
    sx, sy = x + ax * 0.12, y + ay * 0.99 - ZS - 12
    escudo = [(sx - 2.0, sy - 2.2), (sx, sy - 2.8), (sx + 2.0, sy - 2.2), (sx + 1.8, sy + 0.6), (sx, sy + 2.6), (sx - 1.8, sy + 0.6)]
    lz.poli(escudo, fill=E["blindaje"], outline=C["tinta"], ancho=0.3)
    lz.linea([(sx, sy - 2.4), (sx, sy + 2.1)], mezcla(E["blindaje"], (255, 255, 255), 0.5), 0.35)
    # mirilla de nivel con graduación
    lz.poli([(mirilla_x - 0.9, mirilla_y(zv0)), (mirilla_x + 0.9, mirilla_y(zv0)), (mirilla_x + 0.9, mirilla_y(zv1)), (mirilla_x - 0.9, mirilla_y(zv1))],
            fill=C["metal"], outline=C["tinta"], ancho=0.3)
    zn = zv0 + (zv1 - zv0) * nivel
    lz.poli([(mirilla_x - 0.5, mirilla_y(zv0 + 0.6)), (mirilla_x + 0.5, mirilla_y(zv0 + 0.6)), (mirilla_x + 0.5, mirilla_y(zv1 - 0.6)), (mirilla_x - 0.5, mirilla_y(zv1 - 0.6))],
            fill=E["vidrio"])
    lz.poli([(mirilla_x - 0.5, mirilla_y(zv0 + 0.6)), (mirilla_x + 0.5, mirilla_y(zv0 + 0.6)), (mirilla_x + 0.5, mirilla_y(zn)), (mirilla_x - 0.5, mirilla_y(zn))],
            fill=E["agua"])
    for k in range(5):
        zg = zv0 + (zv1 - zv0) * (k + 0.5) / 5
        lz.linea([(mirilla_x + 0.9, mirilla_y(zg)), (mirilla_x + 1.6, mirilla_y(zg) + 0.2)], C["tinta"], 0.25)
    # válvula con volante rojo y tubo de salida al suelo
    vx, vy = x + ax * 0.55, y + ay * 0.83 - (ZS + 6.5)
    lz.linea([(vx, vy), (vx + 3.4, vy + 1.2)], C["tinta"], 2.0)
    lz.linea([(vx, vy), (vx + 3.4, vy + 1.2)], C["metal"], 1.4)
    lz.elipse(vx + 2.0, vy - 2.4, vx + 4.0, vy - 0.2, outline=E["rojo"], ancho=0.5)
    lz.linea([(vx + 3.0, vy - 2.4), (vx + 3.0, vy - 0.2)], E["rojo"], 0.35)
    tubo = [(vx + 3.4, vy + 1.2), (vx + 5.0, vy + 2.2), (vx + 5.2, y + ay * 0.55 - ZS + 0.6)]
    lz.linea(tubo, C["tinta"], 2.2)
    lz.linea(tubo, C["metal"], 1.5)
    lz.elipse(tubo[-1][0] - 2.4, tubo[-1][1] - 1.2, tubo[-1][0] + 2.4, tubo[-1][1] + 1.2, fill=C["bancada_lat"], outline=C["tinta"], ancho=0.5)
    # tapa: brida con pernos, boca de hombre y respiradero
    lz.elipse(x - ax, y - ZT - ay, x + ax, y - ZT + ay, fill=E["agua"])
    lz.elipse(x - ax * 0.86, y - ZT - ay * 0.86, x + ax * 0.86, y - ZT + ay * 0.86, fill=mezcla(E["agua"], (255, 255, 255), 0.15))
    for t in np.linspace(0, math.tau, 14, endpoint=False):
        bx_, by_ = x + ax * 0.93 * math.cos(t), y - ZT + ay * 0.93 * math.sin(t)
        lz.elipse(bx_ - 0.3, by_ - 0.22, bx_ + 0.3, by_ + 0.22, fill=C["metal"])
    lz.elipse(x - ax * 0.38, y - ZT - ay * 0.38, x + ax * 0.38, y - ZT + ay * 0.38, fill=E["agua_m"], outline=C["tinta"], ancho=0.35)
    lz.linea([(x - ax * 0.2, y - ZT - 0.6), (x + ax * 0.2, y - ZT - 0.6)], C["metal"], 0.5)
    lz.linea([(x + ax * 0.5, y - ZT + ay * 0.2), (x + ax * 0.5, y - ZT + ay * 0.2 - 2.2)], C["tinta"], 1.0)
    lz.d.arc([(x - ax * 0.75) * K, (y - ZT - ay * 0.75) * K, (x + ax * 0.75) * K, (y - ZT + ay * 0.75) * K], 160, 250,
             fill=(255, 255, 255), width=max(1, int(0.6 * K)))
    # desgaste: trama vertical en la parte en sombra (grabado de cilindro), polvo abajo, rayones en los flejes
    sombrear(lz, sombra_cil, "media", rnd, DIR_V, color=mezcla(C["tinta"], E["agua_s"], 0.3))
    sombrear(lz, base.b.cara_d, "media", rnd)
    for alto_v, alfa in ((10, 18), (5, 22), (2.4, 30)):
        lz.velo(banda(ZS, ZS + alto_v), C["polvo"] + (alfa,))
    lz.velo(base.b.tapa, C["polvo_cl"] + (60,))
    polvo(lz, banda(ZS, ZT), None, rnd, 0.22, color=mezcla(E["agua_m"], C["polvo"], 0.5))
    polvo(lz, base.b.tapa, None, rnd, 0.6, color=mezcla(C["bancada"], C["polvo_cl"], 0.5))
    for z in (ZS + 6.2, ZS + 21.7, ZT - 4.5):
        rayones(lz, ((x - ax * 0.8, y + ay * 0.6 - z), (x + ax * 0.2, y + ay * 0.98 - z)), rnd, 3)
    # tinta: silueta del tanque sobre la bancada
    cc_, cr_, SW, SD = base.cc, base.cr, base.SW, base.SD
    sil_base = [P(cc_ - SW / 2, cr_ + SD / 2, ZS), P(cc_ - SW / 2, cr_ + SD / 2, 1.2), P(cc_ + SW / 2, cr_ + SD / 2, 1.2),
                P(cc_ + SW / 2, cr_ - SD / 2, 1.2), P(cc_ + SW / 2, cr_ - SD / 2, ZS)]
    trazo(lz, sil_base, 1.5, C["tinta"], rnd, presion=0.12)
    trazo(lz, [P(cc_ - SW / 2, cr_ + SD / 2, ZS), P(cc_ + SW / 2, cr_ + SD / 2, ZS), P(cc_ + SW / 2, cr_ - SD / 2, ZS)], 0.6, C["tinta"], rnd)
    contorno = [(x - ax, y - ZT)] + [(x - ax, y - ZS)] + [(x + ax * t, y + ay * math.sqrt(max(0, 1 - t * t)) - ZS) for t in np.linspace(-1, 1, 24)] + \
               [(x + ax, y - ZT)] + [(x + ax * math.cos(t), y - ZT + ay * math.sin(t)) for t in np.linspace(0, -math.pi, 24)]
    trazo(lz, contorno, 1.5, C["tinta"], rnd, presion=0.12)
    trazo(lz, [(x + ax * math.cos(t), y - ZT + ay * math.sin(t)) for t in np.linspace(0, math.pi, 20)], 0.6, C["tinta"], rnd)


# ---------- Invernadero: unidad de cultivo con 3 cámaras tipo Veggie (1,0 × 0,6 × 1,8 m) ----------
def unidad_cultivo(lz, P, c, r, w, h, cuadro=None):
    M, C, E = MEDIDAS["cultivo"], CDRA, EXTRA
    rnd = random.Random(6000 + c * 37 + r * 101)
    RW, RD = M["ancho"] / CASILLA_M, M["fondo"] / CASILLA_M
    cc, cr = c + 0.5, r + 0.46
    ZS = 0.12 * PX_M
    m = Marco(P, cc, cr, RW, RD, ZS, ZS + M["alto"] * PX_M)
    ZD = ZS + 0.25 * PX_M                                                       # depósito de raíces: 0,25 m
    camaras = [(ZD + 0.6 + k * 11.0, ZD + 0.6 + k * 11.0 + 10.6) for k in range(3)]   # 0,47 m: el alto de un Veggie
    if cuadro is not None:                      # ---- la luz de cultivo respira, una gota cae, la bomba parpadea ----
        for k, (z0, z1) in enumerate(camaras):
            brillo = 0.15 * math.sin(cuadro * math.pi / 2 + k)
            lz.poli(m.ri(0.06, RW - 0.06, z1 - 1.9, z1 - 1.4), fill=mezcla(E["magenta"], (255, 255, 255), max(0, brillo)))
        zg = ZD + 30 - cuadro * 6.5
        x, y = m.fd(RD * 0.2, zg, 0.02)
        lz.elipse(x - 0.4, y - 0.6, x + 0.4, y + 0.6, fill=E["agua_l"])
        x, y = m.fi(RW * 0.86, ZS + 2.4)
        lz.elipse(x - 0.5, y - 0.5, x + 0.5, y + 0.5, fill=C["led_v"] if cuadro % 2 == 0 else C["rebaje_fondo"])
        return
    base = base_prota(lz, P, cc, cr, M["ancho"], M["fondo"])
    lz.poli(m.cara_i, fill=C["frente"])
    lz.poli(m.cara_d, fill=C["lateral"])
    lz.poli(m.tapa, fill=C["tapa"])
    material_prota(lz, m, rnd)
    # depósito de raíces con mirilla de agua y bomba
    lz.poli(m.ri(0, RW, ZS, ZD), fill=mezcla(C["frente"], C["tinta"], 0.15))
    lz.poli(m.ri(0.06, 0.4, ZS + 1.4, ZD - 1.2), fill=E["vidrio"], outline=C["tinta"], ancho=0.25)
    lz.poli(m.ri(0.06, 0.4, ZS + 1.4, ZS + 3.4), fill=E["agua"])
    x, y = m.fi(RW * 0.86, ZS + 2.4)
    lz.elipse(x - 0.65, y - 0.65, x + 0.65, y + 0.65, fill=C["rejilla"])
    paredes = []
    for k, (z0, z1) in enumerate(camaras):
        paredes.append(rebaje_prota(lz, m, 0.04, RW - 0.04, z0, z1, E["camara"], 0.5))
        lz.velo(m.ri(0.05, RW - 0.05, z0 + 1, z1 - 2), E["magenta"] + (40,))                     # luz de cultivo en el interior
        lz.poli(m.ri(0.04, RW - 0.04, z1 - 1.4, z1), fill=C["rejilla"])                           # tapa de LED
        lz.poli(m.ri(0.06, RW - 0.06, z1 - 1.9, z1 - 1.4), fill=E["magenta"])
        for j in range(6):                                                                        # LED verdes intercalados
            x, y = m.fi(0.08 + j * (RW - 0.16) / 5, z1 - 1.65)
            lz.elipse(x - 0.2, y - 0.2, x + 0.2, y + 0.2, fill=C["led_v"])
        lz.poli(m.ri(0.05, RW - 0.05, z0 + 0.5, z0 + 1.5), fill=E["almohada"])                    # manta de raíces
        especies = (E["hoja_r"], E["hoja"], E["hoja_c"])                                         # lechuga roja, verde y mizuna
        for j in range(3):
            u = RW * (0.2 + j * 0.3)
            x, y = m.fi(u, z0 + 1.5)
            lz.elipse(x - 1.3, y - 0.6, x + 1.3, y + 0.5, fill=mezcla(E["almohada"], C["tinta"], 0.15), outline=C["tinta"], ancho=0.2)   # almohada
            col = especies[(j + k) % 3]
            for dx_, dz_, rr in ((-1.4, 2.6, 1.5), (1.4, 2.8, 1.5), (0, 4.0, 1.7), (-0.6, 5.4, 1.2), (0.8, 5.0, 1.2)):
                hx, hy = x + dx_, y - dz_ + 1.5
                lz.elipse(hx - rr, hy - rr * 0.65, hx + rr, hy + rr * 0.65, fill=col, outline=C["tinta"], ancho=0.2)
                lz.d.pieslice([(hx - rr) * K, (hy - rr * 0.65) * K, (hx + rr) * K, (hy + rr * 0.65) * K], 0, 180, fill=mezcla(col, C["tinta"], 0.25))
                lz.linea([(hx - rr * 0.7, hy), (hx + rr * 0.7, hy - 0.2)], mezcla(col, (255, 255, 255), 0.35), 0.2)
        # fuelle transparente con pliegues
        lz.velo(m.ri(0.05, RW - 0.05, z0 + 1.5, z1 - 1.9), E["vidrio"] + (46,))
        for z in np.arange(z0 + 2.6, z1 - 2.2, 1.6):
            lz.linea([m.fi(0.05, z), m.fi(RW - 0.05, z)], mezcla(E["vidrio"], (255, 255, 255), 0.4), 0.2)
        lz.velo([m.fi(RW * 0.15, z0 + 2), m.fi(RW * 0.24, z0 + 2), m.fi(RW * 0.32, z1 - 2.4), m.fi(RW * 0.23, z1 - 2.4)], (255, 255, 255, 40))
    # lateral: tubos de riego y de aire, cables al suelo
    for v, col in ((RD * 0.2, E["agua"]), (RD * 0.32, C["tubo"])):
        lz.linea([m.fd(v, ZS + 2, 0.02), m.fd(v, m.z1 - 2, 0.02)], C["tinta"], 1.5)
        lz.linea([m.fd(v, ZS + 2, 0.02), m.fd(v, m.z1 - 2, 0.02)], col, 1.0)
        for z0, z1 in camaras:
            x, y = m.fd(v, z1 - 3, 0.02)
            lz.elipse(x - 0.6, y - 0.4, x + 0.6, y + 0.4, fill=C["metal"], outline=C["tinta"], ancho=0.2)
    cable_al_suelo(lz, m, RD * 0.7, ZS + 3, C["tubo_osc"], 1.4, 0.0)
    # tapa: ventilador
    cx_, cy_ = m.ft(RW * 0.5, RD * 0.5)
    lz.elipse(cx_ - 2.4, cy_ - 1.2, cx_ + 2.4, cy_ + 1.2, fill=C["rejilla"], outline=C["tinta"], ancho=0.3)
    desgaste_prota(lz, m, base, rnd, paredes)
    tinta_prota(lz, m, base, rnd, [m.ri(0.04, RW - 0.04, z0, z1) + [m.fi(0.04, z0)] for z0, z1 in camaras])


def protagonista(lz, P, clave, c, r, w, h, cuadro=None):
    return {"cdra": rack_cdra, "baterias": armario_baterias, "consola": consola_mando, "servidores": armario_servidores,
            "tanque": tanque_agua, "cultivo": unidad_cultivo}[clave](lz, P, c, r, w, h, cuadro=cuadro)




def objeto(lz, P, tipo, c, r, w, h, sistema, sala):
    """Cada objeto según docs/biblia-objetos.md: dentro de su huella, apoyado en el suelo, 3 detalles o más."""
    clave = clave_protagonista(tipo, sistema, sala)
    if clave:                                                   # estaciones: detalle máximo, a escala real
        return protagonista(lz, P, clave, c, r, w, h)
    ac = ACENTO.get(sistema, ROSA)
    m = 0.08                                                    # margen dentro de la huella
    fi = lambda u, z, vv=None: P(c + u, r + h - m if vv is None else r + vv, z)     # cara izquierda (mira a +fila)
    fd = lambda v, z, uu=None: P(c + w - m if uu is None else c + uu, r + v, z)     # cara derecha (mira a +columna)
    rect_i = lambda u0, u1, z0, z1, **kw: lz.poli([fi(u0, z0), fi(u1, z0), fi(u1, z1), fi(u0, z1)], **kw)
    rect_d = lambda v0, v1, z0, z1, **kw: lz.poli([fd(v0, z0), fd(v1, z0), fd(v1, z1), fd(v0, z1)], **kw)
    zocalo = lambda: caja(lz, P, c + m, r + m, w - 2 * m, h - 2 * m, 0, 5, V1, V0, V0, 1)

    if tipo == "maquina" and sistema == "energia":              # rack de baterías de litio
        zocalo()
        caja(lz, P, c + m, r + m, w - 2 * m, h - 2 * m, 5, 70, V4, V3, V2)
        for k in range(4):                                       # 4 módulos con barra de carga y asa
            z0 = 10 + k * 14
            rect_i(0.16, 0.92, z0, z0 + 11, fill=V2, outline=TINTA, ancho=0.9)
            carga = (1.0, 0.85, 0.55, 0.3)[k]
            rect_i(0.22, 0.22 + 0.5 * carga, z0 + 4, z0 + 7, fill=VERDE_LED if carga > 0.5 else PM.AMBAR)
            rect_i(0.78, 0.86, z0 + 3, z0 + 8, fill=V1)
        for k in range(7):                                       # aletas de refrigeración
            v = 0.16 + k * 0.1
            lz.linea([fd(v, 12), fd(v, 62)], V1, 1)
        x, y = fd(0.5, 46)
        lz.poli([(x - 5, y + 4), (x, y - 5), (x + 5, y + 4)], fill=PM.AMBAR, outline=TINTA, ancho=0.7)    # alto voltaje
        caja(lz, P, c + w - m - 0.02, r + 0.25, 0.08, 0.4, 14, 30, (70, 64, 52), (60, 54, 44), (44, 40, 34), 0.9, remate=False)   # caja de bornes
        for v in (0.32, 0.52):                                  # cables gruesos que bajan al suelo
            pts = [fd(v, 16, w - m + 0.06), fd(v + 0.02, 8, w - m + 0.16), fd(v + 0.04, 0, w - m + 0.3)]
            lz.linea(pts, TINTA, 4.4)
            lz.linea(pts, (70, 64, 52), 3)
            x, y = pts[-1]
            lz.elipse(x - 4, y - 2, x + 4, y + 2, fill=V1, outline=TINTA, ancho=0.7)        # pasamuros del suelo
        x, y = P(c + 0.75, r + 0.5, 70)
        lz.elipse(x - 3, y - 2, x + 3, y + 2, fill=VERDE_LED)
    elif tipo == "maquina" and sistema == "mando":              # consola: mueble + tablero inclinado + monitor
        zocalo()
        caja(lz, P, c + m, r + 0.35, w - 2 * m, h - 0.35 - m, 5, 36, V4, V3, V2)
        caja(lz, P, c + 0.15, r + m, w - 0.3, 0.12, 5, 82, V2, V1, V1, 1.2)                      # poste del monitor
        caja(lz, P, c + m + 0.02, r + 0.05, w - 2 * m - 0.04, 0.12, 48, 84, V2, (26, 22, 64), V1, 1.3)   # monitor
        pantalla = [P(c + 0.16, r + 0.17, 52), P(c + w - 0.16, r + 0.17, 52), P(c + w - 0.16, r + 0.17, 80), P(c + 0.16, r + 0.17, 80)]
        lz.poli(pantalla, fill=mezcla(ac, V0, 0.55))
        for k in range(3):
            lz.linea([P(c + 0.22, r + 0.17, 72 - k * 6), P(c + w - 0.3 - k * 0.12, r + 0.17, 72 - k * 6)], PM.LUZ, 1)
        tablero = [P(c + m, r + h - m, 36), P(c + w - m, r + h - m, 36), P(c + w - m, r + 0.35, 46), P(c + m, r + 0.35, 46)]
        lz.poli(tablero, fill=(26, 22, 64), outline=TINTA, ancho=1.3)
        for k, col in enumerate((ac, PM.AMBAR, VERDE_LED, ac)):
            x, y = P(c + 0.25 + k * 0.16, r + 0.7, 40)
            lz.elipse(x - 2.4, y - 1.5, x + 2.4, y + 1.5, fill=col)
        x0, y0 = P(c + 0.25, r + 0.5, 43)
        lz.linea([(x0, y0), (x0 + 20, y0 + 6)], mezcla(ac, (255, 255, 255), 0.4), 1.2)
    elif tipo == "maquina" and sistema == "comunicaciones":     # armario de servidores
        zocalo()
        caja(lz, P, c + m, r + m, w - 2 * m, h - 2 * m, 5, 78, V3, (52, 46, 104), V1)
        for k in range(6):
            z0 = 10 + k * 10.5
            rect_i(0.14, 0.86, z0, z0 + 8, fill=(36, 30, 78), outline=V0, ancho=0.6)
            for j in range(4):
                lz.linea([fi(0.2 + j * 0.06, z0 + 2), fi(0.2 + j * 0.06, z0 + 6)], V2, 0.8)
            x, y = fi(0.76, z0 + 4)
            lz.elipse(x - 1.6, y - 1.6, x + 1.6, y + 1.6, fill=ac if (k + 1) % 3 else PM.AMBAR)
        lz.linea([fi(0.9, 20), fi(0.9, 60)], V4, 1.6)                                           # asa de la puerta
        caja(lz, P, c + 0.2, r + 0.2, 0.6, 0.6, 78, 82, V2, V1, V0, 1, remate=False)            # tapa con rejilla
        for k in range(4):
            lz.linea([P(c + 0.28 + k * 0.12, r + 0.25, 82), P(c + 0.28 + k * 0.12, r + 0.75, 82)], V0, 0.8)
        for v in (0.3, 0.45, 0.6):                              # mazo de cables que baja al suelo
            pts = [fd(v, 12), fd(v + 0.02, 5, w - m + 0.12), fd(v + 0.03, 0, w - m + 0.24)]
            lz.linea(pts, TINTA, 2.8)
            lz.linea(pts, mezcla(ac, V0, 0.4), 1.6)
    elif tipo == "maquina" and sistema == "oxigeno":            # rack CDRA: detalle máximo (ver ficha piloto)
        rack_cdra(lz, P, c, r, w, h)
    elif tipo == "maquina" and sistema == "blindaje":           # tanque de agua: el agua frena la radiación
        x, y, ax, ay = cilindro(lz, P, c + 0.5, r + 0.5, 0.36, 0, 70, AGUA_M, AGUA_S, AGUA)
        for z in (16, 54):
            aro(lz, P, c + 0.5, r + 0.5, 0.36, z, V0, 2)
        lz.poli([(x - ax * 0.55, y - 10), (x - ax * 0.42, y - 10), (x - ax * 0.42, y - 62), (x - ax * 0.55, y - 62)], fill=AGUA_L, outline=TINTA, ancho=0.8)
        lz.poli([(x - ax * 0.55, y - 10), (x - ax * 0.42, y - 10), (x - ax * 0.42, y - 44), (x - ax * 0.55, y - 44)], fill=AGUA_S)   # nivel
        lz.elipse(x - 7, y - 79, x + 7, y - 71, outline=(184, 71, 61), ancho=1.6)                # volante de la válvula
        lz.linea([(x - 7, y - 75), (x + 7, y - 75)], (184, 71, 61), 1.2)
        lz.texto(x + 6, y - 34, "H₂O", 7, PM.LUZ)
    elif tipo == "torre":                                       # Veggie: depósito, fuelle transparente, tapa de LED
        caja(lz, P, c + 0.12, r + 0.12, w - 0.24, h - 0.24, 0, 12, V3, V2, V1)                  # depósito de raíces
        x0, y0 = P(c + 0.2, r + h - 0.2, 12)
        caja(lz, P, c + 0.16, r + 0.16, w - 0.32, h - 0.32, 12, 62, (214, 200, 240), (196, 182, 232), (168, 152, 214), 1)
        for z in range(18, 60, 7):                               # pliegues del fuelle
            lz.linea([fi(0.16, z, h - 0.16), fi(w - 0.16, z, h - 0.16), fd(0.16, z, w - 0.16)], (150, 136, 200), 0.8)
        for u, zz in ((0.35, 26), (0.6, 30), (0.45, 40)):          # plantas dentro (lechuga roja y verde)
            x, y = fi(u, zz, h - 0.17)
            lz.elipse(x - 7, y - 5, x + 7, y + 5, fill=PM.HOJA if u != 0.6 else (186, 84, 120), outline=TINTA, ancho=0.6)
            lz.linea([(x, y + 4), (x, y + 10)], (60, 120, 100), 1)
        caja(lz, P, c + 0.1, r + 0.1, w - 0.2, h - 0.2, 62, 74, V2, V1, V0)                     # tapa de LED
        lz.poli([fi(0.18, 60, h - 0.16), fi(w - 0.18, 60, h - 0.16), fi(w - 0.18, 63, h - 0.16), fi(0.18, 63, h - 0.16)], fill=MAGENTA)
    elif tipo == "bandeja":                                     # almohadas con brotes
        for u, v in ((0.2, 0.2), (0.2, h - 0.2), (w - 0.2, 0.2), (w - 0.2, h - 0.2)):
            caja(lz, P, c + u - 0.04, r + v - 0.04, 0.08, 0.08, 0, 14, V1, V1, V0, 0.7)
        caja(lz, P, c + 0.12, r + 0.1, w - 0.24, h - 0.2, 14, 22, (90, 48, 104), (120, 52, 120), (70, 34, 84))
        for i in range(int(h * 3)):
            for j in range(2):
                x, y = P(c + 0.32 + j * 0.36, r + 0.25 + i * (h - 0.4) / max(1, int(h * 3) - 1), 22)
                lz.elipse(x - 6, y - 3.5, x + 6, y + 3.5, fill=(214, 196, 160), outline=TINTA, ancho=0.5)   # almohada
                lz.elipse(x - 3, y - 8, x + 1, y - 3, fill=PM.HOJA, outline=TINTA, ancho=0.4)
                lz.elipse(x, y - 7, x + 4, y - 2, fill=PM.HOJA_CALIDA, outline=TINTA, ancho=0.4)
    elif tipo == "cajas":                                       # bolsas de carga CTB, blancas con asa
        def bolsa(cc, rr, ww, hh, z0, z1):
            ci, cd, tp = caja(lz, P, cc, rr, ww, hh, z0, z1, BLANCO, BLANCO_M, BLANCO_S, 1.3, remate=False)
            lz.velo([P(cc, rr + hh, z0), P(cc + ww, rr + hh, z0), P(cc + ww, rr + hh, z0 + (z1 - z0) * 0.4), P(cc, rr + hh, z0 + (z1 - z0) * 0.4)], V0 + (26,))
            lz.velo([P(cc + ww, rr + hh, z0), P(cc + ww, rr, z0), P(cc + ww, rr, z0 + 5), P(cc + ww, rr + hh, z0 + 5)], V0 + (50,))
            for k in range(3):                                   # arrugas de la tela
                u = ww * (0.2 + k * 0.3)
                lz.linea([P(cc + u, rr + hh, z0 + 3), P(cc + u + 0.05, rr + hh, z0 + (z1 - z0) * 0.5), P(cc + u - 0.03, rr + hh, z1 - 3)], BLANCO_S, 0.6)
            cx, cy = P(cc + ww / 2, rr + hh / 2, z1)
            lz.elipse(cx - ww * 22, cy - hh * 9, cx + ww * 22, cy + hh * 9, fill=mezcla(BLANCO, (255, 255, 255), 0.5))   # tapa acolchada
            for v in (0.25, 0.75):                               # correas
                lz.linea([P(cc, rr + hh * v, z1), P(cc + ww, rr + hh * v, z1), P(cc + ww, rr + hh * v, z0 + 2)], (200, 196, 210), 1.4)
            a, b = P(cc + ww * 0.3, rr + hh / 2, z1), P(cc + ww * 0.7, rr + hh / 2, z1)
            lz.linea([a, ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 5), b], ROSA, 2.2)            # asa
            lz.linea([P(cc + 0.05, rr + hh, z1 - 3), P(cc + ww - 0.05, rr + hh, z1 - 3)], BLANCO_S, 0.7)   # costura
            q = [P(cc + ww * 0.2, rr + hh, z0 + 6), P(cc + ww * 0.6, rr + hh, z0 + 6), P(cc + ww * 0.6, rr + hh, z0 + 14), P(cc + ww * 0.2, rr + hh, z0 + 14)]
            lz.poli(q, fill=(206, 230, 250), outline=TINTA, ancho=0.6)                         # ventana de etiqueta
            for k in range(3):
                lz.linea([P(cc + ww * (0.25 + k * 0.1), rr + hh, z0 + 8), P(cc + ww * (0.25 + k * 0.1), rr + hh, z0 + 12)], TINTA, 0.5)
        bolsa(c + 0.1, r + 0.1, w - 0.2, h - 0.2, 0, 30)
        if (c + r) % 2 == 0:
            bolsa(c + 0.2, r + 0.2, w - 0.4, h - 0.4, 30, 50)
    elif tipo == "bidon":                                       # contenedor de agua
        x, y, ax, ay = cilindro(lz, P, c + 0.5, r + 0.5, 0.26, 0, 44, AGUA_M, AGUA_S, AGUA)
        for z in (10, 32):
            aro(lz, P, c + 0.5, r + 0.5, 0.26, z, V0, 1.6)
        lz.elipse(x - 4, y - 47, x + 4, y - 43, fill=V4, outline=TINTA, ancho=0.8)            # tapón
        lz.texto(x - 4, y - 21, "H₂O", 6, PM.LUZ)
    elif tipo == "estanteria":                                  # laterales, baldas con canto y cosas apoyadas
        prof_c, prof_r = (w - 0.16, 0.5) if w >= h else (0.5, h - 0.16)
        c0, r0 = c + 0.08, r + 0.08
        caja(lz, P, c0, r0, prof_c, prof_r, 0, 84, V2, V1, V0, 1.2)                             # fondo y laterales (hueco)
        hueco = [P(c0 + 0.05, r0 + prof_r, 4), P(c0 + prof_c - 0.05, r0 + prof_r, 4), P(c0 + prof_c - 0.05, r0 + prof_r, 80), P(c0 + 0.05, r0 + prof_r, 80)] \
            if w >= h else [P(c0 + prof_c, r0 + 0.05, 4), P(c0 + prof_c, r0 + prof_r - 0.05, 4), P(c0 + prof_c, r0 + prof_r - 0.05, 80), P(c0 + prof_c, r0 + 0.05, 80)]
        lz.poli(hueco, fill=(44, 38, 92))
        largo = prof_c if w >= h else prof_r
        for zb in (4, 30, 56):                                  # baldas con su canto
            if w >= h:
                caja(lz, P, c0 + 0.04, r0 + 0.02, prof_c - 0.08, prof_r - 0.02, zb, zb + 3, V4, V3, V2, 0.8)
            else:
                caja(lz, P, c0 + 0.02, r0 + 0.04, prof_c - 0.02, prof_r - 0.08, zb, zb + 3, V4, V3, V2, 0.8)
            n = int(largo / 0.32)
            for j in range(n):
                t = 0.1 + j * 0.32
                color = [((124, 200, 150), PAPEL, (150, 120, 80)), (mezcla(ac, (255, 255, 255), 0.3), BLANCO, ac),
                         (BLANCO, ROSA, PM.AMBAR)][0 if sala == "Invernadero" else 1 if sala == "Soporte vital" else 2][(j + zb) % 3]
                alto_o = 14 + (j * 7 + zb) % 8
                if w >= h:
                    caja(lz, P, c0 + t, r0 + 0.2, 0.22, 0.24, zb + 3, zb + 3 + alto_o, mezcla(color, (255, 255, 255), 0.2), color, mezcla(color, V0, 0.3), 0.6)
                else:
                    caja(lz, P, c0 + 0.2, r0 + t, 0.24, 0.22, zb + 3, zb + 3 + alto_o, mezcla(color, (255, 255, 255), 0.2), color, mezcla(color, V0, 0.3), 0.6)
        caja(lz, P, c0, r0, prof_c, prof_r, 80, 84, V4, V3, V2, 1.2)                            # tapa
    elif tipo == "mesa":                                        # mesa con holograma y 4 sillas con respaldo
        def silla(u, v, mira):
            cc, rr = c + u, r + v
            for du, dv in ((0.04, 0.04), (0.24, 0.04), (0.04, 0.24), (0.24, 0.24)):
                lz.linea([P(cc + du, rr + dv, 0), P(cc + du, rr + dv, 14)], ROSA, 1.6)
            caja(lz, P, cc, rr, 0.28, 0.28, 14, 18, ROSA_CL, ROSA, (184, 100, 176), 1)
            if mira == "c":                                     # respaldo en el lado contrario a la mesa
                caja(lz, P, cc, rr, 0.05, 0.28, 18, 38, ROSA_CL, ROSA, (184, 100, 176), 1)
            elif mira == "-c":
                caja(lz, P, cc + 0.23, rr, 0.05, 0.28, 18, 38, ROSA_CL, ROSA, (184, 100, 176), 1)
            elif mira == "r":
                caja(lz, P, cc, rr, 0.28, 0.05, 18, 38, ROSA_CL, ROSA, (184, 100, 176), 1)
            else:
                caja(lz, P, cc, rr + 0.23, 0.28, 0.05, 18, 38, ROSA_CL, ROSA, (184, 100, 176), 1)
        silla(0.08, h / 2 - 0.14, "c")                          # atrás primero
        silla(w / 2 - 0.14, 0.08, "r")
        caja(lz, P, c + w / 2 - 0.3, r + h / 2 - 0.3, 0.6, 0.6, 0, 3, V2, V1, V0, 0.8)          # pie
        caja(lz, P, c + w / 2 - 0.08, r + h / 2 - 0.08, 0.16, 0.16, 3, 28, V2, V2, V1, 1)
        caja(lz, P, c + 0.42, r + 0.42, w - 0.84, h - 0.84, 28, 33, V4, V3, V2)                 # tablero
        x, y = P(c + w / 2, r + h / 2, 33)
        lz.elipse(x - 9, y - 4.5, x + 9, y + 4.5, fill=(26, 22, 64), outline=TINTA, ancho=0.8)  # proyector
        hx, hy = P(c + w / 2, r + h / 2, 66)
        lz.poli([(x - 8, y), (x + 8, y), (hx + 15, hy + 4), (hx - 15, hy + 4)], fill=(206, 200, 246))
        lz.elipse(hx - 16, hy - 16, hx + 16, hy + 16, fill=(198, 102, 64), outline=TINTA, ancho=1.2)   # Marte
        lz.elipse(hx - 10, hy - 13, hx + 2, hy - 4, fill=(226, 150, 100))
        lz.d.chord([(hx - 9) * K, (hy - 17) * K, (hx + 9) * K, (hy - 9) * K], 180, 360, fill=(240, 236, 230))
        lz.linea([(hx - 8, hy + 4), (hx + 6, hy + 6)], (120, 50, 34), 1.4)                       # Valles Marineris
        silla(w - 0.36, h / 2 - 0.14, "-c")                     # y las de delante
        silla(w / 2 - 0.14, h - 0.36, "-r")
    elif tipo == "escritorio":
        for u, v in ((0.12, 0.2), (w - 0.18, 0.2), (0.12, h - 0.2), (w - 0.18, h - 0.2)):
            caja(lz, P, c + u, r + v - 0.03, 0.06, 0.06, 0, 24, V2, V1, V0, 0.7)
        caja(lz, P, c + 0.1, r + 0.15, w - 0.2, h - 0.3, 24, 28, V4, V3, V2)
        for u in (0.5, 1.4):                                    # monitores con pie, mirando al jugador
            caja(lz, P, c + u + 0.25, r + 0.3, 0.08, 0.08, 28, 36, V1, V0, V0, 0.7)
            caja(lz, P, c + u, r + 0.28, 0.6, 0.06, 36, 58, V2, (20, 30, 32), V1, 1.1)
            pts = [P(c + u + 0.05 + k * 0.05, r + 0.34, 46 + 6 * math.sin(k * 1.1 + u * 5)) for k in range(10)]
            lz.linea(pts, ACENTO["comunicaciones"], 1)
            caja(lz, P, c + u + 0.05, r + 0.55, 0.5, 0.14, 28, 30, V1, V0, V0, 0.6)             # teclado
        caja(lz, P, c + 2.25, r + 0.3, 0.5, 0.35, 28, 40, V3, V2, V1, 1.1)                      # radio
        x, y = P(c + 2.4, r + 0.65, 34)
        lz.elipse(x - 3, y - 3, x + 3, y + 3, fill=PM.AMBAR, outline=TINTA, ancho=0.6)
        lz.linea([P(c + 2.65, r + 0.35, 40), P(c + 2.7, r + 0.35, 62)], TINTA, 1)
    elif tipo == "litera":                                      # camarote: 4 postes, 2 camas, escalera
        poste = lambda u, v: caja(lz, P, c + u, r + v, 0.06, 0.06, 0, 58, V2, V1, V0, 0.8)
        poste(0.06, 0.1)
        poste(w - 0.12, 0.1)
        for zc, saco in ((10, (181, 140, 255)), (40, (200, 170, 250))):
            caja(lz, P, c + 0.08, r + 0.12, w - 0.16, h - 0.24, zc, zc + 4, V3, V2, V1, 1)        # somier
            caja(lz, P, c + 0.1, r + 0.14, w - 0.2, h - 0.28, zc + 4, zc + 9, BLANCO, BLANCO_M, BLANCO_S, 0.8)
            caja(lz, P, c + 0.12, r + 0.2, 0.3, h - 0.4, zc + 9, zc + 13, BLANCO, BLANCO_M, BLANCO_S, 0.7)   # almohada
            caja(lz, P, c + 0.5, r + 0.16, w - 0.66, h - 0.32, zc + 9, zc + 14, saco, mezcla(saco, V0, 0.2), mezcla(saco, V0, 0.4), 0.8)  # saco
            lz.linea([P(c + 0.55, r + h / 2, zc + 14), P(c + w - 0.2, r + h / 2, zc + 14)], mezcla(saco, (255, 255, 255), 0.4), 0.8)
        poste(0.06, h - 0.16)
        poste(w - 0.12, h - 0.16)
        for k in range(4):                                      # escalera
            z = 16 + k * 8
            lz.linea([P(c + w - 0.1, r + 0.2, z), P(c + w - 0.1, r + h - 0.2, z)], V4, 1.4)
    elif tipo == "taquilla":
        zocalo()
        caja(lz, P, c + m, r + m, w - 2 * m, h - 2 * m, 5, 80, V3, V2, V1)
        lz.linea([fi(0.5, 8), fi(0.5, 76)], V0, 1)
        for u0 in (0.16, 0.56):
            for k in range(3):
                lz.linea([fi(u0, 66 - k * 3), fi(u0 + 0.26, 66 - k * 3)], V1, 1)
            rect_i(u0 + 0.04, u0 + 0.22, 44, 49, fill=ACENTO["blindaje"])
            lz.linea([fi(u0 + 0.3, 30), fi(u0 + 0.3, 40)], V4, 1.4)
    elif tipo == "banco" and sala == "Pasillo":                 # banco para sentarse
        for u, v in ((0.12, 0.12), (w - 0.18, 0.12), (0.12, h - 0.18), (w - 0.18, h - 0.18)):
            caja(lz, P, c + u, r + v, 0.06, 0.06, 0, 14, V2, V1, V0, 0.7)
        caja(lz, P, c + 0.08, r + 0.08, w - 0.16, h - 0.16, 14, 18, V4, V3, V2)
        caja(lz, P, c + 0.12, r + 0.12, w - 0.24, h - 0.24, 18, 23, ROSA_CL, ROSA, (184, 100, 176), 1)
    elif tipo == "banco":                                       # banco de trabajo con cajonera y herramientas
        for u, v in ((0.1, 0.12), (0.1, h - 0.18), (w - 0.16, 0.12)):
            caja(lz, P, c + u, r + v, 0.06, 0.06, 0, 28, V2, V1, V0, 0.7)
        caja(lz, P, c + w - 0.7, r + 0.12, 0.6, h - 0.24, 0, 28, V3, V2, V1)                     # cajonera
        for k in range(3):
            z0 = 4 + k * 8
            lz.poli([P(c + w - 0.65, r + h - 0.12, z0), P(c + w - 0.15, r + h - 0.12, z0), P(c + w - 0.15, r + h - 0.12, z0 + 6), P(c + w - 0.65, r + h - 0.12, z0 + 6)],
                    fill=V2, outline=TINTA, ancho=0.6)
            x, y = P(c + w - 0.4, r + h - 0.12, z0 + 3)
            lz.linea([(x - 3, y + 1), (x + 3, y - 1)], V4, 1)
        caja(lz, P, c + 0.06, r + 0.08, w - 0.12, h - 0.16, 28, 32, V4, V3, V2)
        x, y = P(c + 0.4, r + 0.45, 32)                         # llave inglesa
        lz.linea([(x - 10, y - 2), (x + 8, y + 5)], (190, 190, 210), 2.4)
        lz.elipse(x - 15, y - 7, x - 7, y + 1, outline=(190, 190, 210), ancho=1.6)
        caja(lz, P, c + 0.9, r + 0.3, 0.35, 0.3, 32, 40, PM.AMBAR, (214, 160, 40), (170, 120, 30), 0.8)   # batería de repuesto
        x, y = P(c + 1.5, r + 0.5, 32)                          # taladro
        lz.poli([(x - 6, y - 8), (x + 8, y - 8), (x + 8, y - 3), (x - 6, y - 3)], fill=(60, 110, 200), outline=TINTA, ancho=0.7)
        lz.poli([(x - 2, y - 3), (x + 3, y - 3), (x + 2, y + 4), (x - 3, y + 4)], fill=(40, 34, 86))
    elif tipo == "carro":                                       # carrito: ruedas bajo las esquinas, 2 baldas, asa
        for u, v in ((0.2, 0.2), (0.8, 0.2), (0.2, 0.8), (0.8, 0.8)):
            x, y = P(c + u, r + v, 4)
            lz.elipse(x - 4, y - 4, x + 4, y + 4, fill=V0)
            lz.linea([P(c + u, r + v, 6), P(c + u, r + v, 34)], V2, 1.4)
        caja(lz, P, c + 0.15, r + 0.15, 0.7, 0.7, 8, 12, V3, V2, V1, 1)
        caja(lz, P, c + 0.4, r + 0.3, 0.3, 0.3, 12, 20, BLANCO, BLANCO_M, BLANCO_S, 0.7)        # caja en la balda de abajo
        caja(lz, P, c + 0.15, r + 0.15, 0.7, 0.7, 30, 34, V4, V3, V2, 1)
        lz.linea([P(c + 0.15, r + 0.2, 34), P(c + 0.15, r + 0.2, 46), P(c + 0.15, r + 0.8, 46), P(c + 0.15, r + 0.8, 34)], V4, 1.6)   # asa
        x, y = P(c + 0.45, r + 0.5, 34)
        lz.linea([(x - 8, y - 2), (x + 6, y + 4)], (190, 190, 210), 2.2)
        caja(lz, P, c + 0.6, r + 0.3, 0.2, 0.2, 34, 40, PM.AMBAR, (214, 160, 40), (170, 120, 30), 0.6)
    elif tipo == "antena":                                      # base con trípode, mástil, plato y bocina
        for a in (0, 2.1, 4.2):
            lz.linea([P(c + 0.5, r + 0.5, 30), P(c + 0.5 + 0.32 * math.cos(a), r + 0.5 + 0.32 * math.sin(a), 0)], V1, 2)
        caja(lz, P, c + 0.42, r + 0.42, 0.16, 0.16, 20, 60, V3, V2, V1, 1)
        hx, hy = P(c + 0.5, r + 0.5, 74)
        lz.elipse(hx - 30, hy - 14, hx + 26, hy + 20, fill=V4, outline=TINTA, ancho=1.6)        # plato
        lz.elipse(hx - 22, hy - 8, hx + 18, hy + 14, fill=V3)
        lz.elipse(hx - 26, hy - 11, hx + 22, hy + 17, outline=BLANCO, ancho=0.8)                 # borde
        fx, fy = hx + 12, hy - 24
        for dx, dy in ((-20, 12), (14, 14), (-2, 18)):                                           # 3 varillas
            lz.linea([(hx + dx * 0.9, hy + dy * 0.5), (fx, fy)], TINTA, 1)
        lz.elipse(fx - 4, fy - 4, fx + 4, fy + 4, fill=ACENTO["comunicaciones"], outline=TINTA, ancho=1)
        for k in range(3):
            lz.d.arc([(fx - 4 - k * 7) * K, (fy - 14 - k * 7) * K, (fx + 12 + k * 7) * K, (fy + 2 + k * 7) * K], 290, 360, fill=ACENTO["comunicaciones"], width=K)
        lz.linea([P(c + 0.5, r + 0.5, 20), P(c + 0.9, r + 0.95, 0)], (64, 58, 46), 2)          # cable
    elif tipo == "maceta" and False:
        pass
    elif tipo == "maceta":                                      # chile en maceta (ver planta_maceta)
        x, y = P(c + 0.5, r + 0.5)
        planta_maceta(lz, x, y, semilla=c * 31 + r * 7 + len(sala))
    else:                                                       # tipo desconocido: un bloque neutro
        caja(lz, P, c + m, r + m, w - 2 * m, h - 2 * m, 0, 40, V4, V3, V2)

HOJA_OSCURA, HOJA_MEDIA, HOJA_CLARA = (30, 84, 66), (62, 138, 92), (150, 206, 122)
CHILE_ROJO, CHILE_VERDE = (204, 52, 40), (92, 150, 62)


def planta_maceta(lz, x, y, semilla):
    """Chile en maceta, como los chiles Española que crecieron en la ISS en 2021 (PH-04): plato, maceta cónica
    con luz desde la izquierda y trama en la sombra, sustrato de arcilla cocida (arcillite), etiqueta, tallo
    ramificado, unas 70 hojas lanceoladas ordenadas por profundidad y sombreadas como una copa 3D, y chiles."""
    rnd = random.Random(semilla)
    top, bot, ht, hb = y - 22, y - 1.5, 15.5, 11
    # 1. plato y sombra de contacto
    lz.elipse(x - 18, y - 4, x + 18, y + 5, fill=mezcla(ROSA, V0, 0.5), outline=TINTA, ancho=0.8)
    lz.elipse(x - 13, y - 3, x + 13, y + 3, fill=mezcla(ROSA, V0, 0.65))
    # 2. cuerpo de la maceta: tiras verticales con la luz de la izquierda
    n = 22
    for k in range(n):
        a0, a1 = math.pi - math.pi * k / n, math.pi - math.pi * (k + 1) / n
        luz = max(0.0, -math.cos((a0 + a1) / 2) * 0.75 + 0.35)
        brillo = math.exp(-((((a0 + a1) / 2) - 2.35) ** 2) / 0.02) * 0.35          # reflejo vertical estrecho
        col = mezcla(mezcla(ROSA, V0, 0.62), mezcla(ROSA, (255, 240, 246), 0.25), min(1, luz + brillo))
        lz.poli([(x + ht * math.cos(a0), top + 4 * math.sin(a0)), (x + ht * math.cos(a1), top + 4 * math.sin(a1)),
                 (x + hb * math.cos(a1), bot + 3 * math.sin(a1)), (x + hb * math.cos(a0), bot + 3 * math.sin(a0))], fill=col)
    for k in range(7):                                           # trama solo en la cara en sombra
        a = 0.95 - k * 0.12
        lz.linea([(x + ht * math.cos(a), top + 4 * math.sin(a) + 1), (x + hb * math.cos(a), bot + 3 * math.sin(a) - 1)],
                 mezcla(ROSA, V0, 0.8), 0.45)
    banda = [(x + (ht - 1.6) * math.cos(a), top + 6 + 3.8 * math.sin(a)) for a in np.linspace(math.pi, 0, 24)]
    lz.linea(banda, mezcla(ROSA, V0, 0.45), 1.1)                # aro decorativo
    lz.linea([(x - ht, top), (x - hb, bot)], TINTA, 1.3)
    lz.linea([(x + ht, top), (x + hb, bot)], TINTA, 1.3)
    lz.linea([(x + hb * math.cos(a), bot + 3 * math.sin(a)) for a in np.linspace(math.pi, 0, 24)], TINTA, 1.3)
    # 3. borde y sustrato
    lz.elipse(x - ht - 1.5, top - 5, x + ht + 1.5, top + 5, fill=mezcla(ROSA, (255, 255, 255), 0.3), outline=TINTA, ancho=1.2)
    lz.elipse(x - ht + 1.5, top - 3.4, x + ht - 1.5, top + 3.4, fill=(70, 46, 38))
    for _ in range(26):                                          # gránulos de arcilla cocida
        a, rr = rnd.uniform(0, math.tau), math.sqrt(rnd.random())
        gx, gy = x + math.cos(a) * rr * (ht - 3), top + math.sin(a) * rr * 2.6
        lz.elipse(gx - 0.6, gy - 0.4, gx + 0.6, gy + 0.4, fill=rnd.choice([(160, 112, 80), (196, 146, 104), (120, 80, 60)]))
    # 4. etiqueta clavada en la tierra
    ex, ey = x + 8, top + 0.5
    lz.linea([(ex, ey), (ex + 1, ey - 9)], (210, 204, 196), 0.8)
    lz.poli([(ex - 2, ey - 13), (ex + 5, ey - 12), (ex + 5, ey - 8), (ex - 2, ey - 9)], fill=(240, 236, 228), outline=TINTA, ancho=0.4)
    lz.linea([(ex - 1, ey - 11), (ex + 4, ey - 10.4)], (120, 116, 140), 0.35)
    # 5. tallo y ramas (de la tierra a la copa)
    cx, cy, rx, ry = x - 1, top - 23, 21, 15
    ramas = []
    for k in range(6):
        ang = -math.pi / 2 + (k - 2.5) * 0.42 + rnd.uniform(-0.1, 0.1)
        fin = (cx + math.cos(ang) * rx * 0.75, cy + 4 + math.sin(ang) * ry * 0.75)
        medio = (x + (fin[0] - x) * 0.35, top - 9 + (fin[1] - top) * 0.2)
        ramas.append((medio, fin))
    lz.linea([(x, top), (x - 0.5, top - 10)], (64, 92, 56), 1.6)
    for medio, fin in ramas:
        lz.linea([(x - 0.5, top - 9), medio, fin], (70, 104, 60), 0.9)
    # 6. hojas y chiles, ordenados de atrás hacia delante
    luz = np.array([-0.62, 0.35, 0.7])
    luz /= np.linalg.norm(luz)
    piezas = []
    for _ in range(72):
        th, ph = rnd.uniform(0, math.tau), math.acos(rnd.uniform(-0.35, 1))
        nrm = np.array([math.sin(ph) * math.cos(th), math.sin(ph) * math.sin(th), math.cos(ph)])
        rr = rnd.uniform(0.62, 1.0)
        hx, hy = cx + nrm[0] * rx * rr, cy - nrm[2] * ry * rr + nrm[1] * 5
        piezas.append((nrm[1], "hoja", hx, hy, nrm))
    for _ in range(rnd.randint(4, 6)):                           # chiles colgando en la parte delantera de abajo
        th = rnd.uniform(0.25, math.pi - 0.25)
        nrm = np.array([math.cos(th) * 0.8, math.sin(th) * 0.8, rnd.uniform(-0.3, 0.25)])
        piezas.append((nrm[1] + 0.05, "chile", cx + nrm[0] * rx * 0.85, cy - nrm[2] * ry * 0.8 + nrm[1] * 5 + 3, nrm))
    piezas.sort(key=lambda t: t[0])
    for prof, clase, hx, hy, nrm in piezas:
        ilum = max(0.0, float(nrm @ luz)) * 0.85 + 0.15
        fondo = 0.35 * max(0.0, -prof)                           # las de atrás, más oscuras (oclusión de la copa)
        if clase == "chile":
            colc = CHILE_ROJO if rnd.random() < 0.6 else CHILE_VERDE
            curva = rnd.uniform(-1.2, 1.2)
            cuerpo = [(hx - 1.6, hy), (hx + 1.6, hy), (hx + 1.4 + curva * 0.4, hy + 4), (hx + curva, hy + 7.5),
                      (hx - 1.0 + curva * 0.5, hy + 4.5)]
            lz.poli(cuerpo, fill=mezcla(colc, V0, 0.25 + fondo), outline=TINTA, ancho=0.4)
            lz.linea([(hx - 0.6, hy + 1), (hx - 0.2 + curva * 0.4, hy + 4.5)], mezcla(colc, (255, 255, 255), 0.55), 0.5)
            lz.poli([(hx - 1.9, hy - 0.4), (hx + 1.9, hy - 0.4), (hx, hy + 1.2)], fill=(60, 110, 60))      # cáliz
            continue
        largo, ancho_h = rnd.uniform(8.5, 12), rnd.uniform(3.6, 5)
        ang = math.atan2(hy - (cy + 6), hx - cx) + rnd.uniform(-0.6, 0.6)
        dx, dy = math.cos(ang), math.sin(ang)
        px_, py_ = -dy, dx
        bx, by = hx - dx * largo * 0.35, hy - dy * largo * 0.35
        punta = (bx + dx * largo, by + dy * largo)
        izq = [(bx + dx * largo * f + px_ * ancho_h / 2 * w_, by + dy * largo * f + py_ * ancho_h / 2 * w_) for f, w_ in ((0.25, 0.8), (0.5, 1.0), (0.78, 0.6))]
        der = [(bx + dx * largo * f - px_ * ancho_h / 2 * w_, by + dy * largo * f - py_ * ancho_h / 2 * w_) for f, w_ in ((0.78, 0.6), (0.5, 1.0), (0.25, 0.8))]
        base_col = mezcla(HOJA_OSCURA, HOJA_CLARA, ilum)
        if rnd.random() < 0.08:
            base_col = mezcla(base_col, (196, 190, 90), 0.35)    # alguna hoja amarillea
        base_col = mezcla(base_col, V0, fondo)
        lz.poli([(bx, by)] + izq + [punta] + der, fill=base_col)
        lz.poli([(bx, by)] + izq + [punta], fill=mezcla(base_col, HOJA_OSCURA, 0.35))      # medio limbo en sombra
        lz.linea([(bx, by), punta], mezcla(base_col, (230, 245, 200), 0.4), 0.35)          # nervio central
        lz.poli([(bx, by)] + izq + [punta] + der, outline=mezcla(TINTA, base_col, 0.25), ancho=0.4)
    # 7. polvo rojizo en la parte baja de la maceta
    lz.velo([(x - hb, bot - 4), (x + hb, bot - 4), (x + hb, bot + 2), (x - hb, bot + 2)], (184, 96, 70, 26))


def muro_cara(P, lado, u0, u1, z0, z1, filas):
    """Polígono sobre un muro del fondo: lado 'n' (a lo largo de c, en r=0) u 'o' (a lo largo de r, en c=0)."""
    if lado == "n":
        return [P(u0, 0, z0), P(u1, 0, z0), P(u1, 0, z1), P(u0, 0, z1)]
    return [P(0, u0, z0), P(0, u1, z0), P(0, u1, z1), P(0, u0, z1)]


def ventana(lz, P, lado, u0, u1, semilla):
    """Ventana al exterior con muro grueso: atardecer azul y una butte en el horizonte."""
    z0, z1 = 34, 104
    hueco = muro_cara(P, lado, u0, u1, z0, z1, 0)
    lz.poli(hueco, fill=V0)
    interior = muro_cara(P, lado, u0 + 0.08, u1 - 0.08, z0 + 4, z1 - 6, 0)
    for k, c in enumerate(CIELO[3:]):
        za, zb = z1 - 6 - (z1 - z0 - 10) * k / 4, z1 - 6 - (z1 - z0 - 10) * (k + 1) / 4
        lz.poli(muro_cara(P, lado, u0 + 0.08, u1 - 0.08, zb, za, 0), fill=c)
    um = (u0 + u1) / 2 + (0.3 if semilla % 2 else -0.3)
    lz.poli(muro_cara(P, lado, um - 0.35, um + 0.35, z0 + 4, z0 + 14, 0), fill=(84, 52, 84))     # butte de cima plana
    lz.poli(muro_cara(P, lado, u0 + 0.08, u1 - 0.08, z0 + 4, z0 + 7, 0), fill=(54, 28, 50))
    a, b = P(*(((u0 + 0.6, 0) if lado == "n" else (0, u0 + 0.6))), z1 - 8), P(*(((u0 + 0.4, 0) if lado == "n" else (0, u0 + 0.4))), z0 + 6)
    lz.linea([a, b], (130, 140, 210), 1.2)                                                         # reflejo
    lz.poli(hueco, outline=TINTA, ancho=2.5)
    lz.poli(muro_cara(P, lado, u0, u1, z0 - 4, z0, 0), fill=V4, outline=TINTA, ancho=1)            # alféizar


def puerta_fondo(lz, P, lado, pos, etiqueta, ac, largo=None):
    hueco = muro_cara(P, lado, pos + 0.08, pos + 0.92, 0, 92, 0)
    lz.poli(hueco, fill=(30, 26, 66))
    lz.poli(muro_cara(P, lado, pos + 0.3, pos + 0.7, 18, 70, 0), fill=(52, 46, 110))
    lz.poli(muro_cara(P, lado, pos + 0.4, pos + 0.6, 30, 58, 0), fill=(250, 220, 150))           # luz al fondo
    lz.poli(hueco, outline=ROSA, ancho=3)
    lz.poli(muro_cara(P, lado, pos + 0.02, pos + 0.98, 92, 100, 0), fill=ac, outline=TINTA, ancho=1.2)
    x, y = P(*((pos + 0.5, 0) if lado == "n" else (0, pos + 0.5)), 112)
    if largo:                                         # el rótulo no se sale del muro (en la esquina se desplaza hacia dentro)
        mitad = PM.fuente(int(9 * K)).getlength(etiqueta) / K / 2 + 4
        if lado == "n":
            borde = P(largo, 0, 112)[0]
            x = min(x, borde - mitad)
        else:
            borde = P(0, largo, 112)[0]
            x = max(x, borde + mitad)
    lz.texto_plano(x, y, etiqueta, 9, PM.LUZ, lado, contorno=TINTA)


AGRUPABLES = {"cajas", "bidon", "taquilla", "torre", "maquina"}   # pueden ir juntos en grupo


def validar(id_z, z):
    """Comprueba que la sala se pueda jugar, con las huellas REALES de los objetos (no casillas enteras):
    objetos dentro y sin montarse, separados al menos 0,26 m (salvo grupos), puertas y estaciones despejadas,
    el astronauta (radio 0,35 m) llega a cada puerta y a cada estación, no quedan rincones a los que no se llega
    y no más del 35 % del suelo está ocupado."""
    cols, filas = z["cols"], z["filas"]
    sist, sala = z["sistema"], z["nombre"]
    errores = []
    rejilla = [[None] * cols for _ in range(filas)]
    cajas = []
    for i, (tipo, c, r, w, h) in enumerate(z["objetos"]):
        for rr in range(r, r + h):
            for cc in range(c, c + w):
                if not (0 <= cc < cols and 0 <= rr < filas):
                    errores.append(f"{tipo} {c},{r} se sale de la sala")
                elif rejilla[rr][cc] is not None:
                    errores.append(f"{tipo} {c},{r} se monta sobre {z['objetos'][rejilla[rr][cc]][0]}")
                else:
                    rejilla[rr][cc] = i
        cajas.append((tipo, (c, r), huella(tipo, sist, sala, c, r, w, h)))
    for i, (ta, pa, a) in enumerate(cajas):                         # separación real entre objetos distintos
        for tb, pb, b in cajas[i + 1:]:
            sep = max(b[0] - a[2], a[0] - b[2], b[1] - a[3], a[1] - b[3])
            if sep < 0.2 and not (ta == tb and ta in AGRUPABLES):
                errores.append(f"{ta} {pa} y {tb} {pb} están amontonados ({sep * 1.3:.2f} m entre ellos)")
    R, paso = 0.27, 0.125
    def cabe(pc, pr):
        if not (R <= pc <= cols - R and R <= pr <= filas - R):
            return False
        return all(pc + R <= o[0] or pc - R >= o[2] or pr + R <= o[1] or pr - R >= o[3] for _, _, o in cajas)
    puntos = {(i, j) for i in range(int(cols / paso) + 1) for j in range(int(filas / paso) + 1) if cabe(i * paso, j * paso)}
    entradas = []
    for lado, pos, _, _ in z["puertas"]:
        e = {"n": (pos + 0.5, 0.6), "s": (pos + 0.5, filas - 0.6), "o": (0.6, pos + 0.5), "e": (cols - 0.6, pos + 0.5)}[lado]
        q = (round(e[0] / paso), round(e[1] / paso))
        if q not in puntos:
            errores.append(f"la puerta {lado}{pos} está tapada")
        entradas.append(q)
    vistos = set()
    if entradas and entradas[0] in puntos:
        pila = [entradas[0]]
        vistos.add(entradas[0])
        while pila:
            i, j = pila.pop()
            for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                n = (i + di, j + dj)
                if n in puntos and n not in vistos:
                    vistos.add(n)
                    pila.append(n)
    for q in entradas[1:]:
        if q in puntos and q not in vistos:
            errores.append("no se llega de una puerta a otra")
    for letra, c, r in z["estaciones"]:
        if any(not (c + 1 <= o[0] or c >= o[2] or r + 1 <= o[1] or r >= o[3]) for _, _, o in cajas):
            errores.append(f"estación {letra} debajo de un objeto")
        if not any(math.hypot(i * paso - (c + 0.5), j * paso - (r + 0.5)) <= 0.7 for i, j in vistos):
            errores.append(f"a la estación {letra} {c},{r} no se llega")
    sueltos = (len(puntos) - len(vistos)) * paso * paso
    if sueltos > 0.3:
        errores.append(f"hay {sueltos * 1.69:.1f} m² de suelo a los que no se llega")
    ocupado = sum((o[2] - o[0]) * (o[3] - o[1]) for _, _, o in cajas) / (cols * filas)
    if ocupado > 0.35:
        errores.append(f"demasiado llena ({ocupado:.0%} ocupado, máximo 35 %)")
    if errores:
        raise SystemExit(f"Sala '{id_z}' no se puede jugar bien:\n  - " + "\n  - ".join(errores))
    return ocupado


def compuerta_pixeles(id_z, dibujos, marcas, ancho, alto, limite_obj=0.06, limite_marca=0.03):
    """Mide en píxeles (no a ojo) que los objetos no se amontonen: cuánto tapa cada dibujo a otro objeto,
    a una puerta, una ventana, la decoración del muro o una estación."""
    tam = (int(ancho * FINAL), int(alto * FINAL))
    capas = {k: np.asarray(v.reducir().getchannel("A")) > 60 for k, v in marcas.items()}
    mascaras = []
    for tipo, pos, img, x, y in dibujos:
        m = np.zeros(tam[::-1], bool)
        a = np.asarray(img.getchannel("A")) > 60
        h, w = a.shape
        x0, y0 = max(0, x), max(0, y)
        x1, y1 = min(tam[0], x + w), min(tam[1], y + h)
        m[y0:y1, x0:x1] = a[y0 - y:y1 - y, x0 - x:x1 - x]
        mascaras.append((tipo, pos, m, max(1, int(m.sum()))))
    errores, informe = [], []
    for i, (ta, pa, ma, aa) in enumerate(mascaras):
        for tb, pb, mb, ab in mascaras[i + 1:]:
            solape = int((ma & mb).sum()) / min(aa, ab)
            if solape > limite_obj and not (ta == tb and ta in AGRUPABLES):
                errores.append(f"{ta} {pa} y {tb} {pb} se tapan un {solape:.0%}")
        for nombre, capa in capas.items():
            tapa = int((ma & capa).sum()) / aa
            if tapa > limite_marca:
                errores.append(f"{ta} {pa} tapa {nombre} ({tapa:.0%} del dibujo)")
    if errores:
        raise SystemExit(f"Sala '{id_z}': se amontona (medido en píxeles):\n  - " + "\n  - ".join(errores))
    print(f"  {id_z}: compuerta en píxeles en verde ({len(mascaras)} objetos)")


CACHE = Path(__file__).parent / ".cache"


def render_protagonista(clave_p, c, r, ax_l, ay_l, Lw=240, Lh=200):
    """Dibuja una estación a 4× (K = 16) y la reduce al doble de su escala de ficha: 1 imagen + 4 cuadros de animación.
    Se guarda en caché (herramientas/.cache): la clave incluye todo el código de dibujo, así que un cambio la invalida."""
    import hashlib
    fuente = Path(__file__).read_text(encoding="utf-8")
    fuente = fuente[:fuente.index("def objeto(lz, P, tipo")]
    h = hashlib.sha1(f"{fuente}|{clave_p}|{c}|{r}|{ax_l}|{ay_l}|{Lw}|{Lh}|{K_ALTO}|{ESCALA_MUNDO}|{FINAL}".encode()).hexdigest()[:16]
    ruta = CACHE / f"{clave_p}_{h}.png"
    if ruta.exists():
        hoja = Image.open(ruta).convert("RGBA")
        w = hoja.width // 5
        tiras = [hoja.crop((k * w, 0, (k + 1) * w, hoja.height)) for k in range(5)]
        return tiras[0], tiras[1:]
    Pl = Iso(ax_l - ((c + 0.5) - (r + 0.46)) * TW / 2, ay_l - ((c + 0.5) + (r + 0.46)) * TH / 2)
    salida = []
    for cuadro in (None, 0, 1, 2, 3):                 # la imagen fija y la animación: 4 cuadros a 12 fps
        with resolucion(K_ALTO * 2):
            lz = Lienzo(Lw, Lh)
            protagonista(lz, Pl, clave_p, c, r, 1, 1, cuadro=cuadro)
            im = lz.reducir(FINAL * ESCALA_MUNDO)
            lz = None
        salida.append(brillo_emisivo(im, px=5 * FINAL * ESCALA_MUNDO))   # el halo, ya reducido (gasta 16 veces menos memoria)
    CACHE.mkdir(exist_ok=True)
    hoja = Image.new("RGBA", (salida[0].width * 5, salida[0].height), (0, 0, 0, 0))
    for k, im in enumerate(salida):
        hoja.paste(im, (k * salida[0].width, 0))
    hoja.save(ruta)
    return salida[0], salida[1:]


def pintar_zona(id_z, z):
    cols, filas = z["cols"], z["filas"]
    ancho = (cols + filas) * TW / 2 + 2 * MX
    alto = MARR + (cols + filas) * TH / 2 + LOSA + MABA
    P = Iso(MX + filas * TW / 2, MARR)
    sala = z["nombre"]
    sist = z["sistema"]
    ac = ACENTO.get(sist, (176, 168, 236))
    semilla = sum(map(ord, id_z))

    fondo = Lienzo(ancho, alto, (0, 0, 0, 255))
    frente = Lienzo(ancho, alto)
    # máscaras de lo que no se puede tapar (para la compuerta en píxeles)
    marcas = {k: Lienzo(ancho, alto) for k in ("puerta", "ventana", "decoración del muro", "estación")}
    paisaje_iso(fondo, P, ancho, alto, cols, filas, z, semilla)

    bloq = [[0] * cols for _ in range(filas)]
    for tipo, c, r, w, h in z["objetos"]:
        for rr in range(r, r + h):
            for cc in range(c, c + w):
                bloq[rr][cc] = 1
    puertas = z["puertas"]

    # losa de la base (las caras delanteras se ven) y su sombra en el suelo marciano
    sombra = [P(0, filas, -LOSA), P(cols, filas, -LOSA), P(cols, 0, -LOSA), P(cols + 0.6, 0.3, -LOSA - 6), P(cols + 0.6, filas + 0.6, -LOSA - 6), P(0.3, filas + 0.6, -LOSA - 6)]
    fondo.poli(sombra, fill=(92, 52, 44))
    fondo.rayado(sombra, (60, 32, 30), 4, -60, 0.9)
    for cara, color in (([P(0, filas, 0), P(cols, filas, 0), P(cols, filas, -LOSA), P(0, filas, -LOSA)], V2),
                        ([P(cols, filas, 0), P(cols, 0, 0), P(cols, 0, -LOSA), P(cols, filas, -LOSA)], V1)):
        fondo.poli(cara, fill=color, outline=TINTA, ancho=2)
    for zz in range(-LOSA + 4, 0, 4):                           # capas de la impresión 3D
        fondo.linea([P(0, filas, zz), P(cols, filas, zz)], PM.NERVIO, 0.8)
        fondo.linea([P(cols, filas, zz), P(cols, 0, zz)], V0, 0.8)

    # suelo: paneles de 2 x 2, luz en círculos planos
    piso = [P(0, 0), P(cols, 0), P(cols, filas), P(0, filas)]
    color_suelo = PM.INV_SUELO if sala == "Invernadero" else PM.SUELO
    junta = PM.INV_REJILLA if sala == "Invernadero" else PM.SUELO_JUNTA
    fondo.poli(piso, fill=color_suelo)
    rp = random.Random(semilla + 5)
    for pc in range(0, cols, 2):                                   # cada panel de 2 x 2 con su tono
        for pr in range(0, filas, 2):
            t = rp.uniform(-0.05, 0.05)
            col = mezcla(color_suelo, (255, 255, 255), t) if t > 0 else mezcla(color_suelo, V0, -t)
            pw, ph = min(2, cols - pc), min(2, filas - pr)
            fondo.poli([P(pc + 0.03, pr + 0.03), P(pc + pw - 0.03, pr + 0.03), P(pc + pw - 0.03, pr + ph - 0.03), P(pc + 0.03, pr + ph - 0.03)], fill=col)
            fondo.rayado([P(pc + 0.03, pr + 0.03), P(pc + pw - 0.03, pr + 0.03), P(pc + pw - 0.03, pr + ph - 0.03), P(pc + 0.03, pr + ph - 0.03)],
                         mezcla(col, (255, 255, 255), 0.05), 5, ANG_D, 0.4)                       # textura antideslizante
            fondo.linea([P(pc + 0.04, pr + ph - 0.04), P(pc + 0.04, pr + 0.04), P(pc + pw - 0.04, pr + 0.04)], mezcla(col, (255, 255, 255), 0.18), 0.8)   # bisel
            for u, v in ((0.15, 0.15), (pw - 0.15, 0.15), (0.15, ph - 0.15), (pw - 0.15, ph - 0.15)):
                x, y = P(pc + u, pr + v)
                fondo.elipse(x - 1.3, y - 0.7, x + 1.3, y + 0.7, fill=mezcla(col, V0, 0.4))
            if rp.random() < 0.5:                                  # marcas de uso (rozaduras de botas y carritos)
                u, v = rp.uniform(0.3, pw - 0.3), rp.uniform(0.3, ph - 0.3)
                fondo.linea([P(pc + u, pr + v), P(pc + u + rp.uniform(0.2, 0.6), pr + v + rp.uniform(-0.1, 0.1))], mezcla(col, V0, 0.18), 1)
    for lc, lr in z["lamparas"]:                                   # luz de las lámparas: velos que dejan ver la textura
        for rad, alfa in ((2.6, 30), (1.9, 34), (1.2, 46)):
            pts = [P(lc + math.cos(a) * rad, lr + math.sin(a) * rad) for a in np.linspace(0, math.tau, 48)]
            fondo.velo(pts, ((255, 210, 250) if sala == "Invernadero" else (236, 232, 255)) + (alfa,))
    for k in range(0, cols + 1, 2):
        fondo.linea([P(k, 0), P(k, filas)], junta, 1)
    for k in range(0, filas + 1, 2):
        fondo.linea([P(0, k), P(cols, k)], junta, 1)
    # sombra de los muros del fondo sobre el suelo, rayada
    fondo.rayado([P(0, 0), P(cols, 0), P(cols, 0.45), P(0.45, 0.45), P(0.45, filas), P(0, filas)], PM.NERVIO, 4, -60, 0.9)
    # alfombra / zona marcada según la sala
    for e, c, r in z["estaciones"]:
        if sala == "Refugio":
            fondo.poli([P(c - 1, r - 1), P(c + 2, r - 1), P(c + 2, r + 2), P(c - 1, r + 2)], outline=(181, 140, 255), ancho=1.6)
            x, y = P(c + 0.5, r + 2.4)
            fondo.texto_plano(x, y, "ZONA SEGURA", 8, (181, 140, 255), "suelo")
        if sala == "Mando":
            pts = [P(c + 0.5 + math.cos(a) * 1.4, r + 0.5 + math.sin(a) * 1.4) for a in np.linspace(0, math.tau, 40)]
            fondo.poli(pts, fill=mezcla(PM.SUELO, ROSA, 0.25), outline=ROSA, ancho=1.2)

    detalle_suelo(fondo, P, z, sala, cols, filas, semilla)

    # muros del fondo: impresos en 3D, con ventanas, puertas y decoración de la sala
    muro_n = [P(0, 0, 0), P(cols, 0, 0), P(cols, 0, MURO), P(0, 0, MURO)]
    muro_o = [P(0, 0, 0), P(0, filas, 0), P(0, filas, MURO), P(0, 0, MURO)]
    fondo.poli(muro_n, fill=(118, 110, 196))
    fondo.poli(muro_o, fill=V2)
    for zz in range(4, MURO, 4):
        fondo.linea([P(0, 0, zz), P(cols, 0, zz)], PM.NERVIO if zz % 8 else (104, 96, 178), 0.7)
        fondo.linea([P(0, 0, zz), P(0, filas, zz)], V1, 0.7)
    for u in range(1, cols):                                       # juntas verticales entre paneles del muro
        fondo.linea([P(u, 0, 4), P(u, 0, MURO - 4)], PM.NERVIO, 0.9)
        fondo.linea([P(u + 0.02, 0, 4), P(u + 0.02, 0, MURO - 4)], (150, 142, 220), 0.5)
        for zz in (10, MURO - 10):
            x, y = P(u - 0.06, 0, zz)
            fondo.elipse(x - 1.2, y - 1.2, x + 1.2, y + 1.2, fill=PM.NERVIO)
    for v in range(1, filas):
        fondo.linea([P(0, v, 4), P(0, v, MURO - 4)], V1, 0.9)
    for lado, largo in (("n", cols), ("o", filas)):                # zócalo con su sombra
        fondo.poli(muro_cara(P, lado, 0, largo, 0, 7, 0), fill=V1, outline=TINTA, ancho=0.6)
        fondo.velo(muro_cara(P, lado, 0, largo, 7, 18, 0), V0 + (40,))
    fondo.velo(muro_n[:2] + [P(cols, 0, MURO * 0.5), P(0, 0, MURO * 0.5)], V0 + (22,))        # el muro se oscurece hacia abajo
    fondo.velo(muro_o[:2] + [P(0, filas, MURO * 0.5), P(0, 0, MURO * 0.5)], V0 + (30,))
    fondo.linea([P(0, 0, 0), P(0, 0, MURO)], TINTA, 1.6)
    for lado, largo in (("n", cols), ("o", filas)):            # franja de color de la sala
        fondo.poli(muro_cara(P, lado, 0, largo, 112, 116, 0), fill=ac)
    huecos = {("n" if p[0] == "n" else "o", p[1]) for p in puertas if p[0] in "no"}
    for lado, largo in (("n", cols),):
        u = 1
        while u + 1.4 <= largo:
            tapada = any(t_ != "maquina_baja" and alto_real(t_, sist, sala) > 0.7 and r_ < 2 and c_ < u + 1.8 and c_ + w_ > u - 0.4
                         for t_, c_, r_, w_, h_ in z["objetos"])
            if tapada:
                u += 1
                continue
            if not any(l == lado and abs(pos + 0.5 - (u + 0.7)) < 1.4 for l, pos in huecos):
                ventana(fondo, P, lado, u, u + 1.4, semilla + int(u))
                ventana(marcas["ventana"], P, lado, u, u + 1.4, semilla + int(u))
                u += 3
            else:
                u += 1
    for i, (lado, pos, destino, _) in enumerate(puertas):
        if lado in "no":
            largo = cols if lado == "n" else filas
            puerta_fondo(fondo, P, lado, pos, NOMBRE_VISIBLE[destino], ACENTO.get(ZONAS[destino]["sistema"], (176, 168, 236)), largo)
            puerta_fondo(marcas["puerta"], P, lado, pos, NOMBRE_VISIBLE[destino], (255, 255, 255), largo)
    for zz, col in ((20, mezcla(ACENTO["oxigeno"], V0, 0.45)), (26, (150, 146, 140))):
        fondo.poli(muro_cara(P, "n", 0.1, cols - 0.1, zz, zz + 4, 0), fill=col, outline=TINTA, ancho=0.8)
    for u in range(1, cols, 3):
        if not any(l == "n" and abs(pos + 0.5 - u) < 1 for l, pos in huecos):
            fondo.poli(muro_cara(P, "n", u - 0.06, u + 0.06, 18, 32, 0), fill=V1, outline=TINTA, ancho=0.6)   # abrazadera
    decorar_muro(fondo, P, sala, cols, filas, ac)
    decorar_muro(marcas["decoración del muro"], P, sala, cols, filas, ac)
    # tapa de los muros
    fondo.poli([P(0, 0, MURO), P(cols, 0, MURO), P(cols + 0.12, -0.25, MURO), P(-0.25, -0.25, MURO), P(-0.25, filas + 0.12, MURO), P(0, filas, MURO)],
               fill=PM.MURO_TAPA, outline=TINTA, ancho=2)
    fondo.poli(muro_n, outline=TINTA, ancho=2)
    fondo.poli(muro_o, outline=TINTA, ancho=2)

    # estaciones: placa en el suelo con su pictograma
    estaciones = []
    for letra, c, r in z["estaciones"]:
        nombre, accion, sistema, etiqueta = ESTACIONES[letra]
        a2 = ACENTO.get(sistema, PM.LUZ)
        placa = [P(c + 0.15, r + 0.15, 2), P(c + 0.85, r + 0.15, 2), P(c + 0.85, r + 0.85, 2), P(c + 0.15, r + 0.85, 2)]
        caja(fondo, P, c + 0.15, r + 0.15, 0.7, 0.7, 0, 4, PM.MURO_FRENTE, V2, V1, 1.4)
        fondo.poli([P(c + 0.25, r + 0.25, 4), P(c + 0.75, r + 0.25, 4), P(c + 0.75, r + 0.75, 4), P(c + 0.25, r + 0.75, 4)],
                   fill=mezcla(a2, V0, 0.65), outline=a2, ancho=1)
        x, y = P(c + 0.5, r + 0.5, 4)
        PM.pictograma(PM.Pincel(fondo.d), nombre, x, y)
        marcas["estación"].poli([P(c - 0.05, r - 0.05), P(c + 1.05, r - 0.05), P(c + 1.05, r + 1.05), P(c - 0.05, r + 1.05)], fill=(255, 255, 255))
        estaciones.append(dict(nombre=nombre, accion=accion, sistema=sistema, etiqueta=etiqueta, c=c, r=r))

    # puertas en los bordes delanteros: umbral que sale de la losa, con el nombre del destino
    for lado, pos, destino, _ in puertas:
        if lado == "s":
            umbral = [P(pos + 0.1, filas), P(pos + 0.9, filas), P(pos + 0.9, filas + 1.1), P(pos + 0.1, filas + 1.1)]
            fondo.poli(umbral, fill=PM.SUELO_BRILLO, outline=TINTA, ancho=1.6)
            marcas["puerta"].poli([P(pos, filas - 1.2), P(pos + 1, filas - 1.2), P(pos + 1, filas + 1.1), P(pos, filas + 1.1)], fill=(255, 255, 255))
            for v in (0.35, 0.75):
                fondo.linea([P(pos + 0.25, filas + v), P(pos + 0.75, filas + v)], ROSA, 2)
            x, y = P(pos + 0.5, filas + 1.6)
            fondo.texto(x, y, "▼ " + NOMBRE_VISIBLE[destino], 9, PM.LUZ)
        elif lado == "e":
            umbral = [P(cols, pos + 0.1), P(cols + 1.1, pos + 0.1), P(cols + 1.1, pos + 0.9), P(cols, pos + 0.9)]
            fondo.poli(umbral, fill=PM.SUELO_BRILLO, outline=TINTA, ancho=1.6)

    # murete delantero (capa de delante), con huecos en las puertas
    def murete(tramos_s, tramos_e):
        for c0, c1 in tramos_s:
            caja(frente, P, c0, filas - 0.14, c1 - c0, 0.14, 0, BAJO, PM.MURO_TAPA, V3, V2, 1.6)
        for r0, r1 in tramos_e:
            caja(frente, P, cols - 0.14, r0, 0.14, r1 - r0, 0, BAJO, PM.MURO_TAPA, V3, V2, 1.6)

    def tramos(largo, huecos_l):
        res, u = [], 0
        for h in sorted(huecos_l):
            if h > u:
                res.append((u, h))
            u = h + 1
        if u < largo:
            res.append((u, largo))
        return res
    murete(tramos(cols, [p[1] for p in puertas if p[0] == "s"]), tramos(filas, [p[1] for p in puertas if p[0] == "e"]))

    # objetos: sombra en el suelo (fondo) y dibujo aparte (props)
    props, dibujos = [], []
    for i, (tipo, c, r, w, h) in enumerate(z["objetos"]):
        prota = es_protagonista(tipo, sist)
        k_esc = ESCALA_MUNDO if prota else escala_utileria(tipo, sala)
        uniforme = prota or tipo in UNIFORMES
        caja_real = huella(tipo, sist, sala, c, r, w, h)
        if not prota:                                 # los protagonistas dibujan su propia sombra (capa 1)
            a0, b0, a1, b1 = caja_real
            sx = (a1 - a0) * 0.4
            fondo.sombra_suave([P(a0 + 0.03, b1 + 0.02), P(a1 + sx, b1 + 0.02), P(a1 + sx * 1.2, b1 - (b1 - b0) * 0.3),
                                P(a1 + sx * 1.2, b0 + 0.1), P(a1, b0 - 0.02)], (40, 30, 90), 0.42, 6 * max(0.4, k_esc))   # sombra arrojada
            fondo.sombra_suave([P(a0, b0), P(a1, b0), P(a1, b1), P(a0, b1)], (30, 22, 70), 0.6, 2.2 * max(0.5, min(1.5, k_esc)))   # contacto
        zmax = 190
        esq = [P(c, r), P(c + w, r), P(c + w, r + h), P(c, r + h)]
        x0 = min(p[0] for p in esq) - 50
        x1 = max(p[0] for p in esq) + 50
        y0 = min(p[1] for p in esq) - zmax
        y1 = max(p[1] for p in esq) + 8
        cuadros = []
        if prota:
            # protagonistas: dibujados a su escala de ficha (22,6 px/m) y colocados al doble, centrados en su huella
            ax_l, ay_l = 120, 160
            img, cuadros = render_protagonista(clave_protagonista(tipo, sist, sala), c, r, ax_l, ay_l)
            gx, gy = P(c + w / 2, r + h / 2)
            x0, y0 = gx - ax_l * ESCALA_MUNDO, gy - ay_l * ESCALA_MUNDO
        else:
            with resolucion(K_ALTO if (uniforme and k_esc < 0.99) else K):
                lz = Lienzo(x1 - x0, y1 - y0)
                Pl = Iso(P.ox - x0, P.oy - y0)
                if uniforme:
                    lz.grosor = min(2.6, max(1.0, 0.55 / k_esc))   # que la tinta no se pierda al encoger
                    objeto(lz, Pl, tipo, c, r, w, h, sist, sala)
                else:
                    objeto(lz, IsoZ(Pl, k_esc), tipo, c, r, w, h, sist, sala)   # solo se estira el alto
                lz.img = brillo_emisivo(lz.img)
                img = lz.reducir()
                if uniforme and k_esc < 0.99:         # encoger desde el centro de la huella en el suelo
                    gx, gy = Pl(c + w / 2, r + h / 2)
                    nuevo = img.resize((max(1, int(img.width * k_esc)), max(1, int(img.height * k_esc))), Image.LANCZOS)
                    lienzo_e = Image.new("RGBA", img.size, (0, 0, 0, 0))
                    lienzo_e.alpha_composite(nuevo, (int(round(gx * FINAL * (1 - k_esc))), int(round(gy * FINAL * (1 - k_esc)))))
                    img = lienzo_e
        if prota:
            img = grano_final(img, semilla + i)
        bb = img.getbbox() or (0, 0, 1, 1)
        img = img.crop(bb)
        clave = f"prop_{id_z}_{i}"
        (SALIDA / "props").mkdir(parents=True, exist_ok=True)
        colores = 256 if prota else 128
        img.quantize(colors=colores, method=Image.Quantize.FASTOCTREE).save(SALIDA / "props" / f"{id_z}_{i}.png", optimize=True)
        prop = dict(clave=clave, archivo=f"assets/zonas/props/{id_z}_{i}.png", tipo=tipo, c=c, r=r, w=w, h=h,
                    x=round(x0 + bb[0] / FINAL, 1), y=round(y0 + bb[1] / FINAL, 1),
                    caja=[round(v, 3) for v in caja_real], escala=round(k_esc, 3))
        if cuadros:                                   # hoja de sprites: los 4 cuadros en fila, del tamaño del objeto
            hoja_a = Image.new("RGBA", (img.width * 4, img.height), (0, 0, 0, 0))
            for k, cd in enumerate(cuadros):
                hoja_a.alpha_composite(cd.crop(bb), (k * img.width, 0))
            hoja_a.save(SALIDA / "props" / f"{id_z}_{i}_anim.png", optimize=True)
            prop.update(anim=f"assets/zonas/props/{id_z}_{i}_anim.png", animClave=f"{clave}_anim",
                        cuadros=4, fps=12, fw=img.width, fh=img.height)
        props.append(prop)
        dibujos.append((tipo, (c, r), img, int(round((x0 + bb[0] / FINAL) * FINAL)), int(round((y0 + bb[1] / FINAL) * FINAL))))

    if os.environ.get("VISTA"):                       # vista previa montada (fondo + objetos + frente) para revisarla a ojo
        vista = fondo.reducir().convert("RGBA")
        for tipo, pos, img_d, xd, yd in sorted(dibujos, key=lambda d: d[1][0] + d[1][1]):
            vista.alpha_composite(img_d, (max(0, xd), max(0, yd)))
        vista.alpha_composite(frente.reducir())
        vista.convert("RGB").save(os.path.join(os.environ["VISTA"], f"{id_z}.jpg"), quality=88)
    compuerta_pixeles(id_z, dibujos, marcas, ancho, alto)

    # guardar: el fondo es opaco y va en JPG (pesa ~10 veces menos); el frente, en PNG sin grano
    img = fondo.reducir().convert("RGB")
    a = np.asarray(img).astype(np.float32) / 255
    ruido = np.random.default_rng(semilla).normal(0, 0.015, a.shape[:2]).astype(np.float32)   # grano de impresión
    a = np.clip(a + ruido[..., None], 0, 1)
    Image.fromarray((a * 255).astype(np.uint8)).save(SALIDA / f"{id_z}_fondo.jpg", quality=84, optimize=True, progressive=True)
    img = frente.reducir()
    bb_f = img.getbbox() or (0, 0, 1, 1)             # solo lo que tiene dibujo (el murete): ~10 veces menos memoria de video
    img.crop(bb_f).quantize(colors=96, method=Image.Quantize.FASTOCTREE).save(SALIDA / f"{id_z}_frente.png", optimize=True)

    return dict(id=id_z, nombre=sala, sistema=sist, cols=cols, rows=filas, ox=P.ox, oy=P.oy, ancho=ancho, alto=alto,
                horizonte=MARR - 40, muro=MURO, losa=LOSA,
                bloq=bloq, estaciones=estaciones, props=props,
                puertas=[dict(lado=l, pos=p, destino=d, llegada=ll, etiqueta=NOMBRE_VISIBLE[d]) for l, p, d, ll in puertas],
                lamparas=[list(l) for l in z["lamparas"]], inicio=list(z.get("inicio", (cols / 2, filas / 2))),
                fondo=f"assets/zonas/{id_z}_fondo.jpg", frente=f"assets/zonas/{id_z}_frente.png",
                frente_x=round(bb_f[0] / FINAL, 1), frente_y=round(bb_f[1] / FINAL, 1))


def cable(lz, P, pts, color, ancho=2.6):
    """Cable o tubería por el suelo, de casilla a casilla (curva suave)."""
    cur = []
    for (c0, r0), (c1, r1) in zip(pts, pts[1:]):
        for t in np.linspace(0, 1, 12, endpoint=False):
            cur.append(P(c0 + (c1 - c0) * t, r0 + (r1 - r0) * t))
    cur.append(P(*pts[-1]))
    lz.linea(cur, TINTA, ancho + 1.6)
    lz.linea(cur, color, ancho)
    lz.linea([(x - 0.6, y - 0.8) for x, y in cur], mezcla(color, (255, 255, 255), 0.4), 0.8)


def rejilla(lz, P, c, r):
    lz.poli([P(c + 0.2, r + 0.2), P(c + 0.8, r + 0.2), P(c + 0.8, r + 0.8), P(c + 0.2, r + 0.8)], fill=PM.SUELO_JUNTA, outline=TINTA, ancho=0.8)
    for k in range(1, 5):
        lz.linea([P(c + 0.2 + k * 0.12, r + 0.25), P(c + 0.2 + k * 0.12, r + 0.75)], V2, 0.8)


def detalle_suelo(lz, P, z, sala, cols, filas, semilla):
    """Lo que hay en el suelo de cada sala: cables a la estación, rejillas, charcos, marcas."""
    r = random.Random(semilla)
    est = [(c + 0.5, rr + 0.5) for _, c, rr in z["estaciones"]]
    maquinas = []
    for t, c, rr, w, h in z["objetos"]:
        if t in ("maquina", "torre", "antena"):
            a0, b0, a1, b1 = huella(t, z["sistema"], sala, c, rr, w, h)
            maquinas.append(((a0 + a1) / 2, b1 - 0.02))          # el cable sale del borde delantero real
    color = {"Energia": (64, 58, 46), "Comunicaciones": mezcla(ACENTO["comunicaciones"], V0, 0.45),
             "Soporte vital": mezcla(ACENTO["oxigeno"], V0, 0.4), "Invernadero": (70, 130, 170)}.get(sala, V1)
    if est:
        for m in maquinas:
            e = est[0]
            cable(lz, P, [m, ((m[0] + e[0]) / 2, max(m[1], e[1]) + 0.6), e], color)
            if sala == "Energia":
                cable(lz, P, [m, ((m[0] + e[0]) / 2, max(m[1], e[1]) + 0.6), e], PM.AMBAR, 0.8)
    libres = [(c, rr) for rr in range(filas) for c in range(cols) if not any(
        c >= oc and c < oc + ow and rr >= orr and rr < orr + oh for _, oc, orr, ow, oh in z["objetos"])
        and all(abs(c + 0.5 - ex) + abs(rr + 0.5 - ey) > 1.6 for ex, ey in est)]
    r.shuffle(libres)
    for c, rr in libres[:3]:
        rejilla(lz, P, c, rr)
    if sala == "Energia":                                       # zona de peligro alrededor de la bancada real
        for t, c, rr, w, h in z["objetos"]:
            if t == "maquina":
                a0, b0, a1, b1 = huella(t, z["sistema"], sala, c, rr, w, h)
                lz.poli([P(a0 - 0.08, b0 - 0.08), P(a1 + 0.08, b0 - 0.08), P(a1 + 0.08, b1 + 0.08), P(a0 - 0.08, b1 + 0.08)], outline=PM.AMBAR, ancho=1.4)
    if sala == "Invernadero":                                   # charcos y manguera
        for c, rr in libres[3:6]:
            pts = [P(c + 0.5 + math.cos(a) * 0.35, rr + 0.5 + math.sin(a) * 0.28) for a in np.linspace(0, math.tau, 16)]
            lz.poli(pts, fill=(60, 50, 120))
            x, y = P(c + 0.4, rr + 0.45)
            lz.linea([(x - 6, y), (x + 2, y - 1)], (150, 160, 230), 1)
    if sala == "Refugio":                                       # señal de radiación en el suelo
        _, sc, sr = z["estaciones"][0]
        c, rr = max(0, sc - 1), min(filas - 1, sr + 1)          # junto a la estación, siempre a la vista
        x, y = P(c + 0.5, rr + 0.5)
        lz.elipse(x - 16, y - 8, x + 16, y + 8, fill=PM.AMBAR, outline=TINTA, ancho=1)
        for a in (90, 210, 330):
            lz.d.pieslice([(x - 13) * K, (y - 6.5) * K, (x + 13) * K, (y + 6.5) * K], a - 30, a + 30, fill=TINTA)
        lz.elipse(x - 3, y - 1.5, x + 3, y + 1.5, fill=PM.AMBAR, outline=TINTA, ancho=0.8)
    if sala == "Pasillo":                                       # base de carga del robot y felpudo
        x, y = P(cols / 2, filas - 1.2)
        lz.elipse(x - 26, y - 13, x + 26, y + 13, fill=V2, outline=ACENTO["oxigeno"], ancho=1.6)
        lz.elipse(x - 14, y - 7, x + 14, y + 7, outline=ACENTO["oxigeno"], ancho=1)
        x, y = P(cols / 2, filas - 1.2 + 0.62)
        lz.texto_plano(x, y, "CARGA IA", 7, ACENTO["oxigeno"], "suelo")


def decorar_muro(lz, P, sala, cols, filas, ac):
    """Lo que identifica a cada sala, pintado en sus muros (como en el mapa anterior)."""
    pared = lambda u0, u1, z0, z1, lado="o": muro_cara(P, lado, u0, u1, z0, z1, 0)
    if sala == "Energia":
        x, y = P(0, 1.5, 70)
        lz.poli([(x - 12, y + 10), (x, y - 12), (x + 12, y + 16)], fill=PM.AMBAR, outline=TINTA, ancho=1.4)
        lz.linea([(x + 1, y - 4), (x - 2, y + 3), (x + 3, y + 3), (x, y + 10)], TINTA, 1.6)
        lz.poli(pared(3, 4.6, 40, 80), fill=(96, 92, 120), outline=TINTA, ancho=1.4)
        for k in range(4):
            lz.poli(pared(3.2 + k * 0.35, 3.4 + k * 0.35, 50, 70), fill=PM.AMBAR if k != 2 else (230, 80, 60))
    elif sala == "Mando":
        lz.poli(pared(1.2, 4.6, 36, 96), fill=(26, 22, 64), outline=TINTA, ancho=2)
        uc = 2.9
        en_muro = lambda du, z, rx, rz, n=36: [P(0, uc + du + rx * math.cos(t), z + rz * math.sin(t)) for t in np.linspace(0, math.tau, n)]
        lz.poli(en_muro(0, 70, 0.9, 20), outline=mezcla(ac, V0, 0.3), ancho=1)      # órbita
        lz.poli(en_muro(0, 70, 0.17, 8), fill=(214, 110, 70))                        # Marte
        lz.poli(en_muro(-0.75, 76, 0.07, 3), fill=PM.LUZ)                            # satélite
        x, y = P(0, uc, 44)
        lz.texto_plano(x, y, "SOL 04 · ÓRBITA", 7, ac, "o")
    elif sala == "Comunicaciones":
        for u in (0.4, 2.0):
            lz.poli(pared(u, u + 1.2, 46, 86), fill=(20, 30, 32), outline=TINTA, ancho=1.6)
            pts = [P(0, u + 0.1 + k * 0.068, 66 + 10 * math.sin(k * 0.9 + u)) for k in range(15)]
            lz.linea(pts, ac, 1.2)
        lz.poli(pared(filas - 1.5, filas - 0.3, 44, 92), fill=PAPEL, outline=TINTA, ancho=1.2)
        x, y = P(0, filas - 0.9, 70)
        lz.poli([(x - 12, y + 8), (x + 4, y - 10), (x + 12, y + 4)], outline=TINTA, ancho=1.2)
    elif sala == "Invernadero":
        for zz in (40, 70, 100):
            lz.poli(pared(0.3, filas - 0.3, zz, zz + 3), fill=(232, 96, 200))
            for k in range(int(filas * 2.5)):
                x, y = P(0, 0.5 + k * 0.38, zz - 6)
                lz.elipse(x - 6, y - 4, x + 6, y + 4, fill=PM.HOJA if k % 2 else PM.HOJA_CALIDA, outline=TINTA, ancho=0.6)
    elif sala == "Soporte vital":
        for zz in (46, 56):
            lz.poli(pared(0.2, filas - 0.2, zz, zz + 6), fill=mezcla(ac, V0, 0.35), outline=TINTA, ancho=1)
        for u, t in ((2, "O₂"), (4.5, "CO₂")):
            esfera = [P(0, u + 0.19 * math.cos(a), 80 + 9 * math.sin(a)) for a in np.linspace(0, math.tau, 28)]
            lz.poli(esfera, fill=PAPEL, outline=TINTA, ancho=1.2)
            lz.linea([P(0, u, 80), P(0, u - 0.1, 84)], (184, 71, 61), 1.2)      # aguja
            x, y = P(0, u, 64)
            lz.texto_plano(x, y, t, 8, PM.LUZ, "o", contorno=TINTA)
    elif sala == "Refugio":
        for k in range(int(filas / 0.9)):                       # paredes de agua: protegen de la radiación
            u = 0.2 + k * 0.9
            lz.poli(pared(u, u + 0.75, 20, 100), fill=(60, 110, 200), outline=TINTA, ancho=1.2)
            lz.linea([P(0, u + 0.1, 70), P(0, u + 0.4, 72), P(0, u + 0.65, 69)], (150, 200, 250), 1)
        x, y = P(0, filas / 2, 110)
        lz.texto_plano(x, y, "MUROS DE AGUA", 7, PM.LUZ, "o", contorno=TINTA)
    else:                                                        # pasillo / sala común
        x, y = P(0, filas / 2, 66)
        lz.poli(pared(filas / 2 - 1, filas / 2 + 1, 40, 92), fill=V0, outline=V4, ancho=2)
        lz.texto_plano(*P(0, filas / 2, 74), "SOL 04", 12, ROSA, "o")
        lz.texto_plano(*P(0, filas / 2, 56), "-63 °C · 38 % g", 7, V4, "o")


def main():
    SALIDA.mkdir(parents=True, exist_ok=True)
    solo = sys.argv[1:]
    ruta = SALIDA / "zonas.json"
    datos = json.loads(ruta.read_text(encoding="utf-8")) if ruta.exists() and solo else {"TW": TW, "TH": TH, "inicial": "pasillo", "zonas": {}}
    datos["escala_personajes"] = ESCALA_MUNDO          # astronauta y robot al doble (1 casilla = 1,3 m)
    datos["metros_por_casilla"] = round(CASILLA_M / ESCALA_MUNDO, 3)
    for id_z, z in ZONAS.items():
        ocupado = validar(id_z, z)                    # todas, aunque se pinte solo una
        if solo and id_z not in solo:
            continue
        print(f"  {id_z}: {ocupado:.0%} del suelo ocupado")
        datos["zonas"][id_z] = pintar_zona(id_z, z)
        print("pintada:", id_z)
    ruta.write_text(json.dumps(datos, ensure_ascii=False, indent=1), encoding="utf-8")
    print("zonas:", ", ".join(datos["zonas"]))


if __name__ == "__main__":
    main()
