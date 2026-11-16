// Minijuego del rol 2, adaptado al juego con mapa. Original: src/minijuegos/original/scenes/PanelCleaningScene.js
// Misión: limpiar los paneles solares. Con el kit de misiones (src/minijuegos/mision.js): estilo del mapa, se adapta
// a la pantalla, medidor de polvo con la meta, tecla VIBRAR que se carga y pistas de P.I.E.D.R.A si el niño se atora.
// Las reglas son las del rol 2: tocar cada montón lo quita; cada 4,5 s la vibración está lista 1,7 s y quita 5 de golpe.
import { sonido } from "../motor/sonido.js";
import { terminarMinijuego, showAIMissionBriefing } from "./ui.js";
import { GameState } from "../mecanicas/estado.js";
import { idioma } from "../motor/idioma.js";
import { Mision } from "./mision.js";

const CICLO_VIBRAR = 4500;       // ms entre una vibración lista y la siguiente
const VENTANA_VIBRAR = 1700;     // ms que dura la tecla en verde
const POR_VIBRACION = 5;         // montones que quita una vibración

export class PanelCleaningScene extends Phaser.Scene {
  constructor() { super("PanelCleaningScene"); }

  create() {
    const params = GameState.getParametrosDificultad();
    this.gameFinished = false;
    this.totalDust = params.cantidadPolvo;
    this.goalDust = params.metaPolvo;
    this.cleaned = 0;
    this.timeLeft = params.tiempoPaneles;
    this.vibrationReady = false;
    this.ventanasPerdidas = 0;
    this.paused = true;

    this.mision = new Mision(this, {
      titulo: "Limpia los paneles solares",
      pasos: [
        { icono: "mis_mano", texto: "Toca el polvo" },
        { icono: "mis_vibrar", texto: "Tecla verde: VIBRAR quita 5" },
      ],
      fondo: "paneles",
      // el panel ilustrado ya trae su marco de aluminio: sin marco de la nave, y el área justo del tamaño del panel
      marco: false,
      area: { x: 116, y: 166, w: 728, h: 328 },
    });
    this.mision.medidor({ icono: "mis_polvo", etiqueta: "Polvo retirado", total: this.totalDust, meta: this.goalDust });
    this.mision.reloj(this.timeLeft);
    this.mision.accion({ id: "vibrar", icono: "mis_vibrar", texto: "VIBRAR", estado: "espera", carga: 0, tecla: "SPACE",
      alPulsar: () => this.useVibration() });
    this.mision.vigilar(() => this.pista(), 8);

    // Panel solar ilustrado (silicio monocristalino, marco de aluminio): módulos alineados con la rejilla original
    this.add.image(480, 330, "mj_panel").setDisplaySize(716, 316);

    this.dustGroup = this.add.group();
    for (let i = 0; i < this.totalDust; i++) {
      const x = Phaser.Math.Between(160, 800);
      const y = Phaser.Math.Between(205, 455);
      const size = Phaser.Math.Between(13, 21);
      // montón de regolito ilustrado (4 variantes), un poco más grande que el cúmulo original para verlo bien
      const dust = this.add.image(x, y, `mj_polvo_${i % 4}`)
        .setDisplaySize(size * 3.5, size * 2.9)
        .setFlipX(i % 2 === 1);
      // se puede tocar un poco más allá del dibujo: en el teléfono los montones se ven pequeños
      const fw = dust.frame.width, fh = dust.frame.height;
      dust.setInteractive({ hitArea: new Phaser.Geom.Circle(fw / 2, fh / 2, Math.max(fw, fh) * 0.68),
        hitAreaCallback: Phaser.Geom.Circle.Contains, useHandCursor: true });
      dust.on("pointerdown", () => this.cleanDust(dust));
      this.dustGroup.add(dust);
    }

    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.gameFinished || this.paused) return;
        this.timeLeft--;
        this.mision.tiempo(this.timeLeft);
        if (this.timeLeft <= 0) this.endGame();
      },
    });
    this.cicloVibrar = this.time.addEvent({ delay: CICLO_VIBRAR, loop: true, callback: () => this.luzVerde() });

    // Tarjeta inicial de la IA (en el juego con mapa ya la contó la historia: se empieza directo)
    showAIMissionBriefing(this, "paneles", () => {
      this.paused = false;
      this.mision.empezar();
    });
  }

  // La tecla VIBRAR se va llenando mientras espera y dice cuántos segundos faltan para ponerse verde
  update() {
    if (this.gameFinished || this.paused || this.vibrationReady) return;
    const p = this.cicloVibrar.getProgress();
    this.mision.estadoAccion("vibrar", "espera", { carga: p, cuenta: Math.max(1, Math.ceil((1 - p) * CICLO_VIBRAR / 1000)) });
  }

  luzVerde() {
    if (this.gameFinished || this.paused) return;
    this.vibrationReady = true;
    this.mision.estadoAccion("vibrar", "lista", { texto: "¡VIBRA YA!" });
    this.time.delayedCall(VENTANA_VIBRAR, () => {
      if (this.gameFinished || !this.vibrationReady) return;
      this.vibrationReady = false;
      this.mision.estadoAccion("vibrar", "espera", { texto: "VIBRAR", carga: 0 });
      // si deja pasar dos veces la luz verde, P.I.E.D.R.A se lo recuerda
      if (++this.ventanasPerdidas >= 2) {
        this.ventanasPerdidas = 0;
        this.mision.pista("¡La tecla estaba verde! Púlsala a tiempo: VIBRAR quita 5 montones de golpe.");
      }
    });
  }

  // Lo que dice P.I.E.D.R.A si pasan 8 s sin quitar polvo
  pista() {
    if (this.cleaned === 0) {
      this.latirPolvo();
      return "Toca los montones de polvo del panel para quitarlos.";
    }
    return idioma.t("Te faltan {n}. ¡Toca el polvo antes de que anochezca!", { n: this.goalDust - this.cleaned });
  }

  // Los montones laten un momento: "¡aquí!"
  latirPolvo() {
    for (const d of this.dustGroup.getChildren()) {
      if (!d.active || !d.input?.enabled) continue;
      const sx = d.scaleX, sy = d.scaleY;
      this.tweens.add({ targets: d, scaleX: sx * 1.25, scaleY: sy * 1.25, duration: 220, yoyo: true, repeat: 2,
        onComplete: () => d.active && d.setScale(sx, sy) });
    }
  }

  cleanDust(dust) {
    if (this.gameFinished || this.paused || !dust.active) return;
    sonido.efecto("mj_paneles_raspando", 0.45);
    dust.disableInteractive();
    this.tweens.killTweensOf(dust);
    this.tweens.add({
      targets: dust, alpha: 0, scaleX: dust.scaleX * 1.8, scaleY: dust.scaleY * 1.8, duration: 180,
      onComplete: () => dust.destroy(),
    });
    this.cleaned++;
    this.actualizar();
  }

  useVibration() {
    if (this.gameFinished || this.paused) return;
    if (!this.vibrationReady) {               // todavía no: la tecla tiembla
      this.cameras.main.shake(100, 0.002);
      this.mision.negar("vibrar");
      return;
    }
    this.vibrationReady = false;
    this.ventanasPerdidas = 0;
    this.mision.estadoAccion("vibrar", "espera", { texto: "VIBRAR", carga: 0 });
    this.cameras.main.shake(220, 0.006);

    const eliminados = this.dustGroup.getChildren().filter((item) => item.active && item.input?.enabled).slice(0, POR_VIBRACION);
    eliminados.forEach((item) => {
      item.disableInteractive();
      this.tweens.killTweensOf(item);
      this.tweens.add({
        targets: item, y: item.y + 25, alpha: 0, scaleX: item.scaleX * 1.5, scaleY: item.scaleY * 1.5, duration: 220,
        onComplete: () => item.destroy(),
      });
      this.cleaned++;
    });

    const aviso = this.add.text(480, 320, idioma.t("⚡ ¡VIBRACIÓN! -{n} cúmulos", { n: eliminados.length }), {
      fontFamily: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif', fontSize: "30px", fontStyle: "bold",
      color: "#7cf0a0", stroke: "#141026", strokeThickness: 7, resolution: 2,
    }).setOrigin(0.5).setDepth(30);
    aviso.sinTraducir = true;
    this.tweens.add({ targets: aviso, y: 270, alpha: 0, duration: 900, onComplete: () => aviso.destroy() });
    this.actualizar();
  }

  actualizar() {
    this.mision.avanceMedidor(this.cleaned);
    if (this.cleaned >= this.goalDust) this.endGame();
  }

  endGame() {
    if (this.gameFinished) return;
    this.gameFinished = true;
    const success = this.cleaned >= this.goalDust;
    GameState.minijuegosHoy.paneles = true;

    const cambios = [];
    let nota = null;
    if (success) {
      const extraEnergia = 15 + GameState.asignacionEnergia.paneles * 4 + (GameState.personaje === "wenceslao" ? 5 : 0);
      GameState.modificarRecurso("energia", extraEnergia);
      cambios.push({ recurso: "energia", n: extraEnergia });
      if (GameState.mejoras.ladrillosPolvo) {
        GameState.modificarRecurso("blindaje", 15);
        cambios.push({ recurso: "blindaje", n: 15 });
        nota = "Ladrillos de Polvo";
      }
    } else {
      GameState.modificarRecurso("energia", -12);
      cambios.push({ recurso: "energia", n: -12 });
    }

    this.mision.resultado({
      exito: success,
      cambios,
      nota,
      mensaje: success
        ? "¡Genial! Los paneles brillan otra vez y la batería está cargando."
        : idioma.t("Quedó mucho polvo en los paneles ({a}/{b}). Esta noche tendremos poca batería.", { a: this.cleaned, b: this.goalDust }),
      alVolver: () => terminarMinijuego(this, success),
    });
  }
}
