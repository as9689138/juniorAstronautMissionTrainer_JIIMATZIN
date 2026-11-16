// Kit de las misiones (los minijuegos) con el estilo del mapa (docs/estilo-mapa.md): placas de tinta, papel crema,
// teclas en 3/4 y el área de juego enmarcada como una ventana de la nave.
// Arte: assets/interfaz (placa, papel, insignias de recursos) y assets/misiones (herramientas/pintar_misiones.py).
//
// Responsivo: el minijuego dibuja su área en sus coordenadas de siempre (lienzo de 960x600) con la cámara principal,
// que la ajusta al hueco libre de la pantalla. Lo que se lee y se toca (título, instrucción, tiempo, medidor, teclas,
// la pista de P.I.E.D.R.A y el resultado) va en una segunda cámara sin zoom, al tamaño real de la pantalla: la letra
// nunca baja de 16 px (docs/accesibilidad.md), sea un teléfono en horizontal o un monitor.
//
// Ayudas para que se entienda sin leer mucho:
//  - medidores con dibujos: barra con banderita en la meta, reloj con la luz del día y teclas que se cargan;
//  - pista de P.I.E.D.R.A: si el jugador no avanza en unos segundos, el robot asoma con una pista corta.
//
// Uso (ver Paneles.js, FiltroCO2.js, Invernadero.js y la consola, src/mecanicas/Consola.js):
//   const m = new Mision(escena, { titulo, etiqueta, pasos | instruccion, fondo, area: { x, y, w, h } | null, alColocar });
//   m.medidor({ icono, etiqueta, total, meta });  m.reloj(segundos);  m.accion({ id, icono, texto, alPulsar, tecla });
//   m.etiqueta(x, y, texto) para rótulos sobre el dibujo (crecen si la pantalla es chica: siempre se leen)
//   m.vigilar(() => 'pista' | null);  m.empezar();
//   durante el juego: m.avanceMedidor(n), m.tiempo(quedan), m.estadoAccion(id, estado, { texto, carga, cuenta }), m.avance()
//   al final: m.resultado({ exito, sello, cambios: [{ recurso, n }], nota, mensaje, alVolver })
// Sin área (la consola): todo es interfaz; alColocar(libre, k) dibuja el contenido en el hueco libre cada vez que se
// coloca la pantalla (con m.pieza, m.texto, m.contenedor y m.tecla).
import { sonido } from '../motor/sonido.js';
import { idioma } from '../motor/idioma.js';
import { GameState } from '../mecanicas/estado.js';

const FUENTE = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
const NUMEROS = 'Consolas, Menlo, "Courier New", monospace';
const TINTA = 0x141026, TINTA_TXT = '#141026', LUZ_TXT = '#f3e3c3', SELLO_TXT = '#b8473d', VERDE_TXT = '#2f7a4a';
const HOLO_TXT = '#8fe3ff';
const T = 0.5;                                   // las piezas están pintadas al doble de resolución
// accion: ámbar (lo que hay que hacer) · lista: verde que late (¡ahora!) · activa: verde quieta (encendida)
// espera: apagada (todavía no / apagado)
const TECLA = { accion: 'mis_tecla_ambar', lista: 'mis_tecla_verde', activa: 'mis_tecla_verde', espera: 'mis_tecla_apagada' };
const COLOR_RECURSO = { energia: '#ffc83d', oxigeno: '#5ec8f2', blindaje: '#b58cff' };
const NOMBRE_RECURSO = { energia: 'Energía', oxigeno: 'Oxígeno', blindaje: 'Blindaje' };
const tr = s => idioma.traducir(s);

export class Mision {
  // pasos: [{ icono, texto }] instrucción en pasos cortos con dibujo (mejor que un párrafo); instruccion: texto suelto.
  // marco: false si el dibujo del área ya trae su propio marco (el panel solar con su aluminio).
  // etiqueta: la línea pequeña sobre el título (por defecto "SOL n · MISIÓN"). area: null si no hay zona de juego.
  constructor(escena, { titulo, etiqueta = null, instruccion = null, pasos = null, icono = null, fondo = null, area = null,
    marco = true, alColocar = null }) {
    this.e = escena;
    this.titulo = titulo;
    this.etiquetaTitulo = etiqueta;
    this.instruccion = instruccion;
    this.pasos = pasos;
    this.iconoInstruccion = icono;
    this.area = area;
    this.conMarco = marco && !!area;
    this.alColocar = alColocar;
    this.etiquetas = [];                         // rótulos del mundo (crecen con la pantalla chica)
    this.med = null;
    this.rel = null;
    this.acciones = [];
    this.hud = [];                               // lo que se vuelve a dibujar al cambiar el tamaño de la pantalla
    this.ref = {};
    this.activo = false;
    this.ultimoAvance = 0;

    // Dos cámaras: la del mundo (con zoom) y la de la interfaz (sin zoom). Cada objeto nuevo es del mundo, salvo lo
    // que crea este kit para la interfaz (enHud).
    this.cam = escena.cameras.main.setZoom(1).setBackgroundColor(TINTA);
    this.ui = escena.cameras.add(0, 0, escena.scale.width, escena.scale.height);
    this.enHud = false;
    this.alAgregar = go => { (this.enHud ? this.cam : this.ui).ignore(go); };
    escena.events.on('addedtoscene', this.alAgregar);

    // Fondo ilustrado del minijuego: cubre todo lo que ve la cámara del mundo (se ajusta en colocar)
    const clave = fondo && `mj_fondo_${fondo}`;
    this.fondo = clave && escena.textures.exists(clave) ? escena.add.image(480, 300, clave).setDepth(-20) : null;
    this.velo = escena.add.rectangle(480, 300, 100, 100, TINTA, 0.3).setDepth(-19);
    this.noche = escena.add.rectangle(480, 300, 100, 100, 0x040711, 0).setDepth(50);   // cae la noche con el reloj

    this.alRedimensionar = () => this.colocar();
    escena.scale.on('resize', this.alRedimensionar);
    this.reloj1s = escena.time.addEvent({ delay: 500, loop: true, callback: () => this.revisarAtasco() });
    escena.events.once('shutdown', () => {
      escena.scale.off('resize', this.alRedimensionar);
      escena.events.off('addedtoscene', this.alAgregar);
      escena.input.keyboard?.off('keydown', this.alTecla);
      // las cámaras las quita Phaser al apagar la escena (y crea la principal de nuevo al volver a empezarla)
    });
    this.alTecla = ev => this.alTeclado(ev);
    escena.input.keyboard?.on('keydown', this.alTecla);
    escena.events.once('create', () => this.colocar());     // al terminar create() de la escena, ya con todo puesto
  }

