// Pantalla FINAL de la consola (reporte final de P.I.E.D.R.A) con el kit de misiones (src/minijuegos/mision.js):
// estilo del mapa y responsiva (sin área de juego: todo es interfaz, la letra nunca baja de 16 px).
// La usa src/mecanicas/Consola.js: crearFinal(this, motivo).
import { Mision } from '../minijuegos/mision.js';
import { GameState } from './estado.js';
import { guia } from '../compania/guia.js';
import { sonido } from '../motor/sonido.js';
import { idioma } from '../motor/idioma.js';

const TINTA = 0x141026, TINTA_TXT = '#141026', SELLO_TXT = '#b8473d';

// Calificación de misión (IA guía): colores de cada medalla y lo que dice la IA
const MEDALLA = {
  oro: { nombre: 'Medalla de oro', color: 0xf5c542, borde: 0x9a6b10, frase: '¡Dominas la base! Eres un gran astronauta.' },
  plata: { nombre: 'Medalla de plata', color: 0xd7dde6, borde: 0x6b7686, frase: '¡Vas muy bien! Un poco más de práctica y es de oro.' },
  bronce: { nombre: 'Medalla de bronce', color: 0xd08a4e, borde: 0x7a4520, frase: '¡Buen comienzo! Cada misión te enseña algo nuevo.' },
};

// Textos del prototipo; la voz y la música las pone antes el nudo fin_* de la historia
const TEXTOS = {
  VICTORIA: { titulo: '🏆 ¡VICTORIA! COMPLETASTE LOS 10 SOLES',
    cuerpo: '«¡Bip-hurra! ¡Lo logramos, equipo! Han pasado 10 soles enteros en este rincón del universo y seguimos aquí. No fue solo suerte: fue su curiosidad, su valentía y sus ganas de aprender lo que nos trajo hasta este amanecer. ¡Porque lo intentaron... lo lograron!»' },
  ENERGIA: { titulo: '🪫 FIN DE LA MISIÓN · SE ACABÓ LA BATERÍA',
    cuerpo: '«¡Oh, no! Nos quedamos sin batería y mis circuitos entraron en modo descanso. Pero guardé todo lo que aprendimos en mi caja negra para intentarlo de nuevo. ¡La próxima vez lo lograremos!»' },
  OXIGENO: { titulo: '🫧 FIN DE LA MISIÓN · FALTÓ AIRE EN CABINA',
    cuerpo: '«El aire de la cabina se agotó y la tripulación tuvo que entrar en sueño espacial de emergencia. ¡Revisa bien los filtros y las plantas en tu siguiente intento!»' },
  BLINDAJE: { titulo: '🛡️ FIN DE LA MISIÓN · ESCUDO ROTO',
    cuerpo: '«El escudo de la nave recibió demasiados golpes del espacio y debemos regresar a reparar. ¡Ya sabes cómo enfrentar las tormentas espaciales, inténtalo otra vez!»' },
};

function estrella(g, x, y, r, llena, tinta) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
    pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
  }
  if (llena) g.fillStyle(0xfacc15, 1).fillPoints(pts, true);
  g.lineStyle(2, llena ? tinta : 0x8a7f99, 1).strokePoints(pts, true, true);
}

