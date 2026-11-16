// Servidor de desarrollo del juego (pnpm dev:front), sin dependencias:
//  - sirve frontend/ (index.html y src/) y frontend/public/ en la raíz, como Vite;
//  - sin caché, para que al recargar siempre se vean los módulos nuevos;
//  - reenvía /api/... y /health a la API de contenido (pnpm dev:back), como el proxy de vite.config.example.js:
//    el juego llama al mismo origen y no hay CORS. Si la API no responde, contesta 502 en JSON y el adaptador
//    (src/api) usa el respaldo de public/escenarios/ o el juego sigue con su contenido propio.
// Uso: node scripts/servidor.mjs [puerto]      Variables: PUERTO (5173), JIIMATZIN_API (http://localhost:3000)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PUBLICO = join(RAIZ, 'public');
const PUERTO = Number(process.argv[2] ?? process.env.PUERTO ?? 5173);
const API = (process.env.JIIMATZIN_API ?? 'http://localhost:3000').replace(/\/$/, '');

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.woff2': 'font/woff2',
};
// Solo se sirve lo que el navegador necesita: nunca las herramientas, la historia fuente ni los documentos
const PRIVADO = /^\/(herramientas|historia|docs|docs-internos|scripts|node_modules|datos-originales)(\/|$)/;

async function archivo(ruta) {
  // primero frontend/ (index.html, src/) salvo las carpetas privadas; después public/, que se sirve entero
  for (const base of PRIVADO.test(ruta) ? [PUBLICO] : [RAIZ, PUBLICO]) {
    const p = normalize(join(base, ruta));
    if (!p.startsWith(base + sep) && p !== base) continue;          // nada fuera de la carpeta
    try {
      const s = await stat(p);
      if (s.isFile()) return p;
      if (s.isDirectory() && (await stat(join(p, 'index.html')).catch(() => null))) return join(p, 'index.html');
    } catch { /* probar en la siguiente carpeta */ }
  }
  return null;
}

async function reenviar(req, res) {
  try {
    // POST (solo /api/v1/partidas lo usa): se reenvía el cuerpo tal cual, con un límite
    let body;
    if (req.method === 'POST') {
      const partes = []; let tam = 0;
      for await (const c of req) {
        tam += c.length;
        if (tam > 256 * 1024) {      // 413, no 502: con 502 el juego creería que la API está caída y lo reintentaría
          res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
          res.end(JSON.stringify({ error: { codigo: 'cuerpo_muy_grande', mensaje: 'El cuerpo pasa de 256 KB' } }));
          return;
        }
        partes.push(c);
      }
      body = Buffer.concat(partes);
    }
    const r = await fetch(API + req.url, { method: req.method, body, signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': req.headers['content-type'] ?? 'application/json' } : {}) } });
    const cuerpo = Buffer.from(await r.arrayBuffer());
    res.writeHead(r.status, { 'Content-Type': r.headers.get('content-type') ?? 'application/json', 'Cache-Control': 'no-store' });
    res.end(cuerpo);
  } catch {
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ error: { codigo: 'api_no_disponible', mensaje: `La API no responde en ${API}` } }));
  }
}

async function atender(req, res) {
  let ruta;
  try { ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch { res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Ruta mal escrita'); return; }   // p. ej. /%E0%A4%A
  const esApi = ruta.startsWith('/api/') || ruta.startsWith('/health');
  if (req.method !== 'GET' && req.method !== 'HEAD' && !(req.method === 'POST' && ruta.startsWith('/api/'))) { res.writeHead(405).end(); return; }
  if (esApi) { await reenviar(req, res); return; }
  const p = await archivo(ruta === '/' ? '/index.html' : ruta);
  if (!p) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('No encontrado'); return; }
  const cuerpo = await readFile(p);
  res.writeHead(200, { 'Content-Type': TIPOS[extname(p).toLowerCase()] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(req.method === 'HEAD' ? undefined : cuerpo);
}

// Un error en una petición no tumba el servidor (sin esto, una promesa rechazada cerraba el proceso de Node)
createServer((req, res) => {
  atender(req, res).catch(e => {
    console.error('[servidor]', req.method, req.url, e.message);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end();
  });
}).listen(PUERTO, () => console.log(`JIIMATZIN (juego) en http://localhost:${PUERTO}  ·  API: ${API}`));