  // ---------- Lo que pone el minijuego ----------
  medidor({ icono, etiqueta, total, meta = total, valor = 0 }) { this.med = { icono, etiqueta, total, meta, valor }; }
  reloj(total) { this.rel = { total, quedan: total }; }
  accion(a) { this.acciones.push({ estado: 'accion', carga: null, ...a }); }
  vigilar(fn, segundos = 8) { this.pistaFn = fn; this.esperaPista = segundos * 1000; }
  // (el reloj de la escena aún no corre al crearla: la espera de la pista empieza a contar en su primera revisión)
  empezar() {
    this.activo = true;
    this.ultimoAvance = null;
    // en pantallas bajas la instrucción no cabe arriba: P.I.E.D.R.A la dice al empezar (después de colocar la pantalla)
    this.e.time.delayedCall(350, () => {
      if (!this.instrEnPista || this.datosResultado) return;
      const texto = this.pasos ? this.pasos.map(p => tr(p.texto)).join(' · ') : tr(this.instruccion);
      this.pista(texto);
    });
  }
  avance() { if (this.ultimoAvance != null) this.ultimoAvance = this.e.time.now; }

  // Rótulo sobre el dibujo del área (en el mundo): placa de tinta con letra clara. Al colocar la pantalla su letra
  // crece lo necesario para verse de 16 px o más (hasta el doble de su tamaño) aunque el área se vea pequeña.
  etiqueta(x, y, texto, { tam = 16, color = LUZ_TXT, fondo = '#141026', origen = 0.5 } = {}) {
    const t = this.e.add.text(x, y, texto, { fontFamily: FUENTE, fontSize: `${tam}px`, fontStyle: 'bold', color,
      backgroundColor: fondo, padding: { x: 7, y: 3 }, resolution: 2 }).setOrigin(origen, 0.5).setDepth(6);
    t.tamBase = tam;
    this.etiquetas.push(t);
    return t;
  }

  // Una tecla suelta para el contenido de alColocar (como las de la fila de abajo). a: { texto, icono, estado, alPulsar, ancho }
  tecla(k, a) { return this.crearTecla(k, a); }

  avanceMedidor(valor) {
    if (!this.med) return;
    const subio = valor > this.med.valor;
    this.med.valor = valor;
    this.pintarMedidor();
    if (subio) this.avance();
  }

  tiempo(quedan) {
    if (!this.rel) return;
    const antes = this.rel.quedan;
    this.rel.quedan = quedan;
    const r = Math.max(0, Math.min(1, quedan / this.rel.total));
    this.noche.setAlpha(r > 0.5 ? 0 : r > 0.25 ? (0.5 - r) * 0.45 : 0.12 + (0.25 - r) * 1.1);
    this.pintarReloj();
    // los últimos 10 segundos: el número late en rojo (y los últimos 5, con tic-tac)
    const num = this.ref.reloj?.num;
    if (num && quedan !== antes && quedan > 0 && quedan <= 10 && this.activo) {
      this.e.tweens.killTweensOf(num);
      num.setScale(1);
      this.e.tweens.add({ targets: num, scale: 1.3, duration: 110, yoyo: true, ease: 'Quad.out' });
      if (quedan <= 5) sonido.efecto('ui_tictac', 0.45);
    }
  }

  // estado: 'accion' (ámbar), 'lista' (verde: ¡ahora!) o 'espera' (apagada; con carga 0-1 se ve cómo se llena y con
  // cuenta, cuántos segundos faltan)
  estadoAccion(id, estado, { texto, carga = null, cuenta = null } = {}) {
    const a = this.acciones.find(x => x.id === id);
    if (!a) return;
    const cambia = a.estado !== estado || (texto !== undefined && texto !== a.texto) || ((a.cuenta == null) !== (cuenta == null));
    a.estado = estado;
    if (texto !== undefined) a.texto = texto;
    a.carga = carga;
    a.cuenta = cuenta;
    if (cambia) { this.colocar(); return; }
    if (a.barra) a.barra.width = a.anchoBarra * Math.max(0, Math.min(1, carga ?? 0));
    if (a.insignia && cuenta != null && a.insignia.text !== String(cuenta)) a.insignia.setText(String(cuenta));
  }

  // La tecla dice "todavía no": tiembla un poco
  negar(id) {
    const a = this.acciones.find(x => x.id === id);
    if (!a?.cont) return;
    const x = a.cont.x;
    this.e.tweens.add({ targets: a.cont, x: x + 6, duration: 50, yoyo: true, repeat: 2, onComplete: () => a.cont?.setX(x) });
  }

