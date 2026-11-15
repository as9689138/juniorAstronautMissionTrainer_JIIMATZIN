// Estado de la partida (rol 2). Viene de JIMATZIN_MINIJUEGOS/src/state/GameState.js con tres cambios:
//  - la científica es Judith (como en la historia y las voces), no Margaret;
//  - publicar() avisa a todos por el bus (EV.ESTADO_CAMBIO), que es lo que leen la interfaz y el mapa;
//  - nivel() traduce 0-100 a los niveles 0-3 que usa historia.ink;
//  - reloj: la fase y la hora que ANUNCIÓ la IA (la IA dicta el tiempo; ver src/mecanicas/ciclo.js). La luz del mapa
//    y la ficha del Sol siguen al reloj, no a `fase` (que es la fase de las reglas).
import { bus, EV } from '../motor/eventos.js';

const FASE_MAPA = { 'MAÑANA': 'manana', DIA: 'dia', EMERGENCIA: 'emergencia', NOCHE: 'noche', MEJORA: 'noche', FIN: 'noche' };

export const GameState = {
  sol: 1,
  maxSoles: 10,
  fase: 'MAÑANA', // "MAÑANA" | "DIA" | "EMERGENCIA" | "NOCHE" | "MEJORA" | "FIN"
  reloj: { fase: 'manana', hora: '06:00' },   // lo que anunció la IA: 'manana' | 'dia' | 'emergencia' | 'noche'
  personaje: 'wenceslao', // "wenceslao" | "judith" | "atlas"
  nivelDificultad: 'normal', // "facil" | "normal" | "dificil"

  recursos: { energia: 70, oxigeno: 80, blindaje: 80 },
  energiaMaxima: 100,

  // Presupuesto de la consola de mando: 6 núcleos disponibles vs 9 necesarios (nunca alcanza para todo)
  nucleosDisponibles: 6,
  asignacionEnergia: { paneles: 2, soporteVital: 2, escudos: 2 },

  minijuegosHoy: { paneles: false, co2: false, invernadero: false },
  // La IA guía da más tiempo en los temas flojos y un poco menos en los dominados (src/compania/guia.js)
  ajusteIA: { paneles: 1, co2: 1, invernadero: 1 },

  mejoras: {
    codigoHamilton: false, // Batería dura más de noche y linterna ilumina el doble
    ladrillosPolvo: false, // Limpiar paneles repara +15 de Blindaje
    superJardin: false,    // +10 de Oxígeno extra cada mañana
    entrenamiento: false,  // Evita pantalla nublada cuando hay poco oxígeno
  },

  iniciarPartida(personaje = 'wenceslao', nivelDificultad = 'normal') {
    this.personaje = personaje;
    this.nivelDificultad = nivelDificultad;
    this.sol = 1;
    this.energiaMaxima = 100;
    this.reloj = { fase: 'manana', hora: '06:00' };
    const base = {
      facil: { energia: 85, oxigeno: 90, blindaje: 90 },
      normal: { energia: 70, oxigeno: 80, blindaje: 80 },
      dificil: { energia: 55, oxigeno: 65, blindaje: 65 },
    }[nivelDificultad] || { energia: 70, oxigeno: 80, blindaje: 80 };
    this.recursos = { ...base };
    this.mejoras = { codigoHamilton: false, ladrillosPolvo: false, superJardin: false, entrenamiento: false };
    this.ajusteIA = { paneles: 1, co2: 1, invernadero: 1 };
    this.prepararNuevoSol();
  },

  prepararNuevoSol() {
    this.fase = 'MAÑANA';
    this.minijuegosHoy = { paneles: false, co2: false, invernadero: false };
    this.asignacionEnergia = { paneles: 0, soporteVital: 0, escudos: 0 };
    if (this.mejoras.superJardin) this.modificarRecurso('oxigeno', 10);   // Carta: Súper Jardín Espacial
  },

  // Ajuste de dificultad combinado (selector inicial + progresión del Sol 1 al 10)
  getParametrosDificultad() {
    const factorBase = { facil: 1.2, normal: 1.0, dificil: 0.8 }[this.nivelDificultad] || 1.0;
    const escalaSol = Math.max(0.65, 1 - (this.sol - 1) * 0.035);
    const multTiempo = factorBase * escalaSol;
    return {
      tiempoPaneles: Math.max(18, Math.round((35 * multTiempo + (this.asignacionEnergia.paneles - 1) * 3) * this.ajusteIA.paneles)),
      cantidadPolvo: Math.min(36, 18 + this.sol * 2),
      metaPolvo: Math.min(30, 14 + this.sol * 2),
      tiempoCO2: Math.max(22, Math.round((50 * multTiempo + (this.asignacionEnergia.soporteVital - 1) * 4) * this.ajusteIA.co2)),
      tiempoInvernadero: Math.max(25, Math.round((55 * multTiempo + (this.asignacionEnergia.soporteVital - 1) * 4) * this.ajusteIA.invernadero)),
      consumoNocturno: Math.round((10 + this.sol * 1.4) / factorBase),
      tiempoEmergencia: this.sol >= 6 || this.nivelDificultad === 'dificil' ? 15 : 20,
    };
  },

  modificarRecurso(tipo, delta) {
    const tope = tipo === 'energia' ? this.energiaMaxima : 100;
    this.recursos[tipo] = Math.max(0, Math.min(tope, Math.round(this.recursos[tipo] + delta)));
  },

  verificarFinJuego() {
    if (this.recursos.energia <= 0) return { terminado: true, victoria: false, motivo: 'ENERGIA' };
    if (this.recursos.oxigeno <= 0) return { terminado: true, victoria: false, motivo: 'OXIGENO' };
    if (this.recursos.blindaje <= 0) return { terminado: true, victoria: false, motivo: 'BLINDAJE' };
    if (this.sol > this.maxSoles) return { terminado: true, victoria: true, motivo: 'VICTORIA' };
    return { terminado: false };
  },

  // --- Añadido para el mapa ---
  // Nivel 0-3 que entiende historia.ink: 0 agotado, 1 bajo, 2 medio, 3 alto
  nivel(tipo) {
    const v = this.recursos[tipo];
    return v <= 0 ? 0 : v < 35 ? 1 : v < 70 ? 2 : 3;
  },

  // Avisa a la interfaz (barras), al mapa (luz por fase) y a quien escuche
  publicar() {
    bus.emit(EV.ESTADO_CAMBIO, {
      sol: Math.min(this.sol, this.maxSoles), solesTotales: this.maxSoles,
      energia: this.recursos.energia, oxigeno: this.recursos.oxigeno, blindaje: this.recursos.blindaje,
      energiaMaxima: this.energiaMaxima, fase: this.reloj.fase, hora: this.reloj.hora,
      faseReglas: FASE_MAPA[this.fase] ?? 'dia', faseJuego: this.fase,
      personaje: this.personaje, minijuegosHoy: { ...this.minijuegosHoy },
    });
  },
};
