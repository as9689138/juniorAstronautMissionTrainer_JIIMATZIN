// La IA de la base: un robot que flota detrás del jugador, habla en burbujas cortas
// y cada mañana pronostica el clima espacial con su modelo (src/ml/pronostico.js).
// Su "cerebro" es la IA guía (src/compania/guia.js): ahí están el pronóstico y la medición del aprendizaje; el robot
// es su cara en el mapa (pistas más claras en lo flojo y una felicitación al subir de nivel).
//
// No toca Base.js: se engancha a la escena Base cuando se crea (ver conectarCompania).
// Los diálogos largos siguen saliendo de Ink (hab:ia); aquí solo van frases cortas del mapa.
// Decisiones de diseño: docs/aprendizaje.md (pronóstico con dibujos, frases de una línea,
// archivos de memoria bloqueados, humor) y docs/accesibilidad.md (letra de 16 px en pantalla).
import { bus, EV, control } from '../motor/eventos.js';
import { guia } from './guia.js';
import { RECUERDOS } from '../mecanicas/recuerdos.js';
import { sonido } from '../motor/sonido.js';
import { idioma } from '../motor/idioma.js';

const CARAS = { neutral: 0, feliz: 1, procesando: 2 };
const COLOR_CARA = { neutral: 0x5ec8f2, feliz: 0x7cf0a0, procesando: 0xffc83d, alarma: 0xff5a4e };
const ESCALA = 0.5;                       // el dibujo está al doble de resolución
const FUENTE = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const LETRA_PANTALLA = 16;                // px mínimos EN PANTALLA, sea cual sea el zoom
const TINTA = 0x141026;

// Pistas cortas al acercarse a cada estación (una vez cada cierto tiempo)
const PISTAS = {
  consola: 'Aquí repartimos la energía del día. ¡No alcanza para todo!',
  tarea_paneles: 'Paneles limpios, más batería. En Marte llega menos de la mitad de luz.',
  tarea_filtro: 'Este filtro quita el CO₂. El aire de Marte es casi todo CO₂.',
  tarea_invernadero: 'Las plantas nos dan oxígeno. Solo las gotas que necesitan.',
  refugio: 'El agua de estas paredes nos protege de la radiación.',
  antena: 'Por aquí llegan los datos reales del Sol que uso para pronosticar.',
};

// Archivos de memoria del robot: los recuerdos (flashbacks) de la historia. Se abren jugando.
// La lista está en src/mecanicas/recuerdos.js; el id es el de la etiqueta dato:<id> de Ink.
export const MEMORIAS = RECUERDOS;
// Al usar el minijuego de una estación se abre su recuerdo (al cerrar la pantalla)
const MEMORIA_DE_ESTACION = { tarea_paneles: 'viento_limpia', tarea_filtro: 'apolo13', tarea_invernadero: 'veggie_zinnias' };
const CLAVE_GUARDADO = 'mision-marte.memorias.v1';

// Humor: frases cortas cuando lleva rato callado (nunca en emergencias)
const CHISTES = [
  'Intenté contar las estrellas… me quedé sin memoria en la cuatro millones.',
  'Un día en Marte dura 24 h y 39 min. ¡39 minutos extra para jugar!',
  'Si ves girar mis puntitos no estoy mareado: estoy pensando.',
  'Se me aflojó un tornillo de tanto reír. ¿Me prestas cinta adhesiva?',
  '¿Mi música favorita? ¡El heavy metal, claro! Bip-bup.',
];
const PAUSA_CHISTE = 80000;               // ms sin hablar antes de un chiste

// "12 de noviembre" o "November 12", según el idioma
const fechaCorta = iso => new Date(`${iso}T12:00:00Z`).toLocaleDateString(idioma.locale, { day: 'numeric', month: 'long', timeZone: 'UTC' });