  // ---------- Colocación (se rehace la interfaz entera; es poca cosa) ----------
  colocar() {
    if (!this.e.sys.isActive()) return;
    const W = this.e.scale.width, H = this.e.scale.height;
    const k = Phaser.Math.Clamp(Math.min(W / 760, H / 520), 0.72, 1.3);
    this.k = k;
    const m = Math.round(12 * k);
    this.cam.setSize(W, H);
    this.ui.setSize(W, H);
    for (const o of this.hud) { this.e.tweens.killTweensOf(o); o.destroy(); }
    this.hud = [];
    this.ref = {};
    this.enHud = true;
    try {
      // Fila de arriba: título a la izquierda, reloj a la derecha y la instrucción entre los dos (o debajo)
      const tit = this.crearTitulo(k);
      tit.c.setPosition(m, m);
      const rel = this.rel ? this.crearReloj(k) : null;
      rel?.c.setPosition(W - m - rel.w, m);
      let arriba = m + Math.max(tit.h, rel?.h ?? 0);
      this.zonaInstr = null;
      this.instrEnPista = false;
      // Pantallas bajas (iPhone SE y mini en horizontal): la instrucción solo se queda arriba si cabe en la fila del
      // título sin hacerla más alta; si no, P.I.E.D.R.A la dice al empezar y el área de juego conserva su espacio.
      const bajo = H < 420 && this.area;
      let enFila = null;
      if ((this.instruccion || this.pasos) && bajo) {
        const entre = W - (m + tit.w + m) - (rel ? rel.w + m : 0) - m;
        if (entre >= 180 * k) {
          const p = this.crearInstruccion(k, entre);
          if (p.h <= Math.max(tit.h, rel?.h ?? 0) + 6 * k) {
            p.c.setPosition(m + tit.w + m, m);
            this.zonaInstr = { c: p.c, x: p.c.x, y: m, h: p.h, derecha: m + tit.w + m + entre };
            enFila = p;
          } else { this.hud = this.hud.filter(o => o !== p.c); p.c.destroy(); }
        }
        if (!enFila) this.instrEnPista = true;
      }
      if ((this.instruccion || this.pasos) && !bajo) {
        const entre = W - (m + tit.w + m) - (rel ? rel.w + m : 0) - m;
        if (entre >= 300 * k) {
          const p = this.crearInstruccion(k, entre);
          p.c.setPosition(m + tit.w + m, m);
          arriba = Math.max(arriba, m + p.h);
          this.zonaInstr = { c: p.c, x: p.c.x, y: m, h: p.h, derecha: m + tit.w + m + entre };
        } else {
          const p = this.crearInstruccion(k, W - 2 * m);
          p.c.setPosition(m, arriba + 8 * k);
          this.zonaInstr = { c: p.c, x: m, y: arriba + 8 * k, h: p.h, derecha: W - m };
          arriba += 8 * k + p.h;
        }
      }
      // Fila de abajo: las teclas a la derecha y el medidor a la izquierda (si no cabe, encima de las teclas)
      let x = W - m, altoTeclas = 0;
      for (const a of [...this.acciones].reverse()) {
        const t = this.crearTecla(k, a);
        x -= t.w;
        t.c.setPosition(x + t.w / 2, H - m - t.h / 2);
        x -= 10 * k;
        altoTeclas = Math.max(altoTeclas, t.h);
      }
      let abajo = altoTeclas;
      if (this.med) {
        const libre = x - m;
        const junto = libre >= 260 * k;
        const med = this.crearMedidor(k, junto ? Math.min(430 * k, libre) : Math.min(430 * k, W - 2 * m));
        if (junto) { med.c.setPosition(m, H - m - med.h); abajo = Math.max(abajo, med.h); }
        else { med.c.setPosition(m, H - m - altoTeclas - 8 * k - med.h); abajo = altoTeclas + 8 * k + med.h; }
      }
      this.filaAbajo = H - m - abajo;
      // El área de juego, lo más grande posible en el hueco que queda, dentro de su marco (si lleva)
      const borde = this.conMarco ? 13 * k : 2 * k, sep = Math.round((this.conMarco ? 8 : 6) * k);
      const libre = { x: m, y: arriba + sep, w: W - 2 * m, h: this.filaAbajo - sep - (arriba + sep) };
      this.libre = libre;
      // Sin área (la consola): todo es interfaz; la escena dibuja su contenido en el hueco libre
      const a = this.area ?? { x: 480 - W / 2, y: 300 - H / 2, w: W, h: H };
      const z = this.area ? Math.max(0.2, Math.min((libre.w - 2 * borde) / a.w, (libre.h - 2 * borde) / a.h)) : 1;
      const aw = a.w * z, ah = a.h * z;
      const sx = this.area ? libre.x + (libre.w - aw) / 2 : 0, sy = this.area ? libre.y + (libre.h - ah) / 2 : 0;
      // los rótulos del mundo crecen lo necesario para verse de 16 px o más (hasta el doble)
      for (const t of this.etiquetas) {
        if (t.active) t.setFontSize(`${Math.round(Phaser.Math.Clamp(16 / z, t.tamBase, t.tamBase * 2))}px`);
      }
      this.cam.setZoom(z);
      // el punto del mundo que queda en el centro de la pantalla, para que el área caiga en (sx, sy)
      const cx = a.x + a.w / 2 - (sx + aw / 2 - W / 2) / z, cy = a.y + a.h / 2 - (sy + ah / 2 - H / 2) / z;
      this.cam.centerOn(cx, cy);
      this.pantallaArea = { x: sx, y: sy, w: aw, h: ah, z };
      const vw = W / z, vh = H / z;
      if (this.fondo) this.fondo.setPosition(cx, cy).setScale(Math.max(vw / this.fondo.width, vh / this.fondo.height));
      this.velo.setPosition(cx, cy).setDisplaySize(vw + 4, vh + 4);
      this.noche.setPosition(cx, cy).setDisplaySize(vw + 4, vh + 4);
      if (this.conMarco) this.hud.push(this.pieza('mis_marco', sx - borde, sy - borde, aw + 2 * borde, ah + 2 * borde, 30, k).setDepth(-1));
      this.alColocar?.(libre, k);
      if (this.pistaVisible) this.dibujarPista(this.pistaVisible.texto, false);
      if (this.datosResultado) this.dibujarResultado(this.datosResultado);
    } finally { this.enHud = false; }
    this.pintarMedidor();
    this.pintarReloj();
  }

