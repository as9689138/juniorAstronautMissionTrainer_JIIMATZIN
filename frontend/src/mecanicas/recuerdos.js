// Recuerdos de la IA: los flashbacks de la historia.
// En el guion v4 los hechos reales no son "datos curiosos": son ARCHIVOS DE MEMORIA del robotcito de la base,
// que guarda los recuerdos de las grandes aventuras espaciales. Cuando la historia llega a uno, el diálogo
// se vuelve un flashback (src/escenas/Dialogo.js) con su ilustración (assets/recuerdos/<id>.png,
// herramientas/pintar_recuerdos.py) y el recuerdo queda abierto en el álbum (src/compania/Album.js).
//
// El id es el mismo que la etiqueta dato:<id> de historia.ink. Los hechos son los verificados en la guía de la
// historia (historia/paquete_historia.md, sección 7); aquí no se añade ninguno nuevo.

export const RECUERDOS = [
  // 1 a 8: los del guion y del prototipo de minijuegos (mismos números que sus "Archivo de memoria #0N")
  { id: 'viento_limpia', año: '2005', lugar: 'Marte', titulo: 'Mis primos Spirit y Opportunity',
    dato: 'A veces el viento de Marte les limpiaba el polvo de los paneles solares.', pista: 'Limpia los paneles solares' },
  { id: 'apolo13', año: '1970', lugar: 'Apolo 13', titulo: 'El rompecabezas del Apolo 13',
    dato: 'El filtro era cuadrado y el hueco redondo. Lo unieron con bolsas, cartón, manguera y cinta.', pista: 'Cambia el filtro de CO₂' },
  { id: 'veggie_zinnias', año: '2016', lugar: 'Estación Espacial', titulo: 'Las flores de la Estación Espacial',
    dato: 'Unas zinnias se llenaron de moho por la humedad. Las salvaron y florecieron en enero.', pista: 'Riega el invernadero' },
  { id: 'skylab', año: '1973', lugar: 'Skylab', titulo: 'La sombrilla del Skylab',
    dato: 'El Skylab perdió su escudo contra el calor. Un parasol bajó la temperatura.', pista: 'Aparece en una emergencia' },
  { id: 'iss_fuga_2013', año: '2013', lugar: 'Estación Espacial', titulo: 'Copos blancos en la Estación Espacial',
    dato: 'Salían copitos blancos: era el líquido que la enfría. Salieron 5 horas a arreglarlo.', pista: 'Aparece en una emergencia' },
  { id: 'mir_1997', año: '1997', lugar: 'Estación Mir', titulo: 'El choque en la estación Mir',
    dato: 'Una nave de carga chocó con la Mir. Desconectaron cables para cerrar la puerta.', pista: 'Aparece en una emergencia' },
  { id: 'tormentas_polvo', año: '2018', lugar: 'Marte', titulo: 'La última señal de Opportunity',
    dato: 'Opportunity envió su última señal el 10 de junio, en una tormenta de polvo global.', pista: 'Noche del sol 6' },
  { id: 'tormenta_1972', año: '1972', lugar: 'Entre la Tierra y la Luna', titulo: 'La gran tormenta solar de 1972',
    dato: 'Pasó entre dos viajes a la Luna. Por suerte, ese día no había astronautas en el espacio.', pista: 'Aparece en una emergencia' },
  // 9 a 16: los demás recuerdos que cuenta la historia
  { id: 'sol_marciano', año: null, lugar: 'Misiones a Marte', titulo: 'Viviendo con la hora de Marte',
    dato: 'Un sol dura 24 h 39 min. Los equipos de las misiones reales llegaron a vivir con horario marciano.', pista: 'Noche del sol 1' },
  { id: 'radiacion_curiosity', año: '2012', lugar: 'Marte', titulo: 'El medidor de Curiosity',
    dato: 'Marte no tiene campo magnético global. El instrumento RAD de Curiosity mide la radiación del suelo.', pista: 'Noche del sol 5' },
  { id: 'clima_espacial', año: null, lugar: 'Clima espacial', titulo: 'Los vigías del Sol',
    dato: 'DONKI registra las tormentas del Sol. La misión MAVEN comprobó una predicción de llegada a Marte.', pista: 'Noche del sol 9' },
  { id: 'retraso_comunicacion', año: null, lugar: 'Tierra y Marte', titulo: 'Mensajes que tardan minutos',
    dato: 'Una señal entre la Tierra y Marte tarda de 3 a 22 minutos en cada sentido.', pista: 'Aparece en una emergencia' },
  { id: 'chapea', año: '2023', lugar: 'Houston', titulo: 'La base de prueba en Houston',
    dato: 'Cuatro voluntarios de la NASA vivieron 378 días en una base simulada de Marte.', pista: 'Al empezar la misión' },
  { id: 'sonidos_perseverance', año: '2021', lugar: 'Marte', titulo: 'Los primeros sonidos de Marte',
    dato: 'Perseverance tiene dos micrófonos: grabó el viento, sus ruedas, el láser y al helicóptero Ingenuity.', pista: 'Noche del sol 3' },
  { id: 'moxie', año: '2021', lugar: 'Marte', titulo: 'Oxígeno hecho en Marte',
    dato: 'MOXIE sacó 122 g de oxígeno del CO₂ de Marte: lo que respira un perro pequeño en 10 horas.', pista: 'Noche del sol 4' },
  { id: 'tierra_desde_marte', año: '2014', lugar: 'Marte', titulo: 'La Tierra vista desde Marte',
    dato: 'Curiosity fotografió la Tierra como una estrella brillante, con la Luna al lado.', pista: 'Noche del sol 10' },
].map((r, i) => ({ ...r, numero: i + 1 }));

