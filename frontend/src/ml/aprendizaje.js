// Medición del aprendizaje: Bayesian Knowledge Tracing (BKT; Corbett y Anderson, 1995).
// Es el modelo de machine learning clásico de los tutores inteligentes. Para cada tema guarda la probabilidad de que
// el niño YA LO DOMINE, y la actualiza con la regla de Bayes cada vez que hay una prueba (acierto o fallo):
//
//   P(L)  probabilidad de dominar el tema                       empieza en L0
//   P(T)  probabilidad de aprenderlo en cada oportunidad
//   P(G)  "adivinar": acertar sin dominarlo
//   P(S)  "resbalón": fallar aunque lo domine
//
//   acierto: P(L|ok)    = P(L)(1−S) / [P(L)(1−S) + (1−P(L))G]
//   fallo:   P(L|fallo) = P(L)S     / [P(L)S + (1−P(L))(1−G)]
//   después: P(L) ← P(L|obs) + (1 − P(L|obs))·T
//
// G y S dependen del tipo de prueba (BKT por ítem): elegir entre 2 opciones de una emergencia se adivina la mitad de
// las veces; ganar un minijuego, menos. Los valores de partida son los típicos de la literatura de BKT (L0 0,2-0,3;
// T 0,1-0,2; G ≤ 0,3 salvo en opción doble; S ≤ 0,15). Cuando haya partidas registradas, se pueden ajustar con datos.
//
// No usa red ni servidor: todo pasa en el navegador y no guarda nombres.

export const TEMAS = {
  energia: { nombre: 'Energía', explica: 'paneles solares, baterías y repartir la energía' },
  aire: { nombre: 'Aire', explica: 'oxígeno, filtro de CO₂ y plantas' },
  escudo: { nombre: 'Escudo', explica: 'radiación, tormentas solares y blindaje' },
  decidir: { nombre: 'Decidir con datos', explica: 'mirar los recursos antes de elegir y cuidar el más bajo' },
};

export const PARAMETROS = {
  inicial: 0.25,        // L0
  aprender: 0.15,       // T
  // G (adivinar) y S (resbalón) por tipo de prueba
  pruebas: {
    minijuego: { adivinar: 0.3, resbalon: 0.15 },
    consola: { adivinar: 0.3, resbalon: 0.1 },
    emergencia: { adivinar: 0.5, resbalon: 0.1 },
    // si la IA dio una pista antes, acertar dice menos de lo que el niño sabe: se "adivina" más
    consolaConPista: { adivinar: 0.5, resbalon: 0.1 },
    emergenciaConPista: { adivinar: 0.65, resbalon: 0.1 },
  },
};

// Niveles para el niño (con palabras y estrellas, no con porcentajes: docs/aprendizaje.md)
export const NIVELES = [
  { desde: 0, estrellas: 1, texto: 'Empezando' },
  { desde: 0.4, estrellas: 2, texto: 'Aprendiendo' },
  { desde: 0.7, estrellas: 3, texto: '¡Casi lo dominas!' },
  { desde: 0.95, estrellas: 4, texto: '¡Dominado!' },
];

/** Una actualización de BKT. Devuelve la nueva P(L). */
export function actualizar(pL, correcto, { adivinar: G, resbalon: S }, T = PARAMETROS.aprender) {
  const conObs = correcto
    ? pL * (1 - S) / (pL * (1 - S) + (1 - pL) * G)
    : pL * S / (pL * S + (1 - pL) * (1 - G));
  return conObs + (1 - conObs) * T;
}

export class Rastreador {
  constructor(guardado = null) {
    this.dominio = { ...Object.fromEntries(Object.keys(TEMAS).map(t => [t, PARAMETROS.inicial])), ...(guardado?.dominio ?? {}) };
    this.pruebas = guardado?.pruebas ? [...guardado.pruebas] : [];
  }

  /** Registra una prueba. tema: clave de TEMAS; tipo: 'minijuego' | 'consola' | 'emergencia'. */
  observar(tema, correcto, tipo, { sol = null, detalle = '' } = {}) {
    if (!(tema in TEMAS) || !PARAMETROS.pruebas[tipo]) return null;
    const antes = this.dominio[tema];
    const despues = actualizar(antes, correcto, PARAMETROS.pruebas[tipo]);
    this.dominio[tema] = despues;
    const p = { tema, tipo, correcto: !!correcto, sol, detalle, antes: +antes.toFixed(3), despues: +despues.toFixed(3) };
    this.pruebas.push(p);
    return p;
  }

  nivel(tema) {
    const p = this.dominio[tema];
    return [...NIVELES].reverse().find(n => p >= n.desde);
  }

  // Tema más flojo (para adaptar la ayuda) y más fuerte (para felicitar)
  masFlojo() { return Object.keys(TEMAS).reduce((a, b) => (this.dominio[b] < this.dominio[a] ? b : a)); }
  masFuerte() { return Object.keys(TEMAS).reduce((a, b) => (this.dominio[b] > this.dominio[a] ? b : a)); }

  // Resumen por tema: dominio, aciertos y pruebas, y si mejoró (primera mitad frente a segunda mitad de sus pruebas)
  resumen() {
    return Object.keys(TEMAS).map(tema => {
      const ps = this.pruebas.filter(p => p.tema === tema);
      const mitad = Math.floor(ps.length / 2);
      const tasa = l => (l.length ? l.filter(p => p.correcto).length / l.length : null);
      return {
        tema, ...TEMAS[tema], dominio: this.dominio[tema], nivel: this.nivel(tema),
        aciertos: ps.filter(p => p.correcto).length, total: ps.length,
        porTipo: Object.fromEntries(Object.keys(PARAMETROS.pruebas).map(t => {
          const q = ps.filter(p => p.tipo === t);
          return [t, { aciertos: q.filter(p => p.correcto).length, total: q.length }];
        })),
        inicio: ps.length >= 4 ? tasa(ps.slice(0, mitad)) : null,
        final: ps.length >= 4 ? tasa(ps.slice(mitad)) : null,
      };
    });
  }

  guardar() { return { dominio: { ...this.dominio }, pruebas: [...this.pruebas] }; }
}