  // Placa, papel o tecla con nine-slice (se estira sin deformar las esquinas). k: escala de la interfaz
  pieza(clave, x, y, w, h, borde, k = 1) {
    const s = T * Math.min(1.15, Math.max(0.85, k));
    return this.e.add.nineslice(x, y, clave, undefined, w / s, h / s, borde, borde, borde, borde).setScale(s).setOrigin(0);
  }

  texto(x, y, t, estilo) {
    return this.e.add.text(x, y, t, { fontFamily: FUENTE, resolution: 2, ...estilo });
  }

  contenedor(x = 0, y = 0) {
    const c = this.e.add.container(x, y).setDepth(10);
    this.hud.push(c);
    return c;
  }

  // ---------- Piezas de la interfaz ----------
  crearTitulo(k) {
    const pad = 12 * k;
    const sol = Math.min(GameState.sol, GameState.maxSoles);
    const etiqueta = this.texto(pad, pad, this.etiquetaTitulo ?? idioma.t('SOL {n} · MISIÓN', { n: sol }), {
      fontSize: `${Math.max(14, Math.round(12 * k))}px`, fontStyle: 'bold', color: LUZ_TXT, letterSpacing: 1.5 }).setAlpha(0.75);
    const titulo = this.texto(pad, pad + etiqueta.height + 1, tr(this.titulo).toUpperCase(), {
      fontSize: `${Math.max(16, Math.round(18 * k))}px`, fontStyle: 'bold', color: LUZ_TXT });
    const w = Math.max(etiqueta.width, titulo.width) + 2 * pad, h = titulo.y + titulo.height + pad;
    const c = this.contenedor();
    c.add([this.pieza('ui_placa', 0, 0, w, h, 26, k), etiqueta, titulo]);
    return { c, w, h };
  }

  // Reloj: los segundos y, debajo, el camino del Sol hacia la noche (día ámbar, tarde naranja, noche violeta). El Sol
  // avanza y lo que ya pasó se oscurece; al final del camino espera la Luna.
  crearReloj(k) {
    const pad = 12 * k, icono = 34 * k, astro = Math.round(20 * k);
    const ico = this.e.add.image(pad + icono / 2, 0, 'mis_reloj').setDisplaySize(icono, icono);
    const num = this.texto(0, 0, '000 s', {
      fontFamily: NUMEROS, fontSize: `${Math.max(18, Math.round(22 * k))}px`, fontStyle: 'bold', color: LUZ_TXT }).setOrigin(0.5);
    const x0 = pad + icono + 8 * k + astro / 2;                // el camino empieza donde está el Sol al amanecer
    const ancho = Math.max(num.width, 104 * k);
    num.setPosition(x0 + ancho / 2, pad + num.height / 2 - 2 * k);
    const altoBarra = Math.round(12 * k), yb = num.y + num.height / 2 + 6 * k + astro / 2 - altoBarra / 2;
    const camino = this.e.add.graphics();
    camino.fillStyle(0x0b0820, 1).fillRect(x0 - 1, yb - 1, ancho + 2, altoBarra + 2);
    for (const [desde, hasta, color] of [[0, 0.5, 0xffc83d], [0.5, 0.75, 0xf97316], [0.75, 1, 0x6b5bd6]]) {
      camino.fillStyle(color, 1).fillRect(x0 + ancho * desde, yb, ancho * (hasta - desde), altoBarra);
    }
    camino.lineStyle(2, TINTA, 1).strokeRect(x0 - 1, yb - 1, ancho + 2, altoBarra + 2);
    const pasado = this.e.add.rectangle(x0, yb, 0, altoBarra, 0x0b0820, 0.72).setOrigin(0);
    // el Sol y la Luna, cada uno con su aro de luz para que se vean sobre la placa oscura
    const yc = yb + altoBarra / 2;
    const xl = x0 + ancho + astro * 0.62;
    const aroLuna = this.e.add.circle(xl, yc, astro / 2 + 2, 0xc9c2ff);
    const luna = this.e.add.image(xl, yc, 'fase_noche').setDisplaySize(astro, astro);
    const sol = this.e.add.container(x0, yc, [this.e.add.circle(0, 0, astro / 2 + 2, 0xffe08a),
      this.e.add.image(0, 0, 'fase_dia').setDisplaySize(astro, astro)]);
    const w = xl + astro / 2 + pad, h = yc + astro / 2 + pad - 2 * k;
    ico.setY(h / 2);
    const c = this.contenedor();
    c.add([this.pieza('ui_placa', 0, 0, w, h, 26, k), ico, num, camino, pasado, aroLuna, luna, sol]);
    this.ref.reloj = { num, pasado, sol, x0, ancho };
    return { c, w, h };
  }

