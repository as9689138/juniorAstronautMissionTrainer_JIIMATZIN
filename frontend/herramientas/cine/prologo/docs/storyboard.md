# Storyboard: Misión Marte — prólogo

## Logline

From a single spark of curiosity, humanity converges, reaches the Moon, asks what makes it human, finds the answer
in the thirst to know, passes the torch through generations — and hands it to the player, who steps onto Mars.
Paper-plate illustrations cut against navy blueprints on an 80 bpm grid, with the game's palette and astronauts, a
narrator reading the ten prologue paragraphs (audio and subtitles supplied by the game) and a score computed in code.

## Numbers

- 80 bpm: beat 0.75 s (18 frames), 8th 0.375 s (9 frames), bar 3 s (72 frames).
- Duration 162 s = 54 bars = 3,888 frames at 24 fps, 1920 × 1080.
- 29 shots. This is a narrated prologue, so shots run **3 to 7.5 s** (house shorts use 1 to 3 s); every boundary
  sits on the beat grid (multiples of 0.75 s) and every shot still changes something on every beat.
- Narration: ten paragraphs, each starting one beat after its slot opens (cue kind `narracion`). Estimated at 12.5
  characters per second; the slots leave at least one beat of air after each paragraph.

## Summary

| Order | Id | Start | End | Mode | Title |
|---|---|---|---|---|---|
| 01 | chispa | 0 | 4.5 | schematic | A spark becomes the orbits |
| 02 | humanos-convergen | 4.5 | 10.5 | illustrated | Humanity converges |
| 03 | orbitas-del-cosmos | 10.5 | 16.5 | schematic | Pull-back to the infinite |
| 04 | enigmas-y-tesoros | 16.5 | 24 | illustrated | Enigmas and treasures in the sky |
| 05 | saturno-v | 24 | 27 | illustrated | Saturn V lifts off |
| 06 | ruta-a-la-luna | 27 | 30 | schematic | The route to the Moon, 1969 |
| 07 | eagle-y-huella | 30 | 33 | illustrated | Eagle and the first bootprint |
| 08 | nino-mira-arriba | 33 | 37.5 | illustrated | A child looks up |
| 09 | tres-respuestas | 37.5 | 45 | schematic | Not social, not anatomy, not intelligence |
| 10 | ojos-y-estrellas | 45 | 48 | illustrated | Stars in the child's eyes |
| 11 | la-chispa | 48 | 54 | illustrated | Then… what is it? |
| 12 | mas-alla-del-ojo | 54 | 60 | illustrated | Beyond what the eye can reach |
| 13 | mundo-en-la-mano | 60 | 64.5 | illustrated | The world in one bite |
| 14 | que-mueve-al-planeta | 64.5 | 70.5 | schematic | What moves the planet |
| 15 | dimension-particula-onda | 70.5 | 76.5 | schematic | Dimension, particle, wave |
| 16 | electron | 76.5 | 81 | schematic | Every electron |
| 17 | subir-mas-alto | 81 | 87 | illustrated | Higher and higher |
| 18 | tapar-el-sol | 87 | 91.5 | illustrated | Covering the sun with a finger |
| 19 | olas-del-sol | 91.5 | 96 | schematic | The sun's dancing waves |
| 20 | reflejo-en-el-visor | 96 | 102 | illustrated | The sun in the visor |
| 21 | linea-del-tiempo | 102 | 109.5 | schematic | Generations of missions |
| 22 | relevo-de-manos | 109.5 | 115.5 | illustrated | Hands pass the torch |
| 23 | perseverance | 115.5 | 123 | illustrated | Perseverance on Mars |
| 24 | intentar-de-nuevo | 123 | 129 | illustrated | Try again |
| 25 | trayectorias | 129 | 135 | schematic | Every attempt has a result |
| 26 | la-antorcha | 135 | 141 | illustrated | Your turn: the torch |
| 27 | tres-astronautas | 141 | 150 | illustrated | Wenceslao, Judith and Atlas |
| 28 | huella-en-marte | 150 | 156 | illustrated | A bootprint on Mars |
| 29 | glifo-final | 156 | 162 | schematic | The orbits close the loop |

## Structure

