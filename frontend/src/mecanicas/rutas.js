// La ruta de cada personaje: el día sigue la historia del que eligió el jugador.
// Viene de los documentos del equipo:
//  - guion v4: «el personaje que elija el jugador le dará consejos especiales y habilidades únicas durante los 10 soles»;
//  - historia/paquete_historia.md, «Ideas de habilidad por rol»: Wenceslao rinde más en los paneles y en el ahorro de
//    energía; Judith en el invernadero y con más tiempo en las emergencias de clima; Atlas reduce el coste de las
//    decisiones de blindaje y radiación;
//  - el prototipo de minijuegos (rol 2): +5 en el minijuego de su especialidad (eso ya lo hace cada minijuego).
// Los números son una propuesta: el rol 2 los puede cambiar aquí, en un solo lugar.

export const RUTAS = {
  wenceslao: {
    rol: 'wen', nombre: 'Wenceslao', titulo: 'Ingeniero',
    especialidad: 'tarea_paneles',
    // el día empieza por lo suyo: primero las máquinas
    orden: ['tarea_paneles', 'tarea_filtro', 'tarea_invernadero'],
    ahorroNoche: 0.2,                 // la base gasta un 20 % menos de energía de noche
    ventaja: 'De noche, la base gasta menos energía',
  },
  judith: {
    rol: 'jud', nombre: 'Judith', titulo: 'Científica',
    especialidad: 'tarea_invernadero',
    orden: ['tarea_invernadero', 'tarea_paneles', 'tarea_filtro'],
    clima: ['emergencia_solar', 'emergencia_polvo', 'emergencia_radiacion'],
    segundosExtra: 5,                 // lee el clima: 5 s más para decidir en las emergencias de clima
    ventaja: '5 segundos más en las emergencias de clima',
  },
  atlas: {
    rol: 'atl', nombre: 'Atlas', titulo: 'Médico',
    especialidad: 'tarea_filtro',
    orden: ['tarea_filtro', 'tarea_invernadero', 'tarea_paneles'],
    cuidaBlindaje: 0.5,               // las decisiones que gastan blindaje, o en la emergencia de radiación, cuestan la mitad
    ventaja: 'Las decisiones de blindaje y radiación cuestan la mitad',
  },
};

export const ruta = personaje => RUTAS[personaje] ?? RUTAS.wenceslao;

// Qué es cada estación, para que la IA lo diga
export const NOMBRE_TAREA = {
  tarea_paneles: 'limpiar los paneles solares, en Energía',
  tarea_filtro: 'cambiar el filtro de CO₂, en Soporte vital',
  tarea_invernadero: 'regar el invernadero',
};

/** Segundos de la cuenta atrás de una emergencia con la ventaja del personaje */
export function tiempoEmergencia(personaje, nudo, base) {
  const r = ruta(personaje);
  return base + (r.clima?.includes(nudo) ? r.segundosExtra : 0);
}

/** Coste de una decisión de emergencia (puntos, negativo) con la ventaja del personaje */
export function costeEmergencia(personaje, nudo, recurso, puntos) {
  const r = ruta(personaje);
  if (puntos < 0 && r.cuidaBlindaje && (recurso === 'blindaje' || nudo === 'emergencia_radiacion')) {
    return Math.round(puntos * r.cuidaBlindaje);
  }
  return puntos;
}
