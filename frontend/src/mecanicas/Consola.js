// Pantallas de la consola (rol 2), sacadas de SolLoopScene del prototipo de minijuegos:
//  - 'MAÑANA': repartir los 6 núcleos de energía (se abre en la consola de Mando)
//  - 'MEJORA': elegir una carta de mejora al terminar el sol (después de dormir en el Refugio)
//  - 'FINAL': reporte final de la IA (victoria o fin de la misión)
// El día, la emergencia y la noche ya no son pantallas: pasan en el mapa (ver ciclo.js).
import { addText, addButton, drawPanel } from '../minijuegos/ui.js';
import { GameState } from './estado.js';
import { CARTAS_MEJORA } from './datos.js';
import { sonido } from '../motor/sonido.js';
import { guia } from '../compania/guia.js';

// Calificación de misión (IA guía): colores de cada medalla y lo que dice la IA
const MEDALLA = {
  oro: { nombre: 'Medalla de oro', color: 0xf5c542, borde: 0x9a6b10, frase: '¡Dominas la base! Eres un gran astronauta.' },
  plata: { nombre: 'Medalla de plata', color: 0xd7dde6, borde: 0x6b7686, frase: '¡Vas muy bien! Un poco más de práctica y es de oro.' },
  bronce: { nombre: 'Medalla de bronce', color: 0xd08a4e, borde: 0x7a4520, frase: '¡Buen comienzo! Cada misión te enseña algo nuevo.' },
};

export default class Consola extends Phaser.Scene {
  constructor() { super('Consola'); }

  init(datos) {
    this.modo = datos.modo;
    this.alTerminar = datos.alTerminar;
    this.motivo = datos.motivo;
  }

  create() {
    const titulos = {
      'MAÑANA': [`SOL ${GameState.sol} / 10 · CONSOLA DE MANDO`, 'La batería no alcanza para todo. Reparte los 6 núcleos de energía antes de iniciar el día.'],
      MEJORA: [`SOL ${GameState.sol} / 10 · RECUERDO DESBLOQUEADO`, 'P.I.E.D.R.A desbloqueó un recuerdo histórico. Elige una carta de mejora.'],
    };
    if (this.modo === 'FINAL') { this.renderPantallaFinal(this.motivo); return; }
    drawPanel(this, ...titulos[this.modo], 'consola');
    this.dibujarBarraRecursos();
    if (this.modo === 'MAÑANA') this.renderManana();
    else this.renderMejora();
  }

  terminar(datos) {
    const fin = this.alTerminar;
    this.events.once('shutdown', () => queueMicrotask(() => fin?.(datos)));   // avisar ya apagada (ver Dialogo.cerrar)
    this.scene.stop();
  }

  dibujarBarraRecursos() {
    const { energia, oxigeno, blindaje } = GameState.recursos;
    const items = [
      { label: `⚡ Energía: ${energia}/${GameState.energiaMaxima}`, val: energia / GameState.energiaMaxima, color: 0xfacc15, x: 210 },
      { label: `🫧 Oxígeno: ${oxigeno}/100`, val: oxigeno / 100, color: 0x38bdf8, x: 480 },
      { label: `🛡️ Blindaje: ${blindaje}/100`, val: blindaje / 100, color: 0x4ade80, x: 750 },
    ];
    items.forEach(item => {
      this.add.rectangle(item.x, 140, 240, 36, 0x0f172a).setStrokeStyle(2, 0x334155);
      const fillWidth = Math.max(0, Math.min(232, Math.round(232 * item.val)));
      this.add.rectangle(item.x - 116 + fillWidth / 2, 140, fillWidth, 28, item.color, 0.28);
      addText(this, item.x, 140, item.label, 14, '#f8fafc');
    });
  }

