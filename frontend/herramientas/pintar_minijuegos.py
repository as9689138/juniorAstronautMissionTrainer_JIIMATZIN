"""Arte de los minijuegos (rol 2) en la línea del mapa: tinta violeta, luz desde la izquierda, trama en la sombra.
Cada pieza se dibuja en unidades del lienzo lógico de los minijuegos (960 x 600) y sale al doble (FINAL = 2),
con supermuestreo (K = 8). Referencias reales:
  - Paneles: módulos de silicio monocristalino (celdas pseudocuadradas, 2 barras colectoras), marco de aluminio
    anodizado; el polvo de Marte (óxido de hierro, granos de basalto oscuro) se pega por electricidad estática,
    como a Spirit y Opportunity.
  - Filtro: el "buzón" del Apolo 13 (1970): tapa de cartón del plan de vuelo, cinta gris, manguera del traje y el
    cartucho cuadrado de hidróxido de litio que había que conectar al tubo redondo del módulo lunar.
  - Invernadero: la cámara Veggie de la Estación Espacial (LED rojos, azules y verdes, fuelles transparentes,
    "almohadas" de tela con arcilla cocida) y las zinnias que floreció Scott Kelly en enero de 2016.
Uso:  python herramientas/pintar_minijuegos.py  -> assets/minijuegos/"""
import math
import random
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, str(Path(__file__).parent))
import pintar_zonas as Z  # noqa: E402  (Lienzo, mezcla, resolucion, trazo y la paleta del mapa)

SALIDA = Path(__file__).resolve().parent.parent / "public" / "assets" / "minijuegos"
mezcla = Z.mezcla
TINTA = (24, 20, 52)
K_MJ = 8


def nuevo(w, h, fondo=(0, 0, 0, 0)):
    return Z.Lienzo(w, h, fondo)


def guardar(lz, nombre, jpg=False):
    SALIDA.mkdir(parents=True, exist_ok=True)
    img = lz.reducir()
    if not jpg:
        img = Z.grano_final(img, sum(map(ord, nombre)), 0.022)
    if jpg:
        img.convert("RGB").save(SALIDA / f"{nombre}.jpg", quality=86, optimize=True, progressive=True)
    else:
        img.save(SALIDA / f"{nombre}.png", optimize=True)
    print("  ", nombre, img.size)
    return img


def ruido(lz, caja, colores, n, rnd, r=(0.3, 0.9), alfa=255):
    """Grano: puntitos de colores dentro de una caja (x0, y0, x1, y1)."""
    x0, y0, x1, y1 = caja
    for _ in range(n):
        x, y, rr = rnd.uniform(x0, x1), rnd.uniform(y0, y1), rnd.uniform(*r)
        c = rnd.choice(colores)
        lz.elipse(x - rr, y - rr * 0.8, x + rr, y + rr * 0.8, fill=c if alfa == 255 else c)


def blob(cx, cy, rx, ry, rnd, n=26, rug=0.18):
    """Contorno irregular (montón de polvo, mancha de moho)."""
    fases = [rnd.uniform(0, math.tau) for _ in range(3)]
    pts = []
    for i in range(n):
        a = math.tau * i / n
        f = 1 + rug * (0.55 * math.sin(3 * a + fases[0]) + 0.3 * math.sin(5 * a + fases[1]) + 0.15 * math.sin(9 * a + fases[2]))
        pts.append((cx + math.cos(a) * rx * f, cy + math.sin(a) * ry * f))
    return pts


# =====================================================================================================
# 1. PANELES SOLARES
# =====================================================================================================
def panel_solar():
    """Panel de 716 x 316 (marco de 8 + vidrio de 700 x 300). Módulos de 100 x 100 alineados con la rejilla del
    minijuego (líneas en x = 130 + i·100 e y = 180 + i·100 del lienzo lógico)."""
    W, H, M = 716, 316, 8
    rnd = random.Random(7)
    lz = nuevo(W, H)
    # marco de aluminio anodizado con bisel: arriba e izquierda claros, abajo y derecha oscuros
    lz.poli([(0, 0), (W, 0), (W, H), (0, H)], fill=(150, 156, 176))
    lz.poli([(0, 0), (W, 0), (W - M, M), (M, M), (M, H - M), (0, H)], fill=(206, 210, 226))
    lz.poli([(W, 0), (W, H), (0, H), (M, H - M), (W - M, H - M), (W - M, M)], fill=(112, 116, 140))
    lz.linea([(M, M), (W - M, M)], (240, 242, 250), 0.6)
    # vidrio: fondo de la lámina posterior (se ve entre celdas)
    lz.poli([(M, M), (W - M, M), (W - M, H - M), (M, H - M)], fill=(132, 142, 184))
    celda, sep = 25, 0.55
    for mi in range(7):
        for mj in range(3):
            ox, oy = M + mi * 100, M + mj * 100
            for ci in range(4):
                for cj in range(4):
                    x0, y0 = ox + ci * celda + sep, oy + cj * celda + sep
                    x1, y1 = x0 + celda - 2 * sep, y0 + celda - 2 * sep
                    ch = 3.6                                     # celda pseudocuadrada: esquinas achaflanadas
                    tono = mezcla((16, 26, 66), (30, 44, 104), rnd.uniform(0, 0.35) + (ci + cj) * 0.03)
                    lz.poli([(x0 + ch, y0), (x1 - ch, y0), (x1, y0 + ch), (x1, y1 - ch), (x1 - ch, y1), (x0 + ch, y1),
                             (x0, y1 - ch), (x0, y0 + ch)], fill=tono)
                    for k in range(1, 9):                        # dedos finos (horizontales)
                        yy = y0 + (y1 - y0) * k / 9
                        lz.linea([(x0 + 0.6, yy), (x1 - 0.6, yy)], mezcla(tono, (150, 160, 200), 0.22), 0.18)
                    for f in (0.33, 0.67):                       # 2 barras colectoras (verticales, plateadas)
                        xx = x0 + (x1 - x0) * f
                        lz.linea([(xx, y0 + 0.4), (xx, y1 - 0.4)], (176, 184, 206), 0.55)
            lz.poli([(ox, oy), (ox + 100, oy), (ox + 100, oy + 100), (ox, oy + 100)], outline=(188, 194, 214), ancho=1.4)
    # reflejo del cielo y vetas de brillo diagonales (luz desde la izquierda)
    lz.velo([(M, M), (W - M, M), (W - M, M + 60), (M, M + 120)], (120, 150, 230, 26))
    for x0, ancho_v, a in ((90, 44, 34), (150, 14, 26), (430, 60, 22), (500, 16, 18)):
        lz.velo([(x0, M), (x0 + ancho_v, M), (x0 + ancho_v - 150, H - M), (x0 - 150, H - M)], (255, 255, 255, a))
    # película de polvo fino, más en la parte baja (el polvo se asienta)
    for _ in range(2600):
        x, y = rnd.uniform(M, W - M), M + (H - 2 * M) * (rnd.random() ** 0.45)
        r = rnd.uniform(0.15, 0.45)
        lz.elipse(x - r, y - r, x + r, y + r, fill=rnd.choice([(150, 84, 62), (176, 104, 72), (120, 70, 58)]))
    for i in range(10):                                          # velo de polvo que crece hacia abajo, sin borde
        y0 = H * (0.35 + i * 0.065)
        lz.velo([(M, y0), (W - M, y0 + 4), (W - M, H - M), (M, H - M)], (190, 108, 72, 5))
    # rayones finos en el vidrio
    for _ in range(14):
        x, y, L, a = rnd.uniform(M, W - M), rnd.uniform(M, H - M), rnd.uniform(8, 30), rnd.uniform(-0.6, 0.6)
        lz.linea([(x, y), (x + math.cos(a) * L, y + math.sin(a) * L)], (210, 220, 240), 0.25)
    # escuadras de las esquinas con tornillos y contorno de tinta
    for cx, cy, sx, sy in ((0, 0, 1, 1), (W, 0, -1, 1), (W, H, -1, -1), (0, H, 1, -1)):
        lz.poli([(cx, cy), (cx + sx * 34, cy), (cx + sx * 34, cy + sy * 8), (cx + sx * 8, cy + sy * 8), (cx + sx * 8, cy + sy * 34),
                 (cx, cy + sy * 34)], fill=(92, 96, 120), outline=TINTA, ancho=1)
        for dx, dy in ((20, 4), (4, 20)):
            x, y = cx + sx * dx, cy + sy * dy
            lz.elipse(x - 2, y - 2, x + 2, y + 2, fill=(196, 200, 214), outline=TINTA, ancho=0.5)
            lz.linea([(x - 1.2, y), (x + 1.2, y)], TINTA, 0.4)
    lz.poli([(0, 0), (W, 0), (W, H), (0, H)], outline=TINTA, ancho=2.4)
    lz.poli([(M, M), (W - M, M), (W - M, H - M), (M, H - M)], outline=(60, 64, 96), ancho=1)
    guardar(lz, "mj_panel")