- Act 1, bars 1 to 11 (0 to 33 s): humanity and the cosmos; the Moon, 1969. Stripe band B stripeApricot.
  Progress glyph lit a quarter.
- Act 2, bars 12 to 27 (33 to 81 s): the question and the answer — the thirst to know. Band B stripeSky.
  Glyph lit half.
- Act 3, bars 28 to 45 (81 to 135 s): higher, the sun, the legacy of generations, trying again. Band B
  stripeYellow. Glyph lit three quarters.
- Act 4, bars 46 to 54 (135 to 162 s): your turn — the torch, the three astronauts, Mars. Band B stripeApricot.
  Glyph full.
- The hinge ("Entonces… ¿Qué es?") sits on bar 17 (48 s); the answer opens on bar 19 (54 s).
- Match cuts: 01 opens on G1 and 29 closes on G1 (loop). 07 ends on G2 (bootprint on the Moon) and 28 lands on G2
  (bootprint on Mars) — the same pixels across two acts. 08, 10 and 11 share the child's head G3.
  19 to 20: the sun disc G4 stays on the same pixels from blueprint to the visor reflection.
- Push-ins: 07 (to the bootprint, 1 to 2.2x), 12 (into the iris, 1 to 6x), 16 (into the atom, 1 to 3x).
  Pull-back: 03 (Earth to galaxy, 1 to 0.06x, log-linear).
- Time devices: the progress glyph on every schematic shot; the timeline rail of 21 with years.

## Conventions

- `T` is global seconds, `t` is shot-local seconds (t = T − start).
- Camera moves use `lib.camera(ctx, { x, y, zoom, rot }, fn)`.
- Palette names come from the art bible.
- Hard cuts are the default; a shot declares `transitionIn` when it needs more, and the incoming shot owns it.
- Scenes clamp `t` past their duration.
- No words in any frame. Years only, in schematic shots, per art bible section 5.
- Safe area x 120 to 1800, y 100 to 830; subtitle band y 860 to 1040 stays calm.

## Shared geometry

### G1: The orbit glyph, large

Centre (960, 450). Sun dot at the centre: glowDot radius 10. Earth orbit circle radius 110, Earth dot (schemOxygen,
r 9) at angle −30°. Moon orbit: circle radius 26 around the Earth dot. Mars orbit circle radius 220, Mars dot
(schemMars, r 11) at angle 200°. Small form of the same glyph at (1720, 170) scaled 56/220 = 0.2545.

### G2: The bootprint

Oval centred (960, 470), long axis 380 px rotated −12° from vertical (toe at top), width 200 px; toe end 10 percent
wider than the heel. 14 ridges across the sole, evenly spaced along the long axis, each ridge a straight segment
spanning 86 percent of the local width. In 07 the ridges are moonDark on moonShade; in 28 marsShadow on marsSoil.

### G3: The child's head (profile facing right)

Head circle centre (820, 420), radius 110; nose tip at (938, 432); eye at (880, 405), radius 9; chin at
(905, 505). Hair mass covers the head from angle 150° to 330°. Skin skinWarm, hair ink.

### G4: The sun disc

Centre (960, 400), radius 150. In 19 the double lavender outline at radius 150; in 20 the reflected sun sits on the
visor at the same centre and radius.

---

## 01 chispa: A spark becomes the orbits

T 0 to 4.5, schematic, no transition (film start).

### Composition
Navy blueprint, centred construction. A single spark at (960, 450) builds outward into the full G1 glyph.

### Forms
G1 at full size: sun glowDot, Earth orbit (lavender double outline), Moon orbit, Mars orbit (schemMars dashed),
Earth and Mars dots; ticks around the sun; one guide circle radius 420 at 15 percent.

### Motion
T 0.00: black navyDeep, the spark appears as a 2 px point. T 0.75 (beat 2): sun glowDot pops (outBack 4 frames)
with 12 ticks. T 1.50: Earth orbit traces on (outExpo, 9 frames), Earth dot lands. T 2.25: Moon orbit traces.
T 3.00 (bar 2): Mars orbit traces in schemMars, Mars dot lands with a magenta ring. T 3.75: everything holds;
orbits start to turn slowly (Earth 6°/s). T 4.5: cut.

