"""Pinta las piezas de las misiones (minijuegos) con el mismo estilo que la interfaz del mapa (docs/estilo-mapa.md).

Uso:  python herramientas/pintar_misiones.py

Usa la paleta y las ayudas de herramientas/pintar_interfaz.py: tinta, placa violeta, papel crema, sello rojo y ámbar.
Crea en assets/misiones/ (todo al doble de resolución; el juego las muestra a la mitad):
  marco.png                       marco de la zona de juego (nine-slice, centro transparente): borde de la nave con remaches
  tecla_ambar.png, tecla_verde.png, tecla_apagada.png
                                  teclas de acción (nine-slice) en 3/4: la ámbar es la acción, la verde "¡ya!", la apagada espera
  icono_reloj.png                 insignia del tiempo (reloj de arena)
  icono_polvo.png                 insignia del polvo retirado (montón de regolito)
  icono_vibrar.png                insignia de la vibración (motor con ondas)
  meta.png                        banderita de la meta en las barras de avance
  icono_mano.png                  mano que toca, para los pasos de las instrucciones
  icono_pieza.png, icono_gota.png, icono_ventilador.png, icono_planta.png
                                  insignias del filtro de CO₂ y del invernadero
  nucleo.png, nucleo_vacio.png    núcleo de energía de la consola y su hueco
"""
import math

from PIL import Image, ImageDraw

from pintar_interfaz import (RAIZ, TINTA, PLACA, PLACA_LUZ, PAPEL, SELLO, LUZ, AMBAR, lienzo, terminar, S, mezcla)

SALIDA = RAIZ / "public" / "assets" / "misiones"
VERDE = (124, 240, 160)
TERRACOTA = (176, 96, 60)


def marco():
    """Borde de una ventana de la nave: tinta, aro de placa con luz cálida arriba a la izquierda y remaches."""
    w = h = 128
    img, d = lienzo(w, h)
    d.rounded_rectangle(S(2, 2, w - 2, h - 2), 16 * SS_R, fill=TINTA + (255,))
    d.rounded_rectangle(S(6, 6, w - 6, h - 6), 13 * SS_R, fill=PLACA + (255,))
    d.arc(S(8, 8, 40, 40), 180, 270, fill=PLACA_LUZ + (255,), width=2 * SS_R)
    d.line(S(24, 8.5, w - 24, 8.5), fill=PLACA_LUZ + (255,), width=2 * SS_R)
    d.line(S(8.5, 24, 8.5, h - 24), fill=PLACA_LUZ + (190,), width=2 * SS_R)
    d.line(S(24, h - 9, w - 24, h - 9), fill=(14, 34, 44, 255), width=2 * SS_R)       # sombra abajo
    for x, y in ((16, 16), (w - 16, 16), (16, h - 16), (w - 16, h - 16)):                # remaches de las esquinas
        d.ellipse(S(x - 3, y - 3, x + 3, y + 3), fill=TINTA + (255,))
        d.ellipse(S(x - 2, y - 2.4, x + 2, y + 1.6), fill=mezcla(PLACA, PLACA_LUZ, 0.65) + (255,))
    # el hueco: transparente, con un filete de tinta para que el dibujo quede "detrás del cristal"
    d.rounded_rectangle(S(20, 20, w - 20, h - 20), 6 * SS_R, fill=TINTA + (255,))
    d.rounded_rectangle(S(22.5, 22.5, w - 22.5, h - 22.5), 4 * SS_R, fill=(0, 0, 0, 0))
    return terminar(img, w, h, 0.03, 11)


def tecla(cara, semilla):
    """Tecla de acción grande en 3/4 (nine-slice): tinta, labio inferior oscuro y cara de color con brillo."""
    w = h = 96
    img, d = lienzo(w, h)
    oscuro = mezcla(cara, TINTA, 0.55)
    d.rounded_rectangle(S(3, 6, w - 3, h - 3), 16 * SS_R, fill=TINTA + (255,))
    d.rounded_rectangle(S(6, 12, w - 6, h - 6), 13 * SS_R, fill=oscuro + (255,))            # labio (el canto de la tecla)
    d.rounded_rectangle(S(3, 3, w - 3, h - 13), 16 * SS_R, fill=TINTA + (255,))
    d.rounded_rectangle(S(6, 6, w - 6, h - 16), 13 * SS_R, fill=cara + (255,))              # cara
    d.line(S(22, 10, w - 22, 10), fill=mezcla(cara, (255, 255, 255), 0.55) + (255,), width=2 * SS_R)
    d.arc(S(9, 9, 36, 36), 185, 265, fill=mezcla(cara, (255, 255, 255), 0.45) + (255,), width=2 * SS_R)
    return terminar(img, w, h, 0.02, semilla)


