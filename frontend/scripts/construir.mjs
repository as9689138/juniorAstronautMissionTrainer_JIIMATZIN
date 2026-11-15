// Arma frontend/dist/: lo que se sube al hosting estático (Firebase Hosting en Google Cloud).
// Es lo mismo que sirve scripts/servidor.mjs, pero en una sola carpeta: index.html y src/ de frontend/, y todo lo de
// public/ en la raíz. No copia herramientas, historia fuente, documentos ni scripts.
// Uso: pnpm --filter @jiimatzin/frontend construir
import { cp, rm, mkdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST = join(RAIZ, 'dist');

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });
await cp(join(RAIZ, 'index.html'), join(DIST, 'index.html'));
await cp(join(RAIZ, 'src'), join(DIST, 'src'), { recursive: true });
await cp(join(RAIZ, 'public'), DIST, { recursive: true });

// Comprobación mínima: lo que el juego carga al arrancar está
for (const f of ['index.html', 'src/main.js', 'lib/phaser.min.js', 'lib/ink.js', 'historia/historia.json', 'assets/zonas/zonas.json']) {
  await stat(join(DIST, f)).catch(() => { throw new Error(`Falta ${f} en dist/`); });
}
console.log(`Listo: ${DIST}`);
