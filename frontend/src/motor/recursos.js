// Lista única de archivos que carga el juego (clave -> ruta).
// Para añadir arte, audio o datos: poner el archivo en su carpeta y añadir una línea aquí.
// Si un archivo falta, el juego avisa en la consola y sigue funcionando.
import { RECUERDOS } from '../mecanicas/recuerdos.js';

export const IMAGENES = {
  astronauta: 'assets/arte/astronauta.png',   // provisional: lo sustituye el dibujo del rol 4
  // Interfaz pintada por herramientas/pintar_interfaz.py (al doble de resolución)
  icono_energia: 'assets/interfaz/icono_energia.png',
  icono_oxigeno: 'assets/interfaz/icono_oxigeno.png',
  icono_blindaje: 'assets/interfaz/icono_blindaje.png',
  ui_placa: 'assets/interfaz/placa.png',
  ui_papel: 'assets/interfaz/papel.png',
  ui_tecla: 'assets/interfaz/tecla.png',
  fase_manana: 'assets/interfaz/fase_manana.png',
  fase_dia: 'assets/interfaz/fase_dia.png',
  fase_noche: 'assets/interfaz/fase_noche.png',
  fase_emergencia: 'assets/interfaz/fase_emergencia.png',
  // Los tres personajes (dibujos de la compañera de arte)
  retrato_wenceslao: 'assets/personajes/wenceslao.png',
  retrato_judith: 'assets/personajes/judith.png',
  retrato_atlas: 'assets/personajes/atlas.png',
  // Arte de los minijuegos (herramientas/pintar_minijuegos.py)
  ...Object.fromEntries([
    'mj_panel', 'mj_polvo_0', 'mj_polvo_1', 'mj_polvo_2', 'mj_polvo_3',
    'mj_carton', 'mj_cinta', 'mj_manguera', 'mj_ranura_carton', 'mj_ranura_cinta', 'mj_ranura_manguera', 'mj_bandeja', 'mj_adaptador',
    'mj_veggie', 'mj_cojin_0', 'mj_cojin_1', 'mj_cojin_2', 'mj_tallo_0', 'mj_tallo_1', 'mj_tallo_2', 'mj_flor_0', 'mj_flor_1', 'mj_flor_2', 'mj_moho',
  ].map(k => [k, `assets/minijuegos/${k}.png`])),
  ...Object.fromEntries(['paneles', 'filtro', 'invernadero', 'consola'].map(k => [`mj_fondo_${k}`, `assets/minijuegos/mj_fondo_${k}.jpg`])),
  // Recuerdos de la IA, los flashbacks (herramientas/pintar_recuerdos.py; ids en src/mecanicas/recuerdos.js)
  ...Object.fromEntries(RECUERDOS.map(r => [`recuerdo_${r.id}`, `assets/recuerdos/${r.id}.png`])),
};

export const MAPAS = {};      // el mapa anterior visto desde arriba ya no se usa: las salas están en DATOS.zonas

// Rol 5 (ENTREGA_FINAL): música, efectos y sonidos reales de Marte en OGG. Las voces se cargan al hablar
// (assets/audio/voces/audios.json), para no esperar a 213 archivos al empezar.
const MUSICA = ['musica_dia', 'musica_noche', 'musica_emergencia', 'musica_exito', 'musica_fracaso'];
const EFECTOS = ['sfx_alarma', 'sfx_apagon', 'sfx_celebracion', 'sfx_puerta_presurizada', 'sfx_viento_marte', 'ui_aviso_emergencia',
  'ui_carta_mejora', 'ui_carta_voltea', 'ui_clic_boton', 'ui_tictac', 'mj_filtro_clic', 'mj_gotas_riego', 'mj_paneles_raspando'];
const MARTE = ['sfx_viento_marte_real_loop', 'sfx_remolino_corto', 'sfx_remolino_polvo', 'sfx_primer_audio_marte'];
// La música del juego es la "Propuesta 3" (estilo cinematográfico espacial: órgano, cuerdas, piano y celesta; día a
// 84 bpm, noche a 56, emergencia a 108). Compuesta y sintetizada con código, CC0: assets/audio/musica/propuesta3/
// (créditos en su CREDITOS_musica.txt). La anterior del rol 5 sigue en assets/audio/musica/ por si se quiere volver.
export const AUDIO = Object.fromEntries([
  ...MUSICA.map(k => [k, `assets/audio/musica/propuesta3/${k}.ogg`]),
  ...EFECTOS.map(k => [k, `assets/audio/efectos/${k}.ogg`]),
  ...MARTE.map(k => [k, `assets/audio/marte/${k}.ogg`]),
]);

// Rol 3: datos reales en JSON, por ejemplo
//   eventos: 'data/eventos.json',
export const DATOS = {
  // Salas de la base al estilo Hades (herramientas/pintar_zonas.py). Sus imágenes se cargan solas.
  zonas: 'assets/zonas/zonas.json',
  // Pronóstico de la IA (herramientas/entrenar_pronostico.py)
  modelo_pronostico: 'data/modelo_pronostico.json',
  sol_reciente: 'data/sol_reciente.json',
  // Historia (Ink compilado, rol 5) y el índice de voces de cada línea
  historia: 'historia/historia.json',
  voces: 'assets/audio/voces/audios.json',
  lineas_en: 'assets/audio/voces/lineas_es_en.json',   // inglés de las 213 líneas con voz (rol 5)
  // Voz de la IA para lo que arma el juego y para el inglés (misma voz que el rol 5: Chatterbox clonando IA.wav;
  // la generan los scripts de voces_ia/, ver assets/audio/voces/ia/LEEME.md)
  voces_ia: 'assets/audio/voces/ia/indice.json',
};

// Hojas de cuadros: clave -> [ruta, ancho de cuadro, alto de cuadro]
export const HOJAS = {
  robot_ia: ['assets/arte/robot_ia.png', 64, 72],   // 0 neutral · 1 feliz · 2 procesando
  // Los astronautas en el mapa (dibujos de la compañera de arte; herramientas/cuadros_astronautas.py):
  // 8 cuadros del paso de frente, 0 = parado. Medidas y origen de los pies en assets/personajes/mapa/hojas.json
  ...Object.fromEntries(['wenceslao', 'judith', 'atlas'].map(p => [`pj_${p}`, [`assets/personajes/mapa/${p}.png`, 110, 177]])),
};
