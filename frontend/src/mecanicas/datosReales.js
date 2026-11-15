// Datos reales del escenario (repositorio del equipo: API de contenido, contrato 2). Usa el adaptador del equipo
// (src/api, copiado sin cambios de frontend/src/api) y nunca llama a fetch directamente.
//  - Clima de cada sol: mediciones históricas de Marte (REMS, Curiosity) del escenario, por sol del juego.
//  - Fichas «Dato real»: las aprobadas del escenario para un sol y una fase, con su contexto de fuente.
//  - Datos de la historia (# dato:<id> de Ink): solo se muestran si el catálogo los vincula a una ficha aprobada;
//    sin vínculo quedan pendientes y no se presentan como verificados (docs/12-contenido-juego.md del repo).
//  - Noticias del Sol: llamaradas reales de los últimos días (DONKI en vivo, GET /api/v1/live/donki/flares). Es un
//    catálogo de eventos del Sol casi en tiempo real: no es una medición en Marte ni dispara reglas del juego
//    (docs/04-api.md del repo), así que solo se cuenta, sin etiquetas de peligro.
// Si la API no responde y no hay respaldo en /escenarios/<id>.json, el juego sigue con su contenido propio.
import { idioma } from '../motor/idioma.js';
import { cargarEscenario, obtenerFicha, apiGet, ErrorApi } from '../api/index.js';

export const ESCENARIO_ID = 'base-marte-uno';     // el id con el que el equipo prepara la misión de 10 soles

// Contexto de la fuente de una ficha, dicho para niños
const CONTEXTO = {
  mars_historical_observation: 'Medición real en Marte (datos históricos)',
  other_mission_educational: 'Dato de otra misión real',
  iss_reference: 'Dato de la Estación Espacial Internacional',
  solar_reference: 'Dato real del clima espacial',
};
const FASE = { manana: 'morning', dia: 'day', emergencia: 'emergency', noche: 'night' };

const media = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const aCelsius = (v, unidad) => (unidad === 'K' ? v - 273.15 : v);

