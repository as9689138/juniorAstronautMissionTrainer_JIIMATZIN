// Narrador: corre historia/historia.json (Ink, del rol 5) con inkjs (lib/ink.js) y le pone a cada línea
// su voz (assets/audio/voces/audios.json), su retrato y su expresión. Lo usa la escena Dialogo.
// Etiquetas de Ink que entiende: hab, cara, musica, sfx, dato, costo, efecto, instruccion, titulo, carta, habilidades.
// Las líneas que son un recuerdo de la IA (src/mecanicas/recuerdos.js) salen marcadas para el flashback.
import { recuerdoDeLinea, textoDeRecuerdo, SALTO_VOZ } from './recuerdos.js';
import { idioma } from '../motor/idioma.js';

export const PERSONAS = {
  ia: { nombre: 'P.I.E.D.R.A', ink: 'IA', color: 0x5ec8f2, retrato: null },   // su dibujo es el sprite robot_ia (con caras)
  wen: { nombre: 'Wenceslao', color: 0xf07a3a, retrato: 'retrato_wenceslao' },
  jud: { nombre: 'Judith', color: 0x7cf0a0, retrato: 'retrato_judith' },
  atl: { nombre: 'Atlas', color: 0xffc83d, retrato: 'retrato_atlas' },
};
export const ROL_DE = { wenceslao: 'wen', judith: 'jud', atlas: 'atl' };
export const NOMBRE_DE = { wenceslao: 'Wenceslao', judith: 'Judith', atlas: 'Atlas' };

// Para encontrar la voz de una línea: sin acentos ni signos, como pide 2_voz_dialogos/LEEME.md
const normalizar = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ').trim();

export class Narrador {
  constructor(juego) {
    const json = juego.cache.json.get('historia');
    this.story = json && window.inkjs ? new window.inkjs.Story(json) : null;
    if (!this.story) console.warn('[historia] Falta historia/historia.json o lib/ink.js: los diálogos no saldrán.');
    this.voces = new Map();
    // En audios.json los saludos traen las constantes de Ink ({WEN}, {JUD}, {ATL}): se cambian por los nombres
    const NOMBRES_INK = { '{WEN}': 'Wenceslao', '{JUD}': 'Judith', '{ATL}': 'Atlas', '{IA}': 'IA' };
    for (const [id, v] of Object.entries(juego.cache.json.get('voces') ?? {})) {
      const texto = v.texto.replace(/\{(WEN|JUD|ATL|IA)\}/g, m => NOMBRES_INK[m]).replaceAll('{jugador}', 'jugadorx');
      this.voces.set(normalizar(texto), [id, `assets/audio/voces/${v.ruta}`, v.escena]);
    }
    this.jugador = 'Astronauta';
    idioma.prepararHistoria(juego.cache.json.get('lineas_en'));
    this.vocesEn = new Set(juego.cache.json.get('voces_en') ?? []);   // ids grabados en inglés (assets/audio/voces/en/)
  }

  // Variables que escribe el juego: jugador, rol, energia, oxigeno, blindaje, sol
  variables(valores) {
    if (!this.story) return;
    for (const [k, v] of Object.entries(valores)) {
      try { this.story.variablesState[k] = v; } catch (e) { console.warn('[historia] variable', k, e.message); }
    }
    if (valores.jugador) this.jugador = valores.jugador;
  }

  empezar(nudo) {
    if (!this.story) return false;
    try { this.story.ChoosePathString(nudo); return true; } catch (e) { console.warn('[historia] no existe el nudo', nudo); return false; }
  }

  // Siguiente paso del nudo: una línea, unas opciones o null al terminar
  paso() {
    const s = this.story;
    if (!s) return null;
    while (s.canContinue) {
      const texto = s.Continue().trim();
      const tags = this.leerTags(s.currentTags ?? []);
      if (!texto) { if (Object.keys(tags).length) return { tipo: 'tags', tags }; continue; }
      return this.linea(texto, tags);
    }
    if (s.currentChoices.length) {
      return { tipo: 'opciones', opciones: s.currentChoices.map(c => (idioma.ingles ? idioma.lineaHistoria(c.text, this.jugador) ?? c.text : c.text)) };
    }
    return null;
  }

  elegir(i) { this.story?.ChooseChoiceIndex(i); }

  leerTags(lista) {
    const t = {};
    for (const crudo of lista) {
      const tag = crudo.trim();
      const i = tag.indexOf(':');
      if (i < 0) t[tag] = true;
      else (t[tag.slice(0, i)] ??= []).push(tag.slice(i + 1).trim());
    }
    return t;
  }

  linea(texto, tags) {
    const quien = tags.hab?.[0] ?? null;
    let dicho = texto;
    if (quien && PERSONAS[quien]) {                       // "Wenceslao: Si algo se rompe..." -> quita el nombre
      for (const n of [PERSONAS[quien].nombre, PERSONAS[quien].ink].filter(Boolean)) {
        if (dicho.startsWith(`${n}:`)) { dicho = dicho.slice(n.length + 1).trim(); break; }
      }
    }
    // La voz: primero tal cual; si no, con el nombre del jugador como {jugador}. (Al revés, "Yo soy Wenceslao" y
    // "¡Hola, Ingeniero Wenceslao!" se quedaban sin voz cuando el jugador era Wenceslao.)
    const tal = normalizar(dicho);
    const voz = this.voces.get(tal)
      ?? (this.jugador ? this.voces.get(normalizar(dicho.replaceAll(this.jugador, 'jugadorx'))) : null) ?? null;
    // ¿Es un recuerdo de la IA (flashback)? Se muestra sin "Dato curioso:" y su voz salta esa parte
    const rec = recuerdoDeLinea(tal);
    let vozDesde = rec && voz ? SALTO_VOZ[voz[0]] ?? 0 : 0;
    // En inglés: el texto de la traducción y su voz grabada en inglés si la hay (Wenceslao, Judith y Atlas); si no,
    // P.I.E.D.R.A con su índice de inglés o la voz del navegador
    let vozFinal = voz, traducido = false;
    if (idioma.ingles) {
      const en = idioma.lineaHistoria(dicho, this.jugador);
      if (en) { dicho = en; traducido = true; }
      vozFinal = voz && this.vocesEn.has(voz[0]) ? [`${voz[0]}_en`, `assets/audio/voces/en/${voz[0]}.mp3`] : null;
      vozDesde = 0;
    }
    if (rec) dicho = textoDeRecuerdo(dicho);
    return { tipo: 'linea', quien, texto: dicho, cara: tags.cara?.[0] ?? null, voz: vozFinal, vozDesde, recuerdo: rec, traducido, tags };
  }

  // Lee un nudo entero sin mostrarlo (para las cartas de personaje: título, habilidades y texto)
  leerEntero(nudo) {
    if (!this.empezar(nudo)) return null;
    const res = { lineas: [], tags: {} };
    for (let p = this.paso(); p && p.tipo !== 'opciones'; p = this.paso()) {
      for (const [k, v] of Object.entries(p.tags ?? {})) res.tags[k] = v;
      if (p.tipo === 'linea') res.lineas.push(p.texto);
    }
    return res;
  }
}
