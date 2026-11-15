// Pronóstico de llamaradas solares de la IA de la base.
// El modelo se entrena con herramientas/entrenar_pronostico.py (datos reales de NOAA SWPC)
// y aquí solo se aplica: unas multiplicaciones, sin servidor ni librerías.
//
// Idea para el juego: cada Sol usa un DÍA REAL reciente del Sol. La IA pronostica el día
// siguiente con su modelo y, como ese día ya pasó, después puede contar si acertó.
// El último Sol usa el día más reciente: el resultado real se sabrá "mañana de verdad".

const URL_VIVO = 'https://services.swpc.noaa.gov/text/daily-solar-indices.txt';
const NIVELES = [   // umbrales sobre la probabilidad (ver calibración en data/modelo_pronostico.json)
  { hasta: 0.15, nivel: 'bajo' },
  { hasta: 0.40, nivel: 'medio' },
  { hasta: 1.01, nivel: 'alto' },
];

// Igual que señales() en herramientas/entrenar_pronostico.py. Si se cambia una, cambiar la otra.
function calcularSeñales(d0, d1, d2) {
  const mx = r => (r.m ?? 0) + (r.x ?? 0);
  const flujoAntes = d2.flujo ?? d0.flujo;
  return {
    flujo_radio: Math.log(d0.flujo),
    manchas: Math.sqrt(d0.manchas),
    area_manchas: Math.log1p(d0.area),
    regiones_nuevas: d0.regiones ?? 0,
    llamaradas_c_hoy: Math.log1p(d0.c),
    llamaradas_mx_hoy: Math.log1p(mx(d0)),
    llamaradas_mx_3dias: Math.log1p(mx(d0) + mx(d1) + mx(d2)),
    subida_flujo_3dias: Math.log(d0.flujo / flujoAntes),
  };
}

const valido = r => r && [r.flujo, r.manchas, r.area, r.c, r.m, r.x].every(v => v != null && v >= 0);

// Lee el texto de NOAA "Daily Solar Data" (mismo formato que los archivos DSD)
export function leerTextoNOAA(texto) {
  const num = t => { const v = parseFloat(t); return Number.isFinite(v) && v >= 0 ? v : null; };
  const dias = [];
  for (const linea of texto.split('\n')) {
    const t = linea.trim().split(/\s+/);
    if (!/^\d{4}$/.test(t[0]) || t.length < 12) continue;
    dias.push({
      fecha: `${t[0]}-${t[1].padStart(2, '0')}-${t[2].padStart(2, '0')}`,
      flujo: num(t[3]), manchas: num(t[4]), area: num(t[5]), regiones: num(t[6]),
      c: num(t[9]), m: num(t[10]), x: num(t[11]),
    });
  }
  return dias;
}

const masUnDia = iso => {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

export default class Pronosticador {
  /** @param modelo data/modelo_pronostico.json · @param reciente data/sol_reciente.json */
  constructor(modelo, reciente) {
    this.modelo = modelo;
    this.dias = (reciente?.dias ?? []).filter(valido);
    this.fuente = 'NOAA SWPC, guardados en el juego';
    this.guardadoEl = reciente?.guardado ?? null;
  }

  // Intenta traer los últimos 30 días en vivo; si falla, sigue con los guardados.
  async actualizarEnVivo(msMax = 6000) {
    try {
      const control = new AbortController();
      const reloj = setTimeout(() => control.abort(), msMax);
      const r = await fetch(URL_VIVO, { signal: control.signal, cache: 'no-store' });
      clearTimeout(reloj);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const dias = leerTextoNOAA(await r.text()).filter(valido);
      if (dias.length < 5) throw new Error('pocos días');
      this.dias = dias;
      this.fuente = 'NOAA SWPC, en vivo';
      return true;
    } catch (e) {
      console.info(`[pronóstico] Sin datos en vivo (${e.message}); uso los guardados del ${this.guardadoEl}.`);
      return false;
    }
  }

  // Probabilidad para el día siguiente a dias[i]
  calcular(i) {
    const d0 = this.dias[i], d1 = this.dias[i - 1], d2 = this.dias[i - 2];
    const s = calcularSeñales(d0, d1, d2);
    let z = this.modelo.sesgo;
    const aportes = this.modelo.señales.map(sm => {
      const a = sm.peso * ((s[sm.id] - sm.media) / sm.desv);
      z += a;
      return { id: sm.id, nombre: sm.nombre, aporte: a };
    });
    const prob = 1 / (1 + Math.exp(-z));
    return { prob, aportes };
  }

  /**
   * Pronóstico para el Sol n de la partida (1..total).
   * Devuelve { prob, porcentaje, nivel, fechaDatos, fechaPronostico, resultadoReal, llamaradasReales,
   *            razones, fuente, modelo: { auc, tss, periodo } } o null si no hay datos.
   */
  paraSol(n, total = 10) {
    const ultimo = this.dias.length - 1;
    if (ultimo < 2) return null;
    const i = Math.max(2, ultimo - (total - Math.min(Math.max(n, 1), total)));
    const { prob, aportes } = this.calcular(i);
    const siguiente = this.dias[i + 1] ?? null;
    const razones = aportes.filter(a => a.aporte > 0.15).sort((a, b) => b.aporte - a.aporte).slice(0, 2)
      .map(a => a.nombre);
    const ev = this.modelo.evaluacion?.prueba ?? {};
    return {
      prob,
      porcentaje: Math.round(prob * 100),
      nivel: NIVELES.find(x => prob < x.hasta).nivel,
      fechaDatos: this.dias[i].fecha,
      fechaPronostico: masUnDia(this.dias[i].fecha),
      // true/false si ese día ya pasó (se sabe si hubo llamarada M o X); null si es el futuro
      resultadoReal: siguiente ? (siguiente.m + siguiente.x) > 0 : null,
      llamaradasReales: siguiente ? { m: siguiente.m, x: siguiente.x } : null,
      razones,
      fuente: this.fuente,
      modelo: { auc: ev.auc, tss: ev.tss, periodo: this.modelo.periodo },
    };
  }
}