def base_insignia(fondo):
    w = h = 64
    img, d = lienzo(w, h)
    d.ellipse(S(3, 3, w - 3, h - 3), fill=TINTA + (255,))
    d.ellipse(S(6, 6, w - 6, h - 6), fill=fondo + (255,))
    d.arc(S(9, 9, w - 9, h - 9), 150, 260, fill=mezcla(fondo, LUZ, 0.35) + (255,), width=3 * SS_R)
    return img, d, w, h


def icono_reloj():
    img, d, w, h = base_insignia(mezcla(AMBAR, TINTA, 0.55))
    d.rectangle(S(19, 12, 45, 17), fill=TINTA + (255,))                                    # tapas
    d.rectangle(S(19, 47, 45, 52), fill=TINTA + (255,))
    d.polygon(S(22, 17, 42, 17, 32, 32), fill=LUZ + (255,), outline=TINTA + (255,), width=2 * SS_R)   # vidrio de arriba
    d.polygon(S(22, 47, 42, 47, 32, 32), fill=LUZ + (255,), outline=TINTA + (255,), width=2 * SS_R)   # vidrio de abajo
    d.polygon(S(26, 20, 38, 20, 32, 28), fill=AMBAR + (255,))                              # arena que cae
    d.polygon(S(24, 46, 40, 46, 32, 38), fill=AMBAR + (255,))
    d.line(S(32, 30, 32, 40), fill=AMBAR + (255,), width=1 * SS_R)
    return terminar(img, w, h, 0.02, 12)


def icono_polvo():
    img, d, w, h = base_insignia(mezcla(TERRACOTA, TINTA, 0.45))
    d.pieslice(S(12, 26, 52, 66), 180, 360, fill=(196, 120, 76, 255), outline=TINTA + (255,), width=int(2.4 * SS_R))
    d.pieslice(S(20, 32, 40, 52), 200, 300, fill=(226, 160, 112, 255))                  # luz en el montón
    for x, y, r in ((18, 22, 2.2), (44, 20, 1.8), (36, 14, 1.5), (26, 16, 1.3)):          # granos que vuelan
        d.ellipse(S(x - r, y - r, x + r, y + r), fill=(226, 160, 112, 255), outline=TINTA + (255,), width=SS_R)
    return terminar(img, w, h, 0.02, 13)


def icono_vibrar():
    img, d, w, h = base_insignia(mezcla(VERDE, TINTA, 0.6))
    d.rounded_rectangle(S(24, 20, 40, 44), 4 * SS_R, fill=LUZ + (255,), outline=TINTA + (255,), width=int(2.2 * SS_R))
    d.ellipse(S(29, 25, 35, 31), fill=VERDE + (255,), outline=TINTA + (255,), width=SS_R)  # luz del motor
    for lado in (-1, 1):                                                                 # ondas
        for k, r in enumerate((14, 20)):
            cx = 32
            caja = S(cx - r, 32 - r, cx + r, 32 + r)
            a0, a1 = (150, 210) if lado < 0 else (-30, 30)
            d.arc(caja, a0, a1, fill=(VERDE if k == 0 else LUZ) + (255,), width=int(2.6 * SS_R))
    return terminar(img, w, h, 0.02, 14)


