"""Revisión automática de las estaciones (objetos protagonistas), como el check.cjs del método procedural-film.

Uso:  python herramientas/revisar_objeto.py            (las 6 estaciones)
      python herramientas/revisar_objeto.py tanque     (una, por sala o por ficha)

Para cada estación dibuja el objeto y comprueba, midiendo píxeles:
  escala        alto frente al astronauta dentro del rango de su ficha, y el punto más alto del dibujo
                donde dice el modelo (±3 px)
  paleta        ≥ 95 % de los píxeles planos dentro de la paleta (distancia RGB ≤ 24)
  luz           la cara izquierda (iluminada) al menos un 10 % más clara que la derecha (mediana de cada cara,
                sin su contorno de tinta; en el tanque, mitad izquierda contra mitad derecha)
  silueta       legible al 25 %: el borde, al menos 40 niveles más oscuro que el suelo
  densidad      trazos por área ≥ 2× la versión anterior (docs/propuestas/estaciones/<sala>_antes.png)
  determinismo  dos ejecuciones dan el mismo resultado (mismo hash)
y escribe la hoja de contacto docs/propuestas/estaciones/hoja.png: antes y después junto al astronauta,
de noche, al 25 % y los 4 cuadros de su animación, una fila por estación.
"""
import hashlib
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pintar_zonas as Z  # noqa: E402

RAIZ = Z.RAIZ
SALIDA = RAIZ / "docs-internos" / "propuestas" / "estaciones"
SUELO = (138, 130, 210)
ESTACIONES = [  # sala, clave de la ficha, tipo, sistema, nombre de la sala en el mapa
    ("energia", "baterias", "maquina", "energia", "Energia"),
    ("mando", "consola", "maquina", "mando", "Mando"),
    ("comunicaciones", "servidores", "maquina", "comunicaciones", "Comunicaciones"),
    ("soporte", "cdra", "maquina", "oxigeno", "Soporte vital"),
    ("refugio", "tanque", "maquina", "blindaje", "Refugio"),
    ("invernadero", "cultivo", "torre", "oxigeno", "Invernadero"),
]


def lum(a):
    return a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114


def dibujar(est, cuadro=None):
    _, clave, tipo, sistema, sala = est
    with Z.resolucion(Z.K_ALTO):
        lz = Z.Lienzo(200, 200)
        P = Z.Iso(100, 120)
        if cuadro is None:
            Z.objeto(lz, P, tipo, 0, 0, 1, 1, sistema, sala)
        else:
            Z.protagonista(lz, P, clave, 0, 0, 1, 1, cuadro=cuadro)
        lz.img = Z.brillo_emisivo(lz.img)
        img = lz.reducir()
    if cuadro is None:
        img = Z.grano_final(img, 7)
    return img, P


def bordes(img):
    base = Image.new("RGBA", img.size, SUELO + (255,))
    base.alpha_composite(img)
    a = lum(np.asarray(base.convert("RGB")).astype(np.float32) / 255)
    gx = np.abs(np.diff(a, axis=1, prepend=a[:, :1]))
    gy = np.abs(np.diff(a, axis=0, prepend=a[:1, :]))
    return np.maximum(gx, gy) > 0.06


def densidad(img):
    al = np.asarray(img.getchannel("A")) > 140
    return bordes(img)[al].sum() / max(1, al.sum())


def poligono(tam, ps):
    m = Image.new("L", tam, 0)
    ImageDraw.Draw(m).polygon(ps, fill=255)
    return np.asarray(m) > 0


