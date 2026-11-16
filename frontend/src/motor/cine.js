// Videos del prólogo y la introducción (películas procedurales, pkt/cine-prologo y pkt/cine-intro).
// Se ven encima del juego en una capa HTML: el video (imagen y música), los subtítulos de la narración en el idioma
// del jugador (assets/cine/<nombre>.json, con sus tiempos) y un botón «Saltar». Mientras suena, el sonido del juego
// se calla. Si el video no está o no se puede reproducir, devuelve false y el juego sigue con la versión en texto.
import { idioma } from './idioma.js';
import { sonido } from './sonido.js';

const ESTILO = `
#cine{position:fixed;inset:0;z-index:50;background:#000;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .4s}
#cine.ver{opacity:1}
#cine video{width:100%;height:100%;object-fit:contain;background:#000}
#cine .sub{position:absolute;left:50%;bottom:5.5%;transform:translateX(-50%);width:min(88%,1100px);text-align:center;
  font:600 clamp(16px,2.4vw,26px)/1.35 system-ui,sans-serif;color:#fff8ea;text-shadow:0 2px 6px #000,0 0 2px #000;
  background:rgba(12,10,28,.55);padding:.45em .9em;border-radius:10px;opacity:0;transition:opacity .35s}
#cine .sub.ver{opacity:1}
#cine button{position:absolute;top:2.5%;right:2%;font:600 15px system-ui,sans-serif;color:#fff8ea;background:rgba(20,16,38,.7);
  border:1px solid rgba(255,248,234,.5);border-radius:8px;padding:.5em 1em;cursor:pointer}
#cine button:hover{background:rgba(60,50,110,.85)}`;

/** Muestra el video `nombre` (prologo | intro). Devuelve una promesa: true si se vio (o se saltó), false si no hay video. */
export async function verCine(nombre) {
  let subs = null;
  try { subs = await (await fetch(`assets/cine/${nombre}.json`)).json(); } catch { /* sin subtítulos */ }
  return new Promise(resolver => {
    if (!document.getElementById('cine-estilo')) {
      const st = document.createElement('style'); st.id = 'cine-estilo'; st.textContent = ESTILO; document.head.append(st);
    }
    const capa = document.createElement('div'); capa.id = 'cine';
    const video = document.createElement('video');
    video.src = `assets/cine/${nombre}.mp4`; video.playsInline = true; video.preload = 'auto';
    let sinPermiso = false;                                 // el navegador no dejó sonar el video: va en silencio
    video.muted = !!sonido.silencio;
    const sub = document.createElement('div'); sub.className = 'sub'; sub.setAttribute('aria-live', 'polite');
    const saltar = document.createElement('button'); saltar.textContent = idioma.ingles ? 'Skip ▸' : 'Saltar ▸';
    capa.append(video, sub, saltar); document.body.append(capa);
    // La música del juego calla mientras suena el video. Al acabar vuelve lo que diga el silencio del jugador, que
    // pudo cambiar con la M durante el video (antes se restauraba el valor de antes y se desincronizaba).
    sonido.enCine = true;
    sonido.aplicarSilencio();
    const lineas = subs?.[idioma.ingles ? 'en' : 'es'] ?? [];
    let actual = -1, listo = false;
    const fin = vio => {
      if (listo) return; listo = true;
      document.removeEventListener('keydown', tecla, true);
      video.pause();
      sonido.enCine = false;
      sonido.aplicarSilencio();
      capa.classList.remove('ver');
      setTimeout(() => capa.remove(), 400);
      resolver(vio);
    };
    const tecla = e => { if (['Escape', 'Enter', ' '].includes(e.key)) { e.preventDefault(); e.stopPropagation(); fin(true); } };
    document.addEventListener('keydown', tecla, true);
    saltar.addEventListener('click', () => fin(true));
    video.addEventListener('timeupdate', () => {
      video.muted = sinPermiso || !!sonido.silencio;       // la M también calla (o devuelve) el sonido del video
      const t = video.currentTime;
      const i = lineas.findIndex(l => t >= l.desde && t < l.hasta);
      if (i === actual) return;
      actual = i;
      if (i < 0) sub.classList.remove('ver');
      else { sub.textContent = lineas[i].texto; sub.classList.add('ver'); }
    });
    video.addEventListener('ended', () => fin(true));
    video.addEventListener('error', () => fin(false));
    requestAnimationFrame(() => capa.classList.add('ver'));
    video.play().catch(() => { sinPermiso = true; video.muted = true; video.play().catch(() => fin(false)); });   // sin permiso de audio: en silencio
  });
}
