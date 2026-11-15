// Minijuego del rol 2, adaptado al juego con mapa. Original: src/minijuegos/original/scenes/CO2FilterScene.js
import { sonido } from "../motor/sonido.js";
// src/scenes/CO2FilterScene.js
import { GameState } from "../mecanicas/estado.js";
import { terminarMinijuego, addText, addButton, drawPanel, createDaylightTracker, showAIMissionBriefing } from "./ui.js";

export class CO2FilterScene extends Phaser.Scene {
  constructor() { super("CO2FilterScene"); }

  create() {
    const params = GameState.getParametrosDificultad();
    this.gameFinished = false;
    this.timeLeft = params.tiempoCO2;
    this.placed = new Set();

    drawPanel(
      this,
      `SOL ${GameState.sol} · MINIJUEGO 2: EL INVENTO DEL APOLO 13`,
      "Arrastra cartón, cinta y manguera hasta su zona para adaptar el filtro cuadrado al tubo redondo.",
      "filtro"
    );

    this.progress = addText(this, 310, 138, "🧩 Piezas colocadas: 0 / 3", 17, "#f8fafc");
    this.timerText = addText(this, 730, 138, `⏳ Tiempo: ${this.timeLeft} s`, 17, "#fde047");

    // Contenedores más altos (360px) con cabeceras internas
    this.add.image(245, 355, "mj_bandeja").setDisplaySize(310, 365);      // bandeja de herramientas con espuma
    this.add.image(685, 355, "mj_adaptador").setDisplaySize(420, 365);    // cartucho cuadrado de LiOH y tubo redondo
    addText(this, 245, 198, "PIEZAS DISPONIBLES", 16, "#93c5fd");
    addText(this, 685, 198, "ADAPTADOR DEL FILTRO", 16, "#93c5fd");
    // Rótulos del adaptador como texto del juego (antes iban dentro del dibujo, a ~10 px e ilegibles)
    addText(this, 542, 384, "LiOH · CUADRADO", 16, "#d6dcff");
    addText(this, 827, 380, "TUBO · REDONDO", 16, "#d6dcff");
    addText(this, 682, 508, "¿Cómo encajar un cuadrado en un círculo?", 16, "#ffd678");

    const targets = [
      { id: "cardboard", x: 595, y: 275, label: "1 · CARTÓN (Embudo)" },
      { id: "tape", x: 775, y: 275, label: "2 · CINTA (Sellado)" },
      { id: "hose", x: 685, y: 425, label: "3 · MANGUERA (Tubo)" },
    ];

    targets.forEach((target) => {
      this.add.image(target.x, target.y, `mj_ranura_${{ cardboard: "carton", tape: "cinta", hose: "manguera" }[target.id]}`).setDisplaySize(150, 74);
      const zone = this.add.rectangle(target.x, target.y, 150, 74, 0x263554, 0.01)
        .setStrokeStyle(2, 0x94a3b8, 0.5);
      zone.setData("pieceId", target.id);
      zone.setInteractive({ dropZone: true });
      // Etiqueta debajo de la caja sin pisar el borde
      addText(this, target.x, target.y + 52, target.label, 14, "#cbd5e1");
    });

    const pieces = [
      { id: "cardboard", x: 245, y: 265, img: "mj_carton", label: "CARTÓN" },
      { id: "tape", x: 245, y: 355, img: "mj_cinta", label: "CINTA" },
      { id: "hose", x: 245, y: 445, img: "mj_manguera", label: "MANGUERA" },
    ];

    pieces.forEach((piece) => {
      // pieza ilustrada; su nombre va debajo, en una placa, para no tapar el dibujo
      const block = this.add.image(piece.x, piece.y, piece.img).setDisplaySize(175, 56).setDepth(5)
        .setInteractive({ draggable: true, useHandCursor: true });
      block.setData("pieceId", piece.id);
      const label = addText(this, piece.x, piece.y + 36, piece.label, 14, "#e2e8f0").setDepth(6)
        .setBackgroundColor("#131d33").setPadding(6, 2, 6, 2);
      block.setData("labelObject", label);

      block.on("dragstart", () => block.setDisplaySize(175 * 1.06, 56 * 1.06).setDepth(8));
      block.on("drag", (pointer, dragX, dragY) => {
        if (this.gameFinished) return;
        block.setPosition(dragX, dragY);
        label.setPosition(dragX, dragY + 36).setDepth(9);
      });
      block.on("dragend", () => {
        if (!this.placed.has(piece.id)) {
          block.setDisplaySize(175, 56).setDepth(5);
          block.setPosition(piece.x, piece.y);
          label.setPosition(piece.x, piece.y + 36).setDepth(6);
        }
      });
      this.input.setDraggable(block);
    });

    this.input.on("drop", (pointer, gameObject, dropZone) => {
      if (this.gameFinished) return;
      const pieceId = gameObject.getData("pieceId");
      const targetId = dropZone.getData("pieceId");
      if (pieceId === targetId && !this.placed.has(pieceId)) {
        this.placed.add(pieceId);
        sonido.efecto("mj_filtro_clic", 0.7);
        dropZone.setFillStyle(0x15803d, 0.28).setStrokeStyle(3, 0x4ade80);
        gameObject.disableInteractive();
        gameObject.setDisplaySize(175 * 0.82, 56 * 0.82).setDepth(5);
        gameObject.setPosition(dropZone.x, dropZone.y);
        gameObject.getData("labelObject").setVisible(false);
        this.progress.setText(`🧩 Piezas colocadas: ${this.placed.size} / 3`);
        if (this.placed.size === 3) this.endGame(true);
      } else {
        this.cameras.main.shake(120, 0.003);
      }
    });

    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.gameFinished || this.paused) return;
        this.timeLeft--;
        this.timerText.setText(`⏳ Tiempo: ${this.timeLeft} s`);
        this.daylight.update(this.timeLeft);
        if (this.timeLeft <= 0) this.endGame(false);
      },
    });

    this.maxTime = this.timeLeft;
    this.daylight = createDaylightTracker(this, this.maxTime);
    this.paused = true;

    showAIMissionBriefing(this, "paneles", () => {
      this.paused = false;
    });
  }

  endGame(success) {
    if (this.gameFinished) return;
    this.gameFinished = true;

    GameState.minijuegosHoy.co2 = true;
    const extraO2 = 15 + GameState.asignacionEnergia.soporteVital * 3 + (GameState.personaje === "atlas" ? 5 : 0);

    if (success) {
      GameState.modificarRecurso("oxigeno", extraO2);
    } else {
      GameState.modificarRecurso("oxigeno", -15);
    }

    this.add.rectangle(480, 300, 960, 600, 0x090d16, 0.85).setDepth(20);
    this.add.rectangle(480, 300, 640, 290, 0x16213e).setStrokeStyle(3, success ? 0x4ade80 : 0xf87171).setDepth(21);
    addText(this, 480, 200, success ? "¡FILTRO SELLADO!" : "FUGA DE CO₂", 22, success ? "#4ade80" : "#f87171").setDepth(22);
    addText(this, 480, 245, success ? `+${extraO2} de Oxígeno` : "-15 de Oxígeno", 18, "#fde047").setDepth(22);
    this.add.text(480, 305, success
      ? "¡Lo lograste! El filtro quedó súper bien sellado y ya respiramos aire fresco otra vez."
      : `Solo colocaste ${this.placed.size} de 3 piezas. Se escapó gas malo en la cabina.`, {
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: "15px", color: "#ffffff", align: "center", wordWrap: { width: 560 },
    }).setOrigin(0.5).setDepth(22);

    const btn = addButton(this, 480, 395, "VOLVER A LA BASE", () => {
      terminarMinijuego(this, success);
    }, 260);
    btn.bg.setDepth(22);
    btn.txt.setDepth(23);
  }
}