export default class Robot {
  constructor(escena) {
    this.e = escena;
    this.pj = escena.pj;
    const { x, y } = this.pj;
    const s = this.s = escena.escalaPj ?? 1;      // salas a escala real: el robot va al doble, como el astronauta

    this.sombra = escena.add.ellipse(x, y + 20 * s, 16 * s, 5 * s, 0x000000, 0.3).setDepth(4);
    this.halo = escena.add.circle(x, y, 7 * s, COLOR_CARA.neutral, 0.35).setDepth(5);
    this.cuerpo = escena.add.sprite(x - 20 * s, y - 10 * s, 'robot_ia', CARAS.neutral).setScale(ESCALA * s).setDepth(6);
    this.puntos = [0, 1, 2].map(() => escena.add.circle(x, y, 1.6 * s, COLOR_CARA.procesando).setDepth(7).setVisible(false));
    this.burbuja = this.crearBurbuja();

    this.caraActual = 'neutral';
    this.alarma = false;
    this.ultimaPista = {};
    this.faseAnterior = null;
    this.solPronosticado = null;
    this.pronostico = null;
    this.ultimaHabla = 0;
    this.memoriaPendiente = null;
    this.colaBurbujas = [];                          // lo que espera turno para decirse (una burbuja a la vez)
    this.abiertas = this.cargarMemorias();

    // Pronóstico: datos guardados ya cargados por Arranque; luego intenta los de hoy en vivo
    const cache = escena.cache.json;
    this.ml = guia.pronostico(cache);               // un solo modelo para toda la partida (no uno por sala)
    if (!this.ml) console.warn('[robot] Falta data/modelo_pronostico.json: la IA no pronostica.');

    // Bus
    const alCerca = c => this.alAcercarse(c);
    const alEstado = e => this.alCambiarEstado(e);
    const alInteractuar = d => { this.ocultarBurbuja(); this.memoriaPendiente = MEMORIA_DE_ESTACION[d?.nombre] ?? null; };
    const alCerrar = () => {
      const id = this.memoriaPendiente;
      this.memoriaPendiente = null;
      if (id) this.e.time.delayedCall(500, () => this.desbloquearMemoria(id));
    };
    const alDato = id => this.desbloquearMemoria(typeof id === 'string' ? id : id?.id);
    // Subió de nivel en un tema (la IA guía lo mide): ¡a felicitar!
    const alAprender = a => { if (a?.subio) this.decir(`¡Subiste en ${a.nombre}: ${a.nivel.texto} ${'★'.repeat(a.nivel.estrellas)}`, { cara: 'feliz', duracion: 4200 }); };
    bus.on(EV.CERCA_DE, alCerca);
    bus.on(EV.ESTADO_CAMBIO, alEstado);
    bus.on(EV.INTERACTUAR, alInteractuar);
    bus.on(EV.CERRAR_PANEL, alCerrar);
    bus.on(EV.DATO, alDato);
    bus.on(EV.APRENDIZAJE, alAprender);

    // Linterna: el robot ilumina a su alrededor (src/motor/luces.js)
    this.quitarLinterna = escena.luces?.agregarFuente(() => this.px == null ? null : { x: this.px, y: this.py + 6, radio: 46, alfa: 0.55 });

    const tecla = escena.input.keyboard.addKey('Q');     // Q: preguntarle a la IA
    tecla.on('down', () => !control.bloqueado && this.contarPronostico(true));

    const alActualizar = (t, dt) => this.update(t, dt);
    escena.events.on('update', alActualizar);
    this.vivo = true;
    escena.events.once('shutdown', () => {
      this.vivo = false;                                  // la sala cambió: este robot ya no existe
      bus.off(EV.CERCA_DE, alCerca); bus.off(EV.ESTADO_CAMBIO, alEstado); bus.off(EV.INTERACTUAR, alInteractuar);
      bus.off(EV.CERRAR_PANEL, alCerrar); bus.off(EV.DATO, alDato); bus.off(EV.APRENDIZAJE, alAprender);
      escena.events.off('update', alActualizar);
      this.quitarLinterna?.();
      tecla.removeAllListeners();
    });

    // Al empezar: saludo y, si el rol 2 aún no publica estado, el pronóstico del Sol 1
    // El saludo y el primer pronóstico solo una vez por partida (el robot se crea de nuevo en cada sala)
    if (escena.registry.get('robotSaludo')) return;
    escena.registry.set('robotSaludo', true);
    escena.time.delayedCall(1200, async () => {
      if (!this.vivo) return;
      const tactil = escena.sys.game.device.input.touch && !escena.sys.game.device.os.desktop;
      this.decir(`¡Bip-bup! Soy la IA de la base. Te sigo a todas partes.${tactil ? '' : ' Pulsa Q si me necesitas.'}`, { cara: 'feliz', duracion: 4200 });
      if (this.ml) await this.ml.actualizarEnVivo();
      const estado = escena.registry.get('estado');
      if (!estado && this.vivo) escena.time.delayedCall(4600, () => this.vivo && this.pronosticar(1, 10));
    });
  }

