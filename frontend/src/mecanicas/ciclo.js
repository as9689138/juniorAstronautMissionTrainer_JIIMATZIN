// Ciclo de juego (rol 2) sobre el mapa: une el estado, la historia (Ink + voces) y los minijuegos.
// Un sol, como en el prototipo de minijuegos (SolLoopScene) pero caminando por la base:
//   MAÑANA  -> la IA dicta la hora (amanece) -> nudo "manana" -> ir a la consola de Mando y repartir la energía
//   DÍA     -> nudo "dia" (la IA avisa de que hay luz) -> las 3 tareas, EN EL ORDEN DE LA RUTA del personaje
//              (src/mecanicas/rutas.js): primero su especialidad. Cada una: nudo mini_* -> minijuego -> *_gana o *_falla
//   EMERGENCIA (la de cada sol, data/base_de_datos_juego.json) -> la IA da la alerta -> decisión con cuenta atrás
//   NOCHE   -> la IA dicta la hora (anochece) y el consumo -> dormir en el Refugio -> nudo noche_N -> carta -> sol siguiente
//   FIN     -> nudo fin_exito / fin_energia / fin_oxigeno / fin_blindaje -> reporte final -> volver a elegir
//
// LA IA GUÍA MIDE Y ADAPTA (src/compania/guia.js): cada minijuego, reparto de la consola y decisión de emergencia es
// una prueba de aprendizaje; según lo que mide da pistas, más tiempo y el porqué de cada decisión.
//
// EL TIEMPO LO DICTA LA IA: la fase que ven el mapa (luz) y la interfaz (ficha del Sol) solo cambia cuando la IA la
// anuncia en un diálogo (EV.HORA, ver Dialogo.darHora). GameState.fase es la fase de las reglas; GameState.reloj, la
// que anunció la IA.
import { verCine } from '../motor/cine.js';
import { bus, EV, control } from '../motor/eventos.js';
import { sonido } from '../motor/sonido.js';
import { GameState } from './estado.js';
import { Narrador, ROL_DE, NOMBRE_DE } from './narrador.js';
import { datosReales } from './datosReales.js';
import { cargas } from '../motor/cargas.js';
import { ruta, NOMBRE_TAREA, tiempoEmergencia, costeEmergencia } from './rutas.js';
import { guia } from '../compania/guia.js';
import { idioma } from '../motor/idioma.js';

// Emergencia de cada sol (6_base_de_datos/soles.csv). Sol 1: tutorial sin emergencia; sol 10: a elección (una al azar).
// Es el mismo para los tres personajes porque las mañanas de historia.ink lo anuncian ("hay polvo en el cielo"...).
const EMERGENCIA_DEL_SOL = [null, null, 'emergencia_calor', 'emergencia_fuga', 'emergencia_co2', 'emergencia_radiacion',
  'emergencia_polvo', 'emergencia_impacto', 'emergencia_comunicacion', 'emergencia_solar', '*'];
const TODAS = ['emergencia_solar', 'emergencia_polvo', 'emergencia_co2', 'emergencia_radiacion', 'emergencia_calor',
  'emergencia_fuga', 'emergencia_impacto', 'emergencia_comunicacion'];
const PUNTOS_POR_NIVEL = 20;          // un "nivel" de la historia (costo:energia-1) son 20 puntos de 100

// Estación del mapa -> minijuego
const TAREAS = {
  tarea_paneles: { clave: 'paneles', escena: 'PanelCleaningScene', nudo: 'mini_paneles' },
  tarea_filtro: { clave: 'co2', escena: 'CO2FilterScene', nudo: 'mini_filtro' },
  tarea_invernadero: { clave: 'invernadero', escena: 'GreenhouseScene', nudo: 'mini_riego' },
};

// La hora de la base que dicta la IA en cada fase (hora local de la base, en Marte)
const HORAS = { manana: '06:00', dia: '10:00', emergencia: '16:00', noche: '20:00' };
const MUSICA_DE_FASE = { manana: 'dia', dia: 'dia', noche: 'noche' };    // la de emergencia la pone la historia

