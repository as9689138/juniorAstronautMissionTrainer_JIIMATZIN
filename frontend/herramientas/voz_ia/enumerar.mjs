// Lista todo lo que dice la IA sin MP3 del rol 5: los avisos que arma el juego (ciclo del sol, IA guía, noticias del
// Sol) en español e inglés, y en inglés también las 86 líneas de la IA de historia.ink.
// Escribe lineas_ia.json: [{ id, idioma, texto (tal cual sale en pantalla), texto_tts (lo que se lee), cara }]
// Uso: node enumerar.mjs <ruta a jiimatzin/frontend>
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const FRONT = path.resolve(process.argv[2]);
globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.document = { documentElement: {} };
const { idioma, normalizar } = await import(pathToFileURL(path.join(FRONT, 'src/motor/idioma.js')).href);

// --- Las mismas tablas que src/compania/guia.js y src/mecanicas/rutas.js ---
const RUTAS = [['Wenceslao', 'Ingeniero'], ['Judith', 'Científica'], ['Atlas', 'Médico']];
const RECURSOS = ['energia', 'oxigeno', 'blindaje'];
const NOMBRE_RECURSO = { energia: 'energía', oxigeno: 'oxígeno', blindaje: 'blindaje' };
const CON_ARTICULO = { energia: 'la energía', oxigeno: 'el oxígeno', blindaje: 'el blindaje' };
const SISTEMA_DE_RECURSO = { energia: 'paneles', oxigeno: 'soporteVital', blindaje: 'escudos' };
const A_SISTEMA = { paneles: 'a los Colectores Solares', soporteVital: 'al Soporte Vital', escudos: 'a los Escudos del Casco' };
const SOBRE_TEMA = ['la energía', 'el aire', 'el escudo contra la radiación', 'decidir con datos'];
const COSTES = [['energia', 'blindaje'], ['oxigeno', 'energia'], ['energia', 'oxigeno'], ['blindaje', 'energia']];
const MAX = 10;

// Cada entrada: [texto en español tal cual lo arma el juego, cara, ¿se divide en frases?]
const es = [];
const add = (texto, cara = 'neutral', frases = true, en = null) => es.push({ texto, cara, frases, en });

// Amanecer (ciclo.textoAmanecer): completo, para que suene de corrido
for (const [n, t] of RUTAS) for (let sol = 1; sol <= MAX; sol++) {
  if (sol === 1) add(`Sol 1 de ${MAX}. Son las 6 de la mañana en la Base Marte Uno. ¡Buenos días, ${t.toLowerCase()} ${n}! El sol está saliendo.`, 'feliz', false);
  else if (sol === MAX) add(`Sol ${sol} de ${MAX}, el último. Son las 6 de la mañana. ¡Buenos días, ${n}! El sol está saliendo.`, 'feliz', false);
  else add(`Sol ${sol} de ${MAX}. Son las 6 de la mañana: ¡buenos días, ${n}! El sol está saliendo.`, 'feliz', false);
}
// Avisos de las estaciones y la antena (ciclo.alInteractuar)
for (const t of ['La energía de hoy ya está repartida. La consola vuelve a abrirse mañana.',
  'Primero reparte la energía en la consola de Mando.', 'Ahora no hay luz solar para trabajar aquí.',
  'Esta tarea ya está hecha hoy. ¡Buen trabajo!',
  'El refugio tiene muros de agua contra la radiación. Aquí dormimos al caer la noche.',
  'La antena habla con la Tierra. Cada mensaje tarda de 3 a 22 minutos en llegar, según dónde estén los dos planetas.']) add(t, 'neutral', false);
// Anochecer (ciclo.noche): gasto de 3 a 30 según sol, dificultad, carta Hamilton y el ahorro de Wenceslao
// (el juego traduce esta parte entera; la voz va por frases)
for (let n = 3; n <= 30; n++) add(`Son las 8 de la noche. Ya es de noche y los paneles solares descansan. Los sistemas gastan ${n} de energía.`, 'neutral', true);
for (let k = 1; k <= 8; k++) add(`Con tus ajustes de ingeniero, Wenceslao, son ${k} menos que sin ellos.`, 'neutral', false);
add('Vamos al Refugio a descansar con el equipo.', 'neutral', false);
// (la IA guía: pistas, porqués, repaso y resumen salen de src/compania/frases.js, más abajo)
// Noticias del Sol (datosReales.lineasSol): lo que no depende de la fecha ni de la clase
add('Noticias del Sol, de la NASA: en los últimos 7 días no se registró ninguna llamarada solar. El Sol ha estado tranquilo.', 'feliz', false);
// (y por frases: si la NASA no respondió, el juego le añade una frase al final)
add('Noticias del Sol, de la NASA: en los últimos 7 días no se registró ninguna llamarada solar. El Sol ha estado tranquilo.', 'feliz', true);
// (solo la primera frase: la segunda trae la clase y la fecha, que cambian cada día y quedan sin voz)
for (let n = 2; n <= 30; n++) add(`Noticias del Sol, de la NASA: en los últimos 7 días se registraron ${n} llamaradas solares.`, 'procesando', false,
  `Sun news from NASA: ${n} solar flares were recorded in the last 7 days.`);
