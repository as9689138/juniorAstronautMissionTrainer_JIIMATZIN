// Capa de interfaz encima del mapa (su cámara no tiene zoom).
// Rol 1: tablero de recursos, ficha del Sol, nombre de la sala, aviso de interacción,
// joystick y panel provisional. Estilo: docs/estilo-mapa.md (piezas de herramientas/pintar_interfaz.py).
// Las barras leen el estado que publica el rol 2 con EV.ESTADO_CAMBIO.
import { datosReales } from '../mecanicas/datosReales.js';
import { PANEL_PROVISIONAL, COLOR_SISTEMA } from '../motor/config.js';
import { bus, EV, control } from '../motor/eventos.js';
import { asegurarFlecha } from '../motor/flecha.js';
import { sonido } from '../motor/sonido.js';
import { ruta } from '../mecanicas/rutas.js';
import Minimapa from './minimapa.js';
import { idioma } from '../motor/idioma.js';

const FUENTE = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
const NUMEROS = 'Consolas, Menlo, "Courier New", monospace';
const TINTA = '#141026', LUZ = '#f3e3c3', SELLO = '#b8473d';
const ROJO_ALERTA = 0xff5a4e;
const BAJO = 25;                      // por debajo, el recurso avisa
const T = 0.5;                        // las piezas están pintadas al doble de resolución
const ANCHO_FICHA = 204;              // cabe "¡Emergencia! · 16:00" (la hora que dicta la IA)
const BOTON_SONIDO = 44;

const RECURSOS = [
  { clave: 'energia', icono: 'icono_energia', nombre: 'Energía' },
  { clave: 'oxigeno', icono: 'icono_oxigeno', nombre: 'Oxígeno' },
  { clave: 'blindaje', icono: 'icono_blindaje', nombre: 'Blindaje' },
];
const FASES = {
  manana: { icono: 'fase_manana', texto: 'Mañana' },
  dia: { icono: 'fase_dia', texto: 'Día' },
  noche: { icono: 'fase_noche', texto: 'Noche' },
  emergencia: { icono: 'fase_emergencia', texto: '¡Emergencia!' },
};
const SALAS = {   // nombre en el mapa -> nombre visible y sistema (color)
  Energia: ['ENERGÍA', 'energia'], Mando: ['MANDO', 'mando'], Comunicaciones: ['COMUNICACIONES', 'comunicaciones'],
  Pasillo: ['PASILLO', null], Invernadero: ['INVERNADERO', 'oxigeno'],
  'Soporte vital': ['SOPORTE VITAL', 'oxigeno'], Refugio: ['REFUGIO', 'blindaje'],
};
// Frase corta bajo el nombre de cada sala al entrar (qué se aprende ahí)
const LEMAS = {
  Pasillo: 'Aquí se unen todas las salas de la base', Energia: 'Paneles y baterías: sin energía, nada funciona',
  Mando: 'Desde aquí se reparte la energía del día', Comunicaciones: 'Un mensaje a la Tierra tarda de 3 a 22 minutos',
  Invernadero: 'Las plantas nos dan comida y oxígeno', 'Soporte vital': 'Aquí se limpia el aire: quitamos el CO2',
  Refugio: 'Muros de agua contra la radiación del Sol',
};
// Valores de muestra hasta que el rol 2 publique el estado real
const ESTADO_MUESTRA = { sol: 1, solesTotales: 10, energia: 80, oxigeno: 65, blindaje: 50, fase: 'dia' };

const texto = (escena, x, y, t, estilo) => escena.add.text(x, y, t, { fontFamily: FUENTE, resolution: 2, ...estilo });

export default class Interfaz extends Phaser.Scene {
  constructor() { super('Interfaz'); }

  // Placa o papel con nine-slice (se estira sin deformar las esquinas)
  pieza(clave, x, y, w, h, borde = 26) {
    return this.add.nineslice(x, y, clave, undefined, w / T, h / T, borde, borde, borde, borde).setScale(T);
  }

