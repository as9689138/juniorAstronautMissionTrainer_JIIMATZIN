// Generado desde docs/storyboard.md.
FILM.TIMELINE = {
 "title": "Misión Marte — introducción",
 "bpm": 80,
 "duration": 36,
 "fps": 24,
 "width": 1920,
 "height": 1080,
 "shots": [
  {
   "id": "ano-2030",
   "file": "01-ano-2030.js",
   "start": 0.0,
   "end": 6.0,
   "mode": "schematic",
   "title": "2030 rewinds to 2023",
   "brief": "T 0 to 6, schematic. Opens on G1 large, orbits turning (the same last frame as the prologue). T 0.75: the year \"2030\" writes on under the glyph at (960, 760) in `lib.text` 30 px (bigger here: 64 px, lavender 85 %). T 2.25: the orbits spin backwards fast (rewind, 4 turns in 1.5 s) while the year counts down 2030 → 2023 on twos. T 3.75: lands on \"2023\" with a magenta ring around Earth's dot; the Earth dot grows toward the frame centre-left by T 6 (push 1 to 2.5x on Earth). Sound: reversed swell T 2.25 to 3.75, hit T 3.75."
  },
  {
   "id": "mars-dune-alpha",
   "file": "02-mars-dune-alpha.js",
   "start": 6.0,
   "end": 15.0,
   "mode": "illustrated",
   "title": "Four volunteers, a printed habitat",
   "brief": "T 6 to 15, illustrated. A big warehouse interior on Earth (paper, warm stripes stripeApricot behind high windows), inside it a translucent inflatable bubble outline (inkFaint) over a red-sand yard (marsSoil stipple). The habitat Mars Dune Alpha per art bible §10.5: one storey, curved walls with horizontal print layers every 6 px (tan/ochre), vaulted roofs of different heights, a door at centre-left (x 760). The four volunteers per §10.8 walk in a line from the left (T 6.75 onward, on twos), reach the door by T 11.25, enter one per beat (T 11.25, 12.0, 12.75, 13.5); the door closes T 14.25 with"
  },
  {
   "id": "dias-378",
   "file": "03-dias-378.js",
   "start": 15.0,
   "end": 22.5,
   "mode": "schematic",
   "title": "378 days, then the route to Mars",
   "brief": "T 15 to 22.5, schematic. A large tally ring at (960, 430), r 260: 378 small ticks around it fill clockwise from T 15 to T 19.5 (fast, smooth), the number \"378\" (64 px) at the ring centre counts up with them, \"2023\" small under it. T 19.5: the ring collapses into Earth's dot; a Hohmann transfer arc traces from Earth (left, (420, 520)) to Mars (right, (1500, 380), schemMars) by T 22.5, a glowDot craft travelling on it. Progress glyph small, full. Sound: fast ticking glock rising T 15 to 19.5, whoosh T 19.5, arrival chime T 22.5."
  },
  {
   "id": "base-marte-uno",
   "file": "04-base-marte-uno.js",
   "start": 22.5,
   "end": 31.5,
   "mode": "illustrated",
   "title": "Base Marte Uno, 2030",
   "brief": "T 22.5 to 31.5, illustrated. Mars at morning: marsSky above y 520, marsSoil ground with hatched dunes, small pale sun upper left. Base Marte Uno per §10.5 centre-right (violet domes and modules, warm windows, tiny resource lights). The three game astronauts per §10.1 (Wenceslao, Judith, Atlas, 300 px tall) and the IA robot per §10.9 walk from the left toward the base (on twos) and stop at T 29.25 in front of the airlock; the base's windows light one per beat from T 27.0. Overlay: annYellow ring on the airlock T 29.25. Camera slow pan right 120 px. Sound: wind bed, a warm chord when the windows"
  },
  {
   "id": "sistemas-encendidos",
   "file": "05-sistemas-encendidos.js",
   "start": 31.5,
   "end": 36.0,
   "mode": "schematic",
   "title": "Systems on",
   "brief": "T 31.5 to 36, schematic. The base plan per §10.10 seen from above (rooms as double-outlined rounded rectangles, corridors), centred. Rooms light one per beat: Pasillo T 31.5, Mando 32.25, Energía 33.0, Soporte vital 33.75, Invernadero 34.5, Comunicaciones 34.5 (same beat), Refugio 35.25, each with its resource-colour glow dot and a magenta ring. \"2030\" small under the plan. Progress glyph full. Ends lit: the game starts (\"Sistemas encendidos…\"). Sound: a rising power-up chime per room, final chord T 35.25."
  }
 ],
 "cues": [
  {
   "t": 0.75,
   "kind": "narracion",
   "note": "Párrafo 1 de la introducción (voz y subtítulos los pone el juego)"
  },
  {
   "t": 3.75,
   "kind": "narracion",
   "note": "Párrafo 2 de la introducción (voz y subtítulos los pone el juego)"
  },
  {
   "t": 3.75,
   "kind": "hit",
   "note": "Rewind lands on 2023"
  },
  {
   "t": 14.25,
   "kind": "sfx",
   "note": "Door thud"
  },
  {
   "t": 15.75,
   "kind": "narracion",
   "note": "Párrafo 3 de la introducción (voz y subtítulos los pone el juego)"
  },
  {
   "t": 19.5,
   "kind": "swell",
   "note": "Whoosh to the route"
  },
  {
   "t": 22.5,
   "kind": "hit",
   "note": "Arrival chime"
  },
  {
   "t": 23.25,
   "kind": "narracion",
   "note": "Párrafo 4 de la introducción (voz y subtítulos los pone el juego)"
  },
  {
   "t": 29.25,
   "kind": "hit",
   "note": "Airlock ring"
  },
  {
   "t": 35.25,
   "kind": "hit",
   "note": "Final chord, systems on"
  }
 ]
};