add('Es la última copia guardada: la NASA no respondió.', 'neutral', false);
add('Las llamaradas se nombran con letras: A, B, C, M y X. Cada letra es diez veces más fuerte que la anterior. Esto pasa en el Sol: no es una medición en Marte.', 'neutral', false);

// --- Lo que se lee en voz alta: números en palabras, CO₂ y siglas como se dicen ---
const UNI = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece',
  'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés',
  'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve', 'treinta'];
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen',
  'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'twenty-one', 'twenty-two', 'twenty-three',
  'twenty-four', 'twenty-five', 'twenty-six', 'twenty-seven', 'twenty-eight', 'twenty-nine', 'thirty'];
const leerEs = t => t.replace(/P.I.E.D.R.A/g, 'Piedra').replace(/CO₂/g, 'dióxido de carbono').replace(/\bIA\b/g, 'I A').replace(/\bNASA\b/g, 'NASA')
  .replace(/\b1 llamarada\b/g, 'una llamarada').replace(/\b(\d{1,2})\b/g, (_, n) => UNI[+n] ?? n)
  .replace(/letras: A, B, C, M y X/, 'letras: A, B, C, M y equis');
const leerEn = t => t.replace(/P.I.E.D.R.A/g, 'Piedra').replace(/CO₂/g, 'carbon dioxide').replace(/\bAI\b/g, 'A I').replace(/\b(\d{1,2})\b/g, (_, n) => ONES[+n] ?? n);

// Frases como las corta sonido.js
const frases = t => t.replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/).filter(Boolean);

const salida = [], vistos = new Set();
const meter = (lengua, texto, cara) => {
  const clave = `${lengua}:${normalizar(texto)}`;
  if (vistos.has(clave)) return;
  vistos.add(clave);
  salida.push({ id: `${lengua}_${String(salida.filter(x => x.idioma === lengua).length + 1).padStart(3, '0')}`, idioma: lengua,
    texto, texto_tts: lengua === 'es' ? leerEs(texto) : leerEn(texto), cara });
};
for (const lengua of ['es', 'en']) {
  idioma.actual = lengua;
  idioma.memo.clear();
  for (const e of es) {
    const t = lengua === 'en' && e.en ? e.en : idioma.traducir(e.texto);
    if (lengua === 'en' && t === e.texto) console.warn('sin inglés:', e.texto);
    for (const f of e.frases ? frases(t) : [t]) meter(lengua, f, e.cara);
  }
}

// --- La IA guía: todas las variantes de src/compania/frases.js con cada valor posible, por frases ---
const { todasLasFrases } = await import(pathToFileURL(path.join(FRONT, 'src/compania/frases.js')).href);
for (const lengua of ['es', 'en']) {
  for (const linea of todasLasFrases(lengua === 'en')) for (const f of frases(linea)) meter(lengua, f, 'neutral');
}

// --- Inglés de las líneas de la IA de historia.ink (en español ya tienen MP3 del rol 5) ---
const audios = JSON.parse(readFileSync(path.join(FRONT, 'public/assets/audio/voces/audios.json'), 'utf8'));
const lineasEn = JSON.parse(readFileSync(path.join(FRONT, 'public/assets/audio/voces/lineas_es_en.json'), 'utf8'));
const enDe = new Map((Array.isArray(lineasEn) ? lineasEn : Object.values(lineasEn)).map(x => [x.id, x]));
const CARA = JSON.parse(readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), 'caras_ia.json'), 'utf8'));
let ink = 0;
for (const [id, v] of Object.entries(audios)) {
  if (v.personaje !== 'IA') continue;
  const x = enDe.get(id);
  const texto = x?.texto_en ?? x?.en;
  if (!texto) { console.warn('sin inglés en lineas_es_en.json:', id); continue; }
  const NOMBRES = { '{WEN}': 'Wenceslao', '{JUD}': 'Judith', '{ATL}': 'Atlas', '{IA}': 'AI' };
  const base = texto.replace(/\{(WEN|JUD|ATL|IA)\}/g, m => NOMBRES[m]);
  // {jugador}: en pantalla sale el nombre del personaje elegido
  const variantes = base.includes('{jugador}') ? RUTAS.map(([n]) => base.replaceAll('{jugador}', n)) : [base];
  // Los recuerdos (flashbacks) salen sin "Fun fact:" (src/mecanicas/recuerdos.js, textoDeRecuerdo)
  const sinDato = t => { const x = t.replace(/^\s*(dato curioso|fun fact)\s*:\s*/i, ''); return x.charAt(0).toUpperCase() + x.slice(1); };
  for (const t of variantes) { meter('en', sinDato(t), CARA[id] ?? 'neutral'); ink++; }
}

writeFileSync(new URL('./lineas_ia.json', import.meta.url), JSON.stringify(salida, null, 1));
const cuenta = l => salida.filter(x => x.idioma === l).length;
console.log(`español: ${cuenta('es')} · inglés: ${cuenta('en')} (${ink} de historia.ink)`);
