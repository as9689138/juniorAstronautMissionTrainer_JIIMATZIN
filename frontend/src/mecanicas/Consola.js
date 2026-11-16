// Pantallas de la consola (rol 2), sacadas de SolLoopScene del prototipo de minijuegos:
//  - 'MAÑANA': repartir los 6 núcleos de energía (se abre en la consola de Mando)
//  - 'MEJORA': elegir una carta de mejora al terminar el sol (consola_mejora.js)
//  - 'FINAL': reporte final de la IA y calificación de misión (consola_final.js)
// Con el kit de misiones (src/minijuegos/mision.js) sin área de juego: todo es interfaz al tamaño real de la pantalla
// (estilo del mapa, letra de 16 px o más también en el teléfono). El contenido se dibuja en alColocar.
// El día, la emergencia y la noche ya no son pantallas: pasan en el mapa (ver ciclo.js).
import { GameState } from './estado.js';
import { crearMejora } from './consola_mejora.js';
import { crearFinal } from './consola_final.js';
import { idioma } from '../motor/idioma.js';
import { Mision } from '../minijuegos/mision.js';

const FUENTE = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
const NUMEROS = 'Consolas, Menlo, "Courier New", monospace';
const TINTA = 0x141026, LUZ_TXT = '#f3e3c3';

// Cada sistema de la consola y el recurso que cuida (su barra se ve en la fila: "mira las barras antes de decidir")
const SISTEMAS = [
  { key: 'paneles', nombre: 'Colectores Solares', desc: 'Más tiempo y +Energía al limpiar paneles', recurso: 'energia', color: 0xffc83d },
  { key: 'soporteVital', nombre: 'Soporte Vital (CO₂ + Jardín)', desc: 'Más tiempo y +Oxígeno en filtro e invernadero', recurso: 'oxigeno', color: 0x5ec8f2 },
  { key: 'escudos', nombre: 'Escudos del Casco', desc: 'Evita desgaste del blindaje (0 núcleos = -8 Blindaje)', recurso: 'blindaje', color: 0xb58cff },
];

const tam = (k, n, min = 16) => `${Math.max(min, Math.round(n * k))}px`;

export default class Consola extends Phaser.Scene {
  constructor() { super('Consola'); }

  init(datos) {
    this.modo = datos.modo;
    this.alTerminar = datos.alTerminar;
    this.motivo = datos.motivo;
    this.cerrando = false;
  }

  create() {
    if (this.modo === 'MEJORA') return crearMejora(this);
    if (this.modo === 'FINAL') return crearFinal(this, this.motivo);
    this.crearManana();
  }

  terminar(datos) {
    if (this.cerrando) return;
    this.cerrando = true;
    const fin = this.alTerminar;
    this.events.once('shutdown', () => queueMicrotask(() => fin?.(datos)));   // avisar ya apagada (ver Dialogo.cerrar)
    this.scene.stop();
  }

  // ---------- MAÑANA: repartir los núcleos ----------
  usados() { const a = GameState.asignacionEnergia; return a.paneles + a.soporteVital + a.escudos; }

  crearManana() {
    const sol = Math.min(GameState.sol, GameState.maxSoles);
    this.mision = new Mision(this, {
      titulo: 'Consola de Mando',
      etiqueta: idioma.t('SOL {n} / 10 · MAÑANA', { n: sol }),
      // neutral: no dice qué sistema conviene (la IA guía mide esta decisión)
      pasos: [{ icono: 'mis_nucleo', texto: 'Reparte los 6 núcleos' }, { icono: 'mis_mano', texto: 'Toca + o − en cada sistema' }],
      fondo: 'consola',
      alColocar: (libre, k) => this.dibujarSistemas(libre, k),
    });
    this.mision.medidor({ icono: 'mis_nucleo', etiqueta: 'Núcleos repartidos', total: GameState.nucleosDisponibles,
      meta: GameState.nucleosDisponibles, valor: this.usados() });
    this.mision.accion({ id: 'confirmar', texto: 'CONFIRMAR E IR AL DÍA', estado: 'accion', tecla: 'Enter', alPulsar: () => {
      if (this.cerrando) return;
      if (GameState.asignacionEnergia.escudos === 0) GameState.modificarRecurso('blindaje', -8);
      if (GameState.asignacionEnergia.soporteVital === 0) GameState.modificarRecurso('oxigeno', -8);
      this.terminar();
    } });
  }

