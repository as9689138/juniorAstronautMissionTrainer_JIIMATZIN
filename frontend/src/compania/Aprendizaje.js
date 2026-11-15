// Panel "Lo que estás aprendiendo" de la IA guía (src/compania/guia.js), encima de la Interfaz, como el álbum.
//  - Para el niño: cada tema con su dibujo, estrellas (1 a 4) y una palabra («Aprendiendo», «¡Casi lo dominas!»),
//    sin porcentajes (docs/aprendizaje.md: con dibujos y palabras, no con %), y qué practicar mañana.
//  - «Para adultos»: el dominio estimado en %, aciertos por tipo de prueba, cómo cambió y el botón para descargar el
//    reporte (.txt). Cómo se mide: Bayesian Knowledge Tracing (src/ml/aprendizaje.js).
// Se abre con el botón de la esquina (junto al álbum) o con la tecla P; se cierra con P, Esc o Cerrar.
import { bus, EV, control } from '../motor/eventos.js';
import { guia } from './guia.js';
import { TEMAS } from '../ml/aprendizaje.js';
import { idioma } from '../motor/idioma.js';

const FUENTE = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
const TINTA = 0x141026, TINTA_TXT = '#141026', LUZ_TXT = '#f3e3c3', SELLO_TXT = '#b8473d';
const PAPEL_OSC = 0xe2cfb2, AMARILLO = 0xffc83d;
const T = 0.5;
const BOTON = 52;
const COLOR_TEMA = { energia: 0xffc83d, aire: 0x5ec8f2, escudo: 0xb58cff, decidir: 0x7cf0a0 };
const SOBRE = { energia: 'la energía', aire: 'el aire', escudo: 'el escudo', decidir: 'a decidir con datos' };
const nombrePj = p => (p ? p.charAt(0).toUpperCase() + p.slice(1) : '—');
const TIPO = { minijuego: 'minijuegos', consola: 'consola', emergencia: 'emergencias', consolaConPista: 'consola con pista',
  emergenciaConPista: 'emergencias con pista' };

const texto = (e, x, y, t, estilo) => e.add.text(x, y, t, { fontFamily: FUENTE, resolution: 2, ...estilo });

export default class Aprendizaje extends Phaser.Scene {
  constructor() { super('Aprendizaje'); }

  create() {
    this.abierto = false;
    this.vista = 'nino';
    this.crearBoton();
    this.input.keyboard.addKey('P').on('down', () => this.alternar());
    this.input.keyboard.addKey('ESC').on('down', () => this.abierto && this.cerrar());
    const alAprender = a => { if (a?.subio) this.avisarBoton(); if (this.abierto) this.dibujar(); };
    const alCerrarPanel = () => this.abierto && !this.forzado && this.cerrar(false);
    bus.on(EV.APRENDIZAJE, alAprender);
    bus.on(EV.CERRAR_PANEL, alCerrarPanel);
    const alRedim = () => { this.colocarBoton(); if (this.abierto) this.dibujar(); };
    this.scale.on('resize', alRedim);
    this.events.once('shutdown', () => { bus.off(EV.APRENDIZAJE, alAprender); bus.off(EV.CERRAR_PANEL, alCerrarPanel); this.scale.off('resize', alRedim); });
    this.colocarBoton();
  }