  // MAÑANA: consola de mando (igual que en el prototipo)
  renderManana() {
    const sistemas = [
      { key: 'paneles', nombre: 'Colectores Solares', desc: 'Más tiempo y +Energía al limpiar paneles' },
      { key: 'soporteVital', nombre: 'Soporte Vital (CO₂ + Jardín)', desc: 'Más tiempo y +Oxígeno en filtro e invernadero' },
      { key: 'escudos', nombre: 'Escudos del Casco', desc: 'Evita desgaste del blindaje (0 núcleos = -8 Blindaje)' },
    ];
    const usados = () => GameState.asignacionEnergia.paneles + GameState.asignacionEnergia.soporteVital + GameState.asignacionEnergia.escudos;
    this.nucleosTxt = addText(this, 480, 185, '', 18, '#38bdf8');
    const filas = [];
    sistemas.forEach((sys, i) => {
      const y = 250 + i * 78;
      this.add.rectangle(480, y, 820, 64, 0x1e293b).setStrokeStyle(2, 0x475569);
      addText(this, 230, y - 10, sys.nombre, 16, '#ffffff');
      addText(this, 230, y + 14, sys.desc, 12, '#94a3b8');
      const barra = addText(this, 560, y, '', 18, '#4ade80');
      filas.push({ key: sys.key, barra });
      addButton(this, 710, y, '-', () => {
        if (GameState.asignacionEnergia[sys.key] > 0) { GameState.asignacionEnergia[sys.key]--; actualizar(); }
      }, 48);
      addButton(this, 775, y, '+', () => {
        if (usados() < GameState.nucleosDisponibles && GameState.asignacionEnergia[sys.key] < 3) { GameState.asignacionEnergia[sys.key]++; actualizar(); }
      }, 48);
    });
    const actualizar = () => {
      const libres = GameState.nucleosDisponibles - usados();
      this.nucleosTxt.setText(`Núcleos disponibles para repartir: ${libres} de ${GameState.nucleosDisponibles} (Demanda total: 9)`);
      filas.forEach(f => {
        const val = GameState.asignacionEnergia[f.key];
        f.barra.setText(`${'⚡'.repeat(val)}${'·'.repeat(3 - val)} (${val}/3)`);
      });
    };
    actualizar();
    addButton(this, 480, 535, 'CONFIRMAR ENERGÍA E IR AL DÍA', () => {
      if (GameState.asignacionEnergia.escudos === 0) GameState.modificarRecurso('blindaje', -8);
      if (GameState.asignacionEnergia.soporteVital === 0) GameState.modificarRecurso('oxigeno', -8);
      this.terminar();
    }, 340);
  }

