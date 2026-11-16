// Pantalla de inicio. El botón es el primer gesto del jugador:
// los navegadores no dejan sonar audio hasta entonces.
import { verCine } from '../motor/cine.js';
import { ciclo } from '../mecanicas/ciclo.js';
import { sonido } from '../motor/sonido.js';
import { cargas } from '../motor/cargas.js';
import { idioma } from '../motor/idioma.js';

export default class Inicio extends Phaser.Scene {
  constructor() { super('Inicio'); }

  create() {
    const fuente = 'system-ui, -apple-system, "Segoe UI", sans-serif';
    // Portada ilustrada (ya trae el título «Misión / Mission P.I.E.D.R.A.»); sin ella, el título en texto
    const clavePortada = idioma.ingles ? 'portada_en' : 'portada_es';
    this.portada = this.textures.exists(clavePortada) ? this.add.image(0, 0, clavePortada).setOrigin(0.5) : null;
    this.banda = this.add.rectangle(0, 0, 10, 10, 0x120c26, 0.62).setOrigin(0.5, 0);
    this.titulo = this.add.text(0, 0, 'Misión P.I.E.D.R.A', { fontFamily: fuente, fontSize: '40px', fontStyle: 'bold', color: '#f1e3d3' }).setOrigin(0.5);
    this.sub = this.add.text(0, 0, 'Base Marte Uno · 10 soles de entrenamiento', { fontFamily: fuente, fontSize: '16px', color: '#c9a99a' }).setOrigin(0.5);
    this.boton = this.add.rectangle(0, 0, 240, 56, 0xd9653b).setInteractive({ useHandCursor: true });
    this.textoBoton = this.add.text(0, 0, 'Comenzar misión', { fontFamily: fuente, fontSize: '20px', fontStyle: 'bold', color: '#1a1110' }).setOrigin(0.5);
    this.ayuda = this.add.text(0, 0, 'Enter o toca el botón', { fontFamily: fuente, fontSize: '13px', color: '#8f7a70' }).setOrigin(0.5);

    // Idioma: Español / English (se guarda; la historia, la interfaz y la voz cambian)
    this.idiomas = [['es', 'Español'], ['en', 'English']].map(([codigo, nombre]) => {
      const b = this.add.text(0, 0, nombre, { fontFamily: fuente, fontSize: '17px', fontStyle: 'bold', color: '#f1e3d3',
        backgroundColor: idioma.actual === codigo ? '#d9653b' : '#2a2358', padding: { x: 18, y: 13 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });   // 46 px de alto: cómodo para el dedo
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
      { fontFamily: fuente, fontSize: '14px', color: '#d8c7bc', align: 'center' }).setOrigin(0.5);   // claro: se lee sobre la banda
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
    if (this.portada) {
      // la portada cubre la pantalla (se recorta lo que sobre) y los botones van en una banda abajo
      // horizontal: la portada cubre la pantalla; vertical (o casi): se ajusta al ancho para que el título no se corte
      const ancha = w / h >= 1.2;
      const s = ancha ? Math.max(w / this.portada.width, h / this.portada.height) : w / this.portada.width;
      this.portada.setScale(s).setPosition(w / 2, ancha ? h / 2 : Math.max(this.portada.height * s / 2, h * 0.36));
      this.cameras.main.setBackgroundColor(0x1d1238);
      this.titulo.setVisible(false); this.sub.setVisible(false);
      if (h < 520) {
        // pantalla baja (teléfono en horizontal): una sola fila [Español] [Comenzar] [English] y el aviso debajo
        const y0 = h - 116;
        this.banda.setVisible(true).setPosition(w / 2, y0).setSize(w, h - y0);
        this.boton.setPosition(w / 2, y0 + 36); this.textoBoton.setPosition(w / 2, y0 + 36);
        this.ayuda.setVisible(false);
        const sep = Math.min(220, w / 2 - 70);
        this.idiomas.forEach((b, i) => b.setPosition(w / 2 + (i ? sep : -sep), y0 + 36));
        this.aviso.setFontSize(14).setWordWrapWidth(Math.min(w - 32, 640)).setPosition(w / 2, y0 + 88);
        return;
      }
      this.ayuda.setVisible(!this.sys.game.device.input.touch);   // "Enter o toca" solo con teclado
      this.aviso.setFontSize(14);
      const y0 = Math.max(h * 0.66, h - 250);
      this.banda.setVisible(true).setPosition(w / 2, y0).setSize(w, h - y0);
      this.boton.setPosition(w / 2, y0 + 44); this.textoBoton.setPosition(w / 2, y0 + 44);
      this.ayuda.setPosition(w / 2, y0 + 86);
      this.idiomas.forEach((b, i) => b.setPosition(w / 2 + (i - 0.5) * 140, y0 + 128));
      this.aviso.setWordWrapWidth(Math.min(w - 32, 560)).setPosition(w / 2, Math.min(h - 18, y0 + 178));
      return;
    }
    this.banda.setVisible(false);
    this.ayuda.setVisible(!this.sys.game.device.input.touch);
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
    // en teléfonos: pantalla completa y horizontal (Android; iOS no lo permite y ahí se pide girar el teléfono)
    if (window.matchMedia?.('(pointer: coarse)').matches && !document.fullscreenElement) {
      document.documentElement.requestFullscreen?.({ navigationUI: 'hide' })
        .then(() => screen.orientation?.lock?.('landscape')).catch(() => { /* el navegador no lo permite */ });
    }
    sonido.musica('inicio');
    // la portada se esconde: si no, su título se transparenta debajo de "Viaje espacial" (textos encimados)
    this.tweens.add({ targets: [this.titulo, this.sub, this.boton, ...[this.portada, this.banda].filter(Boolean), this.textoBoton, this.ayuda, this.aviso, ...this.idiomas], alpha: 0, duration: 250 });
    this.idiomas.forEach(b => b.disableInteractive());
    // prólogo: el video (tráiler, pkt/cine-prologo); sin video, la versión en texto. Se puede saltar. Luego, el personaje
    verCine('prologo')
      .then(vio => (vio ? null : ciclo.narrar('prologo', { fondo: true })))
      .then(() => cargas.asegurar('personajes'))
      .then(() => this.scene.start('Seleccion'));
  }
}
