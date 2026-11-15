// Idioma del juego: español (el original) o inglés. Se elige en la portada y se guarda en este navegador.
//
// Cómo se traduce (así no hay que tocar los ~430 textos uno por uno, ni los del rol 2):
//  - Todo texto de Phaser pasa por traducir() al dibujarse (ver activarTraduccion): si el texto en español está en el
//    diccionario (src/textos/en.js), sale en inglés. Las frases con números o nombres se traducen con plantillas:
//    "⏳ Tiempo: {n} s" → "⏳ Time: {n} s"; lo que va dentro de {…} se traduce a su vez si está en el diccionario.
//  - La historia de Ink: las 213 líneas con voz usan la traducción del rol 5 (assets/audio/voces/lineas_es_en.json);
//    las que no tienen voz (prólogo, narración, cartas, opciones, instrucciones) están en src/textos/historia_en.js.
//  - Lo que se escribe letra por letra (el diálogo y la burbuja del robot) se traduce entero antes de escribirse; esos
//    objetos llevan sinTraducir = true.
// Lo que falte por traducir se apunta en idioma.faltan (en la consola: __idioma.faltan) para revisarlo.
import EN from '../textos/en.js';
import { HISTORIA_EN } from '../textos/historia_en.js';

const CLAVE = 'idioma';
export const normalizar = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const escaparRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Frases exactas: el diccionario y las líneas de la historia sin voz (títulos y habilidades de las cartas también
// se dibujan como texto suelto)
const EXACTO = { ...Object.fromEntries(HISTORIA_EN), ...EN };
// ¿Parece español? (para no apuntar como "sin traducir" lo que ya está en inglés)
const PARECE_ESPANOL = /[áéíóúñ¿¡]|\b(de|del|la|las|el|los|que|en|y|para|con|por|una|uno|hay|tu|sin)\b/i;
// Plantillas del diccionario: las claves con {…}
const PLANTILLAS = Object.entries(EN).filter(([es]) => /\{\w+\}/.test(es)).map(([es, en]) => {
  const nombres = [...es.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
  const patron = '^' + es.split(/\{\w+\}/).map(escaparRegex).join('([\\s\\S]+?)') + '$';
  return { re: new RegExp(patron), nombres, en };
}).sort((a, b) => b.re.source.length - a.re.source.length);      // las más largas (más específicas) primero

export const idioma = {
  actual: 'es',
  faltan: new Set(),
  memo: new Map(),
  historia: null,           // índice normalizado: español -> inglés (Ink)

  iniciar() {
    try { this.actual = localStorage.getItem(CLAVE) === 'en' ? 'en' : 'es'; } catch { /* sin almacenamiento */ }
    document.documentElement.lang = this.actual;
    if (this.ingles) document.title = 'Mission P.I.E.D.R.A';
  },

  elegir(codigo) {
    this.actual = codigo === 'en' ? 'en' : 'es';
    this.memo.clear();
    document.documentElement.lang = this.actual;
    document.title = this.ingles ? 'Mission P.I.E.D.R.A' : 'Misión P.I.E.D.R.A';
    try { localStorage.setItem(CLAVE, this.actual); } catch { /* sin almacenamiento */ }
  },

  get ingles() { return this.actual === 'en'; },
  get locale() { return this.ingles ? 'en-US' : 'es-MX'; },

  // Traduce un texto ya armado (en español). Si no hay traducción, lo devuelve igual.
  traducir(texto, profundidad = 0) {
    if (!this.ingles || typeof texto !== 'string' || !/[A-Za-zÁÉÍÓÚÑáéíóúñ]{2}/.test(texto)) return texto;
    const exacto = EXACTO[texto];
    if (exacto !== undefined) return exacto;
    if (this.memo.has(texto)) return this.memo.get(texto);
    let r = null;
    if (texto.includes('\n')) {                                  // varias líneas: cada una por separado
      const partes = texto.split('\n');
      if (partes.length > 1) r = partes.map(p => this.traducir(p, profundidad + 1)).join('\n');
    }
    if (r === null || r === texto) {
      for (const p of PLANTILLAS) {
        const m = p.re.exec(texto);
        if (!m) continue;
        r = p.en.replace(/\{(\w+)\}/g, (_, n) => {
          const v = m[p.nombres.indexOf(n) + 1] ?? '';
          return profundidad < 3 ? this.traducir(v, profundidad + 1) : v;
        });
        break;
      }
    }
    if (r === null) {
      r = texto;
      if (profundidad === 0 && PARECE_ESPANOL.test(texto) && !this.faltan.has(texto)) { this.faltan.add(texto); console.debug('[idioma] sin traducir:', texto); }
    }
    if (this.memo.size > 3000) this.memo.clear();
    this.memo.set(texto, r);
    return r;
  },

  // t(): para el código propio. Con variables: t('Sol {n} de 10', { n: 3 }) (la plantilla debe estar en el diccionario)
  t(es, vars = null) {
    const base = this.ingles ? (EXACTO[es] ?? (this.faltan.add(es), es)) : es;
    return vars ? base.replace(/\{(\w+)\}/g, (_, n) => (vars[n] !== undefined ? this.traducir(String(vars[n]), 1) : `{${n}}`)) : base;
  },

  // --- La historia (Ink) ---
  prepararHistoria(lineasEn) {
    const NOMBRES = { '{WEN}': 'Wenceslao', '{JUD}': 'Judith', '{ATL}': 'Atlas', '{IA}': 'IA' };
    const conNombres = s => s.replace(/\{(WEN|JUD|ATL|IA)\}/g, m => NOMBRES[m]);
    this.historia = new Map();
    for (const x of lineasEn ?? []) {
      if (x.texto_es && x.texto_en) this.historia.set(normalizar(conNombres(x.texto_es).replaceAll('{jugador}', 'jugadorx')), conNombres(x.texto_en));
    }
    for (const [es, en] of HISTORIA_EN) this.historia.set(normalizar(es), en);
  },

  // Una línea de la historia en inglés (o null si no hay). jugador: el nombre del personaje elegido.
  lineaHistoria(texto, jugador = '') {
    if (!this.historia) return null;
    const en = this.historia.get(normalizar(texto))
      ?? (jugador ? this.historia.get(normalizar(texto.replaceAll(jugador, 'jugadorx'))) : null);
    if (en == null) { this.faltan.add(texto); return null; }
    return en.replaceAll('{jugador}', jugador || 'Astronaut');
  },
};

export const t = (es, vars) => idioma.t(es, vars);

// Todo texto de Phaser se traduce al dibujarse (salvo los que llevan sinTraducir)
export function activarTraduccion() {
  const proto = Phaser.GameObjects.Text.prototype;
  if (proto.setTextOriginal) return;
  proto.setTextOriginal = proto.setText;
  proto.setText = function (valor) {
    if (idioma.ingles && !this.sinTraducir && typeof valor === 'string') valor = idioma.traducir(valor);
    return this.setTextOriginal(valor);
  };
}
