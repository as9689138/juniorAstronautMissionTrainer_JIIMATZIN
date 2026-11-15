"""Cuatro escenas de prueba, una por cada imagen de referencia, para aprobar el estilo.

Uso:  python herramientas/escenas_estilo.py

Crea docs/propuestas/ (1920 x 1080):
  estilo_1_cartel.png    cartel pulp      -> portada del juego
  estilo_2_interior.png  interior violeta -> sala de la base
  estilo_3_carta.png     carta grabada    -> bitácora / datos de la misión
  estilo_4_comic.png     cómic entintado  -> escenas de la historia
  estilos.png            las cuatro juntas

No copian las referencias: toman su forma de dibujar y la usan con el contenido del juego
y con Marte real (cielo caramelo de día, atardecer azul, Fobos y Deimos pequeñas, sin anillos).
Las coordenadas de las escenas están en un lienzo de 1600 x 900; se dibuja a 2,4x y se reduce.
"""
import math
import random
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pintar_mapa import fuente  # noqa: E402  (misma tipografía que el mapa)

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "docs-internos" / "propuestas"
W, H = 1600, 900            # coordenadas de dibujo
SALIDA_TAM = (1920, 1080)   # tamaño final
SS = 2.4                    # se dibuja a 3840 x 2160 y se reduce

TINTA = (20, 16, 38)
NEGRO = (11, 11, 16)
CREMA = (243, 227, 195)
PAPEL = (233, 223, 200)
SELLO = (184, 71, 61)
LUZ_DESDE = (-0.72, -0.69)  # la luz viene de arriba a la izquierda (como en el mapa)


