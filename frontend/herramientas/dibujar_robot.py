"""Dibuja el robot de la IA de la base (provisional, estilo de docs/estilo-mapa.md).

Uso:  python herramientas/dibujar_robot.py

Crea assets/arte/robot_ia.png: 3 cuadros de 64 x 72 en una fila, al doble de resolución
(en el juego se ve de 32 x 36). Orden = caras de Ink (etiqueta cara:):
  0 neutral · 1 feliz · 2 procesando
El rol 4 puede sustituirlo con el mismo nombre, tamaño y orden de cuadros.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "public" / "assets" / "arte" / "robot_ia.png"

W, H = 64, 72          # cuadro final
S = 4                  # sobremuestreo
TINTA = (20, 16, 38)
CUERPO = (233, 230, 255)
CUERPO_SOMBRA = (176, 170, 232)
CUERPO_LUZ = (255, 255, 255)
VISOR = (26, 22, 58)
VISOR_BRILLO = (60, 56, 120)
OJO = (130, 236, 255)
PROPULSOR = (94, 200, 242)
BOMBILLA = {"neutral": (94, 200, 242), "feliz": (124, 240, 160), "procesando": (255, 200, 61)}


def cuadro(cara: str) -> Image.Image:
    img = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    k = lambda *v: [x * S for x in v]
    t = 1.6 * S

    # Llama del propulsor (abajo)
    d.polygon(k(26, 60, 38, 60, 32, 71), fill=PROPULSOR + (200,))
    d.polygon(k(29, 60, 35, 60, 32, 67), fill=(220, 250, 255, 230))
    # Antena
    d.line(k(32, 14, 32, 5), fill=TINTA, width=int(t))
    d.ellipse(k(27, 0, 37, 10), fill=BOMBILLA[cara] + (255,), outline=TINTA + (255,), width=int(t * 0.8))
    d.ellipse(k(29, 2, 32, 5), fill=(255, 255, 255, 220))
    # Brazos (pequeñas aletas)
    for lado in (-1, 1):
        x0 = 32 + lado * 24
        d.rounded_rectangle(k(min(x0, x0 - lado * 8), 34, max(x0, x0 - lado * 8), 48), 3 * S,
                            fill=CUERPO_SOMBRA + (255,), outline=TINTA + (255,), width=int(t))
    # Cuerpo: cápsula redondeada
    d.rounded_rectangle(k(10, 12, 54, 62), 18 * S, fill=CUERPO + (255,), outline=TINTA + (255,), width=int(t))
    # Sombra abajo a la derecha (la luz viene de arriba a la izquierda)
    d.chord(k(12, 30, 52, 61), 10, 120, fill=CUERPO_SOMBRA + (255,))
    d.arc(k(14, 15, 40, 40), 190, 250, fill=CUERPO_LUZ + (255,), width=int(2 * S))
    # Franja de la base con el color del oxígeno (sistema que cuida)
    d.rounded_rectangle(k(20, 52, 44, 56), 2 * S, fill=PROPULSOR + (255,), outline=TINTA + (255,), width=int(t * 0.6))
    # Visor
    d.rounded_rectangle(k(15, 20, 49, 44), 10 * S, fill=VISOR + (255,), outline=TINTA + (255,), width=int(t))
    d.arc(k(18, 22, 34, 34), 200, 250, fill=VISOR_BRILLO + (255,), width=int(1.5 * S))

    # Cara en el visor
    if cara == "neutral":
        for cx in (25, 39):
            d.rounded_rectangle(k(cx - 3, 27, cx + 3, 37), 3 * S, fill=OJO + (255,))
    elif cara == "feliz":
        for cx in (25, 39):
            d.arc(k(cx - 5, 27, cx + 5, 37), 200, 340, fill=(124, 240, 160, 255), width=int(2.4 * S))
        d.arc(k(26, 32, 38, 41), 20, 160, fill=(124, 240, 160, 255), width=int(1.6 * S))
    else:  # procesando: barra de carga y puntos
        d.rounded_rectangle(k(21, 30, 43, 35), 2 * S, outline=OJO + (255,), width=int(1.2 * S))
        d.rounded_rectangle(k(22, 31, 34, 34), 1 * S, fill=(255, 200, 61, 255))
        for i, cx in enumerate((27, 32, 37)):
            d.ellipse(k(cx - 1.3, 38, cx + 1.3, 40.6), fill=OJO + (255 - i * 70,))

    img = img.resize((W, H), Image.LANCZOS)
    # Grano de impresión, solo donde hay dibujo
    a = np.asarray(img).astype(np.float32)
    ruido = np.random.default_rng(len(cara)).normal(0, 7, a.shape[:2])
    a[..., :3] = np.clip(a[..., :3] + ruido[..., None], 0, 255)
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def main():
    hoja = Image.new("RGBA", (W * 3, H), (0, 0, 0, 0))
    for i, cara in enumerate(("neutral", "feliz", "procesando")):
        hoja.paste(cuadro(cara), (i * W, 0))
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    hoja.save(SALIDA)
    print(f"Dibujado {SALIDA.relative_to(RAIZ)} ({hoja.width}x{hoja.height})")


if __name__ == "__main__":
    main()
