// Minijuego del rol 2, adaptado al juego con mapa. Original: src/minijuegos/original/scenes/GreenhouseScene.js
// Misión: regar las zinnias del invernadero. Con el kit de misiones (src/minijuegos/mision.js): estilo del mapa, se
// adapta a la pantalla, gotas dibujadas en cada planta, medidor de plantas regadas y pistas de P.I.E.D.R.A.
// Reglas del rol 2: cada planta necesita 2 gotas; cada riego deja una gota flotando (gravedad cero); con 4 o más
// flotando, o regando de más, sale moho; el ventilador quita las gotas y algo de moho. Se gana con las 3 regadas,
// sin gotas flotando, sin moho y con el ventilador encendido.
import { sonido } from "../motor/sonido.js";
import { GameState } from "../mecanicas/estado.js";
import { terminarMinijuego, spawnFloatingText, showAIMissionBriefing } from "./ui.js";
import { idioma } from "../motor/idioma.js";
import { Mision } from "./mision.js";

export class GreenhouseScene extends Phaser.Scene {
  constructor() { super("GreenhouseScene"); }

  create() {
    const params = GameState.getParametrosDificultad();
    this.gameFinished = false;
    this.timeLeft = params.tiempoInvernadero;
    this.selectedPlant = 0;
    this.plants = [
      { name: "Zinnia 1", water: 0, mold: 0 },
      { name: "Zinnia 2", water: 0, mold: 0 },
      { name: "Zinnia 3", water: 0, mold: 0 },
    ];
    this.floatingDrops = 0;
    this.floatingBubbles = [];
    this.fanOn = false;
    this.paused = true;

    this.mision = new Mision(this, {
      titulo: "Riega las flores espaciales",
      pasos: [
        { icono: "mis_mano", texto: "Toca una planta y pulsa REGAR: 2 gotas cada una" },
        { icono: "mis_ventilador", texto: "Gotas flotando: VENTILADOR" },
      ],
      fondo: "invernadero",
      area: { x: 70, y: 160, w: 820, h: 360 },
    });
    this.mision.medidor({ icono: "mis_planta", etiqueta: "Plantas regadas", total: 3, meta: 3 });
    this.mision.reloj(this.timeLeft);
    this.mision.accion({ id: "regar", icono: "mis_gota", texto: "REGAR", estado: "accion", tecla: "SPACE",
      alPulsar: () => this.waterPlant() });
    this.mision.accion({ id: "ventilador", icono: "mis_ventilador", texto: "VENTILADOR", estado: "espera", tecla: "v",
      alPulsar: () => this.toggleFan() });
    this.mision.vigilar(() => this.pista(), 8);

    // Módulo de invernadero (cámara Veggie de la Estación Espacial)
    this.add.image(480, 340, "mj_veggie").setDisplaySize(810, 345);
    this.plantViews = [];

    this.plants.forEach((plant, index) => {
      const x = 250 + index * 230;
      const card = this.add.rectangle(x, 325, 190, 260, 0x193f3c, 0.22).setStrokeStyle(2, 0x6ee7b7);
      // Zinnia en su almohada de cultivo. Tallo y flor van en contenedores para estirarlos y agrandarlos (setScale).
      const stem = this.add.container(x, 368, [this.add.image(0, 0, `mj_tallo_${index}`).setOrigin(0.5, 1).setDisplaySize(110, 88)]);
      this.add.image(x, 388, `mj_cojin_${index}`).setDisplaySize(104, 70);
      const flower = this.add.container(x, 285, [this.add.image(0, 0, `mj_flor_${index}`).setDisplaySize(84, 84)]);
      const moho = this.add.image(x, 345, "mj_moho").setDisplaySize(140, 120).setVisible(false);
      card.setInteractive({ useHandCursor: true }).on("pointerdown", () => this.selectPlant(index));
      this.mision.etiqueta(x, 214, plant.name, { tam: 16 });
      // Medidor dibujado: las 2 gotas que necesita (llenas o apagadas)
      const gotas = [-24, 24].map(dx => this.add.image(x + dx, 440, "mis_gota").setDisplaySize(40, 40));   // grandes: se ven en el teléfono
      const aviso = this.mision.etiqueta(x, 472, "¡Moho!", { tam: 14, color: "#ffb4a8" }).setVisible(false);
      this.plantViews.push({ x, flower, stem, card, moho, gotas, aviso });
    });

    this.dropLabel = this.mision.etiqueta(480, 500, "", { tam: 15, color: "#8fe3ff" });

    // La mano señala la planta elegida
    this.mano = this.add.image(250, 178, "mis_mano").setFlipY(true).setDisplaySize(40, 40).setDepth(7);
    this.tweens.add({ targets: this.mano, y: "+=8", duration: 420, yoyo: true, repeat: -1, ease: "Sine.inOut" });

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
    this.updatePlantUI();

    showAIMissionBriefing(this, "invernadero", () => {
      this.paused = false;
      this.mision.empezar();
    });
  }

