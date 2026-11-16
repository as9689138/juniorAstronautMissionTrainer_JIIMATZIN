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
import { GameState } from '../mecanicas/estado.js';

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
    this.boton.setVisible(this.alFinal());              // el botón de la esquina aparece solo al final
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
  // Los reportes de avance se ven solo al final de la misión (pantalla final: «VER LO QUE APRENDÍ»)
  alFinal() { return GameState.fase === 'FIN'; }

  alternar() { this.abierto ? this.cerrar() : this.abrir(); }

  /** forzar: abrir aunque haya otra pantalla (la pantalla final) */
  abrir(forzar = false) {
    if (!forzar && !this.alFinal()) return;          // durante la misión no se abre (ni con P)
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

  // Vista del niño. Todo se mide con el alto disponible (en un teléfono pequeño en horizontal, 320 px): las filas
  // reparten el hueco que queda entre el título y la frase de P.I.E.D.R.A; si no hay sitio, se quitan las líneas
  // secundarias (subtítulo, explicación de cada tema) y la fila pasa a una sola línea.
  vistaNino(capa, cx, arriba, izq, hojaW, hojaH) {
    const bajo = hojaH < 420;
    const titulo = texto(this, cx, arriba + (bajo ? 14 : 20), 'Lo que estás aprendiendo', { fontSize: hojaW < 420 || bajo ? '20px' : '24px',
      fontStyle: 'bold', color: TINTA_TXT }).setOrigin(0.5, 0);
    capa.add(titulo);
    let y0 = titulo.y + titulo.height + 6;
    if (!bajo) {
      const sub = texto(this, cx, y0, 'P.I.E.D.R.A lo ve en lo que haces: minijuegos, energía y emergencias', {
        fontSize: '14px', color: TINTA_TXT, align: 'center', wordWrap: { width: hojaW - 40 } }).setOrigin(0.5, 0).setAlpha(0.8);
      capa.add(sub);
      y0 = sub.y + sub.height + 10;
    }
    const r = guia.rastreador;
    // lo que dice la IA (se mide antes, para saber cuánto alto les queda a las filas)
    const flojo = r.masFlojo();
    const fraseTxt = r.pruebas.length
      ? (r.dominio[flojo] < 0.7 ? `P.I.E.D.R.A: «Practiquemos ${SOBRE[flojo]}: ahí te daré pistas y más tiempo.»` : 'P.I.E.D.R.A: «¡Vas muy bien en todo! Ahora te doy menos pistas.»')
      : 'P.I.E.D.R.A: «Todavía no hay pruebas: juega un minijuego o reparte la energía.»';
    const frase = texto(this, cx, 0, fraseTxt, { fontSize: bajo ? '14px' : '15px', fontStyle: 'bold', color: TINTA_TXT, align: 'center',
      wordWrap: { width: hojaW - 40 } }).setOrigin(0.5, 0);
    const yb = arriba + hojaH - 32;                      // centro de los botones (44 px de alto)
    const yFrase = yb - 22 - 6 - frase.height;
    frase.setY(yFrase);
    const filaH = Math.max(32, Math.min(92, (yFrase - 6 - y0) / 4));
    const comoda = filaH >= 64;                          // cabe el nombre y, debajo, su explicación o su nivel
    const angosta = hojaW < 480;
    const g = this.add.graphics();
    capa.add(g);
    Object.keys(TEMAS).forEach((tema, i) => {
      const y = y0 + i * filaH, n = r.nivel(tema), alto = filaH - 6, cy = y + alto / 2;
      g.fillStyle(PAPEL_OSC, 1).fillRoundedRect(izq + 16, y, hojaW - 32, alto, 8);
      g.lineStyle(2, TINTA, 1).strokeRoundedRect(izq + 16, y, hojaW - 32, alto, 8);
      const s = Math.min(1, (alto - 6) / 42);           // el dibujo del tema se encoge con la fila
      const ico = this.add.graphics({ x: izq + 22 + 21 * s, y: cy }).setScale(s);
      this.icono(ico, tema, 0, 0);
      capa.add(ico);
      const xt = izq + 30 + 42 * s;
      // estrellas (a la derecha) y la palabra del nivel
      const rE = comoda ? 11 : Math.min(10, alto / 2 - 4), paso = rE * 2.6;
      const anchoNivel = angosta ? 0 : 120;              // en angosta el nivel va en la línea de abajo (o solo estrellas)
      const ex = izq + hojaW - 24 - anchoNivel - paso * 3 - rE;
      if (comoda) {
        capa.add(texto(this, xt, y + 8, TEMAS[tema].nombre, { fontSize: '18px', fontStyle: 'bold', color: TINTA_TXT }));
        const det = texto(this, xt, y + 32, angosta ? n.texto : TEMAS[tema].explica, { fontSize: '14px', color: TINTA_TXT,
          wordWrap: { width: Math.max(80, ex - rE - 12 - xt) } }).setAlpha(0.85);
        if (det.y + det.height <= y + alto - 2) capa.add(det); else det.destroy();     // si no cabe, fuera
      } else {
        capa.add(texto(this, xt, cy, TEMAS[tema].nombre, { fontSize: '16px', fontStyle: 'bold', color: TINTA_TXT }).setOrigin(0, 0.5));
      }
      const ey = comoda ? y + 26 : cy;
      for (let k = 0; k < 4; k++) this.estrella(g, ex + k * paso, ey, rE, k < n.estrellas);
      if (anchoNivel) {
        capa.add(texto(this, ex + paso * 3 + rE + 8, comoda ? ey + 18 : cy, n.texto, { fontSize: '14px', fontStyle: 'bold', color: SELLO_TXT,
          wordWrap: { width: anchoNivel - 4 } }).setOrigin(comoda ? 1 : 0, comoda ? 0 : 0.5).setX(comoda ? izq + hojaW - 24 : ex + paso * 3 + rE + 8));
      }
    });
    capa.add(frase);
    const anchoB = Math.min(170, (hojaW - 50) / 2);
    this.botonPapel(capa, cx - anchoB / 2 - 8, yb, anchoB, 'Para adultos', () => { this.vista = 'adulto'; this.pagina = 0; this.dibujar(); });
    this.botonPapel(capa, cx + anchoB / 2 + 8, yb, anchoB, 'Cerrar · P', () => this.cerrar());
  }

  // Vista del adulto. El contenido (los cuatro temas, cómo se mide y el código anónimo) se reparte en páginas del alto
  // que haya entre la cabecera y los botones: en un teléfono pequeño son varias (‹ 1/3 ›), en un monitor cabe en una.
  vistaAdulto(capa, cx, arriba, izq, hojaW, hojaH) {
    const rep = guia.reporte();
    const bajo = hojaH < 420;
    const titulo = texto(this, cx, arriba + (bajo ? 14 : 20), 'Reporte para el adulto', { fontSize: bajo ? '20px' : '22px', fontStyle: 'bold', color: TINTA_TXT })
      .setOrigin(0.5, 0);
    const sub = texto(this, cx, titulo.y + titulo.height + 4, `Personaje: ${nombrePj(rep.partida?.personaje)} · Sol ${rep.soles} de 10 · ${rep.pruebas.length} pruebas registradas`,
      { fontSize: '14px', color: TINTA_TXT, align: 'center', wordWrap: { width: hojaW - 40 } }).setOrigin(0.5, 0);
    capa.add([titulo, sub]);
    const yb = arriba + hojaH - 32;
    const yIni = sub.y + sub.height + 10, yFin = yb - 22 - 8, bw = hojaW - 48, x = izq + 24;
    const pct = v => `${Math.round(v * 100)} %`;
    // Bloques (se crean en y = 0 y se colocan al paginar)
    const bloques = rep.temas.map(t => {
      const tipos = Object.entries(t.porTipo).filter(([, v]) => v.total).map(([k, v]) => `${idioma.t(TIPO[k])} ${v.aciertos}/${v.total}`).join(' · ')
        || idioma.t('sin pruebas aún');
      const avance = t.inicio != null ? `   ${idioma.t('Aciertos: al inicio {a} → al final {b}', { a: pct(t.inicio), b: pct(t.final) })}` : '';
      const c = this.add.container(x, 0);
      const tit = texto(this, 0, 0, `${t.nombre}: dominio estimado ${pct(t.dominio)} (${t.nivel.texto})`, { fontSize: '16px', fontStyle: 'bold',
        color: TINTA_TXT, wordWrap: { width: bw } });
      const det = texto(this, 0, tit.height + 2, `${tipos}${avance}`, { fontSize: '14px', color: TINTA_TXT, wordWrap: { width: bw } }).setAlpha(0.85);
      const by = det.y + det.height + 4;
      const g = this.add.graphics();                    // barra de dominio
      g.fillStyle(PAPEL_OSC, 1).fillRect(0, by, bw, 8).fillStyle(COLOR_TEMA[t.tema], 1).fillRect(0, by, bw * t.dominio, 8);
      g.lineStyle(1.5, TINTA, 1).strokeRect(0, by, bw, 8);
      c.add([tit, det, g]);
      c.alto = by + 8;
      return c;
    });
    const parrafo = (t, alfa) => {
      const c = this.add.container(x, 0);
      const tx = texto(this, 0, 0, t, { fontSize: '14px', color: TINTA_TXT, wordWrap: { width: bw } }).setAlpha(alfa);
      c.add(tx); c.alto = tx.height;
      return c;
    };
    bloques.push(parrafo('Cómo se mide: Bayesian Knowledge Tracing. Con cada prueba (minijuego, reparto de energía, decisión de emergencia) se actualiza la probabilidad de que domine el tema. Las pruebas con pista cuentan menos. Se guarda de forma anónima, sin nombres, para que el equipo estudie cómo se aprende con el juego.', 0.8));
    bloques.push(parrafo(idioma.t('Código anónimo de este dispositivo: {c}', { c: guia.jugador }), 0.7));
    // Páginas: tantos bloques como quepan entre yIni y yFin
    const paginas = [[]];
    let usado = 0;
    for (const b of bloques) {
      const sep = paginas.at(-1).length ? 10 : 0;
      if (paginas.at(-1).length && usado + sep + b.alto > yFin - yIni) { paginas.push([]); usado = 0; }
      const p = paginas.at(-1);
      b.y = yIni + usado + (p.length ? 10 : 0);
      usado = b.y - yIni + b.alto;
      p.push(b);
    }
    this.pagina = Phaser.Math.Clamp(this.pagina ?? 0, 0, paginas.length - 1);
    paginas.forEach((p, i) => p.forEach(b => (i === this.pagina ? capa.add(b) : b.destroy())));
    // Botones: Descargar · Volver · Cerrar y, si hay varias páginas, ‹ n/m ›
    const varias = paginas.length > 1;
    const flecha = varias ? 48 : 0;
    const ancho = Math.min(190, (hojaW - 40 - (varias ? 2 * (flecha + 8) : 0) - 20) / 3);
    const total = 3 * ancho + 20 + (varias ? 2 * (flecha + 8) : 0);
    let bx = cx - total / 2;
    const ir = d => { this.pagina += d; this.dibujar(); };
    if (varias) {
      const b = this.botonPapel(capa, bx + flecha / 2, yb, flecha, '‹', () => this.pagina > 0 && ir(-1));
      b.setAlpha(this.pagina > 0 ? 1 : 0.4); b.list[1].setFontSize(28);
      bx += flecha + 8;
    }
    this.botonPapel(capa, bx + ancho / 2, yb, ancho, 'Descargar', () => guia.descargarReporte());
    this.botonPapel(capa, bx + ancho * 1.5 + 10, yb, ancho, 'Volver', () => { this.vista = 'nino'; this.pagina = 0; this.dibujar(); });
    this.botonPapel(capa, bx + ancho * 2.5 + 20, yb, ancho, 'Cerrar', () => this.cerrar());
    if (varias) {
      const b = this.botonPapel(capa, bx + 3 * ancho + 20 + 8 + flecha / 2, yb, flecha, '›', () => this.pagina < paginas.length - 1 && ir(1));
      b.setAlpha(this.pagina < paginas.length - 1 ? 1 : 0.4); b.list[1].setFontSize(28);
      capa.add(texto(this, izq + hojaW - 20, titulo.y + 4, `${this.pagina + 1}/${paginas.length}`, { fontSize: '14px', fontStyle: 'bold', color: SELLO_TXT })
        .setOrigin(1, 0));
    }
  }
}
