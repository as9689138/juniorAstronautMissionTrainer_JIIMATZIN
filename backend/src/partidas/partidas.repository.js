/**
 * Partidas anónimas y sus pruebas de aprendizaje (esquema `aprendizaje`).
 * Guardar es UNA sola sentencia (atómica): crea o actualiza la partida y sus pruebas. Si la partida ya existe y es de
 * otro jugador no se toca nada y no devuelve filas (el modelo lo convierte en conflicto).
 */
export function crearRepositorioPartidas(pool) {
  return {
    async guardar({ jugador, partida: p, dominio, pruebas, modelo }) {
      const filas = pruebas.map((x, orden) => ({ orden, ...x }));
      const { rows } = await pool.query(
        `WITH p AS (
           INSERT INTO aprendizaje.partidas
             (partida_id, jugador_id, personaje, dificultad, idioma, inicio, fin, resultado, soles, medalla, puntaje, dominio, version_modelo)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (partida_id) DO UPDATE SET
             fin = EXCLUDED.fin, resultado = EXCLUDED.resultado, soles = EXCLUDED.soles, medalla = EXCLUDED.medalla,
             puntaje = EXCLUDED.puntaje, dominio = EXCLUDED.dominio, version_modelo = EXCLUDED.version_modelo,
             actualizada_en = clock_timestamp()
           WHERE aprendizaje.partidas.jugador_id = EXCLUDED.jugador_id
           RETURNING partida_id, (xmax = 0) AS nueva
         ), sobrantes AS (
           DELETE FROM aprendizaje.pruebas WHERE partida_id IN (SELECT partida_id FROM p) AND orden >= $14
         ), nuevas AS (
           INSERT INTO aprendizaje.pruebas (partida_id, orden, tema, tipo, correcto, sol, detalle, antes, despues)
           SELECT p.partida_id, x.orden, x.tema, x.tipo, x.correcto, x.sol, x.detalle, x.antes, x.despues
             FROM p, jsonb_to_recordset($15::jsonb)
                  AS x(orden integer, tema text, tipo text, correcto boolean, sol integer, detalle text, antes real, despues real)
           ON CONFLICT (partida_id, orden) DO UPDATE SET
             tema = EXCLUDED.tema, tipo = EXCLUDED.tipo, correcto = EXCLUDED.correcto, sol = EXCLUDED.sol,
             detalle = EXCLUDED.detalle, antes = EXCLUDED.antes, despues = EXCLUDED.despues
         )
         SELECT partida_id, nueva FROM p`,
        [p.id, jugador, p.personaje, p.dificultad, p.idioma, p.inicio, p.fin, p.resultado, p.soles, p.medalla, p.puntaje,
          JSON.stringify(dominio), modelo, filas.length, JSON.stringify(filas)],
      );
      return rows[0] ?? null;
    },
  };
}
