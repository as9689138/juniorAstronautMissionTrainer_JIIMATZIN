import { ErrorConflicto } from '../compartido/errores.js';

export function crearModeloPartidas(repo) {
  return {
    /** Guarda (o actualiza) una partida. Devuelve { partidaId, nueva }. */
    async guardar(datos) {
      const fila = await repo.guardar(datos);
      if (!fila) throw new ErrorConflicto('partida_de_otro_jugador', 'Esa partida pertenece a otro jugador');
      return { partidaId: fila.partida_id, nueva: fila.nueva === true };
    },
  };
}