def mano():
    """Mano que toca (para las instrucciones: "toca el polvo"), con las ondas del toque."""
    w = h = 64
    img, d = lienzo(w, h)
    # Como el emoji ☝: el índice arriba junto al pulgar (a la izquierda) y los otros tres dedos doblados a la derecha
    piel, sombra = (246, 206, 168), (214, 160, 120)
    trazo = int(2.4 * SS_R)
    for r, a in ((8, 255), (13, 150)):                                                    # ondas del toque
        d.arc(S(22 - r, 11 - r, 22 + r, 11 + r), 200, 340, fill=AMBAR + (a,), width=trazo)
    d.rounded_rectangle(S(17, 30, 50, 58), 9 * SS_R, fill=piel + (255,), outline=TINTA + (255,), width=trazo)   # palma
    for x0 in (28, 35.5, 43):                                                             # nudillos de los dedos doblados
        d.rounded_rectangle(S(x0 - 0.5, 27, x0 + 8, 38), 4 * SS_R, fill=piel + (255,), outline=TINTA + (255,), width=trazo)
    d.rectangle(S(29, 33, 49, 40), fill=piel + (255,))                                   # los nudillos se funden con la palma
    for x in (35.5, 43):
        d.line(S(x, 30, x, 37), fill=sombra + (255,), width=int(1.8 * SS_R))
    d.rounded_rectangle(S(16, 9, 28, 42), 6 * SS_R, fill=piel + (255,), outline=TINTA + (255,), width=trazo)    # índice
    d.rectangle(S(18.5, 34, 25.5, 44), fill=piel + (255,))                               # une el índice con la palma
    d.rounded_rectangle(S(19, 11, 25, 16), 2 * SS_R, fill=(255, 236, 214, 255))          # uña
    d.ellipse(S(8, 38, 22, 52), fill=piel + (255,), outline=TINTA + (255,), width=trazo)  # pulgar, abajo a la izquierda
    d.rectangle(S(17, 42, 23, 50), fill=piel + (255,))
    return terminar(img, w, h, 0.015, 16)


def icono_pieza():
    """Insignia del filtro: el cartucho cuadrado y el tubo redondo unidos (el invento del Apolo 13)."""
    img, d, w, h = base_insignia(mezcla((94, 200, 242), TINTA, 0.55))
    d.rectangle(S(13, 22, 31, 42), fill=(196, 160, 112, 255), outline=TINTA + (255,), width=int(2.2 * SS_R))   # cartón
    d.line(S(13, 29, 31, 29), fill=(150, 116, 76, 255), width=int(1.4 * SS_R))
    d.polygon(S(31, 24, 40, 28, 40, 36, 31, 40), fill=(170, 170, 186, 255), outline=TINTA + (255,))           # cinta (embudo)
    d.ellipse(S(38, 25, 52, 39), fill=LUZ + (255,), outline=TINTA + (255,), width=int(2.2 * SS_R))            # tubo redondo
    d.ellipse(S(42, 29, 48, 35), fill=TINTA + (255,))
    return terminar(img, w, h, 0.02, 17)


def icono_gota():
    """Gota de riego (distinta de la del oxígeno: verde agua, con brillo y salpicadura)."""
    img, d, w, h = base_insignia(mezcla((80, 200, 170), TINTA, 0.55))
    c = (110, 214, 240)
    d.polygon(S(32, 10, 19, 32, 45, 32), fill=TINTA + (255,))
    d.ellipse(S(17, 24, 47, 54), fill=TINTA + (255,))
    d.polygon(S(32, 14, 22, 32, 42, 32), fill=c + (255,))
    d.ellipse(S(20, 27, 44, 51), fill=c + (255,))
    d.ellipse(S(25, 33, 30, 41), fill=(240, 252, 255, 255))
    return terminar(img, w, h, 0.02, 18)


def icono_ventilador():
    """Ventilador del invernadero: tres aspas alrededor de un eje, con aire que sale."""
    img, d, w, h = base_insignia(mezcla((140, 200, 255), TINTA, 0.6))
    cx = cy = 32
    for k in range(3):
        a = math.radians(-90 + k * 120)
        b = a + math.radians(55)
        p1 = (cx + math.cos(a) * 20, cy + math.sin(a) * 20)
        p2 = (cx + math.cos(b) * 17, cy + math.sin(b) * 17)
        d.polygon(S(cx, cy, *p1, *p2), fill=LUZ + (255,), outline=TINTA + (255,), width=int(2 * SS_R))
    d.ellipse(S(27, 27, 37, 37), fill=(140, 200, 255, 255), outline=TINTA + (255,), width=int(2 * SS_R))
    return terminar(img, w, h, 0.02, 19)


