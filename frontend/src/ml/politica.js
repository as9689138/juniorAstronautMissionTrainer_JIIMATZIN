// Política pedagógica de la IA: decide QUÉ TIPO de ayuda dar (no las palabras: eso es src/compania/frases.js).
//
// 1. Reglas de enseñanza, según lo que estima el BKT (src/ml/aprendizaje.js) y lo que acaba de pasar:
//      tema flojo (< 0,4)          → pista concreta o ejemplo resuelto con sus propios datos
//      falló 2 veces seguidas      → ejemplo resuelto (andamiaje: más ayuda cuando más se necesita)
//      tema a medias (0,4 – 0,7)   → pista general o concreta
//      tema dominado (≥ 0,7)       → retira la ayuda y plantea un reto (desvanecimiento del andamiaje)
//      acierto                     → elogiar la estrategia (no la suerte) o pedir que explique su porqué
//                                    (autoexplicación)
//      error                       → corregir con el porqué o mostrar un ejemplo resuelto
//      tema sin practicar 2 soles  → pregunta rápida para recordarlo (práctica de recuperación espaciada)
//
// 2. Aprendizaje por refuerzo: cuando las reglas dejan más de una ayuda posible, un bandido de Bernoulli con
//    muestreo de Thompson elige cuál. Cada ayuda, en cada momento y nivel de dominio, tiene una distribución
//    Beta(éxitos+1, fallos+1). La recompensa llega con la siguiente prueba del mismo tema: 1 si acierta, 0 si falla.
//    Así la IA aprende qué tipo de ayuda le funciona a ESTE niño, sin pruebas con niños ni datos de nadie más.
//    Se guarda solo en este navegador.
//
// No usa red ni servidor.

const CLAVE = 'jiimatzin.politica.v1';

// Movidas que puede hacer la IA
export const MOVIDAS = {
  pista: 'pista general',
  concreta: 'pista concreta',
  ejemplo: 'ejemplo resuelto',
  reto: 'reto sin ayuda',
  elogio: 'elogio de la estrategia',
  autoexplicacion: 'pregunta del porqué',
  correccion: 'corrección con el porqué',
  repaso: 'pregunta de repaso',
};

// Lo que dice la literatura que suele funcionar mejor, como punto de partida (pseudo-conteos pequeños: el niño lo
// cambia en pocas pruebas). Ejemplos resueltos para novatos; pistas concretas a medias; elogio de estrategia.
const PREVIO = { ejemplo: [2, 1], concreta: [1.5, 1], pista: [1, 1], elogio: [1.5, 1], autoexplicacion: [1, 1], correccion: [1, 1] };

const tramo = d => (d < 0.4 ? 'flojo' : d < 0.7 ? 'medio' : 'dominado');

