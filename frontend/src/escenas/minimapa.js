// Minimapa de la base (rol 1), en la capa de Interfaz.
// Tiene el mismo diseño que el mapa: la base vista en la misma perspectiva isométrica (arriba a la derecha en el
// minimapa es arriba a la derecha en la pantalla), con los colores del arte de las salas (herramientas/pintar_zonas.py):
// suelo de Marte terracota con rayas, salas como losas lavanda con sus dos muros de fondo morados, tubos que unen el
// Pasillo con cada sala y el marco de cada puerta con el color de su sistema. El marco es de papel, como la ficha del Sol.
// Encima:
//  - un dibujo en cada sala (rayo, pantalla, antena, hoja, burbujas, escudo) para reconocerla sin leer;
//  - la sala en la que estás, iluminada, y tu punto dentro de ella;
//  - la sala del objetivo, latiendo en amarillo, con una estrella en la estación;
//  - el camino punteado que lleva hasta allá (por las puertas, los tubos y el Pasillo);
//  - debajo, en letra de 14 px, a dónde ir (dónde estás ya lo dice la sala iluminada y tu punto).
// Tocarlo lo agranda (en el teléfono se lee mejor) y tocarlo otra vez lo achica.
// Lee la sala y la posición de la escena Base y el objetivo del registro: no cambia nada del juego.
import { COLOR_SISTEMA } from '../motor/config.js';
import { cargas, ZONA_INICIAL } from '../motor/cargas.js';

const K = 7.5;                         // px por casilla del esquema (pequeñito: es una guía, no tapa el juego)
const ANCHO_SALA = 3.5, ALTO_SALA = 2.5, ALTO_PASILLO = 2.2, HUECO = 0.6;
const ALTO_MURO = 5, GROSOR = 2.5;      // px: muros de fondo y canto de la losa
const MARGEN = 8;                       // px de papel alrededor de la ventana del mapa
// Colores tomados del arte de las salas (pasillo_fondo.jpg)
const P = {
  suelo: 0xae6641, rayas: 0x96553a, sombra: 0x58312a,
  piso: 0x8e86d3, pisoAqui: 0xc9c2f2, losetas: 0x6f67b8,
  muroN: 0x746cc1, muroO: 0x5b54a4, remate: 0xaba4e8, losa: 0x3f377e,
  tuboArriba: 0x9a92dc, tuboLado: 0x5e57a9, hueco: 0x241d4a, tinta: 0x2a2350,
};
const AMARILLO = 0xffc83d, TINTA = 0x141026;
const FUENTE = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
const NOMBRES = { pasillo: 'Pasillo', energia: 'Energía', mando: 'Mando', comunicaciones: 'Comunicaciones',
  invernadero: 'Invernadero', soporte: 'Soporte vital', refugio: 'Refugio' };
const COLOR_DE = { energia: COLOR_SISTEMA.energia, mando: COLOR_SISTEMA.mando, comunicaciones: COLOR_SISTEMA.comunicaciones,
  invernadero: COLOR_SISTEMA.oxigeno, soporte: COLOR_SISTEMA.oxigeno, refugio: COLOR_SISTEMA.blindaje, pasillo: 0xb0acf4 };

// casilla del esquema -> px (misma proyección 2:1 que el mapa)
const iso = (c, r) => ({ x: (c - r) * K, y: (c + r) * K / 2 });

export default class Minimapa {
  constructor(escena) {
    this.e = escena;
    this.cont = escena.add.container(0, 0).setDepth(5);
    this.fondo = escena.add.nineslice(0, 0, 'ui_papel', undefined, 10, 10, 30, 30, 30, 30).setScale(0.5).setOrigin(0);
    this.ventana = escena.add.graphics();     // el suelo de Marte (se dibuja una vez)
    this.salas = escena.add.graphics();       // la base: se redibuja solo al cambiar de sala u objetivo
    this.vivo = escena.add.graphics();        // camino, latido y tu punto: cada cuadro
    const estilo = { fontFamily: FUENTE, fontSize: '14px', fontStyle: 'bold', resolution: 2 };
    this.txtAqui = escena.add.text(0, 0, '', { ...estilo, color: '#141026' });
    this.txtIr = escena.add.text(0, 0, '', { ...estilo, color: '#b8473d' });
    this.cont.add([this.fondo, this.ventana, this.salas, this.vivo, this.txtAqui, this.txtIr]);
    this.grande = false;
    this.clave = null;
    this.cont.setSize(10, 10);
    this.esquema = null;
  }