  create() {
    this.crearTablero();
    this.crearFicha();
    this.crearBanderin();
    this.crearAviso();
    this.crearPanel();
    this.crearSilencio();
    this.minimapa = new Minimapa(this);
    this.crearJoystick();
    this.flechaBorde = this.add.image(0, 0, asegurarFlecha(this)).setVisible(false).setDepth(40);
    this.tweens.add({ targets: this.flechaBorde, alpha: 0.55, duration: 500, yoyo: true, repeat: -1 });
    this.tactil = this.sys.game.device.input.touch;

    // --- Escuchar el bus ---
    const alEstado = e => this.pintarEstado(e);
    const alCerca = c => this.mostrarAviso(c);
    const alHab = h => this.mostrarHabitacion(h);
    const alInteractuar = d => { this.aviso.setVisible(false); if (PANEL_PROVISIONAL) this.abrirPanel(d); };
    const alCerrar = () => { this.panel.setVisible(false); this.mostrarAviso(this.cercaActual, true); };
    const alObjetivo = n => { this.objetivo = n; };
    bus.on(EV.ESTADO_CAMBIO, alEstado);
    bus.on(EV.CERCA_DE, alCerca);
    bus.on(EV.HABITACION, alHab);
    bus.on(EV.INTERACTUAR, alInteractuar);
    bus.on(EV.CERRAR_PANEL, alCerrar);
    bus.on(EV.OBJETIVO, alObjetivo);
    const alRedimensionar = s => this.colocar(s.width, s.height);
    this.scale.on('resize', alRedimensionar);
    this.events.once('shutdown', () => {
      bus.off(EV.ESTADO_CAMBIO, alEstado); bus.off(EV.CERCA_DE, alCerca); bus.off(EV.HABITACION, alHab);
      bus.off(EV.INTERACTUAR, alInteractuar); bus.off(EV.CERRAR_PANEL, alCerrar); bus.off(EV.OBJETIVO, alObjetivo);
      this.scale.off('resize', alRedimensionar);
      this.game.events.off(Phaser.Core.Events.BLUR, this.alPerderFoco);
      if (sonido.alCambiarSilencio === this.alSilencio) sonido.alCambiarSilencio = null;
    });

    this.pintarEstado(this.registry.get('estado') ?? ESTADO_MUESTRA, true);
    this.colocar(this.scale.width, this.scale.height);
  }

  // --- Tablero de instrumentos: los tres recursos -----------------------------
  crearTablero() {
    const ANCHO = 236, ALTO = 124;
    this.tablero = this.add.container(0, 0);
    this.tablero.add(this.pieza('ui_placa', 0, 0, ANCHO, ALTO).setOrigin(0));
    this.barras = RECURSOS.map((r, i) => {
      const y = 26 + i * 36;
      const icono = this.add.image(28, y, r.icono).setScale(T);
      const nombre = texto(this, 52, y - 15, r.nombre.toUpperCase(), { fontSize: '10px', fontStyle: 'bold', color: LUZ, letterSpacing: 1.5 }).setAlpha(0.75);
      const fondo = this.add.rectangle(52, y + 6, 136, 11, 0x0b0820).setOrigin(0, 0.5).setStrokeStyle(2, 0x141026);
      const relleno = this.add.rectangle(53, y + 6, 134, 9, COLOR_SISTEMA[r.clave]).setOrigin(0, 0.5);
      const brillo = this.add.rectangle(53, y + 3, 134, 2, 0xffffff, 0.35).setOrigin(0, 0.5);
      const marcas = this.add.graphics();                        // celdas, como un medidor de carga
      marcas.lineStyle(1.5, 0x0b0820, 0.9);
      for (let k = 1; k < 10; k++) marcas.lineBetween(52 + k * 13.6, y + 1, 52 + k * 13.6, y + 11);
      const valor = texto(this, ANCHO - 14, y + 1, '', { fontFamily: NUMEROS, fontSize: '16px', fontStyle: 'bold', color: LUZ }).setOrigin(1, 0.5);
      this.tablero.add([icono, nombre, fondo, relleno, brillo, marcas, valor]);
      return { ...r, icono, nombre, relleno, brillo, valor, actual: null, bajo: false };
    });
  }

