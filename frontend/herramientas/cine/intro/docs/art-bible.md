# Art bible: Misión Marte — introducción

The visual rules every scene follows.
Where this file and a scene brief disagree on a colour, weight or rule, this file wins.
Where this file and `docs/storyboard.md` disagree on a position or a time, the storyboard wins.

Sections 1 to 9 are the house style (paper plate and blueprint plate), adapted to a **horizontal** frame because the
film plays on the game screen. Sections 2.2, the identity tints in 2.3, and 10 are this film's subject.
The house look is mixed with the game's map palette (`jiimatzin/frontend/docs/estilo-mapa.md`): Mars orange,
base violet, and the five resource colours, so the film reads as the same world as the game.

## 1. Frame

The canvas is 1920 px wide and 1080 px tall at 24 fps.
Every pixel value in this file assumes that size.
The origin is the top-left corner and y grows downward.

### 1.1 Game-screen safe area

The game draws two things over the video: the narration **subtitles** in a band at the bottom (y 860 to 1040,
in the player's language) and a small **"Saltar / Skip"** button in the top-right corner (x 1700 to 1900,
y 20 to 90).
Anything the viewer must read (the subject, a match-cut shape, a glyph that carries meaning, a year) sits inside
**x 120 to 1800 and y 100 to 830**.
Backgrounds, stripes, grain, guide geometry, construction lines and decorative scenery run full bleed, but the
subtitle band keeps calm, mid-to-dark tone so white subtitles read on it: no bright highlights and no fine
high-contrast detail below y 860.
The safe area is non-negotiable: the storyboard may never move must-read content outside it.

### 1.2 Composition for a wide frame

Compose for the width, like a game cinematic.
Travel, launches seen side-on, horizons and processions use the horizontal axis; rising subjects use the vertical
axis with the horizon low.
The default subject axis is x = 960; the thirds are x = 640 and x = 1280, y = 360 and y = 720.
Large subjects fill 40 to 70 percent of the frame height so they read on a school tablet.
**No words appear in the film.** Language-neutral numbers are allowed (years such as 1969, 2023, 2030, and 378),
because the game shows the film in Spanish and English and adds its own subtitles.

## 2. Palettes

Names below are the keys of `FILM.lib.pal`.
Colour is flat.
Tone in illustrated mode comes from hatching, never from gradients.
Radial glow halos are allowed only in schematic mode, and for the sun and torch flame in illustrated mode (one
soft halo, never a gradient fill on a form).

### 2.1 Warm illustrated palette (paper plate)

Unchanged house palette (`src/lib.js`): paper `#EFE3C9`, paperShade `#E2D1B0`, paperDeep `#CDB58C`, stripeCream
`#F2E7CF`, stripeYellow `#EFDCA3`, stripeApricot `#F0D9B5`, stripeSage `#DCE3CC`, stripeSpring `#E4EDD0`,
stripeSky `#C9D3D2`, ink `#2A1C13`, inkSoft `#5B4331`, inkFaint `#8A735C`, tan `#C8A47A`, ochre `#C38F2E`, rose
`#C88C86`, duskRose `#E3B1A1`, sage `#94A47F`, teal `#3C8783`, tealDeep `#285F5D`, sun `#F1BF4A`, nightSky
`#4E3F6E`, night `#2F2748`, white `#FBF6EA`, and orange, leaf, wood, sunset, dusk, red for incidental scenery.

Stripe band B by act (storyboard assigns it): stripeApricot (Act 1, humanity), stripeSky (Act 2, the Moon),
stripeYellow (Act 3, the sun and the thirst), stripeApricot again for Act 4 (Mars).

### 2.2 Subject palette, warm