  // Rectángulos del esquema a partir de zonas.json: el Pasillo y una sala junto a cada una de sus puertas
  armarEsquema(zonas) {
    const pas = zonas[ZONA_INICIAL];
    if (!pas) return null;
    const salas = { [pas.id]: { id: pas.id, c0: 0, r0: 0, w: pas.cols, h: ALTO_PASILLO, z: pas } };
    for (const p of pas.puertas) {
      const z = zonas[p.destino];
      if (!z) continue;
      const centro = p.pos + 0.5;
      const s = { id: z.id, z, w: ANCHO_SALA, h: ALTO_SALA, lado: p.lado, centro };
      if (p.lado === 'n') Object.assign(s, { c0: centro - ANCHO_SALA / 2, r0: -HUECO - ALTO_SALA, puerta: [[centro, -HUECO], [centro, 0]] });
      else if (p.lado === 's') Object.assign(s, { c0: centro - ANCHO_SALA / 2, r0: ALTO_PASILLO + HUECO, puerta: [[centro, ALTO_PASILLO + HUECO], [centro, ALTO_PASILLO]] });
      else continue;                                    // la base solo tiene puertas al norte y al sur del Pasillo
      salas[z.id] = s;
    }
    // límites en px (con la altura de los muros arriba y el canto de la losa abajo)
    const pts = Object.values(salas).flatMap(s => [iso(s.c0, s.r0), iso(s.c0 + s.w, s.r0), iso(s.c0 + s.w, s.r0 + s.h), iso(s.c0, s.r0 + s.h)]);
    const minX = Math.min(...pts.map(p => p.x)), maxX = Math.max(...pts.map(p => p.x));
    const minY = Math.min(...pts.map(p => p.y)) - ALTO_MURO, maxY = Math.max(...pts.map(p => p.y)) + GROSOR + 4;
    return { salas, minX, minY, ancho: maxX - minX, alto: maxY - minY };
  }

  // Casilla de la sala real (c, r) -> casilla del esquema
  aEsquema(s, c, r) {
    const z = s.z;
    return [s.c0 + Phaser.Math.Clamp(c / z.cols, 0, 1) * s.w, s.r0 + Phaser.Math.Clamp(r / z.rows, 0, 1) * s.h];
  }

  // px del minimapa (dentro de la ventana de suelo)
  px([c, r], dy = 0) {
    const p = iso(c, r);
    return { x: p.x - this.esquema.minX + MARGEN + 8, y: p.y - this.esquema.minY + MARGEN + 6 + dy };
  }

  v(c, r, dy = 0) { const p = this.px([c, r], dy); return new Phaser.Math.Vector2(p.x, p.y); }

  poligono(s, dy = 0) {
    return [this.v(s.c0, s.r0, dy), this.v(s.c0 + s.w, s.r0, dy), this.v(s.c0 + s.w, s.r0 + s.h, dy), this.v(s.c0, s.r0 + s.h, dy)];
  }

  // El suelo de Marte con sus rayas en diagonal, como en el mapa
  dibujarVentana() {
    const g = this.ventana.clear();
    const x0 = MARGEN, y0 = MARGEN, w = this.ancho - MARGEN * 2, h = this.altoMapa - MARGEN;
    g.fillStyle(P.suelo, 1).fillRoundedRect(x0, y0, w, h, 6);
    g.lineStyle(1, P.rayas, 0.7);
    for (let k = -h * 2; k < w; k += 7) {                  // rayas de pendiente 1/2 (la del suelo isométrico), recortadas
      let ax = x0 + k, ay = y0, bx = ax + h * 2, by = y0 + h;
      if (ax < x0) { ay += (x0 - ax) / 2; ax = x0; }
      if (bx > x0 + w) { by -= (bx - x0 - w) / 2; bx = x0 + w; }
      if (ay < by) g.lineBetween(ax, ay, bx, by);
    }
    g.lineStyle(2, TINTA, 1).strokeRoundedRect(x0, y0, w, h, 6);
  }

