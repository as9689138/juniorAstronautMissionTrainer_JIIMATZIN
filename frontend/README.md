# Frontend: el juego en Phaser

El juego de JIIMATZIN (rol 1, con lo que entregaron los roles 2 a 5). Es una base en Marte por salas, en perspectiva
isométrica: el jugador camina entre las salas, usa las estaciones, juega los minijuegos y vive diez soles con la
historia, las voces y la música del equipo. Se comunica con la API de contenido por HTTP y no accede a PostgreSQL.

Phaser 4.2.1 e inkjs 2.2.3 van incluidos en `public/lib/`. Es JavaScript con módulos ES y no usa empaquetador:
no hay que instalar nada para jugar.

## Ejecutar

```bash
pnpm dev:front                    # desde la raíz del repositorio
node frontend/scripts/servidor.mjs    # lo mismo, sin pnpm
```

Abrir <http://localhost:5173>. El servidor (`scripts/servidor.mjs`, sin dependencias):

- sirve `frontend/` y `public/` sin caché;
- reenvía `/api/...` y `/health` a la API de `pnpm dev:back`, igual que el proxy de `vite.config.example.js`.

Variables: `PUERTO` y `JIIMATZIN_API` (por defecto `http://localhost:3000`).

**Controles**

| Acción | Teclado | Táctil |
| --- | --- | --- |
| Moverse | WASD o flechas | arrastrar |
| Usar una estación | E o Espacio | tocar el aviso |
| Cerrar | Esc | — |
| Silenciar | M | botón del altavoz |
| Recuerdos de la IA (álbum) | R | botón de la esquina |
| Agrandar el minimapa | clic en el minimapa | tocar el minimapa |
| Lo que estás aprendiendo (y reporte para adultos) | P | botón «Avance» de la esquina |
| Idioma | en la portada | en la portada |

Otras teclas:
- **F2** muestra las colisiones; también con `?depurar` en la dirección.
- **F3** cambia la fase de luz, para probar.

## Estructura

```text
frontend/
├── index.html
├── public/                      se sirve tal cual en la raíz
│   ├── lib/                     phaser.min.js e ink.js
│   ├── assets/                  zonas (salas), minijuegos, interfaz, personajes, arte y audio
│   ├── historia/historia.json   historia de Ink compilada (rol 5)
│   ├── data/                    modelo del pronóstico solar de la IA
│   └── escenarios/              respaldo de la API (exportaciones del backend)
├── src/
│   ├── api/                     adaptador de la API (contrato 2)
│   ├── escenas/                 Arranque, Inicio, Seleccion, Base (mapa), Interfaz, Dialogo
│   ├── motor/                   eventos, sonido, luces, recursos y configuración
│   ├── mecanicas/               estado, ciclo de los 10 soles, consola, narrador de Ink y datos reales
│   ├── minijuegos/              paneles, filtro de CO₂ e invernadero (rol 2; el original está en minijuegos/original)
│   ├── compania/                el robot de la IA que acompaña al jugador
│   ├── ml/                      pronóstico de llamaradas solares en el navegador
│   └── main.js
├── historia/                    fuente de Ink y guía de la historia (rol 5)
├── herramientas/                generadores de arte y del modelo (Python): ver «Arte»
├── docs/                        acuerdos entre roles, estilo, objetos, accesibilidad, aprendizaje, uso de IA y créditos
└── scripts/servidor.mjs
```

Cómo se habla entre partes del juego (eventos del bus, estado, pantallas encima del mapa): [docs/acuerdos.md](docs/acuerdos.md).

## Cómo se juega la historia

- **Cada personaje tiene su ruta** (`src/mecanicas/rutas.js`): el día empieza por su especialidad y tiene una ventaja
  propia (más tiempo, menos gasto). Sus líneas en los diálogos dicen «TÚ».
- **La hora la dicta la IA:** amanece, hay luz, llega la emergencia y anochece cuando la IA lo anuncia; con su aviso
  cambian la luz del mapa y la ficha del Sol (que muestra la hora).
- **Los datos de la historia son recuerdos de la IA:** al llegar a uno, el diálogo se vuelve un flashback con su año,
  lugar e ilustración, y el recuerdo queda en el álbum (16 en total).
