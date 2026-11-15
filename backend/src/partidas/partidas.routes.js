import express, { Router } from 'express';
import { sinCache } from '../infraestructura/http/limites.js';
import { crearRepositorioPartidas } from './partidas.repository.js';
import { crearModeloPartidas } from './partidas.model.js';
import { crearControladorPartidas } from './partidas.controller.js';

/**
 * POST /api/v1/partidas: el juego guarda una partida anónima (la IA guía la manda al final de cada sol y al terminar).
 * Es la única ruta de escritura de la API. No hay ruta para leerlas: solo el equipo las consulta con el CLI
 * (pnpm --filter @jiimatzin/backend partidas -- exportar).
 */
export function crearRutasPartidas(pool) {
  const controlador = crearControladorPartidas(crearModeloPartidas(crearRepositorioPartidas(pool)));
  const router = Router();
  router.post('/', sinCache, express.json({ limit: '64kb', type: 'application/json' }), controlador.guardar);
  return router;
}
