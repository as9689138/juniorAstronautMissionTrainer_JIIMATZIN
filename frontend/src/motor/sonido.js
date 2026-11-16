// Sonido del juego (entrega del rol 5, docs/entrega_rol5_LEEME.md): música por fase, efectos, ambiente real
// de Marte y voces de los diálogos. Si falta un archivo, sigue sin sonido (nunca detiene el juego).
//
// MEZCLA. Los archivos vienen a niveles muy distintos (la música del rol 5 estaba a −9 LUFS, la Propuesta 3 viene a
// −19/−22 y las voces a −16), así que con un volumen fijo la música tapaba los diálogos o se perdía. Aquí cada archivo se lleva a un nivel objetivo según su sonoridad
// medida (ffmpeg ebur128, LUFS integrados):
//   voces −16 · efectos −20 · sonidos reales de Marte −22 · música de fondo −42 (−50 con un diálogo abierto)
//   · viento de fondo −33 (−40 con un diálogo abierto)
// Con un diálogo abierto la música se queda abajo todo el rato (no sube y baja entre líneas). Para cambiar la mezcla,
// basta con tocar MEZCLA.

import { cargas } from './cargas.js';
import { idioma, normalizar } from './idioma.js';

// (la música bajó tres veces tras escucharla el equipo: con −27, −31 y −36 aún se oía fuerte)
export const MEZCLA = { musica: -42, musicaDialogo: -50, efectos: -20, marte: -22, ambiente: -33, ambienteDialogo: -40 };
const LUFS = {
  musica_dia: -19.0, musica_emergencia: -18.9, musica_exito: -18.0, musica_fracaso: -19.9, musica_noche: -22.0,   // Propuesta 3
  mj_filtro_clic: -18.2, mj_gotas_riego: -15.4, mj_paneles_raspando: -10.4, sfx_alarma: -10.2, sfx_apagon: -11.7,
  sfx_celebracion: -7.7, sfx_puerta_presurizada: -12.2, sfx_viento_marte: -20.8, ui_aviso_emergencia: -11.6,
  ui_carta_mejora: -10.4, ui_carta_voltea: -11.3, ui_tictac: -20.1, ui_clic_boton: -16,   // el clic es tan corto que no se mide: −16
  sfx_primer_audio_marte: -22.2, sfx_remolino_corto: -18.9, sfx_remolino_polvo: -20.7, sfx_viento_marte_real_loop: -23.3,
};
const MARTE_REAL = new Set(['sfx_primer_audio_marte', 'sfx_remolino_corto', 'sfx_remolino_polvo']);
// Ganancia (0-1) para que el archivo suene al nivel objetivo
const ganancia = (clave, objetivo) => Math.min(1, 10 ** ((objetivo - (LUFS[clave] ?? objetivo)) / 20));
// Voz del navegador por personaje (solo para líneas sin MP3): tono, ritmo y, si se puede elegir, de mujer o de hombre
const VOZ_NAVEGADOR = {
  ia: { tono: 1.3, ritmo: 1.05 },
  wen: { tono: 0.95, ritmo: 1.08, genero: 'm' },
  jud: { tono: 1.15, ritmo: 1.04, genero: 'f' },
  atl: { tono: 0.85, ritmo: 0.95, genero: 'm' },
  narracion: { tono: 1, ritmo: 0.95 },
};

// Etiquetas de historia.ink -> clave de audio
const MUSICA = { inicio: 'musica_dia', dia: 'musica_dia', emergencia: 'musica_emergencia', noche: 'musica_noche',
  exito: 'musica_exito', fracaso: 'musica_fracaso' };
const SFX = { alarma: 'sfx_alarma', apagon: 'sfx_apagon', celebracion: 'sfx_celebracion', viento_marte: 'sfx_viento_marte_real_loop',
  remolino: 'sfx_remolino_corto', primer_audio: 'sfx_primer_audio_marte' };