  selectPlant(index) {
    if (this.gameFinished) return;
    this.selectedPlant = index;
    sonido.efecto("ui_clic_boton", 0.4);
    this.updatePlantUI();
  }

  // Lo que dice P.I.E.D.R.A si pasan 8 s sin avanzar
  pista() {
    const moho = this.plants.some(p => p.mold > 0);
    const regadas = this.plants.every(p => p.water >= 2);
    if (!this.fanOn && regadas && !moho) return "¡Ya regaste todas! Enciende el VENTILADOR para secar el aire.";
    if (!this.fanOn && this.floatingDrops >= 2) return "Hay gotas flotando: enciende el VENTILADOR antes de que salga moho.";
    if (!this.fanOn && moho) return "Salió moho: el VENTILADOR seca el aire y lo quita.";
    const i = this.plants.findIndex(p => p.water < 2);
    if (i < 0) return null;
    this.latirPlanta(i);
    return idioma.t("A la {p} le faltan {n} gotas: tócala y pulsa REGAR.", { p: this.plants[i].name, n: 2 - this.plants[i].water });
  }

  latirPlanta(i) {
    const c = this.plantViews[i].card;
    this.tweens.killTweensOf(c);
    c.setScale(1);
    this.tweens.add({ targets: c, scale: 1.06, duration: 220, yoyo: true, repeat: 2, onComplete: () => c.setScale(1) });
  }

  // Crea una gota cayendo hacia la maceta + una burbuja flotando en gravedad cero
  animarRiegoYBurbuja(x) {
    const gotaCaida = this.add.circle(x, 225, 7, 0x38bdf8, 0.95).setStrokeStyle(2, 0xe0f2fe).setDepth(15);
    this.tweens.add({
      targets: gotaCaida, y: 365, scaleX: 0.8, scaleY: 1.3, duration: 320, ease: "Quad.easeIn",
      onComplete: () => {
        const onda = this.add.ellipse(x, 366, 16, 6, 0x7dd3fc, 0.8).setDepth(15);
        this.tweens.add({ targets: onda, scaleX: 2.8, alpha: 0, duration: 280, onComplete: () => onda.destroy() });
        gotaCaida.destroy();
      },
    });
    const bx = x + Phaser.Math.Between(-55, 55);
    const by = Phaser.Math.Between(240, 340);
    const burbuja = this.add.circle(bx, by, Phaser.Math.Between(8, 13), 0x38bdf8, 0.55).setStrokeStyle(2, 0xbae6fd);
    const brillo = this.add.circle(bx - 3, by - 3, 3, 0xffffff, 0.85);
    const contenedorGota = this.add.container(0, 0, [burbuja, brillo]).setDepth(14);
    this.tweens.add({
      targets: contenedorGota, y: Phaser.Math.Between(-24, -12), x: Phaser.Math.Between(-14, 14),
      duration: Phaser.Math.Between(1100, 1600), yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    });
    this.floatingBubbles.push(contenedorGota);
  }

  limpiarBurbujasConViento() {
    for (let i = 0; i < 6; i++) {
      const lineaViento = this.add.rectangle(120, 210 + i * 48, 90, 3, 0xbae6fd, 0.65).setDepth(15);
      this.tweens.add({ targets: lineaViento, x: 860, alpha: 0, duration: 500 + i * 40, ease: "Cubic.easeOut",
        onComplete: () => lineaViento.destroy() });
    }
    this.floatingBubbles.forEach((b) => {
      this.tweens.killTweensOf(b);
      this.tweens.add({ targets: b, x: b.x + 180, scale: 0, alpha: 0, duration: 380, onComplete: () => b.destroy() });
    });
    this.floatingBubbles = [];
  }

