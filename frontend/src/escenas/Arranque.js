// Carga lo esencial con una barra de progreso: interfaz, arte, datos, la sala inicial, la música del día y los
// efectos de botones. Lo demás lo baja el Cargador en segundo plano o cuando se necesita (src/motor/cargas.js).
import { cargas, ZONA_INICIAL } from '../motor/cargas.js';
import { ciclo } from '../mecanicas/ciclo.js';
import { RECUERDOS } from '../mecanicas/recuerdos.js';

export default class Arranque extends Phaser.Scene {
  constructor() { super('Arranque'); }

  preload() {
    cargas.juego = this.game;
    const { width: w, height: h } = this.scale;
    const marco = this.add.rectangle(w / 2, h / 2, 260, 14).setStrokeStyle(2, 0xd9a441);
    const barra = this.add.rectangle(w / 2 - 128, h / 2, 0, 10, 0xd9a441).setOrigin(0, 0.5);
    this.add.text(w / 2, h / 2 - 28, 'Preparando la misión…', { fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#f1e3d3' }).setOrigin(0.5);
    this.load.on('progress', p => { barra.width = 256 * p; });
    this.load.on('loaderror', f => console.warn(`[recursos] No se pudo cargar "${f.key}" (${f.src}). El juego sigue sin él.`));
    // al llegar zonas.json se añade la sala inicial (las demás, al ir hacia ellas)
    this.load.once('filecomplete-json-zonas', () => cargas.encolar(this.load, cargas.archivos(`zona:${ZONA_INICIAL}`)));
    cargas.encolar(this.load, cargas.archivos('nucleo'));
    marco.setDepth(1);
  }

  create() {
    cargas.marcar('nucleo');
    cargas.marcar(`zona:${ZONA_INICIAL}`);
    this.scene.launch('Cargador');
    // mientras se ve el prólogo: retratos, efectos y las ilustraciones de los recuerdos (flashbacks)
    cargas.precargar(['personajes', 'efectos', ...RECUERDOS.map(r => `recuerdo:${r.id}`)]);
    ciclo.prepararHistoria();
    this.scene.start('Inicio');
  }
}
