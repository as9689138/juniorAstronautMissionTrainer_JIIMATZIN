"""Genera los recursos PROVISIONALES del juego y el mapa de la base en formato Tiled.

Uso:  python herramientas/provisionales.py

- Los nombres de archivo son los del acuerdo de entrega de arte (docs/acuerdos.md).
  El rol 4 los sustituye por el arte final con el MISMO nombre y tamaño.
- No sobrescribe un archivo que ya exista, salvo con --forzar, para no pisar arte real.
- El mapa (assets/mapas/base.json) se puede abrir y editar en Tiled.
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parent.parent
ARTE = RAIZ / "public" / "assets" / "arte"
MAPAS = RAIZ / "public" / "assets" / "mapas"
FORZAR = "--forzar" in sys.argv
T = 32  # tamaño de casilla en px


def guardar(img: Image.Image, ruta: Path) -> None:
    if ruta.exists() and not FORZAR:
        print(f"  existe, no se toca: {ruta.relative_to(RAIZ)}")
        return
    ruta.parent.mkdir(parents=True, exist_ok=True)
    img.save(ruta)
    print(f"  creado: {ruta.relative_to(RAIZ)}")


# --- 1. Piezas del mapa (una fila de 6 piezas de 32 px) ---------------------
# id 0 suelo · 1 suelo invernadero · 2 pared · 3 base de máquina · 4 parte alta de máquina · 5 suelo de puerta
PIEZAS = ["suelo", "suelo_invernadero", "pared", "maquina_base", "maquina_alta", "puerta"]
COLISIONAN = {2, 3}


def tiles_base() -> Image.Image:
    img = Image.new("RGBA", (T * len(PIEZAS), T), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    x = lambda i: i * T
    # suelo
    d.rectangle([x(0), 0, x(0) + T - 1, T - 1], fill="#3a2f2b", outline="#453833")
    # suelo invernadero
    d.rectangle([x(1), 0, x(1) + T - 1, T - 1], fill="#2f3b2a")
    d.rectangle([x(1) + 5, 5, x(1) + T - 6, T - 6], fill="#3c4d33")
    # pared: borde claro arriba + frente
    d.rectangle([x(2), 0, x(2) + T - 1, T - 1], fill="#6e5a52")
    d.rectangle([x(2), 0, x(2) + T - 1, 8], fill="#a88c7d")
    d.rectangle([x(2), T - 6, x(2) + T - 1, T - 1], fill="#54443e")
    # base de máquina (colisiona)
    d.rectangle([x(3) + 3, 0, x(3) + T - 4, T - 5], fill="#4f6670")
    d.rectangle([x(3) + 3, T - 9, x(3) + T - 4, T - 5], fill="#33454d")
    # parte alta de máquina (capa "encima", no colisiona)
    d.rectangle([x(4) + 3, 8, x(4) + T - 4, T - 1], fill="#617f8c")
    d.rectangle([x(4) + 3, 8, x(4) + T - 4, 13], fill="#8db3c2")
    d.rectangle([x(4) + 9, 19, x(4) + 12, 22], fill="#ffd65a")
    d.rectangle([x(4) + 17, 19, x(4) + 20, 22], fill="#7cf0a0")
    # puerta (suelo marcado)
    d.rectangle([x(5), 0, x(5) + T - 1, T - 1], fill="#3a2f2b")
    for k in range(0, T, 8):
        d.rectangle([x(5) + k, 0, x(5) + k + 3, 3], fill="#d9a441")
    return img


# --- 2. Astronauta (32 x 44, mira a la derecha) -----------------------------
def astronauta() -> Image.Image:
    img = Image.new("RGBA", (32, 44), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([6, 35, 26, 43], fill=(0, 0, 0, 90))                      # sombra
    d.rounded_rectangle([3, 18, 9, 33], 2, fill="#9aa3ad")              # mochila
    d.rounded_rectangle([7, 16, 25, 38], 6, fill="#e9edf1")             # traje
    d.rectangle([7, 30, 25, 32], fill="#d9653b")                         # franja
    d.ellipse([7, 1, 27, 21], fill="#e9edf1")                            # casco
    d.ellipse([14, 6, 27, 16], fill="#2b4a63")                           # visera
    d.ellipse([20, 7, 24, 10], fill="#9fd3f5")                           # brillo
    return img


# --- 3. Marcador de estación interactiva (24 x 24, se tiñe por sistema) -----
def estacion() -> Image.Image:
    img = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([1, 1, 22, 22], 5, fill="#ffffff", outline="#2a2a2a", width=2)
    d.rectangle([6, 6, 17, 13], fill="#9a9a9a")
    return img


# --- 4. Iconos de recursos (32 x 32) ----------------------------------------
def icono(color: str, forma: str) -> Image.Image:
    img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if forma == "rayo":
        d.polygon([(18, 2), (6, 18), (15, 18), (12, 30), (26, 12), (17, 12)], fill=color)
    elif forma == "gota":
        d.polygon([(16, 3), (7, 18), (25, 18)], fill=color)
        d.ellipse([7, 12, 25, 29], fill=color)
    else:  # escudo
        d.polygon([(16, 2), (28, 7), (26, 20), (16, 30), (6, 20), (4, 7)], fill=color)
    return img


# --- 5. Retratos provisionales (512 x 512) ----------------------------------
def retrato(color: str, inicial: str) -> Image.Image:
    img = Image.new("RGBA", (512, 512), color)
    d = ImageDraw.Draw(img)
    d.ellipse([136, 70, 376, 310], fill="#f1e3d3")
    d.rounded_rectangle([96, 300, 416, 540], 80, fill="#e9edf1")
    d.text((236, 380), inicial, fill="#333333")
    d.text((16, 16), "PROVISIONAL", fill="#ffffff")
    return img


# --- 6. Mapa de la base (Tiled JSON) ----------------------------------------
# '#' pared · '.' suelo · 'g' invernadero · 'M' base de máquina · 'm' parte alta
# Objetos (sobre suelo): i inicio · C consola · P paneles · F filtro · V invernadero · R refugio · A antena
MAPA = [
    "####################################",
    "#.........#..........#.............#",
    "#..m...m..#....mm....#...m......m..#",
    "#..M.P.M..#....MM....#...M..A...M..#",
    "#.........#....C.....#.............#",
    "#.........#..........#.............#",
    "####..#######....#######..##########",
    "#..................................#",
    "#" + "." * 9 + "i" + "." * 24 + "#",
    "#..................................#",
    "######..#######..#########..########",
    "#ggggggggg#.........#..............#",
    "#ggmggmggg#...m.....#....m.........#",
    "#ggMggMggg#...M.F...#....M...R.....#",
    "#ggggVgggg#.........#..............#",
    "#ggggggggg#.........#..............#",
    "####################################",
]

OBJETOS = {
    "i": dict(name="inicio", type="inicio", props={}),
    "C": dict(name="consola", type="interaccion",
              props=dict(accion="consola", sistema="mando", etiqueta="Consola de mando")),
    "P": dict(name="tarea_paneles", type="interaccion",
              props=dict(accion="minijuego", sistema="energia", etiqueta="Limpiar paneles solares")),
    "F": dict(name="tarea_filtro", type="interaccion",
              props=dict(accion="minijuego", sistema="oxigeno", etiqueta="Cambiar filtro de CO2")),
    "V": dict(name="tarea_invernadero", type="interaccion",
              props=dict(accion="minijuego", sistema="oxigeno", etiqueta="Regar el invernadero")),
    "R": dict(name="refugio", type="interaccion",
              props=dict(accion="refugio", sistema="blindaje", etiqueta="Refugio contra radiacion")),
    "A": dict(name="antena", type="interaccion",
              props=dict(accion="antena", sistema="comunicaciones", etiqueta="Antena de comunicaciones")),
}

# Muebles con colisión: rectángulos de tipo "mueble" con la propiedad "tipo".
# El rectángulo es la huella en el suelo (lo que choca); el dibujo sube un poco por encima.
# (tipo, columna, fila, ancho, alto) en casillas
MUEBLES = [
    ("cajas", 1, 5, 2, 1), ("banco", 8, 1, 2, 1),                        # Energía
    ("estanteria", 11, 1, 2, 1), ("mesa", 18, 3, 2, 2),                  # Mando
    ("escritorio", 29, 5, 3, 1), ("cajas", 33, 5, 2, 1),                 # Comunicaciones
    ("estanteria", 8, 15, 2, 1), ("cajas", 1, 15, 1, 1),                 # Invernadero
    ("estanteria", 18, 11, 2, 1), ("cajas", 11, 15, 2, 1),               # Soporte vital
    ("litera", 22, 12, 2, 1), ("litera", 22, 14, 2, 1),                  # Refugio
    ("taquilla", 33, 11, 1, 1), ("taquilla", 34, 11, 1, 1), ("cajas", 33, 15, 2, 1),
]

# Habitaciones (para mostrar el nombre al entrar): x, y, ancho, alto en casillas
HABITACIONES = [
    ("Energia", 1, 1, 9, 5), ("Mando", 11, 1, 10, 5), ("Comunicaciones", 22, 1, 13, 5),
    ("Pasillo", 1, 7, 34, 3),
    ("Invernadero", 1, 11, 9, 5), ("Soporte vital", 11, 11, 9, 5), ("Refugio", 21, 11, 14, 5),
]


def mapa_tiled(ancho_tileset: int) -> dict:
    alto, ancho = len(MAPA), len(MAPA[0])
    for r, fila in enumerate(MAPA):
        if len(fila) != ancho:
            raise SystemExit(f"Fila {r} mide {len(fila)}, se esperaban {ancho}")
    gid = lambda i: i + 1
    suelo, paredes, encima, objetos = [], [], [], []
    oid = 1
    prop = lambda n, v: {"name": n, "type": "string", "value": v}
    for r, fila in enumerate(MAPA):
        for c, ch in enumerate(fila):
            en_invernadero = r > 10 and c < 10           # sala inferior izquierda
            es_puerta = ch == "." and r in (6, 10)       # huecos en las filas de muros
            if ch == "#":
                suelo.append(0)
            elif en_invernadero:
                suelo.append(gid(1))
            elif es_puerta:
                suelo.append(gid(5))
            else:
                suelo.append(gid(0))
            paredes.append(gid(2) if ch == "#" else gid(3) if ch == "M" else 0)
            encima.append(gid(4) if ch == "m" else 0)
            if ch in OBJETOS:
                o = OBJETOS[ch]
                objetos.append({
                    "id": oid, "name": o["name"], "type": o["type"],
                    "x": c * T + T / 2, "y": r * T + T / 2, "width": 0, "height": 0,
                    "point": True, "rotation": 0, "visible": True,
                    "properties": [prop(k, v) for k, v in o["props"].items()],
                })
                oid += 1
    for tipo, x, y, w, h in MUEBLES:
        objetos.append({"id": oid, "name": f"{tipo}_{oid}", "type": "mueble", "x": x * T, "y": y * T,
                        "width": w * T, "height": h * T, "rotation": 0, "visible": True,
                        "properties": [prop("tipo", tipo)]})
        oid += 1
    for nombre, x, y, w, h in HABITACIONES:
        objetos.append({"id": oid, "name": nombre, "type": "habitacion", "x": x * T, "y": y * T,
                        "width": w * T, "height": h * T, "rotation": 0, "visible": True})
        oid += 1

    capa = lambda i, n, data: {"id": i, "name": n, "type": "tilelayer", "width": ancho, "height": alto,
                               "data": data, "opacity": 1, "visible": True, "x": 0, "y": 0}
    return {
        "type": "map", "version": "1.10", "tiledversion": "1.10.2", "orientation": "orthogonal",
        "renderorder": "right-down", "infinite": False, "width": ancho, "height": alto,
        "tilewidth": T, "tileheight": T, "nextlayerid": 5, "nextobjectid": oid,
        "layers": [
            capa(1, "suelo", suelo), capa(2, "paredes", paredes), capa(3, "encima", encima),
            {"id": 4, "name": "objetos", "type": "objectgroup", "objects": objetos,
             "opacity": 1, "visible": True, "x": 0, "y": 0, "draworder": "topdown"},
        ],
        "tilesets": [{
            "firstgid": 1, "name": "tiles_base", "image": "../arte/tiles_base.png",
            "imagewidth": ancho_tileset, "imageheight": T, "tilewidth": T, "tileheight": T,
            "columns": len(PIEZAS), "tilecount": len(PIEZAS), "margin": 0, "spacing": 0,
            "tiles": [{"id": i, "properties": [{"name": "colisiona", "type": "bool", "value": True}]}
                      for i in sorted(COLISIONAN)],
        }],
    }


def main() -> None:
    print("Recursos provisionales:")
    tb = tiles_base()
    guardar(tb, ARTE / "tiles_base.png")
    guardar(astronauta(), ARTE / "astronauta.png")
    guardar(estacion(), ARTE / "estacion.png")
    guardar(icono("#ffc83d", "rayo"), ARTE / "icono_energia.png")
    guardar(icono("#5ec8f2", "gota"), ARTE / "icono_oxigeno.png")
    guardar(icono("#b58cff", "escudo"), ARTE / "icono_blindaje.png")
    for nombre, color, ini in [("comandante", "#5b4a7a", "C"), ("ingeniera", "#7a5b3a", "I"),
                               ("biologo", "#3a6b4a", "B"), ("ia", "#2f4f6f", "IA")]:
        guardar(retrato(color, ini), ARTE / f"retrato_{nombre}_neutral.png")

    print("Mapa:")
    ruta = MAPAS / "base.json"
    if ruta.exists() and not FORZAR:
        print(f"  existe, no se toca: {ruta.relative_to(RAIZ)}")
    else:
        MAPAS.mkdir(parents=True, exist_ok=True)
        ruta.write_text(json.dumps(mapa_tiled(tb.width), ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"  creado: {ruta.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