  // MEJORA: carta al terminar el sol
  renderMejora() {
    const disponibles = CARTAS_MEJORA.filter(c => !GameState.mejoras[c.id]);
    if (!disponibles.length) { this.time.delayedCall(10, () => this.terminar()); return; }
    sonido.efecto('ui_carta_voltea', 0.8);
    const opciones = Phaser.Utils.Array.Shuffle([...disponibles]).slice(0, 2);
    opciones.forEach((carta, idx) => {
      const x = opciones.length === 1 ? 480 : 300 + idx * 360;
      this.add.rectangle(x, 325, 320, 230, 0x13382c).setStrokeStyle(3, 0x34d399);
      addText(this, x, 240, `🃏 ${carta.nombre}`, 16, '#6ee7b7');
      addText(this, x, 270, `Área: ${carta.rama}`, 13, '#a7f3d0');
      this.add.text(x, 325, carta.desc, { fontSize: '14px', color: '#ffffff', align: 'center', wordWrap: { width: 280 },
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif', resolution: 2 }).setOrigin(0.5);
      addButton(this, x, 405, 'EQUIPAR CARTA', () => {
        GameState.mejoras[carta.id] = true;
        sonido.efecto('ui_carta_mejora', 0.8);
        this.terminar(carta.id);
      }, 210);
    });
  }

  // FINAL: textos del prototipo; la voz y la música las pone antes el nudo fin_* de la historia
  renderPantallaFinal(motivo) {
    const textos = {
      VICTORIA: { titulo: '🏆 ¡VICTORIA! COMPLETASTE LOS 10 SOLES', color: '#4ade80',
        cuerpo: '«¡Bip-hurra! ¡Lo logramos, equipo! Han pasado 10 soles enteros en este rincón del universo y seguimos aquí. No fue solo suerte: fue su curiosidad, su valentía y sus ganas de aprender lo que nos trajo hasta este amanecer. ¡Porque lo intentaron... lo lograron!»' },
      ENERGIA: { titulo: '🪫 FIN DE LA MISIÓN · SE ACABÓ LA BATERÍA', color: '#f87171',
        cuerpo: '«¡Oh, no! Nos quedamos sin batería y mis circuitos entraron en modo descanso. Pero guardé todo lo que aprendimos en mi caja negra para intentarlo de nuevo. ¡La próxima vez lo lograremos!»' },
      OXIGENO: { titulo: '🫧 FIN DE LA MISIÓN · FALTÓ AIRE EN CABINA', color: '#f87171',
        cuerpo: '«El aire de la cabina se agotó y la tripulación tuvo que entrar en sueño espacial de emergencia. ¡Revisa bien los filtros y las plantas en tu siguiente intento!»' },
      BLINDAJE: { titulo: '🛡️ FIN DE LA MISIÓN · ESCUDO ROTO', color: '#f87171',
        cuerpo: '«El escudo de la nave recibió demasiados golpes del espacio y debemos regresar a reparar. ¡Ya sabes cómo enfrentar las tormentas espaciales, inténtalo otra vez!»' },
    };
    const info = textos[motivo] ?? textos.VICTORIA;
    drawPanel(this, info.titulo, 'Reporte final de P.I.E.D.R.A · Base Marte Uno', 'consola');
    this.dibujarBarraRecursos();
    this.add.text(480, 206, info.cuerpo, { fontSize: '15px', color: info.color, align: 'center', wordWrap: { width: 820 }, lineSpacing: 5,
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif', resolution: 2 }).setOrigin(0.5);
    this.dibujarCalificacion(guia.calificacion(motivo === 'VICTORIA'));
    // El reporte completo (el niño ve sus estrellas; el adulto, los números): src/compania/Aprendizaje.js
    addButton(this, 340, 548, 'VER LO QUE APRENDÍ', () => this.scene.get('Aprendizaje')?.abrir(true), 250);
    addButton(this, 620, 548, 'VOLVER A INTENTAR', () => this.terminar('reiniciar'), 250);
  }

  // Calificación de misión: la medalla a la izquierda y las estrellas de cada tema a la derecha
  dibujarCalificacion(c) {
    const m = MEDALLA[c.medalla];
    this.add.rectangle(480, 395, 860, 230, 0x0f172a, 0.92).setStrokeStyle(2, 0x334155);
    const g = this.add.graphics();                 // después del fondo: si no, la medalla queda debajo
    addText(this, 480, 300, 'CALIFICACIÓN DE MISIÓN', 18, '#facc15');
    // medalla con su cinta
    const mx = 220, my = 395;
    g.fillStyle(0xb8473d, 1).fillTriangle(mx - 34, my - 92, mx - 4, my - 92, mx - 14, my - 40).fillTriangle(mx + 4, my - 92, mx + 34, my - 92, mx + 14, my - 40);
    g.fillStyle(m.borde, 1).fillCircle(mx, my, 50);
    g.fillStyle(m.color, 1).fillCircle(mx, my, 44);
    g.lineStyle(3, m.borde, 1).strokeCircle(mx, my, 36);
    this.estrellaFinal(g, mx, my, 22, true, m.borde);
    addText(this, mx, my + 68, m.nombre, 17, '#ffffff');
    addText(this, mx, my + 92, `Puntaje: ${c.puntaje} de 100`, 14, '#94a3b8');
    // los cuatro temas con sus estrellas
    c.temas.forEach((t, i) => {
      const y = 335 + i * 38;
      addText(this, 470, y, t.nombre, 16, '#f8fafc', 'left').setOrigin(0, 0.5);
      for (let k = 0; k < 4; k++) this.estrellaFinal(g, 650 + k * 30, y, 11, k < t.nivel.estrellas, 0x141026);
      addText(this, 780, y, t.nivel.texto, 13, '#fbbf24', 'left').setOrigin(0, 0.5);
    });
    addText(this, 620, 490, `P.I.E.D.R.A: «${m.frase}»`, 14, '#cbd5e1');
    sonido.efecto(c.medalla === 'bronce' ? 'ui_carta_voltea' : 'ui_carta_mejora', 0.8);
  }

  estrellaFinal(g, x, y, r, llena, tinta) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
    }
    if (llena) g.fillStyle(0xfacc15, 1).fillPoints(pts, true);
    g.lineStyle(2, llena ? tinta : 0x94a3b8, 1).strokePoints(pts, true, true);
  }
}