  // Una sala como en el mapa: sombra, canto de la losa, piso con losetas, dos muros de fondo y su remate
  sala(g, s, aqui) {
    const { c0, r0, w, h } = s;
    g.fillStyle(P.sombra, 0.45).fillPoints(this.poligono(s, GROSOR + 3).map(p => p.add(new Phaser.Math.Vector2(4, 0))), true);
    // canto de la losa (las dos caras de delante)
    g.fillStyle(P.losa, 1)
      .fillPoints([this.v(c0, r0 + h), this.v(c0 + w, r0 + h), this.v(c0 + w, r0 + h, GROSOR), this.v(c0, r0 + h, GROSOR)], true)
      .fillPoints([this.v(c0 + w, r0), this.v(c0 + w, r0 + h), this.v(c0 + w, r0 + h, GROSOR), this.v(c0 + w, r0, GROSOR)], true);
    // piso
    g.fillStyle(aqui ? P.pisoAqui : P.piso, 1).fillPoints(this.poligono(s), true);
    g.lineStyle(1, P.losetas, 0.45);
    for (let k = 1; k < w; k++) g.lineBetween(this.v(c0 + k, r0).x, this.v(c0 + k, r0).y, this.v(c0 + k, r0 + h).x, this.v(c0 + k, r0 + h).y);
    for (let k = 1; k < h; k++) g.lineBetween(this.v(c0, r0 + k).x, this.v(c0, r0 + k).y, this.v(c0 + w, r0 + k).x, this.v(c0 + w, r0 + k).y);
    // muros de fondo: el de arriba a la derecha (norte) y el de arriba a la izquierda (oeste)
    g.fillStyle(P.muroN, 1).fillPoints([this.v(c0, r0), this.v(c0 + w, r0), this.v(c0 + w, r0, -ALTO_MURO), this.v(c0, r0, -ALTO_MURO)], true);
    g.fillStyle(P.muroO, 1).fillPoints([this.v(c0, r0), this.v(c0, r0 + h), this.v(c0, r0 + h, -ALTO_MURO), this.v(c0, r0, -ALTO_MURO)], true);
    g.lineStyle(1.5, P.remate, 1)
      .lineBetween(this.v(c0, r0 + h, -ALTO_MURO).x, this.v(c0, r0 + h, -ALTO_MURO).y, this.v(c0, r0, -ALTO_MURO).x, this.v(c0, r0, -ALTO_MURO).y)
      .lineBetween(this.v(c0, r0, -ALTO_MURO).x, this.v(c0, r0, -ALTO_MURO).y, this.v(c0 + w, r0, -ALTO_MURO).x, this.v(c0 + w, r0, -ALTO_MURO).y);
    // contorno (la sala en la que estás, con borde blanco)
    g.lineStyle(aqui ? 2 : 1, aqui ? 0xffffff : TINTA, aqui ? 1 : 0.8).strokePoints(this.poligono(s), true, true);
  }

  // Marco de puerta sobre un muro norte, con la franja del color de su sistema (como las puertas del mapa)
  puerta(g, c, r, color) {
    const a = 0.32;
    const pts = [this.v(c - a, r), this.v(c + a, r), this.v(c + a, r, -ALTO_MURO + 1.5), this.v(c - a, r, -ALTO_MURO + 1.5)];
    g.fillStyle(P.hueco, 1).fillPoints(pts, true);
    g.lineStyle(1.2, 0xe46fb3, 1).strokePoints(pts, true, true);                 // el marco rosa de las puertas
    g.lineStyle(2, color, 1).lineBetween(pts[3].x, pts[3].y, pts[2].x, pts[2].y);  // franja del sistema
  }

