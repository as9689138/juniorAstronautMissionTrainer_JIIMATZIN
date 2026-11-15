// Carga por partes. Al arrancar solo se baja lo esencial (interfaz, datos, el Pasillo y la música del día);
// lo demás se pide cuando hace falta o se adelanta en segundo plano, y lo que ya no se usa se libera.
//
//   'nucleo'               interfaz, arte, datos, la sala inicial, la música del día y los efectos de botones
//   'personajes'           los tres retratos (selección y diálogos)
//   'efectos'              el resto de efectos y los sonidos reales de Marte
//   'zona:<id>'            fondo, frente y objetos de una sala (assets/zonas/zonas.json)
//   'minijuego:<escena>'   el arte de un minijuego y su fondo
//   'consola'              el fondo de la consola de mando
//   'recuerdo:<id>'        la ilustración de un recuerdo de la IA (flashback); se adelantan todos en segundo plano
//   'musica:<clave>'       un tema de música (se decodifica entero: pesa decenas de MB en memoria)
//
// Las descargas las hace la escena Cargador, que no se apaga nunca (si las hiciera otra escena, se cortarían al
// cerrarla). Una petición urgente (asegurar) pasa delante de las de segundo plano (precargar).
import { IMAGENES, AUDIO, DATOS, HOJAS } from './recursos.js';

const RETRATOS = ['retrato_wenceslao', 'retrato_judith', 'retrato_atlas'];
const ESENCIALES_AUDIO = ['musica_dia', 'ui_clic_boton', 'ui_carta_mejora', 'sfx_puerta_presurizada'];
const MINIJUEGOS = {
  PanelCleaningScene: ['mj_panel', 'mj_polvo_0', 'mj_polvo_1', 'mj_polvo_2', 'mj_polvo_3', 'mj_fondo_paneles'],
  CO2FilterScene: ['mj_carton', 'mj_cinta', 'mj_manguera', 'mj_ranura_carton', 'mj_ranura_cinta', 'mj_ranura_manguera',
    'mj_bandeja', 'mj_adaptador', 'mj_fondo_filtro'],
  GreenhouseScene: ['mj_veggie', 'mj_cojin_0', 'mj_cojin_1', 'mj_cojin_2', 'mj_tallo_0', 'mj_tallo_1', 'mj_tallo_2',
    'mj_flor_0', 'mj_flor_1', 'mj_flor_2', 'mj_moho', 'mj_fondo_invernadero'],
};
const RECUERDOS_IMG = Object.keys(IMAGENES).filter(k => k.startsWith('recuerdo_'));
const EN_GRUPOS = new Set([...RETRATOS, ...Object.values(MINIJUEGOS).flat(), 'mj_fondo_consola', ...RECUERDOS_IMG]);
export const ZONA_INICIAL = 'pasillo';