### Camera
Locked, zoom 1.

### Enter and exit
Enters from black. Exits on the full G1, which 29 returns to (loop).

### Subject
The Sun–Earth–Moon–Mars system: Earth's orbit inside Mars's, the Moon close around the Earth.

### Sound
T 0.00: low sub swell (A1), shimmering high celesta note E6. T 0.75: soft hit, sun bloom (filtered noise burst).
T 1.50, 2.25, 3.00: three rising celesta notes A5, C#6, E6. T 3.00: first downbeat of the pad (A minor add9).

---

## 02 humanos-convergen: Humanity converges

T 4.5 to 10.5, illustrated, cut.

### Composition
Night landscape on paper: sky band night with stipple stars above y 560; a gentle hill whose crest peaks at
(960, 600). Two lines of small people walk in from both edges along the hill toward the crest; at the end ~18
figures stand on and around the crest, looking up. Figures 70 to 110 px tall, mixed skin tones.

### Forms
Hill (sage hatched in night tones: inkSoft hatch on the lower right); people as simple ink-outlined silhouettes
with flat clothes colours (rose, teal, ochre, tan, sage) and skin heads; a child among them at the crest (taller
emphasis ring later). Stars as stipple, 4 brighter stars with 4-point glints.

### Overlays
annBlue dashed motion lines behind the walkers; at T 9.75 an annYellow attention ring around the crest group.

### Motion
Walkers advance on twos, step cycle 2 poses per beat; arrival at the crest by T 9.0. T 6.0: narration P1 begins.
T 7.5 (bar 3): first heads tilt up. T 9.0: all heads up. T 9.75: ring.

### Camera
Slow push-in 1.00 to 1.06 centred (960, 560).

### Enter and exit
Exits on the people looking up; 03 pulls back from Earth.

### Subject
"Humanos, seres vivos, converjan entre sí": everyone, all skin tones, comes together.

### Sound
T 4.5: pad continues; soft footstep ticks on 8ths (brushed noise). T 6.0: narration enters; music ducks −8 dB
under narration (the game mixes the voice; the score leaves 1 to 4 kHz quiet). T 9.75: chime E5.

---

## 03 orbitas-del-cosmos: Pull-back to the infinite

T 10.5 to 16.5, schematic, cut.

### Composition
Starts on Earth drawn schematically (double outline r 180 at (960, 450), hex lattice continents faint), then a
log-linear pull-back: Moon orbit, Earth orbit, planets' orbits, then a spiral galaxy filling the frame.

### Forms
Earth outline, schemOxygen dot; orbits lavender; the galaxy as a two-arm logarithmic spiral of glow dots and
stipple. **Owns the progress glyph** at (1720, 170), r 56, Act 1 (a quarter lit in schemMars).

### Motion
T 10.5 to 16.5: zoom 1 → 0.06 log-linear; each new layer lands on a beat: Moon orbit T 11.25, Earth orbit T 12.0,
Mars orbit T 12.75, outer planets T 13.5, the Sun's neighbourhood T 14.25, galaxy arms trace T 15.0 to 16.0.

### Camera
Pull-back, `inOutSine` over the shot, anchored on (960, 450).

### Enter and exit
Enters on Earth; exits on the galaxy — "infinito, inmenso".

### Subject
Scale of the cosmos: Moon close to Earth, Mars farther, the galaxy vast.

### Sound
T 10.5: reverse cymbal into T 12.0; a rising pad layer per landed beat (tremolo strings, synthesized saw pad).

---

## 04 enigmas-y-tesoros: Enigmas and treasures

T 16.5 to 24, illustrated, cut.

### Composition
Paper-plate night sky full frame (night with stipple stars), a thin hill silhouette along the bottom (crest at y
790) with the small crowd from 02 in silhouette. In the sky, "treasures" appear one per beat: a comet (upper
left), a ringed planet (upper right), a nebula swirl (centre), a cluster of bright stars, the red dot of Mars low.

### Forms
Comet head white with flame tail; ringed planet ochre with an ink ring; nebula as stipple in duskRose and rose;
Mars marsSoil disc r 22 at (1380, 560).

