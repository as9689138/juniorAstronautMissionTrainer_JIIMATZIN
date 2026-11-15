// Diálogos de la historia (Ink) encima de todo: retrato, nombre, texto que se escribe solo y la voz de cada línea.
// Se abre con ciclo.narrar(nudo) o con escena.scene.launch('Dialogo', { nudo | lineas, alTerminar, ... }).
// Tocar, clic, E, Espacio o Enter: termina de escribir la línea o pasa a la siguiente. "Saltar" salta el nudo
// (salvo las decisiones, que siempre se eligen). Las decisiones de emergencia tienen cuenta atrás.
// Recuerdos: cuando una línea es un recuerdo de la IA (src/mecanicas/recuerdos.js), la pantalla se vuelve un
// flashback: se rebobina, se tiñe de holograma, sale el "Archivo de memoria" con su año y su ilustración, y al
// acabar el recuerdo se vuelve al presente.
// Hora: la IA es la que dicta el tiempo de la base. Una línea con `hora` (o un nudo abierto con { hora }) avisa con
// EV.HORA cuando se muestra, y entonces cambian la luz del mapa y la ficha del Sol (src/mecanicas/ciclo.js).
import { bus, EV, control } from '../motor/eventos.js';
import { sonido } from '../motor/sonido.js';
import { cargas } from '../motor/cargas.js';
import { PERSONAS } from '../mecanicas/narrador.js';
import { etiquetaRecuerdo } from '../mecanicas/recuerdos.js';
import { idioma } from '../motor/idioma.js';

const FUENTE = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const TINTA = 0x141026, PANEL = 0x1d1840, LUZ = '#f1ecff';
const CARA_IA = { neutral: 0, feliz: 1, procesando: 2 };
const HOLO = 0x5ec8f2, HOLO_TXT = '#8fe3ff';

export default class Dialogo extends Phaser.Scene {
  constructor() { super('Dialogo'); }

  init(datos) {
    this.datos = datos ?? {};
    this.narrador = datos.narrador ?? null;
    this.lineasSueltas = datos.lineas ? [...datos.lineas] : null;    // líneas sin Ink: [{ quien, texto }]
    this.tagsJuntadas = {};
    this.terminado = false;
    // la escena se reutiliza en cada diálogo: lo creado a demanda en el anterior ya no existe
    this.etiqueta = null;
    this.modoNarracion = false;
    this.colorActual = null;
    this.botones = null;
    this.flash = null;
    this.enRecuerdo = null;
    this.horaDada = false;
  }

