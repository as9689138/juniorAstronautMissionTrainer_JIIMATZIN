# Brief común para los agentes de escena

Proyecto: `C:\Users\iyahi\Downloads\pkt\cine-prologo` (procedural-film, adaptado a **horizontal 1920×1080**).

Lee antes de escribir, en este orden:
1. `C:\Users\iyahi\.claude\skills\procedural-film\reference\scene-anatomy.md` (cómo se escribe una escena).
2. `C:\Users\iyahi\.claude\skills\procedural-film\reference\example-paper-frame.jpg` y `example-blueprint-frame.jpg`
   (la densidad y el acabado son el listón).
3. `docs/art-bible.md` completo (paleta, pesos de línea, sección 10 con las reglas de dibujo y los errores a evitar).
4. `docs/storyboard.md`: sección "Shared geometry" y las entradas de TUS tomas.
5. `src/lib.js` (la API de dibujo: inkPath, hatch, crossHatch, stipple, stripes, paper, blueprint, glowDot, ticks,
   bracket, tracePath, camera, onTwos, seg, mapRange, rng, hash, text…). La paleta está en `lib.pal`.
6. Ejemplo terminado del pipeline (vertical, solo como referencia de estructura): en GitHub
   kuhnhomeuk-cell/procedural-film, `examples/butterfly-life/src/scenes/`.

Reglas:
- **Solo escribes tus archivos** `src/scenes/NN-<id>.js` (ya existen como stubs; reemplázalos). No toques
  `src/timeline.js`, `src/lib.js`, `src/core.js`, `src/music.js`, `docs/` ni escenas de otros agentes.
- El marco es 1920×1080. Zona segura de lo que se debe leer: x 120–1800, y 100–830. La banda inferior
  (y 860–1040) lleva los subtítulos del juego: tono tranquilo y oscuro-medio ahí, sin detalle brillante.
  Esquina superior derecha (x 1700–1900, y 20–90) libre (botón Saltar).
- **Ninguna palabra en el cuadro.** Solo años (1957, 1969, 1990, 1998, 2021, 2023, 2030) y 378 en tomas
  esquemáticas, con `lib.text`, 30 px, lavender 85 %.
- Ritmo: 80 bpm, beat 0.75 s (18 cuadros), 8vo 0.375 s. Todo golpe cae en un beat u 8vo exacto. Algo cambia en
  cada beat. Personajes y objetos en dos (`lib.onTwos`); cámara y anillos a 24 fps.
- Determinismo: nada de Math.random/Date; semillas con `lib.hash(shotId, …)`. Dibuja solo a partir de `t` y
  limita `t` a la duración.
- Las tomas esquemáticas dibujan el glifo de progreso pequeño (art bible §5, G1 reducido a (1720, 170), r 56) con el
  arco del acto encendido. Copia los números de G1 del storyboard.
- Costo: cada cuadro debe dibujarse en menos de ~150 ms (usa los caches de lib para fondos).

Comprobación (obligatoria, repite hasta que esté bien):
```bash
cd C:/Users/iyahi/Downloads/pkt/cine-prologo
node tools/snap.cjs --only <id> --shot <id> --samples 6 --sheet --scale 0.5
```
Mira la hoja (`.frames/<id>-sheet.png`) y cuadros sueltos a escala 1 cuando haga falta. Compara contra el brief de
la toma, la sección 10 de la biblia y los errores a evitar. Itera hasta que cada cuadro esté a nivel.
Al final corre `node tools/check.cjs` (puede tardar 2–3 min; déjalo terminar) y confirma que tus tomas pasan.

Entrega: un resumen corto por toma (qué se ve, qué comprobaste, qué quedó flojo si algo).