def polvo_marte(k):
    """Montón de regolito fino: una loma blanda y difusa de óxido de hierro (rojizo a ocre claro), iluminada desde
    arriba a la izquierda, con grano fino de poco contraste y polvillo suelto en el borde (no es una piedra)."""
    rnd = random.Random(100 + k)
    W, H = 60, 50
    lz = nuevo(W, H)
    cx, cy, rx, ry, alto = W / 2, H / 2 + 4, 21 + rnd.uniform(-2, 2), 9.5, 5.5 + rnd.uniform(-1, 1.5)
    forma = blob(0, 0, rx, ry, rnd, n=34, rug=0.26)
    lz.sombra_suave([(cx + x * 1.02 + 2.5, cy + y * 1.02 + 2.5) for x, y in forma], (14, 12, 44), 0.6, 2.6)
    rampa = [(120, 64, 48), (146, 82, 58), (170, 102, 70), (192, 124, 86), (210, 150, 108), (226, 178, 136)]
    pasos = 16
    for i in range(pasos):                                         # cuerpo: capas cada vez más pequeñas y claras
        t = 1 - i / pasos * 0.85
        ox, oy = -4.5 * (1 - t), -alto * (1 - t) * 0.9
        j = min(len(rampa) - 1.001, (1 - t) / 0.85 * (len(rampa) - 1))
        col = mezcla(rampa[int(j)], rampa[int(j) + 1], j - int(j))
        lz.poli([(cx + ox + x * t, cy + oy + y * t) for x, y in forma], fill=col)
    lz.velo([(cx + x * 0.98, cy + y * 0.98) for x, y in forma if x > -2], (70, 30, 34, 38))      # lado derecho en sombra
    for _ in range(1100):                                          # grano fino, casi del mismo tono
        th, r = rnd.uniform(0, math.tau), math.sqrt(rnd.random()) * 0.97
        x, y = cx + math.cos(th) * rx * r, cy + math.sin(th) * ry * r - (1 - r * r) * alto * 0.8
        base = rampa[min(5, max(0, int(5 - r * 4 + (-math.cos(th) - math.sin(th)) * r * 1.2)))]
        col = mezcla(base, rnd.choice([(255, 220, 170), (90, 40, 30)]), rnd.uniform(0.05, 0.22))
        rr = rnd.uniform(0.22, 0.5)
        lz.elipse(x - rr, y - rr, x + rr, y + rr, fill=col)
    for _ in range(170):                                           # polvillo suelto en el borde
        th = rnd.uniform(0, math.tau)
        r = rnd.uniform(0.95, 1.35)
        x, y = cx + math.cos(th) * rx * r, cy + math.sin(th) * ry * r
        rr = rnd.uniform(0.2, 0.45)
        lz.elipse(x - rr, y - rr, x + rr, y + rr, fill=rnd.choice(rampa[1:4]))
    for _ in range(4):                                             # granos oscuros de basalto, pocos y pequeños
        x, y = cx + rnd.uniform(-13, 13), cy + rnd.uniform(-6, 7) - alto * 0.4
        lz.elipse(x - 0.6, y - 0.5, x + 0.6, y + 0.5, fill=(70, 54, 54))
    arco = [(cx + x, cy + y) for x, y in forma[2:14]]               # filo suave abajo a la derecha
    lz.linea(arco, (118, 56, 44), 0.45)
    guardar(lz, f"mj_polvo_{k}")


