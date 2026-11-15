-- Up Migration
-- Partidas de los jugadores y lo que mide la IA guía del juego (Bayesian Knowledge Tracing), para que el equipo
-- estudie cómo se aprende con el juego y ajuste el modelo. ANÓNIMAS: el jugador es un UUID al azar que genera su
-- navegador; no se guardan nombres, correos, IP ni ningún otro dato personal. Solo el equipo las consulta (CLI).
CREATE SCHEMA aprendizaje;

CREATE TABLE aprendizaje.partidas (
  partida_id uuid PRIMARY KEY,
  jugador_id uuid NOT NULL,
  personaje text NOT NULL CHECK (personaje IN ('wenceslao', 'judith', 'atlas')),
  dificultad text NOT NULL CHECK (dificultad IN ('facil', 'normal', 'dificil')),
  idioma text NOT NULL CHECK (idioma IN ('es', 'en')),
  inicio timestamptz NOT NULL,
  fin timestamptz,
  resultado text NOT NULL CHECK (resultado IN ('en_curso', 'victoria', 'energia', 'oxigeno', 'blindaje', 'sin_terminar')),
  soles integer NOT NULL CHECK (soles BETWEEN 0 AND 10),
  medalla text CHECK (medalla IN ('oro', 'plata', 'bronce')),
  puntaje integer CHECK (puntaje BETWEEN 0 AND 100),
  dominio jsonb NOT NULL CHECK (jsonb_typeof(dominio) = 'object'),
  version_modelo text NOT NULL CHECK (version_modelo ~ '^[a-z0-9._-]{1,40}$'),
  recibida_en timestamptz NOT NULL DEFAULT clock_timestamp(),
  actualizada_en timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX partidas_por_jugador ON aprendizaje.partidas (jugador_id);
CREATE INDEX partidas_por_fecha ON aprendizaje.partidas (recibida_en);

-- Cada prueba de aprendizaje, en orden: minijuego, reparto en la consola o decisión de emergencia
CREATE TABLE aprendizaje.pruebas (
  partida_id uuid NOT NULL REFERENCES aprendizaje.partidas ON DELETE CASCADE,
  orden integer NOT NULL CHECK (orden >= 0),
  tema text NOT NULL CHECK (tema IN ('energia', 'aire', 'escudo', 'decidir')),
  tipo text NOT NULL CHECK (tipo IN ('minijuego', 'consola', 'emergencia', 'consolaConPista', 'emergenciaConPista')),
  correcto boolean NOT NULL,
  sol integer CHECK (sol BETWEEN 1 AND 10),
  detalle text NOT NULL DEFAULT '' CHECK (length(detalle) <= 200),
  antes real NOT NULL CHECK (antes BETWEEN 0 AND 1),
  despues real NOT NULL CHECK (despues BETWEEN 0 AND 1),
  PRIMARY KEY (partida_id, orden)
);

-- Down Migration
DROP SCHEMA aprendizaje CASCADE;