  pieza(clave, x, y, w, h, borde = 26) {
    if (this.textures.exists(clave)) return this.add.nineslice(x, y, clave, undefined, w / T, h / T, borde, borde, borde, borde).setScale(T);
    const g = this.add.graphics({ x, y });
    g.fillStyle(clave === 'ui_papel' ? 0xf3e3c3 : 0x3a366e, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    g.lineStyle(2, TINTA, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    return g;
  }

  // ---------- Botón de la esquina (a la izquierda del álbum) ----------
  crearBoton() {
    const c = this.add.container(0, 0).setDepth(10);
    const icono = this.add.graphics();
    this.estrella(icono, 0, -4, 13, true);
    const etiqueta = texto(this, 0, BOTON / 2 + 2, 'Avance', { fontSize: '14px', fontStyle: 'bold', color: LUZ_TXT,
      stroke: TINTA_TXT, strokeThickness: 4 }).setOrigin(0.5, 0);
    this.insignia = this.add.circle(BOTON / 2 - 4, -BOTON / 2 + 4, 9, 0xb8473d).setStrokeStyle(2, TINTA).setVisible(false);
    c.add([this.pieza('ui_placa', 0, 0, BOTON, BOTON, 20), icono, etiqueta, this.insignia]);
    c.setSize(BOTON, BOTON).setInteractive({ useHandCursor: true });
    c.on('pointerdown', (p, x, y, ev) => { ev.stopPropagation(); this.alternar(); });
    c.on('pointerover', () => c.setScale(1.06));
    c.on('pointerout', () => c.setScale(1));
    this.boton = c;
  }

  colocarBoton() {
    const { width: w, height: h } = this.scale;
    this.boton.setPosition(w - BOTON * 1.5 - 16 - 12, h - BOTON / 2 - 34);
  }

  avisarBoton() {
    this.insignia.setVisible(true);
    this.tweens.killTweensOf(this.boton);
    this.boton.setScale(1);
    this.tweens.add({ targets: this.boton, scale: 1.25, duration: 160, yoyo: true, repeat: 2, ease: 'Sine.out' });
  }

  // Estrella de 5 puntas (llena o vacía: se distingue por la forma, no solo por el color)
  estrella(g, x, y, r, llena) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
    }
    if (llena) g.fillStyle(AMARILLO, 1).fillPoints(pts, true);
    g.lineStyle(2, TINTA, 1).strokePoints(pts, true, true);
  }

  // Dibujo de cada tema (rayo, burbujas, escudo, balanza)
  icono(g, tema, x, y) {
    g.fillStyle(COLOR_TEMA[tema], 1).fillCircle(x, y, 20);
    g.lineStyle(2, TINTA, 1).strokeCircle(x, y, 20);
    g.fillStyle(TINTA, 1).lineStyle(2.5, TINTA, 1);
    const V = (a, b) => new Phaser.Math.Vector2(x + a, y + b);
    if (tema === 'energia') g.fillPoints([V(2, -12), V(-7, 2), V(0, 2), V(-2, 12), V(7, -2), V(0, -2)], true);
    else if (tema === 'aire') { g.strokeCircle(x - 4, y + 3, 6); g.strokeCircle(x + 6, y - 6, 4); g.fillCircle(x + 7, y + 7, 2.5); }
    else if (tema === 'escudo') g.fillPoints([V(-9, -10), V(9, -10), V(9, 0), V(0, 12), V(-9, 0)], true);
    else {                                                    // decidir: una balanza
      g.lineBetween(x, y - 11, x, y + 9).lineBetween(x - 11, y - 6, x + 11, y - 6).lineBetween(x - 6, y + 10, x + 6, y + 10);
      g.fillTriangle(x - 15, y + 3, x - 7, y + 3, x - 11, y - 6).fillTriangle(x + 7, y + 3, x + 15, y + 3, x + 11, y - 6);
    }
  }

  // ---------- Abrir y cerrar ----------
  alternar() { this.abierto ? this.cerrar() : this.abrir(); }

  /** forzar: abrir aunque haya otra pantalla (la pantalla final) */
  abrir(forzar = false) {
    if (control.bloqueado && !forzar) return;
    this.abierto = true;
    this.forzado = forzar;
    this.bloqueoPrevio = control.bloqueado;
    control.bloqueado = true;
    this.vista = 'nino';
    this.insignia.setVisible(false);
    this.scene.bringToTop();
    this.dibujar();
  }

  cerrar(devolverControl = true) {
    this.abierto = false;
    this.capa?.destroy();
    this.capa = null;
    if (devolverControl) control.bloqueado = this.forzado ? this.bloqueoPrevio : false;
    this.forzado = false;
  }

