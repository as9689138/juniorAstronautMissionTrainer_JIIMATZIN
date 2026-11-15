// Guardar una partida anónima en la API del equipo: POST /api/v1/partidas (backend/src/partidas).
// La única escritura de la API. El cuerpo lo arma la IA guía (src/compania/guia.js): jugador = UUID al azar del
// navegador, la partida, el dominio de cada tema y las pruebas de aprendizaje. Sin nombres ni otros datos personales.
import { API_BASE, TIEMPO_MAX_MS } from './config.js';

/** Devuelve { ok, estado, reintentar }: reintentar = true si conviene volver a mandarla más tarde (red, 429, 5xx). */
export async function enviarPartida(cuerpo, { timeoutMs = TIEMPO_MAX_MS } = {}) {
  try {
    const r = await fetch(`${API_BASE}/partidas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(timeoutMs),
      keepalive: true,                       // que llegue aunque se cierre la pestaña
    });
    return { ok: r.ok, estado: r.status, reintentar: r.status === 429 || r.status >= 500 };
  } catch {
    return { ok: false, estado: 0, reintentar: true };
  }
}
