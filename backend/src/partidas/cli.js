import { parseArgs } from 'node:util';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

// Para el equipo: lo que guarda el juego (partidas anónimas y sus pruebas de aprendizaje). No hay ruta HTTP para leerlo.
const help = `Uso: pnpm --filter @jiimatzin/backend partidas -- <resumen|exportar|borrar>
resumen: cuántas partidas, jugadores y pruebas hay, y cómo terminan.
exportar: --salida <CSV> [--desde <AAAA-MM-DD>]   Una fila por prueba (para estudiar el aprendizaje y ajustar el BKT).
borrar: --jugador <uuid>                          Borra todo lo de ese jugador (si una familia lo pide: el juego le
                                                  muestra su código en el reporte para adultos).`;

const csv = (v) => {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

let pool;
try {
  const args = process.argv.slice(2); if (args[0] === '--') args.shift();
  const { positionals, values } = parseArgs({ args, allowPositionals: true, options: {
    salida: { type: 'string' }, desde: { type: 'string' }, jugador: { type: 'string' }, ayuda: { type: 'boolean' } } });
  const [accion] = positionals;
  if (values.ayuda) { console.log(help); process.exit(0); }
  if (positionals.length !== 1 || !['resumen', 'exportar', 'borrar'].includes(accion)) throw new Error(help);
  if (!/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? '')) throw new Error('DATABASE_URL es obligatoria');
  const ssl = process.env.DATABASE_SSL ?? 'disable';
  if (!['disable', 'require', 'no-verify'].includes(ssl)) throw new Error('DATABASE_SSL inválido');
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 5000,
    ssl: ssl === 'disable' ? false : { rejectUnauthorized: ssl === 'require' } });

  if (accion === 'resumen') {
    const { rows: [r] } = await pool.query(`SELECT count(*)::int AS partidas, count(DISTINCT jugador_id)::int AS jugadores,
        (SELECT count(*)::int FROM aprendizaje.pruebas) AS pruebas,
        count(*) FILTER (WHERE resultado = 'victoria')::int AS victorias,
        round(avg(puntaje))::int AS puntaje_medio
      FROM aprendizaje.partidas`);
    console.log(JSON.stringify(r, null, 2));
  } else if (accion === 'exportar') {
    if (!values.salida) throw new Error('Falta --salida <archivo.csv>');
    if (values.desde && !/^\d{4}-\d{2}-\d{2}$/.test(values.desde)) throw new Error('--desde debe ser AAAA-MM-DD');
    const { rows } = await pool.query(`SELECT p.jugador_id, p.partida_id, p.personaje, p.dificultad, p.idioma, p.inicio, p.fin, p.resultado,
        p.soles, p.medalla, p.puntaje, p.version_modelo, x.orden, x.sol, x.tema, x.tipo, x.correcto, x.antes, x.despues, x.detalle
      FROM aprendizaje.partidas p JOIN aprendizaje.pruebas x USING (partida_id)
      WHERE $1::date IS NULL OR p.recibida_en >= $1::date
      ORDER BY p.recibida_en, p.partida_id, x.orden`, [values.desde ?? null]);
    const cols = rows.length ? Object.keys(rows[0]) : ['jugador_id', 'partida_id'];
    const lineas = [cols.join(','), ...rows.map((r) => cols.map((c) => csv(r[c] instanceof Date ? r[c].toISOString() : r[c])).join(','))];
    await writeFile(resolve(values.salida), lineas.join('\n') + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ archivo: resolve(values.salida), filas: rows.length }));
  } else {
    if (!/^[0-9a-f-]{36}$/i.test(values.jugador ?? '')) throw new Error('Falta --jugador <uuid>');
    const { rowCount } = await pool.query('DELETE FROM aprendizaje.partidas WHERE jugador_id = $1', [values.jugador]);
    console.log(JSON.stringify({ jugador: values.jugador, partidasBorradas: rowCount }));
  }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await pool?.end();
}
