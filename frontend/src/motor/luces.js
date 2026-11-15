// Luz y visión del mapa (rol 1).
// Una capa de oscuridad cubre el mapa y se "borra" donde hay luz:
//  - lámparas de cada sala (sin sombras, suaves),
//  - un brillo pequeño en cada estación para que siempre se encuentren,
//  - la visión del astronauta, que los muros tapan (como en Among Us).
// Cuánta oscuridad hay depende de la fase del día (estado.fase, rol 2).
import { FASES_LUZ, RAYOS_VISION } from './config.js';

const mezclarColor = (a, b, t) => {
  const ca = Phaser.Display.Color.IntegerToColor(a), cb = Phaser.Display.Color.IntegerToColor(b);
  return Phaser.Display.Color.GetColor(
    ca.red + (cb.red - ca.red) * t, ca.green + (cb.green - ca.green) * t, ca.blue + (cb.blue - ca.blue) * t);
};

export default class Luces {
  /**
   * @param escena  la escena Base
   * @param opciones { ancho, alto, casilla, esMuro(columna, fila), lamparas: [{x, y, w, h}], estaciones: [{x, y}] }
   */
  constructor(escena, { ancho, alto, casilla, esMuro, lamparas, estaciones }) {
    this.e = escena;
    this.casilla = casilla;
    this.esMuro = esMuro;
    this.lamparas = lamparas;
    this.estaciones = estaciones;

    // Textura de luz suave (blanco que se desvanece hacia el borde)
    if (!escena.textures.exists('luz_suave')) {
      const t = escena.textures.createCanvas('luz_suave', 128, 128);
      const c = t.getContext();
      const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.45, 'rgba(255,255,255,0.75)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 128, 128);
      t.refresh();
    }
    // Trama de puntos a 45° (estilo de impresión, como el mapa): se dibuja al doble y se muestra a la mitad
    if (!escena.textures.exists('trama_noche')) {
      const t = escena.textures.createCanvas('trama_noche', 16, 16);
      const c = t.getContext();
      c.fillStyle = '#05040d';
      for (const [x, y] of [[4, 4], [12, 12]]) { c.beginPath(); c.arc(x, y, 2.3, 0, Math.PI * 2); c.fill(); }
      t.refresh();
    }
    this.capa = escena.add.renderTexture(0, 0, ancho, alto).setOrigin(0).setDepth(15);
    this.trama = escena.make.tileSprite({ x: 0, y: 0, width: ancho, height: alto, key: 'trama_noche' }, false)
      .setOrigin(0).setTileScale(0.5);
    this.foco = escena.make.image({ key: 'luz_suave' }, false);
    this.cono = escena.make.graphics({}, false);

    this.fuentes = [];                       // luces que se mueven (por ejemplo, la linterna del robot)
    this.fase = 'dia';
    this.actual = { ...FASES_LUZ.dia };     // valores que se acercan poco a poco a la fase nueva
  }

  ponerFase(fase) {
    if (FASES_LUZ[fase]) this.fase = fase;
  }

  // Polígono de visión: rayos desde el astronauta que se detienen en los muros
  calcularVision(ox, oy, radio) {
    const puntos = [];
    for (let i = 0; i < RAYOS_VISION; i++) {
      const a = (i / RAYOS_VISION) * Math.PI * 2;
      const dx = Math.cos(a), dy = Math.sin(a);
      const d = this.rayo(ox, oy, dx, dy, radio);
      puntos.push({ x: ox + dx * d, y: oy + dy * d, f: 1 - d / radio });
    }
    return puntos;
  }

  // Recorre la rejilla casilla por casilla (DDA) hasta tocar un muro: el corte es exacto y recto
  rayo(ox, oy, dx, dy, radio) {
    const T = this.casilla;
    let c = Math.floor(ox / T), r = Math.floor(oy / T);
    const pc = dx > 0 ? 1 : -1, pr = dy > 0 ? 1 : -1;
    const deltaX = Math.abs(T / dx), deltaY = Math.abs(T / dy);
    let maxX = dx > 0 ? ((c + 1) * T - ox) / dx : dx < 0 ? (c * T - ox) / dx : Infinity;
    let maxY = dy > 0 ? ((r + 1) * T - oy) / dy : dy < 0 ? (r * T - oy) / dy : Infinity;
    let t = 0;
    while (t < radio) {
      if (maxX < maxY) { t = maxX; maxX += deltaX; c += pc; } else { t = maxY; maxY += deltaY; r += pr; }
      if (t >= radio) break;
      if (this.esMuro(c, r)) return Math.min(radio, t + 14);   // +14: se ve la cara del muro
    }
    return radio;
  }

  update(tiempo, dt, ojo) {
    // Transición suave hacia la fase actual
    const obj = FASES_LUZ[this.fase], a = this.actual;
    const k = 1 - Math.exp(-2.5 * (dt ?? 16.67) / 1000);
    a.oscuridad += (obj.oscuridad - a.oscuridad) * k;
    a.lamparas += (obj.lamparas - a.lamparas) * k;
    a.vision += (obj.vision - a.vision) * k;
    a.color = mezclarColor(a.color, obj.color, k * 1.5);
    let oscuridad = a.oscuridad;
    if (obj.pulso) oscuridad *= 0.85 + 0.15 * Math.sin(tiempo / 260);   // alarma: la luz roja late

    const capa = this.capa;
    capa.clear();
    // Con poca oscuridad (de día) no hay trama; cuanto más oscuro, más se ven los puntos
    const trama = Phaser.Math.Clamp((oscuridad - 0.3) / 0.5, 0, 1);
    capa.fill(a.color, oscuridad * (1 - 0.3 * trama));
    if (trama > 0.01) capa.draw(this.trama.setAlpha(trama));

    // Lámparas de las salas
    if (a.lamparas > 0.01) {
      for (const l of this.lamparas) {
        this.foco.setPosition(l.x, l.y).setDisplaySize(l.w, l.h).setAlpha(a.lamparas);
        capa.erase(this.foco);
      }
    }
    // Fuentes móviles: cada una es una función que devuelve { x, y, radio, alfa } o null
    for (const f of this.fuentes) {
      const l = f();
      if (!l) continue;
      this.foco.setPosition(l.x, l.y).setDisplaySize(l.radio * 2, l.radio * 2).setAlpha(l.alfa ?? 0.8);
      capa.erase(this.foco);
    }
    // Brillo de las estaciones: siempre se ven, aunque sea de noche
    for (const s of this.estaciones) {
      this.foco.setPosition(s.x, s.y).setDisplaySize(70, 60).setAlpha(0.7);
      capa.erase(this.foco);
    }
    // Visión del astronauta, con sombras de los muros
    const pts = this.calcularVision(ojo.x, ojo.y, a.vision);
    const g = this.cono.clear();
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      g.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, 1, p.f, q.f, q.f);
      g.fillTriangle(ojo.x, ojo.y, p.x, p.y, q.x, q.y);
    }
    capa.erase(this.cono);
    capa.render();
  }

  /** Añade una luz que se mueve. fuente: () => ({ x, y, radio, alfa }) | null. Devuelve cómo quitarla. */
  agregarFuente(fuente) {
    this.fuentes.push(fuente);
    return () => { this.fuentes = this.fuentes.filter(f => f !== fuente); };
  }

  destruir() {
    this.capa.destroy();
    this.trama.destroy();
    this.foco.destroy();
    this.cono.destroy();
  }
}
