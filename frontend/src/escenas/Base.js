// Escena principal: una sala de la base, al estilo de Hades. Cada sala es un diorama isométrico
// con el paisaje de Marte alrededor; se pasa de una sala a otra por las puertas.
// Rol 1: salas, astronauta, colisiones, cámara, puertas y detección de estaciones.
// No contiene reglas del juego: avisa por el bus y el rol 2 decide qué pasa.
// Las salas las pinta herramientas/pintar_zonas.py (assets/zonas/zonas.json).
import { VELOCIDAD, ACELERACION, FRENADO, RADIO_INTERACCION, ZOOM_MAX, DEPURAR_AL_INICIO, COLOR_SISTEMA, FASES_LUZ } from '../motor/config.js';
import { bus, EV, control } from '../motor/eventos.js';
import Luces from '../motor/luces.js';
import { asegurarFlecha } from '../motor/flecha.js';
import { sonido } from '../motor/sonido.js';
import { cargas, ZONA_INICIAL } from '../motor/cargas.js';
import { idioma } from '../motor/idioma.js';

const RADIO = 0.27;          // radio de los pies del astronauta, en casillas
const ESCALA_ARTE = 0.5;     // el arte de las salas está pintado al doble
// Astronautas del mapa (assets/personajes/mapa/hojas.json): cuerpo de 176 px en la textura; origen en los pies
// Paso: 8 cuadros a 11 por segundo a velocidad normal (más lento si camina despacio) y, encima, el balanceo suave
// del astronauta provisional, más corto (los cuadros ya inclinan el cuerpo)
const PJ = { cuerpo: 176, origenX: 0.5, origenY: 0.9963, fps: 11, balanceo: 3.5, rebote: 0.035 };
const ALTO_PJ = 43;         // alto del cuerpo en el mapa antes de la escala real (como el astronauta provisional)

export default class Base extends Phaser.Scene {
  constructor() { super('Base'); }

  init(datos) { this.entrada = datos ?? {}; }