// Muestra de una Beta(a, b) con dos Gamma (Marsaglia y Tsang)
function gamma(k) {
  if (k < 1) return gamma(k + 1) * Math.random() ** (1 / k);
  const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x, v;
    do {
      const u1 = Math.random() || 1e-12, u2 = Math.random();
      x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}
const beta = (a, b) => { const x = gamma(a); return x / (x + gamma(b)); };

export const politica = {
  brazos: {},            // 'momento|tramo|movida' -> [éxitos, fallos]
  pendiente: {},         // tema -> claves de los brazos que esperan su recompensa (la siguiente prueba de ese tema)
  errores: {},           // tema -> fallos seguidos
  ultimaPrueba: {},      // tema -> sol de su última prueba
  retoDado: {},          // tema -> ya se le dio el reto en esta partida

  iniciar() {
    try { this.brazos = JSON.parse(localStorage.getItem(CLAVE) ?? '{}').brazos ?? {}; } catch { this.brazos = {}; }
  },
  guardar() { try { localStorage.setItem(CLAVE, JSON.stringify({ brazos: this.brazos })); } catch { /* sin almacenamiento */ } },
  nuevaPartida() { this.pendiente = {}; this.errores = {}; this.ultimaPrueba = {}; this.retoDado = {}; },

  // Elige con Thompson entre las movidas posibles y deja pendiente la recompensa para ese tema
  thompson(momento, tema, dominio, opciones) {
    if (opciones.length === 1) return this.apuntar(momento, tema, dominio, opciones[0]);
    let mejor = null, alto = -1;
    for (const m of opciones) {
      const [e, f] = this.brazos[`${momento}|${tramo(dominio)}|${m}`] ?? [0, 0];
      const [pa, pb] = PREVIO[m] ?? [1, 1];
      const x = beta(e + pa, f + pb);
      if (x > alto) { alto = x; mejor = m; }
    }
    return this.apuntar(momento, tema, dominio, mejor);
  },
  // La ayuda queda en espera hasta la siguiente prueba del tema. Si antes llega otra ayuda del mismo tema (la
  // explicación de ayer y la pista de hoy), las dos esperan y las dos se premian con esa prueba: antes la nueva
  // borraba a la anterior sin contarla, y las explicaciones de "decidir" casi nunca recibían recompensa.
  apuntar(momento, tema, dominio, movida) {
    if (movida && movida !== 'reto' && movida !== 'repaso') {
      const clave = `${momento}|${tramo(dominio)}|${movida}`;
      const lista = (this.pendiente[tema] ??= []);
      if (!lista.includes(clave)) lista.push(clave);
      if (lista.length > 3) lista.shift();
    }
    return movida;
  },

  // Antes de decidir (consola o emergencia). claro: si hay un recurso claramente más bajo que otro.
  antes(momento, tema, dominio, claro) {
    if (dominio >= 0.7) {                                   // dominado: sin ayuda, un reto (una vez por partida)
      if (this.retoDado[`${momento}|${tema}`]) return null;
      this.retoDado[`${momento}|${tema}`] = true;
      return 'reto';
    }
    if (!claro) return dominio < 0.4 ? this.thompson(momento, tema, dominio, ['pista']) : null;
    if ((this.errores[tema] ?? 0) >= 2) return this.apuntar(momento, tema, dominio, 'ejemplo');
    return this.thompson(momento, tema, dominio, dominio < 0.4 ? ['concreta', 'ejemplo'] : ['pista', 'concreta']);
  },

  // Después de decidir: qué decir según si acertó
  despues(momento, tema, dominio, correcto) {
    if (correcto) {
      if (dominio >= 0.85 && Math.random() < 0.5) return null;       // ya lo domina: no hace falta decir siempre algo
      return this.thompson(momento, tema, dominio, dominio >= 0.7 ? ['elogio'] : ['elogio', 'autoexplicacion']);
    }
    return this.thompson(momento, tema, dominio, dominio < 0.4 ? ['ejemplo', 'correccion'] : ['correccion', 'ejemplo']);
  },

  // Al amanecer: ¿algún tema a medias que no se practica desde hace 2 soles? (repaso espaciado)
  repaso(dominios, sol) {
    const candidatos = Object.entries(dominios)
      .filter(([t, d]) => d >= 0.3 && d < 0.95 && sol - (this.ultimaPrueba[t] ?? 1) >= 2)
      .sort((a, b) => (this.ultimaPrueba[a[0]] ?? 0) - (this.ultimaPrueba[b[0]] ?? 0));
    return candidatos[0]?.[0] ?? null;
  },

  // Cada prueba del BKT: recompensa a la ayuda pendiente de ese tema y lleva la cuenta de errores seguidos
  observar(tema, correcto, sol) {
    const claves = this.pendiente[tema];
    if (claves?.length) {
      for (const clave of claves) (this.brazos[clave] ??= [0, 0])[correcto ? 0 : 1]++;
      delete this.pendiente[tema];
      this.guardar();
    }
    this.errores[tema] = correcto ? 0 : (this.errores[tema] ?? 0) + 1;
    this.ultimaPrueba[tema] = sol;
  },

  // Para el reporte del adulto: qué tipo de ayuda le ha funcionado mejor (con al menos 3 usos)
  resumen() {
    const porMovida = {};
    for (const [clave, [e, f]] of Object.entries(this.brazos)) {
      const m = clave.split('|')[2];
      const x = (porMovida[m] ??= { exitos: 0, usos: 0 });
      x.exitos += e; x.usos += e + f;
    }
    return Object.entries(porMovida).filter(([, x]) => x.usos >= 3)
      .map(([m, x]) => ({ movida: m, nombre: MOVIDAS[m], tasa: x.exitos / x.usos, usos: x.usos }))
      .sort((a, b) => b.tasa - a.tasa);
  },
};