- **Voces:** las de la entrega del rol 5 (MP3) y, para lo que aún no tiene grabación, la voz del navegador. La mezcla
  (`MEZCLA` en `src/motor/sonido.js`) lleva cada archivo a su nivel medido: la música queda muy por debajo de las voces.
  La música es la «Propuesta 3» (cinematográfica, hecha con código, CC0) en `public/assets/audio/musica/propuesta3/`.
  Las pistas de Suno de la entrega del rol 5 no se usan: son del plan gratis (uso no comercial, derechos de Suno).
- **Minimapa** (`src/escenas/minimapa.js`): arriba a la derecha, en la misma perspectiva que el mapa. Marca dónde estás,
  la sala del objetivo y el camino punteado hasta ella.

Detalle en [docs/acuerdos.md](docs/acuerdos.md), puntos 10 y 11.

## Idiomas: español e inglés

Se elige en la portada (Español / English) y se guarda en el navegador.

- **Historia:** las 213 líneas con voz usan la traducción del rol 5 (`public/assets/audio/voces/lineas_es_en.json`).
  Lo que no tiene voz (prólogo, narración, cartas, opciones de las emergencias, instrucciones) está en
  `src/textos/historia_en.js`.
- **Todo lo demás** (interfaz, IA guía, recuerdos, consola y minijuegos) está en `src/textos/en.js`. No hay que tocar
  cada pantalla: todo texto de Phaser pasa por ese diccionario al dibujarse (`src/motor/idioma.js`). Las frases con
  números o nombres van como plantillas: `'⏳ Tiempo: {n} s': '⏳ Time: {n} s'`.
- **Voz en inglés:** no hay MP3 en inglés, así que habla la voz del navegador en inglés. El servidor de voz del rol 5
  (`9_servidor_voz`) podría dar la voz de cada personaje.
- **Si se cambia o se añade un texto en español,** hay que añadir su inglés en `en.js`. Para ver lo que falta, jugar en
  inglés y escribir `__idioma.faltan` en la consola del navegador.
- **Pendiente:** que un hablante nativo revise `historia_en.js` y `en.js` (traducidos con ayuda de IA). Los letreros
  pintados en el arte de las salas (ENERGÍA, MANDO, ▼ SOPORTE VITAL…) siguen en español.

## La IA guía y el machine learning

Todo el machine learning del juego está en la IA guía (`src/compania/guia.js`), el "cerebro" del robot:

- **Pronóstico de llamaradas** (`src/ml/pronostico.js`): regresión logística entrenada con datos reales de NOAA.
- **Medición del aprendizaje** (`src/ml/aprendizaje.js`): Bayesian Knowledge Tracing. Estima cuánto domina el niño
  cuatro temas (Energía, Aire, Escudo y Decidir con datos) con lo que hace: minijuegos, reparto de energía en la consola
  y decisiones de emergencia (si cuida el recurso más bajo).
- **Adapta la ayuda:** pistas y más tiempo en lo flojo; menos ayuda en lo dominado; y el porqué de cada decisión.
- **Lo ven el niño y el adulto:** estrellas y palabras para el niño; dominio en %, aciertos y un reporte descargable para
  el adulto (tecla P o botón «Avance»).
- **Calificación de misión** (pantalla final): medalla de oro (80 o más), plata (60 o más) o bronce, y estrellas por tema.
  Puntaje = 70 % aprendizaje (dominio medio de los 4 temas) + 30 % soles que aguantó la base.
- **Se guarda de forma anónima** en la API del equipo (`POST /api/v1/partidas`, `src/api/partidas.js`) al final de cada
  sol y de la misión: un código al azar del dispositivo, la partida, el dominio y las pruebas. Sin nombres. Sin conexión,
  la partida espera en el navegador y se manda después. Solo el equipo lee los datos
  (`pnpm --filter @jiimatzin/backend partidas -- exportar`). Aviso en la portada; detalle en `docs/07-google-cloud.md`.

## Carga y memoria

El juego no carga todo al principio. `src/motor/cargas.js` lo reparte en grupos, y la escena `Cargador` (que no se
apaga nunca) los baja en segundo plano o cuando hacen falta.