  create() {
    control.bloqueado = true;
    control.modal = true;
    sonido.dialogo(true);                      // la música y el viento bajan mientras dure el diálogo
    const { width: w, height: h } = this.scale;
    this.velo = this.add.rectangle(0, 0, w, h, 0x07051a, this.datos.fondo ? 0.92 : 0.35).setOrigin(0).setDepth(-2);
    this.panel = this.add.graphics();
    this.retrato = this.add.image(0, 0, '__DEFAULT').setOrigin(0.5, 1).setVisible(false);
    this.robot = this.add.sprite(0, 0, 'robot_ia', 0).setOrigin(0.5, 1).setVisible(false);
    this.nombre = this.add.text(0, 0, '', { fontFamily: FUENTE, fontSize: '18px', fontStyle: 'bold', color: '#141026' }).setOrigin(0, 0.5);
    this.texto = this.add.text(0, 0, '', { fontFamily: FUENTE, fontSize: '19px', color: LUZ, lineSpacing: 6 });
    this.texto.sinTraducir = true;             // se escribe letra por letra: se traduce la línea entera antes
    this.titulo = this.add.text(0, 0, '', { fontFamily: FUENTE, fontSize: '34px', fontStyle: 'bold', color: '#ffe3b0', align: 'center' })
      .setOrigin(0.5).setAlpha(0);
    this.sigue = this.add.text(0, 0, '▶', { fontFamily: FUENTE, fontSize: '18px', color: '#ffc83d' }).setOrigin(1, 1);
    this.tweens.add({ targets: this.sigue, alpha: 0.25, duration: 520, yoyo: true, repeat: -1 });
    this.saltar = this.add.text(0, 0, 'Saltar ⏭', { fontFamily: FUENTE, fontSize: '16px', color: '#cfc6ff', backgroundColor: '#2a2358',
      padding: { x: 12, y: 8 } }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    this.saltar.on('pointerup', e => { e?.event?.stopPropagation?.(); this.saltarNudo(); });
    this.botones = [];
    this.reloj = this.add.text(0, 0, '', { fontFamily: FUENTE, fontSize: '22px', fontStyle: 'bold', color: '#ffc83d',
      backgroundColor: '#141026', padding: { x: 14, y: 6 } }).setOrigin(0.5);
    // Pista de la IA guía en las decisiones (solo si el tema está flojo: src/compania/guia.js)
    this.pista = this.add.text(0, 0, '', { fontFamily: FUENTE, fontSize: '17px', fontStyle: 'bold', color: '#141026',
      backgroundColor: '#8fe3ff', padding: { x: 12, y: 7 }, align: 'center' }).setOrigin(0.5).setVisible(false);

    this.input.on('pointerup', (p, sobre) => { if (!sobre.length) this.avanzar(); });
    const teclas = this.input.keyboard.addKeys('E,SPACE,ENTER');
    for (const k of Object.values(teclas)) k.on('down', () => this.avanzar());
    const alRedim = () => this.colocar();
    this.scale.on('resize', alRedim);
    this.events.once('shutdown', () => this.scale.off('resize', alRedim));

    if (this.datos.nudo && !(this.narrador?.empezar(this.datos.nudo))) { this.cerrar(); return; }
    this.colocar();
    this.siguiente();
  }

  // --- Composición: panel abajo, retrato a la izquierda asomando por encima ---
  colocar() {
    const { width: w, height: h } = this.scale;
    const e = Phaser.Math.Clamp(Math.min(w / 900, h / 640), 0.62, 1.25);
    this.e = e;
    this.velo.setSize(w, h);
    const ancho = Math.min(w - 24, 920 * e), alto = 150 * e;
    const x0 = (w - ancho) / 2, y0 = h - alto - 14 * e;
    this.caja = { x0, y0, ancho, alto };
    const g = this.panel.clear();
    if (this.modoNarracion) {
      g.fillStyle(0x000000, 0.55).fillRect(0, h * 0.62, w, h * 0.38);
    } else {
      g.fillStyle(TINTA, 1).fillRoundedRect(x0 - 4, y0 - 4, ancho + 8, alto + 8, 18);
      g.fillStyle(PANEL, 1).fillRoundedRect(x0, y0, ancho, alto, 14);
      g.lineStyle(2, this.colorActual ?? 0xb0acf4, 0.9).strokeRoundedRect(x0 + 6, y0 + 6, ancho - 12, alto - 12, 10);
    }
    const conRetrato = this.retrato.visible || this.robot.visible;
    const izq = conRetrato && !this.modoNarracion ? Math.min(210 * e, ancho * 0.3) : 26 * e;
    const tam = Math.max(16, Math.round(19 * e));
    this.texto.setFontSize(tam).setWordWrapWidth(ancho - izq - 40 * e);
    if (this.modoNarracion) {
      this.texto.setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(Math.min(w - 40, 760 * e)).setPosition(w / 2, h * 0.66);
    } else {
      this.texto.setOrigin(0, 0).setAlign('left').setPosition(x0 + izq, y0 + 44 * e);
    }
    this.nombre.setFontSize(Math.max(16, Math.round(17 * e))).setPosition(x0 + izq + 12 * e, y0 + 4 * e);
    this.dibujarEtiqueta();
    // el retrato asoma por encima del panel, sin pisar el nombre ni el texto
    const lado = Math.min(h * 0.4, izq + 26 * e);
    if (this.retrato.visible) {
      this.retrato.setDisplaySize(lado, lado).setPosition(x0 + lado / 2 - 10 * e, y0 + alto - 8 * e);
    }
    this.robot.setScale(1.5 * e).setPosition(x0 + izq / 2, y0 + alto * 0.72);
    this.sigue.setPosition(x0 + ancho - 18 * e, y0 + alto - 12 * e).setFontSize(Math.round(18 * e));
    // "Saltar", encima del panel a la derecha (arriba quedan el tablero y el sol de la interfaz)
    if (this.modoNarracion) this.saltar.setOrigin(1, 0).setPosition(w - 12, 12);
    else this.saltar.setOrigin(1, 1).setPosition(x0 + ancho, y0 - 10 * e);
    this.saltar.setFontSize(Math.max(16, Math.round(16 * e)));
    this.titulo.setPosition(w / 2, h * (this.modoNarracion ? 0.36 : 0.2)).setFontSize(Math.round(38 * e));
    this.reloj.setPosition(w / 2, (this.botones.length ? this.botones[0].y - 46 * e : h / 2)).setFontSize(Math.round(22 * e));
    this.colocarBotones();
    this.colocarRecuerdo();
  }

  dibujarEtiqueta() {
    if (!this.etiqueta) this.etiqueta = this.add.graphics().setDepth(2);
    this.etiqueta.clear();
    this.nombre.setDepth(3);
    if (!this.nombre.text || this.modoNarracion) return;
    const b = this.nombre.getBounds();
    this.etiqueta.fillStyle(TINTA, 1).fillRoundedRect(b.x - 12, b.y - 6, b.width + 24, b.height + 12, 10);
    this.etiqueta.fillStyle(this.colorActual ?? 0xb0acf4, 1).fillRoundedRect(b.x - 9, b.y - 3, b.width + 18, b.height + 6, 8);
    this.children.bringToTop(this.nombre);
  }

  // --- Avance ---
  siguiente() {
    if (this.terminado) return;
    const p = this.lineasSueltas ? this.lineaSuelta() : this.narrador?.paso();
    if (!p) { this.cerrar(); return; }
    if (p.tipo === 'tags') { this.aplicarTags(p.tags); this.siguiente(); return; }
    if (p.tipo === 'opciones') { this.mostrarOpciones(p.opciones); return; }
    this.aplicarTags(p.tags ?? {});
    if (p.tags?.titulo) this.mostrarTitulo(p.tags.titulo[0]);
    this.mostrarLinea(p);
  }

  lineaSuelta() {
    const l = this.lineasSueltas.shift();
    return l ? { tipo: 'linea', quien: l.quien ?? 'ia', texto: l.texto, cara: l.cara ?? null, voz: null, hora: l.hora,
      traducido: !!l.traducido, tags: {} } : null;
  }

  mostrarLinea(p) {
    const persona = p.quien ? PERSONAS[p.quien] : null;
    this.modoNarracion = !persona;
    this.colorActual = persona?.color ?? 0xb0acf4;
    // El jugador ES uno de los tres: sus líneas dicen "TÚ" (paquete de historia: hab == rol)
    const tuyo = p.quien && p.quien === this.registry.get('rolJugador');
    this.nombre.setText(persona ? `${idioma.traducir(persona.nombre).toUpperCase()}${tuyo ? ` · ${idioma.t('TÚ')}` : ''}${p.recuerdo ? ` · ${idioma.t('RECUERDO')}` : ''}` : '');
    const textoLinea = p.traducido ? p.texto : idioma.traducir(p.texto);
    // La hora la dicta la IA: al mostrarse su aviso cambian la luz y la ficha del Sol
    this.darHora(p.hora);
    if (!p.hora) this.darHora(this.datos.hora);
    if (p.recuerdo) this.entrarRecuerdo(p.recuerdo);
    else if (this.enRecuerdo) this.salirRecuerdo();
    this.retrato.setVisible(false);
    this.robot.setVisible(false);
    if (persona?.retrato && this.textures.exists(persona.retrato)) this.retrato.setTexture(persona.retrato).setVisible(true);
    else if (p.quien === 'ia') this.robot.setFrame(CARA_IA[p.cara] ?? 0).setVisible(true);
    this.colocar();
    // aparece el retrato con un saltito
    for (const r of [this.retrato, this.robot]) {
      if (!r.visible) continue;
      const y = r.y;
      r.setY(y + 14).setAlpha(0.4);
      this.tweens.add({ targets: r, y, alpha: 1, duration: 200, ease: 'Back.out' });
    }
    // texto que se escribe solo (unas 45 letras por segundo)
    this.completo = textoLinea;
    this.escribiendo = true;
    this.texto.setText('');
    let n = 0;
    this.tEscribir?.remove();
    this.tEscribir = this.time.addEvent({ delay: 22, loop: true, callback: () => {
      n += 1;
      this.texto.setText(this.completo.slice(0, n));
      if (n >= this.completo.length) { this.escribiendo = false; this.tEscribir.remove(); }
    } });
    this.sigue.setVisible(true);
    sonido.decir({ id: p.voz?.[0], ruta: p.voz?.[1], desde: p.vozDesde, texto: textoLinea, quien: p.quien });
    window.__robot?.ocultarBurbuja?.();          // la burbuja del robot no se encima con el diálogo
  }

  avanzar() {
    if (this.terminado || !this.botones || this.botones.length) return;
    if (this.escribiendo) { this.tEscribir?.remove(); this.escribiendo = false; this.texto.setText(this.completo); return; }
    sonido.callar();
    this.siguiente();
  }

  saltarNudo() {
    if (!this.botones || this.botones.length) return;   // una decisión no se salta (ni antes de abrirse)
    sonido.callar();
    this.tEscribir?.remove();
    for (let i = 0; i < 400; i++) {                  // recoge las etiquetas (costos, datos) hasta una decisión o el final
      const p = this.lineasSueltas ? this.lineaSuelta() : this.narrador?.paso();
      if (!p) { this.cerrar(); return; }
      if (p.tipo === 'opciones') { this.mostrarOpciones(p.opciones); return; }
      this.aplicarTags(p.tags ?? {}, true);
      if (p.recuerdo) bus.emit(EV.DATO, p.recuerdo.id);   // aunque se salte, el recuerdo queda abierto en el álbum
      this.darHora(p.hora);
    }
    this.cerrar();
  }

  // --- La hora de la base (la dicta la IA) ---
  darHora(hora) {
    if (!hora || (hora === this.datos.hora && this.horaDada)) return;
    if (hora === this.datos.hora) this.horaDada = true;
    bus.emit(EV.HORA, hora);
  }

  // --- Recuerdos (flashbacks) ---
  entrarRecuerdo(r) {
    if (this.enRecuerdo === r.id) return;
    const primero = !this.enRecuerdo;
    this.enRecuerdo = r.id;
    this.flash?.destroy();
    this.tweens.killTweensOf(this.titulo);
    this.titulo.setAlpha(0);
    if (!this.textures.exists('lineas_recuerdo')) {             // rayas de pantalla, como un holograma
      const t = this.textures.createCanvas('lineas_recuerdo', 4, 4);
      const c = t.getContext();
      c.fillStyle = 'rgba(94,200,242,0.9)'; c.fillRect(0, 0, 4, 1);
      t.refresh();
    }
    const { width: w, height: h } = this.scale;
    const f = this.flash = this.add.container(0, 0).setDepth(-1);
    f.tinte = this.add.rectangle(0, 0, w, h, 0x03121c, 0.9).setOrigin(0);
    f.lineas = this.add.tileSprite(0, 0, w, h, 'lineas_recuerdo').setOrigin(0).setAlpha(0.13);
    f.marco = this.add.graphics();
    f.cab = this.add.text(0, 0, etiquetaRecuerdo(r), { fontFamily: FUENTE, fontSize: '15px', fontStyle: 'bold', color: HOLO_TXT,
      align: 'center', letterSpacing: 2 }).setOrigin(0.5, 0);
    f.tit = this.add.text(0, 0, r.titulo, { fontFamily: FUENTE, fontSize: '26px', fontStyle: 'bold', color: '#e8f9ff', align: 'center',
      stroke: '#03121c', strokeThickness: 5 }).setOrigin(0.5, 0);
    f.rec = this.add.text(0, 0, '◀◀ RECUERDO', { fontFamily: FUENTE, fontSize: '14px', fontStyle: 'bold', color: HOLO_TXT }).setOrigin(0, 1);
    f.add([f.tinte, f.lineas, f.marco, f.cab, f.tit, f.rec]);
    this.tweens.add({ targets: f.rec, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });
    const clave = `recuerdo_${r.id}`;
    const ponerImagen = () => {
      if (this.flash !== f || !this.textures.exists(clave) || f.img) return;
      f.img = this.add.image(0, 0, clave);
      f.addAt(f.img, 2);
      this.colocarRecuerdo();
      f.img.setAlpha(0);                                          // aparece parpadeando, como una proyección
      this.tweens.chain({ targets: f.img, tweens: [
        { alpha: 0.7, duration: 70 }, { alpha: 0.15, duration: 60 }, { alpha: 1, duration: 160 }] });
    };
    if (this.textures.exists(clave)) ponerImagen(); else cargas.asegurar(`recuerdo:${r.id}`).then(ponerImagen);
    this.colocarRecuerdo();
    if (primero) {
      sonido.rebobinar(true);
      f.setAlpha(0);
      this.tweens.add({ targets: f, alpha: 1, duration: 380, ease: 'Sine.out' });
      this.cameras.main.shake(180, 0.003);
    }
    bus.emit(EV.DATO, r.id);                                       // el recuerdo queda abierto en el álbum
  }

  salirRecuerdo() {
    const f = this.flash;
    this.enRecuerdo = null;
    this.flash = null;
    if (!f) return;
    sonido.rebobinar(false);
    this.tweens.add({ targets: f, alpha: 0, duration: 300, onComplete: () => f.destroy() });
  }

  colocarRecuerdo() {
    const f = this.flash;
    if (!f || !this.caja) return;
    const { width: w, height: h } = this.scale;
    const e = this.e ?? 1;
    f.tinte.setSize(w, h);
    f.lineas.setSize(w, h);
    // en la narración "Saltar" va arriba a la derecha: el encabezado empieza debajo (si no, tapaba el año)
    const arriba = this.modoNarracion ? this.saltar.y + this.saltar.height + 10 : 14 * e;
    f.cab.setFontSize(Math.max(14, Math.round(15 * e))).setWordWrapWidth(w - 32).setPosition(w / 2, arriba);
    f.tit.setFontSize(Math.max(18, Math.round(28 * e))).setWordWrapWidth(w - 32).setPosition(w / 2, f.cab.y + f.cab.height + 4);
    // la ilustración, entre el título y el diálogo (sin tapar "Saltar", que va encima del panel)
    const y0 = f.tit.y + f.tit.height + 14 * e;
    const y1 = this.modoNarracion ? h * 0.6 : this.caja.y0 - 58 * e;
    const altoMax = y1 - y0, anchoMax = Math.min(w - 40, 820 * e);
    const g = f.marco.clear();
    if (!f.img || altoMax < 70) { f.img?.setVisible(false); f.rec.setVisible(false); return; }
    const k = Math.min(anchoMax / f.img.width, altoMax / f.img.height);
    f.img.setVisible(true).setScale(k).setPosition(w / 2, (y0 + y1) / 2);
    const iw = f.img.width * k, ih = f.img.height * k, ix = w / 2 - iw / 2, iy = (y0 + y1) / 2 - ih / 2;
    g.fillStyle(0x061c2a, 0.55).fillRect(ix, iy, iw, ih);
    g.lineStyle(2, HOLO, 0.9);
    const l = Math.min(26 * e, iw / 5);                          // esquinas de visor
    for (const [cx, cy, sx, sy] of [[ix, iy, 1, 1], [ix + iw, iy, -1, 1], [ix, iy + ih, 1, -1], [ix + iw, iy + ih, -1, -1]]) {
      g.lineBetween(cx, cy, cx + sx * l, cy).lineBetween(cx, cy, cx, cy + sy * l);
    }
    g.lineStyle(1, HOLO, 0.25).strokeRect(ix, iy, iw, ih);
    f.rec.setVisible(true).setFontSize(Math.max(14, Math.round(14 * e))).setPosition(ix + 6, iy - 4);
  }

  update() {
    if (this.flash?.lineas) this.flash.lineas.tilePositionY -= 0.35;
  }

  mostrarTitulo(t) {
    this.titulo.setText(t).setAlpha(0).setScale(1.15);
    this.tweens.add({ targets: this.titulo, alpha: 1, scale: 1, duration: 500, ease: 'Back.out' });
    this.tweens.add({ targets: this.titulo, alpha: 0, delay: 2600, duration: 700 });
  }

  // --- Decisiones (emergencias): botones grandes, con cuenta atrás si se pide ---
  mostrarOpciones(opciones) {
    this.sigue.setVisible(false);
    // una decisión no se salta, y el mapa de fondo se oscurece para que nada se encime con los botones
    this.saltar.setVisible(false);
    this.tweens.add({ targets: this.velo, fillAlpha: Math.max(this.velo.fillAlpha, 0.66), duration: 200 });
    const { width: w } = this.scale;
    this.botones = opciones.map((t, i) => {
      const c = this.add.container(w / 2, 0);
      const fondo = this.add.rectangle(0, 0, 10, 10, 0x2a2358).setStrokeStyle(3, 0xffc83d).setInteractive({ useHandCursor: true });
      const txt = this.add.text(0, 0, t, { fontFamily: FUENTE, fontSize: '18px', fontStyle: 'bold', color: '#fff6dc', align: 'center' }).setOrigin(0.5);
      c.add([fondo, txt]);
      c.fondo = fondo; c.txt = txt;
      fondo.on('pointerover', () => fondo.setFillStyle(0x3d3380));
      fondo.on('pointerout', () => fondo.setFillStyle(0x2a2358));
      fondo.on('pointerup', () => this.elegir(i));
      return c;
    });
    this.teclasOpcion = this.input.keyboard.on('keydown', ev => {
      const n = parseInt(ev.key, 10);
      if (n >= 1 && n <= this.botones.length) this.elegir(n - 1);
    });
    if (this.datos.pista) this.pista.setText(`💡 ${this.datos.pista}`).setVisible(true);
    if (this.datos.cuentaAtras) {
      let quedan = this.datos.cuentaAtras;
      this.reloj.setText(`⏳ ${quedan} s`).setVisible(true);
      this.tReloj = this.time.addEvent({ delay: 1000, loop: true, callback: () => {
        quedan -= 1;
        this.reloj.setText(`⏳ ${quedan} s`);
        sonido.efecto('ui_tictac', 0.5);
        if (quedan <= 0) this.elegir(this.botones.length - 1, true);   // si no decide, pasa lo arriesgado
      } });
    }
    this.colocar();
  }

  colocarBotones() {
    if (!this.botones.length) return;
    const { width: w, height: h } = this.scale;
    const e = this.e ?? 1, ancho = Math.min(w - 32, 640 * e);
    const base = this.caja.y0 - 20 * e - this.botones.length * 70 * e;
    this.botones.forEach((c, i) => {
      c.txt.setFontSize(Math.max(16, Math.round(18 * e))).setWordWrapWidth(ancho - 30);
      c.fondo.setSize(ancho, Math.max(56 * e, c.txt.height + 22));
      c.fondo.input?.hitArea.setSize(ancho, c.fondo.height);
      c.setPosition(w / 2, Math.max(h * 0.18, base) + i * 70 * e + 30 * e);
    });
    this.reloj.setPosition(w / 2, this.botones[0].y - 48 * e);
    if (this.pista.visible) {
      this.pista.setFontSize(Math.max(16, Math.round(17 * e))).setWordWrapWidth(Math.min(w - 40, 620 * e));
      const arriba = (this.datos.cuentaAtras ? this.reloj.y - this.reloj.height / 2 : this.botones[0].y - 30 * e) - 10 * e;
      this.pista.setPosition(w / 2, Math.max(this.pista.height / 2 + 8, arriba - this.pista.height / 2));
    }
  }

  elegir(i, porTiempo = false) {
    if (!this.botones.length) return;
    this.tReloj?.remove();
    this.reloj.setVisible(false);
    this.pista.setVisible(false);
    // lo que eligió (para la IA guía, que mide si decidió con datos)
    (this.tagsJuntadas.eleccion ??= []).push(i);
    if (porTiempo) this.tagsJuntadas.agotado = true;
    this.input.keyboard.off('keydown');
    for (const c of this.botones) c.destroy();
    this.botones = [];
    this.saltar.setVisible(true);
    sonido.efecto('ui_clic_boton', 0.7);
    this.narrador?.elegir(i);
    this.siguiente();
  }

  // --- Etiquetas: música, efectos, fichas de datos, costos y efectos de recursos ---
  aplicarTags(t, callado = false) {
    for (const [k, v] of Object.entries(t)) {
      if (Array.isArray(v)) (this.tagsJuntadas[k] ??= []).push(...v);
      else this.tagsJuntadas[k] = v;
    }
    if (!callado) {
      if (t.musica) sonido.musica(t.musica.at(-1));
      for (const s of t.sfx ?? []) sonido.efecto(s, 0.7);
    } else if (t.musica) sonido.musica(t.musica.at(-1));
    for (const d of t.dato ?? []) bus.emit(EV.DATO, d);
  }

  cerrar() {
    if (this.terminado) return;
    this.terminado = true;
    sonido.callar();
    sonido.dialogo(false);
    this.darHora(this.datos.hora);                    // si se saltó el aviso, la hora cambia igual
    if (this.enRecuerdo) sonido.rebobinar(false);
    control.modal = false;
    const fin = this.datos.alTerminar;
    const tags = this.tagsJuntadas;
    // Avisar cuando la escena YA se apagó: Phaser apaga en el siguiente cuadro y, si se avisara antes, el
    // siguiente diálogo (la misma escena) arrancaría y ese apagado pendiente lo cerraría a medias.
    this.events.once('shutdown', () => queueMicrotask(() => fin?.(tags)));
    this.scene.stop();
  }
}