  // ---------- Dibujo de la burbuja ----------
  crearBurbuja() {
    const e = this.e;
    const texto = e.add.text(0, 0, '', {
      fontFamily: FUENTE, fontSize: '7px', color: '#1a1110', align: 'center',
      wordWrap: { width: 120 }, resolution: 4, lineSpacing: 1,
    }).setOrigin(0.5, 0);
    texto.sinTraducir = true;                    // se escribe letra por letra: decir() la traduce entera
    const fondo = e.add.graphics();
    const iconos = e.add.graphics();
    const cont = e.add.container(0, 0, [fondo, texto, iconos]).setDepth(30).setVisible(false);
    return { cont, fondo, texto, iconos, soles: null };
  }

  dibujarBurbuja() {
    const b = this.burbuja, { fondo, texto, iconos } = b;
    const tam = parseFloat(texto.style.fontSize) || 7;
    const pad = tam * 0.8;
    const conSoles = b.soles != null;
    const porFila = this.e.scale.width < 480 ? 5 : 10;      // en el teléfono: 2 filas de 5
    const filas = conSoles ? 10 / porFila : 0;
    const filaH = tam * 2.6 * filas, paso = tam * 2.05;
    const w = Math.max(40, b.anchoTexto + pad * 2, conSoles ? paso * porFila + pad * 2 : 0);
    const h = b.altoTexto + pad * 1.2 + filaH;
    const borde = this.alarma ? 0xff5a4e : TINTA;
    fondo.clear();
    fondo.fillStyle(0xf3e3c3, 0.97).fillRoundedRect(-w / 2, -h / 2, w, h, 4);
    fondo.lineStyle(1, borde, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 4);
    // La colita apunta al robot aunque la burbuja se haya corrido para no salirse de la pantalla
    const cola = Phaser.Math.Clamp(b.colaX ?? 0, -w / 2 + 8, w / 2 - 8);
    fondo.fillStyle(0xf3e3c3, 0.97).fillTriangle(cola - 3, h / 2 - 0.5, cola + 3, h / 2 - 0.5, cola, h / 2 + 4);
    fondo.lineStyle(1, borde, 1).lineBetween(cola - 3, h / 2, cola, h / 2 + 4).lineBetween(cola + 3, h / 2, cola, h / 2 + 4);
    b.ancho = w;
    // El texto arriba; debajo, la fila de 10 soles
    texto.setY(-h / 2 + pad * 0.6);
    iconos.clear();
    if (conSoles) {
      const y0 = h / 2 - pad * 0.6 - filaH + tam * 1.3;
      for (let i = 0; i < 10; i++) {
        const col = i % porFila, fila = Math.floor(i / porFila);
        this.dibujarSol(iconos, (col - (porFila - 1) / 2) * paso, y0 + fila * tam * 2.6, tam, i < b.soles);
      }
    }
    b.alto = h;
  }