| Grupo | Cuándo se carga | Cuándo se libera |
| --- | --- | --- |
| `nucleo`: interfaz, datos, el Pasillo, la música del día | Al arrancar, con la barra | Nunca |
| `personajes` (retratos) y `efectos` | En segundo plano, durante el prólogo | Nunca |
| `zona:<id>` | Al cruzar su puerta; la del objetivo se adelanta | Al alejarse (quedan la actual, el Pasillo y la del objetivo) |
| `minijuego:<escena>` | Al empezar el día | Al terminar ese minijuego |
| `recuerdo:<id>` (ilustraciones de los flashbacks) | En segundo plano, durante el prólogo | Nunca (pesan 430 KB en total) |
| `musica:<tema>` | Al sonar | Al cambiar de tema (salvo el del día) |
| Voces | Al hablar | Al terminar la línea |

Medido en local: el menú pasó de 16,3 MB y 175 archivos a **4,6 MB y 72 archivos**. Durante una partida, la memoria
de video bajó de unos 290 MB a unos 120 MB y el audio decodificado de más de 150 MB a unos 50 MB. Además, el frente
de cada sala se guarda recortado al murete (`frente_x`, `frente_y` en `zonas.json`).

Para añadir un archivo: ponerlo en `src/motor/recursos.js`. Si no pertenece a ningún grupo, va en `nucleo`.

## La API: datos reales

`src/mecanicas/datosReales.js` carga la misión `base-marte-uno` con el adaptador de `src/api`. El juego nunca llama
a `fetch` directamente. Si la API no responde, usa el respaldo de `public/escenarios/`. Si tampoco hay respaldo, el
juego sigue con su contenido propio. Con datos, el jugador ve:

- **Por la mañana**, la temperatura y la presión medidas en Marte para ese sol, dichas como medición histórica.
- **Debajo del sol**, en la interfaz: "Marte real: −66 °C · 735 Pa".
- **En cada fase**, las fichas «Dato real» que la misión coloca en ese sol y momento, con su fuente.
- **Tras un `# dato:<id>` de la historia**, la ficha aprobada que esté vinculada. Sin vínculo, no se presenta como
  verificada.
- **En la antena de Comunicaciones** (y tras la emergencia solar), las llamaradas reales de los últimos 7 días
  (`GET /api/v1/live/donki/flares`, DONKI en vivo). Se cuentan sin etiquetas de peligro, como pide el contrato: no es
  una medición en Marte ni dispara reglas del juego.

Uso directo del adaptador:

```js
import { cargarEscenario, obtenerFicha } from './api/index.js';

const { escenario, origen } = await cargarEscenario('mi-escenario', { version: 1 });
const esencial = escenario.facts[0];
if (esencial) {
  const ficha = await obtenerFicha(esencial.id, escenario.language, {
    recordId: esencial.recordId,
  });
  // Mostrar evidencia y límites de esa misma revisión.
}
```

- Se consume `schemaVersion: "2"`, que fija `releaseId`, `rulesVersion` y los `recordId`. El borrador anterior del
  esquema `public` se rechaza.
- Se carga antes de iniciar la misión y se conserva la misma versión durante la partida. `releaseId` puede pasarse
  como opción para comprobar también esa identidad cuando la partida ya la conoce.
- `role: "environment"` identifica datos históricos de Marte; `reference` conserva contexto solar o ISS.
- El adaptador no calcula emergencias ni reglas físicas.

Los JSON de `public/escenarios/` se generan con el comando de exportación del backend. No se incluyen borradores,
ZIP originales ni herramientas de importación. El contrato está en `contrato/scenario.schema.json`.

## Arte

Todo el arte del mapa y de los minijuegos se genera con código, en la línea de [docs/estilo-mapa.md](docs/estilo-mapa.md)
y [docs/biblia-objetos.md](docs/biblia-objetos.md). Los personajes son dibujos del equipo de arte.

```bash
python frontend/herramientas/pintar_zonas.py         # las 7 salas (≈ 3 min; caché en herramientas/.cache)
python frontend/herramientas/pintar_minijuegos.py    # arte de los minijuegos
python frontend/herramientas/pintar_interfaz.py      # piezas de la interfaz
python frontend/herramientas/pintar_recuerdos.py     # ilustraciones de los 16 recuerdos (flashbacks)
```

Requieren Python 3.11 con Pillow y NumPy. Las propuestas y hojas de revisión se escriben en `docs-internos/`, que el
repositorio no versiona.

## Créditos y uso de IA

[CREDITOS.md](CREDITOS.md), [docs/creditos/](docs/creditos/) y [docs/uso-de-ia.md](docs/uso-de-ia.md).