export const cargas = {
  juego: null,
  escena: null,          // escena Cargador
  hechos: new Set(),
  promesas: new Map(),   // grupo -> promesa en curso o hecha
  cola: [],              // [{ grupo, resolver }]
  cargando: false,

  // Archivos de un grupo: [tipo, clave, ruta, opciones]
  archivos(grupo) {
    const img = k => ['image', k, IMAGENES[k]];
    if (grupo === 'nucleo') {
      return [
        ...Object.keys(IMAGENES).filter(k => !EN_GRUPOS.has(k)).map(img),
        ...Object.entries(HOJAS).map(([k, [ruta, w, h]]) => ['spritesheet', k, ruta, { frameWidth: w, frameHeight: h }]),
        ...Object.entries(DATOS).map(([k, ruta]) => ['json', k, ruta]),
        ...ESENCIALES_AUDIO.filter(k => AUDIO[k]).map(k => ['audio', k, AUDIO[k]]),
      ];
    }
    if (grupo === 'personajes') return RETRATOS.map(img);
    if (grupo === 'consola') return [img('mj_fondo_consola')];
    if (grupo === 'efectos') {
      return Object.keys(AUDIO).filter(k => !k.startsWith('musica_') && !ESENCIALES_AUDIO.includes(k)).map(k => ['audio', k, AUDIO[k]]);
    }
    const [tipo, id] = grupo.split(':');
    if (tipo === 'minijuego') return (MINIJUEGOS[id] ?? []).map(img);
    if (tipo === 'recuerdo') return IMAGENES[`recuerdo_${id}`] ? [img(`recuerdo_${id}`)] : [];
    if (tipo === 'musica') return AUDIO[id] ? [['audio', id, AUDIO[id]]] : [];
    if (tipo === 'zona') {
      const z = this.juego?.cache.json.get('zonas')?.zonas?.[id];
      if (!z) return [];
      return [['image', `zona_${id}_fondo`, z.fondo], ['image', `zona_${id}_frente`, z.frente],
        ...z.props.flatMap(p => [['image', p.clave, p.archivo],
          ...(p.anim ? [['spritesheet', p.animClave, p.anim, { frameWidth: p.fw, frameHeight: p.fh }]] : [])])];
    }
    return [];
  },

  existe([tipo, clave]) {
    const j = this.juego;
    if (tipo === 'audio') return j.cache.audio.exists(clave);
    if (tipo === 'json') return j.cache.json.exists(clave);
    return j.textures.exists(clave);
  },

  falta(grupo) { return this.archivos(grupo).filter(a => !this.existe(a)); },

  // Añade los archivos a un cargador (lo usan Arranque, con su barra de progreso, y el Cargador)
  encolar(load, lista) {
    for (const [tipo, clave, ruta, op] of lista) {
      if (tipo === 'spritesheet') load.spritesheet(clave, ruta, op);
      else load[tipo](clave, ruta);
    }
  },

  // Arranca un cargador o, si ya está cargando (start() no haría nada), le pide que tome ya los archivos nuevos
  // en vez de esperar al siguiente cuadro
  arrancar(load) {
    if (load.isLoading()) load.checkLoadQueue();
    else load.start();
  },

  marcar(grupo) { this.hechos.add(grupo); if (!this.promesas.has(grupo)) this.promesas.set(grupo, Promise.resolve()); },

  // Que el grupo esté cargado (urgente: pasa delante). Devuelve una promesa.
  asegurar(grupo, urgente = true) {
    if (this.hechos.has(grupo) && !this.falta(grupo).length) return Promise.resolve();
    const enCurso = this.promesas.get(grupo);
    if (enCurso && !this.hechos.has(grupo)) {
      if (urgente) {                               // si estaba en la cola de segundo plano, pasa delante
        const i = this.cola.findIndex(t => t.grupo === grupo);
        if (i > 0) this.cola.unshift(...this.cola.splice(i, 1));
      }
      return enCurso;
    }
    this.hechos.delete(grupo);
    const p = new Promise(resolver => (urgente ? this.cola.unshift({ grupo, resolver }) : this.cola.push({ grupo, resolver })));
    this.promesas.set(grupo, p);
    this.siguiente();
    return p;
  },

  // Adelantar en segundo plano, en orden
  precargar(grupos) { for (const g of grupos) this.asegurar(g, false); },

  siguiente() {
    if (this.cargando || !this.escena || !this.cola.length) return;
    const { grupo, resolver } = this.cola.shift();
    const lista = this.falta(grupo);
    const fin = () => { this.cargando = false; this.hechos.add(grupo); resolver(); this.siguiente(); };
    if (!lista.length) { fin(); return; }
    this.cargando = true;
    const load = this.escena.load;
    this.encolar(load, lista);
    load.once('complete', fin);
    this.arrancar(load);
  },

  // Libera texturas, animaciones y sonidos de un grupo (salas que quedan lejos, minijuegos ya jugados, música)
  liberar(grupo) {
    if (!this.hechos.has(grupo) || this.cargando) return;
    const j = this.juego;
    for (const [tipo, clave] of this.archivos(grupo)) {
      if (tipo === 'audio') { j.sound.removeByKey(clave); j.cache.audio.remove(clave); }
      else if (j.textures.exists(clave)) {
        if (j.anims.exists(clave)) j.anims.remove(clave);
        j.textures.remove(clave);
      }
    }
    this.hechos.delete(grupo);
    this.promesas.delete(grupo);
  },

  zonaDeEstacion(nombre) {
    const zonas = this.juego?.cache.json.get('zonas')?.zonas ?? {};
    return Object.values(zonas).find(z => z.estaciones.some(e => e.nombre === nombre))?.id ?? null;
  },
};

// Escena invisible que hace las descargas en segundo plano. Se lanza al terminar Arranque y no se apaga.
export class Cargador extends Phaser.Scene {
  constructor() { super('Cargador'); }

  create() {
    cargas.escena = this;
    this.load.on('loaderror', f => console.warn(`[recursos] No se pudo cargar "${f.key}" (${f.src}). El juego sigue sin él.`));
    cargas.siguiente();
  }
}