  // Un sol tranquilo (redondo, rayos cortos) o con llamarada (naranja, rayos largos en pico).
  // Se distinguen por la FORMA, no solo por el color (docs/accesibilidad.md).
  dibujarSol(g, x, y, tam, llamarada) {
    const r = tam * (llamarada ? 0.42 : 0.45), rayos = 8;
    if (llamarada) {
      // Estrella de 8 puntas (llamarada) con contorno de tinta
      const pts = [];
      for (let k = 0; k < rayos * 2; k++) {
        const a = (k / (rayos * 2)) * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? r * 1.05 : r * 2.0;
        pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
      }
      g.fillStyle(0xffb13d, 1).fillPoints(pts, true);
      g.lineStyle(Math.max(0.5, tam * 0.06), TINTA, 1).strokePoints(pts, true, true);
      g.fillStyle(0xff6a3d, 1).fillCircle(x, y, r);
    } else {
      g.lineStyle(Math.max(0.5, tam * 0.07), 0xd9a441, 1);
      for (let k = 0; k < rayos; k++) {
        const a = (k / rayos) * Math.PI * 2;
        g.lineBetween(x + Math.cos(a) * r * 1.2, y + Math.sin(a) * r * 1.2, x + Math.cos(a) * r * 1.5, y + Math.sin(a) * r * 1.5);
      }
      g.fillStyle(0xffe08a, 1).fillCircle(x, y, r);
    }
    g.lineStyle(Math.max(0.5, tam * 0.06), TINTA, 1).strokeCircle(x, y, r);
  }

  // ---------- API (la pueden usar otros roles) ----------
  /** Cambia la cara: 'neutral' | 'feliz' | 'procesando' (las mismas que cara: en Ink) */
  cara(nombre) {
    if (!(nombre in CARAS)) return;
    this.caraActual = nombre;
    this.cuerpo.setFrame(CARAS[nombre]);
    this.puntos.forEach(p => p.setVisible(nombre === 'procesando'));
  }

  /** Burbuja corta sobre el robot.
   *  opciones: { cara, duracion (ms), soles (0-10: fila de soles con llamarada),
   *              importante (pasa delante en la fila), relleno (pistas y chistes: si ya habla, se descarta) } */
  decir(texto, opciones = {}) {
    const { cara = 'neutral', duracion, soles = null, importante = false, relleno = false } = opciones;
    if (!this.vivo) return;
    if (!opciones.traducido) { texto = idioma.traducir(texto); opciones = { ...opciones, traducido: true }; }
    // con un diálogo, la consola o un minijuego abiertos, espera a que se cierren (no encimar burbujas)
    if (control.modal) {
      if (relleno) return;
      this.e.time.delayedCall(1200, () => this.decir(texto, opciones));
      return;
    }
    const b = this.burbuja;
    // Si ya hay una burbuja que todavía no se ha podido leer, esta espera su turno (no se pisan)
    if (b.cont.visible && this.e.time.now < (b.leidaEn ?? 0)) {
      if (relleno) return;
      if (!this.colaBurbujas.some(x => x.texto === texto)) {
        if (importante) this.colaBurbujas.unshift({ texto, opciones }); else this.colaBurbujas.push({ texto, opciones });
        this.colaBurbujas.length = Math.min(this.colaBurbujas.length, 4);
      }
      return;
    }
    this.cara(cara);
    this.ultimaHabla = this.e.time.now;
    sonido.pitido(2, 0.03);
    b.soles = soles;
    b.letras = 0;
    b.cont.setVisible(true).setAlpha(1);
    this.e.tweens.killTweensOf(b.cont);
    b.escribiendo?.remove();
    // Tamaño de letra según el zoom de la cámara: en pantalla mide siempre 16 px o más
    const zoom = this.e.cameras.main.zoom || 1;
    const tam = LETRA_PANTALLA / zoom;
    b.texto.setFontSize(tam).setWordWrapWidth(tam * 17).setLineSpacing(tam * 0.15);
    b.texto.setText(texto);                     // medir el tamaño final (la burbuja no "salta")
    b.altoTexto = b.texto.height;
    b.anchoTexto = b.texto.width;
    this.dibujarBurbuja();
    b.texto.setText('');
    b.escribiendo = this.e.time.addEvent({     // aparece letra por letra
      delay: 22, repeat: texto.length - 1,
      callback: () => { b.texto.setText(texto.slice(0, ++b.letras)); this.dibujarBurbuja(); },
    });
    b.ocultar?.remove();
    const dura = duracion ?? Math.max(3000, texto.length * 60);
    b.leidaEn = this.e.time.now + Math.min(dura, 900 + texto.length * 45);   // antes de esto no se pisa
    b.ocultar = this.e.time.delayedCall(dura, () => this.ocultarBurbuja());
  }

