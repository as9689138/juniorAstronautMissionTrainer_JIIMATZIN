// Minijuego del rol 2, adaptado al juego con mapa. Original: src/minijuegos/original/scenes/CO2FilterScene.js
// Misión: el invento del Apolo 13. Con el kit de misiones (src/minijuegos/mision.js): estilo del mapa, se adapta a la
// pantalla, medidor de piezas, rótulos que siempre se leen y pistas de P.I.E.D.R.A (con una flecha que señala el hueco)
// si el niño se atora. Reglas del rol 2: cada pieza va en su hueco; las tres antes de que se acabe el tiempo.
import { sonido } from "../motor/sonido.js";
import { GameState } from "../mecanicas/estado.js";
import { idioma } from "../motor/idioma.js";
import { terminarMinijuego, showAIMissionBriefing } from "./ui.js";
import { Mision } from "./mision.js";

const PIEZAS = [
  { id: "cardboard", x: 245, y: 265, img: "mj_carton", nombre: "CARTÓN", con: "el cartón", ranura: "carton", tx: 595, ty: 275, n: 1 },
  { id: "tape", x: 245, y: 355, img: "mj_cinta", nombre: "CINTA", con: "la cinta", ranura: "cinta", tx: 775, ty: 275, n: 2 },
  { id: "hose", x: 245, y: 445, img: "mj_manguera", nombre: "MANGUERA", con: "la manguera", ranura: "manguera", tx: 685, ty: 425, n: 3 },
];
const ANCHO = 175, ALTO = 56;          // tamaño de cada pieza en la bandeja

export class CO2FilterScene extends Phaser.Scene {
  constructor() { super("CO2FilterScene"); }