export const recuerdo = id => RECUERDOS.find(r => r.id === id) ?? null;

// Cómo se nombra un recuerdo en pantalla: "ARCHIVO DE MEMORIA #02 · 1970 · Apolo 13"
export const etiquetaRecuerdo = r => ['ARCHIVO DE MEMORIA #' + String(r.numero).padStart(2, '0'), r.año, r.lugar]
  .filter(Boolean).join('  ·  ');

// Líneas de historia.ink que son un recuerdo: cómo empiezan (sin acentos ni signos) -> id del recuerdo
const LINEAS = [
  ['dato curioso a los robots spirit y opportunity', 'viento_limpia'],          // mini_paneles
  ['dato curioso los robots spirit y opportunity vivieron', 'viento_limpia'],   // fin_energia
  ['dato curioso en 1970 la nave apolo 13', 'apolo13'],                         // mini_filtro
  ['dato curioso en el apolo 13 el aire', 'apolo13'],                           // fin_oxigeno
  ['dato curioso en 2016 el astronauta scott kelly', 'veggie_zinnias'],        // mini_riego
  ['dato curioso los equipos de las misiones reales', 'sol_marciano'],          // noche_1
  ['dato curioso un instrumento del robot curiosity', 'radiacion_curiosity'],   // noche_5
  ['dato curioso servicios como donki', 'clima_espacial'],                      // noche_9
  ['dato curioso en agosto de 1972', 'tormenta_1972'],                          // emergencia solar
  ['en 1972 el sol lanzo una tormenta enorme', 'tormenta_1972'],                // fin_blindaje
  ['dato curioso en 1973 la estacion skylab', 'skylab'],                        // emergencia de calor
  ['dato curioso en mayo de 2013', 'iss_fuga_2013'],                            // emergencia de fuga
  ['dato curioso en 1997 una nave de carga', 'mir_1997'],                       // emergencia de impacto
  ['dato curioso una senal entre la tierra y marte', 'retraso_comunicacion'],   // emergencia de comunicación
  ['en 2018 una tormenta global', 'tormentas_polvo'],                           // noche_6 (lo cuenta Judith)
  ['todo empezo en 2023', 'chapea'],                                            // introducción
  ['el robot perseverance tiene microfonos', 'sonidos_perseverance'],           // noche_3
  ['si viajo con perseverance y demostro', 'moxie'],                            // noche_4
  ['si en 2014 el robot curiosity', 'tierra_desde_marte'],                      // noche_10
];

// La voz de las líneas "Dato curioso: …" empieza diciendo eso: en el flashback se salta (segundos medidos con
// ffmpeg silencedetect: el final de la pausa que sigue a "Dato curioso")
export const SALTO_VOZ = {
  mini_paneles_02: 1.49, mini_filtro_02: 1.41, mini_riego_02: 1.25, noche_1_05: 1.41, noche_5_04: 1.31,
  noche_9_06: 1.38, solar_dato_01: 1.4, calor_dato_01: 1.28, fuga_dato_01: 1.39, impacto_dato_01: 1.28,
  comunicacion_dato_01: 1.29, fin_energia_06: 1.28, fin_oxigeno_06: 1.48,
};

/** ¿La línea (ya normalizada) es un recuerdo? Devuelve el recuerdo o null. */
export function recuerdoDeLinea(normalizada) {
  const par = LINEAS.find(([inicio]) => normalizada.startsWith(inicio));
  return par ? recuerdo(par[1]) : null;
}

/** El texto en pantalla del recuerdo: sin "Dato curioso:" (no es un dato curioso, es un recuerdo) */
export function textoDeRecuerdo(texto) {
  const t = texto.replace(/^\s*(dato curioso|fun fact)\s*:\s*/i, '');
  return t.charAt(0).toUpperCase() + t.slice(1);
}