# --- Herramientas comunes ---------------------------------------------------------
class Lienzo:
    def __init__(self, fondo):
        self.img = Image.new("RGB", (int(W * SS), int(H * SS)), fondo)
        self.d = ImageDraw.Draw(self.img)

    @staticmethod
    def p(pts):
        return [(x * SS, y * SS) for x, y in pts]

    def poli(self, pts, fill=None, outline=None, ancho=0):
        if fill is not None:
            self.d.polygon(self.p(pts), fill=fill)
        if outline is not None and ancho:
            self.d.line(self.p(list(pts) + [pts[0]]), fill=outline, width=max(1, int(ancho * SS)), joint="curve")

    def linea(self, pts, color, ancho=1):
        self.d.line(self.p(pts), fill=color, width=max(1, int(ancho * SS)), joint="curve")

    def elipse(self, x0, y0, x1, y1, fill=None, outline=None, ancho=0):
        self.d.ellipse([x0 * SS, y0 * SS, x1 * SS, y1 * SS], fill=fill, outline=outline, width=int(ancho * SS))

    def rect(self, x0, y0, x1, y1, fill=None, outline=None, ancho=0):
        self.d.rectangle([x0 * SS, y0 * SS, x1 * SS, y1 * SS], fill=fill, outline=outline, width=int(ancho * SS))

    def arco(self, caja, a0, a1, color, ancho=1):
        self.d.arc([v * SS for v in caja], a0, a1, fill=color, width=max(1, int(ancho * SS)))

    def texto(self, x, y, t, tam, color, ancla="mm", nombre=None, borde=0, color_borde=None):
        from PIL import ImageFont
        f = None
        if nombre:
            try:
                f = ImageFont.truetype(nombre, int(tam * SS))
            except OSError:
                f = None
        f = f or fuente(int(tam * SS))
        self.d.text((x * SS, y * SS), t, font=f, fill=color, anchor=ancla,
                    stroke_width=int(borde * SS), stroke_fill=color_borde)

    def mascara(self, pts=None, elipse=None):
        m = Image.new("L", self.img.size, 0)
        dm = ImageDraw.Draw(m)
        if pts:
            dm.polygon(self.p(pts), fill=255)
        if elipse:
            dm.ellipse([v * SS for v in elipse], fill=255)
        return m

    def rayado(self, mascara, color, paso=6, angulo=45, grosor=1.2, cruzado=False, caja=None):
        """Líneas de grabado dentro de la máscara (solo en su caja, para ir rápido)."""
        bb = mascara.getbbox()
        if not bb:
            return
        x0, y0, x1, y1 = bb
        capa = Image.new("L", (x1 - x0, y1 - y0), 0)
        dc = ImageDraw.Draw(capa)
        L = (x1 - x0 + y1 - y0) * 2
        cx, cy = (x1 - x0) / 2, (y1 - y0) / 2
        for ang in ([math.radians(angulo), math.radians(angulo) + math.pi / 2] if cruzado else [math.radians(angulo)]):
            dx, dy = math.cos(ang), math.sin(ang)
            nx, ny = -dy, dx
            n = int(L / (paso * SS)) + 2
            for k in range(-n, n):
                px, py = cx + nx * k * paso * SS, cy + ny * k * paso * SS
                dc.line([(px - dx * L, py - dy * L), (px + dx * L, py + dy * L)], fill=255, width=max(1, int(grosor * SS)))
        m = np.asarray(capa).astype(np.float32) * np.asarray(mascara.crop(bb)).astype(np.float32) / 255
        self.img.paste(Image.new("RGB", capa.size, color), (x0, y0), Image.fromarray(m.astype(np.uint8)))

    def trama(self, oscuro, color, paso=9, angulo=45, fuerza=0.9):
        """Puntos de semitono: oscuro es un arreglo 0-1 del tamaño del lienzo."""
        h, w = oscuro.shape
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        a = math.radians(angulo)
        u = (xx * math.cos(a) + yy * math.sin(a)) % (paso * SS) - paso * SS / 2
        v = (-xx * math.sin(a) + yy * math.cos(a)) % (paso * SS) - paso * SS / 2
        r = paso * SS * 0.5 * np.sqrt(np.clip(oscuro, 0, 1)) * fuerza
        m = ((u * u + v * v) < r * r).astype(np.uint8) * 255
        self.img.paste(Image.new("RGB", self.img.size, color), (0, 0), Image.fromarray(m))

    def punteado(self, mascara, color, densidad=0.004, semilla=1, tam=(0.5, 1.3)):
        """Punteado de grabado: puntitos al azar dentro de la máscara (densidad por px de dibujo)."""
        bb = mascara.getbbox()
        if not bb:
            return
        m = np.asarray(mascara)
        r = np.random.default_rng(semilla)
        area = (bb[2] - bb[0]) * (bb[3] - bb[1]) / (SS * SS)
        n = int(area * densidad)
        xs = r.uniform(bb[0], bb[2], n).astype(int)
        ys = r.uniform(bb[1], bb[3], n).astype(int)
        ok = m[np.clip(ys, 0, m.shape[0] - 1), np.clip(xs, 0, m.shape[1] - 1)] > 0
        for x, y, t in zip(xs[ok], ys[ok], r.uniform(*tam, ok.sum())):
            self.d.ellipse([x - t * SS, y - t * SS, x + t * SS, y + t * SS], fill=color)

    def estrellas(self, n, caja, colores, semilla=1, banda=None):
        """Estrellas; con banda=(pendiente, y0, ancho) se juntan como una Vía Láctea."""
        r = random.Random(semilla)
        x0, y0, x1, y1 = caja
        for i in range(n):
            x = r.uniform(x0, x1)
            if banda and i % 2 == 0:
                m, b0, ancho = banda
                y = b0 + m * x + r.gauss(0, ancho)
                if not (y0 <= y <= y1):
                    continue
            else:
                y = r.uniform(y0, y1)
            t = r.choice((0.6, 0.8, 0.8, 1.0, 1.4, 2.0))
            self.elipse(x - t, y - t, x + t, y + t, fill=r.choice(colores))
        for _ in range(n // 40):                                   # destellos de 4 puntas
            x, y = r.uniform(x0, x1), r.uniform(y0, y1)
            L = r.uniform(5, 10)
            c = r.choice(colores)
            self.linea([(x - L, y), (x + L, y)], c, 1.2)
            self.linea([(x, y - L), (x, y + L)], c, 1.2)

    def grieta(self, x, y, largo, angulo, color, semilla, ancho=1.6, ramas=2):
        r = random.Random(semilla)
        pts = [(x, y)]
        a = math.radians(angulo)
        for _ in range(int(largo / 8)):
            a += r.uniform(-0.5, 0.5)
            x, y = x + math.cos(a) * 8, y + math.sin(a) * 8
            pts.append((x, y))
            if ramas and r.random() < 0.12:
                self.grieta(x, y, largo * 0.35, math.degrees(a) + r.choice((-40, 40)), color, semilla + 7, ancho * 0.7, ramas - 1)
        self.linea(pts, color, ancho)

    def roca(self, pts, luz, medio, sombra, tinta=TINTA, ancho=3, rayas=None, semilla=1, centro=None):
        """Roca facetada: triángulos desde un punto interior, cada uno con el tono que le da la luz."""
        cx = sum(p[0] for p in pts) / len(pts) if centro is None else centro[0]
        cy = sum(p[1] for p in pts) / len(pts) if centro is None else centro[1]
        cy += (max(p[1] for p in pts) - cy) * 0.25
        for i in range(len(pts)):
            a, b = pts[i], pts[(i + 1) % len(pts)]
            ex, ey = b[0] - a[0], b[1] - a[1]
            nx, ny = ey, -ex
            n = math.hypot(nx, ny) or 1
            brillo = (nx * LUZ_DESDE[0] + ny * LUZ_DESDE[1]) / n
            color = luz if brillo > 0.35 else medio if brillo > -0.2 else sombra
            tri = [(cx, cy), a, b]
            self.poli(tri, fill=color)
            if color == sombra and rayas:
                self.rayado(self.mascara(pts=tri), rayas, paso=4.5, angulo=-55, grosor=1, cruzado=brillo < -0.7)
            self.linea([(cx, cy), a], tinta, ancho * 0.35)
        self.punteado(self.mascara(pts=pts), tinta, 0.006, semilla)
        self.poli(pts, outline=tinta, ancho=ancho)

    def terminar(self, tintas, grano=0.03, semilla=5, tinta_corrida=True):
        img = self.img.resize(SALIDA_TAM, Image.LANCZOS)
        a = np.asarray(img).astype(np.float32) / 255
        hh, ww = a.shape[:2]
        if tintas:                                    # serigrafía: pocas tintas planas
            pal = Image.new("P", (1, 1))
            plano = [c for t in tintas for c in t]
            pal.putpalette(plano + plano[:3] * (256 - len(tintas)))
            q = Image.fromarray((a * 255).astype(np.uint8)).quantize(palette=pal, dither=Image.Dither.NONE)
            a = np.asarray(q.convert("RGB")).astype(np.float32) / 255
        if tinta_corrida:                             # tinta un poco corrida (imprenta)
            l = a.mean(axis=2)
            oscuro = l < 0.12
            corrida = np.roll(np.roll(oscuro, 2, 0), 2, 1) & ~oscuro
            a[corrida] = a[corrida] * 0.75 + np.array([0.35, 0.12, 0.30]) * 0.25
        r = np.random.default_rng(semilla)
        a += r.normal(0, grano, a.shape[:2])[..., None]
        manchas = ndimage.zoom(ndimage.gaussian_filter(r.normal(0, 1, (hh // 20 + 1, ww // 20 + 1)), 1.5), 20, order=1)[:hh, :ww]
        a *= (1 + 0.04 * manchas / (np.abs(manchas).max() + 1e-6))[..., None]
        return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))


def recortar(m1, m2):
    """Intersección de dos máscaras."""
    return Image.fromarray(np.minimum(np.asarray(m1), np.asarray(m2)))


def cresta(x0, x1, base, alto, semilla, picos=6, rugosidad=0.25, pasos=160):
    """Línea de montañas: lista de puntos (x, y) de izquierda a derecha."""
    r = random.Random(semilla)
    f = [r.uniform(0, 6.3) for _ in range(4)]
    pts = []
    for i in range(pasos + 1):
        t = i / pasos
        x = x0 + (x1 - x0) * t
        y = base - alto * (0.55 + 0.25 * math.sin(t * picos + f[0]) + 0.12 * math.sin(t * picos * 2.7 + f[1])
                           + rugosidad * 0.3 * math.sin(t * picos * 7.1 + f[2]) + rugosidad * 0.12 * math.sin(t * picos * 17 + f[3]))
        pts.append((x, y))
    return pts


def degradado_vertical(lz, y0, y1, c0, c1):
    for y in range(int(y0 * SS), int(y1 * SS)):
        t = (y / SS - y0) / max(1, y1 - y0)
        lz.d.line([(0, y), (W * SS, y)], fill=tuple(int(c0[i] + (c1[i] - c0[i]) * t) for i in range(3)))


def oscuridad_vertical(y0, y1, invertir=False):
    yy = np.linspace(0, H, int(H * SS))[:, None]
    t = np.clip((yy - y0) / (y1 - y0), 0, 1)
    t = 1 - t if invertir else t
    return np.repeat(t, int(W * SS), axis=1)


def luna_irregular(lz, cx, cy, r, color, sombra, semilla, crateres=3):
    """Fobos o Deimos: pequeñas y con forma de patata, nunca redondas ni con anillos."""
    rnd = random.Random(semilla)
    pts = []
    for i in range(22):
        a = i / 22 * math.tau
        rr = r * (0.82 + 0.22 * rnd.random()) * (1.18 if abs(math.cos(a)) > 0.7 else 1)
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr * 0.8))
    lz.poli(pts, fill=color, outline=TINTA, ancho=max(1.2, r * 0.07))
    lado_noche = [(cx + r * 0.15, cy - r), (cx + r * 1.4, cy - r), (cx + r * 1.4, cy + r), (cx + r * 0.15, cy + r)]
    lz.rayado(recortar(lz.mascara(pts=pts), lz.mascara(pts=lado_noche)), sombra, paso=max(2.5, r * 0.18), angulo=-50, grosor=0.8)
    for _ in range(crateres):
        ox, oy, rr = rnd.uniform(-0.5, 0.4) * r, rnd.uniform(-0.4, 0.4) * r, rnd.uniform(0.1, 0.22) * r
        lz.elipse(cx + ox - rr, cy + oy - rr * 0.8, cx + ox + rr, cy + oy + rr * 0.8, fill=sombra)


# --- 1. Cartel pulp: la portada ---------------------------------------------------------
def cartel():
    AMBAR, NARANJA, OXIDO, TEAL, TEAL_OSC = (242, 200, 75), (232, 84, 43), (170, 70, 46), (47, 143, 138), (22, 58, 66)
    ROJO_OSC, ROJO_MED, POLVO = (70, 22, 18), (120, 40, 30), (214, 160, 110)
    lz = Lienzo(NEGRO)
    degradado_vertical(lz, 300, 470, NEGRO, (16, 40, 48))                       # resplandor sobre el horizonte
    lz.estrellas(700, (0, 0, W, 450), [AMBAR, CREMA, AMBAR, (255, 255, 255)], semilla=3, banda=(-0.22, 330, 40))
    lz.elipse(1182, 140, 1188, 146, fill=(120, 180, 240))                        # la Tierra: un punto azul
    lz.texto(1196, 128, "TIERRA", 9, (120, 180, 240), ancla="lm")
    luna_irregular(lz, 1330, 120, 38, (176, 150, 120), (120, 96, 80), 4)          # Fobos
    luna_irregular(lz, 470, 92, 14, (176, 150, 120), (120, 96, 80), 9, crateres=1)  # Deimos
    # cordilleras: lejana teal con trama, media teal oscura con estratos
    lejos = cresta(0, W, 540, 190, semilla=2, picos=5)
    lz.poli([(0, H)] + lejos + [(W, H)], fill=TEAL)
    lz.trama(oscuridad_vertical(380, 620) * 0.85, TEAL_OSC, paso=7)
    lz.linea(lejos, TINTA, 3)
    medio = cresta(0, W, 610, 90, semilla=5, picos=9, rugosidad=0.6)
    lz.poli([(0, H)] + medio + [(W, H)], fill=TEAL_OSC)
    for k in range(1, 5):                                                         # estratos
        lz.linea([(x, y + k * 11) for x, y in medio[::2]], (12, 36, 42), 1.4)
    lz.linea([(x - 2, y - 2) for x, y in medio], TEAL, 2)                         # luz de borde
    lz.linea(medio, TINTA, 3)
    # llanura de óxido: punteado, cráteres con borde iluminado, piedras con sombra
    llano = cresta(0, W, 650, 30, semilla=7, picos=3, rugosidad=0.1)
    m_llano = lz.mascara(pts=[(0, H)] + llano + [(W, H)])
    lz.poli([(0, H)] + llano + [(W, H)], fill=OXIDO)
    lz.trama(oscuridad_vertical(660, 900) * 0.6, ROJO_MED, paso=6)
    lz.punteado(m_llano, ROJO_OSC, 0.02, 2)
    lz.linea(llano, TINTA, 3)
    for cx, cy, rx in ((330, 760, 80), (1170, 705, 52), (830, 830, 100), (640, 690, 30), (1420, 760, 40)):
        lz.elipse(cx - rx, cy - rx * 0.28, cx + rx, cy + rx * 0.28, fill=ROJO_MED, outline=TINTA, ancho=2.5)
        lz.rayado(lz.mascara(elipse=(cx - rx, cy - rx * 0.28, cx + rx * 0.2, cy + rx * 0.28)), ROJO_OSC, paso=3.5, angulo=-35, grosor=1)
        lz.arco((cx - rx, cy - rx * 0.28, cx + rx, cy + rx * 0.28), 15, 165, NARANJA, 3)
    r = random.Random(4)
    for _ in range(40):
        x, y, t = r.uniform(380, 1240), r.uniform(670, 880), r.uniform(3, 11)
        lz.elipse(x - t * 1.6, y + t * 0.2, x + t * 1.8, y + t * 0.7, fill=ROJO_OSC)
        lz.poli([(x - t, y + t * 0.4), (x - t * 0.6, y - t * 0.5), (x + t * 0.5, y - t * 0.6), (x + t, y + t * 0.4)],
                fill=NARANJA if r.random() < 0.3 else ROJO_MED, outline=TINTA, ancho=1.2)
    # la base: cúpulas, invernadero, paneles solares, tubos, plataforma de aterrizaje, huellas de vehículo
    lz.elipse(560, 735, 720, 770, fill=ROJO_MED, outline=TINTA, ancho=2)                 # plataforma
    lz.elipse(590, 742, 690, 763, outline=AMBAR, ancho=2)
    lz.texto(640, 753, "H", 12, AMBAR)
    for dx in (0, 14):                                                                     # huellas del vehículo
        lz.linea([(760 + dx, 700), (720 + dx, 760), (690 + dx, 840), (700 + dx, 900)], ROJO_OSC, 3)
    for i, (cx, r_, verde) in enumerate(((930, 72, False), (1065, 52, False), (1160, 38, True))):
        caja = ((cx - r_), (650 - r_), (cx + r_), (650 + r_))
        lz.d.pieslice([v * SS for v in caja], 180, 360, fill=(170, 220, 160) if verde else CREMA, outline=TINTA, width=int(3 * SS))
        if verde:
            for k in range(-2, 3):
                lz.linea([(cx + k * r_ * 0.38, 650), (cx + k * r_ * 0.3, 650 - r_ * math.cos(k * 0.38) * 0.95)], TINTA, 1.4)
        else:
            lz.rayado(recortar(lz.mascara(elipse=caja), lz.mascara(pts=[(cx + 6, 640 - r_), (cx + r_, 640 - r_), (cx + r_, 650), (cx + 6, 650)])),
                      (190, 170, 140), paso=4, angulo=-60, grosor=1)
            for k in range(3):
                lz.rect(cx - r_ * 0.5 + k * r_ * 0.38, 628, cx - r_ * 0.5 + k * r_ * 0.38 + r_ * 0.2, 640, fill=AMBAR, outline=TINTA, ancho=1.5)
        lz.arco((cx - r_ + 9, 650 - r_ + 9, cx + r_ - 9, 650 + r_ - 9), 195, 245, (255, 255, 255), 3)
        lz.rect(cx - r_ - 4, 648, cx + r_ + 4, 656, fill=TEAL, outline=TINTA, ancho=2)
    lz.rect(1002, 636, 1014, 650, fill=TEAL, outline=TINTA, ancho=2)
    lz.rect(1117, 640, 1123, 650, fill=TEAL, outline=TINTA, ancho=2)
    for k in range(4):                                                                     # paneles solares
        x0 = 1230 + k * 34
        lz.poli([(x0, 640), (x0 + 28, 640), (x0 + 22, 660), (x0 - 6, 660)], fill=(40, 70, 130), outline=TINTA, ancho=1.6)
        lz.linea([(x0 + 11, 640), (x0 + 6, 660)], (120, 180, 240), 1)
        lz.linea([(x0 + 3, 650), (x0 + 25, 650)], (120, 180, 240), 1)
        lz.linea([(x0 + 8, 660), (x0 + 8, 668)], TINTA, 2)
    lz.linea([(1065, 598), (1065, 548)], TINTA, 3)                                         # antena
    lz.arco((1043, 534, 1087, 560), 200, 340, CREMA, 4)
    lz.elipse(1061, 544, 1069, 552, fill=NARANJA)
    lz.elipse(1205, 664, 1213, 672, fill=CREMA, outline=TINTA, ancho=1.2)                  # astronauta diminuto
    lz.rect(1204, 671, 1214, 686, fill=CREMA, outline=TINTA, ancho=1.2)
    # módulo de aterrizaje bajando: chorro en bandas, nube de polvo, propulsores
    lz.poli([(528, 300), (592, 300), (560, 640)], fill=NARANJA)
    lz.poli([(540, 300), (580, 300), (560, 560)], fill=AMBAR)
    lz.poli([(550, 300), (570, 300), (560, 440)], fill=CREMA)
    nubes = [(480, 650, 30), (640, 650, 30), (510, 630, 38), (610, 630, 38), (540, 612, 44), (582, 612, 44), (560, 596, 40)]
    for x, y, rr in nubes:                                                                 # polvo que levanta el chorro
        lz.elipse(x - rr, y - rr * 0.8, x + rr, y + rr * 0.8, fill=POLVO, outline=TINTA, ancho=2.4)
        lz.arco((x - rr * 0.8, y - rr * 0.6, x + rr * 0.6, y + rr * 0.5), 200, 280, (240, 200, 160), 2.5)
        lado = lz.mascara(pts=[(x, y - rr), (x + rr, y - rr), (x + rr, y + rr), (x, y + rr)])
        lz.rayado(recortar(lz.mascara(elipse=(x - rr, y - rr * 0.8, x + rr, y + rr * 0.8)), lado), (190, 130, 90), paso=4, angulo=-60, grosor=1)
    lz.poli([(512, 250), (608, 250), (630, 302), (490, 302)], fill=CREMA, outline=TINTA, ancho=3)
    lz.rayado(lz.mascara(pts=[(565, 250), (608, 250), (630, 302), (565, 302)]), (170, 150, 120), paso=4, angulo=60, grosor=1)
    lz.linea([(500, 276), (620, 276)], TINTA, 1.6)
    for k in range(5):
        lz.elipse(508 + k * 24, 282, 516 + k * 24, 290, fill=TEAL_OSC)
    lz.poli([(526, 200), (594, 200), (606, 250), (514, 250)], fill=TEAL, outline=TINTA, ancho=3)
    lz.rayado(lz.mascara(pts=[(565, 200), (594, 200), (606, 250), (565, 250)]), TEAL_OSC, paso=4, angulo=60, grosor=1.1)
    lz.elipse(546, 210, 574, 238, fill=AMBAR, outline=TINTA, ancho=2)
    lz.arco((550, 214, 570, 234), 200, 260, (255, 255, 255), 2)
    lz.linea([(560, 200), (560, 180)], TINTA, 2)
    lz.elipse(556, 174, 564, 182, fill=NARANJA)
    for lx, d in ((498, -1), (622, 1)):
        lz.linea([(lx, 300), (lx + 30 * d, 348)], CREMA, 6)
        lz.linea([(lx, 300), (lx + 30 * d, 348)], TINTA, 1.2)
        lz.linea([(lx + 18 * d, 348), (lx + 42 * d, 348)], CREMA, 6)
    for px, d in ((514, -1), (606, 1)):                                                    # propulsores laterales
        lz.poli([(px, 262), (px + 14 * d, 256), (px + 14 * d, 270)], fill=TEAL_OSC, outline=TINTA, ancho=1.4)
    # rocas en primer plano, facetadas, enmarcando la escena
    lz.roca([(0, 500), (60, 430), (120, 455), (190, 380), (250, 420), (300, 540), (370, 610), (430, H), (0, H)],
            NARANJA, ROJO_MED, ROJO_OSC, rayas=(40, 10, 10), semilla=11, centro=(180, 640))
    lz.roca([(W, 450), (1540, 390), (1480, 420), (1440, 520), (1380, 470), (1310, 630), (1260, H), (W, H)],
            NARANJA, ROJO_MED, ROJO_OSC, rayas=(40, 10, 10), semilla=12, centro=(1440, 650))
    lz.roca([(0, 760), (90, 700), (200, 730), (260, 820), (240, H), (0, H)], NARANJA, ROJO_MED, ROJO_OSC, rayas=(40, 10, 10), semilla=13)
    for gx, gy, ang, sem in ((140, 520, 70, 1), (230, 480, 100, 2), (1500, 500, 110, 3), (1400, 600, 80, 4)):
        lz.grieta(gx, gy, 90, ang, TINTA, sem, 1.8)
    # título con sombra impresa y trama en las letras
    lz.texto(808, 798, "MISIÓN MARTE", 104, TINTA, nombre="impact.ttf")
    lz.texto(800, 790, "MISIÓN MARTE", 104, AMBAR, nombre="impact.ttf", borde=4, color_borde=TINTA)
    lz.rect(470, 838, 1130, 872, fill=TINTA)
    lz.texto(800, 856, "ENTRENAMIENTO DE ASTRONAUTAS JUNIOR", 22, CREMA)
    # insignia de cartel
    lz.elipse(1290, 180, 1450, 340, fill=NARANJA, outline=TINTA, ancho=4)
    for k in range(24):
        a = k / 24 * math.tau
        lz.linea([(1370 + math.cos(a) * 80, 260 + math.sin(a) * 80), (1370 + math.cos(a) * 92, 260 + math.sin(a) * 92)], NARANJA, 5)
    lz.elipse(1300, 190, 1440, 330, outline=AMBAR, ancho=2)
    lz.texto(1370, 238, "¡CON DATOS", 18, CREMA, borde=1, color_borde=TINTA)
    lz.texto(1370, 262, "REALES", 22, AMBAR, borde=1.5, color_borde=TINTA)
    lz.texto(1370, 286, "DEL SOL!", 18, CREMA, borde=1, color_borde=TINTA)
    tintas = [NEGRO, TINTA, (16, 40, 48), ROJO_OSC, ROJO_MED, OXIDO, NARANJA, AMBAR, CREMA, (255, 255, 255), (40, 10, 10),
              TEAL_OSC, (12, 36, 42), TEAL, (176, 150, 120), (120, 96, 80), (120, 180, 240), (40, 70, 130), (170, 220, 160),
              (190, 170, 140), (170, 150, 120), POLVO, (190, 130, 90), (240, 200, 160)]
    return lz.terminar(tintas)


# --- 2. Interior violeta: la sala de la base al atardecer --------------------------------
def robot_ia(lz, x, y, escala=1.0, cara=(94, 200, 242)):
    """La IA de la base (mismo diseño que en el juego): cabeza blanca redonda, pantalla con ojos."""
    s = escala
    lz.elipse(x - 26 * s, y + 70 * s, x + 26 * s, y + 80 * s, fill=(86, 78, 160))            # sombra en el suelo
    lz.elipse(x - 30 * s, y - 28 * s, x + 30 * s, y + 26 * s, fill=(246, 244, 250), outline=(40, 34, 86), ancho=3 * s)
    lz.arco((x - 24 * s, y - 22 * s, x + 20 * s, y + 18 * s), 200, 260, (255, 255, 255), 3 * s)
    lz.rect(x - 20 * s, y - 12 * s, x + 20 * s, y + 10 * s, fill=(40, 34, 86))
    for ox in (-9, 9):
        lz.elipse(x + (ox - 4) * s, y - 5 * s, x + (ox + 4) * s, y + 3 * s, fill=cara)
    lz.arco((x - 8 * s, y - 2 * s, x + 8 * s, y + 8 * s), 20, 160, cara, 2 * s)
    lz.linea([(x, y - 28 * s), (x, y - 42 * s)], (40, 34, 86), 2.5 * s)
    lz.elipse(x - 5 * s, y - 50 * s, x + 5 * s, y - 40 * s, fill=(124, 240, 160), outline=(40, 34, 86), ancho=1.5 * s)
    lz.elipse(x - 18 * s, y + 26 * s, x + 18 * s, y + 36 * s, fill=(94, 200, 242))           # propulsor
    lz.poli([(x - 12 * s, y + 34 * s), (x + 12 * s, y + 34 * s), (x, y + 56 * s)], fill=(190, 230, 250))


def interior():
    V0, V1, V2, V3, V4 = (40, 34, 86), (66, 58, 130), (96, 88, 170), (138, 130, 210), (190, 184, 236)
    ROSA, ROSA_CL, JUNTA, SOMBRA = (228, 138, 216), (247, 182, 238), (128, 120, 202), (106, 98, 182)
    CIELO = [(26, 22, 64), (40, 36, 94), (58, 64, 134), (78, 116, 186), (110, 170, 230)]
    lz = Lienzo(V1)
    lz.rect(0, 0, W, 560, fill=V2)
    lz.poli([(0, 560), (W, 560), (W, H), (0, H)], fill=V3)
    for y in range(44, 512, 9):                                             # paredes impresas en 3D: nervaduras
        lz.linea([(0, y), (1120, y)], (86, 78, 160), 1.4)
        lz.linea([(0, y + 2), (1120, y + 2)], (104, 96, 178), 0.8)
    # zócalo con paneles bajo las ventanas
    for x in range(40, 1120, 80):
        lz.rect(x + 4, 512, x + 76, 556, outline=V1, ancho=1.5)
        lz.rect(x + 30, 528, x + 50, 540, fill=V1)
        for k in range(3):
            lz.linea([(x + 33, 531 + k * 3), (x + 47, 531 + k * 3)], V2, 0.8)
    # ventanales con el atardecer AZUL de Marte (el polvo dispersa la luz azul cerca del Sol)
    for i, x in enumerate((90, 420, 750)):
        hueco = [(x + 70, 62), (x + 300, 62), (x + 230, 500), (x, 500)]
        m = lz.mascara(pts=hueco)
        cielo = Image.new("RGB", lz.img.size)
        dc = ImageDraw.Draw(cielo)
        for y in range(int(62 * SS), int(500 * SS)):
            t = (y / SS - 62) / 438
            dc.line([(0, y), (W * SS, y)], fill=CIELO[min(len(CIELO) - 1, int(t * len(CIELO)))])
        lz.img.paste(cielo, (0, 0), m)
        if i == 1:                                                          # el Sol, pequeño, con halo azul en anillos
            for rr, c in ((80, (90, 150, 215)), (52, (140, 200, 245)), (28, (200, 230, 255)), (12, (255, 255, 255))):
                lz.img.paste(Image.new("RGB", lz.img.size, c), (0, 0), recortar(lz.mascara(elipse=(580 - rr, 405 - rr, 580 + rr, 405 + rr)), m))
        lz.estrellas(34, (x + 60, 70, x + 300, 230), [V4, (255, 255, 255)], semilla=i + 20)
        if i == 0:                                                          # la Tierra: el "lucero" del atardecer marciano
            lz.elipse(196, 226, 204, 234, fill=(150, 210, 255))
            for a in range(4):
                ang = a * math.pi / 2
                lz.linea([(200 + math.cos(ang) * 6, 230 + math.sin(ang) * 6), (200 + math.cos(ang) * 13, 230 + math.sin(ang) * 13)], (150, 210, 255), 1.2)
        if i == 2:
            luna_irregular(lz, 905, 150, 13, (170, 150, 130), (110, 96, 86), 4, crateres=2)
        colores = ((84, 52, 84), (70, 40, 70), (54, 28, 50), (40, 20, 38))
        for capa, (base, alto) in enumerate(((455, 80), (472, 60), (488, 40), (500, 20))):
            colinas = cresta(x - 20, x + 320, base, alto, semilla=i * 7 + capa, picos=3 + capa, rugosidad=0.4)
            lz.img.paste(Image.new("RGB", lz.img.size, colores[capa]), (0, 0),
                         recortar(lz.mascara(pts=[(x - 20, 510)] + colinas + [(x + 320, 510)]), m))
            if capa == 0:
                lz.img.paste(Image.new("RGB", lz.img.size, (112, 80, 120)), (0, 0),             # bruma sobre la colina lejana
                             recortar(lz.mascara(pts=colinas[:60] + [(p[0], p[1] + 6) for p in colinas[:60][::-1]]), m))
        if i == 2:                                                          # remolino de polvo a lo lejos
            for k in range(7):
                yy = 470 - k * 14
                lz.linea([(938 - k * 2.5, yy), (950 + k * 3, yy - 4)], (120, 96, 140), 2.2)
        if i == 0:                                                          # luces de un vehículo lejano
            for dx in (0, 6):
                lz.elipse(270 + dx - 1.6, 482 - 1.6, 270 + dx + 1.6, 482 + 1.6, fill=(255, 210, 120))
        for k in range(2):                                                  # reflejos en el cristal
            rx = x + 130 + k * 22
            mm = recortar(lz.mascara(pts=[(rx, 62), (rx + 4 + k * 3, 62), (rx - 74 + k * 3, 500), (rx - 78, 500)]), m)
            lz.img.paste(Image.new("RGB", lz.img.size, (130, 140, 210)), (0, 0), mm)
        r = random.Random(i)
        for _ in range(5):                                                  # rayitas de polvo en el cristal
            sx, sy = r.uniform(x + 30, x + 250), r.uniform(90, 470)
            lz.img.paste(Image.new("RGB", lz.img.size, (120, 126, 196)), (0, 0),
                         recortar(lz.mascara(pts=[(sx, sy), (sx + 40, sy - 26), (sx + 41, sy - 25), (sx + 1, sy + 1)]), m))
        grosor = 22                                                         # muro grueso: blindaje contra la radiación
        lz.poli([(x + 70, 62), (x + 70 + grosor, 62 + grosor * 0.6), (x + grosor * 0.6, 500 - grosor * 0.4), (x, 500)], fill=V1)
        lz.poli([(x, 500), (x + grosor * 0.6, 500 - grosor * 0.4), (x + 230 - grosor * 0.2, 500 - grosor * 0.4), (x + 230, 500)], fill=V3)
        for k in range(1, 4):
            t = k / 4
            lz.linea([(x + 70 - 70 * t, 62 + 438 * t), (x + 70 + grosor - (70 - grosor * 0.6 + grosor) * t + grosor * t * 0.0, 62 + grosor * 0.6 + (438 - grosor) * t)], (86, 78, 160), 1)
        lz.poli(hueco, outline=V0, ancho=12)
        lz.poli(hueco, outline=V3, ancho=2)
        lz.linea([(x + 185, 62), (x + 115, 500)], V0, 9)
        lz.linea([(x + 186, 64), (x + 118, 498)], V3, 1.2)
        for t in np.linspace(0.08, 0.92, 9):                                # remaches del marco
            for (ax, ay), (bx, by) in (((x + 70, 62), (x, 500)), ((x + 300, 62), (x + 230, 500))):
                px, py = ax + (bx - ax) * t, ay + (by - ay) * t
                lz.elipse(px - 2.2, py - 2.2, px + 2.2, py + 2.2, fill=V4)
    # techo: viga, rejillas, bandeja de cables y cables colgando
    lz.rect(0, 0, W, 36, fill=V1)
    for x in range(40, 1100, 140):
        lz.rect(x, 10, x + 50, 26, fill=V0)
        for k in range(4):
            lz.linea([(x + 4, 13 + k * 4), (x + 46, 13 + k * 4)], V1, 1)
    lz.linea([(0, 36), (W, 36)], V0, 3)
    lz.rect(0, 44, 1120, 54, fill=V0)
    r = random.Random(3)
    for x in range(60, 1100, 160):
        lz.linea([(x, 54), (x + 40, 70 + r.uniform(0, 18)), (x + 80, 54)], ROSA if x % 320 else V4, 1.4)
    # pared izquierda en escorzo (da profundidad)
    lz.poli([(0, 0), (52, 30), (52, 590), (0, 640)], fill=V0)
    lz.linea([(52, 30), (52, 590)], V2, 2)
    for k in range(4):
        lz.linea([(0, 120 + k * 120), (52, 130 + k * 115)], V1, 1.5)
    # columnas angulosas con aristas iluminadas
    for x in (80, 400, 730, 1060):
        lz.poli([(x, 0), (x + 60, 0), (x + 30, 560), (x - 30, 560)], fill=V1, outline=V0, ancho=3)
        lz.linea([(x + 4, 0), (x - 25, 556)], V3, 2)
        lz.rayado(lz.mascara(pts=[(x + 32, 0), (x + 60, 0), (x + 30, 560), (x + 2, 560)]), V0, paso=5, angulo=-80, grosor=1)
        for yy in (120, 300, 480):
            lz.elipse(x + 18 - yy * 0.054 - 3, yy - 3, x + 18 - yy * 0.054 + 3, yy + 3, fill=V3)
    # pared derecha: puerta ABIERTA con pasillo iluminado detrás, pantalla con datos, pasamanos, luz de emergencia
    lz.poli([(1120, 36), (W, 0), (W, H), (1120, 640)], fill=V2)
    for k in range(6):
        lz.linea([(1120, 120 + k * 90), (W, 100 + k * 100)], (86, 78, 160), 1.5)
    # arco hacia la zona de cultivo (en Mars Dune Alpha el huerto está junto a la cocina y la sala)
    arco = [(1190, 612), (1190, 300)] + [(1265 + math.cos(t) * 75, 300 - math.sin(t) * 70 - (1 - abs(math.cos(t))) * 8)
                                       for t in np.linspace(math.pi, 0, 24)] + [(1340, 300), (1340, 604)]
    lz.poli(arco, fill=(70, 34, 84))
    huerto = lz.mascara(pts=arco)
    for k, yy in enumerate((300, 380, 460, 540)):                           # estantes de cultivo con luces LED
        lz.img.paste(Image.new("RGB", lz.img.size, (232, 96, 200)), (0, 0), recortar(lz.mascara(pts=[(1196, yy), (1334, yy - 2), (1334, yy + 4), (1196, yy + 6)]), huerto))
        lz.img.paste(Image.new("RGB", lz.img.size, (120, 52, 120)), (0, 0), recortar(lz.mascara(pts=[(1196, yy + 6), (1334, yy + 4), (1334, yy + 40), (1196, yy + 44)]), huerto))
        for j in range(7):                                                  # lechugas y brotes
            px, py = 1206 + j * 19, yy + 36
            for dx, dy in ((-5, -6), (4, -8), (0, -12)):
                lz.img.paste(Image.new("RGB", lz.img.size, (124, 200, 150) if (j + k) % 2 else (111, 179, 167)), (0, 0),
                             recortar(lz.mascara(elipse=(px + dx - 6, py + dy - 4, px + dx + 6, py + dy + 4)), huerto))
        lz.img.paste(Image.new("RGB", lz.img.size, (170, 160, 228)), (0, 0), recortar(lz.mascara(pts=[(1196, yy + 44), (1334, yy + 42), (1334, yy + 46), (1196, yy + 48)]), huerto))
    lz.poli(arco, outline=V4, ancho=4)
    lz.poli([(1240, 606), (1300, 602), (1360, 700), (1210, 708)], fill=(196, 150, 220))  # luz magenta en el suelo
    lz.texto(1265, 206, "CULTIVO", 13, V4)
    lz.rect(1384, 140, 1584, 364, fill=V0, outline=V4, ancho=3)
    lz.texto(1484, 172, "SOL 04", 34, ROSA, nombre="consola.ttf")
    lz.linea([(1396, 196), (1572, 196)], V3, 1.5)
    for k, linea in enumerate(("Fuera: -63 °C", "Aire: 0,6 % del", "  de la Tierra", "Gravedad: 38 %", "Día: 24 h 37 min",
                               "Mensaje a la Tierra:", "  tarda 4-24 min")):
        lz.texto(1398, 212 + k * 21, linea, 12.5, ROSA_CL if k >= 5 else V4, ancla="lm", nombre="consola.ttf")
    lz.linea([(1384, 470), (W, 452)], V4, 6)
    for x in (1404, 1484, 1564):
        lz.linea([(x, 466), (x, 490)], V4, 4)
    lz.elipse(1500, 60, 1530, 90, fill=ROSA, outline=V0, ancho=2)
    lz.arco((1494, 54, 1536, 96), 200, 340, ROSA_CL, 1.5)
    lz.texto(1515, 108, "SALA COMÚN", 13, V4)
    # suelo: juntas, luz azul de las ventanas entrando, sombras
    for k in range(-8, 16):
        lz.linea([(560 + k * 40, 560), (560 + k * 150, H)], JUNTA, 1.5)
    for y in (590, 625, 680, 760, 870):
        lz.linea([(0, y), (1120 + (y - 560) * 0.9, y)], JUNTA, 1.5)
    for x in (90, 420, 750):
        lz.poli([(x, 562), (x + 230, 562), (x + 330, 700), (x - 60, 700)], fill=(150, 150, 226))   # luz azulada que entra
        lz.poli([(x + 100, 562), (x + 130, 562), (x + 190, 700), (x + 160, 700)], fill=V3)          # sombra del parteluz
    # lámparas colgantes (pantalla con borde iluminado) y círculos de luz
    for x, w in ((340, 180), (820, 150)):
        lz.linea([(x, 54), (x, 140)], V0, 3)
        lz.d.pieslice([(x - 32) * SS, (140) * SS, (x + 32) * SS, (204) * SS], 180, 360, fill=V4, outline=V0, width=int(2 * SS))
        lz.linea([(x - 30, 172), (x + 30, 172)], (255, 255, 255), 2)
        cono = lz.mascara(pts=[(x - 26, 172), (x + 26, 172), (x + w, 710), (x - w, 710)]).point(lambda v: int(v * 0.28))
        lz.img.paste(Image.new("RGB", lz.img.size, (220, 214, 255)), (0, 0), cono)
        lz.elipse(x - w, 660, x + w, 760, fill=V4)
        lz.elipse(x - w * 0.6, 680, x + w * 0.6, 740, fill=(212, 206, 246))
    # mesas, sillas rosas con sombra proyectada, tazas y tabletas
    for x, y in ((340, 700), (820, 700), (1010, 810)):
        lz.poli([(x - 84, y), (x + 84, y), (x + 140, y + 30), (x - 30, y + 30)], fill=SOMBRA)          # sombra de la mesa
        lz.rect(x - 84, y - 56, x + 84, y - 44, fill=V4, outline=V0, ancho=2)
        lz.linea([(x - 82, y - 52), (x + 82, y - 52)], (255, 255, 255), 1.2)
        lz.linea([(x, y - 44), (x, y)], V0, 5)
        lz.linea([(x - 40, y), (x + 40, y)], V0, 4)
        lz.rect(x - 50, y - 70, x - 34, y - 56, fill=ROSA_CL, outline=V0, ancho=1.5)
        lz.arco((x - 38, y - 68, x - 28, y - 60), 270, 90, V0, 1.5)
        lz.linea([(x - 44, y - 74), (x - 46, y - 82), (x - 42, y - 88)], (210, 204, 240), 1)       # vapor
        lz.poli([(x + 10, y - 60), (x + 50, y - 60), (x + 46, y - 56), (x + 6, y - 56)], fill=V0)
        lz.linea([(x + 14, y - 59), (x + 40, y - 59)], (124, 240, 160), 1)
        for sx, d in ((x - 124, 1), (x + 124, -1)):
            lz.poli([(sx + 10 * d, y), (sx + 48 * d, y), (sx + 80 * d, y + 22), (sx + 40 * d, y + 22)], fill=SOMBRA)
            lz.poli([(sx, y - 98), (sx + 42 * d, y - 92), (sx + 48 * d, y - 40), (sx + 8 * d, y - 40)], outline=ROSA, ancho=6)
            lz.linea([(sx + 14 * d, y - 86), (sx + 38 * d, y - 82)], ROSA_CL, 2)
            lz.poli([(sx + 8 * d, y - 40), (sx + 54 * d, y - 40), (sx + 52 * d, y - 30), (sx + 8 * d, y - 30)], fill=ROSA)
            lz.linea([(sx + 10 * d, y - 30), (sx + 10 * d, y)], ROSA, 5)
            lz.linea([(sx + 48 * d, y - 30), (sx + 48 * d, y)], ROSA, 5)
    robot_ia(lz, 600, 600, 0.9)
    # banco con cojín y maceta del invernadero
    for bx_ in (1170, 1370):
        lz.linea([(bx_, 778 - (bx_ - 1150) * 0.08), (bx_, 840 - (bx_ - 1150) * 0.08)], V0, 5)
    lz.poli([(1150, 760), (1390, 740), (1390, 770), (1150, 792)], fill=V4, outline=V0, ancho=2)
    lz.poli([(1158, 748), (1384, 730), (1384, 744), (1158, 762)], fill=ROSA, outline=V0, ancho=1.5)
    lz.poli([(1440, 760), (1520, 760), (1505, 840), (1455, 840)], fill=ROSA_CL, outline=V0, ancho=3)
    lz.rayado(lz.mascara(pts=[(1490, 760), (1520, 760), (1505, 840), (1485, 840)]), ROSA, paso=4, angulo=-70, grosor=1)
    for dx, dy, c in ((-34, -60, (111, 179, 167)), (6, -88, (124, 200, 150)), (36, -54, (111, 179, 167)), (-8, -40, (124, 200, 150))):
        lz.linea([(1480, 760), (1480 + dx, 760 + dy)], (60, 120, 100), 2)
        lz.elipse(1480 + dx - 24, 760 + dy - 12, 1480 + dx + 24, 760 + dy + 12, fill=c, outline=V0, ancho=2)
        lz.linea([(1480 + dx - 18, 760 + dy), (1480 + dx + 18, 760 + dy)], V0, 1)
    # primer plano: una silla grande y oscura cortada por el borde (da profundidad)
    respaldo = [(-30, 600), (110, 616), (126, 790), (-30, 800)]
    lz.poli(respaldo, fill=(52, 44, 104))
    lz.poli([(-14, 620), (96, 632), (108, 770), (-14, 778)], outline=ROSA, ancho=5)
    lz.linea([(4, 650), (86, 658)], ROSA_CL, 3)
    lz.poli([(-30, 800), (180, 796), (172, 830), (-30, 836)], fill=(52, 44, 104), outline=ROSA, ancho=4)
    lz.linea([(150, 830), (156, H + 10)], ROSA, 10)
    lz.linea([(20, 836), (14, H + 10)], ROSA, 10)
    tintas = [V0, V1, V2, V3, V4, ROSA, ROSA_CL, JUNTA, SOMBRA, (86, 78, 160), (150, 150, 226), (130, 140, 210), (120, 126, 196),
              (212, 206, 246), (210, 204, 240), (170, 160, 228), (30, 26, 66), (52, 46, 110), (60, 54, 120), (250, 220, 150),
              (52, 44, 104), (84, 52, 84), (70, 40, 70), (54, 28, 50), (40, 20, 38), (112, 80, 120), (120, 96, 140), (255, 210, 120),
              (150, 210, 255), (70, 34, 84), (232, 96, 200), (120, 52, 120), (196, 150, 220), (104, 96, 178)] + CIELO + [
        (90, 150, 215), (140, 200, 245), (200, 230, 255), (255, 255, 255), (170, 150, 130), (110, 96, 86),
        (111, 179, 167), (124, 200, 150), (60, 120, 100), (124, 240, 160), (94, 200, 242), (246, 244, 250), (190, 230, 250)]
    return lz.terminar(tintas, tinta_corrida=False, grano=0.025)


# --- 3. Carta grabada: la ruta de la misión ---------------------------------------------
def carta():
    MANCHA, PLIEGUE = (224, 210, 178), (214, 198, 164)
    lz = Lienzo(PAPEL)
    r = random.Random(2)
    for _ in range(7):                                                                   # manchas del papel viejo
        x, y, rr = r.uniform(80, 1520), r.uniform(80, 820), r.uniform(30, 80)
        lz.elipse(x - rr, y - rr * 0.8, x + rr, y + rr * 0.8, fill=MANCHA)
    lz.img = lz.img.filter(ImageFilter.GaussianBlur(14 * SS))
    lz.d = ImageDraw.Draw(lz.img)
    lz.arco((1180, 600, 1300, 700), 0, 300, PLIEGUE, 3)                                  # aro de taza
    lz.linea([(W / 2, 0), (W / 2 + 6, H)], PLIEGUE, 3)                                   # pliegues del papel
    lz.linea([(0, H / 2), (W, H / 2 - 4)], PLIEGUE, 3)
    # marco con escala de grados
    lz.rect(28, 28, W - 28, H - 28, outline=TINTA, ancho=4)
    lz.rect(44, 44, W - 44, H - 44, outline=TINTA, ancho=1.5)
    for k in range(0, 361, 5):
        x = 44 + (W - 88) * k / 360
        largo = 10 if k % 30 == 0 else 5
        lz.linea([(x, 44), (x, 44 + largo)], TINTA, 1)
        lz.linea([(x, H - 44), (x, H - 44 - largo)], TINTA, 1)
        if k % 30 == 0:
            lz.texto(x, 36, f"{k}°", 8, TINTA)
    lz.texto(130, 80, "CARTA DE LA MISIÓN · TIERRA → MARTE", 22, TINTA, ancla="lm")
    lz.texto(W - 130, 80, "BITÁCORA DE LA BASE  N.º 01", 18, TINTA, ancla="rm")
    lz.texto(70, H - 70, "ÓRBITAS A ESCALA (1 UA = 230 px) · MARTE ESTÁ A 1,52 UA DEL SOL", 15, TINTA, ancla="lm")
    cx, cy, ua = 560, 470, 230
    # Sol grabado: rayos ondulados, anillos y rayado cruzado
    for k in range(64):
        a = k / 64 * math.tau
        largo = 78 if k % 2 == 0 else 56
        lz.linea([(cx + math.cos(a) * 44, cy + math.sin(a) * 44), (cx + math.cos(a) * largo, cy + math.sin(a) * largo)],
                 TINTA, 1.8 if k % 2 == 0 else 1)
        if k % 4 == 0:                                                     # rayos largos con punta
            px, py = cx + math.cos(a) * largo, cy + math.sin(a) * largo
            lz.elipse(px - 2, py - 2, px + 2, py + 2, fill=TINTA)
    lz.elipse(cx - 40, cy - 40, cx + 40, cy + 40, fill=PAPEL, outline=TINTA, ancho=3)
    lz.elipse(cx - 30, cy - 30, cx + 30, cy + 30, outline=TINTA, ancho=1)
    lz.rayado(lz.mascara(elipse=(cx - 40, cy - 40, cx + 40, cy + 40)), TINTA, paso=6, angulo=30, grosor=0.9)
    lz.rayado(lz.mascara(elipse=(cx - 10, cy - 40, cx + 40, cy + 40)), TINTA, paso=6, angulo=-60, grosor=0.9)
    lz.texto(cx, cy + 100, "SOL", 18, TINTA)
    # órbitas: Mercurio y Venus finas, Tierra y Marte marcadas
    for radio, ancho in ((ua * 0.39, 0.8), (ua * 0.72, 0.8), (ua, 1.8), (ua * 1.52, 1.8)):
        lz.elipse(cx - radio, cy - radio * 0.86, cx + radio, cy + radio * 0.86, outline=TINTA, ancho=ancho)
    for radio, nombre, ang in ((ua * 0.39, "Mercurio", -0.5), (ua * 0.72, "Venus", 2.3)):
        px, py = cx + math.cos(ang) * radio, cy + math.sin(ang) * radio * 0.86
        lz.elipse(px - 4, py - 4, px + 4, py + 4, fill=TINTA)
        lz.texto(px + 8, py, nombre, 11, TINTA, ancla="lm")
    # órbita de transferencia: media elipse de la Tierra (izquierda) a Marte (derecha), con los meses
    a_t = (ua + ua * 1.52) / 2
    centro_t = cx + (ua * 1.52 - ua) / 2
    ts = np.linspace(0, math.pi, 81)
    pts = [(centro_t - a_t * math.cos(t), cy - a_t * 0.86 * math.sin(t) * 0.97) for t in ts]
    for i in range(0, len(pts) - 1, 2):
        lz.linea([pts[i], pts[i + 1]], SELLO, 3)
    for mes in range(1, 9):                                                       # marcas de cada mes
        i = int(mes / 8.5 * 80)
        px, py = pts[i]
        nx, ny = px - centro_t, py - cy
        n = math.hypot(nx, ny)
        lz.linea([(px, py), (px + nx / n * 12, py + ny / n * 12)], SELLO, 2)
        lz.texto(px + nx / n * 24, py + ny / n * 24, str(mes), 11, SELLO)
    nave = pts[26]
    lz.poli([(nave[0] - 12, nave[1] + 6), (nave[0] + 14, nave[1] - 3), (nave[0] - 6, nave[1] - 12)], fill=TINTA)
    lz.texto(centro_t, cy - a_t * 0.86 - 44, "VIAJE: UNOS 8 MESES (cada número es un mes)", 16, SELLO)
    lz.texto(cx - ua - 10, cy - 40, "SALIDA", 12, SELLO, ancla="rm")
    lz.texto(cx + ua * 1.52 + 10, cy - 40, "LLEGADA", 12, SELLO, ancla="lm")
    # Tierra (con la Luna) y Marte, lado nocturno rayado
    for px, py, r_p, nombre in ((cx - ua, cy, 20, "TIERRA"), (cx + ua * 1.52, cy, 15, "MARTE")):
        lz.elipse(px - r_p, py - r_p, px + r_p, py + r_p, fill=PAPEL, outline=TINTA, ancho=2.5)
        lz.rayado(recortar(lz.mascara(elipse=(px - r_p, py - r_p, px + r_p, py + r_p)),
                           lz.mascara(pts=[(px, py - r_p), (px + r_p, py - r_p), (px + r_p, py + r_p), (px, py + r_p)])),
                  TINTA, paso=3.5, angulo=-45, grosor=0.9, cruzado=True)
        lz.texto(px, py + r_p + 22, nombre, 17, TINTA)
    lz.elipse(cx - ua - 34, cy - 30, cx - ua - 26, cy - 22, fill=PAPEL, outline=TINTA, ancho=1.5)
    lz.texto(cx - ua - 40, cy - 26, "Luna", 10, TINTA, ancla="rm")
    # rosa de los vientos y barra de escala
    rx, ry = 170, 740
    for k in range(8):
        a = k / 8 * math.tau
        largo = 50 if k % 2 == 0 else 28
        p1 = (rx + math.cos(a) * largo, ry + math.sin(a) * largo)
        p2 = (rx + math.cos(a + 0.25) * 9, ry + math.sin(a + 0.25) * 9)
        p3 = (rx + math.cos(a - 0.25) * 9, ry + math.sin(a - 0.25) * 9)
        lz.poli([p1, p2, (rx, ry)], fill=TINTA)
        lz.poli([p1, p3, (rx, ry)], fill=PAPEL, outline=TINTA, ancho=1)
    lz.elipse(rx - 32, ry - 32, rx + 32, ry + 32, outline=TINTA, ancho=1)
    lz.texto(rx, ry - 64, "N", 14, TINTA)
    for k in range(5):
        lz.rect(260 + k * 46, 790, 306 + k * 46, 800, fill=TINTA if k % 2 == 0 else PAPEL, outline=TINTA, ancho=1)
    lz.texto(260, 812, "0", 10, TINTA)
    lz.texto(490, 812, "1 UA = 150 millones de km", 10, TINTA, ancla="rm")
    # recuadro: Marte con sus lunas y datos reales
    bx, by = 1270, 300
    lz.rect(1060, 120, 1540, 600, fill=PAPEL, outline=TINTA, ancho=3)
    lz.rect(1068, 128, 1532, 592, outline=TINTA, ancho=1)
    lz.texto(1300, 156, "MARTE Y SUS DOS LUNAS", 20, TINTA)
    for radio, nombre, sem in ((100, "FOBOS", 4), (178, "DEIMOS", 9)):
        lz.elipse(bx - radio, by + 20 - radio * 0.5, bx + radio, by + 20 + radio * 0.5, outline=TINTA, ancho=1.1)
        lx, ly = bx + radio * 0.72, by + 20 - radio * 0.5 * 0.7
        luna_irregular(lz, lx, ly, 11 if nombre == "FOBOS" else 7, PAPEL, TINTA, sem, crateres=2)
        lz.texto(lx + 18, ly - 14, nombre, 14, TINTA, ancla="lm")
    disco = (bx - 64, by - 44, bx + 64, by + 84)
    lz.elipse(*disco, fill=PAPEL, outline=TINTA, ancho=3)
    lz.rayado(recortar(lz.mascara(elipse=disco), lz.mascara(pts=[(bx + 14, by - 60), (bx + 80, by - 60), (bx + 80, by + 100), (bx + 14, by + 100)])),
              TINTA, paso=4, angulo=-45, grosor=1, cruzado=True)
    lz.d.chord([(bx - 34) * SS, (by - 46) * SS, (bx + 34) * SS, (by - 20) * SS], 180, 360, fill=PAPEL, outline=TINTA, width=int(2 * SS))
    lz.elipse(bx - 44, by - 4, bx - 20, by + 12, outline=TINTA, ancho=1.6)                 # monte Olimpo
    lz.elipse(bx - 37, by + 1, bx - 27, by + 7, outline=TINTA, ancho=1)
    lz.linea([(bx - 30, by + 10), (bx - 30, by + 26)], TINTA, 0.8)
    lz.texto(bx - 86, by - 10, "Monte Olimpo", 10, TINTA, ancla="rm")
    lz.linea([(bx - 80, by - 10), (bx - 46, by + 2)], TINTA, 0.8)
    pts_v = [(bx - 14, by + 30), (bx, by + 33), (bx + 14, by + 31), (bx + 30, by + 36)]       # Valles Marineris
    lz.linea(pts_v, TINTA, 2.2)
    lz.linea([(x, y + 4) for x, y in pts_v], TINTA, 1)
    lz.texto(bx - 86, by + 52, "Valles Marineris", 10, TINTA, ancla="rm")
    lz.linea([(bx - 80, by + 52), (bx - 16, by + 34)], TINTA, 0.8)
    datos = [("DÍA", "24 h 37 min"), ("AÑO", "687 días"), ("GRAVEDAD", "38 % de la Tierra"), ("TEMP. MEDIA", "-63 °C"),
             ("AIRE", "95 % CO2 (dióxido de carbono)")]
    for k, (titulo, valor) in enumerate(datos):
        y0 = 420 + k * 32
        lz.rect(1090, y0, 1510, y0 + 26, outline=TINTA, ancho=1)
        lz.rect(1090, y0, 1220, y0 + 26, fill=(222, 206, 172), outline=TINTA, ancho=1)
        lz.texto(1100, y0 + 13, titulo, 12, TINTA, ancla="lm")
        lz.texto(1232, y0 + 13, valor, 13, TINTA, ancla="lm")
    lz.texto(1300, 400, "Fobos da 3 vueltas a Marte cada día marciano", 13, TINTA)
    # sello rojo desgastado y cinta en las esquinas
    lz.elipse(1300, 650, 1460, 810, outline=SELLO, ancho=5)
    lz.elipse(1314, 664, 1446, 796, outline=SELLO, ancho=2)
    lz.texto(1380, 712, "MISIÓN", 22, SELLO)
    lz.texto(1380, 746, "MARTE", 26, SELLO)
    lz.texto(1380, 776, "SOL 01", 12, SELLO)
    gasto = lz.mascara(elipse=(1296, 646, 1464, 814))
    lz.punteado(gasto, PAPEL, 0.03, 9, tam=(0.6, 1.6))                                       # sello gastado
    for x0, y0, izquierda in ((14, 14, True), (W - 94, 14, False)):                         # cinta en las esquinas
        if izquierda:
            pts_c = [(x0, y0 + 22), (x0 + 22, y0), (x0 + 80, y0 + 44), (x0 + 58, y0 + 66)]
        else:
            pts_c = [(x0, y0 + 44), (x0 + 58, y0), (x0 + 80, y0 + 22), (x0 + 22, y0 + 66)]
        lz.poli(pts_c, fill=(236, 226, 196), outline=PLIEGUE, ancho=1)
    for x, y in ((60, 860), (1545, 845), (980, 862)):                                        # salpicaduras en el borde
        for k in range(6):
            rr = r.uniform(1.5, 5)
            dx, dy = r.uniform(-14, 14), r.uniform(-8, 8)
            lz.elipse(x + dx - rr, y + dy - rr, x + dx + rr, y + dy + rr, fill=TINTA)
    tintas = [PAPEL, MANCHA, PLIEGUE, (222, 206, 172), (236, 226, 196), TINTA, SELLO, (120, 100, 80)]
    return lz.terminar(tintas, grano=0.045, tinta_corrida=False)


# --- 4. Cómic entintado: el cañón al amanecer ----------------------------------------------
def cresta_rocosa(x0, x1, base, alto, semilla, rugosidad=0.55, niveles=7):
    """Silueta de roca dentada (desplazamiento del punto medio), no ondas suaves."""
    r = random.Random(semilla)
    pts = [(x0, base - alto * r.uniform(0.3, 0.7)), (x1, base - alto * r.uniform(0.3, 0.7))]
    amp = alto * 0.6
    for _ in range(niveles):
        nuevos = [pts[0]]
        for a, b in zip(pts, pts[1:]):
            mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + r.uniform(-amp, amp)
            nuevos += [(mx, min(base - 6, max(base - alto * 1.2, my))), b]
        pts = nuevos
        amp *= rugosidad
    return pts


def montana_facetada(lz, pts, luz, medio, sombra, rayas, semilla, prof=(30, 90)):
    """Pared de cañón con "espolones y barrancos" (como las paredes de Valles Marineris): cada barranco baja
    desde la cresta y su lado derecho, sin sol, va en sombra rayada. Las laderas que miran al sol llevan luz fría."""
    r = random.Random(semilla)
    lz.poli([(pts[0][0], H)] + pts + [(pts[-1][0], H)], fill=medio)
    i = r.randint(2, 6)
    while i < len(pts) - 4:
        x, y = pts[i]
        largo = r.uniform(*prof)
        ancho = r.uniform(10, 26)
        fondo = (x + r.uniform(-4, 8), y + largo)
        medio_b = (x + r.uniform(-3, 5), y + largo * 0.5)
        borde_der = pts[min(len(pts) - 1, i + 3)]
        cuña = [(x, y), (borde_der[0] + ancho * 0.3, borde_der[1]), (fondo[0] + ancho, fondo[1] - largo * 0.15), fondo, medio_b]
        lz.poli(cuña, fill=sombra)
        lz.rayado(lz.mascara(pts=cuña), rayas, paso=3.2, angulo=-70, grosor=0.9)
        lz.linea([(x, y), medio_b, fondo], rayas, 1.8)
        i += r.randint(4, 9)
    for a, b in zip(pts, pts[1:]):                                   # luz fría en las laderas que miran al sol
        if b[1] < a[1] - 1.5:
            lz.linea([(a[0], a[1] + 2), (b[0], b[1] + 2)], luz, 2.2)
    lz.linea(pts, TINTA, 3)


def butte(lz, cx, base_y, ancho, alto, semilla, colores):
    """Butte como las Murray Buttes de Gale: capas finas de arenisca (estratificación cruzada de antiguas dunas),
    cornisas que sobresalen donde la capa es más dura y una roca de remate oscura que resiste al viento."""
    LUZ_, OX, SOMB, SOMB_OSC, BORDE, REMATE = colores
    r = random.Random(semilla)
    capas = []
    y = base_y
    w = ancho
    n = 11
    gruesos = [r.uniform(0.4, 2.0) for _ in range(n)]
    for k in range(n):
        h = alto * gruesos[k] / sum(gruesos)
        dura = r.random() < 0.3                                     # capa más dura: sobresale (cornisa)
        w_k = w * (r.uniform(1.0, 1.06) if dura else r.uniform(0.86, 0.97))
        off = r.uniform(-14, 14)
        capas.append((y, y - h, w_k, cx + off, dura))
        y -= h
        w = w_k * r.uniform(0.94, 1.0)
    # perfil escalonado (de abajo a arriba por la izquierda, de arriba a abajo por la derecha)
    izq, der = [], []
    for yb, yt, w_k, c, dura in capas:                              # borde roído por el viento
        for t in (0, 0.33, 0.66, 1):
            yy = yb + (yt - yb) * t
            izq.append((c - w_k / 2 + r.uniform(-7, 5) * (0 if dura else 1), yy))
            der.append((c + w_k / 2 + r.uniform(-5, 7) * (0 if dura else 1), yy))
    cuerpo = izq + der[::-1]
    lz.poli(cuerpo, fill=OX)
    for i, (yb, yt, w_k, c, dura) in enumerate(capas):
        x0, x1 = c - w_k / 2, c + w_k / 2
        filo = x0 + (x1 - x0) * r.uniform(0.55, 0.68)
        luz = [(x0, yb), (x0, yt), (filo, yt), (filo - 4, yb)]
        lz.poli(luz, fill=LUZ_ if i < n - 2 else REMATE)
        som = [(filo, yt), (x1, yt), (x1, yb), (filo - 4, yb)]
        lz.poli(som, fill=SOMB if i < n - 2 else SOMB_OSC)
        lz.rayado(lz.mascara(pts=som), SOMB_OSC, paso=3.5, angulo=-72, grosor=1)
        if yb - yt > alto / n * 1.1:                                  # estratificación cruzada en las capas gruesas
            for j in range(int((filo - x0) / 26)):
                xx = x0 + 10 + j * 26 + r.uniform(-4, 4)
                for q in range(3):
                    lz.linea([(xx + q * 5, yb - 2), (xx + q * 5 + (yb - yt) * 1.2, yt + 2)], OX, 0.9)
        lz.linea([(x0, yt), (x1, yt)], TINTA, 2.4 if dura else 1.2)     # junta entre capas
        if dura and i + 1 < n:                                        # sombra bajo la cornisa
            lz.poli([(x0 + 2, yt), (x1 - 2, yt), (x1 - 6, yt + 6), (x0 + 6, yt + 6)], fill=SOMB_OSC)
        lz.linea([(x0, yb), (x0, yt)], BORDE, 3)                      # luz de borde (el Sol sale por la izquierda)
    yb, yt, w_k, c, _ = capas[-1]
    lz.poli([(c - w_k / 2 - 4, yt + 2), (c - w_k / 2 + 10, yt - 6), (c + w_k / 2 - 6, yt - 6), (c + w_k / 2 + 4, yt + 2)], fill=REMATE, outline=TINTA, ancho=2.5)
    lz.poli(cuerpo, outline=TINTA, ancho=4)
    for k in range(3):
        lz.grieta(c + r.uniform(-ancho * 0.3, ancho * 0.3), base_y - alto * r.uniform(0.3, 0.8), alto * 0.25, 92, TINTA, semilla * 7 + k, 1.4, 1)
    # ladera de arena con losas rotas (como en la foto de Curiosity)
    ladera = [(cx - ancho * 1.1, base_y + 40), (cx - ancho * 0.5, base_y - 20), (cx + ancho * 0.5, base_y - 16), (cx + ancho * 1.2, base_y + 40)]
    lz.poli(ladera, fill=(176, 120, 82))
    lz.poli([ladera[0], ladera[1], (cx, base_y - 18), (cx - ancho * 0.1, base_y + 40)], fill=(206, 150, 104))
    lz.rayado(lz.mascara(pts=[(cx + ancho * 0.1, base_y - 18), ladera[2], ladera[3], (cx + ancho * 0.1, base_y + 40)]), (120, 76, 56), paso=4, angulo=-50, grosor=1)
    lz.linea(ladera, TINTA, 2.4)
    losas(lz, cx, base_y + 10, ancho * 1.8, 40, 8, semilla + 3, colores)


def losas(lz, cx, cy, ancho, alto, n, semilla, colores):
    """Losas planas y angulosas de arenisca rota."""
    LUZ_, OX, SOMB, SOMB_OSC, BORDE, REMATE = colores
    LUZ_, SOMB_OSC = (214, 160, 112), (112, 70, 52)                  # arenisca: color de roca, no teal
    r = random.Random(semilla)
    for _ in range(n):
        x, y = cx + r.uniform(-ancho / 2, ancho / 2), cy + r.uniform(-alto / 2, alto / 2)
        L, e, inc = r.uniform(18, 52), r.uniform(5, 12), r.uniform(-0.5, 0.2)
        tapa = [(x, y), (x + L, y + L * inc), (x + L + 6, y + L * inc - e * 0.6), (x + 6, y - e * 0.6)]
        canto = [(x, y), (x + L, y + L * inc), (x + L, y + L * inc + e), (x, y + e)]
        lz.poli(canto, fill=SOMB_OSC, outline=TINTA, ancho=1.2)
        lz.poli(tapa, fill=LUZ_, outline=TINTA, ancho=1.2)
        lz.linea([(x + 3, y + 2), (x + L * 0.7, y + L * inc * 0.7 + 2)], OX, 0.8)


def curiosity(lz, x, y, s=1.0):
    """El rover Curiosity con sus partes reales: 6 ruedas con suspensión rocker-bogie, mástil con ChemCam y Mastcam,
    generador MMRTG con aletas detrás y brazo robótico con torreta. (No tiene faros.)"""
    BLANCO, ORO, GRIS, OSCURO = (236, 230, 216), (214, 170, 96), (150, 146, 140), (60, 58, 66)
    p = lambda dx, dy: (x + dx * s, y + dy * s)
    # ruedas (se ven 3) y suspensión
    for dx in (-52, 4, 58):
        lz.elipse(*p(dx - 15, 22), *p(dx + 15, 52), fill=OSCURO, outline=TINTA, ancho=2 * s)
        lz.elipse(*p(dx - 7, 30), *p(dx + 7, 44), fill=GRIS)
        for k in range(6):                                              # garras de la rueda
            a = k / 6 * math.tau
            lz.linea([p(dx + math.cos(a) * 9, 37 + math.sin(a) * 9), p(dx + math.cos(a) * 14, 37 + math.sin(a) * 14)], TINTA, 1.5 * s)
    lz.linea([p(-52, 37), p(-22, 12), p(4, 37)], GRIS, 4 * s)            # bogie
    lz.linea([p(-22, 12), p(30, 6), p(58, 37)], GRIS, 4 * s)             # rocker
    lz.linea([p(-52, 37), p(-22, 12), p(4, 37)], TINTA, 1 * s)
    lz.linea([p(-22, 12), p(30, 6), p(58, 37)], TINTA, 1 * s)
    # cuerpo
    lz.poli([p(-60, -14), p(64, -14), p(70, 10), p(-66, 10)], fill=BLANCO, outline=TINTA, ancho=2.4 * s)
    lz.poli([p(-60, -14), p(64, -14), p(60, -20), p(-56, -20)], fill=(250, 248, 240), outline=TINTA, ancho=1.6 * s)
    lz.rect(*p(-40, -8), *p(20, 4), fill=ORO, outline=TINTA, ancho=1 * s)             # caja de la electrónica
    lz.rayado(lz.mascara(pts=[p(10, -14), p(64, -14), p(70, 10), p(16, 10)]), (190, 182, 166), paso=3, angulo=-60, grosor=0.8)
    # MMRTG detrás, inclinado, con aletas
    lz.poli([p(-66, -10), p(-96, -36), p(-108, -26), p(-78, 2)], fill=GRIS, outline=TINTA, ancho=2 * s)
    for k in range(5):
        lz.linea([p(-72 - k * 7, -6 - k * 6), p(-80 - k * 7, -18 - k * 6)], TINTA, 1.2 * s)
    # mástil con la cabeza: ChemCam (lente grande) y dos Mastcam
    lz.linea([p(30, -20), p(34, -96)], GRIS, 5 * s)
    lz.linea([p(30, -20), p(34, -96)], TINTA, 1 * s)
    lz.poli([p(14, -118), p(58, -118), p(58, -94), p(14, -94)], fill=BLANCO, outline=TINTA, ancho=2 * s)
    lz.elipse(*p(18, -114), *p(36, -98), fill=OSCURO, outline=TINTA, ancho=1.5 * s)    # ChemCam
    lz.elipse(*p(22, -110), *p(30, -102), fill=(120, 170, 220))
    for dx in (42, 50):
        lz.rect(*p(dx - 3, -110), *p(dx + 3, -102), fill=OSCURO)                         # Mastcam
    # antena de alta ganancia (disco)
    lz.elipse(*p(-30, -34), *p(-8, -22), fill=GRIS, outline=TINTA, ancho=1.5 * s)
    lz.linea([p(-19, -28), p(-19, -20)], TINTA, 2 * s)
    # brazo robótico plegado delante, con la torreta
    lz.linea([p(64, -6), p(92, -30), p(108, 6)], GRIS, 5 * s)
    lz.linea([p(64, -6), p(92, -30), p(108, 6)], TINTA, 1 * s)
    lz.poli([p(100, 4), p(118, 4), p(122, 18), p(98, 20)], fill=GRIS, outline=TINTA, ancho=1.6 * s)
    lz.linea([p(110, 20), p(110, 28)], TINTA, 2 * s)


def comic():
    OXIDO, MELOCOTON, TEAL, TEAL_OSC, PALIDO = (196, 98, 58), (240, 176, 122), (111, 179, 167), (40, 80, 84), (217, 230, 208)
    BORDE, SUELO, SUELO_OSC, REMATE = (255, 214, 160), (176, 104, 66), (120, 66, 44), (98, 70, 62)
    lz = Lienzo(NEGRO)
    # cielo del amanecer marciano: azul solo alrededor del Sol, el resto oscuro y pardo
    sol_x, sol_y = 250, 470
    degradado_vertical(lz, 0, 520, (22, 18, 28), (60, 46, 52))                         # cielo pardo del amanecer
    anillos = [(520, (60, 54, 76)), (360, (52, 80, 120)), (220, (70, 120, 176)), (120, (110, 170, 220))]
    for rr, c in anillos:                                                               # resplandor azul junto al Sol
        lz.elipse(sol_x - rr * 1.5, sol_y - rr * 0.45, sol_x + rr * 1.5, sol_y + rr * 0.45, fill=c)
    lz.estrellas(380, (0, 0, W, 230), [PALIDO, CREMA, (200, 220, 230)], semilla=8)
    luna_irregular(lz, 1300, 110, 22, (190, 160, 130), (120, 96, 80), 4)                 # Fobos
    lz.elipse(sol_x - 14, sol_y - 14, sol_x + 14, sol_y + 14, fill=(255, 255, 255))   # el Sol: 2/3 del tamaño que vemos desde la Tierra
    lz.elipse(sol_x - 24, sol_y - 24, sol_x + 24, sol_y + 24, outline=(200, 230, 255), ancho=3)
    # borde del cráter Gale a lo lejos y el monte Sharp (Aeolis Mons) con sus capas
    borde_crater = cresta_rocosa(-20, W + 20, 520, 50, 31, rugosidad=0.5)
    lz.poli([(-20, H)] + borde_crater + [(W + 20, H)], fill=(70, 62, 78))
    lz.linea(borde_crater, TINTA, 2)
    sharp = [(700, 560), (860, 470), (980, 420), (1080, 360), (1180, 330), (1300, 350), (1420, 400), (1540, 450), (1640, 520), (1640, 600), (700, 600)]
    lz.poli(sharp, fill=(96, 82, 92))
    for k in range(1, 14):                                                              # capas del monte Sharp
        yy = 340 + k * 18
        lz.linea([(700 + k * 6, yy + 40), (1000, yy), (1250, yy - 6), (1640, yy + 10)], (76, 64, 76), 1.4)
    lado_sombra = [(1180, 330), (1300, 350), (1420, 400), (1540, 450), (1640, 520), (1640, 600), (1230, 600)]   # la luz viene de la izquierda
    lz.img.paste(Image.new("RGB", lz.img.size, (64, 54, 66)), (0, 0), lz.mascara(pts=lado_sombra))
    lz.rayado(lz.mascara(pts=lado_sombra), (40, 36, 48), paso=4, angulo=-60, grosor=1)
    lz.poli(sharp, outline=TINTA, ancho=2.5)
    # campo de dunas Bagnold: arena basáltica oscura con ondulaciones grandes
    dunas = cresta(-20, W + 20, 640, 40, 17, picos=9, rugosidad=0.2)
    lz.poli([(-20, H)] + dunas + [(W + 20, H)], fill=(44, 38, 44))
    for k in range(1, 7):
        lz.linea([(x, y + k * 7 + 4 * math.sin(x / 40)) for x, y in dunas[::3]], (70, 60, 66), 1.4)
    lz.linea(dunas, TINTA, 2)
    for k in range(6):                                                                  # remolino de polvo a lo lejos
        lz.linea([(1110 - k * 3, 618 - k * 18), (1126 + k * 4, 614 - k * 18)], (150, 120, 110), 3)
    # llanura del primer término
    suelo = [(0, 720), (500, 700), (900, 716), (1300, 694), (W, 710), (W, H), (0, H)]
    lz.poli(suelo, fill=SUELO)
    lz.rayado(lz.mascara(pts=suelo), SUELO_OSC, paso=6, angulo=6, grosor=1.1)
    lz.punteado(lz.mascara(pts=suelo), SUELO_OSC, 0.03, 31)
    lz.linea(suelo[:5], TINTA, 3)
    # las Murray Buttes: capas finas, cornisas, remate oscuro
    colores = (MELOCOTON, OXIDO, TEAL, TEAL_OSC, BORDE, REMATE)
    butte(lz, 330, 720, 300, 330, 5, colores)
    butte(lz, 1290, 712, 360, 420, 6, colores)
    butte(lz, 820, 700, 150, 150, 7, colores)
    # losas rotas y ondulaciones de arena en primer plano
    for k in range(10):
        y = 790 + k * 11
        lz.linea([(x, y + 3 * math.sin(x / 26 + k)) for x in range(0, W + 20, 20)], SUELO_OSC, 1.2)
    losas(lz, 220, 850, 380, 80, 9, 61, colores)
    losas(lz, 1420, 850, 360, 80, 9, 62, colores)
    # Curiosity y un astronauta del futuro que lo visita; sombras largas hacia la derecha
    lz.poli([(640, 752), (760, 752), (930, 770), (790, 770)], fill=SUELO_OSC)
    curiosity(lz, 720, 712, 1.0)
    lz.poli([(560, 790), (590, 790), (700, 806), (668, 806)], fill=SUELO_OSC)
    lz.rect(538, 736, 552, 764, fill=(200, 196, 190), outline=TINTA, ancho=1.6)
    lz.elipse(546, 710, 572, 736, fill=CREMA, outline=TINTA, ancho=2)
    lz.elipse(556, 716, 570, 730, fill=(43, 74, 99), outline=TINTA, ancho=1)
    lz.arco((558, 718, 568, 728), 200, 260, (200, 230, 255), 1.6)
    lz.rect(546, 734, 572, 778, fill=CREMA, outline=TINTA, ancho=2)
    lz.rect(548, 748, 570, 752, fill=OXIDO)
    lz.linea([(572, 748), (600, 736)], CREMA, 6)
    lz.linea([(572, 748), (600, 736)], TINTA, 1)
    lz.linea([(550, 778), (548, 794)], CREMA, 7)
    lz.linea([(566, 778), (570, 794)], CREMA, 7)
    for k in range(6):                                                                     # huellas de botas
        x, y = 520 - k * 16 + (6 if k % 2 else -6), 800 + k * 12
        lz.elipse(x - 4, y - 2.5, x + 4, y + 2.5, fill=SUELO_OSC)
    for dx in (-8, 8):                                                                     # rodadas de Curiosity
        lz.linea([(760 + dx, 770), (840 + dx, 830), (900 + dx, 900)], SUELO_OSC, 4)
    tintas = [NEGRO, TINTA, OXIDO, MELOCOTON, TEAL, TEAL_OSC, PALIDO, CREMA, BORDE, SUELO, SUELO_OSC, REMATE,
              (34, 26, 36), (48, 36, 46), (60, 54, 76), (52, 80, 120), (70, 120, 176), (110, 170, 220), (255, 255, 255), (200, 230, 255),
              (70, 62, 78), (96, 82, 92), (76, 64, 76), (40, 36, 48), (64, 54, 66), (44, 38, 44), (70, 60, 66), (150, 120, 110),
              (176, 120, 82), (206, 150, 104), (120, 76, 56), (214, 160, 112), (112, 70, 52), (22, 18, 28), (190, 160, 130), (120, 96, 80), (200, 220, 230),
              (236, 230, 216), (214, 170, 96), (150, 146, 140), (60, 58, 66), (250, 248, 240), (190, 182, 166), (120, 170, 220),
              (200, 196, 190), (43, 74, 99)]
    return lz.terminar(tintas)


def main():
    SALIDA.mkdir(parents=True, exist_ok=True)
    escenas = [("estilo_1_cartel", cartel), ("estilo_2_interior", interior), ("estilo_3_carta", carta), ("estilo_4_comic", comic)]
    solo = sys.argv[1:]                      # p. ej.: python herramientas/escenas_estilo.py carta
    imgs = []
    for nombre, f in escenas:
        if solo and not any(s in nombre for s in solo):
            ruta = SALIDA / f"{nombre}.png"
            imgs.append(Image.open(ruta).convert("RGB") if ruta.exists() else f())
            continue
        img = f()
        img.save(SALIDA / f"{nombre}.png", optimize=True)
        imgs.append(img)
        print("creada:", nombre)
    w, h = SALIDA_TAM
    hoja = Image.new("RGB", (w + 30, h + 30), (20, 16, 38))
    for i, img in enumerate(imgs):
        hoja.paste(img.resize((w // 2, h // 2), Image.LANCZOS), (10 + (i % 2) * (w // 2 + 10), 10 + (i // 2) * (h // 2 + 10)))
    hoja.save(SALIDA / "estilos.png", optimize=True)
    print("hoja: docs/propuestas/estilos.png")


if __name__ == "__main__":
    main()
