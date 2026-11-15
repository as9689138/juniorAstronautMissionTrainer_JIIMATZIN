// Pantalla de inicio. El botón es el primer gesto del jugador:
// los navegadores no dejan sonar audio hasta entonces.
import { ciclo } from '../mecanicas/ciclo.js';
import { sonido } from '../motor/sonido.js';
import { cargas } from '../motor/cargas.js';
import { idioma } from '../motor/idioma.js';

export default class Inicio extends Phaser.Scene {
  constructor() { super('Inicio'); }

  create() {
    const fuente = 'system-ui, -apple-system, "Segoe UI", sans-serif';
    this.titulo = this.add.text(0, 0, 'Misión Marte', { fontFamily: fuente, fontSize: '40px', fontStyle: 'bold', color: '#f1e3d3' }).setOrigin(0.5);
    this.sub = this.add.text(0, 0, 'Base Marte Uno · 10 soles de entrenamiento', { fontFamily: fuente, fontSize: '16px', color: '#c9a99a' }).setOrigin(0.5);
    this.boton = this.add.rectangle(0, 0, 240, 56, 0xd9653b).setInteractive({ useHandCursor: true });
    this.textoBoton = this.add.text(0, 0, 'Comenzar misión', { fontFamily: fuente, fontSize: '20px', fontStyle: 'bold', color: '#1a1110' }).setOrigin(0.5);
    this.ayuda = this.add.text(0, 0, 'Enter o toca el botón', { fontFamily: fuente, fontSize: '13px', color: '#8f7a70' }).setOrigin(0.5);

    // Idioma: Español / English (se guarda; la historia, la interfaz y la voz cambian)
    this.idiomas = [['es', 'Español'], ['en', 'English']].map(([codigo, nombre]) => {
      const b = this.add.text(0, 0, nombre, { fontFamily: fuente, fontSize: '17px', fontStyle: 'bold', color: '#f1e3d3',
        backgroundColor: idioma.actual === codigo ? '#d9653b' : '#2a2358', padding: { x: 16, y: 9 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      b.on('pointerup', () => {
        if (idioma.actual === codigo) return;
        idioma.elegir(codigo);
        sonido.efecto('ui_clic_boton', 0.6);
        this.scene.restart();                    // se dibuja otra vez en el idioma nuevo
      });
      return b;
    });
    // Aviso de privacidad: qué se guarda (anónimo) y para qué
    this.aviso = this.add.text(0, 0, 'El juego guarda de forma anónima cómo aprendes (sin nombres) para que el equipo lo mejore.',
      { fontFamily: fuente, fontSize: '14px', color: '#8f7a70', align: 'center' }).setOrigin(0.5);
    this.boton.on('pointerover', () => this.boton.setFillStyle(0xf07a4e));
    this.boton.on('pointerout', () => this.boton.setFillStyle(0xd9653b));
    this.boton.on('pointerup', () => this.comenzar());
    this.input.keyboard.once('keydown-ENTER', () => this.comenzar());

    this.colocar(this.scale.width, this.scale.height);
    const alRedimensionar = s => this.colocar(s.width, s.height);
    this.scale.on('resize', alRedimensionar);
    this.events.once('shutdown', () => this.scale.off('resize', alRedimensionar));
  }

  colocar(w, h) {
    this.titulo.setPosition(w / 2, h / 2 - 90);
    this.sub.setPosition(w / 2, h / 2 - 50);
    this.boton.setPosition(w / 2, h / 2 + 20);
    this.textoBoton.setPosition(w / 2, h / 2 + 20);
    this.ayuda.setPosition(w / 2, h / 2 + 68);
    this.idiomas.forEach((b, i) => b.setPosition(w / 2 + (i - 0.5) * 140, h / 2 + 128));
    this.aviso.setWordWrapWidth(Math.min(w - 32, 520)).setPosition(w / 2, Math.min(h - 30, h / 2 + 190));
  }

  comenzar() {
    if (this.empezado) return;
    this.empezado = true;
    sonido.musica('inicio');
    // la portada se esconde: si no, su título se transparenta debajo de "Viaje espacial" (textos encimados)
    this.tweens.add({ targets: [this.titulo, this.sub, this.boton, this.textoBoton, this.ayuda, this.aviso, ...this.idiomas], alpha: 0, duration: 250 });
    this.idiomas.forEach(b => b.disableInteractive());
    // prólogo de la historia (se puede saltar) y después elegir personaje
    ciclo.narrar('prologo', { fondo: true })
      .then(() => cargas.asegurar('personajes'))
      .then(() => this.scene.start('Seleccion'));
  }
}