### Overlays
Each treasure gets an annYellow ring as it appears (expanding, 9 frames). Final beat: an annMagenta ring on Mars.

### Motion
Treasures at T 17.25, 18.0, 19.5, 21.0, 22.5 (Mars), stars twinkle on twos.

### Camera
Slow drift right 40 px across the shot.

### Enter and exit
Ends on Mars ringed — the destination planted early.

### Subject
"Colmado de enigmas, preguntas que esperan una respuesta y tesoros que buscan ser encontrados".

### Sound
Each treasure: a celesta note of the motif A5, C6, E6, G6, then Mars a low bell A3. Narration P1 ends ~T 22.5.

---

## 05 saturno-v: Saturn V lifts off

T 24 to 27, illustrated, cut.

### Composition
Side-on Saturn V rocket on the left third (x 640), 620 px tall, on a launch tower; dawn stripes behind
(stripeApricot band B); smoke billows at the base.

### Forms
Rocket rocketWhite with black roll bands (rocketBlack) per 10.3; tower ink lattice; flame and flameCore exhaust;
smoke clouds paper with tan hatching.

### Overlays
annBlue vertical trajectory line drawing on above the nose.

### Motion
T 24.0: ignition flash. T 24.75 (beat 2): narration P2 enters. T 24.75 to 27: the rocket rises 260 px (inQuad), smoke
expands on twos.

### Camera
Slight shake (±3 px at 12 Hz) T 24 to 25.5.

### Enter and exit
Exits rising out of the top.

### Subject
Saturn V, Apollo 11 launch, 16 July 1969.

### Sound
T 24.0: rumble (brown noise, low-passed 120 Hz, swelling) and a timpani hit D2.

---

## 06 ruta-a-la-luna: The route to the Moon, 1969

T 27 to 30, schematic, cut.

### Composition
Earth (left, centre (520, 470), r 120) and Moon (right, centre (1450, 380), r 45); a figure-eight translunar path
traced between them; year "1969" at (960, 760).

### Forms
Double outlines; path dashed lavender; the craft a glowDot travelling along the path; glyph at (1720, 170).

### Motion
T 27.0: path traces on over 2 beats; craft travels T 27.0 to 29.25; arrives with magenta ring T 29.25.

### Camera
Locked.

### Enter and exit
Exits on the Moon arrival.

### Subject
Apollo 11's free-return-style figure-eight path to the Moon.

### Sound
Arpeggio on 8ths E5, A5, B5, E6; arrival hit T 29.25.

---

## 07 eagle-y-huella: Eagle and the first bootprint

T 30 to 33, illustrated, cut.

### Composition
Lunar surface (moonGrey ground below y 640, craters), black sky (spaceInk) with the Earth (r 60) at (1500, 220).
Eagle on the left third (x 600), 380 px tall. Bootprint G2 in the foreground.

### Forms
Eagle per 10.3 (four legs, gold foil, silver ascent stage); regolith stipple; bootprint G2 moonDark ridges.

### Overlays
annYellow ring around the bootprint at T 31.5.

### Motion
T 30.0: Eagle settled. T 31.5: the bootprint presses in (outBack 4 frames).

### Camera
Push-in from zoom 1 (centre (960, 540)) to 2.2 centred on G2 (960, 470), T 31.5 to 33 (inOutSine).

### Enter and exit
Exits filling with G2 — match to 28.

### Subject
20 July 1969, Sea of Tranquility; no stars in the lunar sky.

### Sound
T 30.0: silence drop except a high drone; T 31.5: soft thud and a choir-like pad (sine stack) — "one small step".

---

## 08 nino-mira-arriba: A child looks up

T 33 to 37.5, illustrated, cut.

### Composition
Night stripes off; dark blue-violet sky (nightSky) with stars; the child's head in profile G3, shoulders below;
the child looks up and right toward the sky.

### Forms
G3 head, skin skinWarm, hair ink; a hoodie in teal; stars stipple; the Moon crescent small at (1450, 200).

### Overlays
annBlue dashed sight-line from the eye toward the Moon.

### Motion
T 33.75: narration P3. T 34.5: blink (on twos). T 36.0: the sight-line draws on.

