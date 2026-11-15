import { z } from 'zod';

// Lo que manda el juego (frontend/src/api/partidas.js). Estricto: un campo de más (p. ej. un nombre) se rechaza.
const TEMAS = ['energia', 'aire', 'escudo', 'decidir'];
const unidad = z.number().min(0).max(1);
export const cuerpoPartida = z.strictObject({
  jugador: z.uuid(),
  partida: z.strictObject({
    id: z.uuid(),
    personaje: z.enum(['wenceslao', 'judith', 'atlas']),
    dificultad: z.enum(['facil', 'normal', 'dificil']),
    idioma: z.enum(['es', 'en']),
    inicio: z.iso.datetime({ offset: true }),
    fin: z.iso.datetime({ offset: true }).nullable(),
    resultado: z.enum(['en_curso', 'victoria', 'energia', 'oxigeno', 'blindaje', 'sin_terminar']),
    soles: z.number().int().min(0).max(10),
    medalla: z.enum(['oro', 'plata', 'bronce']).nullable(),
    puntaje: z.number().int().min(0).max(100).nullable(),
  }),
  dominio: z.strictObject(Object.fromEntries(TEMAS.map((t) => [t, unidad]))),
  pruebas: z.array(z.strictObject({
    tema: z.enum(TEMAS),
    tipo: z.enum(['minijuego', 'consola', 'emergencia', 'consolaConPista', 'emergenciaConPista']),
    correcto: z.boolean(),
    sol: z.number().int().min(1).max(10).nullable(),
    detalle: z.string().max(200),
    antes: unidad,
    despues: unidad,
  })).max(400),
  modelo: z.string().regex(/^[a-z0-9._-]{1,40}$/),
});

export function crearControladorPartidas(modelo) {
  return {
    async guardar(req, res) {
      const datos = cuerpoPartida.parse(req.body ?? {});
      const { partidaId, nueva } = await modelo.guardar(datos);
      res.status(nueva ? 201 : 200).json({ guardada: true, partida: partidaId });
    },
  };
}