export const ciclo = {
  juego: null,
  narrador: null,
  enPartida: false,
  cola: Promise.resolve(),

  iniciar(juego) {
    this.juego = juego;
    bus.on(EV.INTERACTUAR, d => this.alInteractuar(d));
    bus.on(EV.HORA, h => this.anunciarHora(h));
    // el último estado queda en el registro: el mapa y la interfaz lo leen al cambiar de sala
    bus.on(EV.ESTADO_CAMBIO, e => juego.registry.set('estado', e));
    datosReales.cargar();          // escenario con datos reales de la API del equipo (o su respaldo); no detiene nada
    datosReales.cargarSol();       // llamaradas reales de los últimos días (DONKI en vivo, por la API del equipo)
    window.addEventListener('keydown', ev => { if (ev.key === 'm' || ev.key === 'M') sonido.alternarSilencio(); });
    this.vigilar();
  },

  // Se llama al terminar de cargar (Arranque): la historia y las voces ya están en caché
  prepararHistoria() {
    if (!this.narrador) this.narrador = new Narrador(this.juego);
  },

  get ruta() { return ruta(GameState.personaje); },

  // Abre una pantalla encima de todo (diálogo, consola o minijuego) sin parar el mapa
  abrir(clave, datos) {
    const sm = this.juego.scene;
    const arrancar = () => { sm.start(clave, datos); sm.bringToTop(clave); };
    const s = sm.getScene(clave);
    if (s?.sys.isActive()) {                     // sigue abierta (o con su apagado pendiente): esperar a que se apague
      let hecho = false;
      const una = () => { if (!hecho) { hecho = true; arrancar(); } };
      s.sys.events.once('shutdown', () => queueMicrotask(una));
      setTimeout(una, 600);                      // por si nadie la apaga: se reinicia igual
      return;
    }
    arrancar();
  },

  // Vigilante: si el control quedó bloqueado sin ninguna pantalla encima (un error), lo devuelve en 2 s
  vigilar() {
    const ENCIMA = ['Dialogo', 'Consola', 'PanelCleaningScene', 'CO2FilterScene', 'GreenhouseScene', 'Seleccion'];
    let sin = 0;
    setInterval(() => {
      const algo = ENCIMA.some(k => this.juego.scene.isActive(k)) || !this.juego.scene.isActive('Base');
      sin = control.modal && !algo ? sin + 1 : 0;
      if (sin >= 4) {
        console.warn('[ciclo] el control quedó bloqueado sin pantalla encima: se devuelve al jugador');
        sin = 0;
        this.cola = Promise.resolve();
        this.soltar();
      }
    }, 500);
  },

  // Cuenta un nudo de la historia con la escena Dialogo. Devuelve una promesa con las etiquetas recogidas.
  // opciones: { fondo, cuentaAtras, hora } (hora: la que anuncia la IA al empezar el nudo)
  narrar(nudo, opciones = {}) {
    const tarea = this.cola.then(() => new Promise(resolver => {
      this.prepararHistoria();
      this.narrador.variables({
        energia: GameState.nivel('energia'), oxigeno: GameState.nivel('oxigeno'), blindaje: GameState.nivel('blindaje'),
        sol: Math.min(GameState.sol, GameState.maxSoles),
      });
      // saltar: n líneas del principio del nudo que ya contó otra cosa (el video de la introducción)
      const narrador = opciones.saltar ? this.narradorSaltando(opciones.saltar) : this.narrador;
      this.abrir('Dialogo', { nudo, ...opciones, narrador, alTerminar: resolver });
    })).then(async tags => {
      // # dato:<id> de la historia: si el escenario lo vincula a una ficha aprobada, la IA la cuenta (Dato real)
      const fichas = [...new Set(tags.dato ?? [])].map(d => datosReales.fichaDeDato(d)).filter(Boolean);
      if (fichas.length) await this.mostrarLineas(fichas.flatMap(f => datosReales.lineasFicha(f)));
      return tags;
    });
    this.cola = tarea.catch(() => {});
    return tarea;
  },

  // El mismo narrador, pero al empezar un nudo se salta sus n primeras líneas (sus etiquetas también)
  narradorSaltando(n) {
    const real = this.narrador;
    return Object.assign(Object.create(real), {
      empezar(nudo) {
        if (!real.empezar(nudo)) return false;
        for (let k = 0; k < n;) { const p = real.paso(); if (!p || p.tipo === 'opciones') break; if (p.tipo === 'linea') k++; }
        return true;
      },
      paso: () => real.paso(),
    });
  },

  // Abre el diálogo con líneas sueltas sin pasar por la cola (para usar dentro de otra narración)
  mostrarLineas(lineas) {
    return new Promise(resolver => this.abrir('Dialogo', { lineas, alTerminar: resolver }));
  },

  // Fichas «Dato real» que el escenario coloca en este sol y fase
  async fichasDeFase(fase) {
    const fichas = datosReales.fichasDe(Math.min(GameState.sol, GameState.maxSoles), fase);
    if (fichas.length) await this.decir(fichas.flatMap(f => datosReales.lineasFicha(f)));
  },

  // Líneas sueltas sin Ink (avisos de la IA). Cada una: texto o { quien, cara, texto, hora }
  decir(lineas) {
    const tarea = this.cola.then(() => new Promise(resolver => {
      this.abrir('Dialogo', { lineas: lineas.map(t => (typeof t === 'string' ? { quien: 'ia', texto: t } : t)), alTerminar: resolver });
    }));
    this.cola = tarea.catch(() => {});
    return tarea;
  },

  soltar() {                         // devuelve el control al jugador en el mapa
    control.modal = false;
    bus.emit(EV.CERRAR_PANEL);
  },

  // A dónde ir ahora: la flecha del mapa y, en la burbuja del robot, la IA lo dice (con la ruta del personaje)
  objetivo(nombre) {
    this.juego.registry.set('objetivo', nombre);
    bus.emit(EV.OBJETIVO, nombre);
    const frase = this.fraseObjetivo(nombre);
    if (frase) window.__robot?.decir(frase, { cara: 'feliz', duracion: 4800, importante: true });
  },

  fraseObjetivo(nombre) {
    const r = this.ruta;
    if (nombre === 'consola') return `${r.nombre}, a la consola de Mando: hay que repartir la energía de hoy.`;
    if (nombre === 'refugio') return 'Al Refugio: el equipo te espera para dormir.';
    if (!NOMBRE_TAREA[nombre]) return null;
    if (nombre === r.especialidad) return `Primero tu especialidad, ${r.titulo.toLowerCase()}: ${NOMBRE_TAREA[nombre]}.`;
    return `Ahora toca ${NOMBRE_TAREA[nombre]}.`;
  },

  // --- La hora que dicta la IA ---
  hora(fase) { return { fase, hora: HORAS[fase] }; },

  anunciarHora({ fase, hora }) {
    if (!this.enPartida) return;
    GameState.reloj = { fase, hora };
    GameState.publicar();
    sonido.campana(fase);
    if (MUSICA_DE_FASE[fase]) sonido.musica(MUSICA_DE_FASE[fase]);
  },

  textoAmanecer() {
    const { sol, maxSoles } = GameState, r = this.ruta;
    if (sol === 1) return `Sol 1 de ${maxSoles}. Son las 6 de la mañana en la Base Marte Uno. ¡Buenos días, ${r.titulo.toLowerCase()} ${r.nombre}! El sol está saliendo.`;
    if (sol === maxSoles) return `Sol ${sol} de ${maxSoles}, el último. Son las 6 de la mañana. ¡Buenos días, ${r.nombre}! El sol está saliendo.`;
    return `Sol ${sol} de ${maxSoles}. Son las 6 de la mañana: ¡buenos días, ${r.nombre}! El sol está saliendo.`;
  },

  // --- Partida ---
  async nuevaPartida(escena, personaje, dificultad) {
    this.prepararHistoria();
    GameState.iniciarPartida(personaje, dificultad);
    guia.nuevaPartida(personaje, dificultad);
    this.narrador.variables({ jugador: NOMBRE_DE[personaje], rol: ROL_DE[personaje] });
    this.juego.registry.set('personaje', personaje);
    this.juego.registry.set('rolJugador', ROL_DE[personaje]);
    this.juego.registry.set('zona', 'pasillo');
    this.enPartida = true;
    escena.scene.start('Base');
    escena.scene.launch('Interfaz');
    await new Promise(r => setTimeout(r, 400));
    GameState.publicar();
    sonido.ambiente(true);
    // la introducción: el video (pkt/cine-intro) cuenta sus 4 primeras líneas; el diálogo sigue desde la IA
    const vioIntro = await verCine('intro');
    await this.narrar('introduccion', vioIntro ? { saltar: 4 } : {});
    await this.manana();
  },

  async manana() {
    GameState.fase = 'MAÑANA';
    guia.empezarSol();
    sonido.efecto('sfx_puerta_presurizada', 0.6);
    // La IA abre el sol: con su aviso amanece en el mapa y cambia la ficha del Sol
    await this.decir([{ quien: 'ia', cara: 'feliz', hora: this.hora('manana'), texto: this.textoAmanecer() }]);
    await this.narrar('manana');
    const repaso = guia.repasoDelDia();                          // repaso espaciado: pregunta y, después, la respuesta
    if (repaso) await this.decir(repaso.map(texto => ({ quien: 'ia', cara: 'procesando', texto, traducido: true })));
    const clima = datosReales.lineaClima(GameState.sol);          // medición real de Marte para este sol
    if (clima) await this.decir([{ quien: 'ia', cara: 'feliz', texto: clima }]);
    await this.fichasDeFase('manana');
    // Si el tema del recurso más bajo está flojo, la IA guía da una pista antes de repartir
    const pista = guia.pistaConsola();
    this.pistaConsolaDada = guia.conPistaConsola;     // un reto no cuenta como pista
    if (pista) await this.decir(pista.map(texto => ({ quien: 'ia', cara: 'procesando', texto, traducido: true })));
    this.objetivo('consola');
    this.soltar();
  },

  // La siguiente tarea del día, en el orden de la ruta del personaje (primero su especialidad)
  siguienteTarea() { return this.ruta.orden.find(n => !GameState.minijuegosHoy[TAREAS[n].clave]) ?? null; },

  // --- Lo que pasa al usar cada estación, según la fase ---
  async alInteractuar(d) {
    if (!this.enPartida) return;
    const fase = GameState.fase;
    const tarea = TAREAS[d.nombre];
    if (d.nombre === 'consola') {
      if (fase === 'MAÑANA') return this.abrirConsola();
      return this.avisar('La energía de hoy ya está repartida. La consola vuelve a abrirse mañana.');
    }
    if (tarea) {
      if (fase === 'MAÑANA') return this.avisar('Primero reparte la energía en la consola de Mando.');
      if (fase !== 'DIA') return this.avisar('Ahora no hay luz solar para trabajar aquí.');
      if (GameState.minijuegosHoy[tarea.clave]) return this.avisar('Esta tarea ya está hecha hoy. ¡Buen trabajo!');
      return this.jugarTarea(d.nombre);
    }
    if (d.nombre === 'refugio') {
      if (fase === 'NOCHE') return this.dormir();
      return this.avisar('El refugio tiene muros de agua contra la radiación. Aquí dormimos al caer la noche.');
    }
    if (d.nombre === 'antena') {                     // la antena trae las noticias reales del Sol (DONKI)
      await datosReales.cargarSol();
      await this.decir([...(datosReales.lineasSol() ?? []),
        'La antena habla con la Tierra. Cada mensaje tarda de 3 a 22 minutos en llegar, según dónde estén los dos planetas.']);
      return this.soltar();
    }
    this.soltar();
  },

  async avisar(texto) {
    await this.decir([texto]);
    this.soltar();
  },

  async abrirConsola() {
    control.modal = true;
    this.recursosConsola = { ...GameState.recursos };     // como estaban al decidir (la consola descuenta al confirmar)
    await cargas.asegurar('consola');
    this.abrir('Consola', { modo: 'MAÑANA', alTerminar: () => this.empezarDia() });
  },

  async empezarDia() {
    GameState.fase = 'DIA';
    cargas.precargar(Object.values(TAREAS).map(t => `minijuego:${t.escena}`));   // el arte de los 3 minijuegos, mientras habla la IA
    // El reparto es una prueba de aprendizaje; si no fue el mejor, la IA explica por qué
    const porque = guia.evidenciaConsola(GameState.asignacionEnergia, this.recursosConsola ?? GameState.recursos, this.pistaConsolaDada);
    if (porque) await this.decir(porque.map(texto => ({ quien: 'ia', cara: 'neutral', texto, traducido: true })));
    await this.narrar('dia', { hora: this.hora('dia') });                       // "Hay luz solar. ¡Manos a la obra!"
    await this.fichasDeFase('dia');
    this.objetivo(this.siguienteTarea());
    this.soltar();
  },

  async jugarTarea(nombre) {
    const t = TAREAS[nombre];
    await this.narrar(t.nudo);
    control.modal = true;
    await cargas.asegurar(`minijuego:${t.escena}`);
    GameState.ajusteIA[t.clave] = guia.ajusteTiempo(t.clave);   // más tiempo si el tema está flojo
    this.juego.registry.set('narrado', true);
    const resultado = await new Promise(resolver => {
      bus.once('minijuego-fin', resolver);
      this.abrir(t.escena);
    });
    GameState.publicar();
    guia.evidenciaMinijuego(t.clave, resultado.success);
    cargas.liberar(`minijuego:${t.escena}`);          // ya se jugó hoy: su arte se libera (mañana se vuelve a pedir)
    await this.narrar(`${t.nudo}_${resultado.success ? 'gana' : 'falla'}`);
    if (this.revisarFin()) return;
    const siguiente = this.siguienteTarea();
    if (siguiente) { this.objetivo(siguiente); this.soltar(); return; }
    await this.emergencia();
  },

  async emergencia() {
    let nudo = EMERGENCIA_DEL_SOL[GameState.sol];
    if (nudo === '*') nudo = Phaser.Utils.Array.GetRandom(TODAS);
    if (nudo) {
      GameState.fase = 'EMERGENCIA';
      this.objetivo(null);
      sonido.efecto('ui_aviso_emergencia', 0.8);
      const p = GameState.personaje;
      const segundos = tiempoEmergencia(p, nudo, GameState.getParametrosDificultad().tiempoEmergencia);
      // La alerta de la IA es la primera línea del nudo: con ella la base pasa a emergencia (luz roja).
      // Si "decidir con datos" está flojo, la IA guía pone una pista encima de las opciones.
      const recursos = { ...GameState.recursos };
      const pista = guia.pistaEmergencia(nudo);
      const tags = await this.narrar(nudo, { cuentaAtras: segundos, hora: this.hora('emergencia'), pista });
      const porque = guia.evidenciaEmergencia(nudo, tags.eleccion?.[0], tags.agotado, recursos, guia.conPistaEmergencia);
      if (porque) await this.decir(porque.map(texto => ({ quien: 'ia', cara: 'feliz', texto, traducido: true })));
      if (nudo === 'emergencia_solar' && datosReales.lineasSol()) await this.decir(datosReales.lineasSol());   // y lo real de esta semana
      await this.fichasDeFase('emergencia');
      for (const c of tags.costo ?? []) {              // costo:energia-1 -> -20 de energía (o menos, con la ventaja del personaje)
        const m = /^(energia|oxigeno|blindaje)([+-]\d+)$/.exec(c);
        if (m) GameState.modificarRecurso(m[1], costeEmergencia(p, nudo, m[1], Number(m[2]) * PUNTOS_POR_NIVEL));
      }
      GameState.publicar();
      if (this.revisarFin()) return;
    }
    await this.noche();
  },

  async noche() {
    GameState.fase = 'NOCHE';
    const r = this.ruta;
    let consumo = GameState.getParametrosDificultad().consumoNocturno;
    if (GameState.mejoras.codigoHamilton) consumo = Math.max(4, Math.floor(consumo * 0.6));
    const antes = consumo;
    if (r.ahorroNoche) consumo = Math.max(3, Math.round(consumo * (1 - r.ahorroNoche)));
    const tr = s => idioma.traducir(s);
    const aviso = [tr(`Son las 8 de la noche. Ya es de noche y los paneles solares descansan. Los sistemas gastan ${consumo} de energía.`),
      antes > consumo ? tr(`Con tus ajustes de ingeniero, ${r.nombre}, son ${antes - consumo} menos que sin ellos.`) : null,
      tr('Vamos al Refugio a descansar con el equipo.')].filter(Boolean).join(' ');
    // La IA dicta la noche (luz de noche, música) y cuenta lo que gasta la base; el gasto se aplica al terminar su aviso
    await this.decir([{ quien: 'ia', cara: 'neutral', hora: this.hora('noche'), texto: aviso, traducido: true },
      { quien: 'ia', cara: 'feliz', texto: guia.resumenDelSol(), traducido: true }]);   // lo que aprendió hoy y qué practicar
    GameState.modificarRecurso('energia', -consumo);
    GameState.publicar();
    if (this.revisarFin()) return;
    this.objetivo('refugio');
    this.soltar();
  },

  async dormir() {
    this.objetivo(null);
    await this.narrar(`noche_${Math.min(GameState.sol, 10)}`);
    await this.fichasDeFase('noche');
    control.modal = true;
    await cargas.asegurar('consola');
    await new Promise(resolver => this.abrir('Consola', { modo: 'MEJORA', alTerminar: resolver }));
    GameState.sol++;
    guia.sincronizar();                                // al terminar cada sol se guarda lo medido (anónimo)
    if (this.revisarFin()) return;
    GameState.prepararNuevoSol();
    await this.manana();
  },

  // ¿Se acabó la misión? Cuenta el final y muestra el reporte
  revisarFin() {
    const fin = GameState.verificarFinJuego();
    if (!fin.terminado) return false;
    this.final(fin.motivo);
    return true;
  },

  async final(motivo) {
    GameState.fase = 'FIN';
    guia.cerrarPartida({ VICTORIA: 'misión completa', ENERGIA: 'sin energía', OXIGENO: 'sin oxígeno', BLINDAJE: 'sin blindaje' }[motivo] ?? motivo,
      motivo === 'VICTORIA', { VICTORIA: 'victoria', ENERGIA: 'energia', OXIGENO: 'oxigeno', BLINDAJE: 'blindaje' }[motivo]);
    guia.sincronizar();                                // la partida, anónima, a la API del equipo
    this.objetivo(null);
    sonido.ambiente(false);
    const nudo = { VICTORIA: 'fin_exito', ENERGIA: 'fin_energia', OXIGENO: 'fin_oxigeno', BLINDAJE: 'fin_blindaje' }[motivo];
    await this.narrar(nudo);
    control.modal = true;
    await cargas.asegurar('consola');
    await new Promise(resolver => this.abrir('Consola', { modo: 'FINAL', motivo, alTerminar: resolver }));
    this.enPartida = false;
    control.modal = false;
    control.bloqueado = false;
    for (const k of ['Base', 'Interfaz', 'Album', 'Aprendizaje']) this.juego.scene.stop(k);   // sus botones no van en la selección
    this.juego.scene.start('Seleccion');
  },
};
