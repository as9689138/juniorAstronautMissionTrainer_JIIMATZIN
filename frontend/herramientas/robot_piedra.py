"""P.I.E.D.R.A, la IA de la base, con el dibujo de la compañera de arte (4096x4096, fondo transparente).

Hace la hoja de cuadros que usa el juego (assets/arte/robot_ia.png, la misma clave que el robot provisional):
  0 neutral    · ojos redondos y boca recta
  1 feliz      · la cara del dibujo, tal cual
  2 procesando · ojos entrecerrados y tres puntos (pensando)
Las caras 0 y 2 se pintan en su pantalla con el mismo estilo: trazos cian con brillo, como la cara del dibujo.
Guarda también una copia del dibujo a 1024 px (assets/personajes/piedra.png) para usos grandes.

Sustituye a herramientas/dibujar_robot.py (el robot provisional): no correr ese después de este.

Uso: python herramientas/robot_piedra.py "<ruta del dibujo>"
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

AQUI = Path(__file__).resolve().parent.parent
CUADRO = (128, 144)            # al doble de la hoja anterior (64x72): el juego la dibuja a la mitad de escala
PANTALLA = (1470, 1240, 2560, 1680)   # zona de la cara dentro de la pantalla negra (en el dibujo de 4096)
NUCLEO, BRILLO = (225, 250, 255, 255), (70, 195, 255, 210)


def trazos(lineas, puntos=()):
    """Capa con trazos cian brillantes. lineas: [(x0, y0, x1, y1)]; puntos: [(x, y, radio)]."""
    capa = Image.new("RGBA", (4096, 4096), (0, 0, 0, 0))
    for color, grosor, desenfoque in ((BRILLO, 70, 26), (NUCLEO, 26, 2)):
        c = Image.new("RGBA", capa.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(c)
        for l in lineas:
            d.line(l, fill=color, width=grosor)
            for x, y in (l[:2], l[2:]):
                d.ellipse((x - grosor / 2, y - grosor / 2, x + grosor / 2, y + grosor / 2), fill=color)
        for x, y, rad in puntos:
            rr = rad + (22 if color == BRILLO else 0)
            d.ellipse((x - rr, y - rr, x + rr, y + rr), fill=color)
        capa.alpha_composite(c.filter(ImageFilter.GaussianBlur(desenfoque)))
    return capa


def cara(dibujo, lineas, puntos=()):
    im = dibujo.copy()
    ImageDraw.Draw(im).rectangle(PANTALLA, fill=(0, 0, 0, 255))      # borra la cara del dibujo
    im.alpha_composite(trazos(lineas, puntos))
    return im


def main():
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    dibujo = Image.open(sys.argv[1]).convert("RGBA")
    neutral = cara(dibujo, [(1720, 1330, 1720, 1440), (2290, 1330, 2290, 1440), (1900, 1575, 2110, 1575)])
    procesando = cara(dibujo, [(1620, 1400, 1800, 1400), (2200, 1400, 2380, 1400)],
                      [(1910, 1575, 26), (2005, 1575, 26), (2100, 1575, 26)])
    caras = [neutral, dibujo, procesando]

    caja = dibujo.getbbox()
    w, h = caja[2] - caja[0], caja[3] - caja[1]
    k = min((CUADRO[0] - 4) / w, (CUADRO[1] - 2) / h)
    tw, th = round(w * k), round(h * k)
    hoja = Image.new("RGBA", (CUADRO[0] * len(caras), CUADRO[1]), (0, 0, 0, 0))
    for i, im in enumerate(caras):
        chico = im.crop(caja).resize((tw, th), Image.LANCZOS)
        hoja.alpha_composite(chico, (i * CUADRO[0] + (CUADRO[0] - tw) // 2, CUADRO[1] - th))   # ruedas abajo
    destino = AQUI / "public/assets/arte/robot_ia.png"
    hoja.save(destino, optimize=True)
    grande = dibujo.crop(caja)
    grande.thumbnail((1024, 1024), Image.LANCZOS)
    grande.save(AQUI / "public/assets/personajes/piedra.png", optimize=True)
    # vista previa grande de las tres caras, para revisarlas
    prev = Image.new("RGBA", (600 * 3, 400), (40, 34, 70, 255))
    for i, im in enumerate(caras):
        c = im.crop((1300, 950, 2900, 1800)).resize((600, 320))
        prev.alpha_composite(c, (i * 600, 40))
    prev.convert("RGB").save(AQUI / "herramientas/robot_piedra_caras.png")
    print(f"{destino} ({hoja.size[0]}x{hoja.size[1]}, cuadros de {CUADRO[0]}x{CUADRO[1]})")


if __name__ == "__main__":
    main()
