import { test, before, beforeEach, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';

const { crearApp } = await import('../src/app.js');

// Pool simulado (como en api.test.js): prueba la ruta, la validación y los errores sin PostgreSQL.
let respuestas = [];
let consultas = [];
const pool = {
  async query(sql, parametros) {
    consultas.push({ sql, parametros });
    return { rows: respuestas.shift() ?? [] };
  },
};
beforeEach(() => { respuestas = []; consultas = []; });
afterEach(() => assert.equal(respuestas.length, 0, 'Se deben consumir las consultas previstas'));

let servidor;
let base;
before(async () => {
  servidor = crearApp({ pool }).listen(0);
  await new Promise((r) => servidor.once('listening', r));
  base = `http://127.0.0.1:${servidor.address().port}`;
});
after(() => servidor.close());

const JUGADOR = '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b';
const PARTIDA = '0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d';
const valida = () => ({
  jugador: JUGADOR,
  partida: { id: PARTIDA, personaje: 'judith', dificultad: 'normal', idioma: 'es', inicio: '2026-11-15T16:00:00.000Z',
    fin: null, resultado: 'en_curso', soles: 2, medalla: null, puntaje: null },
  dominio: { energia: 0.25, aire: 0.49, escudo: 0.22, decidir: 0.22 },
  pruebas: [
    { tema: 'aire', tipo: 'minijuego', correcto: true, sol: 1, detalle: 'invernadero: ganó', antes: 0.19, despues: 0.49 },
    { tema: 'decidir', tipo: 'emergenciaConPista', correcto: false, sol: 2, detalle: 'emergencia de calor: eligió gastar lo más bajo', antes: 0.25, despues: 0.22 },
  ],
  modelo: 'bkt-1',
});
const post = (cuerpo, tipo = 'application/json') =>
  fetch(`${base}/api/v1/partidas`, { method: 'POST', headers: { 'Content-Type': tipo }, body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo) });

test('POST /api/v1/partidas guarda una partida nueva en una sola sentencia → 201', async () => {
  respuestas.push([{ partida_id: PARTIDA, nueva: true }]);
  const r = await post(valida());
  assert.equal(r.status, 201);
  assert.deepEqual(await r.json(), { guardada: true, partida: PARTIDA });
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.equal(consultas.length, 1);
  const p = consultas[0].parametros;
  assert.equal(p[0], PARTIDA);
  assert.equal(p[1], JUGADOR);
  assert.equal(p[13], 2);                                        // cuántas pruebas
  assert.deepEqual(JSON.parse(p[14]).map((x) => x.orden), [0, 1]);
  assert.match(consultas[0].sql, /ON CONFLICT \(partida_id\) DO UPDATE/);
  assert.match(consultas[0].sql, /WHERE aprendizaje\.partidas\.jugador_id = EXCLUDED\.jugador_id/);
});

test('volver a mandar la misma partida la actualiza → 200', async () => {
  respuestas.push([{ partida_id: PARTIDA, nueva: false }]);
  const r = await post({ ...valida(), partida: { ...valida().partida, resultado: 'victoria', soles: 10, medalla: 'oro', puntaje: 84,
    fin: '2026-11-15T16:40:00.000Z' } });
  assert.equal(r.status, 200);
});

test('una partida de otro jugador no se toca → 409', async () => {
  respuestas.push([]);
  const r = await post(valida());
  assert.equal(r.status, 409);
  assert.equal((await r.json()).error.codigo, 'partida_de_otro_jugador');
});

test('datos de más o inválidos se rechazan antes de tocar la BD → 400', async () => {
  const casos = [
    { ...valida(), nombre: 'Ana' },                                              // un nombre: no se acepta
    { ...valida(), jugador: 'no-es-uuid' },
    { ...valida(), partida: { ...valida().partida, personaje: 'otro' } },
    { ...valida(), dominio: { ...valida().dominio, energia: 2 } },
    { ...valida(), pruebas: [{ ...valida().pruebas[0], correo: 'a@b.c' }] },
    { ...valida(), pruebas: Array.from({ length: 401 }, () => valida().pruebas[0]) },
  ];
  for (const c of casos) {
    const r = await post(c);
    assert.equal(r.status, 400, JSON.stringify(c).slice(0, 80));
    assert.equal((await r.json()).error.codigo, 'consulta_invalida');
  }
  assert.equal(consultas.length, 0);
});

test('JSON mal formado → 400 y cuerpo enorme → 413, sin tocar la BD', async () => {
  const r1 = await post('{"jugador":');
  assert.equal(r1.status, 400);
  assert.equal((await r1.json()).error.codigo, 'json_invalido');
  const r2 = await post(JSON.stringify({ relleno: 'x'.repeat(70 * 1024) }));
  assert.equal(r2.status, 413);
  assert.equal(consultas.length, 0);
});

test('no hay ruta para leer las partidas', async () => {
  const r = await fetch(`${base}/api/v1/partidas`);
  assert.equal(r.status, 404);
});

test('producción acepta Cloud SQL por socket sin TLS, pero no otra BD sin TLS', () => {
  const cargar = (vars) => spawnSync(process.execPath, ['--input-type=module', '-e', "await import('./src/infraestructura/config/env.js')"], {
    cwd: new URL('..', import.meta.url), env: { PATH: process.env.PATH, ...vars }, encoding: 'utf8' });
  const prod = { NODE_ENV: 'production', CORS_ORIGINS: 'https://jiimatzin.web.app', TRUST_PROXY: '1', DATABASE_SSL: 'disable' };
  assert.equal(cargar({ ...prod, DATABASE_URL: 'postgresql://app:clave-larga@/jiimatzin?host=/cloudsql/proyecto:us-central1:jiimatzin' }).status, 0);
  assert.notEqual(cargar({ ...prod, DATABASE_URL: 'postgresql://app:clave-larga@db.ejemplo.org:5432/jiimatzin' }).status, 0);
});