### Camera
Locked with 1.00 to 1.03 push.

### Enter and exit
G3 holds into 10 and 11.

### Subject
"¿Qué nos hace humanos?"

### Sound
Solo piano-like sine notes, sparse: A4 at T 33.0, E5 at T 34.5, C5 at T 36.0.

---

## 09 tres-respuestas: Not social, not anatomy, not intelligence

T 37.5 to 45, schematic, cut.

### Composition
Three glyphs in a row at x 520, 960, 1400, y 430: two hands shaking, a skeleton outline, a brain. Each is struck
by a magenta diagonal line on its clause.

### Forms
Double lavender outlines with lattice interiors (hands rectangular cells, brain hex lattice); progress glyph.

### Motion
Glyphs draw on at T 37.5, 38.25, 39.0. Strikes: T 39.75 (hands), T 41.25 (skeleton), T 43.5 (brain), each a magenta
line drawn in 6 frames, the glyph dims to 35 percent after.

### Camera
Locked.

### Enter and exit
Exits on three dimmed glyphs.

### Subject
"No son nuestras habilidades sociales, no es nuestra anatomía y, claramente, no es nuestra inteligencia…"

### Sound
Each strike: a muted pluck descending E5, C5, A4.

---

## 10 ojos-y-estrellas: Stars in the child's eyes

T 45 to 48, illustrated, cut.

### Composition
G3 again; the night sky reflected as tiny points in the child's eye; the frame darkens toward the edges.

### Forms
As 08; eye catchlights as stars.

### Overlays
annYellow small ring around the eye at T 46.5.

### Motion
Slow blink at T 45.75; ring T 46.5.

### Camera
Push 1.0 to 1.15 toward the eye (880, 405).

### Enter and exit
Darkens into 11.

### Subject
A pause before the question.

### Sound
Music thins to a single held note A3.

---

## 11 la-chispa: Then… what is it?

T 48 to 54, illustrated, cut.

### Composition
Near-dark (night) frame; the child's G3 head faintly lit; the child's cupped hands at (900, 640). A tiny spark
appears in the hands and grows into a warm glow that lights the face.

### Forms
Spark: glow core flameCore r 6 growing to 40 with one soft halo; light falls on the face (skin lit side flat,
shadow hatched).

### Overlays
annYellow rings pulsing from the spark on beats.

### Motion
T 48.75: narration P4 ("Entonces… ¿Qué es?…"). T 51.0 (bar 18 hinge): the spark ignites (outBack). T 51.75 to
54: the glow grows on beats.

### Camera
Locked.

### Enter and exit
The glow fills the frame centre; 12 opens on the eye.

### Subject
The hinge of the film: curiosity is the spark.

### Sound
T 48.0 to 51.0: near silence, a heartbeat-like sub pulse on beats. T 51.0: bright bell chord A–C#–E (A major) —
the answer is coming.

---

## 12 mas-alla-del-ojo: Beyond what the eye can reach

T 54 to 60, illustrated, cut.

### Composition
Extreme close-up of an eye (iris skin-adjacent, teal iris with radial hatching), then a push into the pupil,
which opens onto a horizon with mountains and the curve of the sky beyond.

### Forms
Eyelids ink; iris teal and tealDeep radial hatch; pupil night; inside: a horizon line with distant mountains
(paperShade) and stars.

### Overlays
annBlue ruler along the horizon showing distance ticks.

### Motion
T 54.75: narration P5. Push-in on beats: zoom steps at T 55.5, 57.0, 58.5.

### Camera
Push 1 to 6x centred (960, 450).

### Enter and exit
Exits on the far horizon.

### Subject
"Saber qué hay más allá de lo que nuestra visión es capaz de alcanzar".

### Sound
The full pad returns, now in A major; a rising string swell to T 60.

---

## 13 mundo-en-la-mano: The world in one bite

T 60 to 64.5, illustrated, cut.

### Composition
A child's hands lift the Earth (r 170 at (960, 430)) like an apple, mouth open at the right edge about to bite;
playful, warm.

### Forms
Earth per 10.2; hands skinDeep; a small bite-mark appears in the Earth's limb at the end (a scalloped notch, no
gore — just the outline).