  // --- Ficha de bitácora: Sol y fase del día --------------------------------------
  crearFicha() {
    // Clima real de Marte para este sol (escenario de la API del equipo, si hay): debajo de la ficha
    this.textoClima = texto(this, 0, 0, '', { fontSize: '16px', fontStyle: 'bold', color: '#fff3dc', stroke: '#141026', strokeThickness: 4 })
      .setOrigin(1, 0).setVisible(false);
    datosReales.cargar().then(() => this.pintarClima());
    const ANCHO = ANCHO_FICHA, ALTO = 64;
    this.ficha = this.add.container(0, 0);
    this.ficha.add(this.pieza('ui_papel', -ANCHO, 0, ANCHO, ALTO, 30).setOrigin(0));
    this.iconoFase = this.add.image(-ANCHO + 32, ALTO / 2, 'fase_dia').setScale(T);
    this.textoSol = texto(this, -ANCHO + 56, 15, '', { fontFamily: NUMEROS, fontSize: '17px', fontStyle: 'bold', color: TINTA });
    this.textoFase = texto(this, -ANCHO + 57, 36, '', { fontSize: '12px', fontStyle: 'bold', color: TINTA }).setAlpha(0.75);
    this.ficha.add([this.iconoFase, this.textoSol, this.textoFase]);
  }

  // --- Banderín con el nombre de la sala ------------------------------------------
  crearBanderin() {
    this.banderin = this.add.container(0, 0).setAlpha(0);
    this.banderinFondo = this.pieza('ui_placa', 0, 0, 200, 40, 22);
    this.banderinTira = this.add.rectangle(0, 0, 6, 22, 0xffffff);
    this.banderinTexto = texto(this, 0, 0, '', { fontSize: '17px', fontStyle: 'bold', color: LUZ, letterSpacing: 3 }).setOrigin(0.5);
    this.banderin.add([this.banderinFondo, this.banderinTira, this.banderinTexto]);
    // Cartel grande al entrar en una sala (como los títulos de zona de Hades)
    this.cartel = this.add.container(0, 0).setAlpha(0).setDepth(30);
    this.cartelTitulo = texto(this, 0, 0, '', { fontSize: '44px', fontStyle: 'bold', color: LUZ, letterSpacing: 8,
      stroke: TINTA, strokeThickness: 8 }).setOrigin(0.5);
    this.cartelLema = texto(this, 0, 50, '', { fontSize: '16px', fontStyle: 'bold', color: LUZ, stroke: TINTA, strokeThickness: 5 }).setOrigin(0.5);
    // la raya va entre el título y el lema, sin tocarlos (antes pasaba encima del lema)
    this.cartelRayaI = this.add.rectangle(0, 33, 10, 3, 0xffffff).setOrigin(1, 0.5);
    this.cartelRayaD = this.add.rectangle(0, 33, 10, 3, 0xffffff).setOrigin(0, 0.5);
    this.cartelBanda = this.add.rectangle(0, 22, 10, 96, 0x0b0820, 0.55).setOrigin(0.5);   // para leerse sobre el arte
    this.cartel.add([this.cartelBanda, this.cartelRayaI, this.cartelRayaD, this.cartelTitulo, this.cartelLema]);
  }