  create() {
    const params = GameState.getParametrosDificultad();
    this.gameFinished = false;
    this.timeLeft = params.tiempoCO2;
    this.placed = new Set();
    this.fallos = 0;
    this.paused = true;
    this.bloques = {};

    this.mision = new Mision(this, {
      titulo: "Arregla el filtro de CO₂",
      pasos: [
        { icono: "mis_mano", texto: "Arrastra cada pieza a su hueco" },
        { icono: "mis_pieza", texto: "Así el filtro cuadrado encaja en el tubo redondo" },
      ],
      fondo: "filtro",
      area: { x: 84, y: 168, w: 808, h: 376 },
    });
    this.mision.medidor({ icono: "mis_pieza", etiqueta: "Piezas colocadas", total: 3, meta: 3 });
    this.mision.reloj(this.timeLeft);
    this.mision.vigilar(() => this.pista(), 8);

    // Bandeja de herramientas y adaptador ilustrados
    this.add.image(245, 355, "mj_bandeja").setDisplaySize(310, 365);
    this.add.image(685, 355, "mj_adaptador").setDisplaySize(420, 365);
    this.mision.etiqueta(245, 196, "PIEZAS", { tam: 15, color: "#8fe3ff" });
    this.mision.etiqueta(685, 196, "ADAPTADOR DEL FILTRO", { tam: 15, color: "#8fe3ff" });
    this.mision.etiqueta(545, 370, "LiOH · CUADRADO", { tam: 14 });   // a distinta altura que el tubo: en teléfonos chicos crecen y se tocaban
    this.mision.etiqueta(886, 412, "TUBO · REDONDO", { tam: 14, origen: 1 });   // anclado a la derecha: al crecer no se sale del dibujo

    // Huecos del adaptador (un poco más grandes que el dibujo: es más fácil soltar ahí)
    this.zonas = {};
    for (const p of PIEZAS) {
      this.add.image(p.tx, p.ty, `mj_ranura_${p.ranura}`).setDisplaySize(150, 74);
      const zona = this.add.rectangle(p.tx, p.ty, 170, 92, 0x263554, 0.01).setStrokeStyle(2, 0x94a3b8, 0.5);
      zona.setData("pieceId", p.id);
      zona.setInteractive({ dropZone: true });
      this.zonas[p.id] = zona;
      p.rotuloHueco = this.mision.etiqueta(p.tx, p.ty + 54, `${p.n} · ${p.nombre}`, { tam: 14 });
    }

    // Piezas en la bandeja; su nombre va debajo, en una placa
    for (const p of PIEZAS) {
      const block = this.add.image(p.x, p.y, p.img).setDisplaySize(ANCHO, ALTO).setDepth(5);
      // se agarra un poco más allá del dibujo (alto x1,8): en un teléfono chico la pieza se ve de unos 28 px
      const fw = block.frame.width, fh = block.frame.height;
      block.setInteractive({ hitArea: new Phaser.Geom.Rectangle(0, -fh * 0.4, fw, fh * 1.8),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains, draggable: true, useHandCursor: true });
      block.setData("pieceId", p.id);
      const rotulo = this.mision.etiqueta(p.x, p.y + 38, p.nombre, { tam: 14 });
      block.setData("labelObject", rotulo);
      this.bloques[p.id] = block;

      block.on("dragstart", () => { this.tweens.killTweensOf(block); block.setDisplaySize(ANCHO * 1.06, ALTO * 1.06).setDepth(8); });
      block.on("drag", (pointer, dragX, dragY) => {
        if (this.gameFinished) return;
        block.setPosition(dragX, dragY);
        rotulo.setPosition(dragX, dragY + 38).setDepth(9);
      });
      block.on("dragend", () => {
        if (!this.placed.has(p.id)) {
          block.setDisplaySize(ANCHO, ALTO).setDepth(5).setPosition(p.x, p.y);
          rotulo.setPosition(p.x, p.y + 38).setDepth(6);
        }
      });
      this.input.setDraggable(block);
    }

    this.input.on("drop", (pointer, gameObject, dropZone) => {
      if (this.gameFinished) return;
      const pieceId = gameObject.getData("pieceId");
      if (pieceId === dropZone.getData("pieceId") && !this.placed.has(pieceId)) {
        this.placed.add(pieceId);
        sonido.efecto("mj_filtro_clic", 0.7);
        dropZone.setFillStyle(0x15803d, 0.28).setStrokeStyle(3, 0x4ade80);
        gameObject.disableInteractive();
        gameObject.setDisplaySize(ANCHO * 0.82, ALTO * 0.82).setDepth(5).setPosition(dropZone.x, dropZone.y);
        gameObject.getData("labelObject").setVisible(false);
        this.mision.avanceMedidor(this.placed.size);
        if (this.placed.size === 3) this.endGame(true);
      } else {
        this.cameras.main.shake(120, 0.003);
        // dos veces en el hueco equivocado: P.I.E.D.R.A ayuda enseguida
        if (++this.fallos >= 2) {
          this.fallos = 0;
          const t = this.pista();
          if (t) this.mision.pista(t);
        }
      }
    });

    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.gameFinished || this.paused) return;
        this.timeLeft--;
        this.mision.tiempo(this.timeLeft);
        if (this.timeLeft <= 0) this.endGame(false);
      },
    });

    showAIMissionBriefing(this, "co2", () => {
      this.paused = false;
      this.mision.empezar();
    });
  }

  // Lo que dice P.I.E.D.R.A: qué pieza falta y a qué hueco va (y una flecha lo señala)
  pista() {
    const p = PIEZAS.find(x => !this.placed.has(x.id));
    if (!p || this.gameFinished) return null;
    this.senalar(p);
    return idioma.t("Arrastra {pieza} hasta el hueco {n}: el que tiene su misma forma.", { pieza: p.con, n: p.n });
  }

  // Flecha punteada curva de la pieza a su hueco, y la pieza late
  senalar(p) {
    const block = this.bloques[p.id];
    const desde = new Phaser.Math.Vector2(block.x + ANCHO / 2 + 6, block.y);
    const hasta = new Phaser.Math.Vector2(p.tx - 70, p.ty);
    const control = new Phaser.Math.Vector2((desde.x + hasta.x) / 2, Math.min(desde.y, hasta.y) - 90);
    const curva = new Phaser.Curves.QuadraticBezier(desde, control, hasta);
    const pts = curva.getPoints(28);
    const g = this.add.graphics().setDepth(20);
    g.lineStyle(6, 0x141026, 0.9);
    for (let i = 0; i < pts.length - 1; i += 2) g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
    g.lineStyle(3.5, 0xffc83d, 1);
    for (let i = 0; i < pts.length - 1; i += 2) g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
    const ang = curva.getTangent(1).angle();
    const punta = [0, -1, 1].map(s => new Phaser.Math.Vector2(
      hasta.x + Math.cos(ang + Math.PI + s * 0.5) * (s ? 18 : 0), hasta.y + Math.sin(ang + Math.PI + s * 0.5) * (s ? 18 : 0)));
    g.fillStyle(0xffc83d, 1).fillTriangle(punta[0].x, punta[0].y, punta[1].x, punta[1].y, punta[2].x, punta[2].y);
    g.lineStyle(3, 0x141026, 1).strokeTriangle(punta[0].x, punta[0].y, punta[1].x, punta[1].y, punta[2].x, punta[2].y);
    g.setAlpha(0);
    this.tweens.add({ targets: g, alpha: 1, duration: 200, hold: 2600, yoyo: true, onComplete: () => g.destroy() });
    if (block.input?.enabled) {
      const sx = block.scaleX, sy = block.scaleY;
      this.tweens.add({ targets: block, scaleX: sx * 1.12, scaleY: sy * 1.12, duration: 240, yoyo: true, repeat: 2,
        onComplete: () => block.active && block.setScale(sx, sy) });
    }
  }

  endGame(success) {
    if (this.gameFinished) return;
    this.gameFinished = true;
    GameState.minijuegosHoy.co2 = true;
    const extraO2 = 15 + GameState.asignacionEnergia.soporteVital * 3 + (GameState.personaje === "atlas" ? 5 : 0);
    const n = success ? extraO2 : -15;
    GameState.modificarRecurso("oxigeno", n);

    this.mision.resultado({
      exito: success,
      sello: success ? "¡FILTRO SELLADO!" : "FUGA DE CO₂",
      cambios: [{ recurso: "oxigeno", n }],
      mensaje: success
        ? "¡Lo lograste! El filtro quedó súper bien sellado y ya respiramos aire fresco otra vez."
        : idioma.t("Solo colocaste {a} de 3 piezas. Se escapó gas malo en la cabina.", { a: this.placed.size }),
      alVolver: () => terminarMinijuego(this, success),
    });
  }
}