export function crearFinal(escena, motivo) {
  const info = TEXTOS[motivo] ?? TEXTOS.VICTORIA;
  // La medalla y el puntaje son los que guardó cerrarPartida (los mismos que recibe el equipo); de calificacion()
  // solo se toman las estrellas de cada tema, que no se guardan
  const c = { ...guia.calificacion(motivo === 'VICTORIA'), ...(guia.partida?.calificacion ?? {}) };
  const m = MEDALLA[c.medalla] ?? MEDALLA.bronce;

  let mision;
  const alColocar = (libre, k) => {
    const pad = 16 * k, tam = Math.max(14, Math.round(16 * k));
    const ancho = libre.w - 2 * pad;                         // ancho útil dentro del papel
    const caja = mision.contenedor(libre.x, libre.y);
    caja.add(mision.pieza('ui_papel', 0, 0, libre.w, libre.h, 30, k));
    let y = pad;

    // Textos de la medalla y de los temas: se miden primero para repartir el ancho sin que nada se encime
    const anchoCol = Math.min(ancho * 0.36, 190 * k);        // la columna de la medalla, como mucho
    const nom = mision.texto(0, 0, idioma.t(m.nombre), { fontSize: `${tam}px`, fontStyle: 'bold', color: TINTA_TXT, align: 'center',
      wordWrap: { width: anchoCol, useAdvancedWrap: true } }).setOrigin(0.5, 0);   // en 2 renglones si no cabe
    const pun = mision.texto(0, 0, idioma.t('Puntaje: {n} de 100', { n: c.puntaje }), { fontSize: `${tam}px`, color: '#5a4a3a',
      align: 'center', wordWrap: { width: anchoCol, useAdvancedWrap: true } }).setOrigin(0.5, 0);
    const colMedalla = Math.max(nom.width, pun.width, 70 * k) + 8 * k;
    const temas = (c.temas ?? []).map(t => ({ t,
      nombre: mision.texto(0, 0, t.nombre, { fontSize: `${tam}px`, fontStyle: 'bold', color: TINTA_TXT }).setOrigin(0, 0.5),
      nivel: mision.texto(0, 0, t.nivel.texto, { fontSize: `${tam}px`, color: '#7a4a10' }).setOrigin(0, 0.5) }));
    const filaMin = tam + 8 * k;
    const altoTextosMedalla = nom.height + 2 + pun.height + 6 * k;

    // la cita de P.I.E.D.R.A: solo si cabe con la calificación (si no, se omite: ya la dijo la historia con voz)
    const titulo = mision.texto(libre.w / 2, 0, idioma.t('CALIFICACIÓN DE MISIÓN'), { fontSize: `${Math.max(15, Math.round(17 * k))}px`,
      fontStyle: 'bold', color: SELLO_TXT, letterSpacing: 2 }).setOrigin(0.5, 0);
    const altoCalif = titulo.height + 6 * k + Math.max(2.8 * 20 + altoTextosMedalla, 4 * filaMin);
    const cita = mision.texto(libre.w / 2, y, info.cuerpo, { fontSize: `${tam}px`, fontStyle: 'italic', color: TINTA_TXT,
      align: 'center', lineSpacing: 3, wordWrap: { width: ancho, useAdvancedWrap: true } }).setOrigin(0.5, 0);
    if (libre.h - 2 * pad - cita.height - 10 * k >= altoCalif + 20 * k) { caja.add(cita); y += cita.height + 10 * k; } else cita.destroy();

    // calificación: medalla a la izquierda, los cuatro temas con estrellas a la derecha
    titulo.setY(y);
    caja.add(titulo);
    y += titulo.height + 6 * k;
    const zonaH = libre.h - pad - y;
    const g = escena.add.graphics();
    caja.add(g);
    // radio: lo que deja libre la altura (las cintas suben 0,8 r sobre el borde de arriba de la medalla)
    const r = Phaser.Math.Clamp((zonaH - altoTextosMedalla) / 2.8, 14, Math.min(46 * k, colMedalla / 2));
    const mx = pad + colMedalla / 2, my = y + r * 1.8;
    g.fillStyle(0xb8473d, 1)
      .fillTriangle(mx - r * 0.7, my - r * 1.8, mx - r * 0.1, my - r * 1.8, mx - r * 0.3, my - r * 0.8)
      .fillTriangle(mx + r * 0.1, my - r * 1.8, mx + r * 0.7, my - r * 1.8, mx + r * 0.3, my - r * 0.8);
    g.fillStyle(m.borde, 1).fillCircle(mx, my, r);
    g.fillStyle(m.color, 1).fillCircle(mx, my, r * 0.88);
    g.lineStyle(3, m.borde, 1).strokeCircle(mx, my, r * 0.72);
    estrella(g, mx, my, r * 0.44, true, m.borde);
    nom.setPosition(mx, my + r + 6 * k);
    pun.setPosition(mx, nom.y + nom.height + 2);
    caja.add([nom, pun]);
    // temas, en columnas alineadas: nombre · estrellas · nivel (el nivel se omite si no cabe: lo dicen las estrellas)
    const x0 = pad + colMedalla + 12 * k, derecha = libre.w - pad;
    const filaH = Phaser.Math.Clamp(zonaH / 4, filaMin, 40 * k);
    const radioE = Math.max(7, Math.min(11 * k, filaH * 0.32));
    const anchoNombre = Math.max(...temas.map(x => x.nombre.width));
    const xe = x0 + anchoNombre + 10 * k, xn = xe + radioE * 2.6 * 4 + 6 * k;
    const conNivel = xn + Math.max(...temas.map(x => x.nivel.width)) <= derecha;
    temas.forEach(({ t, nombre, nivel }, i) => {
      const yy = y + filaH * (i + 0.5);
      nombre.setPosition(x0, yy);
      for (let s = 0; s < 4; s++) estrella(g, xe + radioE + s * radioE * 2.6, yy, radioE, s < t.nivel.estrellas, TINTA);
      caja.add(nombre);
      if (conNivel) { nivel.setPosition(xn, yy); caja.add(nivel); } else nivel.destroy();
    });
    // la frase de P.I.E.D.R.A sobre la medalla, abajo, si cabe
    const frase = mision.texto(libre.w / 2, libre.h - pad, `P.I.E.D.R.A: «${idioma.traducir(m.frase)}»`, { fontSize: `${tam}px`,
      color: '#2a6f8f', align: 'center', wordWrap: { width: libre.w - 2 * pad, useAdvancedWrap: true } }).setOrigin(0.5, 1);
    frase.sinTraducir = true;
    if (frase.y - frase.height > Math.max(pun.y + pun.height, y + filaH * 4) + 4 * k) caja.add(frase); else frase.destroy();
  };

  mision = new Mision(escena, { titulo: info.titulo, etiqueta: idioma.t('Reporte final de P.I.E.D.R.A · Base Marte Uno'), fondo: 'consola',
    area: null, alColocar });
  // El reporte completo (el niño ve sus estrellas; el adulto, los números): src/compania/Aprendizaje.js
  mision.accion({ id: 'aprendi', texto: 'VER LO QUE APRENDÍ', estado: 'espera', alPulsar: () => escena.scene.get('Aprendizaje')?.abrir(true) });
  mision.accion({ id: 'reintentar', texto: 'VOLVER A INTENTAR', estado: 'accion', tecla: 'Enter', alPulsar: () => escena.terminar('reiniciar') });
  sonido.efecto(c.medalla === 'bronce' ? 'ui_carta_voltea' : 'ui_carta_mejora', 0.8);   // una sola vez
  void GameState;
  return mision;
}