  // --- Aviso de interacción: tecla E (o "toca") + nombre de la estación ------------
  crearAviso() {
    this.aviso = this.add.container(0, 0).setVisible(false);
    this.avisoFondo = this.pieza('ui_placa', 0, 0, 240, 48, 22);
    this.avisoTecla = this.add.image(0, -1, 'ui_tecla').setScale(T);
    this.avisoLetra = texto(this, 0, -3, 'E', { fontSize: '15px', fontStyle: 'bold', color: TINTA }).setOrigin(0.5);
    this.avisoTexto = texto(this, 0, 0, '', { fontSize: '15px', fontStyle: 'bold', color: LUZ }).setOrigin(0, 0.5);
    this.aviso.add([this.avisoFondo, this.avisoTecla, this.avisoLetra, this.avisoTexto]);
    this.aviso.setSize(240, 48).setInteractive({ useHandCursor: true });
    this.aviso.on('pointerdown', (p, x, y, ev) => { ev.stopPropagation(); this.aplastar(this.aviso); bus.emit(EV.PEDIR_INTERACCION); });
    this.tweens.add({ targets: this.avisoTecla, y: 1, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  // --- Panel provisional como hoja de bitácora (lo sustituye el rol 2) -------------
  crearPanel() {
    this.panel = this.add.container(0, 0).setVisible(false).setDepth(50);
    const hoja = this.pieza('ui_papel', 0, 0, 380, 210, 30);
    this.panelTitulo = texto(this, 0, -62, '', { fontSize: '20px', fontStyle: 'bold', color: TINTA, align: 'center', wordWrap: { width: 320 } }).setOrigin(0.5);
    const raya = this.add.rectangle(0, -42, 300, 2, 0x141026, 0.6);
    this.panelTexto = texto(this, 0, 4, '', { fontSize: '13px', color: TINTA, align: 'center', lineSpacing: 4, wordWrap: { width: 320 } }).setOrigin(0.5);
    const sello = texto(this, 128, -78, 'PROVISIONAL', { fontSize: '11px', fontStyle: 'bold', color: SELLO, letterSpacing: 2 })
      .setOrigin(0.5).setAngle(8).setAlpha(0.8);
    const boton = this.add.container(0, 70);
    boton.add([this.pieza('ui_placa', 0, 0, 150, 38, 20), texto(this, 0, 0, 'Cerrar  ·  E', { fontSize: '14px', fontStyle: 'bold', color: LUZ }).setOrigin(0.5)]);
    boton.setSize(150, 38).setInteractive({ useHandCursor: true });
    boton.on('pointerdown', (p, x, y, ev) => { ev.stopPropagation(); this.aplastar(boton); bus.emit(EV.CERRAR_PANEL); });
    this.panel.add([hoja, this.panelTitulo, raya, this.panelTexto, sello, boton]);
  }

  // --- Joystick táctil: arrastrar en cualquier parte libre de la pantalla ----------
  crearJoystick() {
    this.joyBase = this.add.circle(0, 0, 52, 0x2a2650, 0.35).setStrokeStyle(3, 0x141026, 0.9).setVisible(false);
    this.joyAro = this.add.circle(0, 0, 47, 0x000000, 0).setStrokeStyle(2, 0xb0acf4, 0.5).setVisible(false);
    this.joyPomo = this.add.circle(0, 0, 21, 0xe9dfc8, 0.9).setStrokeStyle(3, 0x141026).setVisible(false);
    const piezas = [this.joyBase, this.joyAro, this.joyPomo];
    this.input.on('pointerdown', (p, sobre) => {
      if (sobre.length || control.bloqueado) return;   // no si se tocó un botón
      this.joyId = p.id; this.joyOrigen = { x: p.x, y: p.y };
      piezas.forEach(o => o.setPosition(p.x, p.y).setVisible(true));
    });
    this.input.on('pointermove', p => {
      if (p.id !== this.joyId) return;
      let dx = p.x - this.joyOrigen.x, dy = p.y - this.joyOrigen.y;
      const d = Math.hypot(dx, dy), max = 45;
      if (d > max) { dx = dx / d * max; dy = dy / d * max; }
      control.joy.x = dx / max; control.joy.y = dy / max;
      this.joyPomo.setPosition(this.joyOrigen.x + dx, this.joyOrigen.y + dy);
    });
    const soltar = p => {
      if (p.id !== this.joyId) return;
      this.joyId = null; control.joy.x = control.joy.y = 0;
      piezas.forEach(o => o.setVisible(false));
    };
    this.input.on('pointerup', soltar);
    this.input.on('pointerupoutside', soltar);
    // Si la ventana pierde el foco (cambiar de pestaña, notificación), soltar el joystick
    this.alPerderFoco = () => soltar({ id: this.joyId });
    this.game.events.on(Phaser.Core.Events.BLUR, this.alPerderFoco);
  }

  // --- Colocación: se adapta al tamaño de pantalla (móvil, tablet, escritorio) ------
  colocar(w, h) {
    const e = Phaser.Math.Clamp(Math.min(w / 760, h / 520), 0.72, 1.3);
    this.escalaUI = e;
    const margen = 12 * e;
    this.tablero.setScale(e).setPosition(margen, margen);
    const estrecho = w < 236 * e + ANCHO_FICHA * e + BOTON_SONIDO * e + 4 * margen;   // no caben lado a lado
    this.ficha.setScale(e).setPosition(estrecho ? margen + ANCHO_FICHA * e : w - margen, estrecho ? margen * 2 + 124 * e : margen);
    // Silencio: a la izquierda de la ficha; en el teléfono, en la esquina de arriba a la derecha
    // el botón nunca baja de 44 px (se toca con el dedo), aunque el resto del tablero se encoja
    const eSon = Math.max(e, 44 / BOTON_SONIDO);
    this.botonSonido.setScale(eSon).setPosition(
      estrecho ? w - margen - BOTON_SONIDO * eSon / 2 : w - margen - ANCHO_FICHA * e - 10 * e - 12 - BOTON_SONIDO * eSon / 2,
      margen + BOTON_SONIDO * eSon / 2 + (estrecho ? 0 : 10 * e));
    this.textoClima.setFontSize(Math.max(16, Math.round(14 * e))).setPosition(this.ficha.x, this.ficha.y + 70 * e);
    this.banderin.setScale(e).setPosition(w / 2, (estrecho ? h - 130 * e : 34 * e));
    const escalaCartel = Math.min(e, (w - 24) / 560);
    this.cartel.setScale(escalaCartel).setPosition(w / 2, h * 0.66);   // debajo del astronauta: no tapa la burbuja del robot
    this.letraMinima(e, escalaCartel);
    // Táctil primero: en pantallas táctiles el aviso y el panel nunca bajan de un tamaño cómodo para el dedo
    // (y sin tacto, en una ventana chica, tampoco se encoge del todo)
    const eToque = this.tactil ? Math.max(e, 1.2) : Math.max(e, 0.95);
    this.escalaAviso = eToque;
    // Minimapa: debajo de la ficha del Sol (y del clima real, si lo hay); en el teléfono, debajo del botón de silencio
    const yMini = estrecho ? margen + BOTON_SONIDO * Math.max(e, 44 / BOTON_SONIDO) + 8 * e
      : margen + 64 * e + 10 * e + (this.textoClima.visible ? 24 * e : 0);
    this.minimapa.colocar(w - margen, yMini, e, estrecho ? w - margen * 2 - 236 * e - 8 : Infinity);
    // Si la pantalla es angosta, el aviso sube para no encimarse con el botón del álbum (abajo a la derecha)
    this.avisoAlto = w < 760 ? 70 : 0;
    this.aviso.setScale(eToque).setPosition(w / 2, h - 44 * eToque - this.avisoAlto);
    this.panel.setScale(Math.min(Math.max(e * 1.1, this.tactil ? 1.15 : 0), (w - 24) / 380)).setPosition(w / 2, h / 2);
  }

  // En pantallas chicas (teléfono, hasta 568x320) las piezas se encogen con la escala e, pero la letra no: se
  // compensa para que en pantalla quede de 14 px o más. En el tablero, si no cabe el nombre del recurso, se esconde:
  // el icono ya dice cuál es (rayo, gota, escudo) y el número se agranda. La ficha del Sol deja solo la hora (el
  // icono dice la fase).
  letraMinima(e, escalaCartel) {
    const chico = e < 0.95;
    this.hudChico = chico;
    for (const b of this.barras) {
      b.nombre.setVisible(!chico);
      b.valor.setFontSize(`${Math.round(Math.max(16, 14.5 / e))}px`);
    }
    this.textoSol.setFontSize(`${Math.round(Math.max(17, 14.5 / e))}px`).setY(chico ? 6 : 15);
    this.textoFase.setFontSize(`${Math.round(Math.max(12, 14.5 / e))}px`).setY(chico ? 35 : 36).setAlpha(chico ? 0.9 : 0.75);
    this.banderinTexto.setFontSize(`${Math.round(Math.max(17, 14.5 / e))}px`);
    this.cartelLema.setFontSize(`${Math.round(Math.max(16, 14.5 / escalaCartel))}px`);
    this.pintarFase();
  }

  // Texto de la ficha: "Mañana · 06:00" (en el teléfono, solo "06:00")
  pintarFase() {
    const f = this.faseActual;
    if (!f) return;
    const nombre = idioma.t(f.texto);
    const texto = f.hora ? (this.hudChico ? f.hora : `${nombre} · ${f.hora}`) : nombre;
    this.textoFase.setText(texto).setColor(f.emergencia ? SELLO : TINTA);
  }

  // --- Estado ---------------------------------------------------------------------
  pintarEstado(e, inmediato = false) {
    for (const b of this.barras) {
      const v = Phaser.Math.Clamp(e[b.clave] ?? 0, 0, 100);
      const ancho = 134 * v / 100;
      this.tweens.killTweensOf([b.relleno, b.brillo]);
      if (inmediato || b.actual === null) { b.relleno.width = b.brillo.width = ancho; }
      else this.tweens.add({ targets: [b.relleno, b.brillo], width: ancho, duration: 600, ease: 'Cubic.out' });
      b.actual = v;
      b.valor.setText(`${Math.round(v)}`);
      this.marcarBajo(b, v < BAJO);
    }
    this.textoSol.setText(`SOL ${e.sol} / ${e.solesTotales}`);
    this.solActual = e.sol;
    this.pintarClima();
    const f = FASES[e.fase] ?? FASES.dia;
    this.iconoFase.setTexture(f.icono);
    this.faseActual = { texto: f.texto, hora: e.hora, emergencia: e.fase === 'emergencia' };
    this.pintarFase();
    // La IA acaba de dictar otra hora: la ficha late
    const clave = `${e.sol}-${e.fase}`;
    if (!inmediato && this.horaMostrada && clave !== this.horaMostrada) {
      const s = this.ficha.scale;
      this.tweens.killTweensOf(this.ficha);
      this.ficha.setScale(s);
      this.tweens.add({ targets: this.ficha, scale: s * 1.12, duration: 180, yoyo: true, repeat: 1, ease: 'Sine.out' });
    }
    this.horaMostrada = clave;
  }

  // --- Botón de silencio (también con la tecla M): se ve si el juego está callado ---
  crearSilencio() {
    const c = this.add.container(0, 0).setDepth(10);
    const fondo = this.pieza('ui_placa', 0, 0, BOTON_SONIDO, BOTON_SONIDO, 18);
    this.iconoSonido = this.add.graphics();
    c.add([fondo, this.iconoSonido]);
    c.setSize(BOTON_SONIDO, BOTON_SONIDO).setInteractive({ useHandCursor: true });
    c.on('pointerdown', (p, x, y, ev) => { ev.stopPropagation(); this.aplastar(c); sonido.alternarSilencio(); });
    this.botonSonido = c;
    this.alSilencio = callado => this.pintarSilencio(callado);
    sonido.alCambiarSilencio = this.alSilencio;
    this.pintarSilencio(sonido.silencio);
  }

  pintarSilencio(callado) {
    const g = this.iconoSonido.clear();
    g.fillStyle(0xf3e3c3, 1).lineStyle(2, 0x141026, 1);
    g.fillRect(-11, -5, 7, 10).strokeRect(-11, -5, 7, 10);                         // bocina
    g.fillTriangle(-4, -5, 4, -11, 4, 11).fillTriangle(-4, -5, 4, 11, -4, 5);
    g.lineStyle(2.5, callado ? 0xff5a4e : 0xf3e3c3, 1);
    if (callado) { g.lineBetween(7, -6, 15, 6).lineBetween(15, -6, 7, 6); }       // tachado: sin sonido
    else {
      g.beginPath(); g.arc(5, 0, 6, -0.9, 0.9); g.strokePath();
      g.beginPath(); g.arc(5, 0, 11, -0.9, 0.9); g.strokePath();
    }
  }

  pintarClima() {
    const t = this.solActual ? datosReales.resumenClima(this.solActual) : null;
    const antes = this.textoClima?.visible;
    this.textoClima?.setText(t ?? '').setVisible(!!t);
    if (this.minimapa && antes !== !!t) this.colocar(this.scale.width, this.scale.height);   // el minimapa baja o sube
  }

  // Recurso bajo: la barra late en rojo y el icono tiembla
  marcarBajo(b, bajo) {
    if (bajo === b.bajo) return;
    b.bajo = bajo;
    this.tweens.killTweensOf(b.icono);
    b.alerta?.remove();
    b.temblor?.remove();
    b.icono.setAngle(0);
    b.relleno.setFillStyle(COLOR_SISTEMA[b.clave]);
    b.valor.setColor(bajo ? '#ff8a7e' : LUZ);
    if (!bajo) return;
    const temblar = () => this.tweens.add({ targets: b.icono, angle: { from: -9, to: 9 }, duration: 80, yoyo: true, repeat: 3,
      onComplete: () => b.icono.setAngle(0) });
    temblar();
    b.temblor = this.time.addEvent({ delay: 2200, loop: true, callback: temblar });
    const base = Phaser.Display.Color.IntegerToColor(COLOR_SISTEMA[b.clave]);
    const rojo = Phaser.Display.Color.IntegerToColor(ROJO_ALERTA);
    b.alerta = this.tweens.addCounter({ from: 0, to: 100, duration: 500, yoyo: true, repeat: -1,
      onUpdate: tw => {
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(base, rojo, 100, tw.getValue());
        b.relleno.setFillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
      } });
  }

  // libre = true cuando se acaba de cerrar una pantalla (el control vuelve al jugador)
  mostrarAviso(c, libre = false) {
    this.cercaActual = c;
    if (!c) { this.aviso.setVisible(false); return; }
    const tactil = this.sys.game.device.input.touch;
    this.avisoLetra.setText(tactil ? '☝' : 'E');
    const tuya = c.nombre && c.nombre === ruta(this.registry.get('personaje')).especialidad;
    const s0 = this.escalaAviso ?? 1, cabe = this.scale.width - 24;
    const poner = largo => {
      const etiqueta = tuya ? `${c.etiqueta}  ${largo ? '★ tu especialidad' : '★'}` : c.etiqueta;
      this.avisoTexto.setText(tactil ? `Toca · ${etiqueta}` : etiqueta);
      return Math.max(170, this.avisoTexto.width + 78);
    };
    let ancho = poner(true);
    if (ancho * s0 > cabe) ancho = poner(false);              // en pantallas angostas, solo la estrella
    // y si aun así no cabe, el aviso se encoge: nunca se sale de la pantalla
    this.aviso.setScale(Math.min(s0, cabe / ancho));
    this.avisoFondo.setSize(ancho / T, 48 / T);
    this.avisoTecla.setX(-ancho / 2 + 28);
    this.avisoLetra.setX(-ancho / 2 + 28);
    this.avisoTexto.setX(-ancho / 2 + 52);
    this.aviso.setSize(ancho, 48);
    this.aviso.input.hitArea.setSize(ancho, 48);
    const mostrar = libre || !control.bloqueado;
    if (mostrar && !this.aviso.visible) {                 // aparece con un pequeño salto
      const s = this.aviso.scaleX;
      this.tweens.add({ targets: this.aviso, scale: { from: s * 0.8, to: s }, duration: 180, ease: 'Back.out' });
    }
    this.aviso.setVisible(mostrar);
  }

  // Botón que se aplasta al tocarlo (respuesta moderada)
  aplastar(obj) {
    const s = obj.scaleX;
    this.tweens.add({ targets: obj, scaleX: s * 0.92, scaleY: s * 0.92, duration: 70, yoyo: true });
  }

  // Flecha en el borde de la pantalla cuando la estación objetivo no se ve
  update(ahora) {
    this.minimapa?.update(ahora);
    const base = this.scene.get('Base');
    const est = this.objetivo && (base?.puntoObjetivo ? base.puntoObjetivo(this.objetivo) : base?.estaciones?.find(s => s.datos.nombre === this.objetivo));
    if (!est || control.bloqueado) { this.flechaBorde.setVisible(false); return; }
    const cam = base.cameras.main, v = cam.worldView;
    const sx = (est.x - v.x) * cam.zoom, sy = (est.y - v.y) * cam.zoom;
    const { width: w, height: h } = this.scale;
    const m = 48 * (this.escalaUI ?? 1);
    if (sx > m && sx < w - m && sy > m && sy < h - m) { this.flechaBorde.setVisible(false); return; }
    const cx = w / 2, cy = h / 2, ang = Math.atan2(sy - cy, sx - cx);
    const t = Math.min((w / 2 - m) / Math.abs(Math.cos(ang) || 1e-6), (h / 2 - m) / Math.abs(Math.sin(ang) || 1e-6));
    this.flechaBorde.setPosition(cx + Math.cos(ang) * t, cy + Math.sin(ang) * t).setRotation(ang)
      .setScale(0.8 * (this.escalaUI ?? 1)).setVisible(true);
  }

  mostrarHabitacion(nombre) {
    if (!nombre) return;
    const [visible, sistema] = SALAS[nombre] ?? [nombre.toUpperCase(), null];
    this.mostrarCartel(visible, LEMAS[nombre] ?? '', sistema ? COLOR_SISTEMA[sistema] : 0xb0acf4);
    this.banderinTexto.setText(visible);
    const ancho = this.banderinTexto.width + 56;
    this.banderinFondo.setSize(ancho / T, 40 / T);
    this.banderinTira.setX(-ancho / 2 + 14).setFillStyle(sistema ? COLOR_SISTEMA[sistema] : 0xb0acf4);
    this.banderinTexto.setX(6);
    const y = this.banderin.y;
    this.tweens.killTweensOf(this.banderin);
    this.banderin.setAlpha(0).setY(y - 10 * (this.escalaUI ?? 1));
    this.banderin.setY(y);   // el banderín pequeño queda listo, pero al entrar se ve el cartel grande
  }

  mostrarCartel(titulo, lema, color) {
    const c = this.cartel;
    this.tweens.killTweensOf([c, this.cartelRayaI, this.cartelRayaD, this.cartelTitulo]);
    this.cartelTitulo.setText(titulo).setScale(1.25);
    this.cartelLema.setText(lema);
    const ancho = Math.max(this.cartelTitulo.width, this.cartelLema.width) / 2 + 30;
    this.cartelBanda.setSize(ancho * 2 + 40, 96).setDisplaySize(ancho * 2 + 40, 96);
    this.cartelRayaI.setFillStyle(color).setSize(0, 3).setX(-20);
    this.cartelRayaD.setFillStyle(color).setSize(0, 3).setX(20);
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 260 });
    this.tweens.add({ targets: this.cartelTitulo, scale: 1, duration: 420, ease: 'Back.out' });
    this.tweens.add({ targets: [this.cartelRayaI, this.cartelRayaD], width: ancho, duration: 520, ease: 'Cubic.out' });
    this.tweens.add({ targets: c, alpha: 0, delay: 1900, duration: 600 });
  }

  abrirPanel(d) {
    this.panelTitulo.setText(d.etiqueta);
    this.panelTexto.setText(`Panel provisional del motor.\nAcción: ${d.accion} · Sistema: ${d.sistema}\nEl rol 2 conecta aquí su pantalla escuchando EV.INTERACTUAR.`);
    this.panel.setVisible(true);
  }
}