  // Tubo entre el Pasillo y una sala (como los de afuera del mapa)
  tubo(g, s) {
    const a = 0.34, [r1, r2] = s.lado === 'n' ? [-HUECO, 0] : [ALTO_PASILLO, ALTO_PASILLO + HUECO];
    g.fillStyle(P.tuboLado, 1).fillPoints([this.v(s.centro + a, r1), this.v(s.centro + a, r2), this.v(s.centro + a, r2, GROSOR), this.v(s.centro + a, r1, GROSOR)], true);
    g.fillStyle(P.tuboArriba, 1).fillPoints([this.v(s.centro - a, r1), this.v(s.centro + a, r1), this.v(s.centro + a, r2), this.v(s.centro - a, r2)], true);
    g.lineStyle(1, TINTA, 0.8).strokePoints([this.v(s.centro - a, r1), this.v(s.centro + a, r1), this.v(s.centro + a, r2), this.v(s.centro - a, r2)], true, true);
  }

  dibujarSalas(actual, destino) {
    const g = this.salas.clear();
    const S = Object.values(this.esquema.salas);
    const pas = this.esquema.salas[ZONA_INICIAL];
    const norte = S.filter(s => s.lado === 'n'), sur = S.filter(s => s.lado === 's');
    // de atrás hacia delante: las salas del norte, sus tubos, el Pasillo (con las puertas del norte), los tubos y las salas del sur
    for (const s of norte) { this.sala(g, s, s.id === actual); this.icono(g, s, s.id === actual); }
    for (const s of norte) this.tubo(g, s);
    this.sala(g, pas, pas.id === actual);
    for (const s of norte) this.puerta(g, s.centro, 0, COLOR_DE[s.id]);
    for (const s of sur) this.tubo(g, s);
    for (const s of sur) {
      this.sala(g, s, s.id === actual);
      this.puerta(g, s.centro, s.r0, COLOR_DE[s.id]);
      this.icono(g, s, s.id === actual);
    }
    const est = this.estacionObjetivo(destino);
    if (est) this.estrella(g, est.x, est.y, 5.5);
  }

  // Dibujito de cada sala sobre su piso (forma, no solo color: docs/accesibilidad.md)
  icono(g, s, aqui) {
    const { x, y } = this.px([s.c0 + s.w / 2, s.r0 + s.h / 2]);
    const tinta = P.tinta;
    g.fillStyle(aqui ? 0xffffff : COLOR_DE[s.id], 0.9).fillEllipse(x, y, 15, 10);         // un disco del color del sistema
    g.lineStyle(1, tinta, 0.8).strokeEllipse(x, y, 15, 10);
    g.fillStyle(tinta, 1).lineStyle(1.6, tinta, 1);
    const V = (a, b) => new Phaser.Math.Vector2(x + a, y + b);
    const id = s.id;
    if (id === 'energia') g.fillPoints([V(1, -5), V(-3, 1), V(0, 1), V(-1, 5), V(3, -1), V(0, -1)], true);          // rayo
    else if (id === 'mando') { g.strokeRect(x - 4, y - 4, 8, 5); g.lineBetween(x, y + 1, x, y + 4); g.lineBetween(x - 3, y + 4, x + 3, y + 4); }   // pantalla
    else if (id === 'comunicaciones') {                                                                       // antena
      g.lineBetween(x, y, x, y + 5);
      g.beginPath(); g.arc(x, y, 2.5, Math.PI * 1.15, Math.PI * 1.85); g.strokePath();
      g.beginPath(); g.arc(x, y, 5, Math.PI * 1.15, Math.PI * 1.85); g.strokePath();
    } else if (id === 'invernadero') { g.fillEllipse(x + 1, y - 1, 6, 8); g.lineBetween(x - 3, y + 4, x + 2, y - 2); }   // hoja
    else if (id === 'soporte') { g.strokeCircle(x - 2, y + 1, 2.5); g.strokeCircle(x + 3, y - 2, 1.8); g.fillCircle(x + 3, y + 3, 1); }   // burbujas
    else if (id === 'refugio') g.fillPoints([V(-4, -4), V(4, -4), V(4, 0), V(0, 5), V(-4, 0)], true);            // escudo
  }

