// Álbum de recuerdos de la IA: los archivos de memoria que el jugador va abriendo.
// Escena propia, encima de Interfaz (no la modifica). Se abre con el botón de la esquina
// inferior derecha o con la tecla R (recuerdos); se cierra con R, Esc o el botón Cerrar.
// (La M es la del silencio: antes las dos usaban la M y abrir el álbum silenciaba el juego.)
// Son 16 recuerdos (src/mecanicas/recuerdos.js): se ven de 8 en 8, con páginas.
// Estilo: papel crema con tinta y sello rojo (docs/estilo-mapa.md: datos = documento real).
// Accesibilidad: texto de 14-16 px o más, botón de 48 px, lo cerrado se ve con candado y "???",
// no solo con color (docs/accesibilidad.md).
import { bus, EV, control } from '../motor/eventos.js';
import { MEMORIAS } from './robot.js';
import { cargas } from '../motor/cargas.js';

const FUENTE = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
const TINTA = 0x141026, TINTA_TXT = '#141026', LUZ_TXT = '#f3e3c3', SELLO = 0xb8473d, SELLO_TXT = '#b8473d';
const PAPEL = 0xf3e3c3, PAPEL_OSC = 0xe2cfb2, CERRADO = 0x2a2550;
const T = 0.5;                                // las piezas de interfaz están pintadas al doble
const BOTON = 52;

const texto = (e, x, y, t, estilo) => e.add.text(x, y, t, { fontFamily: FUENTE, resolution: 2, ...estilo });

export default class Album extends Phaser.Scene {
  constructor() { super('Album'); }

  create() {
    this.abierto = false;
    this.nuevas = 0;
    this.crearBoton();

    this.pagina = 0;
    const tecla = this.input.keyboard.addKey('R');
    tecla.on('down', () => this.alternar());
    this.input.keyboard.addKey('ESC').on('down', () => this.abierto && this.cerrar());

    const alMemoria = () => { this.nuevas++; this.actualizarBoton(true); if (this.abierto) this.dibujar(); };
    const alCerrarPanel = () => this.abierto && this.cerrar(false);
    bus.on(EV.MEMORIA, alMemoria);
    bus.on(EV.CERRAR_PANEL, alCerrarPanel);
    const alRedimensionar = () => { this.colocarBoton(); if (this.abierto) this.dibujar(); };
    this.scale.on('resize', alRedimensionar);
    this.events.once('shutdown', () => {
      bus.off(EV.MEMORIA, alMemoria); bus.off(EV.CERRAR_PANEL, alCerrarPanel);
      this.scale.off('resize', alRedimensionar);
    });
    this.colocarBoton();
    this.actualizarBoton(false);
  }

  // Lista con estado: del robot si existe; si no, de lo guardado en el navegador
  get memorias() {
    if (window.__robot?.memorias) return window.__robot.memorias;
    let abiertas = [];
    try { abiertas = JSON.parse(localStorage.getItem('mision-marte.memorias.v1') ?? '[]'); } catch { /* nada */ }
    return MEMORIAS.map((m, i) => ({ ...m, numero: i + 1, abierto: abiertas.includes(m.id) }));
  }