  create() {
    control.bloqueado = false;
    this.saliendo = false;
    const datos = this.cache.json.get('zonas');
    if (!datos) { console.error('[mapa] Falta assets/zonas/zonas.json: ejecuta python herramientas/pintar_zonas.py'); return; }
    this.zonas = datos.zonas;
    this.TW = datos.TW; this.TH = datos.TH;
    // Escala real (1 casilla = 1,3 m): el astronauta (1,9 m) y el robot se dibujan al doble que su textura
    this.escalaPj = datos.escala_personajes ?? 1;
    const id = this.entrada.zona ?? this.registry.get('zona') ?? datos.inicial;
    this.registry.set('zona', id);
    const z = this.z = this.zonas[id];

    // --- Arte de la sala ---
    this.add.image(0, 0, `zona_${id}_fondo`).setOrigin(0).setScale(ESCALA_ARTE).setDepth(0);
    // Letreros del muro y del suelo en el idioma del juego (encima del fondo y debajo de los objetos)
    (z.letreros ?? []).forEach((l, i) => {
      const lengua = idioma.ingles && l.en ? 'en' : 'es', d = l[lengua], clave = `letrero_${id}_${i}_${lengua}`;
      if (d && this.textures.exists(clave)) this.add.image(d.x, d.y, clave).setOrigin(0).setScale(ESCALA_ARTE).setDepth(0.02);
    });
    // el frente viene recortado a lo que tiene dibujo (el murete delantero): se coloca en su sitio
    this.add.image(z.frente_x ?? 0, z.frente_y ?? 0, `zona_${id}_frente`).setOrigin(0).setScale(ESCALA_ARTE).setDepth(9);
    this.props = z.props.map(p => {
      const prop = { ...p, img: this.add.image(p.x, p.y, p.clave).setOrigin(0).setScale(ESCALA_ARTE).setDepth(4) };
      if (p.anim && this.textures.exists(p.animClave)) {    // lo que se mueve (soplante, LED, pantalla), encima del cuerpo
        if (!this.anims.exists(p.animClave)) {
          this.anims.create({ key: p.animClave, frames: this.anims.generateFrameNumbers(p.animClave, { start: 0, end: p.cuadros - 1 }), frameRate: p.fps, repeat: -1 });
        }
        prop.anim = this.add.sprite(p.x, p.y, p.animClave, 0).setOrigin(0).setScale(ESCALA_ARTE).setDepth(4.01).play(p.animClave);
      }
      return prop;
    });

    // Huella real de cada objeto (escala real): la colisión ya no ocupa la casilla entera
    this.obstaculos = z.props.filter(p => p.caja).map(p => p.caja);

    // --- Estaciones ---
    this.estaciones = z.estaciones.map(e => {
      const { x, y } = this.iso(e.c + 0.5, e.r + 0.5);
      const anillo = this.add.ellipse(x, y - 2, 56, 28, COLOR_SISTEMA[e.sistema] ?? 0xffffff, 0.14).setDepth(1);
      return { x, y, c: e.c, r: e.r, anillo, datos: { nombre: e.nombre, accion: e.accion, sistema: e.sistema, etiqueta: e.etiqueta } };
    });
    this.alfaAnillo = [0.14, 0.34];               // siempre se ven un poco; al alcance, más

    // --- Astronauta: posición lógica en casillas (pc, pr); se dibuja en pantalla con la proyección ---
    let [c, r] = z.inicio;
    const llegada = z.puertas[this.entrada.llegada];
    this.autoCamino = null;
    if (llegada) {                        // aparece en el umbral y entra caminando solo, como en Hades
      this.autoCamino = this.dentroDePuerta(llegada);
      [c, r] = this.enUmbral(llegada);
      control.bloqueado = true;
    }
    this.pc = c; this.pr = r;
    const p0 = this.iso(c, r);
    const S = this.escalaPj;
    this.sombra = this.add.ellipse(p0.x, p0.y, 24 * S, 10 * S, 0x282256, 0.45).setDepth(4.9);
    // El astronauta que se eligió, con su paso dibujado; sin su hoja, el provisional con balanceo
    const hoja = `pj_${this.registry.get('personaje') ?? 'wenceslao'}`;
    this.conPaso = this.textures.exists(hoja);
    if (this.conPaso) {
      if (!this.anims.exists(`${hoja}_paso`)) {
        this.anims.create({ key: `${hoja}_paso`, frames: this.anims.generateFrameNumbers(hoja, { start: 0, end: 7 }), frameRate: PJ.fps, repeat: -1 });
      }
      this.escalaCuerpo = S * ALTO_PJ / PJ.cuerpo;
      this.animPaso = `${hoja}_paso`;
      this.pj = this.add.sprite(p0.x, p0.y, hoja, 0).setOrigin(PJ.origenX, PJ.origenY).setScale(this.escalaCuerpo).setDepth(5);
    } else {
      this.escalaCuerpo = S;
      this.pj = this.add.image(p0.x, p0.y, 'astronauta').setOrigin(0.5, 0.95).setScale(S).setDepth(5);
    }
    this.pj.body = { center: new Phaser.Math.Vector2(p0.x, p0.y), destroy() {} };   // la IA del robot sigue este punto
    if (llegada) {                                  // sale de la oscuridad del hueco de la puerta
      this.pj.setAlpha(0); this.sombra.setAlpha(0);
      this.tweens.add({ targets: this.pj, alpha: 1, duration: 280, ease: 'Sine.out' });
      this.tweens.add({ targets: this.sombra, alpha: 0.45, duration: 280 });
    }
    this.vel = new Phaser.Math.Vector2();
    this.mira = new Phaser.Math.Vector2();          // adelanto de la cámara hacia donde camina
    this.proximoPaso = 0;
    const giro = this.conPaso ? PJ.balanceo : 6;
    this.balanceo = this.tweens.add({ targets: this.pj, angle: { from: -giro, to: giro }, duration: this.conPaso ? 180 : 160,
      ease: 'Sine.inOut', yoyo: true, repeat: -1, paused: true });
    this.fasePaso = 0;                              // para el rebote al pisar

    // --- Cámara ---
    const cam = this.cameras.main;
    cam.setBounds(0, 0, z.ancho, z.alto);
    cam.startFollow(this.pj, true, 0.1, 0.1, 0, 40);
    cam.centerOn(p0.x, p0.y - 40);
    this.ajustarZoom(this.scale.width, this.scale.height);
    cam.fadeIn(260, 20, 16, 38);

    // Memoria: quedan cargadas esta sala, el Pasillo y la del objetivo; las demás se liberan (se vuelven a pedir al ir)
    this.time.delayedCall(400, () => this.ordenarSalas());
    const alRedimensionar = s => this.ajustarZoom(s.width, s.height);
    this.scale.on('resize', alRedimensionar);

    // --- Luz y visión (src/motor/luces.js). En cada sala la visión es un círculo alrededor del astronauta ---
    const lamparas = z.lamparas.map(([lc, lr]) => ({ ...this.iso(lc, lr), w: this.TW * 5, h: this.TH * 5 }));
    this.luces = new Luces(this, { ancho: z.ancho, alto: z.alto, casilla: 32, esMuro: () => false, lamparas, estaciones: this.estaciones });
    this.fases = Object.keys(FASES_LUZ);
    this.luces.ponerFase(this.registry.get('estado')?.fase ?? this.registry.get('faseLuz') ?? 'dia');
    this.luces.actual = { ...FASES_LUZ[this.luces.fase] };     // al entrar, sin transición

    // --- Teclado ---
    this.teclas = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE,ESC,F2,F3');
    const usar = () => { if (control.modal) return; control.bloqueado ? bus.emit(EV.CERRAR_PANEL) : this.interactuar(); };
    this.teclas.E.on('down', usar);
    this.teclas.SPACE.on('down', usar);
    this.teclas.ESC.on('down', () => control.bloqueado && !control.modal && bus.emit(EV.CERRAR_PANEL));
    this.teclas.F2.on('down', () => this.depurar(!this.depuracion));
    this.teclas.F3.on('down', () => {
      const f = this.fases[(this.fases.indexOf(this.luces.fase) + 1) % this.fases.length];
      this.registry.set('faseLuz', f);
      this.cambiarFase(f);
      console.info(`[luces] fase: ${f}`);
    });

    // --- Bus ---
    const alCerrar = () => {
      if (this.saliendo || this.autoCamino || control.modal) return;   // hay una pantalla encima (diálogo, minijuego)
      control.bloqueado = false;
      this.cameras.main.zoomTo(this.zoomBase, 260, 'Sine.easeInOut');
    };
    const alPedir = () => !control.bloqueado && this.interactuar();
    const alEstado = e => e?.fase && this.cambiarFase(e.fase);
    const alObjetivo = n => { this.registry.set('objetivo', n); this.ponerObjetivo(n); this.ordenarSalas(); };
    bus.on(EV.CERRAR_PANEL, alCerrar);
    bus.on(EV.PEDIR_INTERACCION, alPedir);
    bus.on(EV.ESTADO_CAMBIO, alEstado);
    bus.on(EV.OBJETIVO, alObjetivo);
    this.events.once('shutdown', () => {
      bus.off(EV.CERRAR_PANEL, alCerrar); bus.off(EV.PEDIR_INTERACCION, alPedir);
      bus.off(EV.ESTADO_CAMBIO, alEstado); bus.off(EV.OBJETIVO, alObjetivo);
      this.scale.off('resize', alRedimensionar);
      this.luces.destruir();
      bus.emit(EV.CERCA_DE, null);
    });

    this.cerca = null;
    this.habitacionActual = null;
    this.ponerObjetivo(this.registry.get('objetivo') ?? null);

    this.crearVida();

    // --- Depuración ---
    this.depGraf = this.add.graphics().setDepth(20).setVisible(false);
    this.depuracion = false;
    if (DEPURAR_AL_INICIO) this.depurar(true);
  }