| Name | Hex | Use |
|---|---|---|
| spaceInk | #1C1733 | Deep space band on paper plates (darker than night) |
| marsSky | #D6A06E | Martian daytime sky (map) |
| marsSoil | #AA5434 | Martian ground (map) |
| marsShadow | #703424 | Martian shadow, hatching on Mars forms (map) |
| marsDust | #C9824F | Dust plumes, lit ridges on Mars |
| moonGrey | #BDB8AB | Lunar regolith, lit |
| moonShade | #8C877C | Lunar shadow side, crater walls |
| moonDark | #5E5A52 | Deep crater shadow, bootprint ridges |
| earthOcean | #3C7FA6 | Earth's oceans |
| earthOceanDeep | #285A78 | Ocean hatching |
| earthLand | #7FA35A | Earth's continents |
| earthCloud | #F4EFE4 | Cloud swirls, polar caps |
| helmetGold | #D4A537 | Astronaut helmet and suit trim (the game's characters) |
| helmetGoldDeep | #9C7420 | Helmet shadow side, rings |
| helmetGoldPale | #EBCB72 | Helmet lit edge |
| visorBlack | #15121C | Visor glass |
| visorGlint | #FBF6EA | Visor highlight streaks |
| suitBeige | #E2CFA0 | Suit cloth |
| suitShade | #B89C66 | Suit folds and shadow |
| hoseGrey | #8A8F98 | Corrugated air hose, panel |
| baseViolet | #3A366E | Base Marte Uno interior floor (map) |
| baseWall | #807CD2 | Base walls and domes, lit (map) |
| baseLight | #B0ACF4 | Base wall highlights (map) |
| baseDeep | #262250 | Base shadow, plinths (map) |
| warmLight | #F3E3C3 | Lit windows, lamp light (map) |
| energyYellow | #FFC83D | Energy resource accent (map) |
| oxygenCyan | #5EC8F2 | Oxygen resource accent (map) |
| shieldViolet | #B58CFF | Shielding resource accent (map) |
| commandPink | #E48AD8 | Command room accent (map) |
| commsGreen | #7CF0A0 | Communications accent (map) |
| eagleGold | #D9A441 | Lunar module descent-stage foil |
| eagleFoilDeep | #A8752A | Foil creases |
| eagleSilver | #C7C9CC | Lunar module ascent stage |
| rocketWhite | #F2EEE4 | Saturn V body, Perseverance body |
| rocketBlack | #2E2A30 | Saturn V roll bands, rover wheels |
| flame | #F28A2E | Torch and rocket flame body |
| flameCore | #FFE08A | Flame core |
| torchBronze | #8A6A4A | Torch handle |
| skinLight | #E2B48E | Faces and hands, light |
| skinWarm | #C68A63 | Faces and hands, warm |
| skinDeep | #8E5A3C | Faces and hands, deep |

The three skin tones are mixed in every crowd so humanity reads as everyone.
The five resource colours (energyYellow, oxygenCyan, shieldViolet, commandPink, commsGreen) are far more saturated
than the paper palette: on paper plates they appear **only as small lights, patches and accents** (at most 3 percent
of the frame each), never as large fills.

### 2.3 Cool schematic palette (blueprint plate)

House values: navy `#0B1230`, navyDeep `#060A1C`, navyLight `#18234D`, grid `#3A4A86`, lavender `#C8C1EF`,
lineWhite `#EEF0FF`, paleBlue `#9CC2EA`, glow `#FFF3DC`, magenta `#FF3D98`.

Identity tints (line or dot colours only, never fills; a schematic shot uses at most one besides magenta):

| Name | Hex | Use |
|---|---|---|
| schemMars | #F2A66A | Mars, its orbit, the base marker |
| schemOxygen | #5EC8F2 | Earth, water, the Moon route |

### 2.4 Overlay colours on illustrations

annMagenta `#E43D8C` (change rings, trajectories), annBlue `#3B8EE0` (motion and guide lines, rulers),
annYellow `#EAB530` (attention rings, brackets, sun paths), teal `#3C8783` (secondary guides).
Overlays sit above the illustration at full opacity and never get hatched or grained.

## 3. Line

All widths are at 1920 × 1080. Illustrated lines come from `lib.inkPath` with pressure variation of ±25 percent.

### 3.1 Illustrated weights

| Element | Width | Colour and opacity |
|---|---|---|
| Hero subject outline | 4.5 px | ink 100% |
| Doubled hero outline, occasional | 1.5 px, offset 3 px | ink 40% |
| Secondary form outline | 2.8 px | ink 100% |
| Detail lines: seams, rings, ridges | 1.6 px | inkSoft 90% |
| Hatch strokes | 1.2 to 1.6 px | ink or the form's deep colour, 70 to 90% |
| Construction lines | 1.4 px | inkFaint 30% |

### 3.2 Schematic weights

