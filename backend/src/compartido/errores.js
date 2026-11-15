/** Error de aplicación independiente del transporte HTTP. */
export class ErrorNoEncontrado extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.name = 'ErrorNoEncontrado';
    this.codigo = codigo;
  }
}

/** La petición choca con lo que ya hay (p. ej. una partida que es de otro jugador). */
export class ErrorConflicto extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.name = 'ErrorConflicto';
    this.codigo = codigo;
  }
}

/**
 * Falla de una fuente externa (p. ej. NASA DONKI). `estado` es el HTTP que verá el cliente
 * (502 respuesta inválida, 503 fuente limitada, 504 sin respuesta a tiempo).
 */
export class ErrorFuenteExterna extends Error {
  constructor(codigo, mensaje, { estado = 502, reintentarEnS = null } = {}) {
    super(mensaje);
    this.name = 'ErrorFuenteExterna';
    this.codigo = codigo;
    this.estado = estado;
    this.reintentarEnS = reintentarEnS;
  }
}