  // Estrellas que titilan, polvo que cruza el suelo marciano, un remolino de polvo y luces en las máquinas
  crearVida() {
    const z = this.z, rnd = new Phaser.Math.RandomDataGenerator([z.id]);
    const techo = z.oy - (z.muro ?? 128) - 14;
    for (let i = 0; i < 46; i++) {
      const e = this.add.circle(rnd.between(0, z.ancho), rnd.between(6, Math.max(20, techo)), rnd.pick([0.7, 0.9, 1.2]), 0xf3e3c3, 0.9).setDepth(0.5);
      this.tweens.add({ targets: e, alpha: 0.15, duration: rnd.between(700, 2200), yoyo: true, repeat: -1, delay: rnd.between(0, 2000) });
    }
    // zonas de suelo exterior a los lados y delante de la sala
    const izq = this.iso(0, z.rows).x - 40, der = this.iso(z.cols, 0).x + 40, pie = this.iso(z.cols, z.rows).y + (z.losa ?? 28) + 30;
    const zonas = [[0, izq, (z.horizonte ?? 260) + 30, z.alto - 10], [der, z.ancho, (z.horizonte ?? 260) + 30, z.alto - 10], [0, z.ancho, pie, z.alto - 10]];
    this.polvo = [];
    for (let i = 0; i < 40; i++) {
      const zona = zonas[i % 3];
      const m = this.add.circle(rnd.between(zona[0], zona[1]), rnd.between(zona[2], zona[3]), rnd.pick([1, 1.4, 2]), 0xe6b58a, 0.55).setDepth(0.6);
      this.polvo.push({ m, zona, v: rnd.realInRange(10, 28), fase: rnd.realInRange(0, 6.28) });
    }
    // remolino de polvo (lo grabó Curiosity en el cráter Gale)
    if (!this.textures.exists('remolino')) {
      const g = this.make.graphics({}, false);
      for (let k = 0; k < 9; k++) {
        g.lineStyle(3 - k * 0.2, 0xd8a684, 0.55 - k * 0.04);
        g.strokeEllipse(20 + k * 1.5, 120 - k * 13, 14 + k * 4, 6 + k * 1.2);
      }
      g.generateTexture('remolino', 64, 130);
      g.destroy();
    }
    this.remolino = this.add.image(rnd.between(40, z.ancho - 40), z.alto - 70, 'remolino').setOrigin(0.4, 1).setDepth(0.7).setAlpha(0.8);
    this.remolinoDir = rnd.pick([-1, 1]);
    // luces que parpadean encima de las máquinas
    this.lucesMaq = [];
    for (const p of this.props) {
      if (p.tipo !== 'maquina' || p.anim || z.sistema === 'blindaje') continue;   // las estaciones ya traen su animación
      for (const [u, col] of [[0.35, COLOR_SISTEMA[z.sistema] ?? 0xe48ad8], [0.6, 0xffc83d]]) {
        const q = this.iso(p.c + u, p.r + 0.35);
        const l = this.add.ellipse(q.x, q.y - 64, 7, 4, col, 1).setDepth(4.01);
        this.tweens.add({ targets: l, alpha: 0.2, duration: Phaser.Math.Between(300, 900), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 800) });
        this.lucesMaq.push({ l, p });
      }
    }
  }

  animarVida(t, dt) {
    const s = (dt ?? 16.67) / 1000;
    for (const d of this.polvo) {
      d.m.x += d.v * s;
      d.m.y += Math.sin(t / 700 + d.fase) * 6 * s;
      if (d.m.x > d.zona[1]) d.m.x = d.zona[0];
    }
    const r = this.remolino;
    r.x += this.remolinoDir * 14 * s;
    r.angle = Math.sin(t / 260) * 4;
    r.scaleX = 1 + Math.sin(t / 180) * 0.08;
    if (r.x < 30 || r.x > this.z.ancho - 30) this.remolinoDir *= -1;
    for (const { l, p } of this.lucesMaq) l.setDepth(p.img.depth + 0.01);
  }

  // Polvo que levantan las botas al caminar
  pisada(x, y) {
    const S = this.escalaPj;
    const n = this.add.ellipse(x + Phaser.Math.Between(-4, 4) * S, y, 10 * S, 4 * S, 0xbfb8ee, 0.55).setDepth(4.8);
    this.tweens.add({ targets: n, scaleX: 2.2, scaleY: 1.8, alpha: 0, y: y - 4 * S, duration: 420, ease: 'Cubic.out', onComplete: () => n.destroy() });
  }

  // Casilla (c, r) -> punto de la pantalla (px de juego)
  iso(c, r) {
    return { x: this.z.ox + (c - r) * this.TW / 2, y: this.z.oy + (c + r) * this.TH / 2 };
  }

  ajustarZoom(w, h) {
    const base = Math.min(1.5, Math.max(0.8, Math.min(w, h) / 560));   // se ve casi toda la sala, como en Hades
    this.zoomBase = Math.max(base, w / this.z.ancho, h / this.z.alto);
    this.cameras.main.setZoom(this.zoomBase);
  }

  // --- Colisiones en casillas ---
  enHueco(p, c, r) {
    const { cols, rows } = this.z, a = p.pos + 0.04, b = p.pos + 0.96;
    if (p.lado === 'n') return r < 0 && r > -1.3 && c > a && c < b;
    if (p.lado === 's') return r >= rows && r < rows + 1.3 && c > a && c < b;
    if (p.lado === 'o') return c < 0 && c > -1.3 && r > a && r < b;
    return c >= cols && c < cols + 1.3 && r > a && r < b;
  }

  // ¿Este punto está dentro de la sala (o en el hueco de una puerta)?
  libre(c, r) {
    const z = this.z;
    if (c >= 0 && r >= 0 && c < z.cols && r < z.rows) {
      return this.obstaculos.length ? true : !z.bloq[Math.floor(r)][Math.floor(c)];   // salas antiguas: por casillas
    }
    return z.puertas.some(p => this.enHueco(p, c, r));
  }

  // ¿Cabe el astronauta aquí? Dentro de la sala y sin tocar la huella real de ningún objeto
  cabe(c, r) {
    if (!(this.libre(c - RADIO, r - RADIO) && this.libre(c + RADIO, r - RADIO)
      && this.libre(c - RADIO, r + RADIO) && this.libre(c + RADIO, r + RADIO))) return false;
    return this.obstaculos.every(o => c + RADIO <= o[0] || c - RADIO >= o[2] || r + RADIO <= o[1] || r - RADIO >= o[3]);
  }

  // Punto dentro de la sala, frente a la puerta: al entrar camina solo hasta él (1,5 m si está libre)
  dentroDePuerta(p) {
    const { cols, rows } = this.z;
    const punto = d => p.lado === 'n' ? [p.pos + 0.5, d] : p.lado === 's' ? [p.pos + 0.5, rows - d]
      : p.lado === 'o' ? [d, p.pos + 0.5] : [cols - d, p.pos + 0.5];
    const lejos = punto(1.2);
    return this.obstaculos?.length && this.cabe(...lejos) ? lejos : punto(0.6);
  }

  // Punto del hueco de la puerta, justo fuera de la sala (sin llegar a cruzarla)
  enUmbral(p) {
    const { cols, rows } = this.z;
    if (p.lado === 'n') return [p.pos + 0.5, -0.4];
    if (p.lado === 's') return [p.pos + 0.5, rows + 0.4];
    if (p.lado === 'o') return [-0.4, p.pos + 0.5];
    return [cols + 0.4, p.pos + 0.5];
  }

  // Punto de la pantalla junto a la puerta (para flechas)
  puntoPuerta(p) {
    const { cols, rows } = this.z;
    const [c, r] = p.lado === 'n' ? [p.pos + 0.5, -0.3] : p.lado === 's' ? [p.pos + 0.5, rows + 0.4]
      : p.lado === 'o' ? [-0.3, p.pos + 0.5] : [cols + 0.4, p.pos + 0.5];
    return this.iso(c, r);
  }

  cruzar(p) {
    if (this.saliendo) return;
    this.saliendo = true;
    control.bloqueado = true;
    this.vel.set(0, 0);
    this.autoCamino = this.enUmbral(p);            // entra en el hueco de la puerta y ahí se desvanece
    sonido.efecto('sfx_puerta_presurizada', 0.45);
    this.tweens.add({ targets: [this.pj, this.sombra], alpha: 0, duration: 260, ease: 'Sine.in' });
    this.cameras.main.fadeOut(300, 20, 16, 38);
    // la sala de destino se pide ya (casi siempre llega antes de que termine el fundido)
    const lista = cargas.asegurar(`zona:${p.destino}`);
    this.cameras.main.once('camerafadeoutcomplete', async () => {
      const aviso = this.time.delayedCall(250, () => {                       // solo si tarda: "Cargando…"
        const { width: w, height: h } = this.scale;
        this.cargandoTxt = this.add.text(w / 2, h / 2, 'Cargando…', { fontFamily: 'system-ui, sans-serif', fontSize: '18px', color: '#f1ecff' })
          .setOrigin(0.5).setScrollFactor(0).setDepth(100);
      });
      await lista;
      aviso.remove();
      control.bloqueado = false;
      this.scene.restart({ zona: p.destino, llegada: p.llegada });
    });
  }

  // Salas en memoria: la actual, el Pasillo y la del objetivo; la del objetivo se adelanta en segundo plano
  ordenarSalas() {
    if (!this.z) return;
    const objetivo = cargas.zonaDeEstacion(this.registry.get('objetivo'));
    const quedan = new Set([this.z.id, ZONA_INICIAL, objetivo].filter(Boolean));
    for (const id of Object.keys(this.zonas)) if (!quedan.has(id)) cargas.liberar(`zona:${id}`);
    if (objetivo && objetivo !== this.z.id) cargas.precargar([`zona:${objetivo}`]);
  }

  // --- Fase del día, objetivo y respuesta al usar ---
  cambiarFase(fase) {
    if (fase === 'emergencia' && this.luces.fase !== 'emergencia') this.cameras.main.shake(320, 0.004);
    this.luces.ponerFase(fase);
  }

  // Dónde está el objetivo visto desde esta sala: la estación, o la puerta que lleva hacia ella
  puntoObjetivo(nombre) {
    if (!nombre) return null;
    const aqui = this.estaciones.find(e => e.datos.nombre === nombre);
    if (aqui) return aqui;
    const destino = Object.values(this.zonas).find(z => z.estaciones.some(e => e.nombre === nombre));
    if (!destino) return null;
    const p = this.z.puertas.find(q => q.destino === destino.id) ?? this.z.puertas.find(q => q.destino === 'pasillo') ?? this.z.puertas[0];
    return p ? { ...this.puntoPuerta(p), puerta: true } : null;
  }

  ponerObjetivo(nombre) {
    const e = this.puntoObjetivo(nombre);
    if (!this.marca) {
      this.marca = this.add.image(0, 0, asegurarFlecha(this)).setAngle(90).setScale(0.45).setDepth(12).setVisible(false);
      this.aroObjetivo = this.add.ellipse(0, 0, 40, 20).setStrokeStyle(2, 0xffc83d, 0.9).setDepth(2).setVisible(false);
    }
    this.tweens.killTweensOf([this.marca, this.aroObjetivo]);
    this.marca.setVisible(!!e);
    this.aroObjetivo.setVisible(!!e);
    if (!e) return;
    const alto = e.puerta ? 70 : 40;
    this.marca.setPosition(e.x, e.y - alto);
    this.aroObjetivo.setPosition(e.x, e.y).setScale(1).setAlpha(1);
    this.tweens.add({ targets: this.marca, y: e.y - alto - 9, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: this.aroObjetivo, scale: 1.7, alpha: 0, duration: 1100, repeat: -1, ease: 'Sine.out' });
  }

  efectoUsar(e) {
    const onda = this.add.ellipse(e.x, e.y, 30, 15).setStrokeStyle(3, COLOR_SISTEMA[e.datos.sistema] ?? 0xffffff, 1).setDepth(11);
    this.tweens.add({ targets: onda, scale: 2.4, alpha: 0, duration: 380, ease: 'Cubic.out', onComplete: () => onda.destroy() });
    const S = this.escalaCuerpo;
    this.tweens.add({ targets: this.pj, scaleX: S * 1.08, scaleY: S * 0.9, duration: 80, yoyo: true });   // se agacha un poco
  }

  resaltar(antes, ahora) {
    for (const e of this.estaciones) {
      if (e.datos === antes) { this.tweens.killTweensOf(e.anillo); e.anillo.setScale(1).setFillStyle(e.anillo.fillColor, this.alfaAnillo[0]); }
      if (e.datos === ahora) {
        e.anillo.setFillStyle(e.anillo.fillColor, this.alfaAnillo[1]);
        this.tweens.add({ targets: e.anillo, scale: 1.35, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      }
    }
  }

  interactuar() {
    if (!this.cerca || control.bloqueado) return;
    control.bloqueado = true;
    this.vel.set(0, 0);
    const est = this.estaciones.find(s => s.datos === this.cerca);
    if (est) this.efectoUsar(est);
    this.cameras.main.zoomTo(this.zoomBase * 1.12, 260, 'Sine.easeInOut');
    bus.emit(EV.INTERACTUAR, { ...this.cerca });
  }

  depurar(on) {
    this.depuracion = on;
    this.depGraf.setVisible(on);
    bus.emit(EV.DEPURACION, on);
  }

  dibujarDepuracion() {
    const g = this.depGraf.clear(), z = this.z;
    const rombo = (c, r, color, a) => {
      const p = [this.iso(c, r), this.iso(c + 1, r), this.iso(c + 1, r + 1), this.iso(c, r + 1)];
      g.fillStyle(color, a).fillPoints(p, true);
    };
    if (this.obstaculos.length) {
      for (const [a0, b0, a1, b1] of this.obstaculos) {
        g.fillStyle(0xff6e3c, 0.45).fillPoints([this.iso(a0, b0), this.iso(a1, b0), this.iso(a1, b1), this.iso(a0, b1)], true);
      }
    } else {
      for (let r = 0; r < z.rows; r++) for (let c = 0; c < z.cols; c++) if (z.bloq[r][c]) rombo(c, r, 0xff6e3c, 0.45);
    }
    for (const p of z.puertas) { const [c, r] = this.dentroDePuerta(p); rombo(Math.floor(c), Math.floor(r), 0x7cf0a0, 0.35); }
    const q = this.iso(this.pc, this.pr);
    g.fillStyle(0xffffff, 1).fillCircle(q.x, q.y, 3);
  }

  // --- Cada fotograma ---
  update(t, dt) {
    if (!this.z) return;
    const k = this.teclas;
    let vx = 0, vy = 0;
    if (this.autoCamino) {                         // entrando por la puerta: camina solo hasta dentro
      const [tc, tr] = this.autoCamino;
      const dc = tc - this.pc, dr = tr - this.pr, d = Math.hypot(dc, dr);
      const paso = Math.min(d, 2.6 * (dt ?? 16.67) / 1000);
      if (d < 0.02) { this.autoCamino = null; if (!this.saliendo) control.bloqueado = false; }
      else { this.pc += dc / d * paso; this.pr += dr / d * paso; this.vel.set((dc - dr) / d * 120, (dc + dr) / d * 60); }
    }
    if (!control.bloqueado) {
      vx = (k.D.isDown || k.RIGHT.isDown) - (k.A.isDown || k.LEFT.isDown) + control.joy.x;
      vy = (k.S.isDown || k.DOWN.isDown) - (k.W.isDown || k.UP.isDown) + control.joy.y;
    }
    const mag = Math.min(1, Math.hypot(vx, vy));
    const dir = new Phaser.Math.Vector2(vx, vy).normalize();
    const paso = (dt ?? 16.67) / 1000;
    // Arranque y frenado suaves, en px de pantalla por segundo (como en Hades: arriba es arriba en la pantalla)
    const objetivo = dir.clone().scale(VELOCIDAD * mag);
    const f = 1 - Math.exp(-(mag > 0.05 ? ACELERACION : FRENADO) * paso);
    this.vel.lerp(objetivo, f);
    if (this.vel.lengthSq() < 4) this.vel.set(0, 0);

    // Pantalla -> casillas
    const dx = this.vel.x * paso, dy = this.vel.y * paso;
    const hw = this.TW / 2, hh = this.TH / 2;
    let dc = (dx / hw + dy / hh) / 2, dr = (dy / hh - dx / hw) / 2;
    // Ayuda en las puertas: si empuja contra el borde cerca de un hueco, lo centra en él
    for (const p of this.z.puertas) {
      const vert = p.lado === 'n' || p.lado === 's';
      const centro = p.pos + 0.5, lateral = vert ? this.pc : this.pr;
      const borde = p.lado === 'n' ? (this.pr < 0.9 && dr < 0) : p.lado === 's' ? (this.pr > this.z.rows - 0.9 && dr > 0)
        : p.lado === 'o' ? (this.pc < 0.9 && dc < 0) : (this.pc > this.z.cols - 0.9 && dc > 0);
      if (borde && Math.abs(lateral - centro) < 1.3 && Math.abs(lateral - centro) > 0.02) {
        const ayuda = Math.sign(centro - lateral) * Math.min(Math.abs(centro - lateral), Math.abs(vert ? dr : dc) * 0.9);
        if (vert) dc += ayuda; else dr += ayuda;
      }
    }
    if (!this.autoCamino) {
      const movC = this.cabe(this.pc + dc, this.pr), movR = this.cabe(this.pc, this.pr + dr);
      if (movC) this.pc += dc;
      if (movR) this.pr += dr;
      // Rodear esquinas: si un objeto frena en un eje, busca hueco cerca en el otro y se desliza hacia él
      const rodear = (bloqueado, avance, eje) => {
        if (!bloqueado || Math.abs(avance) < 1e-4) return;
        for (let d = 0.08; d <= 0.42; d += 0.08) {
          for (const lado of [-1, 1]) {
            const ok = eje === 'c' ? this.cabe(this.pc + avance, this.pr + lado * d) : this.cabe(this.pc + lado * d, this.pr + avance);
            if (ok) {
              const paso = lado * Math.min(d, Math.abs(avance) * 0.9);
              if (eje === 'c' && this.cabe(this.pc, this.pr + paso)) this.pr += paso;
              if (eje === 'r' && this.cabe(this.pc + paso, this.pr)) this.pc += paso;
              return;
            }
          }
        }
      };
      rodear(!movC, dc, 'c');
      rodear(!movR, dr, 'r');
    }

    // ¿Cruzó una puerta?
    const { cols, rows } = this.z;
    for (const p of (this.saliendo || this.autoCamino) ? [] : this.z.puertas) {   // no mientras entra o sale solo
      const fuera = p.lado === 'n' ? this.pr < -0.04 : p.lado === 's' ? this.pr > rows + 0.04
        : p.lado === 'o' ? this.pc < -0.04 : this.pc > cols + 0.04;
      if (fuera && this.enHueco(p, this.pc, this.pr)) { this.cruzar(p); break; }
    }

    // Dibujo
    const pie = this.iso(this.pc, this.pr);
    this.pj.setPosition(pie.x, pie.y);
    this.pj.body.center.set(pie.x, pie.y);
    this.sombra.setPosition(pie.x, pie.y);
    const moviendo = this.vel.length() > 20;
    if (this.conPaso) {                             // el paso dibujado + balanceo y rebote suaves
      const rapidez = Math.min(1.15, this.vel.length() / VELOCIDAD);
      if (moviendo) {
        if (!this.pj.anims.isPlaying) { this.pj.play({ key: this.animPaso, startFrame: 1 }); this.parando?.stop(); }
        this.pj.anims.timeScale = 0.6 + 0.4 * rapidez;          // al arrancar, pasos más lentos
        if (this.balanceo.isPaused()) this.balanceo.resume();
        this.fasePaso += dt * 0.0175 * rapidez;                 // dos rebotes por ciclo de 8 cuadros
        this.pj.scaleY = this.escalaCuerpo * (1 - PJ.rebote * Math.abs(Math.sin(this.fasePaso)));
        this.pj.scaleX = this.escalaCuerpo * (1 + PJ.rebote * 0.5 * Math.abs(Math.sin(this.fasePaso)));
      } else if (this.pj.anims.isPlaying) {
        // al parar: termina en el cuadro de parado y vuelve derecho con suavidad, sin brincos
        this.pj.stop().setFrame(0);
        this.balanceo.pause();
        this.parando = this.tweens.add({ targets: this.pj, angle: 0, scaleX: this.escalaCuerpo, scaleY: this.escalaCuerpo,
          duration: 180, ease: 'Sine.out' });
        this.fasePaso = 0;
      }
    } else {
      if (moviendo && this.balanceo.isPaused()) this.balanceo.resume();
      if (!moviendo && !this.balanceo.isPaused()) { this.balanceo.pause(); this.pj.angle = 0; }
    }
    if (Math.abs(this.vel.x) > 1) this.pj.setFlipX(this.vel.x < 0);
    if (moviendo && t > this.proximoPaso) { this.pisada(pie.x, pie.y); this.proximoPaso = t + 210; }
    // la cámara se adelanta un poco hacia donde camina
    this.mira.lerp(new Phaser.Math.Vector2(this.vel.x * 0.35, this.vel.y * 0.35), 1 - Math.exp(-3 * paso));
    this.cameras.main.setFollowOffset(-this.mira.x, 40 - this.mira.y);
    this.animarVida(t, dt);
    // Orden de dibujo: un objeto va delante del astronauta si el astronauta está detrás de él
    for (const p of this.props) {
      const [, , c1, r1] = p.caja ?? [p.c, p.r, p.c + p.w, p.r + p.h];
      const delante = this.pc - RADIO >= c1 - 0.02 || this.pr - RADIO >= r1 - 0.02;
      p.img.setDepth(delante ? 4 : 6);
      p.anim?.setDepth(p.img.depth + 0.01);
    }
    this.luces.update(t, dt, { x: pie.x, y: pie.y - 14 });

    // Estación más cercana al alcance
    let mejor = null, dMin = RADIO_INTERACCION + 14;
    for (const e of this.estaciones) {
      const d = Phaser.Math.Distance.Between(e.x, e.y, pie.x, pie.y);
      if (d < dMin) { dMin = d; mejor = e.datos; }
    }
    if (mejor !== this.cerca) { this.resaltar(this.cerca, mejor); this.cerca = mejor; bus.emit(EV.CERCA_DE, mejor); }

    // Sala actual (se anuncia una vez al entrar)
    if (this.habitacionActual !== this.z.nombre) { this.habitacionActual = this.z.nombre; bus.emit(EV.HABITACION, this.z.nombre); }
    if (this.depuracion) this.dibujarDepuracion();
  }
}