| Element | Width | Colour and opacity |
|---|---|---|
| Primary outline, double | outer 2.5 px and inner 1.5 px, 9 px apart | lavender 85% outer, 50% inner |
| Secondary outline | 1.5 px | lavender 60% |
| Lattice and cell lines | 1 px | lavender 30 to 40% |
| Grid | 1 px, 60 px pitch | grid 35% |
| Guide circles | 1.5 px | lavender 12 to 18% |
| Long diagonals | 1 px | lavender 12% |
| Ticks | 1.5 px, 10 to 20 px long | lineWhite 60% |
| Brackets | 1.5 px, end ticks 16 px | lavender 60% |
| Magenta flashes and rings | 3 px | magenta 100%, fading |

### 3.3 Overlay weights

Attention and change rings 3 px; trajectory lines 2.5 px; dashed trajectories 2.5 px, 14 on and 10 off; motion
rings 2 px; arc annotations 2 px with 8 px end ticks; rulers 2 px, ticks 12 and 28 px.

## 4. Tone

### 4.1 Hatching

Light comes from the upper left, so shadow falls on the lower right of each form (in space shots the sun's
direction wins and the storyboard names it).
Only shadow sides and recesses get hatched; lit sides stay flat colour.
Primary hatch at 45 degrees rising left to right; cross-hatch at 105 degrees for deep shadow.
Spacing: 12 px light, 8 px mid, 5 px dark, cross layer 7 px.
Cylinders (rocket bodies, torch handle, arms, hoses) take curved contour hatching on the shadow half, 6 to 8 px
apart. Spheres (planets, helmets) take curved contour hatching that follows the limb.
Every stroke jitters: angle ±3 degrees, spacing ±15 percent, ends ±6 px.

### 4.2 Stipple

Stipple dots 1.0 to 2.2 px radius. Use for stars, regolith and dust, and very small textures.
Density 0.002 (sparse) to 0.02 (dense) dots per px².

### 4.3 Grain and boil

`core` lays paper grain over illustrated shots and fine noise over schematic shots on the 12 fps boil.
Scenes never add full-frame grain. Every line wobbles on the shared 12 fps boil (`lib.boil(T)`).

### 4.4 Stripes

Illustrated shots without a sky use `lib.stripes` with band width 140 px at 30 degrees (`width: 140, angle: -0.52`),
band A stripeCream and band B per act. Stripes drift 6 px per beat. Space and sky shots replace the stripes with a
sky band (spaceInk or night with stipple stars) above a ground band.

## 5. Schematic language

Schematic shots explain the hidden structure: orbits, trajectories, mechanisms, particles, timelines.
Every schematic frame starts from `lib.blueprint`: navy base, 60 px grid, at least one large faint guide circle,
two long diagonals.
The subject is a double lavender outline with fine internal structure.
Cell structure: hex lattices for organic and planetary surfaces, rectangular cells for machines.
Points of activity are glow dots: core 8 to 10 px, halo 40 px, 8 to 16 radial ticks 14 to 22 px at 70 percent.
Measurement uses brackets, tick scales and arc annotations. **Years are the only numbers drawn**, in `lib.text`,
thin sans-serif, 30 px, lavender 85 percent, inside the safe area.
Magenta marks a moment of change and lasts at most 12 frames before fading.