  ocultarBurbuja() {
    const b = this.burbuja;
    b.escribiendo?.remove();
    b.ocultar?.remove();
    b.leidaEn = 0;
    this.e.tweens.add({ targets: b.cont, alpha: 0, duration: 250, onComplete: () => b.cont.setVisible(false) });
    if (!this.alarma) this.cara('neutral');
    this.siguienteEn = this.e.time.now + 450;      // la siguiente de la fila sale en update()
  }

  // ---------- Pronóstico (machine learning) ----------
  pronosticar(sol, total) {
    if (!this.vivo) return null;
    if (!this.ml) return null;
    const p = this.ml.paraSol(sol, total);
    if (!p) return null;
    this.pronostico = p;
    this.solPronosticado = sol;
    bus.emit(EV.PRONOSTICO, { sol, ...p });
    // A veces, un despiste gracioso antes del pronóstico
    const despiste = Math.random() < 0.3;
    if (despiste) this.decir('Calculando… ¡ups! Esa era la receta de los frijoles. Otra vez…', { cara: 'procesando', duracion: 2600 });
    else this.cara('procesando');
    this.e.time.delayedCall(despiste ? 2900 : 900, () => this.contarPronostico(false));
    return p;
  }

  contarPronostico(detalle) {
    const p = this.pronostico;
    if (!p) { this.decir('Todavía estoy leyendo los datos del Sol… ¡bip!', { cara: 'procesando' }); return; }
    if (!detalle) {
      // Frecuencia natural + dibujo: más fácil de entender a los 7 años que un porcentaje
      const n = Math.round(p.prob * 10);
      const cuantos = n === 0 ? 'en casi ninguno' : n === 10 ? 'en todos' : `en ${n}`;
      this.decir(`Pronóstico: de 10 días como hoy, ${cuantos} hubo llamarada fuerte (${p.porcentaje} %). ¡Puedo fallar!`,
        { cara: p.nivel === 'alto' ? 'procesando' : 'neutral', duracion: 7000, soles: n });
      return;
    }
    const razon = p.razones.length ? `Me fijé en ${p.razones[0][0].toLowerCase() + p.razones[0].slice(1)}.` : 'El Sol está tranquilo.';
    this.decir(`${razon} Datos reales de NOAA del ${fechaCorta(p.fechaDatos)}.`, { cara: 'neutral', duracion: 5500 });
  }

  /** Para después de la emergencia o la noche: ¿acertó la IA? */
  contarResultado() {
    const p = this.pronostico;
    if (!p) return;
    if (p.resultadoReal == null) {
      this.decir('Ese día todavía no pasa de verdad. ¡Mañana sabremos si acerté!', { cara: 'neutral' });
      return;
    }
    const hubo = p.resultadoReal, acerto = (p.prob >= 0.4) === hubo;
    const real = hubo ? `¡El ${fechaCorta(p.fechaPronostico)} sí hubo llamarada fuerte!` : `El ${fechaCorta(p.fechaPronostico)} el Sol estuvo tranquilo.`;
    this.decir(`${idioma.traducir(real)} ${idioma.traducir(acerto ? '¡Acerté! ¡Bip-hurra!' : 'Fallé: los pronósticos a veces fallan.')}`,
      { cara: acerto ? 'feliz' : 'neutral', duracion: 5500 });
  }

