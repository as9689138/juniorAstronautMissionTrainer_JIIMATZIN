# Storyboard: Misión Marte — introducción

## Logline

From 2030 the film rewinds to 2023 — four NASA volunteers live 378 days in a 3D-printed Mars habitat in Houston —
and runs forward to today's test mission at Base Marte Uno, whose systems switch on as the game begins.
Same house style and palette as the prologue (`docs/art-bible.md`), horizontal 1920 × 1080, 80 bpm.

## Numbers

80 bpm: beat 0.75 s, bar 3 s. Duration 36 s = 12 bars = 864 frames. 5 shots (narrated, 4.5 to 9 s each).
Narration (audio and subtitles from the game): I1 "Año 2030…" at T 0.75; I2 (CHAPEA 2023) at T 3.75; I3 ("Desde
entonces…") at T 15.75; I4 ("Hoy, en 2030…") at T 23.25.

## Summary

| Order | Id | Start | End | Mode | Title |
|---|---|---|---|---|---|
| 01 | ano-2030 | 0 | 6 | schematic | 2030 rewinds to 2023 |
| 02 | mars-dune-alpha | 6 | 15 | illustrated | Four volunteers, a printed habitat |
| 03 | dias-378 | 15 | 22.5 | schematic | 378 days, then the route to Mars |
| 04 | base-marte-uno | 22.5 | 31.5 | illustrated | Base Marte Uno, 2030 |
| 05 | sistemas-encendidos | 31.5 | 36 | schematic | Systems on |

## Shared geometry

G1 (orbit glyph, large): centre (960, 450); sun glowDot r 10; Earth orbit r 110 (Earth dot schemOxygen r 9 at
−30°); Moon orbit r 26 around Earth; Mars orbit r 220 (Mars dot schemMars r 11 at 200°). Small form at (1720, 170)
scaled 0.2545, all arcs lit (full).

---

## 01 ano-2030: 2030 rewinds to 2023

T 0 to 6, schematic. Opens on G1 large, orbits turning (the same last frame as the prologue). T 0.75: the year
"2030" writes on under the glyph at (960, 760) in `lib.text` 30 px (bigger here: 64 px, lavender 85 %). T 2.25:
the orbits spin backwards fast (rewind, 4 turns in 1.5 s) while the year counts down 2030 → 2023 on twos.
T 3.75: lands on "2023" with a magenta ring around Earth's dot; the Earth dot grows toward the frame centre-left
by T 6 (push 1 to 2.5x on Earth). Sound: reversed swell T 2.25 to 3.75, hit T 3.75.

---

## 02 mars-dune-alpha: Four volunteers, a printed habitat

T 6 to 15, illustrated. A big warehouse interior on Earth (paper, warm stripes stripeApricot behind high windows),
inside it a translucent inflatable bubble outline (inkFaint) over a red-sand yard (marsSoil stipple). The habitat
Mars Dune Alpha per art bible §10.5: one storey, curved walls with horizontal print layers every 6 px (tan/ochre),
vaulted roofs of different heights, a door at centre-left (x 760). The four volunteers per §10.8 walk in a line
from the left (T 6.75 onward, on twos), reach the door by T 11.25, enter one per beat (T 11.25, 12.0, 12.75,
13.5); the door closes T 14.25 with an annMagenta ring. Overlay: annBlue dashed walking line; annYellow bracket over
the habitat's width. Camera slow push 1.0 to 1.06. Sound: footsteps on 8ths, door thud T 14.25.

---

## 03 dias-378: 378 days, then the route to Mars

T 15 to 22.5, schematic. A large tally ring at (960, 430), r 260: 378 small ticks around it fill clockwise from
T 15 to T 19.5 (fast, smooth), the number "378" (64 px) at the ring centre counts up with them, "2023" small under
it. T 19.5: the ring collapses into Earth's dot; a Hohmann transfer arc traces from Earth (left, (420, 520)) to Mars
(right, (1500, 380), schemMars) by T 22.5, a glowDot craft travelling on it. Progress glyph small, full. Sound:
fast ticking glock rising T 15 to 19.5, whoosh T 19.5, arrival chime T 22.5.

---

## 04 base-marte-uno: Base Marte Uno, 2030

T 22.5 to 31.5, illustrated. Mars at morning: marsSky above y 520, marsSoil ground with hatched dunes, small pale
sun upper left. Base Marte Uno per §10.5 centre-right (violet domes and modules, warm windows, tiny resource lights).
The three game astronauts per §10.1 (Wenceslao, Judith, Atlas, 300 px tall) and the IA robot per §10.9 walk from the
left toward the base (on twos) and stop at T 29.25 in front of the airlock; the base's windows light one per beat
from T 27.0. Overlay: annYellow ring on the airlock T 29.25. Camera slow pan right 120 px. Sound: wind bed, a warm
chord when the windows light.

---

## 05 sistemas-encendidos: Systems on

T 31.5 to 36, schematic. The base plan per §10.10 seen from above (rooms as double-outlined rounded rectangles,
corridors), centred. Rooms light one per beat: Pasillo T 31.5, Mando 32.25, Energía 33.0, Soporte vital 33.75,
Invernadero 34.5, Comunicaciones 34.5 (same beat), Refugio 35.25, each with its resource-colour glow dot and a
magenta ring. "2030" small under the plan. Progress glyph full. Ends lit: the game starts ("Sistemas encendidos…").
Sound: a rising power-up chime per room, final chord T 35.25.
