import { Router } from 'express';
import { crearRutasEscenarios } from './escenarios/escenarios.routes.js';
import { crearRutasFichas } from './fichas/fichas.routes.js';
import { crearRutasFuentes } from './fuentes/fuentes.routes.js';
import { crearRutasDonki } from './donki/donki.routes.js';
import { crearRutasPartidas } from './partidas/partidas.routes.js';

/** Monta todos los módulos bajo /api/v1. Para añadir un recurso: nuevo módulo + una línea aquí. */
export function crearRutasApi({ pool, donki }) {
  const router = Router();
  router.use('/live/donki', crearRutasDonki(donki));
  router.use('/scenarios', crearRutasEscenarios(pool));
  router.use('/facts', crearRutasFichas(pool));
  router.use('/sources', crearRutasFuentes(pool));
  router.use('/partidas', crearRutasPartidas(pool));   // única escritura: partidas anónimas del juego
  return router;
}