  waterPlant() {
    if (this.gameFinished || this.paused) return;
    sonido.efecto("mj_gotas_riego", 0.6);
    const plant = this.plants[this.selectedPlant];
    const view = this.plantViews[this.selectedPlant];
    this.animarRiegoYBurbuja(view.x);

    if (plant.water >= 2) {
      plant.mold++;
      this.floatingDrops++;
      this.cameras.main.shake(140, 0.003);
      spawnFloatingText(this, view.x, 250, "¡Exceso de agua! +Moho", "#fca5a5");
    } else {
      plant.water++;
      this.floatingDrops++;
      this.mision.avance();
      spawnFloatingText(this, view.x, 250, "+1 Gota 💧", "#7dd3fc");
      // Si hay 4 o más gotas flotando en el aire, la humedad provoca moho
      if (this.floatingDrops >= 4) {
        plant.mold++;
        this.cameras.main.shake(140, 0.003);
        spawnFloatingText(this, view.x, 225, "⚠️ ¡Mucha agua flotando! Usa el ventilador", "#fde047");
      } else if (this.floatingDrops === 3) {
        this.mision.pista("¡Cuidado! Muchas gotas flotando: usa el VENTILADOR.");   // aviso antes del moho
      }
    }

    // Si el ventilador estaba encendido, al volver a regar se apaga para que tengas que reactivarlo
    if (this.fanOn) this.ponerVentilador(false);
    this.updatePlantUI();
    this.checkEnd();
  }

  ponerVentilador(encendido) {
    this.fanOn = encendido;
    this.mision.estadoAccion("ventilador", encendido ? "activa" : "espera", { texto: encendido ? "VENTILADOR ✓" : "VENTILADOR" });
  }

  toggleFan() {
    if (this.gameFinished || this.paused) return;
    this.ponerVentilador(!this.fanOn);
    if (this.fanOn) {
      if (this.floatingDrops > 0 || this.plants.some(p => p.mold > 0)) this.mision.avance();
      if (this.floatingDrops > 0) {
        this.limpiarBurbujasConViento();
        spawnFloatingText(this, 480, 260, "¡Gotas despejadas! 🌀", "#bae6fd");
      }
      this.floatingDrops = 0;
      this.plants.forEach((plant) => { if (plant.mold > 0) plant.mold = Math.max(0, plant.mold - 1); });
    }
    this.updatePlantUI();
    this.checkEnd();
  }

  updatePlantUI() {
    this.dropLabel.setText(idioma.t("Gotas flotando: {n}", { n: this.floatingDrops }))
      .setColor(this.floatingDrops >= 3 ? "#ffb4a8" : "#8fe3ff");
    this.plantViews.forEach((view, index) => {
      const p = this.plants[index];
      view.gotas.forEach((g, k) => g.setAlpha(k < p.water ? 1 : 0.28).setTint(k < p.water ? 0xffffff : 0x8a8aa0));
      view.aviso.setVisible(p.mold > 0);
      view.flower.setScale(p.mold > 0 ? 0.82 : 1 + p.water * 0.08);
      view.stem.setScale(1, 1 + p.water * 0.06);
      view.moho.setVisible(p.mold > 0);
      const sel = index === this.selectedPlant;
      view.card.setStrokeStyle(sel ? 6 : 2, sel ? 0xffc83d : 0x6ee7b7);
    });
    this.mano.setX(this.plantViews[this.selectedPlant].x);
    this.mision.avanceMedidor(this.plants.filter(p => p.water === 2).length);
  }

  checkEnd() {
    const allWatered = this.plants.every((p) => p.water === 2);
    const moldTotal = this.plants.reduce((sum, p) => sum + p.mold, 0);
    if (allWatered && this.floatingDrops === 0 && this.fanOn && moldTotal === 0) this.endGame(true);
    if (moldTotal >= 3) this.endGame(false);
  }

  endGame(success) {
    if (this.gameFinished) return;
    this.gameFinished = true;
    GameState.minijuegosHoy.invernadero = true;
    const extraO2 = 15 + GameState.asignacionEnergia.soporteVital * 3 + (GameState.personaje === "judith" ? 5 : 0);
    const n = success ? extraO2 : -12;
    GameState.modificarRecurso("oxigeno", n);
    this.mision.resultado({
      exito: success,
      sello: success ? "¡JARDÍN SALUDABLE!" : "MOHO EN EL INVERNADERO",
      cambios: [{ recurso: "oxigeno", n }],
      mensaje: success
        ? "¡Qué bonitas están! Nuestras plantas están sanas y llenando la nave de oxígeno puro."
        : "Cayó demasiada agua y salió moho. Tuvimos que gastar aire extra para limpiar el jardín.",
      alVolver: () => terminarMinijuego(this, success),
    });
  }
}