  crearInstruccion(k, anchoMax) {
    if (this.pasos) return this.crearPasos(k, anchoMax);
    const pad = 14 * k, sello = this.iconoInstruccion ? 40 * k : 0;
    const tam = Math.max(16, Math.round(16 * k));
    const t = this.texto(0, 0, this.instruccion, { fontSize: `${tam}px`, color: TINTA_TXT, lineSpacing: 2,
      wordWrap: { width: anchoMax - 2 * pad - sello - 10 * k, useAdvancedWrap: true } });
    const w = Math.min(anchoMax, t.width + 2 * pad + sello + (sello ? 10 * k : 0));
    const h = Math.max(t.height + 2 * pad, sello + 2 * pad - 6 * k);
    t.setPosition(pad + sello + (sello ? 10 * k : 0), (h - t.height) / 2);
    const c = this.contenedor();
    c.add(this.pieza('ui_papel', 0, 0, w, h, 30, k));
    if (sello) {                                     // sello rojo con el dibujo de la misión
      const g = this.e.add.graphics();
      g.lineStyle(2.5, 0xb8473d, 1).strokeCircle(pad + sello / 2, h / 2, sello / 2);
      g.lineStyle(1, 0xb8473d, 0.6).strokeCircle(pad + sello / 2, h / 2, sello / 2 - 4 * k);
      const ico = this.e.add.image(pad + sello / 2, h / 2, this.iconoInstruccion).setDisplaySize(sello - 10 * k, sello - 10 * k).setAngle(-8);
      c.add([g, ico]);
    }
    c.add(t);
    return { c, w, h };
  }

  // Instrucción en pasos cortos, cada uno con su dibujo: [mano] Toca el polvo │ [tecla] Tecla verde: VIBRAR quita 5.
  // En una fila si cabe; si no, uno debajo del otro.
  crearPasos(k, anchoMax) {
    const pad = 12 * k, icono = Math.round(32 * k), gap = 8 * k, sep = 22 * k;
    const tam = Math.max(16, Math.round(16 * k));
    const items = this.pasos.map(p => ({
      ico: this.e.add.image(0, 0, p.icono).setDisplaySize(icono, icono),
      t: this.texto(0, 0, p.texto, { fontSize: `${tam}px`, fontStyle: 'bold', color: TINTA_TXT }).setOrigin(0, 0.5),
    }));
    const enFila = items.reduce((s, x) => s + icono + gap + x.t.width, 0) + sep * (items.length - 1) + 2 * pad <= anchoMax;
    const rayas = this.e.add.graphics().lineStyle(1.5, TINTA, 0.35);
    let w, h;
    if (enFila) {
      const alto = Math.max(icono, ...items.map(x => x.t.height));
      let x = pad;
      items.forEach((it, i) => {
        if (i) rayas.lineBetween(x - sep / 2, pad + 2 * k, x - sep / 2, pad + alto - 2 * k);
        it.ico.setPosition(x + icono / 2, pad + alto / 2);
        it.t.setPosition(x + icono + gap, pad + alto / 2);
        x += icono + gap + it.t.width + sep;
      });
      w = x - sep + pad;
      h = alto + 2 * pad;
    } else {
      let y = pad;
      w = 0;
      for (const it of items) {
        it.t.setWordWrapWidth(anchoMax - 2 * pad - icono - gap, true);
        const alto = Math.max(icono, it.t.height);
        it.ico.setPosition(pad + icono / 2, y + alto / 2);
        it.t.setPosition(pad + icono + gap, y + alto / 2);
        w = Math.max(w, pad + icono + gap + it.t.width + pad);
        y += alto + 6 * k;
      }
      h = y - 6 * k + pad;
    }
    const c = this.contenedor();
    c.add([this.pieza('ui_papel', 0, 0, w, h, 30, k), rayas]);
    for (const it of items) c.add([it.ico, it.t]);
    return { c, w, h };
  }

  crearMedidor(k, ancho) {
    const pad = 12 * k, icono = 36 * k;
    const etiqueta = this.texto(pad + icono + 10 * k, pad - 1 * k, tr(this.med.etiqueta).toUpperCase(), {
      fontSize: `${Math.max(14, Math.round(12 * k))}px`, fontStyle: 'bold', color: LUZ_TXT, letterSpacing: 1.5 }).setAlpha(0.75);
    const cuenta = this.texto(ancho - pad, 0, `${this.med.total} / ${this.med.total}`, {
      fontFamily: NUMEROS, fontSize: `${Math.max(16, Math.round(20 * k))}px`, fontStyle: 'bold', color: LUZ_TXT }).setOrigin(1, 0.5);
    const x0 = etiqueta.x, x1 = ancho - pad - cuenta.width - 12 * k;
    const yb = etiqueta.y + etiqueta.height + 6 * k, altoBarra = 14 * k;
    const h = yb + altoBarra + pad;
    cuenta.setY(yb + altoBarra / 2 - 2 * k);
    const ico = this.e.add.image(pad + icono / 2, h / 2, this.med.icono).setDisplaySize(icono, icono);
    const fondo = this.e.add.rectangle(x0, yb, x1 - x0, altoBarra, 0x0b0820).setOrigin(0).setStrokeStyle(2, TINTA);
    const barra = this.e.add.rectangle(x0 + 1, yb + 1, 0, altoBarra - 2, 0xffc83d).setOrigin(0);
    const brillo = this.e.add.rectangle(x0 + 1, yb + 2, 0, 2, 0xffffff, 0.35).setOrigin(0);
    const marcas = this.e.add.graphics();             // celdas, como un medidor de carga
    marcas.lineStyle(1.5, 0x0b0820, 0.9);
    const paso = (x1 - x0) / this.med.total;
    if (this.med.total <= 40) for (let i = 1; i < this.med.total; i++) marcas.lineBetween(x0 + i * paso, yb + 2, x0 + i * paso, yb + altoBarra - 2);
    // la meta: una banderita sobre la barra
    const xm = x0 + paso * this.med.meta;
    const bandera = this.e.add.image(xm, yb + altoBarra, 'mis_meta').setOrigin(0.28, 0.95).setDisplaySize(20 * k, 28 * k);
    const c = this.contenedor();
    c.add([this.pieza('ui_placa', 0, 0, ancho, h, 26, k), ico, etiqueta, fondo, barra, brillo, marcas, bandera, cuenta]);
    this.ref.medidor = { barra, brillo, cuenta, anchoBarra: x1 - x0 - 2, bandera };
    return { c, w: ancho, h };
  }