  pieza(clave, x, y, w, h, borde = 26) {
    if (this.textures.exists(clave)) {
      return this.add.nineslice(x, y, clave, undefined, w / T, h / T, borde, borde, borde, borde).setScale(T);
    }
    const g = this.add.graphics({ x, y });                     // respaldo si falta el arte de interfaz
    g.fillStyle(clave === 'ui_papel' ? PAPEL : 0x3a366e, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    g.lineStyle(2, TINTA, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    return g;
  }

  // ---------- Botón de la esquina ----------
  crearBoton() {
    const c = this.add.container(0, 0).setDepth(10);
    const fondo = this.pieza('ui_placa', 0, 0, BOTON, BOTON, 20);
    const icono = this.add.graphics();
    // Tarjeta de memoria con chip (dibujo simple)
    icono.fillStyle(PAPEL, 1).fillRoundedRect(-11, -14, 22, 26, 3);
    icono.lineStyle(2, TINTA, 1).strokeRoundedRect(-11, -14, 22, 26, 3);
    icono.fillStyle(0x5ec8f2, 1).fillRect(-6, -9, 12, 8);
    icono.lineStyle(1.5, TINTA, 1).strokeRect(-6, -9, 12, 8);
    icono.lineBetween(-6, 4, 6, 4).lineBetween(-6, 8, 3, 8);
    this.contador = texto(this, 0, BOTON / 2 + 2, '', { fontSize: '14px', fontStyle: 'bold', color: LUZ_TXT,
      stroke: TINTA_TXT, strokeThickness: 4 }).setOrigin(0.5, 0);
    this.insignia = this.add.container(BOTON / 2 - 4, -BOTON / 2 + 4, [
      this.add.circle(0, 0, 11, SELLO).setStrokeStyle(2, TINTA),
      texto(this, 0, 0, '¡!', { fontSize: '14px', fontStyle: 'bold', color: LUZ_TXT }).setOrigin(0.5),
    ]).setVisible(false);
    c.add([fondo, icono, this.contador, this.insignia]);
    c.setSize(BOTON, BOTON).setInteractive({ useHandCursor: true });
    c.on('pointerdown', (p, x, y, ev) => { ev.stopPropagation(); this.alternar(); });
    c.on('pointerover', () => c.setScale(1.06));
    c.on('pointerout', () => c.setScale(1));
    this.boton = c;
  }

  colocarBoton() {
    const { width: w, height: h } = this.scale;
    this.boton.setPosition(w - BOTON / 2 - 16, h - BOTON / 2 - 34);
  }

  actualizarBoton(animar) {
    const ms = this.memorias, n = ms.filter(m => m.abierto).length;
    this.contador.setText(`${n}/${ms.length}`);
    this.insignia.setVisible(this.nuevas > 0);
    if (animar) {
      this.tweens.killTweensOf(this.boton);
      this.boton.setScale(1);
      this.tweens.add({ targets: this.boton, scale: 1.25, duration: 160, yoyo: true, repeat: 2, ease: 'Sine.out' });
    }
  }

  // ---------- Abrir y cerrar ----------
  alternar() { this.abierto ? this.cerrar() : this.abrir(); }

  abrir() {
    if (control.bloqueado) return;                           // no encima de un minijuego o panel
    this.abierto = true;
    control.bloqueado = true;
    this.nuevas = 0;
    this.actualizarBoton(false);
    this.dibujar();
  }

  cerrar(devolverControl = true) {
    this.abierto = false;
    this.vista?.destroy();
    this.vista = null;
    this.capa?.destroy();
    this.capa = null;
    if (devolverControl) control.bloqueado = false;
  }

  // ---------- La hoja del álbum ----------
  dibujar() {
    this.capa?.destroy();
    const { width: W, height: H } = this.scale;
    const capa = this.add.container(0, 0).setDepth(20);
    this.capa = capa;

    // Fondo que oscurece y atrapa los toques (que no se mueva el joystick debajo)
    const velo = this.add.rectangle(0, 0, W, H, 0x070516, 0.72).setOrigin(0).setInteractive();
    velo.on('pointerdown', (p, x, y, ev) => ev.stopPropagation());
    capa.add(velo);

    const hojaW = Math.min(W - 24, 760), hojaH = Math.min(H - 24, hojaW >= 600 ? 560 : 860);
    const cx = W / 2, cy = H / 2;
    capa.add(this.pieza('ui_papel', cx, cy, hojaW, hojaH, 30));

    const ms = this.memorias, abiertas = ms.filter(m => m.abierto).length;
    const arriba = cy - hojaH / 2;
    capa.add(texto(this, cx, arriba + 22, 'Archivos de memoria de P.I.E.D.R.A', {
      fontSize: hojaW < 420 ? '19px' : '22px', fontStyle: 'bold', color: TINTA_TXT }).setOrigin(0.5, 0));
    if (ms.length <= 8) capa.add(texto(this, cx, arriba + 52, `Abiertos: ${abiertas} de ${ms.length}`, {
      fontSize: '16px', color: TINTA_TXT }).setOrigin(0.5, 0));
    const angosta = hojaW < 520;                              // en el teléfono el sello baja para no tapar el título
    capa.add(texto(this, cx + hojaW / 2 - (angosta ? 18 : 24), arriba + (angosta ? 52 : 20), 'ARCHIVO', {
      fontSize: '14px', fontStyle: 'bold', color: SELLO_TXT, letterSpacing: 2 }).setOrigin(1, 0).setAngle(-8));

    // Rejilla de tarjetas: 4 columnas si cabe, si no 2; 8 tarjetas por página
    const cols = hojaW >= 600 ? 4 : 2, porPagina = 8, filas = porPagina / cols;
    const paginas = Math.ceil(ms.length / porPagina);
    this.pagina = Phaser.Math.Clamp(this.pagina ?? 0, 0, paginas - 1);
    const visibles = ms.slice(this.pagina * porPagina, (this.pagina + 1) * porPagina);
    const margen = 16, sep = 10;
    const zonaArriba = arriba + 84, zonaAbajo = cy + hojaH / 2 - 64;
    const cw = (hojaW - margen * 2 - sep * (cols - 1)) / cols;
    const ch = Math.min(190, (zonaAbajo - zonaArriba - sep * (filas - 1)) / filas);
    const x0 = cx - hojaW / 2 + margen, y0 = zonaArriba;
    visibles.forEach((m, i) => {
      const x = x0 + (i % cols) * (cw + sep), y = y0 + Math.floor(i / cols) * (ch + sep);
      capa.add(this.tarjeta(m, x, y, cw, ch));
    });

    // Páginas: ‹ 1 / 2 ›
    if (paginas > 1) {
      const yp = cy + hojaH / 2 - 34;
      const flecha = (dx, t, destino) => {
        const b = this.add.container(cx + dx, yp);
        b.add([this.pieza('ui_placa', 0, 0, 52, 44, 20), texto(this, 0, 0, t, { fontSize: '20px', fontStyle: 'bold', color: LUZ_TXT }).setOrigin(0.5)]);
        b.setSize(52, 44).setInteractive({ useHandCursor: true }).setAlpha(destino === this.pagina ? 0.35 : 1);
        b.on('pointerdown', (p, x, y, ev) => { ev.stopPropagation(); if (destino !== this.pagina) { this.pagina = destino; this.dibujar(); } });
        capa.add(b);
      };
      flecha(-150, '‹', Math.max(0, this.pagina - 1));
      flecha(150, '›', Math.min(paginas - 1, this.pagina + 1));
      capa.add(texto(this, cx, arriba + 52, `Abiertos: ${abiertas} de ${ms.length}  ·  página ${this.pagina + 1} de ${paginas}`, {
        fontSize: '16px', color: TINTA_TXT }).setOrigin(0.5, 0));
    }

    // Botón Cerrar (48 px de alto)
    const cerrar = this.add.container(cx, cy + hojaH / 2 - 34);
    cerrar.add([this.pieza('ui_placa', 0, 0, 170, 44, 20),
      texto(this, 0, 0, 'Cerrar  ·  R', { fontSize: '16px', fontStyle: 'bold', color: LUZ_TXT }).setOrigin(0.5)]);
    cerrar.setSize(170, 44).setInteractive({ useHandCursor: true });
    cerrar.on('pointerdown', (p, x, y, ev) => { ev.stopPropagation(); this.cerrar(); });
    capa.add(cerrar);
  }

  // Una tarjeta abierta en grande, con todo el texto a 16 px o más
  detalle(m) {
    this.vista?.destroy();
    const { width: W, height: H } = this.scale;
    const v = this.add.container(0, 0).setDepth(30);
    this.vista = v;
    const velo = this.add.rectangle(0, 0, W, H, 0x070516, 0.55).setOrigin(0).setInteractive();
    const cerrar = (p, x, y, ev) => { ev?.stopPropagation(); v.destroy(); this.vista = null; };
    velo.on('pointerdown', cerrar);
    const w = Math.min(W - 40, 460), cx = W / 2;
    const num = texto(this, 0, 0, [`#${String(m.numero).padStart(2, '0')}`, m.año, m.lugar].filter(Boolean).join('  ·  '),
      { fontSize: '16px', fontStyle: 'bold', color: SELLO_TXT, wordWrap: { width: w - 40 } });
    const tit = texto(this, 0, 0, m.titulo, { fontSize: '20px', fontStyle: 'bold', color: TINTA_TXT, wordWrap: { width: w - 40 } });
    const dat = texto(this, 0, 0, m.dato, { fontSize: '17px', color: TINTA_TXT, wordWrap: { width: w - 40 }, lineSpacing: 4 });
    const pie = texto(this, 0, 0, 'Toca para cerrar', { fontSize: '14px', color: TINTA_TXT }).setAlpha(0.7);
    // La ilustración del recuerdo (holograma), en una pantallita oscura
    const ilW = w - 40, ilH = Math.min(Math.round(ilW * 9 / 16), Math.max(0, H - 330));
    const conIlustracion = ilH >= 90;
    const h = 28 + (conIlustracion ? ilH + 14 : 0) + num.height + 8 + tit.height + 12 + dat.height + 18 + pie.height + 20;
    const top = H / 2 - h / 2;
    let y = top + 24;
    const pantalla = this.add.graphics();
    const clave = `recuerdo_${m.id}`;
    const yIl = y;
    if (conIlustracion) {
      pantalla.fillStyle(0x06141f, 1).fillRoundedRect(cx - ilW / 2, y, ilW, ilH, 8);
      pantalla.lineStyle(2, TINTA, 1).strokeRoundedRect(cx - ilW / 2, y, ilW, ilH, 8);
      y += ilH + 14;
    }
    // la ilustración va encima de la pantallita (se añade al final del contenedor)
    const poner = () => {
      if (this.vista !== v || !this.textures.exists(clave)) return;
      const imagen = this.add.image(cx, yIl + ilH / 2, clave);
      imagen.setScale(Math.min((ilW - 8) / imagen.width, (ilH - 8) / imagen.height));
      v.add(imagen);
    };
    for (const [t, sep] of [[num, 8], [tit, 12], [dat, 18], [pie, 0]]) { t.setPosition(cx - w / 2 + 20, y); y += t.height + sep; }
    const papel = this.pieza('ui_papel', cx, H / 2, w, h, 30);
    papel.setInteractive?.(); papel.on?.('pointerdown', cerrar);
    v.add([velo, papel, pantalla, num, tit, dat, pie]);
    if (conIlustracion) { if (this.textures.exists(clave)) poner(); else cargas.asegurar(`recuerdo:${m.id}`).then(poner); }
  }

  tarjeta(m, x, y, w, h) {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    const pequeña = w < 170;
    const tamTitulo = pequeña ? '15px' : '16px', tamTexto = '14px';
    if (m.abierto) {
      g.fillStyle(PAPEL_OSC, 1).fillRoundedRect(0, 0, w, h, 6);
      g.lineStyle(2, TINTA, 1).strokeRoundedRect(0, 0, w, h, 6);
      c.add(g);
      // en la tarjeta solo el número y el año (el lugar no cabe: se ve al abrirla)
      c.add(texto(this, 10, 8, `#${String(m.numero).padStart(2, '0')}${m.año ? `  ·  ${m.año}` : ''}`, {
        fontSize: '14px', fontStyle: 'bold', color: SELLO_TXT }));
      const titulo = texto(this, 10, 28, m.titulo, { fontSize: tamTitulo, fontStyle: 'bold', color: TINTA_TXT,
        wordWrap: { width: w - 20 }, lineSpacing: 1 });
      c.add(titulo);
      const dato = texto(this, 10, 32 + titulo.height, m.dato, { fontSize: tamTexto, color: TINTA_TXT,
        wordWrap: { width: w - 20 }, lineSpacing: 2 });
      if (dato.y + dato.height > h - 6) {                    // no cabe: tocar para leerlo en grande
        dato.destroy();
        c.add(texto(this, 10, Math.min(h - 26, 34 + titulo.height), 'Toca para leer ›', { fontSize: '14px', fontStyle: 'bold', color: SELLO_TXT }));
      } else c.add(dato);
      c.setSize(w, h).setInteractive(new Phaser.Geom.Rectangle(w / 2, h / 2, w, h), Phaser.Geom.Rectangle.Contains);
      c.input.cursor = 'pointer';
      c.on('pointerdown', (p, x, y, ev) => { ev.stopPropagation(); this.detalle(m); });
    } else {
      g.fillStyle(CERRADO, 1).fillRoundedRect(0, 0, w, h, 6);
      g.lineStyle(2, TINTA, 1).strokeRoundedRect(0, 0, w, h, 6);
      // Candado dibujado (forma, no solo color)
      const lx = w / 2, ly = h * 0.36;
      g.lineStyle(3, 0xb0acf4, 1).strokeCircle(lx, ly - 8, 8);
      g.fillStyle(0xb0acf4, 1).fillRoundedRect(lx - 12, ly - 6, 24, 18, 3);
      g.fillStyle(CERRADO, 1).fillCircle(lx, ly + 2, 2.5).fillRect(lx - 1, ly + 2, 2, 5);
      c.add(g);
      c.add(texto(this, 10, 8, `#${String(m.numero).padStart(2, '0')}  ???`, { fontSize: '14px', fontStyle: 'bold', color: LUZ_TXT }));
      c.add(texto(this, w / 2, h * 0.36 + 22, `Pista: ${m.pista}`, { fontSize: tamTexto, color: LUZ_TXT, align: 'center',
        wordWrap: { width: w - 16 } }).setOrigin(0.5, 0));
    }
    return c;
  }
}