def icono_planta():
    """Brote de zinnia en su cojín de cultivo (para el medidor de plantas regadas)."""
    img, d, w, h = base_insignia(mezcla((124, 240, 160), TINTA, 0.6))
    verde, oscuro = (124, 210, 110), (70, 140, 70)
    d.line(S(32, 44, 32, 22), fill=TINTA + (255,), width=int(4.2 * SS_R))
    d.line(S(32, 44, 32, 22), fill=verde + (255,), width=int(2 * SS_R))
    d.ellipse(S(16, 26, 31, 36), fill=verde + (255,), outline=TINTA + (255,), width=int(2 * SS_R))   # hojas
    d.ellipse(S(33, 22, 48, 32), fill=verde + (255,), outline=TINTA + (255,), width=int(2 * SS_R))
    d.ellipse(S(26, 12, 38, 24), fill=(246, 140, 60, 255), outline=TINTA + (255,), width=int(2 * SS_R))  # botón de flor
    d.rounded_rectangle(S(18, 42, 46, 52), 4 * SS_R, fill=PAPEL + (255,), outline=TINTA + (255,), width=int(2 * SS_R))
    d.line(S(22, 46, 42, 46), fill=oscuro + (160,), width=SS_R)
    return terminar(img, w, h, 0.02, 20)


def nucleo(lleno=True):
    """Núcleo de energía de la consola: cristal hexagonal ámbar que brilla (o su hueco vacío)."""
    w = h = 56
    img, d = lienzo(w, h)
    cx, cy, r = 28, 28, 22
    pts = [(cx + r * math.cos(math.radians(30 + 60 * k)), cy + r * math.sin(math.radians(30 + 60 * k))) for k in range(6)]
    if lleno:
        d.polygon([(x * SS_R, y * SS_R) for x, y in pts], fill=TINTA + (255,))
        p2 = [(cx + (r - 3.5) * math.cos(math.radians(30 + 60 * k)), cy + (r - 3.5) * math.sin(math.radians(30 + 60 * k))) for k in range(6)]
        d.polygon([(x * SS_R, y * SS_R) for x, y in p2], fill=AMBAR + (255,))
        d.polygon(S(cx, cy - 13, cx + 9, cy - 4, cx, cy + 2, cx - 9, cy - 4), fill=(255, 236, 160, 255))   # brillo
        d.line(S(cx - 8, cy + 8, cx + 8, cy + 8), fill=mezcla(AMBAR, TINTA, 0.35) + (255,), width=int(1.6 * SS_R))
    else:
        d.polygon([(x * SS_R, y * SS_R) for x, y in pts], fill=(11, 8, 32, 255))
        p2 = [(cx + (r - 3) * math.cos(math.radians(30 + 60 * k)), cy + (r - 3) * math.sin(math.radians(30 + 60 * k))) for k in range(6)]
        d.polygon([(x * SS_R, y * SS_R) for x, y in p2], outline=mezcla(PLACA, LUZ, 0.45) + (255,), width=int(1.6 * SS_R))
    return terminar(img, w, h, 0.015, 24 if lleno else 25)


def meta():
    w, h = 40, 56
    img, d = lienzo(w, h)
    d.rectangle(S(9, 6, 13, 52), fill=TINTA + (255,))                                     # asta
    d.rectangle(S(10, 7, 12, 51), fill=LUZ + (255,))
    d.polygon(S(12, 7, 36, 14, 12, 24), fill=TINTA + (255,))
    d.polygon(S(13, 9.5, 31, 14, 13, 21), fill=SELLO + (255,))                            # banderín rojo sello
    d.ellipse(S(5, 47, 17, 55), fill=TINTA + (255,))
    return terminar(img, w, h, 0.015, 15)


SS_R = 4   # mismo SS que pintar_interfaz (anchos de línea en píxeles grandes)


def main():
    SALIDA.mkdir(parents=True, exist_ok=True)
    piezas = {
        "marco": marco(),
        "tecla_ambar": tecla(AMBAR, 21),
        "tecla_verde": tecla(VERDE, 22),
        "tecla_apagada": tecla(mezcla(PLACA, LUZ, 0.28), 23),
        "icono_reloj": icono_reloj(),
        "icono_polvo": icono_polvo(),
        "icono_vibrar": icono_vibrar(),
        "meta": meta(),
        "icono_mano": mano(),
        "icono_pieza": icono_pieza(),
        "icono_gota": icono_gota(),
        "icono_ventilador": icono_ventilador(),
        "icono_planta": icono_planta(),
        "nucleo": nucleo(True),
        "nucleo_vacio": nucleo(False),
    }
    for nombre, img in piezas.items():
        img.save(SALIDA / f"{nombre}.png", optimize=True)
    print("Misiones pintadas:", ", ".join(piezas))


if __name__ == "__main__":
    main()