  cambiar(key, d) {
    const a = GameState.asignacionEnergia;
    if (d > 0 && (this.usados() >= GameState.nucleosDisponibles || a[key] >= 3)) return;
    if (d < 0 && a[key] <= 0) return;
    a[key] += d;
    this.mision.avanceMedidor(this.usados());
    this.mision.colocar();
  }

  dibujarSistemas(libre, k) {
    const m = this.mision, gap = 8 * k, pad = 14 * k;
    const rowH = Math.min(96 * k, (libre.h - 2 * gap) / 3);
    const rowW = Math.min(libre.w, 880 * k);
    const x0 = libre.x + (libre.w - rowW) / 2, y0 = libre.y + (libre.h - (3 * rowH + 2 * gap)) / 2;
    const quedan = GameState.nucleosDisponibles - this.usados();
    SISTEMAS.forEach((s, i) => {
      const y = y0 + i * (rowH + gap), val = GameState.asignacionEnergia[s.key];
      const c = m.contenedor(x0, y);
      c.add(m.pieza('ui_placa', 0, 0, rowW, rowH, 26, k));
      const ico = Math.min(42 * k, rowH - 18);
      c.add(this.add.image(pad + ico / 2, rowH / 2, `icono_${s.recurso}`).setDisplaySize(ico, ico));
      // teclas − y + (a la derecha) y los 3 huecos de núcleo
      const mas = m.tecla(k, { texto: '+', ancho: Math.max(52, 46 / k), estado: quedan > 0 && val < 3 ? 'accion' : 'espera', alPulsar: () => this.cambiar(s.key, 1) });
      const menos = m.tecla(k, { texto: '−', ancho: Math.max(52, 46 / k), estado: val > 0 ? 'accion' : 'espera', alPulsar: () => this.cambiar(s.key, -1) });
      mas.c.setPosition(x0 + rowW - pad - mas.w / 2, y + rowH / 2);
      menos.c.setPosition(mas.c.x - mas.w / 2 - 8 * k - menos.w / 2, y + rowH / 2);
      const hueco = Math.min(36 * k, rowH - 22);
      const xh = menos.c.x - menos.w / 2 - 14 * k - 3 * hueco - 2 * 4 * k - x0;
      for (let n = 0; n < 3; n++) {
        c.add(this.add.image(xh + hueco / 2 + n * (hueco + 4 * k), rowH / 2, n < val ? 'mis_nucleo' : 'mis_nucleo_vacio')
          .setDisplaySize(hueco, hueco));
      }
      // nombre, barra del recurso y (si cabe) la descripción
      const xt = pad + ico + 12 * k, anchoTexto = xh - xt - 12 * k;
      const nombre = this.add.text(xt, 0, s.nombre, { fontFamily: FUENTE, fontSize: tam(k, 17), fontStyle: 'bold', color: LUZ_TXT,
        resolution: 2, wordWrap: { width: anchoTexto } });
      const r = GameState.recursos[s.recurso], max = s.recurso === 'energia' ? (GameState.energiaMaxima || 100) : 100;
      const ab = Math.min(140 * k, anchoTexto - 50 * k), hb = Math.round(10 * k);
      const conDesc = rowH >= 84 && rowW >= 760;
      const desc = conDesc ? this.add.text(xt, 0, s.desc, { fontFamily: FUENTE, fontSize: tam(k, 14), color: LUZ_TXT, resolution: 2,
        wordWrap: { width: anchoTexto } }).setAlpha(0.7) : null;
      const alto = nombre.height + 6 * k + Math.max(hb, 18) + (desc ? 4 * k + desc.height : 0);
      let yy = (rowH - alto) / 2;
      nombre.setY(yy); yy += nombre.height + 6 * k;
      const yb = yy + Math.max(hb, 18) / 2;
      c.add([nombre,
        this.add.rectangle(xt, yb, ab, hb, 0x0b0820).setOrigin(0, 0.5).setStrokeStyle(2, TINTA),
        this.add.rectangle(xt + 1, yb, Math.max(0, (ab - 2) * Math.min(1, r / max)), hb - 2, s.color).setOrigin(0, 0.5),
        this.add.text(xt + ab + 8 * k, yb, `${r}`, { fontFamily: NUMEROS, fontSize: tam(k, 16), fontStyle: 'bold', color: LUZ_TXT,
          resolution: 2 }).setOrigin(0, 0.5)]);
      if (desc) { desc.setY(yy + Math.max(hb, 18) + 4 * k); c.add(desc); }
    });
  }
}