  crearTecla(k, a) {
    const pad = 16 * k, icono = a.icono ? 30 * k : 0, alto = Math.max(52, 58 * k);
    const oscura = a.estado === 'espera';
    const t = this.texto(0, 0, a.texto, { fontSize: `${Math.max(16, Math.round(18 * k))}px`, fontStyle: 'bold',
      color: oscura ? LUZ_TXT : TINTA_TXT });
    const w = Math.max(a.ancho != null ? a.ancho * k : 150 * k, pad + icono + (icono ? 10 * k : 0) + t.width + pad);
    const c = this.contenedor();
    const cara = alto - 9 * k;                       // la cara de la tecla (sin el canto de abajo)
    const fondo = this.pieza(TECLA[a.estado], -w / 2, -alto / 2, w, alto, 30, k);
    const xi = -w / 2 + (w - (icono + (icono ? 10 * k : 0) + t.width)) / 2;
    c.add(fondo);
    if (icono) c.add(this.e.add.image(xi + icono / 2, -alto / 2 + cara / 2, a.icono).setDisplaySize(icono, icono));
    t.setOrigin(0, 0.5).setPosition(xi + icono + (icono ? 10 * k : 0), -alto / 2 + cara / 2);
    c.add(t);
    a.barra = null;
    if (oscura && a.carga != null) {                 // se va cargando: cuando se llena, la tecla se pone verde
      const ab = w - 2 * pad;
      c.add(this.e.add.rectangle(-ab / 2, -alto / 2 + cara - 9 * k, ab, 5 * k, 0x0b0820).setOrigin(0, 0.5));
      a.barra = this.e.add.rectangle(-ab / 2, -alto / 2 + cara - 9 * k, ab * a.carga, 5 * k, 0x7cf0a0).setOrigin(0, 0.5);
      a.anchoBarra = ab;
      c.add(a.barra);
    }
    a.insignia = null;
    if (oscura && a.cuenta != null) {                // cuántos segundos faltan para que se ponga verde
      const r = Math.max(14, Math.round(15 * k));
      const cx = -w / 2 + 6 * k, cy = -alto / 2 + 4 * k;   // en la esquina de arriba a la izquierda (a la derecha se salía)
      const g = this.e.add.graphics();
      g.fillStyle(TINTA, 1).fillCircle(cx, cy, r + 2).fillStyle(0x7cf0a0, 1).fillCircle(cx, cy, r).fillStyle(0x0b0820, 1).fillCircle(cx, cy, r - 3);
      a.insignia = this.texto(cx, cy, String(a.cuenta), { fontFamily: NUMEROS, fontSize: `${Math.max(16, Math.round(17 * k))}px`,
        fontStyle: 'bold', color: '#7cf0a0' }).setOrigin(0.5);
      c.add([g, a.insignia]);
    }
    if (a.estado === 'lista') this.e.tweens.add({ targets: c, scale: 1.07, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    c.setSize(w, alto).setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => this.pulsar(a));
    a.cont = c;
    return { c, w, h: alto };
  }

  pulsar(a) {
    if (this.datosResultado) return;
    const c = a.cont;
    if (c) this.e.tweens.add({ targets: c, scaleX: 0.94, scaleY: 0.9, duration: 70, yoyo: true });
    sonido.efecto('ui_clic_boton', 0.6);
    a.alPulsar?.();
  }

  alTeclado(ev) {
    if (this.datosResultado) {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault?.(); this.datosResultado.alVolver?.(); this.datosResultado.alVolver = null; }
      return;
    }
    const a = this.acciones.find(x => x.tecla && (x.tecla === ev.key || (x.tecla === 'SPACE' && ev.key === ' ')));
    if (a) { ev.preventDefault?.(); this.pulsar(a); }
  }

  pintarMedidor() {
    const r = this.ref.medidor, md = this.med;
    if (!r || !md) return;
    const f = Math.max(0, Math.min(1, md.valor / md.total));
    r.barra.width = r.anchoBarra * f;
    r.brillo.width = r.anchoBarra * f;
    const llego = md.valor >= md.meta;
    r.barra.setFillStyle(llego ? 0x7cf0a0 : 0xffc83d);
    r.cuenta.setText(`${Math.min(md.valor, md.meta)} / ${md.meta}`).setColor(llego ? '#7cf0a0' : LUZ_TXT);
  }