export const sonido = {
  juego: null,
  musicaClave: null,
  musicaObj: null,
  ambienteObj: null,
  vozObj: null,
  silencio: false,

  enCine: false,          // mientras se ve un video (src/motor/cine.js) el sonido del juego calla, sin tocar `silencio`

  iniciar(juego) {
    this.juego = juego;
    // 'silencio.v2': antes la tecla M abría el álbum Y silenciaba, y ese silencio sin querer quedaba guardado
    try { this.silencio = localStorage.getItem('silencio.v2') === '1'; } catch { /* sin almacenamiento */ }
    this.aplicarSilencio();
  },

  // El volumen general del juego: callado si el jugador lo pidió (M o el botón) o si hay un video encima
  aplicarSilencio() { if (this.juego) this.juego.sound.mute = this.silencio || this.enCine; },

  alternarSilencio() {
    this.silencio = !this.silencio;
    this.aplicarSilencio();
    if (this.silencio) this.callar();
    try { localStorage.setItem('silencio.v2', this.silencio ? '1' : '0'); } catch { /* sin almacenamiento */ }
    this.alCambiarSilencio?.(this.silencio);
    return this.silencio;
  },

  existe(clave) { return !!this.juego?.cache.audio.exists(clave); },

  // Cambia la música con un fundido corto. nombre: etiqueta de Ink (dia, noche, emergencia, exito, fracaso, inicio)
  musica(nombre) {
    const clave = MUSICA[nombre] ?? nombre;
    if (!this.juego || clave === this.musicaClave) return;
    this.musicaPedida = clave;
    if (!this.existe(clave)) {                       // se baja al pedirla; si mientras tanto se pidió otra, no suena
      cargas.asegurar(`musica:${clave}`).then(() => { if (this.musicaPedida === clave) this.musica(clave); });
      return;
    }
    const sm = this.juego.sound;
    const vieja = this.musicaObj, claveVieja = this.musicaClave;
    if (vieja) {
      this.fundir(vieja, 0, 700, () => {
        vieja.destroy();
        // un tema decodificado ocupa decenas de MB: se libera, salvo el del día, que suena cada sol
        if (claveVieja && claveVieja !== 'musica_dia' && claveVieja !== this.musicaClave) cargas.liberar(`musica:${claveVieja}`);
      });
    }
    const bucle = clave !== 'musica_exito' && clave !== 'musica_fracaso';
    this.musicaObj = sm.add(clave, { loop: bucle, volume: 0 });
    this.musicaObj.play();
    this.musicaClave = clave;
    this.fundir(this.musicaObj, this.nivelMusica(), 900);
  },

  // --- Niveles de fondo: más bajos mientras hay un diálogo abierto o alguien habla ---
  enDialogo: false,
  get hablando() { return this.enDialogo || !!this.vozObj?.isPlaying || this.hablandoNavegador; },
  nivelMusica() { return this.musicaClave ? ganancia(this.musicaClave, this.hablando ? MEZCLA.musicaDialogo : MEZCLA.musica) : 0; },
  nivelAmbiente() { return ganancia('sfx_viento_marte_real_loop', this.hablando ? MEZCLA.ambienteDialogo : MEZCLA.ambiente); },

  // Música y viento a su nivel. Bajar es rápido; subir espera un poco (si enseguida vuelve a hablar alguien, no sube)
  ajustarFondo() {
    clearTimeout(this.subida);
    const aplicar = ms => {
      if (this.musicaObj) this.fundir(this.musicaObj, this.nivelMusica(), ms);
      if (this.ambienteObj) this.fundir(this.ambienteObj, this.nivelAmbiente(), ms);
    };
    if (this.hablando) aplicar(250);
    else this.subida = setTimeout(() => { if (!this.hablando) aplicar(900); }, 700);
  },

  // Lo avisa la escena Dialogo al abrirse y al cerrarse
  dialogo(abierto) {
    this.enDialogo = abierto;
    this.ajustarFondo();
  },

  // Efecto suelto. clave: archivo (ui_clic_boton...) o etiqueta de Ink (alarma, apagon...)
  // `volumen` es el peso relativo que pide quien lo toca (0.7 = normal); el nivel lo pone la mezcla
  efecto(clave, volumen = 0.7) {
    const k = SFX[clave] ?? clave;
    if (!this.existe(k)) return null;
    const objetivo = MARTE_REAL.has(k) ? MEZCLA.marte : MEZCLA.efectos;
    return this.juego.sound.play(k, { volume: Math.min(1, ganancia(k, objetivo) * volumen / 0.7) }) || null;
  },

  // Viento real de Marte (Perseverance) de fondo en el mapa
  ambiente(encendido) {
    if (!this.existe('sfx_viento_marte_real_loop')) return;
    if (encendido && !this.ambienteObj) {
      this.ambienteObj = this.juego.sound.add('sfx_viento_marte_real_loop', { loop: true, volume: 0 });
      this.ambienteObj.play();
      this.fundir(this.ambienteObj, this.nivelAmbiente(), 1500);
    } else if (!encendido && this.ambienteObj) {
      const a = this.ambienteObj;
      this.ambienteObj = null;
      this.fundir(a, 0, 600, () => a.destroy());
    }
  },

  // Dice una línea. linea: { id, ruta, desde, texto, quien }
  //  - con MP3 (id y ruta de audios.json): lo carga la primera vez y lo toca desde `desde` segundos;
  //  - sin MP3: la IA, con su propia voz (decirIA); la narración y los demás en inglés, con la voz del navegador
  //    (el último respaldo de la entrega del rol 5).
  // Solo suena la línea actual: si se pasó a otra mientras cargaba, no suena tarde. Devuelve una promesa.
  decir(linea = {}) {
    this.callar();
    const turno = ++this.turnoVoz;
    const { id, ruta, desde = 0, texto, quien } = linea;
    if (!this.juego) return Promise.resolve();
    // P.I.E.D.R.A dice también toda la narración (prólogo, cartas, introducción): con su voz, sin el bip-bup
    if (!id || !ruta) {
      if (quien === 'ia') return this.decirIA(texto, turno);
      if (!quien || quien === 'narracion') return this.decirIA(texto, turno, false);
      return this.hablarNavegador(texto, quien, turno);
    }
    return this.tocarVoz(id, ruta, desde, turno,
      () => (quien === 'ia' ? this.decirIA(texto, turno) : this.hablarNavegador(texto, quien, turno)));
  },

  // Carga un MP3 de voz la primera vez y lo toca desde `desde` segundos. Si no carga, llama a alFallar().
  tocarVoz(id, ruta, desde, turno, alFallar = () => undefined) {
    // El cargador de la escena Cargador no se apaga nunca (el de Dialogo se corta al cerrar el diálogo)
    const escena = cargas.escena ?? this.juego.scene.getScenes(true).at(-1);
    return new Promise(resolver => {
      const sonar = () => {
        if (turno !== this.turnoVoz) { resolver(); return; }           // ya se pasó a otra línea
        if (!this.existe(id)) { resolver(alFallar()); return; }
        const v = this.juego.sound.add(id, { volume: 1 });
        this.vozObj = v;
        this.ajustarFondo();
        v.once('complete', () => { this.alCallar(v); resolver(); });
        v.once('stop', () => { this.alCallar(v); resolver(); });
        v.play({ seek: desde });
      };
      if (this.existe(id)) { sonar(); return; }
      const alError = f => {
        if (f.key !== id) return;
        escena.load.off('loaderror', alError);
        console.warn('[voz] no se pudo cargar', id);
        resolver(turno === this.turnoVoz ? alFallar() : undefined);
      };
      escena.load.on('loaderror', alError);
      escena.load.once(`filecomplete-audio-${id}`, () => { escena.load.off('loaderror', alError); sonar(); });
      escena.load.audio(id, ruta);
      cargas.arrancar(escena.load);
    });
  },

  // La IA siempre con su voz (la del rol 5, Chatterbox con IA.wav), nunca con la del navegador.
  // Busca el texto en assets/audio/voces/ia/indice.json: la línea entera y, si no está, frase por frase (los avisos
  // del juego se arman con piezas). Lo que no tiene audio (fechas y clases de las llamaradas, medidas del día) se lee
  // en pantalla sin voz. Antes de hablar hace bip-bup, como el robot.
  decirIA(texto, turno = this.turnoVoz, bip = true) {
    const indice = this.juego.cache.json.get('voces_ia')?.[idioma.actual] ?? {};
    const ruta = archivo => `assets/audio/voces/ia/${idioma.actual}/${archivo}`;
    const limpio = (texto ?? '').replace(/\s+/g, ' ').trim();
    let partes = indice[normalizar(limpio)] ? [indice[normalizar(limpio)]] : null;
    if (!partes) partes = limpio.split(/(?<=[.!?])\s+/).map(f => indice[normalizar(f)]).filter(Boolean);
    const sinVoz = !partes.length;
    if (sinVoz && limpio) console.debug('[voz IA] sin audio:', limpio);
    if (this.silencio || turno !== this.turnoVoz) return Promise.resolve();
    if (bip) this.pitido(2 + Math.floor(Math.random() * 2));
    if (sinVoz) return Promise.resolve();
    return new Promise(r => setTimeout(r, bip ? 260 : 0)).then(async () => {
      for (const archivo of partes) {
        if (turno !== this.turnoVoz) return;
        await this.tocarVoz(`vozia_${idioma.actual}_${archivo.replace(/\.mp3$/, '')}`, ruta(archivo), 0, turno);
      }
    });
  },

  callar() {
    this.turnoVoz++;
    if (this.vozObj) { const v = this.vozObj; this.vozObj = null; v.stop(); }
    if (this.hablandoNavegador) {
      this.hablandoNavegador = false;
      try { window.speechSynthesis?.cancel(); } catch { /* sin voz del navegador */ }
      this.ajustarFondo();
    }
  },

  // --- Voz del navegador (Web Speech API): para las líneas que no tienen MP3 ---
  turnoVoz: 0,
  hablandoNavegador: false,

  // Voces del sistema en el idioma del juego (es o en)
  vocesNavegador() {
    const s = window.speechSynthesis;
    if (!s) return [];
    const lengua = idioma.ingles ? /^en/i : /^es/i;
    return s.getVoices().filter(v => lengua.test(v.lang));
  },

  // Una voz en español (de México si hay) y, si el sistema tiene varias, de mujer o de hombre según el personaje
  vozPara(genero) {
    const voces = this.vocesNavegador();
    if (!voces.length) return null;
    const region = idioma.ingles
      ? l => (/en[-_]US/i.test(l) ? 0 : /en[-_]GB/i.test(l) ? 1 : 2)
      : l => (/es[-_]MX/i.test(l) ? 0 : /es[-_](US|419)/i.test(l) ? 1 : /es[-_]ES/i.test(l) ? 3 : 2);
    const MUJER = /sabina|helena|laura|dalia|paulina|elvira|monica|mónica|lupe|marisol|ximena|ana|zira|aria|jenny|samantha|susan|hazel|female|mujer/i;
    const HOMBRE = /raul|raúl|pablo|jorge|alvaro|álvaro|enrique|diego|carlos|david|mark|guy|daniel|george|male|hombre/i;
    const orden = [...voces].sort((a, b) => region(a.lang) - region(b.lang) || (b.localService ? 1 : 0) - (a.localService ? 1 : 0));
    if (genero === 'f') return orden.find(v => MUJER.test(v.name)) ?? orden[0];
    if (genero === 'm') return orden.find(v => HOMBRE.test(v.name)) ?? orden[0];
    return orden[0];
  },

  hablarNavegador(texto, quien, turno = this.turnoVoz) {
    const s = window.speechSynthesis;
    if (!texto || !s || this.silencio || turno !== this.turnoVoz) return Promise.resolve();
    const tipo = VOZ_NAVEGADOR[quien] ?? VOZ_NAVEGADOR.narracion;
    const voz = this.vozPara(tipo.genero);
    // Sin emojis ni signos que se leen raro; frase por frase (en algunos navegadores una frase larga se corta)
    const limpio = texto.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').replace(/CO₂/g, 'CO2').replace(/…\s*/g, ', ')
      .replace(/\s+/g, ' ').trim();
    const frases = limpio.split(/(?<=[.!?])\s+/).filter(Boolean);
    return new Promise(resolver => {
      const empezar = () => {
        if (turno !== this.turnoVoz) { resolver(); return; }
        try { s.cancel(); } catch { /* nada */ }
        this.hablandoNavegador = true;
        this.ajustarFondo();
        frases.forEach((f, i) => {
          const u = new SpeechSynthesisUtterance(f);
          u.lang = voz?.lang ?? (idioma.ingles ? 'en-US' : 'es-MX');
          if (voz) u.voice = voz;
          u.pitch = tipo.tono; u.rate = tipo.ritmo; u.volume = 1;
          if (i === frases.length - 1) {
            const fin = () => {
              if (turno === this.turnoVoz && this.hablandoNavegador) {
                this.hablandoNavegador = false;
                this.ajustarFondo();
              }
              resolver();
            };
            u.onend = fin; u.onerror = fin;
          }
          s.speak(u);
        });
      };
      if (quien === 'ia') { this.pitido(2 + Math.floor(Math.random() * 2)); setTimeout(empezar, 260); }
      else empezar();
    });
  },

  // Bip-bup del robot: unos tonos cortos (respeta el silencio porque van por el volumen general del juego)
  pitido(n = 2, volumen = 0.05) {
    const sm = this.juego?.sound, ctx = sm?.context;
    if (!ctx || this.silencio || ctx.state !== 'running') return;
    const salida = sm.masterMuteNode ?? ctx.destination;
    let t = ctx.currentTime + 0.01;
    for (let i = 0; i < n; i++) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square';
      const f = 700 + Math.random() * 900;
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * (Math.random() < 0.5 ? 1.5 : 0.7), t + 0.07);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(volumen, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      o.connect(g).connect(salida);
      o.start(t); o.stop(t + 0.09);
      t += 0.1;
    }
  },

  // Campanita de la IA al dictar la hora: sube al amanecer y de día, baja al anochecer (la emergencia ya trae su alarma)
  campana(fase) {
    const NOTAS = { manana: [523.25, 783.99], dia: [659.25, 880], noche: [783.99, 523.25] }[fase];
    const sm = this.juego?.sound, ctx = sm?.context;
    if (!NOTAS || !ctx || this.silencio || ctx.state !== 'running') return;
    const salida = sm.masterMuteNode ?? ctx.destination;
    NOTAS.forEach((f, i) => {
      const t = ctx.currentTime + 0.02 + i * 0.22;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      o.connect(g).connect(salida);
      o.start(t); o.stop(t + 0.95);
    });
  },

  // Rebobinado al entrar o salir de un recuerdo (flashback): un barrido que sube o baja
  rebobinar(entrando = true) {
    const sm = this.juego?.sound, ctx = sm?.context;
    if (!ctx || this.silencio || ctx.state !== 'running') return;
    const salida = sm.masterMuteNode ?? ctx.destination;
    const t = ctx.currentTime + 0.01, dur = 0.55;
    const o = ctx.createOscillator(), g = ctx.createGain(), filtro = ctx.createBiquadFilter();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(entrando ? 1400 : 220, t);
    o.frequency.exponentialRampToValueAtTime(entrando ? 160 : 1100, t + dur);
    filtro.type = 'lowpass'; filtro.frequency.value = 1800;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.045, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(filtro).connect(g).connect(salida);
    o.start(t); o.stop(t + dur + 0.02);
  },

  // Al terminar una línea, su voz se libera (cada voz decodificada ocupa 1 o 2 MB y casi nunca se repite)
  alCallar(v) {
    if (this.vozObj === v) this.vozObj = null;
    this.ajustarFondo();
    const clave = v.key;
    setTimeout(() => { v.destroy(); this.juego.cache.audio.remove(clave); }, 0);
  },

  // Fundido de volumen sin depender de una escena concreta. Un fundido nuevo cancela el anterior del mismo sonido
  // (antes dos fundidos se peleaban y la música podía quedarse alta en pleno diálogo).
  fundir(snd, destino, ms, alTerminar) {
    const inicio = snd.volume, t0 = performance.now();
    const turno = snd.turnoFundido = (snd.turnoFundido ?? 0) + 1;
    const paso = () => {
      if (!snd || snd.pendingRemove || snd.turnoFundido !== turno) return;
      const k = Math.min(1, (performance.now() - t0) / ms);
      try { snd.setVolume(inicio + (destino - inicio) * k); } catch { return; }
      if (k < 1) requestAnimationFrame(paso); else alTerminar?.();
    };
    requestAnimationFrame(paso);
  },
};