# =====================================================================================================
# 2. FILTRO DE CO2 (Apolo 13, 1970)
# =====================================================================================================
def bezier(p0, p1, p2, p3, n=40):
    return [tuple((1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d
                  for a, b, c, d in zip(p0, p1, p2, p3)) for t in np.linspace(0, 1, n)]


def carton(lz=None, ox=0, oy=0, silueta=None):
    """Tapa de cartón del plan de vuelo, doblada como embudo (con la franja impresa y el canto ondulado)."""
    propio = lz is None
    if propio:
        lz = nuevo(175, 56)
    rnd = random.Random(21)
    P = lambda x, y: (ox + x, oy + y)
    sup = bezier((8, 12), (60, 2), (118, 2), (168, 10))           # canto de arriba, curvado por el doblez
    inf = bezier((22, 48), (70, 54), (112, 54), (156, 46))
    forma = [P(*p) for p in sup] + [P(*p) for p in inf[::-1]]
    if silueta:
        lz.poli(forma, outline=silueta, ancho=1.4)
        return
    lz.sombra_suave([(x + 2, y + 3) for x, y in forma], (10, 8, 30), 0.45, 2)
    lz.poli(forma, fill=(206, 186, 146))
    lz.velo([P(96, 0), P(170, 6), P(158, 50), P(110, 56)], (90, 66, 50, 70))          # la curva se aleja de la luz
    franja = [P(*p) for p in bezier((14, 18), (62, 9), (116, 9), (166, 16))] + [P(*p) for p in bezier((18, 28), (64, 20), (114, 20), (163, 26))[::-1]]
    lz.poli(franja, fill=(44, 62, 112))
    for k in range(9):                                                                # renglones impresos de la franja
        x = 34 + k * 12
        lz.linea([P(x, 15.5 - abs(k - 4) * 0.25), P(x + 8, 15.3 - abs(k - 4) * 0.25)], (228, 232, 246), 0.9)
    for k in range(4):                                                                # renglones impresos
        y = 33 + k * 4
        lz.linea([P(30 + k * 2, y), P(140 - k * 3, y - 1)], (150, 132, 104), 0.5)
    for k in range(11):                                                               # canto ondulado (corrugado)
        x = 10 + k * 1.3
        lz.linea([P(x, 12 + k * 3.3), P(x + 1.2, 13.6 + k * 3.3)], (150, 120, 84), 0.5)
    for x0 in (58, 112):                                                              # pliegues
        lz.linea([P(x0, 5), P(x0 + 6, 53)], (160, 136, 100), 0.7)
        lz.linea([P(x0 + 1, 5), P(x0 + 7, 53)], (232, 216, 180), 0.4)
    for _ in range(120):
        x, y = rnd.uniform(14, 160), rnd.uniform(10, 50)
        lz.elipse(ox + x - 0.3, oy + y - 0.3, ox + x + 0.3, oy + y + 0.3, fill=rnd.choice([(180, 160, 122), (222, 204, 166)]))
    lz.poli(forma, outline=TINTA, ancho=1.3)
    if propio:
        guardar(lz, "mj_carton")


def cinta(lz=None, ox=0, oy=0, silueta=None):
    """Rollo de cinta gris (de tela plastificada), en vista de tres cuartos, con una tira arrancada a mano."""
    propio = lz is None
    if propio:
        lz = nuevo(175, 56)
    rnd = random.Random(22)
    cx, cy = ox + 30, oy + 28
    tira = [(cx + 6, cy - 19), (ox + 150, oy + 13), (ox + 154, oy + 16), (ox + 151, oy + 19), (ox + 156, oy + 22),
            (ox + 152, oy + 26), (ox + 155, oy + 29), (ox + 150, oy + 33), (cx + 10, cy - 2)]
    if silueta:
        lz.poli(tira, outline=silueta, ancho=1.4)
        lz.elipse(cx - 24, cy - 23, cx + 20, cy + 23, outline=silueta, ancho=1.4)
        return
    lz.sombra_suave([(cx - 20, cy + 22), (ox + 156, oy + 36), (ox + 150, oy + 40), (cx - 10, cy + 26)], (10, 8, 30), 0.4, 2)
    lz.poli(tira, fill=(168, 174, 188))
    for k in range(26):                                                               # trama de la tela
        x = cx + 8 + k * 4.6
        lz.linea([(x, oy + 12 + k * 0.1), (x + 4, oy + 33)], (146, 152, 168), 0.3)
    lz.linea([(cx + 6, cy - 19), (ox + 150, oy + 13)], (226, 230, 240), 0.8)              # brillo del borde
    lz.velo([(cx + 10, cy - 2), (ox + 150, oy + 33), (ox + 150, oy + 29), (cx + 10, cy - 6)], (40, 40, 70, 60))
    lz.poli(tira, outline=TINTA, ancho=1)
    lz.elipse(cx - 20, cy - 22, cx + 24, cy + 24, fill=(96, 100, 118), outline=TINTA, ancho=1.2)   # canto del rollo
    lz.elipse(cx - 24, cy - 23, cx + 20, cy + 23, fill=(170, 176, 190), outline=TINTA, ancho=1.3)  # cara
    for r in range(4, 22, 3):                                                         # vueltas de cinta
        lz.elipse(cx - 2 - r, cy - r * 1.04, cx - 2 + r, cy + r * 1.04, outline=(150, 156, 172), ancho=0.4)
    lz.elipse(cx - 13, cy - 12, cx + 9, cy + 12, fill=(176, 140, 96), outline=TINTA, ancho=0.9)   # tubo de cartón
    lz.elipse(cx - 10, cy - 9, cx + 6, cy + 9, fill=(44, 36, 70))
    lz.velo([(cx - 23, cy - 10), (cx - 8, cy - 22), (cx - 2, cy - 20), (cx - 18, cy - 4)], (255, 255, 255, 70))
    if propio:
        guardar(lz, "mj_cinta")


def manguera(lz=None, ox=0, oy=0, silueta=None):
    """Manguera del traje espacial: tubo corrugado gris con conectores de aluminio anodizado (azul y rojo)."""
    propio = lz is None
    if propio:
        lz = nuevo(175, 56)
    camino = [(ox + x, oy + y) for x, y in bezier((30, 30), (64, 4), (104, 54), (146, 26), 70)]
    if silueta:
        lz.linea(camino, silueta, 1.4)
        lz.poli([(ox + 4, oy + 20), (ox + 30, oy + 20), (ox + 30, oy + 40), (ox + 4, oy + 40)], outline=silueta, ancho=1.4)
        lz.poli([(ox + 146, oy + 16), (ox + 171, oy + 16), (ox + 171, oy + 36), (ox + 146, oy + 36)], outline=silueta, ancho=1.4)
        return
    lz.sombra_suave([(x + 2, y + 6) for x, y in camino] + [(x + 2, y + 14) for x, y in camino[::-1]], (10, 8, 30), 0.35, 2)
    lz.linea(camino, TINTA, 15)
    lz.linea(camino, (128, 134, 150), 12.5)
    lz.linea([(x, y - 3) for x, y in camino], (176, 182, 198), 5)
    lz.linea([(x - 0.5, y - 4) for x, y in camino], (226, 230, 240), 1.4)
    for i in range(1, len(camino) - 1):                                               # anillos del corrugado
        (x0, y0), (x1, y1) = camino[i - 1], camino[i + 1]
        dx, dy = x1 - x0, y1 - y0
        n = math.hypot(dx, dy) or 1
        px, py = -dy / n * 6, dx / n * 6
        x, y = camino[i]
        lz.linea([(x - px, y - py), (x + px, y + py)], (82, 86, 110) if i % 2 else (196, 200, 214), 0.6)
    for (x0, y0, x1, y1), col in (((4, 20, 30, 40), (66, 120, 210)), ((146, 16, 171, 36), (206, 70, 64))):
        a, b = (ox + x0, oy + y0), (ox + x1, oy + y1)
        lz.poli([a, (b[0], a[1]), b, (a[0], b[1])], fill=col, outline=TINTA, ancho=1.1)
        lz.poli([(a[0], a[1] + 2), (b[0], a[1] + 2), (b[0], a[1] + 6), (a[0], a[1] + 6)], fill=mezcla(col, (255, 255, 255), 0.45))
        for k in range(5):                                                            # moleteado
            x = a[0] + 4 + k * (b[0] - a[0] - 8) / 4
            lz.linea([(x, a[1] + 9), (x, b[1] - 2)], mezcla(col, TINTA, 0.5), 0.6)
    if propio:
        guardar(lz, "mj_manguera")


def ranura(nombre, dibujar):
    """Hueco del adaptador (150 x 74): bandeja hundida con la silueta punteada de la pieza que va ahí."""
    lz = nuevo(150, 74)
    lz.poli([(2, 2), (148, 2), (148, 72), (2, 72)], fill=(20, 26, 50), outline=TINTA, ancho=1.6)
    lz.velo([(2, 2), (148, 2), (144, 8), (8, 8), (8, 68), (2, 72)], (0, 0, 0, 90))              # borde interior en sombra
    lz.velo([(148, 2), (148, 72), (2, 72), (8, 68), (144, 68), (144, 8)], (150, 160, 220, 40))
    e = 0.82                                                         # la pieza encaja al 82 % (como en el minijuego)
    capa = nuevo(150 / e, 74 / e)
    dibujar(capa, (150 / e - 175) / 2, (74 / e - 56) / 2, (170, 196, 255))
    sil = capa.img.resize(lz.img.size, Image.LANCZOS)
    a = np.asarray(sil).copy()
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    a[..., 3] = np.where(((xx + yy) // int(4 * Z.K)) % 2 == 0, a[..., 3], 0)          # punteado
    lz.img.alpha_composite(Image.fromarray(a), (0, 0))
    guardar(lz, f"mj_ranura_{nombre}")


def remaches(lz, pts, r=1.6):
    for x, y in pts:
        lz.elipse(x - r, y - r, x + r, y + r, fill=(150, 146, 190), outline=TINTA, ancho=0.5)
        lz.elipse(x - r * 0.5, y - r * 0.6, x, y - r * 0.1, fill=(220, 218, 245))


def placa(w, h, rnd, color=(34, 30, 72)):
    """Placa metálica con cabecera, remaches y desgaste (fondo de los recipientes del minijuego)."""
    lz = nuevo(w, h)
    lz.poli([(0, 0), (w, 0), (w, h), (0, h)], fill=color)
    lz.poli([(0, 0), (w, 0), (w, 44), (0, 44)], fill=mezcla(color, (0, 0, 0), 0.35))
    lz.linea([(0, 44), (w, 44)], mezcla(color, (255, 255, 255), 0.25), 1)
    lz.rayado([(0, 44), (w, 44), (w, h), (0, h)], mezcla(color, (255, 255, 255), 0.05), 6, -60, 0.4)
    for _ in range(25):
        x, y, L = rnd.uniform(4, w - 4), rnd.uniform(50, h - 4), rnd.uniform(4, 14)
        lz.linea([(x, y), (x + L, y + rnd.uniform(-2, 2))], mezcla(color, (255, 255, 255), 0.12), 0.3)
    remaches(lz, [(8, 8), (w - 8, 8), (8, h - 8), (w - 8, h - 8)])
    return lz


def recipientes():
    rnd = random.Random(30)
    # bandeja de piezas (310 x 365): espuma con el hueco de cada pieza
    lz = placa(310, 365, rnd)
    for k, dibujo in enumerate((carton, cinta, manguera)):
        cy = 92.5 + k * 90
        x0, y0, x1, y1 = 155 - 96, cy - 34, 155 + 96, cy + 34
        lz.poli([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], fill=(26, 22, 56), outline=TINTA, ancho=1)
        lz.velo([(x0, y0), (x1, y0), (x1 - 4, y0 + 5), (x0 + 4, y0 + 5)], (0, 0, 0, 120))
        for _ in range(420):                                                   # espuma de celda abierta
            x, y = rnd.uniform(x0 + 2, x1 - 2), rnd.uniform(y0 + 2, y1 - 2)
            t = rnd.uniform(0.3, 0.8)
            lz.elipse(x - t, y - t, x + t, y + t, fill=rnd.choice(((40, 36, 78), (18, 16, 42), (52, 48, 96))))
        lz.d.pieslice([(155 - 16) * Z.K, (y1 - 14) * Z.K, (155 + 16) * Z.K, (y1 + 14) * Z.K], 180, 360,
                      fill=(16, 14, 38))                                       # muesca para meter los dedos
        lz.linea([(x0 + 2, y1 - 1), (x1 - 2, y1 - 1)], (70, 64, 120), 0.8)          # canto de la espuma con luz
        lz.poli([(x0 + 70, y1 + 3), (x1 - 70, y1 + 3), (x1 - 70, y1 + 9), (x0 + 70, y1 + 9)], fill=(214, 220, 236),
                outline=TINTA, ancho=0.5)                                     # etiqueta (el nombre lo pone el juego)
    for y in (150, 240):                                                     # asas a los lados
        for x0 in (2, 300):
            lz.poli([(x0, y), (x0 + 8, y), (x0 + 8, y + 24), (x0, y + 24)], fill=(150, 146, 190), outline=TINTA, ancho=0.8)
    Z.trama(lz, [(230, 46), (308, 46), (308, 363), (230, 363)], (1, -1), 4.5, (14, 12, 34), rnd, 0.4)   # lado en sombra
    for _ in range(40):                                                       # rayones en los cantos
        x = rnd.uniform(6, 304)
        lz.linea([(x, 361), (x + rnd.uniform(2, 7), 361 - rnd.uniform(-0.5, 0.5))], (120, 116, 170), 0.35)
    lz.poli([(0, 0), (310, 0), (310, 365), (0, 365)], outline=TINTA, ancho=2.4)
    guardar(lz, "mj_bandeja")
    # placa del adaptador (420 x 365): cartucho cuadrado de LiOH y tubo redondo del módulo lunar
    lz = placa(420, 365, rnd, (30, 34, 70))
    # cartucho cuadrado (abajo a la izquierda)
    x0, y0, s = 34, 222, 66
    lz.sombra_suave([(x0 + 6, y0 + s + 2), (x0 + s + 18, y0 + s + 2), (x0 + s + 18, y0 + 12)], (0, 0, 0), 0.5, 3)
    lz.poli([(x0, y0 + 10), (x0 + s, y0 + 10), (x0 + s, y0 + s + 10), (x0, y0 + s + 10)], fill=(170, 176, 196), outline=TINTA, ancho=1.3)
    lz.poli([(x0, y0 + 10), (x0 + 12, y0), (x0 + s + 12, y0), (x0 + s, y0 + 10)], fill=(214, 218, 232), outline=TINTA, ancho=1.1)
    lz.poli([(x0 + s, y0 + 10), (x0 + s + 12, y0), (x0 + s + 12, y0 + s), (x0 + s, y0 + s + 10)], fill=(118, 122, 150), outline=TINTA, ancho=1.1)
    lz.rayado([(x0 + s, y0 + 10), (x0 + s + 12, y0), (x0 + s + 12, y0 + s), (x0 + s, y0 + s + 10)], (90, 92, 124), 2.2, -60, 0.3)
    for i in range(6):
        for j in range(6):
            cx, cy = x0 + 9 + i * 9.6, y0 + 19 + j * 9.6
            lz.elipse(cx - 2.2, cy - 2.2, cx + 2.2, cy + 2.2, fill=(84, 88, 116))
    # tubo redondo (abajo a la derecha)
    cx, cy, r = 352, 262, 30
    lz.elipse(cx - r - 8, cy - r - 8, cx + r + 8, cy + r + 8, fill=(150, 156, 180), outline=TINTA, ancho=1.3)
    for a in range(0, 360, 45):
        bx, by = cx + math.cos(math.radians(a)) * (r + 4), cy + math.sin(math.radians(a)) * (r + 4)
        remaches(lz, [(bx, by)], 1.8)
    lz.elipse(cx - r, cy - r, cx + r, cy + r, fill=(16, 14, 34), outline=TINTA, ancho=1.2)
    lz.elipse(cx - r + 5, cy - r + 5, cx + r - 2, cy + r - 2, fill=(30, 26, 60))
    flecha = [(118, 266), (296, 266)]                                          # el reto: cuadrado -> redondo
    lz.linea(flecha, (255, 200, 61), 1.4)
    lz.poli([(296, 260), (306, 266), (296, 272)], fill=(255, 200, 61))
    lz.poli([(0, 0), (420, 0), (420, 365), (0, 365)], outline=TINTA, ancho=2.4)
    guardar(lz, "mj_adaptador")


# =====================================================================================================
# 3. INVERNADERO (cámara Veggie, zinnias de 2016)
# =====================================================================================================
# La zinnia que floreció en la Estación Espacial en enero de 2016 era NARANJA (variedad 'Profusion Orange').
# Tres flores con tres tonos de ese naranja, de más rojizo a más dorado (nunca rosa ni morado).
COLORES_ZINNIA = [((222, 92, 34), (255, 168, 92)), ((236, 118, 30), (255, 190, 110)), ((240, 140, 40), (255, 206, 128))]


def veggie():
    """Cámara Veggie (810 x 345): banco de LED arriba (rojos, azules y verdes), luz magenta, fuelles transparentes
    a los lados y la placa de raíces abajo."""
    W, H = 810, 345
    rnd = random.Random(40)
    lz = nuevo(W, H)
    lz.poli([(0, 0), (W, 0), (W, H), (0, H)], fill=(52, 30, 78))
    for k in range(24):                                                       # luz magenta que baja de los LED
        y = 30 + k * 13
        lz.velo([(30, y), (W - 30, y), (W - 30, y + 13), (30, y + 13)], (232, 96, 200, int(max(0, 34 - k * 1.4))))
    lz.poli([(0, 0), (W, 0), (W, 30), (0, 30)], fill=(40, 40, 60), outline=TINTA, ancho=1.4)   # banco de LED
    for i in range(98):
        x = 12 + i * 8.05
        for j, y in enumerate((9, 17, 24)):
            col = [(255, 70, 70), (255, 70, 70), (80, 120, 255), (255, 70, 70), (90, 230, 120)][(i + j * 2) % 5]
            lz.elipse(x - 1.5, y - 1.5, x + 1.5, y + 1.5, fill=col)
    for lado in (0, 1):                                                       # fuelles transparentes (acordeón)
        x0 = 6 if lado == 0 else W - 34
        lz.velo([(x0, 30), (x0 + 28, 30), (x0 + 28, H - 34), (x0, H - 34)], (200, 220, 255, 30))
        for k in range(16):
            y = 34 + k * 17.5
            lz.linea([(x0, y), (x0 + 14, y + 8), (x0 + 28, y)], (220, 230, 255), 0.6)
            lz.linea([(x0, y + 8.5), (x0 + 14, y + 16.5), (x0 + 28, y + 8.5)], (120, 110, 170), 0.5)
    for x in range(14, W - 14, 6):                                            # aletas del disipador del banco de LED
        lz.linea([(x, 1.5), (x, 6)], (86, 88, 112), 1.2)
    for x0 in (10, W - 44):                                                   # ventiladores del banco de LED
        lz.elipse(x0, 3, x0 + 34, 27, fill=(30, 30, 46), outline=TINTA, ancho=0.8)
        for a in range(0, 360, 60):
            ax, ay = x0 + 17 + math.cos(math.radians(a)) * 10, 15 + math.sin(math.radians(a)) * 10
            lz.linea([(x0 + 17, 15), (ax, ay)], (110, 112, 140), 1.6)
        lz.elipse(x0 + 14, 12, x0 + 20, 18, fill=(150, 150, 176))
    for k in range(7):                                                        # reflejos del fuelle frontal transparente
        x = 70 + k * 104 + rnd.uniform(-10, 10)
        lz.velo([(x, 36), (x + 22, 36), (x - 60, H - 40), (x - 80, H - 40)], (255, 255, 255, 14 if k % 2 else 22))
    for k in range(10):                                                       # pliegues del fuelle (verticales, suaves)
        x = 60 + k * 72
        lz.linea([(x, 34), (x + rnd.uniform(-4, 4), H - 38)], (200, 190, 240), 0.5)
    Z.trama(lz, [(W * 0.7, 32), (W - 36, 32), (W - 36, H - 36), (W * 0.7, H - 36)], (1, -1), 4.5,
            (36, 20, 60), rnd, 0.45)                                          # el lado derecho, más lejos de la luz
    lz.poli([(W - 120, H - 70), (W - 50, H - 70), (W - 50, H - 40), (W - 120, H - 40)], fill=(54, 56, 80), outline=TINTA, ancho=1)
    for i, col in enumerate(((124, 240, 160), (255, 200, 61), (94, 200, 242))):   # caja de control con 3 LED
        lz.elipse(W - 112 + i * 14, H - 60, W - 105 + i * 14, H - 53, fill=col, outline=TINTA, ancho=0.4)
    lz.poli([(W - 112, H - 48), (W - 60, H - 48), (W - 60, H - 44), (W - 112, H - 44)], fill=(30, 30, 46))
    for y in (40, H - 46):                                                    # rieles de aluminio con tornillos
        lz.poli([(4, y), (W - 4, y), (W - 4, y + 5), (4, y + 5)], fill=(184, 190, 210), outline=TINTA, ancho=0.6)
        for x in range(16, W - 10, 60):
            lz.elipse(x - 1.4, y + 1, x + 1.4, y + 3.8, fill=(110, 114, 140))
    lz.poli([(0, H - 34), (W, H - 34), (W, H), (0, H)], fill=(110, 76, 66), outline=TINTA, ancho=1.2)   # placa de raíces
    for _ in range(1500):
        x, y = rnd.uniform(2, W - 2), rnd.uniform(H - 32, H - 2)
        lz.elipse(x - 0.4, y - 0.4, x + 0.4, y + 0.4, fill=rnd.choice([(130, 92, 76), (92, 64, 56), (150, 112, 90)]))
    lz.poli([(0, 0), (W, 0), (W, H), (0, H)], outline=(214, 220, 236), ancho=5)
    lz.poli([(0, 0), (W, 0), (W, H), (0, H)], outline=TINTA, ancho=1.6)
    remaches(lz, [(6, H - 6), (W - 6, H - 6), (W / 2, H - 6)])
    guardar(lz, "mj_veggie")


def cojin(k):
    """Almohada de cultivo de Veggie: bolsa de tela (Nomex) abombada, con arcilla cocida, costura acolchada,
    mechas de riego que bajan a la placa de raíces y su etiqueta."""
    rnd = random.Random(50 + k)
    W, H = 104, 70
    lz = nuevo(W, H)
    lz.sombra_suave([(12, H - 8), (W - 10, H - 8), (W - 14, H - 2), (16, H - 2)], (20, 10, 40), 0.6, 2.5)
    izq = bezier((14, 18), (2, 28), (4, 54), (18, 62), 16)
    abajo = bezier((18, 62), (40, 68), (66, 68), (88, 62), 16)
    der = bezier((88, 62), (102, 54), (104, 28), (92, 18), 16)
    arriba = bezier((92, 18), (70, 14), (34, 14), (14, 18), 16)
    cuerpo = izq + abajo[1:] + der[1:] + arriba[1:]
    lz.poli(cuerpo, fill=(226, 214, 186))
    lz.velo([(52, 14)] + abajo[8:] + der[1:] + arriba[1:9], (96, 70, 110, 70))                 # lado en sombra
    lz.velo(bezier((10, 30), (20, 22), (36, 20), (46, 22), 10) + [(40, 40), (12, 44)], (255, 255, 240, 60))   # brillo
    costura = bezier((8, 40), (34, 46), (70, 46), (98, 40), 24)
    for i in range(0, len(costura) - 1, 2):                                       # costura acolchada
        lz.linea([costura[i], costura[i + 1]], (164, 146, 124), 0.6)
    for x0 in (22, 40, 58, 76):                                                   # arrugas de la tela
        lz.linea(bezier((x0, 46), (x0 + 3, 52), (x0 - 2, 57), (x0 + 1, 62), 8), (190, 172, 146), 0.45)
    lz.elipse(15, 10, 91, 25, fill=(208, 194, 164), outline=TINTA, ancho=1)       # boca de la bolsa
    lz.elipse(21, 12, 85, 23, fill=(96, 62, 48))
    for _ in range(160):                                                          # arcilla cocida (arcillite)
        a_, rr = rnd.uniform(0, math.tau), math.sqrt(rnd.random())
        x, y = 53 + math.cos(a_) * rr * 30, 17.5 + math.sin(a_) * rr * 4.6
        lz.elipse(x - 0.8, y - 0.6, x + 0.8, y + 0.6, fill=rnd.choice([(196, 132, 92), (170, 108, 76), (222, 166, 120)]))
    for x in (34, 72):                                                            # mechas de riego
        lz.linea(bezier((x, 64), (x + 1, 66), (x - 1, 68), (x + 1, H - 1), 6), (244, 244, 250), 1.2)
    lz.poli([(62, 27), (84, 27), (84, 37), (62, 37)], fill=(246, 242, 232), outline=TINTA, ancho=0.6)
    for j, g in enumerate((0.5, 0.3, 0.6, 0.3, 0.5, 0.8, 0.3, 0.5, 0.3, 0.6, 0.4)):   # código de barras de la etiqueta
        lz.linea([(65 + j * 1.6, 29.5), (65 + j * 1.6, 34.5)], (60, 60, 90), g)
    lz.poli(cuerpo, outline=TINTA, ancho=1.4)
    guardar(lz, f"mj_cojin_{k}")


def tallo(k):
    """Tallo con hojas opuestas y lanceoladas de zinnia (120 x 110, la base abajo al centro)."""
    rnd = random.Random(60 + k)
    W, H = 120, 110
    lz = nuevo(W, H)
    cx = W / 2
    tallo_pts = [(cx + math.sin(t * 2.4 + k) * 2.2, H - 2 - t * (H - 10)) for t in np.linspace(0, 1, 30)]
    lz.linea(tallo_pts, TINTA, 5.5)
    lz.linea(tallo_pts, (74, 140, 70), 4)
    lz.linea([(x - 1, y) for x, y in tallo_pts], (140, 200, 110), 1.1)
    for j, (t, L) in enumerate(((0.2, 34), (0.5, 30), (0.75, 22))):
        x, y = tallo_pts[int(t * 29)]
        for lado in (-1, 1):
            ang = math.radians(-18 - j * 8 + rnd.uniform(-6, 6))
            dx, dy = math.cos(ang) * lado, math.sin(ang)
            px, py = -dy * lado, dx * lado
            punta = (x + dx * L, y + dy * L * 0.9)
            ancho_h = 7 - j
            izq = [(x + dx * L * f + px * ancho_h * w_, y + dy * L * 0.9 * f + py * ancho_h * w_) for f, w_ in ((0.2, 0.7), (0.5, 1), (0.8, 0.55))]
            der = [(x + dx * L * f - px * ancho_h * w_ * 0.8, y + dy * L * 0.9 * f - py * ancho_h * w_ * 0.8) for f, w_ in ((0.8, 0.55), (0.5, 1), (0.2, 0.7))]
            claro = lado < 0                                                     # luz desde la izquierda
            col = (104, 176, 92) if claro else (64, 128, 72)
            hoja = [(x, y)] + izq + [punta] + der
            lz.poli(hoja, fill=col)
            lz.poli([(x, y)] + izq + [punta], fill=mezcla(col, (190, 230, 150), 0.25))
            lz.linea([(x, y), punta], mezcla(col, (230, 250, 210), 0.45), 0.5)
            for f in (0.35, 0.6):                                               # nervios secundarios
                bx, by = x + dx * L * f, y + dy * L * 0.9 * f
                lz.linea([(bx, by), (bx + px * ancho_h * 0.7 + dx * 4, by + py * ancho_h * 0.7 + dy * 4)], mezcla(col, (230, 250, 210), 0.3), 0.3)
            lz.poli(hoja, outline=TINTA, ancho=0.8)
    guardar(lz, f"mj_tallo_{k}")


def petalo(base, d, L, w):
    """Pétalo de zinnia: estrecho en la base, ancho cerca de la punta, punta redonda con una mella pequeña."""
    dx, dy = d
    px, py = -dy, dx
    izq, der = [], []
    for t in np.linspace(0, 0.82, 9):
        hw = w * 0.5 * (0.32 + 0.68 * math.sin(min(1, t / 0.82) * math.pi / 2))
        x, y = base[0] + dx * L * t, base[1] + dy * L * t
        izq.append((x + px * hw, y + py * hw))
        der.append((x - px * hw, y - py * hw))
    cx, cy, r = base[0] + dx * L * 0.82, base[1] + dy * L * 0.82, w * 0.5
    punta = []
    for ang in np.linspace(math.pi / 2, -math.pi / 2, 11):                       # media vuelta por la punta
        mella = 0.82 if abs(ang) < 0.18 else 1
        rx = math.cos(ang) * r * 1.05 * mella
        ry = math.sin(ang) * r
        punta.append((cx + dx * rx + px * ry, cy + dy * rx + py * ry))
    return izq + punta + der[::-1]


def flor(k):
    """Cabeza de zinnia (84 x 84): dos o tres vueltas de pétalos oblongos con la punta mellada, centro rojizo y
    una corona de florecitas amarillas en forma de estrella."""
    rnd = random.Random(70 + k)
    W = H = 84
    cx, cy = W / 2, H / 2 + 1
    oscuro, claro = COLORES_ZINNIA[k]
    lz = nuevo(W, H)
    for capa, (n, L, a0) in enumerate(((16, 36, 0.0), (14, 29, 0.2), (12, 21, 0.1))):
        for i in range(n):
            a = a0 + math.tau * i / n + rnd.uniform(-0.06, 0.06)
            dx, dy = math.cos(a), math.sin(a) * 0.86                              # la flor mira un poco hacia arriba
            px, py = -dy, dx
            Lp, w = L * rnd.uniform(0.9, 1.05), 6.8 - capa * 0.8
            base = (cx + dx * 6, cy + dy * 6)
            punta = (cx + dx * Lp, cy + dy * Lp)
            pet = petalo(base, (dx, dy), Lp - 6, w)
            luz = 0.5 + 0.5 * (-math.cos(a) * 0.6 - math.sin(a) * 0.5)
            col = mezcla(oscuro, claro, max(0, min(1, luz * 0.8 + capa * 0.12)))
            lz.poli(pet, fill=col)
            lz.linea([base, punta], mezcla(col, oscuro, 0.5), 0.35)
            lz.poli(pet, outline=mezcla(TINTA, oscuro, 0.3), ancho=0.55)
    lz.elipse(cx - 11, cy - 9.5, cx + 11, cy + 9.5, fill=(122, 40, 40), outline=TINTA, ancho=0.8)    # centro
    for i in range(10):                                                                # florecitas en estrella
        a = math.tau * i / 10
        x, y = cx + math.cos(a) * 8, cy + math.sin(a) * 7
        lz.poli([(x + math.cos(a + t * math.tau / 5) * (2.2 if t % 1 == 0 else 1), y + math.sin(a + t * math.tau / 5) * 2.2)
                 for t in range(5)], fill=(255, 216, 60), outline=(150, 90, 20), ancho=0.3)
    lz.elipse(cx - 5, cy - 4.2, cx + 5, cy + 4.2, fill=(88, 30, 32))
    lz.elipse(cx - 3, cy - 3, cx - 0.5, cy - 1, fill=(200, 120, 90))
    guardar(lz, f"mj_flor_{k}")


def moho():
    """Moho (como el que les salió a las zinnias por la humedad): manchas blancas y vellosas con filamentos."""
    rnd = random.Random(80)
    W, H = 140, 120
    lz = nuevo(W, H)
    for cx, cy, r in ((44, 74, 7), (92, 60, 6), (70, 98, 9), (100, 86, 5), (36, 52, 5), (60, 66, 4)):
        lz.velo(blob(cx, cy, r * 1.4, r, rnd), (60, 70, 50, 70))                       # hoja amarillenta debajo
        mancha = blob(cx, cy, r, r * 0.75, rnd, rug=0.3)
        lz.poli(mancha, fill=(214, 220, 206))
        for _ in range(int(r * 9)):                                                     # filamentos
            a, rr = rnd.uniform(0, math.tau), rnd.uniform(0.3, 1.25) * r
            x, y = cx + math.cos(a) * rr, cy + math.sin(a) * rr * 0.75
            lz.linea([(x, y), (x + rnd.uniform(-3, 3), y + rnd.uniform(-3, 3))], (240, 244, 236), 0.35)
        ruido(lz, (cx - r * 0.6, cy - r * 0.45, cx + r * 0.6, cy + r * 0.45), [(170, 180, 160), (250, 252, 246)], int(r * 4), rnd, (0.3, 0.7))
    img = lz.img
    a = np.asarray(img).astype(np.float32)
    a[..., 3] *= 0.92
    lz.img = Image.fromarray(a.astype(np.uint8))
    lz.d = Z.ImageDraw.Draw(lz.img)
    guardar(lz, "mj_moho")


# =====================================================================================================
# 4. FONDOS (960 x 600, oscurecidos para que la interfaz se lea encima)
# =====================================================================================================
def oscurecer(lz, factor, viñeta=0.55):
    a = np.asarray(lz.img).astype(np.float32)
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    a[..., :3] *= (factor * (1 - viñeta * np.clip(d - 0.35, 0, 1)))[..., None]
    lz.img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    lz.d = Z.ImageDraw.Draw(lz.img)


def fondo_paneles():
    """Suelo de Marte al atardecer bajo el panel: regolito con estrías del viento, rocas y los soportes."""
    rnd = random.Random(90)
    W, H = 960, 600
    lz = nuevo(W, H, (150, 82, 56, 255))
    for k in range(18):                                                              # bandas de color del suelo
        y = k * 36
        lz.velo([(0, y), (W, y + rnd.uniform(-10, 10)), (W, y + 40), (0, y + 36)], rnd.choice([(170, 96, 62, 40), (120, 64, 48, 40), (190, 116, 74, 30)]))
    for _ in range(90):                                                              # estrías del viento
        x, y, L = rnd.uniform(-50, W), rnd.uniform(0, H), rnd.uniform(40, 140)
        pts = [(x + t * L, y + math.sin(t * 6) * 3 + t * 10) for t in np.linspace(0, 1, 12)]
        lz.linea(pts, (196, 124, 82), 0.8)
        lz.linea([(px, py + 1.5) for px, py in pts], (110, 58, 44), 0.6)
    for _ in range(70):                                                              # rocas con sombra a la derecha
        x, y, r = rnd.uniform(0, W), rnd.uniform(0, H), rnd.uniform(3, 14)
        lz.sombra_suave(blob(x + r * 0.6, y + r * 0.4, r * 1.1, r * 0.6, rnd), (60, 24, 30), 0.5, 2)
        roca = blob(x, y, r, r * 0.75, rnd, n=12, rug=0.25)
        lz.poli(roca, fill=(96, 64, 58), outline=TINTA, ancho=0.7)
        lz.poli([(x - r * 0.7, y - r * 0.2), (x - r * 0.2, y - r * 0.7), (x + r * 0.2, y - r * 0.4), (x - r * 0.3, y)], fill=(150, 112, 96))
    ruido(lz, (0, 0, W, H), [(176, 100, 66), (120, 66, 50), (206, 140, 96)], 5000, rnd, (0.3, 1.1))
    for x in (150, 810):                                                             # patas del soporte del panel
        lz.poli([(x - 6, 120), (x + 6, 120), (x + 6, 560), (x - 6, 560)], fill=(120, 124, 146), outline=TINTA, ancho=1.2)
        lz.sombra_suave([(x + 6, 560), (x + 60, 575), (x + 60, 585), (x + 6, 570)], (40, 16, 30), 0.5, 4)
    oscurecer(lz, 0.62)
    guardar(lz, "mj_fondo_paneles", jpg=True)


def muro_interior(base, acento, rnd, tuberias=True):
    W, H = 960, 600
    lz = nuevo(W, H, base + (255,))
    for i in range(9):                                                               # paneles del muro impresos en 3D
        x = i * 120
        lz.poli([(x + 3, 0), (x + 117, 0), (x + 117, H), (x + 3, H)], fill=mezcla(base, (255, 255, 255), 0.05 + 0.03 * (i % 2)))
        lz.rayado([(x + 3, 0), (x + 117, 0), (x + 117, H), (x + 3, H)], mezcla(base, (255, 255, 255), 0.1), 3.5, 0, 0.25)
        lz.linea([(x, 0), (x, H)], mezcla(base, (0, 0, 0), 0.4), 2)
        remaches(lz, [(x + 10, 60), (x + 10, H - 60), (x + 110, 60), (x + 110, H - 60)], 1.8)
    lz.poli([(0, 470), (W, 470), (W, 478), (0, 478)], fill=acento)
    if tuberias:
        for y, col in ((520, (60, 140, 150)), (548, (150, 146, 190))):
            lz.poli([(0, y), (W, y), (W, y + 16), (0, y + 16)], fill=col, outline=TINTA, ancho=1.2)
            lz.linea([(0, y + 4), (W, y + 4)], mezcla(col, (255, 255, 255), 0.5), 1)
            for x in range(40, W, 160):
                lz.poli([(x, y - 3), (x + 12, y - 3), (x + 12, y + 19), (x, y + 19)], fill=(110, 106, 150), outline=TINTA, ancho=1)
    return lz


def fondo_interior(nombre, base, acento, extra=None):
    rnd = random.Random(sum(map(ord, nombre)))
    lz = muro_interior(base, acento, rnd)
    if extra:
        extra(lz, rnd)
    oscurecer(lz, 0.58)
    guardar(lz, nombre, jpg=True)


def luces_magenta(lz, rnd):
    for k in range(30):
        y = k * 16
        lz.velo([(0, y), (960, y), (960, y + 16), (0, y + 16)], (232, 96, 200, int(max(0, 50 - k * 1.8))))
    for x in range(30, 960, 120):                                                    # hojas asomando en estantes
        for j in range(5):
            cx, cy = x + 20 + j * 16, 470 - rnd.uniform(0, 20)
            lz.elipse(cx - 8, cy - 14, cx + 8, cy, fill=(56, 120, 76), outline=TINTA, ancho=0.6)


def pantallas_mando(lz, rnd):
    for x0 in (60, 380, 700):
        lz.poli([(x0, 90), (x0 + 200, 90), (x0 + 200, 210), (x0, 210)], fill=(16, 14, 40), outline=TINTA, ancho=2)
        lz.velo([(x0, 90), (x0 + 200, 90), (x0 + 200, 210), (x0, 210)], (94, 200, 242, 18))
        pts = [(x0 + 10 + t * 180, 150 + math.sin(t * 9 + x0) * 20) for t in np.linspace(0, 1, 40)]
        lz.linea(pts, (94, 200, 242), 1.2)


if __name__ == "__main__":
    solo = sys.argv[1:]
    with Z.resolucion(K_MJ):
        if not solo or "paneles" in solo:
            panel_solar()
            for k in range(4):
                polvo_marte(k)
        if not solo or "filtro" in solo:
            carton()
            cinta()
            manguera()
            for nombre, f in (("carton", carton), ("cinta", cinta), ("manguera", manguera)):
                ranura(nombre, lambda lz, ox, oy, sil, f=f: f(lz, ox, oy, sil))
            recipientes()
        if not solo or "invernadero" in solo:
            veggie()
            for k in range(3):
                cojin(k)
                tallo(k)
                flor(k)
            moho()
    with Z.resolucion(4):
        if not solo or "fondos" in solo:
            fondo_paneles()
            fondo_interior("mj_fondo_filtro", (44, 40, 92), (94, 200, 242))
            fondo_interior("mj_fondo_invernadero", (40, 46, 70), (124, 240, 160), luces_magenta)
            fondo_interior("mj_fondo_consola", (36, 32, 80), (228, 138, 216), pantallas_mando)
