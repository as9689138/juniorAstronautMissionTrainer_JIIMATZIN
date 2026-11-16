// La IA guía: el "cerebro" del robot de la base. Aquí vive TODO el machine learning del juego:
//  1. Pronóstico de llamaradas solares (src/ml/pronostico.js: regresión logística entrenada con datos de NOAA).
//  2. Medición del aprendizaje (src/ml/aprendizaje.js: Bayesian Knowledge Tracing). Estima cuánto domina el niño
//     cada tema con lo que hace en el juego:
//       - minijuegos: ganar o fallar cuenta para su tema (paneles → Energía; filtro e invernadero → Aire);
//       - consola de Mando: si le da los núcleos al sistema del recurso más bajo (y a los Escudos si el pronóstico
//         dice llamarada);
//       - emergencias: si elige la opción que gasta el recurso que tiene de sobra y cuida el más bajo.
// Con esa medición la IA ADAPTA su ayuda: pistas y más tiempo en lo flojo; en lo dominado, menos ayuda y algo de
// reto. Y explica el porqué de cada decisión (la retroalimentación con porqué es lo que más enseña:
// docs/aprendizaje.md). El niño ve su avance con estrellas; el adulto, un reporte con números
// (src/compania/Aprendizaje.js).
// Guardado: en el navegador (localStorage) y, de forma ANÓNIMA, en la API del equipo (POST /api/v1/partidas) al final
// de cada sol y de la misión, para que el equipo estudie el aprendizaje. El jugador es un código al azar de este
// dispositivo (sin nombres ni otros datos personales). Sin conexión, la partida espera y se manda después.
import { Rastreador, TEMAS, NIVELES } from '../ml/aprendizaje.js';
import { politica } from '../ml/politica.js';
import { frase, nivelDe } from './frases.js';
const NOMBRE_PJ = { wenceslao: 'Wenceslao', judith: 'Judith', atlas: 'Atlas' };
import Pronosticador from '../ml/pronostico.js';
import { GameState } from '../mecanicas/estado.js';
import { bus, EV } from '../motor/eventos.js';
import { idioma } from '../motor/idioma.js';
import { enviarPartida } from '../api/partidas.js';

const CLAVE = 'jiimatzin.aprendizaje.v1';
const CLAVE_JUGADOR = 'jiimatzin.jugador';               // código anónimo de este dispositivo
const CLAVE_PENDIENTES = 'jiimatzin.partidas.pendientes'; // partidas que aún no llegan a la API
const VERSION_MODELO = 'bkt-1';                           // cambiarla si cambian PARAMETROS o la forma de medir
const RESULTADO = { VICTORIA: 'victoria', ENERGIA: 'energia', OXIGENO: 'oxigeno', BLINDAJE: 'blindaje' };
const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
  : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));
const RECURSOS = ['energia', 'oxigeno', 'blindaje'];
const NOMBRE_RECURSO = { energia: 'energía', oxigeno: 'oxígeno', blindaje: 'blindaje' };
const CON_ARTICULO = { energia: 'la energía', oxigeno: 'el oxígeno', blindaje: 'el blindaje' };
const TEMA_DE_RECURSO = { energia: 'energia', oxigeno: 'aire', blindaje: 'escudo' };
const SISTEMA_DE_RECURSO = { energia: 'paneles', oxigeno: 'soporteVital', blindaje: 'escudos' };
const NOMBRE_SISTEMA = { paneles: 'los Colectores Solares', soporteVital: 'el Soporte Vital', escudos: 'los Escudos del Casco' };
const A_SISTEMA = { paneles: 'a los Colectores Solares', soporteVital: 'al Soporte Vital', escudos: 'a los Escudos del Casco' };
const nucleos = n => `${n} núcleo${n === 1 ? '' : 's'}`;
const TEMA_DE_MINIJUEGO = { paneles: 'energia', co2: 'aire', invernadero: 'aire' };
// Qué recurso gasta cada opción de cada emergencia, en orden (historia.ink: el costo:<recurso>-1 de cada rama)
const COSTES = {
  emergencia_solar: ['energia', 'blindaje'], emergencia_polvo: ['oxigeno', 'energia'], emergencia_co2: ['energia', 'oxigeno'],
  emergencia_radiacion: ['energia', 'oxigeno'], emergencia_calor: ['blindaje', 'energia'], emergencia_fuga: ['energia', 'oxigeno'],
  emergencia_impacto: ['energia', 'oxigeno'], emergencia_comunicacion: ['oxigeno', 'energia'],
};
const CLARO = 12;
const MEDALLAS = { oro: 'Medalla de oro', plata: 'Medalla de plata', bronce: 'Medalla de bronce' };
const NOMBRE_TIPO = { minijuego: 'minijuegos', consola: 'consola', emergencia: 'emergencias', consolaConPista: 'consola con pista',
  emergenciaConPista: 'emergencias con pista' };