  estrella(g, x, y, r) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
    }
    g.fillStyle(AMARILLO, 1).fillPoints(pts, true);
    g.lineStyle(1, TINTA, 1).strokePoints(pts, true, true);
  }

  estacionObjetivo(destino) {
    const s = destino && this.esquema.salas[destino];
    const e = s?.z.estaciones.find(x => x.nombre === this.objetivo);
    return e ? this.px(this.aEsquema(s, e.c + 0.5, e.r + 0.5)) : null;
  }

  // Camino: de ti a la puerta de tu sala, por el tubo y el Pasillo, y por la puerta de la sala del objetivo hasta la estación
  camino(actual, destino, yo) {
    const S = this.esquema.salas, medio = ALTO_PASILLO / 2;
    const pts = [yo];
    if (actual !== ZONA_INICIAL && S[actual]?.puerta) {
      const [dentro, fuera] = S[actual].puerta;
      pts.push([dentro[0], dentro[1] + (dentro[1] < 0 ? -0.35 : 0.35)], fuera, [fuera[0], medio]);
    }
    if (destino !== ZONA_INICIAL && S[destino]?.puerta) {
      const [dentro, fuera] = S[destino].puerta;
      pts.push([fuera[0], medio], fuera, dentro);
      const s = S[destino];
      const e = s.z.estaciones.find(x => x.nombre === this.objetivo);
      pts.push(e ? this.aEsquema(s, e.c + 0.5, e.r + 0.5) : [s.c0 + s.w / 2, s.r0 + s.h / 2]);
    }
    return pts.map(cr => this.px(cr));
  }

  // Línea punteada que avanza (como hormiguitas) hacia el objetivo
  punteada(g, pts, fase) {
    const RAYA = 5, HUECO_RAYA = 4;
    let dist = -fase;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const largo = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
      for (let d = 0; d < largo;) {
        const enCiclo = ((dist % (RAYA + HUECO_RAYA)) + RAYA + HUECO_RAYA) % (RAYA + HUECO_RAYA);
        const paso = Math.min(largo - d, enCiclo < RAYA ? RAYA - enCiclo : RAYA + HUECO_RAYA - enCiclo);
        if (enCiclo < RAYA) {
          const t0 = d / largo, t1 = (d + paso) / largo;
          g.lineBetween(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0, a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1);
        }
        d += paso; dist += paso;
      }
    }
  }

  // Tamaño en pantalla y posición (la esquina de arriba a la derecha queda en x, y). anchoMax: lo que cabe sin
  // encimarse con el tablero de recursos (en el teléfono)
  colocar(x, y, escala, anchoMax = Infinity) {
    this.escalaBase = escala;
    this.anchoMax = anchoMax;
    this.ancla = { x, y };
    this.aplicarEscala();
  }

  aplicarEscala() {
    if (!this.ancla || !this.esquema) return;
    const k = Math.min(this.escalaBase, this.anchoMax / this.ancho) * (this.grande ? 1.7 : 1);
    this.k = k;
    this.ajustarLeyenda();
    this.cont.setScale(k).setPosition(this.ancla.x - this.ancho * k, this.ancla.y);
  }

  // La leyenda (a dónde ir) se lee de 14 px o más en pantalla aunque el minimapa se encoja en el teléfono:
  // su letra crece al revés de la escala y el papel se alarga para que quepa; si el nombre es largo, se ajusta al ancho
  ajustarLeyenda() {
    const k = this.k ?? 1;
    let fs = Math.round(Math.max(14, 14.5 / k));
    this.txtIr.setFontSize(fs);
    const cabe = this.ancho - MARGEN * 2;
    if (this.txtIr.width > cabe) { fs = Math.max(12, Math.floor(fs * cabe / this.txtIr.width)); this.txtIr.setFontSize(fs); }
    const alto = this.altoMapa + this.txtIr.height + 10;
    if (alto !== this.alto) {
      this.alto = alto;
      this.fondo.setSize(this.ancho / 0.5, this.alto / 0.5);
      this.cont.setSize(this.ancho, this.alto);
      this.cont.input?.hitArea.setTo(this.ancho / 2, this.alto / 2, this.ancho, this.alto);
    }
  }

  alternarTamano() { this.grande = !this.grande; this.aplicarEscala(); }

  get altoEnPantalla() { return (this.alto ?? 0) * (this.cont.scaleY || 1); }

  update(t) {
    const zonas = this.e.cache.json.get('zonas')?.zonas;
    const base = this.e.scene.get('Base');
    if (!zonas || !base?.z || !base.sys.isActive()) { this.cont.setVisible(false); return; }
    if (!this.esquema) {
      this.esquema = this.armarEsquema(zonas);
      if (!this.esquema) return;
      this.ancho = this.esquema.ancho + (MARGEN + 8) * 2;
      this.altoMapa = this.esquema.alto + MARGEN + 12;
      this.alto = this.altoMapa + 26;
      this.fondo.setSize(this.ancho / 0.5, this.alto / 0.5);
      this.txtAqui.setVisible(false);                     // una sola línea: a dónde ir
      this.txtIr.setPosition(MARGEN, this.altoMapa + 4);
      this.dibujarVentana();
      this.cont.setSize(this.ancho, this.alto)
        .setInteractive(new Phaser.Geom.Rectangle(this.ancho / 2, this.alto / 2, this.ancho, this.alto), Phaser.Geom.Rectangle.Contains);
      this.cont.input.cursor = 'pointer';
      this.cont.on('pointerdown', (p, x, y, ev) => { ev.stopPropagation(); this.alternarTamano(); });
      this.aplicarEscala();
    }
    this.cont.setVisible(true);
    const actual = base.z.id;
    this.objetivo = this.e.registry.get('objetivo');
    const destino = this.objetivo ? cargas.zonaDeEstacion(this.objetivo) : null;
    const clave = `${actual}|${this.objetivo}`;
    if (clave !== this.clave) {
      this.clave = clave;
      this.dibujarSalas(actual, destino);
      this.txtAqui.setText(`● Estás en: ${NOMBRES[actual] ?? actual}`);
      this.txtIr.setText(destino ? (destino === actual ? '★ ¡Es aquí!' : `★ Ve a: ${NOMBRES[destino] ?? destino}`)
        : `● ${NOMBRES[actual] ?? actual}`).setColor(destino ? '#b8473d' : '#141026');
      this.ajustarLeyenda();
    }
    // lo que se mueve
    const s = this.esquema.salas[actual];
    if (!s) return;
    const yo = this.aEsquema(s, base.pc ?? s.z.cols / 2, base.pr ?? s.z.rows / 2);
    const g = this.vivo.clear();
    if (destino && destino !== actual) {
      const ruta = this.camino(actual, destino, yo);
      g.lineStyle(5, TINTA, 0.85).strokePoints(ruta, false, true);                 // borde oscuro: se ve sobre cualquier color
      g.lineStyle(2.5, AMARILLO, 1);
      this.punteada(g, ruta, (t / 60) % 9);
      const late = 0.45 + 0.45 * Math.sin(t / 220);
      g.lineStyle(2.5, AMARILLO, late).strokePoints(this.poligono(this.esquema.salas[destino]), true, true);
    } else if (destino === actual) {
      const est = this.estacionObjetivo(destino);
      if (est) {
        const yoPx = this.px(yo);
        g.lineStyle(5, TINTA, 0.85).lineBetween(yoPx.x, yoPx.y, est.x, est.y);
        g.lineStyle(2.5, AMARILLO, 1);
        this.punteada(g, [yoPx, est], (t / 60) % 9);
      }
    }
    const p = this.px(yo);                                    // tú: punto blanco con borde, que late un poco
    g.fillStyle(TINTA, 1).fillCircle(p.x, p.y, 4.8);
    g.fillStyle(0xffffff, 1).fillCircle(p.x, p.y, 3.3 + 0.5 * Math.sin(t / 160));
  }
}