def revisar(est, pal):
    sala, clave, *_ = est
    M = Z.MEDIDAS[clave]
    img, P = dibujar(est)
    img2, _ = dibujar(est)
    res = []
    h1, h2 = hashlib.sha256(img.tobytes()).hexdigest()[:12], hashlib.sha256(img2.tobytes()).hexdigest()[:12]
    res.append(("determinismo", h1 == h2, f"{h1}"))
    astro = Image.open(RAIZ / "assets" / "arte" / "astronauta.png")
    bb = astro.getbbox()
    alto_astro = bb[3] - bb[1]
    ZS = 0.12 * Z.PX_M
    ZT = ZS + M["alto"] * Z.PX_M
    RW, RD = M["ancho"] / Z.CASILLA_M, M["fondo"] / Z.CASILLA_M
    cc, cr = 0.5, 0.46
    c0, r0 = cc - RW / 2, cr - RD / 2
    al = np.asarray(img.getchannel("A")) > 140
    y_pix = int(np.argmax(al.any(axis=1)))
    if M["forma"] == "cilindro":
        y_modelo = (P(cc, cr, ZT)[1] - (RW / 2) * Z.TH / np.sqrt(2)) * Z.FINAL
    else:
        y_modelo = P(c0, r0, ZT)[1] * Z.FINAL
    ratio = ZT / alto_astro
    lo, hi = M["escala"]
    res.append(("escala", lo <= ratio <= hi and abs(y_pix - y_modelo) <= 3, f"{ratio:.2f}× ({lo}–{hi}) · techo y={y_pix} / modelo {y_modelo:.0f}"))
    a = np.asarray(img).astype(np.float32)
    plano = (a[..., 3] > 230) & ~bordes(img)
    px = a[plano][:, :3]
    d = np.sqrt(((px[:, None, :] - pal[None, :, :]) ** 2).sum(axis=2)).min(axis=1)
    dentro = float((d <= 24).mean())
    res.append(("paleta", dentro >= 0.95, f"{dentro:.1%}"))
    L = lum(a[..., :3] / 255)
    esc = lambda ps: [(x * Z.FINAL, y * Z.FINAL) for x, y in ps]
    zl = ZS + 3 + (ZT - ZS - 6) * M["luz_z"]
    if M["forma"] == "cilindro":                   # mitad izquierda frente a mitad derecha del cuerpo
        x_c = P(cc, cr)[0] * Z.FINAL
        cuerpo = poligono(img.size, esc([P(cc - RW / 2, cr + RD / 2, ZS + 3), P(cc + RW / 2, cr - RD / 2, ZS + 3),
                                         P(cc + RW / 2, cr - RD / 2, ZT - 3), P(cc - RW / 2, cr + RD / 2, ZT - 3)]))
        xx = np.arange(img.size[0])[None, :]
        izq, der = cuerpo & (xx < x_c - 2), cuerpo & (xx > x_c + 2)
    else:                                          # caras enteras sin su contorno de tinta (erosionadas 3 px)
        def cara(ps):
            mk = Image.fromarray((poligono(img.size, esc(ps)) * 255).astype(np.uint8))
            return np.asarray(mk.filter(ImageFilter.MinFilter(7))) > 0
        izq = cara([P(c0, r0 + RD, ZS), P(c0 + RW, r0 + RD, ZS), P(c0 + RW, r0 + RD, zl), P(c0, r0 + RD, zl)])
        der = cara([P(c0 + RW, r0 + RD, ZS), P(c0 + RW, r0, ZS), P(c0 + RW, r0, zl), P(c0 + RW, r0 + RD, zl)])
    li, ld = float(np.median(L[izq & al])), float(np.median(L[der & al]))   # mediana: el tono que domina cada cara
    res.append(("luz", li >= ld * 1.10, f"izq {li:.2f} · der {ld:.2f} ({li / ld:.2f}×)"))
    base = Image.new("RGBA", img.size, SUELO + (255,))
    base.alpha_composite(img)
    peq = base.convert("RGB").resize((img.width // 4, img.height // 4), Image.LANCZOS)
    m = np.asarray(img.getchannel("A").resize(peq.size, Image.BILINEAR)) > 128
    anillo = m & ~(np.asarray(Image.fromarray(m.astype(np.uint8) * 255).filter(ImageFilter.MinFilter(3))) > 0)
    lp = lum(np.asarray(peq).astype(np.float32))
    l_suelo = float(lum(np.array(SUELO, np.float32)))
    res.append(("silueta 25 %", float(lp[anillo].mean()) <= l_suelo - 40, f"borde {lp[anillo].mean():.0f} · suelo {l_suelo:.0f}"))
    antes = Image.open(SALIDA / f"{sala}_antes.png").convert("RGBA")
    da, dd = densidad(antes), densidad(img)
    res.append(("densidad", dd >= 2 * da, f"{dd / da:.1f}× ({da:.3f} → {dd:.3f})"))
    cuadros = [dibujar(est, k)[0] for k in range(4)]
    img.crop(img.getbbox()).save(SALIDA / f"{sala}_despues.png")
    return res, img, antes, cuadros


def oscurecer(img, color, alfa, cx, cy, vision):
    w, h = img.size
    yy, xx = np.mgrid[0:h, 0:w]
    t = np.clip(np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / vision, 0, 1) * alfa
    base = np.asarray(img.convert("RGB")).astype(np.float32)
    return Image.fromarray((base * (1 - t[..., None]) + np.array(color, np.float32) * t[..., None]).astype(np.uint8)).convert("RGBA")


def hoja(filas):
    fuente = Z.PM.fuente(18)
    astro = Image.open(RAIZ / "assets" / "arte" / "astronauta.png")
    ab = astro.getbbox()
    ast = astro.crop(ab).resize(((ab[2] - ab[0]) * Z.FINAL, (ab[3] - ab[1]) * Z.FINAL), Image.LANCZOS)

    def escena(obj, w=300, h=230):
        e = Image.new("RGBA", (w, h), SUELO + (255,))
        o = obj.crop(obj.getbbox())
        ox, oy = w // 2 - o.width // 2 + 34, h - 20 - o.height
        e.alpha_composite(o, (ox, max(0, oy)))
        e.alpha_composite(ast, (ox - ast.width - 4, h - 14 - ast.height))
        return e

    W, Hc = 300, 230
    H = Image.new("RGB", (5 * (W + 10) + 10, len(filas) * (Hc + 34) + 10), (24, 18, 40))
    d = ImageDraw.Draw(H)
    for i, (sala, res, img, antes, cuadros) in enumerate(filas):
        y = 10 + i * (Hc + 34)
        despues = escena(img)
        peq = despues.resize((W // 4, Hc // 4), Image.LANCZOS).resize((W, Hc), Image.NEAREST)
        tira = Image.new("RGBA", (W, Hc), SUELO + (255,))
        bb = img.getbbox()
        for k, cd in enumerate(cuadros):
            comp = img.copy()
            comp.alpha_composite(cd)
            comp = comp.crop(bb)
            comp = comp.resize((comp.width * 52 // 100, comp.height * 52 // 100), Image.LANCZOS)
            tira.alpha_composite(comp, (4 + k * 74, Hc - 10 - comp.height))
        paneles = [("antes", escena(antes)), ("después", despues), ("noche", oscurecer(despues, (10, 7, 24), 0.62, 110, 190, 230)),
                   ("al 25 %", peq), ("4 cuadros", tira)]
        ok = all(r[1] for r in res)
        for j, (t, p) in enumerate(paneles):
            x = 10 + j * (W + 10)
            H.paste(p.convert("RGB"), (x, y + 24))
            d.text((x, y + 2), (f"{sala.upper()} · {'verde' if ok else 'ROJO'} · " if j == 0 else "") + t, font=fuente, fill=(246, 244, 250))
    H.save(SALIDA / "hoja.png")
    print("hoja:", SALIDA / "hoja.png")


def main():
    SALIDA.mkdir(parents=True, exist_ok=True)
    solo = sys.argv[1:]
    pal = np.array(Z.paleta_protagonistas(), np.float32)
    filas, todo_ok = [], True
    for est in ESTACIONES:
        if solo and not (est[0] in solo or est[1] in solo):
            continue
        res, img, antes, cuadros = revisar(est, pal)
        ok = all(r[1] for r in res)
        todo_ok &= ok
        print(f"{est[0]} ({est[1]}): {'verde' if ok else 'ROJO'}")
        for nombre, bien, texto in res:
            print(f"   {'OK ' if bien else 'MAL'} {nombre}: {texto}")
        filas.append((est[0], res, img, antes, cuadros))
    hoja(filas)
    print("revisión:", "en verde" if todo_ok else "en ROJO")
    return 0 if todo_ok else 1


if __name__ == "__main__":
    sys.exit(main())