const nombreEmergencia = n => n.replace('emergencia_', 'emergencia de ').replace('comunicacion', 'comunicación').replace('radiacion', 'radiación');          // puntos de diferencia para que una decisión tenga una respuesta clara

export const guia = {
  rastreador: new Rastreador(),
  partida: null,             // { personaje, dificultad, inicio, fin, resultado }
  historial: [],             // partidas anteriores (resumen), en este navegador
  pronosticoHoy: null,
  modeloPronostico: null,
  inicioDelSol: null,

  iniciar() {
    try {
      const g = JSON.parse(localStorage.getItem(CLAVE) ?? 'null');
      if (g) { this.historial = g.historial ?? []; this.partida = g.partida ?? null; this.rastreador = new Rastreador(g.rastreador); }
    } catch { /* sin almacenamiento: se mide igual, sin guardar */ }
    bus.on(EV.PRONOSTICO, p => { this.pronosticoHoy = p; });
    politica.iniciar();
    setTimeout(() => this.mandarPendientes(), 4000);      // lo que no llegó la vez pasada
  },

  // --- Guardado anónimo en la API del equipo ---
  get jugador() {
    try {
      let id = localStorage.getItem(CLAVE_JUGADOR);
      if (!/^[0-9a-f-]{36}$/i.test(id ?? '')) { id = uuid(); localStorage.setItem(CLAVE_JUGADOR, id); }
      return id;
    } catch { return (this.jugadorSinGuardar ??= uuid()); }
  },

  // Lo que se manda: solo el código anónimo, la partida, el dominio por tema y las pruebas (nada personal)
  cuerpo() {
    const p = this.partida, c = p.calificacion;
    return {
      jugador: this.jugador,
      partida: { id: p.id, personaje: p.personaje, dificultad: p.dificultad, idioma: idioma.actual, inicio: p.inicio, fin: p.fin,
        resultado: p.codigo ?? 'en_curso', soles: c?.soles ?? p.solesHechos ?? this.solesHechos(),
        medalla: c?.medalla ?? null, puntaje: c?.puntaje ?? null },
      dominio: Object.fromEntries(Object.entries(this.rastreador.dominio).map(([k, v]) => [k, +v.toFixed(4)])),
      pruebas: this.rastreador.pruebas.slice(0, 400).map(x => ({ tema: x.tema, tipo: x.tipo, correcto: x.correcto, sol: x.sol ?? null,
        detalle: String(x.detalle ?? '').slice(0, 200), antes: x.antes, despues: x.despues })),
      modelo: VERSION_MODELO,
    };
  },

  pendientes() { try { return JSON.parse(localStorage.getItem(CLAVE_PENDIENTES) ?? '{}'); } catch { return {}; } },
  guardarPendientes(p) { try { localStorage.setItem(CLAVE_PENDIENTES, JSON.stringify(p)); } catch { /* sin almacenamiento */ } },

  // Soles completos de la partida en juego (la que está corriendo ahora en GameState)
  solesHechos() { return Math.max(0, Math.min(GameState.sol, GameState.maxSoles + 1) - 1); },

  // Guarda la partida actual (al final de cada sol y de la misión). Primero queda pendiente; al llegar, se quita.
  sincronizar() {
    if (!this.partida?.id) return;
    // los soles se apuntan en la partida: si se abandona (se cierra la pestaña), al cerrarla la próxima vez GameState
    // ya es el de otra partida y no sabe hasta dónde llegó esta
    if (!this.partida.fin) { this.partida.solesHechos = this.solesHechos(); this.guardar(); }
    const p = this.pendientes();
    p[this.partida.id] = this.cuerpo();
    this.guardarPendientes(p);
    this.mandarPendientes();
  },

  async mandarPendientes() {
    if (this.mandando) { this.otraVez = true; return; }    // ya se está mandando: al acabar se vuelve a revisar
    this.mandando = true;
    try {
      do {
        this.otraVez = false;
        for (const [id, cuerpo] of Object.entries(this.pendientes())) {
          const enviado = JSON.stringify(cuerpo);
          const r = await enviarPartida(cuerpo);
          if (r.reintentar) { this.otraVez = false; return; }   // sin red o API ocupada: se intenta en el próximo guardado
          // Se quita solo si sigue siendo lo que se mandó: si mientras tanto se guardó una versión nueva de la
          // partida (el final de la misión llega justo después del último sol), esa se queda y se manda en la
          // siguiente vuelta. Lo que la API no acepta (4xx) también se quita: reintentarlo no lo arregla.
          const p = this.pendientes();
          if (p[id] !== undefined && JSON.stringify(p[id]) === enviado) { delete p[id]; this.guardarPendientes(p); }
          if (!r.ok) console.warn('[guía] la API no aceptó la partida', id, r.estado);
        }
      } while (this.otraVez);
    } finally { this.mandando = false; }
  },

  guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify({ partida: this.partida, rastreador: this.rastreador.guardar(), historial: this.historial.slice(-10) }));
    } catch { /* sin almacenamiento */ }
  },

  // --- 1. El pronóstico de llamaradas (un solo modelo para todo el juego) ---
  pronostico(cache) {
    if (!this.modeloPronostico && cache.exists('modelo_pronostico')) {
      this.modeloPronostico = new Pronosticador(cache.get('modelo_pronostico'), cache.get('sol_reciente'));
    }
    return this.modeloPronostico;
  },

  // --- 2. La partida ---
  // Cada partida empieza a medir de cero: el BKT estima lo de esta misión. Las anteriores quedan en el historial.
  nuevaPartida(personaje, dificultad) {
    if (this.partida && !this.partida.fin && this.rastreador.pruebas.length) {    // la anterior quedó a medias
      // con los soles que llegó a completar ella (GameState ya es el de la partida nueva)
      this.cerrarPartida('sin terminar', false, 'sin_terminar', this.partida.solesHechos ?? 0);
      this.sincronizar();
    }
    this.rastreador = new Rastreador();
    politica.nuevaPartida();
    this.partida = { id: uuid(), personaje, dificultad, inicio: new Date().toISOString(), fin: null, resultado: null, codigo: 'en_curso' };
    this.guardar();
  },

  // victoria: si completó los 10 soles (para la calificación)
  // codigo: 'victoria' | 'energia' | 'oxigeno' | 'blindaje' | 'sin_terminar' (lo que guarda la API)
  // soles: los soles completos, si no son los de GameState (una partida abandonada que se cierra después)
  cerrarPartida(resultado, victoria = false, codigo = null, soles = null) {
    if (!this.partida) return;
    this.partida.fin = new Date().toISOString();
    this.partida.resultado = resultado;
    this.partida.codigo = codigo ?? (victoria ? 'victoria' : 'sin_terminar');
    const c = this.calificacion(victoria, soles);
    this.partida.calificacion = { medalla: c.medalla, puntaje: c.puntaje, soles: c.soles };
    this.historial.push({ ...this.partida, soles: soles ?? Math.min(GameState.sol, GameState.maxSoles),
      dominio: Object.fromEntries(Object.entries(this.rastreador.dominio).map(([k, v]) => [k, +v.toFixed(2)])),
      pruebas: this.rastreador.pruebas.length });
    this.guardar();
  },

  empezarSol() { this.inicioDelSol = { ...this.rastreador.dominio }; },

  // --- Calificación de misión (se ve al final): medalla y estrellas por tema ---
  // Puntaje de 0 a 100 = 70 % aprendizaje (el dominio medio de los 4 temas que estima el BKT)
  //                    + 30 % misión (cuántos soles aguantó la base).
  // Medalla: oro desde 80, plata desde 60 y bronce por debajo (siempre hay medalla: el fracaso también enseña).
  calificacion(victoria = false, solesHechos = null) {
    const d = this.rastreador.dominio, temas = Object.keys(TEMAS);
    const aprendizaje = temas.reduce((s, t) => s + d[t], 0) / temas.length;
    const soles = victoria ? GameState.maxSoles : (solesHechos ?? this.solesHechos());
    const mision = soles / GameState.maxSoles;
    const puntaje = Math.round(100 * (0.7 * aprendizaje + 0.3 * mision));
    const medalla = puntaje >= 80 ? 'oro' : puntaje >= 60 ? 'plata' : 'bronce';
    return { medalla, puntaje, aprendizaje, mision, soles,
      temas: temas.map(t => ({ tema: t, nombre: TEMAS[t].nombre, nivel: this.rastreador.nivel(t) })) };
  },

  porcentaje(recurso, recursos = GameState.recursos) {
    return recurso === 'energia' ? 100 * recursos.energia / (GameState.energiaMaxima || 100) : recursos[recurso];
  },

  // Registra una prueba y avisa (el panel se actualiza; el robot felicita si sube de nivel)
  observar(tema, correcto, tipo, detalle) {
    const nivelAntes = this.rastreador.nivel(tema);
    const p = this.rastreador.observar(tema, correcto, tipo, { sol: Math.min(GameState.sol, GameState.maxSoles), detalle });
    if (!p) return null;
    politica.observar(tema, correcto, p.sol);         // recompensa a la ayuda que dio la IA antes (aprendizaje por refuerzo)
    const nivel = this.rastreador.nivel(tema);
    bus.emit(EV.APRENDIZAJE, { ...p, nivel, subio: nivel.estrellas > nivelAntes.estrellas, nombre: TEMAS[tema].nombre });
    this.guardar();
    return p;
  },

  // --- 3. Las pruebas que salen del juego ---
  evidenciaMinijuego(clave, exito) {
    const tema = TEMA_DE_MINIJUEGO[clave];
    if (tema) this.observar(tema, exito, 'minijuego', `${clave}: ${exito ? 'ganó' : 'falló'}`);
  },

  // Datos de la situación para las frases: recurso más bajo y más alto, qué tan bajo, personaje y pronóstico
  situacion(recursos = GameState.recursos, entre = RECURSOS) {
    const orden = [...entre].sort((a, b) => this.porcentaje(a, recursos) - this.porcentaje(b, recursos));
    const bajo = orden[0], alto = orden.at(-1);
    return { bajo, alto, claro: this.porcentaje(alto, recursos) - this.porcentaje(bajo, recursos) >= CLARO,
      nivel: nivelDe(this.porcentaje(bajo, recursos)), nombre: NOMBRE_PJ[this.partida?.personaje] ?? '',
      n: this.pronosticoHoy ? Math.round(this.pronosticoHoy.porcentaje / 10) : null };
  },
  // Las líneas de una ayuda en el idioma del juego (o null)
  decirAyuda(momento, movida, datos) { return movida ? frase(momento, movida, datos, idioma.ingles) : null; },

  // Reparto de la consola. recursos: como estaban al abrirla. conPista: si la IA dio una pista antes.
  // Devuelve las líneas que dice la IA después (o null): la política elige el tipo de ayuda según lo medido.
  evidenciaConsola(asig, recursos, conPista = false) {
    const tipo = conPista ? 'consolaConPista' : 'consola';
    const d = this.situacion(recursos);
    const pruebas = [];
    if (d.claro) {
      const sis = SISTEMA_DE_RECURSO[d.bajo];
      const max = Math.max(asig.paneles, asig.soporteVital, asig.escudos);
      const bien = asig[sis] >= 2 && asig[sis] === max;
      this.observar(TEMA_DE_RECURSO[d.bajo], bien, tipo, `consola: ${NOMBRE_RECURSO[d.bajo]} era lo más bajo y ${NOMBRE_SISTEMA[sis]} recibió ${nucleos(asig[sis])}`);
      pruebas.push({ tema: TEMA_DE_RECURSO[d.bajo], bien, llamarada: false });
    }
    if (this.pronosticoHoy?.nivel === 'alto') {
      const bien = asig.escudos >= 2;
      this.observar('escudo', bien, tipo, `consola: pronóstico de llamarada alto y ${nucleos(asig.escudos)} a los escudos`);
      pruebas.push({ tema: 'escudo', bien, llamarada: true });
    }
    const p = pruebas.find(x => !x.bien) ?? pruebas[0];          // primero se explica lo que salió mal
    if (!p) return null;
    const momento = p.bien ? 'consola_bien' : p.llamarada ? 'consola_mal_llamarada' : 'consola_mal';
    return this.decirAyuda(momento, politica.despues(momento, p.tema, this.dominio(p.tema), p.bien), d);
  },

  // Decisión de una emergencia. eleccion: índice de la opción; agotado: si se acabó el tiempo.
  // Devuelve las líneas que dice la IA después de la decisión (o null).
  evidenciaEmergencia(nudo, eleccion, agotado, recursos, conPista = false) {
    const costes = COSTES[nudo];
    if (!costes || eleccion == null) return null;
    const tipo = conPista ? 'emergenciaConPista' : 'emergencia';
    if (agotado) {
      this.observar('decidir', false, tipo, `${nombreEmergencia(nudo)}: se acabó el tiempo`);
      return this.decirAyuda('emergencia_tiempo', 'correccion', {});
    }
    const [a, b] = costes, pa = this.porcentaje(a, recursos), pb = this.porcentaje(b, recursos);
    if (Math.abs(pa - pb) < CLARO) return null;                       // las dos opciones eran parecidas: no hay prueba
    const mejor = pa > pb ? 0 : 1, sobra = pa > pb ? a : b, falta = pa > pb ? b : a;
    const bien = eleccion === mejor;
    this.observar(TEMA_DE_RECURSO[falta], bien, tipo, `${nombreEmergencia(nudo)}: ${bien ? 'cuidó' : 'gastó'} ${NOMBRE_RECURSO[falta]} (lo más bajo)`);
    this.observar('decidir', bien, tipo, `${nombreEmergencia(nudo)}: eligió ${bien ? 'gastar lo que sobraba' : 'gastar lo más bajo'}`);
    const momento = bien ? 'emergencia_bien' : 'emergencia_mal';
    const d = { ...this.situacion(recursos, [falta, sobra]), bajo: falta, alto: sobra };
    return this.decirAyuda(momento, politica.despues(momento, 'decidir', this.dominio('decidir'), bien), d);
  },

  // --- 4. Adaptación: según lo que mide ---
  dominio(tema) { return this.rastreador.dominio[tema]; },

  // Tiempo de un minijuego: más si el tema está flojo, un poco menos si ya lo domina (reto)
  ajusteTiempo(clave) {
    const p = this.dominio(TEMA_DE_MINIJUEGO[clave]);
    return p < 0.4 ? 1.2 : p >= 0.9 ? 0.9 : 1;
  },

  // Antes de la consola: la política decide si ayudar y cómo (pista general, concreta, ejemplo resuelto o reto).
  // Con pronóstico de llamarada fuerte, la ayuda es sobre los Escudos. Devuelve las líneas (o null).
  pistaConsola() {
    const d = this.situacion();
    const llamarada = this.pronosticoHoy?.nivel === 'alto' && (!d.claro || this.dominio('escudo') < this.dominio(TEMA_DE_RECURSO[d.bajo]));
    const tema = llamarada ? 'escudo' : TEMA_DE_RECURSO[d.bajo];
    const momento = llamarada ? 'consola_antes_llamarada' : 'consola_antes';
    const movida = politica.antes(momento, tema, this.dominio(tema), d.claro || llamarada);
    this.ayudaConsola = movida;
    return this.decirAyuda(momento, movida, d);
  },
  // ¿La ayuda cuenta como pista? (un reto no ayuda: el acierto vale como sin pista)
  get conPistaConsola() { return !!this.ayudaConsola && this.ayudaConsola !== 'reto'; },

  // Antes de decidir en una emergencia: una sola línea, va encima de las opciones (o null)
  pistaEmergencia(nudo) {
    const costes = COSTES[nudo];
    if (!costes) return null;
    const d = this.situacion(GameState.recursos, costes);
    const movida = politica.antes('emergencia_antes', 'decidir', this.dominio('decidir'), d.claro);
    this.ayudaEmergencia = movida;
    return this.decirAyuda('emergencia_antes', movida, d)?.join(' ') ?? null;
  },
  get conPistaEmergencia() { return !!this.ayudaEmergencia && this.ayudaEmergencia !== 'reto'; },

  // Al amanecer: una pregunta de repaso de un tema que no se practica desde hace 2 soles (y su respuesta)
  repasoDelDia() {
    const sol = Math.min(GameState.sol, GameState.maxSoles);
    if (sol < 3) return null;
    const tema = politica.repaso(this.rastreador.dominio, sol);
    if (!tema) return null;
    politica.ultimaPrueba[tema] = sol;                  // no preguntar lo mismo mañana
    return frase('repaso', tema, {}, idioma.ingles);
  },

  // Pista del robot al acercarse a una estación: más explicada si el tema está flojo
  pistaEstacion(nombre) {
    const PISTAS = {
      tarea_paneles: ['energia', 'Si la energía baja, aquí la recuperas: paneles limpios, más luz, más batería.'],
      tarea_filtro: ['aire', 'Si el oxígeno baja, este filtro ayuda: quita el CO₂ que respiramos.'],
      tarea_invernadero: ['aire', 'Las plantas sueltan oxígeno. Riega solo cuando el medidor esté en amarillo.'],
      consola: ['decidir', 'Mira las tres barras: el recurso más bajo es el que necesita más núcleos.'],
      refugio: ['escudo', 'El agua de estas paredes frena la radiación: por eso aquí dormimos seguros.'],
    };
    const [tema, frase] = PISTAS[nombre] ?? [];
    return tema && this.dominio(tema) < 0.4 ? frase : null;
  },

  // Lo que la IA cuenta al anochecer: en qué mejoró hoy y qué practicar mañana
  resumenDelSol() {
    const antes = this.inicioDelSol ?? {};
    const r = this.rastreador;
    const subidas = Object.keys(TEMAS).map(t => [t, r.dominio[t] - (antes[t] ?? r.dominio[t])]).sort((x, y) => y[1] - x[1]);
    const flojo = r.masFlojo();
    const en = idioma.ingles, partes = [];
    if (subidas[0][1] > 0.05) partes.push(...frase('resumen_subio', 'x', { tema: subidas[0][0] }, en));
    if (r.dominio[flojo] < 0.7) partes.push(...frase('resumen_flojo', 'x', { tema: flojo }, en));
    else partes.push(...frase('resumen_bien', 'x', {}, en));
    return partes.join(' ');
  },

  // --- 5. Reporte para el adulto ---
  reporte() {
    return { partida: this.partida, soles: Math.min(GameState.sol, GameState.maxSoles), temas: this.rastreador.resumen(),
      pruebas: this.rastreador.pruebas, historial: this.historial };
  },

  // El reporte en texto, en el idioma del juego (las frases están en src/textos/en.js)
  reporteTexto() {
    const r = this.reporte();
    const t = (es, v) => idioma.t(es, v), tr = x => idioma.traducir(x);
    const pct = x => `${Math.round(x * 100)} %`;
    const fecha = r.partida?.inicio ? new Date(r.partida.inicio).toLocaleString(idioma.locale) : '—';
    const pj = r.partida?.personaje ? r.partida.personaje.charAt(0).toUpperCase() + r.partida.personaje.slice(1) : '—';
    const l = [];
    l.push(t('REPORTE DE APRENDIZAJE · Junior Astronaut Mission Trainer (JIIMATZIN)'), '');
    l.push(t('Partida: {f} · Personaje: {p} · Dificultad: {d}', { f: fecha, p: pj, d: r.partida?.dificultad ?? '—' }));
    l.push(t('Soles jugados: {s} de {m} · Resultado: {r}', { s: r.soles, m: GameState.maxSoles, r: r.partida?.resultado ?? 'en curso' }));
    if (r.partida?.calificacion) {
      const c = r.partida.calificacion;
      l.push(t('Calificación de misión: {m} · puntaje {p} de 100 (70 % aprendizaje + 30 % soles que aguantó la base)',
        { m: t(MEDALLAS[c.medalla]), p: c.puntaje }));
    }
    l.push('');
    l.push(t('CÓMO SE MIDE'));
    for (const linea of ['La IA del juego usa Bayesian Knowledge Tracing, un modelo de los tutores digitales. Con cada decisión',
      'estima la probabilidad de que el niño domine cada tema. Las pruebas son los minijuegos, el reparto de',
      'energía en la consola y las decisiones de emergencia (si cuida el recurso más bajo). Es una estimación',
      'del juego para acompañar al niño, no una calificación.']) l.push(t(linea));
    l.push('', t('POR TEMA'));
    for (const tm of r.temas) {
      const tipos = Object.entries(tm.porTipo).filter(([, v]) => v.total).map(([k, v]) => `${t(NOMBRE_TIPO[k])} ${v.aciertos}/${v.total}`).join(', ')
        || t('sin pruebas aún');
      const avance = tm.inicio != null ? ` · ${t('Aciertos: al inicio {a} → al final {b}', { a: pct(tm.inicio), b: pct(tm.final) })}` : '';
      l.push(t('- {tema} ({explica}): dominio estimado {pct} · {nivel} · {tipos}',
        { tema: tm.nombre, explica: tm.explica, pct: pct(tm.dominio), nivel: tm.nivel.texto, tipos }) + avance);
    }
    const flojo = [...r.temas].sort((a, b) => a.dominio - b.dominio)[0];
    l.push('', t('QUÉ PRACTICAR'), t('- {tema}: {explica}. En el juego, la IA ya da más pistas y más tiempo en este tema.', { tema: flojo.nombre, explica: flojo.explica }), '');
    // Qué tipo de ayuda le funciona (aprendizaje por refuerzo de src/ml/politica.js: acierto en la siguiente prueba)
    const ayudas = politica.resumen();
    if (ayudas.length) {
      l.push(t('QUÉ AYUDA LE FUNCIONA (aciertos en la prueba siguiente a cada tipo de ayuda de la IA)'));
      for (const a of ayudas) l.push(t('- {m}: {p} de aciertos en {n} usos', { m: t(a.nombre), p: pct(a.tasa), n: a.usos }));
      l.push('');
    }
    l.push(t('PRUEBAS REGISTRADAS (sol · tema · tipo · resultado · detalle)'));
    for (const p of r.pruebas) {
      l.push(`- sol ${p.sol} · ${tr(TEMAS[p.tema].nombre)} · ${t(NOMBRE_TIPO[p.tipo])} · ${t(p.correcto ? 'acierto' : 'fallo')} · ${tr(p.detalle)} (${pct(p.antes)} → ${pct(p.despues)})`);
    }
    if (r.historial.length) {
      l.push('', t('PARTIDAS ANTERIORES EN ESTE NAVEGADOR'));
      for (const h of r.historial) l.push(`- ${new Date(h.inicio).toLocaleDateString(idioma.locale)} · ${h.personaje} · ${tr(h.resultado)} · sol ${h.soles} · ` +
        Object.entries(h.dominio).map(([k, v]) => `${tr(TEMAS[k].nombre)} ${pct(v)}`).join(', '));
    }
    l.push('', t('Se guarda de forma anónima, sin nombres, para que el equipo estudie cómo se aprende con el juego.'),
      t('Código anónimo de este dispositivo: {c}. Para borrar estos datos, comparte este código con el equipo.', { c: this.jugador }));
    return l.join('\n');
  },

  descargarReporte() {
    const blob = new Blob([this.reporteTexto()], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${idioma.ingles ? 'learning-report' : 'reporte-aprendizaje'}-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },

  niveles: NIVELES,
};