  // ---------- Archivos de memoria ----------
  cargarMemorias() {
    try { return new Set(JSON.parse(localStorage.getItem(CLAVE_GUARDADO) ?? '[]')); } catch { return new Set(); }
  }

  guardarMemorias() {
    try { localStorage.setItem(CLAVE_GUARDADO, JSON.stringify([...this.abiertas])); } catch { /* sin almacenamiento: no pasa nada */ }
  }

  /** Lista de recuerdos con su estado: [{ id, numero, titulo, abierto }] */
  get memorias() {
    return MEMORIAS.map((m, i) => ({ ...m, numero: i + 1, abierto: this.abiertas.has(m.id) }));
  }

  /** Abre un recuerdo (id = etiqueta dato:<id> de Ink). Devuelve true si era nuevo. */
  desbloquearMemoria(id) {
    const i = MEMORIAS.findIndex(m => m.id === id);
    if (i < 0 || this.abiertas.has(id)) return false;
    this.abiertas.add(id);
    this.guardarMemorias();
    const m = MEMORIAS[i];
    bus.emit(EV.MEMORIA, { id, numero: i + 1, titulo: m.titulo, abiertas: this.abiertas.size, total: MEMORIAS.length });
    this.decir(`¡Archivo de memoria #${String(i + 1).padStart(2, '0')} abierto! «${m.titulo}» (${this.abiertas.size} de ${MEMORIAS.length})`,
      { cara: 'feliz', duracion: 4500 });
    return true;
  }

  // Al final de la noche: un adelanto de un recuerdo que sigue cerrado (curiosidad)
  adelantarMemoria() {
    const cerrada = MEMORIAS.find(m => !this.abiertas.has(m.id));
    if (!cerrada) return;
    this.decir(`Tengo un recuerdo con candado 🔒: «${cerrada.titulo}». ¡Lo abrimos jugando!`, { cara: 'procesando', duracion: 4800 });
  }

  // ---------- Reacciones ----------
  alAcercarse(c) {
    if (!c || control.bloqueado || this.alarma) return;
    const pista = guia.pistaEstacion(c.nombre) ?? PISTAS[c.nombre];   // más explicada si el tema está flojo
    const ahora = this.e.time.now;
    if (!pista || ahora - (this.ultimaPista[c.nombre] ?? -1e9) < 45000) return;
    this.ultimaPista[c.nombre] = ahora;
    this.decir(pista, { cara: 'neutral', relleno: true });
  }

  alCambiarEstado(e) {
    if (!e?.fase || e.fase === this.faseAnterior) return;
    const antes = this.faseAnterior;
    this.faseAnterior = e.fase;
    this.alarma = e.fase === 'emergencia';
    if (e.fase === 'manana' && e.sol !== this.solPronosticado) this.pronosticar(e.sol, e.solesTotales ?? 10);
    // La alerta ya la da la IA en el diálogo de la emergencia; la burbuja solo si no hay diálogo (si no, salía al final)
    if (e.fase === 'emergencia' && !control.modal) this.decir('¡BIP-BIP-BIP! ¡Alerta en el radar!', { cara: 'procesando', duracion: 3000, relleno: true });
    if (e.fase === 'noche') {
      const tras = antes === 'emergencia';
      if (tras) this.e.time.delayedCall(800, () => this.contarResultado());
      this.e.time.delayedCall(tras ? 7000 : 1500, () => this.adelantarMemoria());
    }
  }