### Overlays
annMagenta arc annotation showing the bite at T 63.75.

### Motion
T 60.0 to 62.25: the Earth rises; T 63.0: chomp (outBack); notch appears T 63.75.

### Camera
Locked.

### Enter and exit
Exits on the bitten Earth.

### Subject
"Tomar al mundo y devorarlo por completo de un solo bocado".

### Sound
T 63.0: comic crunch (short noise burst and a woodblock).

---

## 14 que-mueve-al-planeta: What moves the planet

T 64.5 to 70.5, schematic, cut.

### Composition
The Earth at four positions around a sun (orbit ellipse centre (960, 450), rx 560, ry 220), each tilted 23.4°,
with rotation arrows; gears of the seasons faint behind.

### Forms
Double outlines; schemOxygen on the Earths; glowDot sun; progress glyph (Act 2, half).

### Motion
Earths appear on beats T 65.25, 66.0, 66.75, 67.5; axis tilts draw; the orbit traces; rotation arrows spin.

### Camera
Locked.

### Subject
Axial tilt and orbit: what moves the planet (day, year, seasons).

### Sound
Ticking clock on 8ths (filtered clicks), pad continues.

---

## 15 dimension-particula-onda: Dimension, particle, wave

T 70.5 to 76.5, schematic, cut.

### Composition
A montage of four cards in the centre (each 1.5 s, two beats): a wireframe cube, a cloud of particles, a sine
wave, an atom.

### Forms
Lavender double lines; particles as glow dots; wave lineWhite; progress glyph.

### Motion
Cards at T 70.5, 72.0, 73.5, 75.0, each drawing on in 9 frames, a magenta flash on each change.

### Camera
One small push per card (1.0 to 1.05).

### Subject
"Cada dimensión, cada partícula, cada onda y cada electrón".

