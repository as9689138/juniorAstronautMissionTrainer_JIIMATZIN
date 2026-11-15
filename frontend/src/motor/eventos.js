// Bus de eventos compartido entre roles. Es el ACUERDO de comunicación:
// si se añade o cambia un evento, actualizar también docs/acuerdos.md.
export const bus = new Phaser.Events.EventEmitter();

export const EV = {
  // motor -> mecánicas (rol 2): el jugador usó una estación.
  //   datos: { nombre, accion: 'consola'|'minijuego'|'refugio'|'antena', sistema, etiqueta }
  INTERACTUAR: 'interactuar',
  // cualquiera -> motor: cerrar la pantalla abierta y devolver el control al jugador
  CERRAR_PANEL: 'cerrar-panel',
  // interfaz -> motor: el jugador tocó el aviso en pantalla (equivale a pulsar E)
  PEDIR_INTERACCION: 'pedir-interaccion',
  // mecánicas (rol 2) -> todos: el estado cambió. datos: el objeto estado completo
  ESTADO_CAMBIO: 'estado-cambio',
  // motor -> interfaz: el jugador entró en una habitación. datos: nombre
  HABITACION: 'habitacion',
  // motor -> interfaz: estación al alcance (o null). datos: { nombre, etiqueta, sistema } | null
  CERCA_DE: 'cerca-de',
  // motor -> todos: se activó o desactivó la depuración. datos: boolean
  DEPURACION: 'depuracion',
  // IA de la base (src/compania/robot.js) -> mecánicas (rol 2) e interfaz: pronóstico de llamaradas
  //   datos: { sol, prob, porcentaje, nivel: 'bajo'|'medio'|'alto', fechaDatos, fechaPronostico,
  //            resultadoReal: true|false|null, llamaradasReales, razones, fuente, modelo }
  PRONOSTICO: 'pronostico',
  // mecánicas (rol 2) -> motor e interfaz: a qué estación tiene que ir el jugador ahora (guía visual).
  //   datos: nombre de la estación (p. ej. 'tarea_paneles') o null para quitar la guía
  OBJETIVO: 'objetivo',
  // diálogo (quien muestre una ficha dato:<id> de Ink) -> todos. datos: el id, por ejemplo 'apolo13'
  //   La IA abre el archivo de memoria con ese id (ver MEMORIAS en src/compania/robot.js)
  DATO: 'dato',
  // IA -> interfaz: se abrió un archivo de memoria. datos: { id, numero, titulo, abiertas, total }
  MEMORIA: 'memoria',
  // diálogo -> ciclo: la IA anunció la hora de la base (la IA dicta el tiempo). datos: { fase, hora }
  //   fase: 'manana' | 'dia' | 'emergencia' | 'noche'. El ciclo la guarda en GameState.reloj y publica el estado.
  HORA: 'hora',
  // IA guía (src/compania/guia.js) -> interfaz y robot: hubo una prueba de aprendizaje.
  //   datos: { tema, nombre, tipo, correcto, antes, despues, nivel: { estrellas, texto }, subio }
  APRENDIZAJE: 'aprendizaje',
};

// Estado de control compartido (no es estado del juego: eso es del rol 2)
export const control = {
  bloqueado: false,        // true mientras hay un panel, minijuego o diálogo abierto
  joy: { x: 0, y: 0 },     // joystick táctil, de -1 a 1 en cada eje
  modal: false,            // true mientras hay una pantalla encima del mapa (diálogo, consola, minijuego)
};