  // ---------- Cada fotograma ----------
  update(t, dt) {
    const pj = this.pj, c = this.cuerpo;
    if (!pj?.body) return;
    // Posición lógica (sin balanceo): flota detrás del jugador, un poco arriba
    const lado = pj.flipX ? 1 : -1;
    const s = this.s;
    const ox = pj.body.center.x + lado * 22 * s, oy = pj.body.center.y - 26 * s;
    const k = 1 - Math.exp(-4 * (dt ?? 16.67) / 1000);
    this.px ??= c.x; this.py ??= c.y;
    if (Phaser.Math.Distance.Between(this.px, this.py, ox, oy) > 3) {
      this.px += (ox - this.px) * k;
      this.py += (oy - this.py) * k;
    }
    // Dibujo: con balanceo e inclinación al moverse
    const flota = Math.sin(t / 380) * 2.2 * s;
    const dibY = this.py + flota;
    c.setPosition(this.px, dibY).setFlipX(pj.x < this.px)
      .setAngle(Phaser.Math.Clamp((ox - this.px) * 0.8, -12, 12))
      .setDepth(this.py + 30 * s > pj.body.center.y ? 6 : 4.5);   // delante o detrás del astronauta

    this.sombra.setPosition(this.px, this.py + 26 * s).setScale(1 - flota / s * 0.04);
    const color = this.alarma ? COLOR_CARA.alarma : COLOR_CARA[this.caraActual];
    const pulso = 0.25 + 0.15 * Math.sin(t / (this.alarma ? 90 : 300));   // < 3 destellos por segundo
    this.halo.setPosition(this.px, dibY - 17 * s).setFillStyle(color, pulso).setRadius((this.alarma ? 9 : 6) * s);
    if (this.caraActual === 'procesando') {
      this.puntos.forEach((p, i) => {
        const a = t / 180 + i * 2.1;
        p.setPosition(this.px + Math.cos(a) * 13 * s, dibY - 2 * s + Math.sin(a) * 5 * s);
      });
    }
    const b = this.burbuja;
    if (b.cont.visible) {
      // Que la burbuja no se salga de lo que ve la cámara
      const vista = this.e.cameras.main.worldView, mitad = (b.ancho ?? 40) / 2 + 3;
      const bx = vista.width > mitad * 2 ? Phaser.Math.Clamp(this.px, vista.x + mitad, vista.right - mitad) : this.px;
      const by = Math.max(vista.y + (b.alto ?? 10) / 2 + 3, dibY - 22 * s - (b.alto ?? 10) / 2);
      const cola = this.px - bx;
      if (Math.abs(cola - (b.colaX ?? 0)) > 0.5) { b.colaX = cola; this.dibujarBurbuja(); }
      b.cont.setPosition(bx, by);
    }

    // Lo que esperaba turno, de uno en uno y sin diálogos encima
    if (!b.cont.visible && this.colaBurbujas.length && !control.modal && this.e.time.now > (this.siguienteEn ?? 0)) {
      const sig = this.colaBurbujas.shift();
      this.decir(sig.texto, sig.opciones);
    }

    // Humor: si lleva mucho rato callado y no pasa nada importante, un chiste corto
    if (!b.cont.visible && !control.bloqueado && !this.alarma && this.e.time.now - this.ultimaHabla > PAUSA_CHISTE) {
      this.decir(Phaser.Utils.Array.GetRandom(CHISTES), { cara: 'feliz', relleno: true });
    }
  }

  /** Dónde está el robot (por ejemplo, para que la linterna salga de él) */
  get posicion() { return { x: this.px, y: this.py }; }
}

/** Engancha la IA (y su álbum de recuerdos) a la escena Base. Llamar una vez desde main.js. */
export function conectarCompania(juego) {
  juego.events.once('ready', async () => {
    const { default: Album } = await import('./Album.js');
    const { default: Aprendizaje } = await import('./Aprendizaje.js');
    juego.scene.add('Album', Album, false);              // se añade al final: queda encima de Interfaz
    juego.scene.add('Aprendizaje', Aprendizaje, false);  // lo que mide la IA guía (tecla P)
    const base = juego.scene.getScene('Base');
    base.events.on('create', () => {
      if (!base.textures.exists('robot_ia')) { console.warn('[robot] Falta assets/arte/robot_ia.png'); return; }
      window.__robot = new Robot(base);
      if (!juego.scene.isActive('Album')) base.scene.launch('Album');
      if (!juego.scene.isActive('Aprendizaje')) base.scene.launch('Aprendizaje');
    });
  });
}