### Sound
Four synth stabs on the card changes (A, C#, E, A rising).

---

## 16 electron: Every electron

T 76.5 to 81, schematic, cut.

### Composition
The atom from 15 large at centre; push into one electron's orbit until the electron glow dot fills the centre.

### Forms
Three elliptical orbits, nucleus glowDot, electrons glow dots with ticks.

### Motion
T 76.5 to 81: push 1 to 3x; T 80.25: magenta burst.

### Camera
Push-in to the electron at (1100, 380).

### Subject
Electrons orbit the nucleus.

### Sound
Rising whoosh into T 81 (bar 28, Act 3).

---

## 17 subir-mas-alto: Higher and higher

T 81 to 87, illustrated, cut.

### Composition
Stripes stripeYellow; a diagonal staircase of inventions rising from lower left to upper right: wheel, kite,
biplane, rocket, each higher; the rocket exits upper right.

### Forms
Ink-outlined objects with flat colours (wood, ochre, rose, rocketWhite); hatched shadows.

### Overlays
annBlue rising diagonal guide; annYellow rings on each arrival.

### Motion
T 81.75: narration P6. Objects pop in on beats T 82.5, 84.0, 85.5; the rocket launches T 86.25.

### Camera
Pan up-right 120 px over the shot.

### Subject
"Querer saber más, hacer más, lograr más y llegar más alto".

### Sound
Rising scale on beats (A4, B4, C#5, E5, A5).

---

## 18 tapar-el-sol: Covering the sun with a finger

T 87 to 91.5, illustrated, cut.

### Composition
Silhouette of a raised hand in the foreground (left-centre) with the index finger covering a sun (sun disc r 60
at (1120, 330)); landscape below; warm stripes.

### Forms
Hand inkSoft silhouette with skinDeep rim; sun with halo.

### Overlays
annMagenta strike through the hand at T 90.0 ("no solo…").

### Motion
T 88.5: the finger covers the sun; T 90.0: the hand lowers and the sun shines out.

### Camera
Locked.

### Subject
"No solo mirar el cielo y tapar el sol con el dedo".

### Sound
T 90.0: bright swell.

---

## 19 olas-del-sol: The sun's dancing waves

T 91.5 to 96, schematic, cut.

### Composition
G4 sun disc in double lavender; prominence loops at the limb; wave rings radiating; starfield ticks.

### Forms
Sun outline, magnetic loops lineWhite, wave rings lavender; progress glyph (Act 3).

### Motion
Waves expand on every beat; loops arc up on twos.

### Camera
Locked.

### Enter and exit
G4 holds into 20.

### Subject
Prominences and solar activity.

### Sound
Shimmer pad, wave sweeps on beats.

---

## 20 reflejo-en-el-visor: The sun in the visor

T 96 to 102, illustrated, cut.

### Composition
Close-up of the game astronaut's helmet (helmetGold, black visor) filling the frame; the visor reflects G4's sun
and dancing waves; stars in the visor.

### Forms
Helmet per 10.1, visor visorBlack with glints; reflected sun in flame and flameCore; waves in sun.

### Overlays
annYellow arc annotation following a wave.

### Motion
Waves dance on twos; T 99.75: a glint sweeps across the visor.

### Camera
Slow push 1.0 to 1.08.

### Subject
"Estar frente al sol y ver en el reflejo de tus ojos esas olas que danzan".

### Sound
Melody returns (A5, G#5, E5, C#5) over the pad.

---

## 21 linea-del-tiempo: Generations of missions

T 102 to 109.5, schematic, cut.

### Composition
A horizontal rail from x 200 to 1720 at y 470; six stations with glyphs and years above: 1957 (Sputnik ball with
4 antennae), 1969 (lunar module), 1990 (telescope tube), 1998 (station with solar wings), 2021 (rover), 2023 (3D
printed dome, four dots).

### Forms
Lavender glyphs, years in `lib.text` 30 px; progress glyph.

### Motion
T 102.75: narration P7. Stations light on beats from T 103.5, one every 0.75 s to 107.25; a pulse travels the rail.

### Camera
Pan right 160 px.

### Subject
Real missions and years (Sputnik 1957, Apollo 11 1969, Hubble 1990, ISS 1998, Perseverance 2021, CHAPEA 2023).

### Sound
A tick per station (glockenspiel), pad.

---

## 22 relevo-de-manos: Hands pass the torch

T 109.5 to 115.5, illustrated, cut.

### Composition
Three pairs of hands across the frame (left: older hands with a wrinkled sleeve; centre: an adult; right: a
young hand), passing a torch left to right.

### Forms
Torch per 10.6; hands in skinDeep, skinLight, skinWarm.

### Overlays
annBlue dashed path of the torch.

### Motion
Hand-offs at T 111.0 and 113.25 (outBack); the flame leans with motion.

### Camera
Pan right 200 px with the torch.

### Subject
"El legado de miles de personas… generación por generación".

### Sound
Warm strings; hand-off chimes.

---

## 23 perseverance: Perseverance on Mars

T 115.5 to 123, illustrated, cut.

### Composition
Martian landscape (marsSky above y 520, marsSoil ground); Perseverance (per 10.5) centre-right, 300 px long,
leaving twin tracks from the left; small sun pale.

### Forms
Rover rocketWhite body, rocketBlack wheels, mast and arm; dunes hatched in marsShadow.

### Overlays
annBlue dashed tracks; annYellow ring on the mast camera at T 120.0.

### Motion
The rover crawls 180 px on twos; the mast turns at T 120.0.

### Camera
Slow pan following the rover.

### Subject
"Más cosas van surgiendo de entre la Tierra y el espacio" — Perseverance on Mars since 2021.

### Sound
Wind (filtered noise), soft servo whir when the mast turns.

---

## 24 intentar-de-nuevo: Try again

T 123 to 129, illustrated, cut.

### Composition
A small model rocket on a launch pad on a field; first launch wobbles and falls (parachute); second launch rises
straight out of frame.

### Forms
Model rocket rocketWhite with red fins; smoke puffs; parachute rose.

### Overlays
annMagenta trajectory of the failed flight (arc), annBlue for the good one.

### Motion
T 123.75: narration P8. Launch 1 at T 124.5, falls by T 126.0; launch 2 at T 127.5, out by T 129.

### Camera
Locked.

### Subject
"Cuando lo intentas… no siempre será lo que esperas, pero siempre tendrás un resultado".

### Sound
Fizzle (falling pitch) T 125.25; a confident whoosh T 127.5.

---

## 25 trayectorias: Every attempt has a result

T 129 to 135, schematic, cut.

### Composition
Earth (left), Mars (right, schemMars); several dashed trajectory attempts that miss, each ending in a small result
glyph (a tick mark), then one that lands on Mars.

### Forms
Lavender dashed arcs, glowDot craft, magenta landing ring; progress glyph.

### Motion
Arcs trace on beats T 129.75, 130.5, 131.25, 132.0; the last lands T 133.5.

### Camera
Locked.

### Subject
Iteration: every attempt is data, and one reaches Mars.

### Sound
Each attempt a pluck; the landing a full chord.

---

## 26 la-antorcha: Your turn: the torch

T 135 to 141, illustrated, cut.

### Composition
The torch is handed (from the left) to a small game astronaut (per 10.1, 520 px tall, centre (1080, 560)) who
raises it; its light reflects on the black visor.

### Forms
Astronaut per 10.1 (patch hidden: this is "you"); torch per 10.6.

### Overlays
annYellow rings pulsing from the flame.

### Motion
T 135.75: narration P9. Hand-off T 136.5; the astronaut raises the torch T 138.0 (outBack); pulses on beats.

### Camera
Push 1.0 to 1.06.

### Subject
"Ahora a ti te toca… Tienes la antorcha de la sabiduría".

### Sound
Heroic swell begins; brass-like saw chord A major.

---

## 27 tres-astronautas: Wenceslao, Judith and Atlas

T 141 to 150, illustrated, cut.

### Composition
The three astronauts per 10.1 stand on a Martian ridge (Wenceslao left x 700, Judith centre x 960, Atlas right x
1220), 360 px tall, facing a sunrise over Mars; Base Marte Uno's violet domes glow in the valley behind (right).

### Forms
Patches visible (gear, flower, cross); Martian sky marsSky; base per 10.5 with warm windows and tiny resource
lights.

### Overlays
annYellow ring around each astronaut on beats T 143.25, 144.0, 144.75.

### Motion
Each astronaut turns their helmet toward camera on its ring beat (on twos); T 147.0 the sun clears the horizon.

### Camera
Slow pull-back 1.08 to 1.0.

### Subject
"Demuestra tus capacidades, supérate y demuestra lo capaz que eres."

### Sound
Full theme statement; three bell hits on the rings.

---

## 28 huella-en-marte: A bootprint on Mars

T 150 to 156, illustrated, cut.

### Composition
Close on the Martian ground; a boot steps down and lifts away, leaving the G2 bootprint in marsShadow on marsSoil;
dust puffs.

### Forms
Boot (suitBeige with gold trim) entering from the top; G2 ridges; dust stipple marsDust.

### Overlays
annMagenta ring on the bootprint at T 152.25.

### Motion
T 150.75: narration P10 ("Porque si lo intentas, lo logras…"). T 151.5: boot down (outBack); T 152.25: lifts; dust
settles on twos.

### Camera
Locked on G2.

### Enter and exit
Lands on the same pixels as 07's final frame.

### Subject
Our own first step, matching Apollo's.

### Sound
T 151.5: thud and a final rising chord.

---

## 29 glifo-final: The orbits close the loop

T 156 to 162, schematic, cut.

### Composition
Mars large (double outline r 160) with the Base Marte Uno marker (schemMars glow dot) then pull back as the
progress glyph grows from (1720, 170) to G1 at (960, 450), all arcs lit.

### Forms
G1 exactly; all orbits; magenta ring on Mars.

### Motion
T 156 to 158.25: Mars and base marker; T 158.25 to 160.5: the glyph flies to centre and scales to G1 (inOutSine);
T 160.5 to 162: hold, orbits turning (matches 01's last frame).

### Camera
Locked.

### Enter and exit
Ends on 01's opening structure (loop).

### Subject
Mars, the base, the full journey.

### Sound
Final chord resolves on A; tail to silence at T 162.

---

## Appendix: from doc to code — `src/timeline.js`

The timeline mirrors the summary table; cues come from the Sound sections (kinds hit, sfx, cut, swell,
narracion). The narration cues carry the paragraph number for the game.