export const datosReales = {
  escenario: null,
  origen: null,          // 'api' | 'respaldo-local'
  error: null,
  promesa: null,

  // Se pide una vez al empezar; no detiene el juego (tiempo máximo del adaptador: 8 s)
  cargar() {
    this.promesa ??= this.publicado()
      .then(publicado => {
        if (publicado === false) throw new ErrorApi('la misión aún no está publicada en la API', { codigo: 'sin_publicar' });
        return cargarEscenario(ESCENARIO_ID);
      })
      .then(({ escenario, origen }) => {
        this.escenario = escenario;
        this.origen = origen;
        console.info(`[datos reales] escenario "${escenario.title}" v${escenario.scenarioVersion} (${origen})`);
        return escenario;
      })
      .catch(e => {
        this.error = e;
        const motivo = e instanceof ErrorApi ? `${e.codigo}${e.estado ? ` ${e.estado}` : ''}` : e.message;
        console.info(`[datos reales] sin escenario (${motivo}): el juego usa su contenido propio`);
        return null;
      });
    return this.promesa;
  },

  // ¿La API ya publicó la misión? Se pregunta primero a la lista (GET /scenarios), para no pedir una misión que
  // todavía no existe (el equipo la publica con el paquete científico revisado, docs/12-contenido-juego.md).
  // true / false; null si la API no responde (entonces se prueba igual, por si hay respaldo local).
  async publicado() {
    try {
      const lista = await apiGet('/scenarios');
      const items = Array.isArray(lista) ? lista : lista?.escenarios ?? [];
      return items.some(e => (e.scenarioId ?? e.id) === ESCENARIO_ID);
    } catch {
      return null;
    }
  },

  hay() { return !!this.escenario; },

  // --- Noticias del Sol (DONKI en vivo) ---
  sol: null,
  promesaSol: null,

  cargarSol(dias = 7) {
    this.promesaSol ??= apiGet('/live/donki/flares', { days: dias })
      .then(r => {
        if (r?.data_mode !== 'near_real_time' || r.is_mars_surface_measurement !== false || !Array.isArray(r.events)) {
          throw new ErrorApi('La respuesta de DONKI no tiene el formato del contrato', { codigo: 'respuesta_invalida' });
        }
        this.sol = r;
        console.info(`[datos reales] DONKI: ${r.count} llamaradas del ${r.period_requested.startDate} al ${r.period_requested.endDate}`);
        return r;
      })
      .catch(e => {
        console.info(`[datos reales] sin noticias del Sol (${e.codigo ?? e.message})`);
        this.promesaSol = null;                         // se reintenta la próxima vez
        return null;
      });
    return this.promesaSol;
  },

  // Líneas para la IA: cuántas llamaradas hubo, la más fuerte y qué significan las letras
  lineasSol() {
    const r = this.sol;
    if (!r) return null;
    const ini = new Date(`${r.period_requested.startDate}T00:00:00Z`), fin = new Date(`${r.period_requested.endDate}T00:00:00Z`);
    const dias = Math.round((fin - ini) / 86400000) + 1;
    const fecha = iso => new Date(iso).toLocaleDateString(idioma.locale, { day: 'numeric', month: 'long', timeZone: 'UTC' });
    const fuerza = c => 'ABCMX'.indexOf(c[0]) * 100 + (parseFloat(c.slice(1)) || 0);
    const ev = r.events.map(e => e.data).filter(d => typeof d.class_type === 'string' && 'ABCMX'.includes(d.class_type[0]));
    const t = (es, v) => idioma.t(es, v);
    const guardada = r.freshness?.stale ? ` ${t('Es la última copia guardada: la NASA no respondió.')}` : '';
    const lineas = [];
    if (!ev.length) {
      lineas.push({ quien: 'ia', cara: 'feliz', traducido: true,
        texto: t('Noticias del Sol, de la NASA: en los últimos {d} días no se registró ninguna llamarada solar. El Sol ha estado tranquilo.', { d: dias }) + guardada });
    } else {
      const max = ev.reduce((a, b) => (fuerza(b.class_type) > fuerza(a.class_type) ? b : a));
      const datos = { d: dias, n: ev.length, c: max.class_type, f: fecha(max.peak_time ?? max.begin_time) };
      const texto = ev.length === 1
        ? t('Noticias del Sol, de la NASA: en los últimos {d} días se registró 1 llamarada solar, de clase {c}, el {f}.', datos)
        : t('Noticias del Sol, de la NASA: en los últimos {d} días se registraron {n} llamaradas solares. La más fuerte fue de clase {c}, el {f}.', datos);
      lineas.push({ quien: 'ia', cara: 'procesando', traducido: true, texto: texto + guardada });
    }
    lineas.push({ quien: 'ia', traducido: true, texto: t('Las llamaradas se nombran con letras: A, B, C, M y X. Cada letra es diez veces más fuerte que la anterior. Esto pasa en el Sol: no es una medición en Marte.') });
    return lineas;
  },

  // Clima real del sol del juego: temperatura media, mínima y máxima (°C) y presión media (Pa), con su sol marciano
  climaDelSol(sol) {
    const conds = (this.escenario?.conditions ?? []).filter(c => c.role === 'environment' && c.gameSol === sol);
    if (!conds.length) return null;
    const temps = [], mins = [], maxs = [], pres = [];
    let solMarte = null, dataset = null;
    for (const c of conds) {
      solMarte ??= c.data?.source_sol ?? null;
      dataset ??= c.dataset;
      if (c.kind === 'observation' && typeof c.value === 'number') {
        if (/temperature/.test(c.variable)) temps.push(aCelsius(c.value, c.unit));
        else if (/pressure/.test(c.variable) && c.unit === 'Pa') pres.push(c.value);
      } else if (c.kind === 'environment_hour') {
        const t = c.data.temperature, p = c.data.pressure;
        if (t?.count > 0) { temps.push(aCelsius(t.sample_mean, t.unit)); mins.push(aCelsius(t.min, t.unit)); maxs.push(aCelsius(t.max, t.unit)); }
        if (p?.count > 0 && p.unit === 'Pa') pres.push(p.sample_mean);
      }
    }
    if (!temps.length && !pres.length) return null;
    return {
      temperatura: temps.length ? Math.round(media(temps)) : null,
      minima: mins.length ? Math.round(Math.min(...mins)) : (temps.length ? Math.round(Math.min(...temps)) : null),
      maxima: maxs.length ? Math.round(Math.max(...maxs)) : (temps.length ? Math.round(Math.max(...temps)) : null),
      presion: pres.length ? Math.round(media(pres)) : null,
      solMarte,
      quien: /rems|msl|curiosity/i.test(dataset ?? '') ? 'el róver Curiosity' : 'un instrumento en Marte',
    };
  },

  // Texto corto para la interfaz: "Marte real: −66 °C · 735 Pa"
  resumenClima(sol) {
    const c = this.climaDelSol(sol);
    if (!c) return null;
    const partes = [];
    if (c.temperatura !== null) partes.push(`${c.temperatura} °C`.replace('-', '−'));
    if (c.presion !== null) partes.push(`${c.presion} Pa`);
    return `Marte real: ${partes.join(' · ')}`;
  },

  // Línea para la IA por la mañana (modo histórico: se dice que es una medición pasada y de dónde viene)
  lineaClima(sol) {
    const c = this.climaDelSol(sol);
    if (!c) return null;
    const cuando = c.solMarte !== null ? ` en el sol ${c.solMarte} de su misión` : '';
    const signo = n => `${n}`.replace('-', '−');
    const t = c.temperatura !== null
      ? `${c.quien} midió ${signo(c.temperatura)} grados de temperatura media${cuando}` +
        (c.minima !== null && c.maxima !== null && c.minima !== c.maxima ? ` (entre ${signo(c.minima)} y ${signo(c.maxima)})` : '')
      : `${c.quien} midió el aire de Marte${cuando}`;
    const pct = c.presion !== null ? c.presion / 101325 * 100 : null;          // frente a la presión al nivel del mar
    const p = pct !== null ? `. La presión del aire era de ${c.presion} pascales: ${pct < 1 ? 'menos del 1 %' : `el ${pct.toFixed(0)} %`} de la que respiramos en la Tierra` : '';
    return `Dato real de hoy: ${t}${p}. Es una medición guardada, no en vivo.`;
  },

  // Fichas aprobadas que el escenario coloca en este sol y fase ('manana' | 'dia' | 'emergencia' | 'noche')
  fichasDe(sol, fase) {
    const f = FASE[fase] ?? fase;
    return (this.escenario?.facts ?? []).filter(x => x.appearsAt.gameSol === sol && x.appearsAt.gamePhase === f);
  },

  // Dato de la historia (# dato:apolo13) -> ficha aprobada vinculada, o null si está pendiente de revisión
  fichaDeDato(idNarrativo) {
    const b = this.escenario?.gameplay?.factBindings?.find(v => v.narrativeId === idNarrativo);
    return b ? this.escenario.facts.find(f => f.id === b.factId && f.recordId === b.recordId) ?? null : null;
  },

  // Líneas para el diálogo de una ficha: título y explicación adaptada, y de dónde sale
  lineasFicha(f) {
    const texto = f.gameAdaptation?.trim() || f.explanation;
    const lineas = [{ quien: 'ia', cara: 'feliz', texto: `Dato real · ${f.title}. ${texto}` }];
    lineas.push({ quien: 'ia', texto: `Fuente: ${CONTEXTO[f.sourceContext] ?? 'ficha revisada por el equipo'}.` +
      (f.limitations?.length ? ` Ojo: ${f.limitations[0]}` : '') });
    return lineas;
  },

  // Detalle con evidencias y referencias (misma revisión). Para quien quiera mostrar la fuente completa.
  detalle(f) {
    return obtenerFicha(f.id, this.escenario?.language ?? 'es', { recordId: f.recordId });
  },
};
