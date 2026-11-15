import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './infraestructura/config/env.js';
import { registroSolicitudes } from './infraestructura/http/registro.js';
import { limitarPeticiones, cacheContenido, sinCache } from './infraestructura/http/limites.js';
import { noEncontrado, manejadorErrores } from './infraestructura/http/errores.js';
import { crearRutasSalud } from './salud/salud.routes.js';
import { crearRutasApi } from './rutas.js';

/**
 * Fábrica de la aplicación. Recibe el pool para poder sustituirlo en pruebas.
 * El contenido es de solo lectura: no hay endpoints públicos de importación ni edición. La única escritura es
 * POST /api/v1/partidas, donde el juego guarda partidas anónimas para medir el aprendizaje (src/partidas).
 * `donki` (opcional) inyecta cliente/reloj del endpoint en vivo para pruebas.
 */
export function crearApp({ pool, donki }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY); // detrás de un balanceador: IP/protocolo reales

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS, methods: ['GET', 'HEAD', 'POST', 'OPTIONS'], maxAge: 600 }));
  app.use(registroSolicitudes);

  app.use('/health', sinCache, crearRutasSalud({ pool }));
  app.use('/api/v1', limitarPeticiones, cacheContenido, crearRutasApi({ pool, donki }));

  app.use(noEncontrado);
  app.use(manejadorErrores);
  return app;
}
