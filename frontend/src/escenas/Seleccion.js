// Elegir personaje: las tres cartas de la historia (carta_wen, carta_jud, carta_atl de historia.ink) con los
// retratos que dibujó la compañera de arte, y la dificultad (la del prototipo de minijuegos del rol 2).
import { ciclo } from '../mecanicas/ciclo.js';
import { sonido } from '../motor/sonido.js';
import { ruta, NOMBRE_TAREA } from '../mecanicas/rutas.js';

const FUENTE = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const CARTAS = [
  { id: 'wenceslao', nudo: 'carta_wen', retrato: 'retrato_wenceslao', color: 0xf07a3a, bonus: '+5 de energía al limpiar paneles' },
  { id: 'judith', nudo: 'carta_jud', retrato: 'retrato_judith', color: 0x7cf0a0, bonus: '+5 de oxígeno en el invernadero' },
  { id: 'atlas', nudo: 'carta_atl', retrato: 'retrato_atlas', color: 0xffc83d, bonus: '+5 de oxígeno al cambiar el filtro' },
];
const DIFICULTADES = [['facil', 'Fácil'], ['normal', 'Normal'], ['dificil', 'Difícil']];

export default class Seleccion extends Phaser.Scene {
  constructor() { super('Seleccion'); }

  create() {
    this.dificultad = 'normal';
    this.cameras.main.setBackgroundColor('#0d0a24');
    this.estrellas = this.add.graphics();
    this.tituloTxt = this.add.text(0, 0, 'Elige tu astronauta', { fontFamily: FUENTE, fontSize: '34px', fontStyle: 'bold', color: '#ffe3b0' }).setOrigin(0.5);
    this.subTxt = this.add.text(0, 0, 'Los tres viven en la Base Marte Uno. Tú decides con quién juegas.', { fontFamily: FUENTE, fontSize: '17px', color: '#cfc6ff' }).setOrigin(0.5);
    const nar = ciclo.narrador;
    this.cartas = CARTAS.map(c => {
      const info = nar?.leerEntero(c.nudo) ?? { lineas: [], tags: {} };
      const cont = this.add.container(0, 0);
      const marco = this.add.graphics();
      const retrato = this.add.image(0, 0, c.retrato).setOrigin(0.5, 1);
      const titulo = this.add.text(0, 0, info.tags.titulo?.[0] ?? c.id, { fontFamily: FUENTE, fontSize: '22px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5, 0);
      const habil = this.add.text(0, 0, info.tags.habilidades?.[0] ?? '', { fontFamily: FUENTE, fontSize: '15px', color: Phaser.Display.Color.IntegerToColor(c.color).rgba, align: 'center' }).setOrigin(0.5, 0);
      const texto = this.add.text(0, 0, info.lineas.join(' '), { fontFamily: FUENTE, fontSize: '16px', color: '#ded8ff', align: 'center', lineSpacing: 4 }).setOrigin(0.5, 0);
      // La ruta del personaje (src/mecanicas/rutas.js): por dónde empieza su día y su ventaja
      const r = ruta(c.id);
      const bonus = this.add.text(0, 0, `★ Su día empieza por ${NOMBRE_TAREA[r.especialidad].split(',')[0]} (${c.bonus.replace(/ al .*| en .*/, '')})
★ ${r.ventaja}`, { fontFamily: FUENTE, fontSize: '15px', fontStyle: 'bold', color: '#ffc83d', align: 'center' }).setOrigin(0.5, 0);
      // en pantallas bajas (teléfono en horizontal) solo va una línea corta con su ventaja
      const corto = this.add.text(0, 0, c.bonus, { fontFamily: FUENTE, fontSize: '14px', fontStyle: 'bold', color: '#ffc83d', align: 'center' }).setOrigin(0.5, 0);
      const zona = this.add.rectangle(0, 0, 10, 10, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      cont.add([marco, retrato, titulo, habil, texto, bonus, corto, zona]);
      zona.on('pointerover', () => { cont.encima = true; this.dibujarCarta(cont); this.tweens.add({ targets: retrato, scale: retrato.scale * 1.04, duration: 160 }); });
      zona.on('pointerout', () => { cont.encima = false; this.dibujarCarta(cont); this.colocar(); });
      zona.on('pointerup', () => this.elegir(c));
      Object.assign(cont, { c, marco, retrato, titulo, habil, texto, bonus, corto, zona });
      return cont;
    });
    this.difBotones = DIFICULTADES.map(([id, nombre]) => {
      const t = this.add.text(0, 0, nombre, { fontFamily: FUENTE, fontSize: '17px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#2a2358', padding: { x: 16, y: 13 } })
        .setOrigin(0.5).setInteractive({ useHandCursor: true });
      t.on('pointerup', () => { this.dificultad = id; sonido.efecto('ui_clic_boton', 0.6); this.pintarDificultad(); });
      t.id = id;
      return t;
    });
    this.difTxt = this.add.text(0, 0, 'Dificultad:', { fontFamily: FUENTE, fontSize: '16px', color: '#cfc6ff' }).setOrigin(1, 0.5);
    this.pintarDificultad();
    this.input.keyboard.on('keydown', ev => { const n = parseInt(ev.key, 10); if (n >= 1 && n <= 3) this.elegir(CARTAS[n - 1]); });
    this.colocar();
    const alRedim = () => this.colocar();
    this.scale.on('resize', alRedim);
    this.events.once('shutdown', () => this.scale.off('resize', alRedim));
    sonido.musica('inicio');
  }

  pintarDificultad() {
    for (const b of this.difBotones) b.setBackgroundColor(b.id === this.dificultad ? '#d9653b' : '#2a2358');
  }

  dibujarCarta(cont) {
    const { ancho: a, alto: h } = cont.medida;
    const g = cont.marco.clear();
    g.fillStyle(0x141026, 1).fillRoundedRect(-a / 2 - 4, -4, a + 8, h + 8, 20);
    g.fillStyle(cont.encima ? 0x2c2466 : 0x1d1840, 1).fillRoundedRect(-a / 2, 0, a, h, 16);
    g.lineStyle(3, cont.c.color, cont.encima ? 1 : 0.6).strokeRoundedRect(-a / 2 + 6, 6, a - 12, h - 12, 12);
    const ci = cont.circulo ?? { y: h * 0.3, r: a * 0.36 };
    g.fillStyle(cont.c.color, 0.16).fillCircle(0, ci.y, ci.r);
  }

  colocar() {
    const { width: w, height: h } = this.scale;
    const g = this.estrellas.clear();
    for (let i = 0; i < 90; i++) g.fillStyle(0xffffff, ((i * 37) % 7) / 10 + 0.1).fillCircle((i * 197) % w, (i * 131) % h, (i % 3) * 0.6 + 0.6);
    const vertical = w < h * 0.9;
    // compacto: teléfono en horizontal (iPhone SE/mini y parecidos): cabecera baja y cartas con menos líneas
    const compacto = !vertical && h < 560;
    const n = 3, sep = compacto ? 10 : 16;
    const yDif = h - (compacto ? 38 : 40);   // la fila de dificultad con aire abajo (antes quedaba a 7 px del borde)
    let arriba = 104;
    if (compacto) {
      this.tituloTxt.setPosition(w / 2, h < 420 ? 22 : 30).setFontSize(h < 420 ? 22 : 28);
      const conSub = h >= 420;
      this.subTxt.setVisible(conSub).setPosition(w / 2, 62).setFontSize(15).setWordWrapWidth(w - 32).setAlign('center');
      arriba = conSub ? 62 + this.subTxt.height / 2 + 12 : this.tituloTxt.y + this.tituloTxt.height / 2 + 10;
    } else {
      this.tituloTxt.setPosition(w / 2, 38).setFontSize(Math.round(Math.max(24, 34 * Math.min(1, w / 800))));
      this.subTxt.setVisible(true).setPosition(w / 2, 76).setFontSize(16).setWordWrapWidth(w - 32).setAlign('center');
    }
    const ancho = vertical ? Math.min(w - 32, 420) : Math.min(340, (w - 32 - sep * 2) / n);
    const alto = vertical ? Math.min(260, (h - 230) / 3 - sep) : compacto ? Math.min(380, yDif - 24 - 10 - arriba) : Math.min(h - 210, 560);
    const e = Phaser.Math.Clamp(ancho / 340, 0.6, 1.2);
    this.cartas.forEach((cont, i) => {
      cont.medida = { ancho, alto };
      const x = vertical ? w / 2 : w / 2 + (i - 1) * (ancho + sep);
      const y = vertical ? 104 + i * (alto + sep) : arriba;
      cont.setPosition(x, y);
      this.dibujarCarta(cont);
      if (vertical) cont.circulo = null;
      cont.corto.setVisible(compacto);
      if (compacto) {
        cont.habil.setVisible(false); cont.texto.setVisible(false); cont.bonus.setVisible(false);
      } else if (vertical) {          // en el teléfono: retrato a la izquierda y texto a la derecha
        const lado = Math.min(alto - 20, ancho * 0.42);
        cont.retrato.setDisplaySize(lado, lado).setPosition(-ancho / 2 + lado / 2 + 8, alto - 6);
        const tx = -ancho / 2 + lado + 16, tw = ancho - lado - 26;
        for (const t of [cont.titulo, cont.habil, cont.texto, cont.bonus]) t.setOrigin(0, 0).setAlign('left').setWordWrapWidth(tw);
        cont.titulo.setPosition(tx, 14).setFontSize(18);
        cont.habil.setPosition(tx, 14 + cont.titulo.height + 4).setFontSize(16);
        cont.texto.setVisible(false);
        cont.habil.setVisible(true); cont.bonus.setVisible(true);
        cont.bonus.setPosition(tx, cont.habil.y + cont.habil.height + 8).setFontSize(16);
      } else {
        // Primero se miden los textos y el retrato toma lo que sobra (en ventanas bajas se encimaban la ruta y el título,
        // y la descripción desaparecía). Los tres retratos van del mismo tamaño: el que quepa en la carta más llena.
        const f = Math.max(14, Math.round(15 * e));
        cont.habil.setVisible(true); cont.bonus.setVisible(true);
        for (const t of [cont.titulo, cont.habil, cont.texto, cont.bonus]) t.setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(ancho - 30);
        cont.titulo.setFontSize(Math.max(17, Math.round(21 * e)));
        cont.habil.setFontSize(f);
        cont.texto.setFontSize(Math.max(14, Math.round(16 * e)));
        cont.bonus.setFontSize(f);
        cont.base = 18 + cont.titulo.height + 4 + cont.habil.height + 10 + cont.bonus.height + 16;
      }
      cont.zona.setPosition(0, alto / 2).setSize(ancho, alto);
      cont.zona.input.hitArea.setTo(0, 0, ancho, alto);
    });
    if (compacto) {
      // retrato arriba, el nombre y una línea con su ventaja; se mide todo y el retrato toma lo que sobra
      for (const cont of this.cartas) {
        cont.titulo.setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(ancho - 20).setFontSize(alto < 170 ? 15 : 17);
        cont.corto.setWordWrapWidth(ancho - 20).setFontSize(14);
      }
      const textoAlto = c => c.titulo.height + (c.corto.visible ? 4 + c.corto.height : 0);
      let lado = alto - 22 - Math.max(...this.cartas.map(textoAlto));
      if (lado < 40) { for (const cont of this.cartas) cont.corto.setVisible(false); lado = alto - 22 - Math.max(...this.cartas.map(textoAlto)); }
      lado = Math.max(28, Math.min(ancho - 30, lado));
      for (const cont of this.cartas) {
        cont.retrato.setDisplaySize(lado, lado).setPosition(0, lado + 8);
        cont.circulo = { y: 8 + lado * 0.55, r: Math.min(lado * 0.6, ancho / 2 - 10) };   // sin salirse de la carta
        this.dibujarCarta(cont);
        cont.titulo.setPosition(0, lado + 12);
        cont.corto.setPosition(0, cont.titulo.y + cont.titulo.height + 4);
      }
    } else if (!vertical) {
      const sinTexto = Math.min(...this.cartas.map(c => alto - c.base));
      const conTexto = Math.min(...this.cartas.map(c => alto - c.base - c.texto.height - 8));
      const mostrar = conTexto >= Math.min(ancho - 30, alto * 0.3);           // la descripción, en las tres o en ninguna
      const lado = Math.max(36, Math.min(ancho - 30, alto * 0.48, mostrar ? conTexto : sinTexto));
      for (const cont of this.cartas) {
        cont.retrato.setDisplaySize(lado, lado).setPosition(0, lado + 10);
        cont.circulo = { y: 10 + lado * 0.55, r: lado * 0.62 };               // el círculo de color, detrás del retrato
        this.dibujarCarta(cont);
        cont.titulo.setPosition(0, lado + 18);
        cont.habil.setPosition(0, cont.titulo.y + cont.titulo.height + 4);
        cont.texto.setPosition(0, cont.habil.y + cont.habil.height + 8).setVisible(mostrar);
        cont.bonus.setOrigin(0.5, 1).setPosition(0, alto - 14);
      }
    }
    this.difTxt.setPosition(w / 2 - 150, yDif);
    this.difBotones.forEach((b, i) => b.setPosition(w / 2 - 80 + i * 110, yDif));
  }

  elegir(c) {
    if (this.elegido) return;
    this.elegido = true;
    sonido.efecto('ui_carta_mejora', 0.8);
    this.cameras.main.fadeOut(350, 13, 10, 36);
    this.cameras.main.once('camerafadeoutcomplete', () => ciclo.nuevaPartida(this, c.id, this.dificultad));
  }
}
