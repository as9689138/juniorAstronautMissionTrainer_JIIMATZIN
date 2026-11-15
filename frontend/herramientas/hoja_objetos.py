"""Hoja de contacto de los objetos de las salas (como el `snap --sheet` del método procedural-film).

Uso:  python herramientas/hoja_objetos.py [salida.png]

Dibuja cada tipo de objeto solo, grande, sobre su casilla con la rejilla marcada, para revisarlos uno por uno:
que el dibujo no se salga de su huella, que la luz venga de la izquierda y que se entienda qué es.
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pintar_zonas as Z  # noqa: E402

TIPOS = [("maquina", 1, 1, "energia", "Energia"), ("maquina", 1, 1, "mando", "Mando"), ("maquina", 1, 1, "comunicaciones", "Comunicaciones"),
         ("maquina", 1, 1, "oxigeno", "Soporte vital"), ("maquina", 1, 1, "blindaje", "Refugio"), ("torre", 1, 1, "oxigeno", "Invernadero"),
         ("bandeja", 1, 2, "oxigeno", "Invernadero"), ("cajas", 1, 1, None, "Energia"), ("bidon", 1, 1, None, "Refugio"),
         ("estanteria", 2, 1, "mando", "Mando"), ("mesa", 2, 2, "mando", "Mando"), ("escritorio", 3, 1, "comunicaciones", "Comunicaciones"),
         ("litera", 2, 1, "blindaje", "Refugio"), ("taquilla", 1, 1, "blindaje", "Refugio"), ("banco", 2, 1, "energia", "Energia"),
         ("carro", 1, 1, None, "Energia"), ("antena", 1, 1, "comunicaciones", "Comunicaciones"), ("maceta", 1, 1, None, "Pasillo")]


def main():
    celda_w, celda_h = 330, 300
    por_fila = 6
    filas = (len(TIPOS) + por_fila - 1) // por_fila
    hoja = Image.new("RGBA", (celda_w * por_fila * Z.FINAL, celda_h * filas * Z.FINAL), (24, 18, 40, 255))
    for i, (tipo, w, h, sistema, sala) in enumerate(TIPOS):
        lz = Z.Lienzo(celda_w, celda_h, (138, 130, 210, 255))
        P = Z.Iso(celda_w / 2 - (w - h) * Z.TW / 4, 150 - (w + h) * Z.TH / 4)
        for rr in range(-1, h + 2):                                   # rejilla con la huella marcada
            lz.linea([P(-1, rr), P(w + 1, rr)], (122, 114, 198), 1)
        for cc in range(-1, w + 2):
            lz.linea([P(cc, -1), P(cc, h + 1)], (122, 114, 198), 1)
        lz.poli([P(0, 0), P(w, 0), P(w, h), P(0, h)], outline=(255, 200, 61), ancho=1.2)
        Z.objeto(lz, P, tipo, 0, 0, w, h, sistema, sala)
        lz.img = Z.brillo_emisivo(lz.img)
        lz.texto(celda_w / 2, celda_h - 14, f"{tipo} {w}x{h} · {sala}", 11, (246, 244, 250))
        img = lz.reducir()
        hoja.alpha_composite(img, ((i % por_fila) * celda_w * Z.FINAL, (i // por_fila) * celda_h * Z.FINAL))
    salida = sys.argv[1] if len(sys.argv) > 1 else str(Z.RAIZ / "docs-internos" / "propuestas" / "objetos.png")
    hoja.convert("RGB").save(salida)
    print("hoja:", salida)


if __name__ == "__main__":
    main()