**Progress glyph.** A small orbit diagram at (1720, 170), radius 56: three nested orbit circles (Earth, Moon,
Mars as dots on them) with an arc lit in schemMars that grows with the film's act (Act 1 a quarter, Act 2 a half,
Act 3 three quarters, Act 4 full). Every schematic shot draws it; `src/scenes/02-orbitas-del-cosmos.js` owns the
canonical drawing and others copy its numbers. In the intro film the canonical drawing lives in
`src/scenes/01-ano-2030.js` (copied from the prologue's), and the glyph is lit full in every shot (the story is now in 2030).

## 6. Overlays on illustrations

Overlays show what the drawing cannot: paths, attention, time and scale.
Thin rings, arcs, guide lines, rulers and brackets in the four overlay colours.
Rings expand with `outExpo` and fade over 5 to 12 frames. Trajectories draw on at 24 fps.
Every illustrated shot carries at least one overlay and at most four overlay colours at once.

## 7. Motion

### 7.1 The on-twos rule

Characters and objects move on twos (`lib.onTwos(t)`, 12 poses a second).
Camera moves, zooms, overlay draw-ons and rings run at a full 24 fps.

### 7.2 Timing

This film is a narrated prologue, slower than a short: **80 bpm**, so the beat is 0.75 s = 18 frames, an 8th 9
frames, a 16th 4.5 (round to 4 or 5).
Every pop, cut and hit lands on a beat or an 8th, on the frame.
Pops use `outBack` over 4 frames with 6 to 10 percent overshoot. Draw-ons use `outExpo` over 9 frames.
Camera moves may run the whole shot (slow cinematic push-ins and pull-backs are the norm here).
Motion is calm and deliberate, never floaty: something on screen changes on every beat.

### 7.3 Determinism

Seed every random choice from `lib.hash(shotId, ...)` through `lib.rng`.
A scene draws from `t` alone and clamps past its duration.

## 8. Match cuts

A match cut keeps a shape on the same pixels across a mode change.
Shared geometry lives in `docs/storyboard.md`; scenes copy those numbers exactly.

## 9. Closing mark

There is no wordmark (the game shows the title in the player's language).
The last shot ends on the progress glyph enlarged to centre (960, 450), radius 220, all three orbits lit, which
matches the cold open's first structure so the trailer loops.

## 10. Subject reference

Sources checked on 2026-11-15: NASA Apollo 11 Mission Overview; NASA "Voyagers of Mars: the first CHAPEA crew's
yearlong journey"; ASCE Civil Engineering and Freethink on Mars Dune Alpha (ICON/BIG); JPL Mars 2020 press kit;
the game's own `historia.ink`, `docs/estilo-mapa.md` and the character art. Notes in `.tmp/research/fuentes.md`.

### 10.1 The game's astronauts (Wenceslao, Judith, Atlas)

- Round helmet that is **wider than the shoulders**: helmet diameter = 0.42 of the full standing height.
- Helmet shell helmetGold with a darker ring (helmetGoldDeep) around the visor opening; the visor is a
  **round black disc** (visorBlack) filling 70 percent of the helmet's front, with two white glint streaks at upper
  left (one long, one short).
- A thin **zigzag antenna** rises from the helmet's top-right: 3 zig segments, length 0.35 of the helmet diameter,
  ending in a small ball.
- A corrugated grey air **hose** (hoseGrey, ringed every 8 px) loops from the back of the helmet to the right hip.
- Suit suitBeige with horizontal padded bands on the torso, a chest **control panel** (dark rectangle with three
  small lit squares), gold trim at the collar; short stubby arms and legs, boots slightly wider than the legs.
- Each has one identifying **arm patch**: Wenceslao a gear (energyYellow), Judith a flower (commsGreen petals),
  Atlas a red cross (red). When the three stand together: Wenceslao left, Judith centre, Atlas right.
- Proportions are cute and chunky (2.4 heads tall), never realistic long limbs.

### 10.2 Earth

Oceans earthOcean with continents earthLand; clouds earthCloud as swirls; polar cap white. From space the
terminator is a hatched band on the side away from the sun. Draw the Americas facing the viewer (the game is made
in México): North America upper left, México and Central America near centre.

### 10.3 The Moon and Apollo 11 (1969)

- Saturn V: white body with black roll-pattern bands near the base and at the top of the first stage; launch
  16 July 1969 from Pad 39A. Side-on silhouette ratio height to width about 11 to 1.
- Lunar module Eagle: a **gold-foil, octagonal descent stage** (eagleGold with foil creases) on **four splayed
  legs** ending in round footpads; a ladder on the front leg; an angular silver-and-dark **ascent stage** on top
  with a triangular window. Total width with legs about 1.3 times its height.
- Landing in the Sea of Tranquility, 20 July 1969: flat grey regolith, small craters, **black sky with the Earth**
  hanging in it as a crescent or gibbous disc. No stars are visible in the sky in the Apollo photographs; draw the
  sky plain black (spaceInk) in lunar-surface shots.
- The **bootprint**: an oval about 1.9 times as long as wide, filled with **parallel ridges across the sole**
  (moonDark lines on moonShade), crisp edges, regolith grains around it (stipple).

### 10.4 The Sun

Sun disc (sun) with a mottled granulation (stipple and small cells), **prominence loops** at the limb in flame and
flameCore; in schematic mode, magnetic loop lines and wave rings. Never draw a face on the sun.

### 10.5 Mars, CHAPEA and Base Marte Uno

- Mars from space: marsSoil disc with marsShadow markings, a white polar cap, dusty limb (marsDust).
- Martian surface: marsSoil ground with marsShadow hatched rocks and dunes under a marsSky (butterscotch) sky;
  a small, pale sun. Footprints there use the same ridged-oval rule as 10.3 but in marsShadow.
- CHAPEA (2023 to 2024): **four** volunteers, **378 days**, Houston. The habitat Mars Dune Alpha is **3D printed**:
  curved walls with **visible horizontal print layers**, vaulted roofs of different heights, a red-sand yard; one
  storey. Draw the layers as fine horizontal lines every 6 px on the walls.
- Base Marte Uno (the game, 2030): violet domes and modules (baseWall, baseLight highlights, baseDeep shadows) with
  warm lit windows (warmLight), small coloured lights in the five resource colours, on the Martian ground.
- Perseverance (2021): six wheels on rocker-bogie legs, a white boxy body, a mast with a camera head, a front arm;
  body length about 1.4 times its height without the mast.

### 10.6 Ideas drawn as things

- "Sabiduría / antorcha": a hand-held **torch** with a bronze handle and a flame (flame and flameCore) with one soft
  halo; the flame leans with motion.
- "Generaciones": hands of different skin tones passing the torch left to right.
- "Cada partícula, onda y electrón": in blueprint, an atom with three elliptical orbits and electron glow dots; a
  sine wave; a cube for "dimensión".
- "¿Qué nos hace humanos?": three crossed-out glyphs (two hands for social skills, a skeleton outline for anatomy,
  a brain for intelligence), each struck through by a magenta line on its clause.

### 10.8 The four CHAPEA volunteers (2023)

Four adults (two women, two men; mixed skin tones) in **navy-blue flight suits** (earthOceanDeep with a lighter
collar), sleeves with a small round mission patch (red planet). They walk in a line into Mars Dune Alpha and the
door closes behind them. Drawn simple and warm like the crowd in the prologue (heads with skin and hair, no fine
facial detail), 2.8 heads tall — realistic adults, not the chunky game astronauts.

### 10.9 The base IA robot

From the game's sprite `robot_ia.png`: a boxy **head that is a black screen** with two cyan eyes (oxygenCyan),
grey metal frame (hoseGrey) and a small zigzag antenna on top; a thin neck pole; a boxy grey body with a pink
heartbeat display (commandPink) and buttons; two **tread wheels** at the base. It floats or rolls beside the
astronauts; its eyes are its only face. Height about 0.8 of an astronaut.

### 10.10 Base Marte Uno plan (blueprint)

Seven rooms seen from above as rounded rectangles joined by corridors: Pasillo (centre), Mando, Energía,
Soporte vital, Invernadero, Comunicaciones and Refugio; each room's dot is its resource colour from the map
palette (Mando commandPink, Energía energyYellow, Soporte and Invernadero oxygenCyan, Refugio shieldViolet,
Comunicaciones commsGreen) drawn as small glow dots in schematic mode (these act as the identity tints for that one
shot).

### 10.7 Mistakes to avoid

- The helmet is never a small realistic helmet on a tall body: it is huge and round, 0.42 of the height, with a
  black disc visor — never a clear visor with a face showing.
- Never draw a face behind the visor; the visor is black with white glints.
- The lunar sky has no stars; the Martian daytime sky is butterscotch, not blue.
- The Eagle has four legs, never three; the descent stage is gold foil, never white.
- Saturn V is white with black bands, never red or grey.
- The bootprint ridges run across the sole, never along it.
- Mars Dune Alpha's walls are curved and layered (3D printed), never brick or panels.
- No words anywhere in the film; only years and 378 as numbers.
- The CHAPEA volunteers wear navy flight suits, not spacesuits; the habitat is on Earth (inside a warehouse
  bubble with red sand), never on Mars.
- The IA robot's face is a black screen with two cyan eyes, never a human face.
- Never put must-read content below y 830 (subtitle band) or in the top-right Skip corner.
