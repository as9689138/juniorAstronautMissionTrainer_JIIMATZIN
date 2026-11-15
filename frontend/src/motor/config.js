// Constantes del motor. Cambiar aquí, no dentro de las escenas.
export const CASILLA = 32;                 // px por casilla del mapa
export const VELOCIDAD = 150;              // px por segundo del astronauta
export const ACELERACION = 14;            // qué tan rápido arranca (más alto = más brusco)
export const FRENADO = 20;                // qué tan rápido se detiene
export const AYUDA_ESQUINAS = 12;         // px que se desliza solo para no atorarse en el borde de una puerta
export const RADIO_INTERACCION = 44;       // px de distancia para poder usar una estación
export const ZOOM_MAX = 2;

// Abrir con ?depurar en la URL para ver colisiones desde el inicio (también F2 en el juego)
export const DEPURAR_AL_INICIO = new URLSearchParams(location.search).has('depurar');

// Mientras el rol 2 no conecte sus pantallas, la Interfaz muestra un panel provisional
// al usar una estación. Poner en false cuando las mecánicas escuchen EV.INTERACTUAR.
export const PANEL_PROVISIONAL = false;   // las estaciones ya abren la consola y los minijuegos (src/mecanicas/ciclo.js)

// Color por sistema (marcadores de estación y barras)
export const COLOR_SISTEMA = {
  mando: 0xf2f2f2,
  energia: 0xffc83d,
  oxigeno: 0x5ec8f2,
  blindaje: 0xb58cff,
  comunicaciones: 0x7cf0a0,
};

// Luz por fase del día (estado.fase, rol 2). F3 cambia de fase para probar.
//   color/oscuridad: el tono y cuánto oscurece fuera de la luz (0 = nada, 1 = negro)
//   lamparas: cuánto iluminan las lámparas de las salas · vision: radio de visión en px
export const FASES_LUZ = {
  manana:     { color: 0x2a1840, oscuridad: 0.35, lamparas: 0.6,  vision: 220 },
  dia:        { color: 0x0b0820, oscuridad: 0.12, lamparas: 0.4,  vision: 280 },
  noche:      { color: 0x0a0718, oscuridad: 0.72, lamparas: 0.5,  vision: 170 },   // calma acogedora, no miedo
  emergencia: { color: 0x3a0610, oscuridad: 0.7,  lamparas: 0.1,  vision: 130, pulso: true },
};
export const RAYOS_VISION = 160;   // más rayos = sombras más finas (y más trabajo)
