// Consola · MEJORA: elegir una carta de mejora al terminar el sol (después de dormir en el Refugio).
// Con el kit de misiones (src/minijuegos/mision.js): sin área de juego, todo es interfaz y se adapta a la pantalla.
// Las cartas son hojas de papel con sello rojo y una tecla ámbar para equiparlas.
import { Mision } from '../minijuegos/mision.js';
import { GameState } from './estado.js';
import { CARTAS_MEJORA } from './datos.js';
import { sonido } from '../motor/sonido.js';
import { idioma } from '../motor/idioma.js';

const TINTA_TXT = '#141026', SELLO_TXT = '#b8473d';

export function crearMejora(escena) {
  const disponibles = CARTAS_MEJORA.filter(c => !GameState.mejoras[c.id]);
  if (!disponibles.length) { escena.time.delayedCall(10, () => escena.terminar()); return null; }
  sonido.efecto('ui_carta_voltea', 0.8);
  const opciones = Phaser.Utils.Array.Shuffle([...disponibles]).slice(0, 2);   // se eligen una sola vez
  let elegida = false;

  const elegir = carta => {
    if (elegida) return;
    elegida = true;
    GameState.mejoras[carta.id] = true;
    sonido.efecto('ui_carta_mejora', 0.8);
    escena.terminar(carta.id);
  };

  const mision = new Mision(escena, {
    titulo: 'Recuerdo desbloqueado',
    etiqueta: idioma.t('SOL {n} / 10 · NOCHE', { n: Math.min(GameState.sol, 10) }),
    instruccion: 'P.I.E.D.R.A desbloqueó un recuerdo histórico. Elige una carta de mejora.',
    fondo: 'consola',
    area: null,
    alColocar: (libre, k) => {
      const sep = 16 * k, pad = 18 * k;
      const lado = opciones.length > 1 && libre.w >= 2 * 260 * k + sep;     // lado a lado si caben
      const ancho = lado ? Math.min(380 * k, (libre.w - sep) / 2) : Math.min(520 * k, libre.w);
      const altoMax = lado ? libre.h : (libre.h - sep * (opciones.length - 1)) / opciones.length;
      opciones.forEach((carta, i) => {
        const c = mision.contenedor();
        const nombre = mision.texto(pad, pad, carta.nombre, { fontSize: `${Math.max(17, Math.round(20 * k))}px`, fontStyle: 'bold',
          color: TINTA_TXT, wordWrap: { width: ancho - 2 * pad, useAdvancedWrap: true } });
        const rama = mision.texto(pad, nombre.y + nombre.height + 4 * k, idioma.t('Área: {x}', { x: carta.rama }), {
          fontSize: `${Math.max(16, Math.round(15 * k))}px`, fontStyle: 'bold', color: SELLO_TXT });
        const desc = mision.texto(pad, rama.y + rama.height + 8 * k, carta.desc, { fontSize: `${Math.max(16, Math.round(16 * k))}px`,
          color: TINTA_TXT, lineSpacing: 2, wordWrap: { width: ancho - 2 * pad, useAdvancedWrap: true } });
        const tecla = mision.tecla(k, { texto: 'EQUIPAR CARTA', estado: 'accion', alPulsar: () => elegir(carta) });
        const alto = Math.min(altoMax, Math.max(desc.y + desc.height + 12 * k + tecla.h + pad, 160 * k));
        const x = lado ? libre.x + (libre.w - (2 * ancho + sep)) / 2 + i * (ancho + sep) : libre.x + (libre.w - ancho) / 2;
        const totalAlto = lado ? alto : alto * opciones.length + sep * (opciones.length - 1);
        const y = libre.y + Math.max(0, (libre.h - totalAlto) / 2) + (lado ? 0 : i * (alto + sep));
        c.setPosition(x, y);
        c.add([mision.pieza('ui_papel', 0, 0, ancho, alto, 30, k), nombre, rama, desc]);
        tecla.c.setPosition(x + ancho / 2, y + alto - pad - tecla.h / 2 + 6 * k).setDepth(11);
      });
    },
  });
  return mision;
}
