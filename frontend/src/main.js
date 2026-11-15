// Punto de entrada. El orden de las escenas es el orden de dibujo:
// Interfaz va al final para quedar siempre por encima de Base.
import Arranque from './escenas/Arranque.js';
import { Cargador } from './motor/cargas.js';
import Inicio from './escenas/Inicio.js';
import Base from './escenas/Base.js';
import Interfaz from './escenas/Interfaz.js';
import Seleccion from './escenas/Seleccion.js';
import Dialogo from './escenas/Dialogo.js';
import Consola from './mecanicas/Consola.js';
import { PanelCleaningScene } from './minijuegos/Paneles.js';
import { CO2FilterScene } from './minijuegos/FiltroCO2.js';
import { GreenhouseScene } from './minijuegos/Invernadero.js';
import { conectarCompania } from './compania/robot.js';
import { sonido } from './motor/sonido.js';
import { ciclo } from './mecanicas/ciclo.js';
import { guia } from './compania/guia.js';
import { idioma, activarTraduccion } from './motor/idioma.js';

idioma.iniciar();          // español o inglés (se elige en la portada)
activarTraduccion();       // todo texto de Phaser pasa por el diccionario de src/textos/en.js

const juego = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'juego',
  backgroundColor: '#120d0c',
  pixelArt: false,            // el arte es ilustrado, no pixel art: escalado suave
  antialias: true,
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
  // Las pantallas que se abren encima (consola, minijuegos, diálogo) van después: se dibujan por encima
  scene: [Arranque, Cargador, Inicio, Seleccion, Base, Interfaz, Consola, PanelCleaningScene, CO2FilterScene, GreenhouseScene, Dialogo],
});

guia.iniciar();            // la IA guía: todo el machine learning (pronóstico y medición del aprendizaje)
conectarCompania(juego);   // la IA de la base (robot que acompaña)
sonido.iniciar(juego);     // música, efectos y voces (rol 5)
ciclo.iniciar(juego);      // los 10 soles sobre el mapa (rol 2): historia, estaciones y minijuegos

window.__juego = juego; // para depurar desde la consola del navegador
window.__idioma = idioma; // __idioma.faltan: textos que aún no tienen inglés