  pintarReloj() {
    const r = this.ref.reloj, rl = this.rel;
    if (!r || !rl) return;
    const usado = 1 - Math.max(0, Math.min(1, rl.quedan / rl.total));
    r.num.setText(`${Math.max(0, rl.quedan)} s`).setColor(rl.quedan <= 10 ? '#ff8a7a' : LUZ_TXT);
    r.pasado.width = r.ancho * usado;                 // el camino que ya recorrió el Sol
    r.sol.setX(r.x0 + r.ancho * usado);
  }

  // ---------- Pista de P.I.E.D.R.A cuando el jugador se atora ----------
  revisarAtasco() {
    if (!this.activo || this.datosResultado || this.pistaVisible || !this.pistaFn) return;
    if (this.ultimoAvance == null) { this.ultimoAvance = this.e.time.now; return; }
    if (this.e.time.now - this.ultimoAvance < this.esperaPista) return;
    this.ultimoAvance = this.e.time.now;
    const texto = this.pistaFn();
    if (texto) this.pista(texto);
  }

  pista(texto) {
    if (this.datosResultado) return;
    this.ocultarPista(true);
    const tx = tr(texto);
    this.pistaVisible = { texto: tx };
    this.enHud = true;
    try { this.dibujarPista(tx, true); } finally { this.enHud = false; }
    sonido.pitido(2, 0.04);
    const dura = Math.max(5000, tx.length * 70);
    this.pistaVisible.reloj = this.e.time.delayedCall(dura, () => this.ocultarPista());
  }

  // La pista sale donde está la instrucción (que se esconde mientras tanto): así nunca tapa el área de juego.
  // Sin instrucción, abajo a la izquierda, encima del medidor.
  dibujarPista(tx, entrar) {
    this.pistaCont?.destroy();
    const k = this.k ?? 1, m = 12 * k, W = this.e.scale.width;
    const z = this.zonaInstr;
    const c = this.e.add.container(0, 0).setDepth(30);
    const robot = this.e.add.sprite(0, 0, 'robot_ia', 2).setOrigin(0.5, 1);
    robot.setScale(z ? Phaser.Math.Clamp((z.h + 14 * k) / robot.height, 0.32 * k, 0.62 * k) : 0.62 * k);
    const anchoMax = z ? Math.max(220 * k, z.derecha - z.x - robot.displayWidth - 20 * k)
      : Math.min(440 * k, W - robot.displayWidth - 3 * m - 20);
    const pad = 12 * k;
    const nombre = this.texto(pad, pad - 2 * k, 'P.I.E.D.R.A', { fontSize: `${Math.max(14, Math.round(12 * k))}px`, fontStyle: 'bold',
      color: '#2a6f8f', letterSpacing: 1.5 });
    const t = this.texto(pad, nombre.y + nombre.height + 2, tx, { fontSize: `${Math.max(16, Math.round(16 * k))}px`, color: TINTA_TXT,
      lineSpacing: 2, wordWrap: { width: anchoMax - 2 * pad, useAdvancedWrap: true } });
    t.sinTraducir = true;
    const bw = Math.max(nombre.width, t.width) + 2 * pad, bh = t.y + t.height + pad;
    const bx = robot.displayWidth * 0.5 + 14 * k;
    const by = z ? -(z.h + 4 * k) : -robot.displayHeight * 0.55 - bh / 2;   // arriba: alineado con la instrucción
    const papel = this.pieza('ui_papel', bx, by, bw, bh, 30, k);
    const pico = this.e.add.triangle(bx - 12 * k, by + bh * 0.55, 14 * k, 0, 14 * k, 16 * k, 0, 12 * k, 0xe9dfc8).setOrigin(0, 0)
      .setStrokeStyle(2, TINTA);
    nombre.setPosition(bx + pad, by + pad - 2 * k);
    t.setPosition(bx + pad, nombre.y + nombre.height + 2);
    c.add([robot, pico, papel, nombre, t]);
    // en el sitio de la instrucción (el robot asoma por su borde de abajo) o abajo a la izquierda
    const x = z ? z.x + robot.displayWidth / 2 : m + robot.displayWidth / 2;
    const y = z ? z.y + z.h + 4 * k : (this.filaAbajo ?? this.e.scale.height - 80) - 6 * k;
    c.setPosition(x, y);
    z?.c.setVisible(false);
    this.pistaCont = c;
    this.hud.includes(c) || this.hud.push(c);
    if (entrar) {
      c.setAlpha(0).setX(x - 40 * k);
      this.e.tweens.add({ targets: c, alpha: 1, x, duration: 260, ease: 'Back.out' });
      this.e.tweens.add({ targets: robot, y: -4 * k, duration: 360, yoyo: true, repeat: 2, ease: 'Sine.inOut' });
    }
  }

  ocultarPista(ya = false) {
    const p = this.pistaVisible, c = this.pistaCont;
    this.pistaVisible = null;
    this.pistaCont = null;
    p?.reloj?.remove();
    if (!c) return;
    this.hud = this.hud.filter(o => o !== c);
    const instr = this.zonaInstr?.c;
    if (ya) { c.destroy(); instr?.setVisible(true); return; }
    // fundido cruzado: la instrucción vuelve mientras la pista se va
    this.e.tweens.add({ targets: c, alpha: 0, duration: 250, onComplete: () => c.destroy() });
    if (instr?.active) {
      instr.setVisible(true).setAlpha(0);
      this.e.tweens.add({ targets: instr, alpha: 1, duration: 250 });
    }
    this.avance();                                  // la siguiente pista, si hace falta, tarda otro rato
  }