  botonPapel(capa, x, y, w, etiqueta, accion) {
    const b = this.add.container(x, y);
    b.add([this.pieza('ui_placa', 0, 0, w, 44, 20), texto(this, 0, 0, etiqueta, { fontSize: '16px', fontStyle: 'bold', color: LUZ_TXT }).setOrigin(0.5)]);
    b.setSize(w, 44).setInteractive({ useHandCursor: true });
    b.on('pointerdown', (p, px, py, ev) => { ev.stopPropagation(); accion(); });
    capa.add(b);
    return b;
  }

  dibujar() {
    this.capa?.destroy();
    const { width: W, height: H } = this.scale;
    const capa = this.capa = this.add.container(0, 0).setDepth(20);
    const velo = this.add.rectangle(0, 0, W, H, 0x070516, 0.72).setOrigin(0).setInteractive();
    velo.on('pointerdown', (p, x, y, ev) => ev.stopPropagation());
    capa.add(velo);
    const hojaW = Math.min(W - 24, 640), hojaH = Math.min(H - 24, 600);
    const cx = W / 2, cy = H / 2, arriba = cy - hojaH / 2, izq = cx - hojaW / 2;
    capa.add(this.pieza('ui_papel', cx, cy, hojaW, hojaH, 30));
    if (this.vista === 'nino') this.vistaNino(capa, cx, arriba, izq, hojaW, hojaH);
    else this.vistaAdulto(capa, cx, arriba, izq, hojaW, hojaH);
  }

  vistaNino(capa, cx, arriba, izq, hojaW, hojaH) {
    capa.add(texto(this, cx, arriba + 20, 'Lo que estás aprendiendo', { fontSize: hojaW < 420 ? '20px' : '24px', fontStyle: 'bold', color: TINTA_TXT }).setOrigin(0.5, 0));
    capa.add(texto(this, cx, arriba + 54, 'La IA de la base lo ve en lo que haces: minijuegos, energía y emergencias', {
      fontSize: '14px', color: TINTA_TXT, align: 'center', wordWrap: { width: hojaW - 40 } }).setOrigin(0.5, 0).setAlpha(0.8));
    const r = guia.rastreador;
    const filaH = Math.min(92, (hojaH - 200) / 4), y0 = arriba + 98;
    const g = this.add.graphics();
    capa.add(g);
    const angosta = hojaW < 480;
    Object.keys(TEMAS).forEach((tema, i) => {
      const y = y0 + i * filaH, n = r.nivel(tema);
      g.fillStyle(PAPEL_OSC, 1).fillRoundedRect(izq + 16, y, hojaW - 32, filaH - 8, 8);
      g.lineStyle(2, TINTA, 1).strokeRoundedRect(izq + 16, y, hojaW - 32, filaH - 8, 8);
      this.icono(g, tema, izq + 48, y + (filaH - 8) / 2);
      capa.add(texto(this, izq + 78, y + 8, TEMAS[tema].nombre, { fontSize: '18px', fontStyle: 'bold', color: TINTA_TXT }));
      capa.add(texto(this, izq + 78, y + 32, angosta ? n.texto : TEMAS[tema].explica, { fontSize: '14px', color: TINTA_TXT,
        wordWrap: { width: angosta ? hojaW - 120 : hojaW - 300 } }).setAlpha(0.85));
      // estrellas y la palabra del nivel
      const ex = angosta ? izq + 90 : izq + hojaW - 200, ey = angosta ? y + filaH - 22 : y + 26;
      for (let k = 0; k < 4; k++) this.estrella(g, ex + k * 30, ey, 11, k < n.estrellas);
      if (!angosta) capa.add(texto(this, ex - 12, ey + 18, n.texto, { fontSize: '15px', fontStyle: 'bold', color: SELLO_TXT }));
    });
    // lo que dice la IA
    const flojo = r.masFlojo();
    const frase = r.pruebas.length
      ? (r.dominio[flojo] < 0.7 ? `IA: «Practiquemos ${SOBRE[flojo]}: ahí te daré pistas y más tiempo.»` : 'IA: «¡Vas muy bien en todo! Ahora te doy menos pistas.»')
      : 'IA: «Todavía no hay pruebas: juega un minijuego o reparte la energía.»';
    capa.add(texto(this, cx, y0 + 4 * filaH + 4, frase, { fontSize: '15px', fontStyle: 'bold', color: TINTA_TXT, align: 'center',
      wordWrap: { width: hojaW - 40 } }).setOrigin(0.5, 0));
    const yb = arriba + hojaH - 34;
    this.botonPapel(capa, cx - 95, yb, 170, 'Para adultos', () => { this.vista = 'adulto'; this.dibujar(); });
    this.botonPapel(capa, cx + 95, yb, 170, 'Cerrar · P', () => this.cerrar());
  }

  vistaAdulto(capa, cx, arriba, izq, hojaW, hojaH) {
    const rep = guia.reporte();
    capa.add(texto(this, cx, arriba + 20, 'Reporte para el adulto', { fontSize: '22px', fontStyle: 'bold', color: TINTA_TXT }).setOrigin(0.5, 0));
    capa.add(texto(this, cx, arriba + 52, `Personaje: ${nombrePj(rep.partida?.personaje)} · Sol ${rep.soles} de 10 · ${rep.pruebas.length} pruebas registradas`,
      { fontSize: '14px', color: TINTA_TXT, align: 'center', wordWrap: { width: hojaW - 40 } }).setOrigin(0.5, 0));
    let y = arriba + 82;
    const pct = x => `${Math.round(x * 100)} %`;
    for (const t of rep.temas) {
      const tipos = Object.entries(t.porTipo).filter(([, v]) => v.total).map(([k, v]) => `${idioma.t(TIPO[k])} ${v.aciertos}/${v.total}`).join(' · ')
        || idioma.t('sin pruebas aún');
      const avance = t.inicio != null ? `   ${idioma.t('Aciertos: al inicio {a} → al final {b}', { a: pct(t.inicio), b: pct(t.final) })}` : '';
      const tit = texto(this, izq + 24, y, `${t.nombre}: dominio estimado ${pct(t.dominio)} (${t.nivel.texto})`, { fontSize: '16px', fontStyle: 'bold', color: TINTA_TXT,
        wordWrap: { width: hojaW - 48 } });
      const det = texto(this, izq + 24, y + tit.height + 2, `${tipos}${avance}`, { fontSize: '14px', color: TINTA_TXT, wordWrap: { width: hojaW - 48 } }).setAlpha(0.85);
      // barra de dominio
      const g = this.add.graphics();
      const bw = hojaW - 48, by = det.y + det.height + 4;
      g.fillStyle(PAPEL_OSC, 1).fillRect(izq + 24, by, bw, 8).fillStyle(COLOR_TEMA[t.tema], 1).fillRect(izq + 24, by, bw * t.dominio, 8);
      g.lineStyle(1.5, TINTA, 1).strokeRect(izq + 24, by, bw, 8);
      capa.add([tit, det, g]);
      y = by + 18;
    }
    capa.add(texto(this, izq + 24, y + 2, 'Cómo se mide: Bayesian Knowledge Tracing. Con cada prueba (minijuego, reparto de energía, decisión de emergencia) se actualiza la probabilidad de que domine el tema. Las pruebas con pista cuentan menos. Se guarda de forma anónima, sin nombres, para que el equipo estudie cómo se aprende con el juego.',
      { fontSize: '14px', color: TINTA_TXT, wordWrap: { width: hojaW - 48 } }).setAlpha(0.8));
    capa.add(texto(this, izq + 24, arriba + hojaH - 76, idioma.t('Código anónimo de este dispositivo: {c}', { c: guia.jugador }),
      { fontSize: '14px', color: TINTA_TXT, wordWrap: { width: hojaW - 48 } }).setAlpha(0.7));
    const yb = arriba + hojaH - 34;
    const ancho = Math.min(190, (hojaW - 60) / 3);
    this.botonPapel(capa, cx - ancho - 10, yb, ancho, 'Descargar', () => guia.descargarReporte());
    this.botonPapel(capa, cx, yb, ancho, 'Volver', () => { this.vista = 'nino'; this.dibujar(); });
    this.botonPapel(capa, cx + ancho + 10, yb, ancho, 'Cerrar', () => this.cerrar());
  }
}