  // ---------- Resultado: papel con sello, lo que cambió en la base y volver ----------
  resultado(datos) {
    this.activo = false;
    this.ocultarPista(true);
    this.datosResultado = datos;
    this.enHud = true;
    try { this.dibujarResultado(datos); } finally { this.enHud = false; }
  }

  // sello: texto propio del sello (p. ej. '¡FILTRO SELLADO!'); sin él, ¡MISIÓN CUMPLIDA! / MISIÓN INCOMPLETA
  dibujarResultado({ exito, sello: textoSello = null, cambios = [], nota = null, mensaje = '', alVolver }) {
    const k = this.k ?? 1, W = this.e.scale.width, H = this.e.scale.height;
    const velo = this.e.add.rectangle(0, 0, W, H, 0x070516, 0.72).setOrigin(0).setDepth(40).setInteractive();
    this.hud.push(velo);
    const c = this.contenedor(W / 2, H / 2).setDepth(41);
    const w = Math.min(560 * k, W - 32), pad = 22 * k;
    const piezas = [];
    let y = pad;
    // sello: ¡MISIÓN CUMPLIDA! (verde) o MISIÓN INCOMPLETA (rojo)
    const colorSello = exito ? VERDE_TXT : SELLO_TXT;
    const sello = this.texto(0, 0, textoSello ?? (exito ? '¡MISIÓN CUMPLIDA!' : 'MISIÓN INCOMPLETA'), {
      fontSize: `${Math.max(20, Math.round(26 * k))}px`, fontStyle: 'bold', color: colorSello, letterSpacing: 2 }).setOrigin(0.5);
    const marcoSello = this.e.add.graphics();
    marcoSello.lineStyle(3, Phaser.Display.Color.HexStringToColor(colorSello).color, 1)
      .strokeRoundedRect(-sello.width / 2 - 14 * k, -sello.height / 2 - 6 * k, sello.width + 28 * k, sello.height + 12 * k, 8 * k);
    const selloC = this.e.add.container(0, 0, [marcoSello, sello]).setAngle(-4);
    y += sello.height / 2 + 6 * k;
    selloC.setPosition(0, y);
    y += sello.height / 2 + 20 * k;
    piezas.push(selloC);
    // lo que cambió: insignia del recurso y el número
    if (cambios.length) {
      const fichas = cambios.map(({ recurso, n }) => {
        const f = this.e.add.container(0, 0);
        const ico = this.e.add.image(0, 0, `icono_${recurso}`).setDisplaySize(40 * k, 40 * k);
        const num = this.texto(26 * k, 0, `${n > 0 ? '+' : ''}${n}`, { fontFamily: NUMEROS, fontSize: `${Math.max(20, Math.round(26 * k))}px`,
          fontStyle: 'bold', color: n >= 0 ? TINTA_TXT : SELLO_TXT }).setOrigin(0, 0.5);
        const nom = this.texto(num.x + num.width + 6 * k, 2 * k, NOMBRE_RECURSO[recurso], { fontSize: `${Math.max(16, Math.round(16 * k))}px`,
          color: TINTA_TXT }).setOrigin(0, 0.5);
        f.add([ico, num, nom]);
        f.ancho = 20 * k + nom.x + nom.width;
        return f;
      });
      const total = fichas.reduce((s, f) => s + f.ancho, 0) + 24 * k * (fichas.length - 1);
      let x = -total / 2;
      for (const f of fichas) { f.setPosition(x + 20 * k, y + 20 * k); x += f.ancho + 24 * k; }
      piezas.push(...fichas);
      y += 40 * k + 10 * k;
    }
    if (nota) {
      const n = this.texto(0, y, `★ ${tr(nota)}`, { fontSize: `${Math.max(16, Math.round(15 * k))}px`, fontStyle: 'italic', color: '#6b4a2a' })
        .setOrigin(0.5, 0);
      piezas.push(n);
      y += n.height + 8 * k;
    }
    if (mensaje) {
      const msg = this.texto(0, y + 4 * k, mensaje, { fontSize: `${Math.max(16, Math.round(17 * k))}px`, color: TINTA_TXT, align: 'center',
        lineSpacing: 3, wordWrap: { width: w - 2 * pad, useAdvancedWrap: true } }).setOrigin(0.5, 0);
      piezas.push(msg);
      y += msg.height + 18 * k;
    }
    const volver = { id: 'volver', texto: 'VOLVER A LA BASE', estado: 'accion', alPulsar: () => { volver.alPulsar = null; alVolver?.(); } };
    const tecla = this.crearTecla(k, volver);
    this.hud = this.hud.filter(o => o !== tecla.c);
    y += tecla.h / 2;
    tecla.c.setPosition(0, y);
    tecla.c.off('pointerdown').on('pointerdown', () => {
      this.e.tweens.add({ targets: tecla.c, scaleX: 0.94, scaleY: 0.9, duration: 70, yoyo: true });
      sonido.efecto('ui_clic_boton', 0.6);
      volver.alPulsar?.();
    });
    this.datosResultado.alVolver = () => volver.alPulsar?.();
    y += tecla.h / 2 + pad;
    const h = y;
    const papel = this.pieza('ui_papel', -w / 2, 0, w, h, 30, k);
    c.add([papel, ...piezas, tecla.c]);
    for (const o of c.list) o.y -= h / 2;
    c.setScale(0.9).setAlpha(0);
    this.e.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 220, ease: 'Back.out' });
  }
}
