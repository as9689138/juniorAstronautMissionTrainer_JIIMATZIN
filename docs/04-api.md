# API v1

Solo lectura (`GET`). No hay endpoints públicos de importación ni edición (el endpoint de DONKI en vivo consulta a NASA pero no escribe nada en la BD). Base: `/api/v1`. Contrato del escenario: [contrato/scenario.schema.json](../contrato/scenario.schema.json) (**borrador no aprobado**).

| Método y ruta | Respuesta | Estado |
| --- | --- | --- |
| `GET /health` | `{ "estado": "ok" }` | Implementado |
| `GET /health/listo` | `200` si hay BD, `503` si no | Implementado |
| `GET /api/v1/scenarios` | Escenarios publicados | Adaptado a `juego` + `ciencia` |
| `GET /api/v1/scenarios/{id}?version={n}` | Escenario completo; sin `version`, la publicada más reciente | Adaptado a `juego` + `ciencia` |
| `GET /api/v1/facts/{id}?lang=es[&recordId={sha256}]` | Ficha científica aprobada, límites y evidencias verificadas | Adaptado a `ciencia` |
| `GET /api/v1/sources/{id}` | Institución, producto y URL por `source_id` | Adaptado a `ciencia` |
| `GET /api/v1/live/donki/flares` | Fulguraciones (FLR) de DONKI casi en tiempo real, formato de la limpieza | Implementado (borrador) |
| `POST /api/v1/partidas` | El juego guarda una partida anónima y sus pruebas de aprendizaje (IA guía) | Implementado |

Adaptación al modelo científico (`ciencia`) y a escenarios (`juego`).
Fuentes y fichas consultan `ciencia`; escenarios usa `juego` y las membresías de `ciencia`.
No se mezclan claves ni se convierten las membresías del paquete en escenarios.
Salud y DONKI conservan su comportamiento. Las fichas sin aprobación humana
devuelven 404; las fuentes se sirven desde el catálogo importado.
La importación no habilita escenarios científicos.

Verificación automatizada: `pnpm test` (51 pruebas sin BD) y
`pnpm test:integracion` (42 pruebas con PostgreSQL, migraciones desde cero y
fixtures en bases temporales eliminadas al terminar). El importador tiene una
prueba adicional opcional con el ZIP completo; ver [05](05-importacion.md).

## Fuente científica

`GET /api/v1/sources/nasa_pds_nmsu_rems`. Contrato:
[source.schema.json](../contrato/source.schema.json) (borrador).
`id` es el `source_id` del paquete, no el antiguo código `rems`.

```json
{
  "id": "nasa_pds_nmsu_rems",
  "institution": "NASA PDS Atmospheres Node (NMSU)",
  "product": "MSL REMS MODRDR",
  "url": "https://atmos.nmsu.edu/PDS/data/mslrem_1001/"
}
```

Ejemplo ilustrativo. Se devuelven únicamente las columnas públicas de
`ciencia.sources`. `url` puede ser `null`. El nuevo modelo no tiene `name`,
`provider`, `accessType`, `attribution` ni `challengeResource`: esos campos del
contrato anterior se sustituyen por `institution` y `product`, sin inventarlos.
El catálogo de fuentes no certifica que una publicación esté validada.

## Ficha científica

`GET /api/v1/facts/{fact_key}?lang=es[&recordId={64 caracteres hexadecimales}]`.
Contrato: [fact.schema.json](../contrato/fact.schema.json) (**borrador no aprobado**).
El idioma predeterminado es `es`; no se hace traducción ni fallback de idioma.
Parámetros repetidos, desconocidos o mal formados devuelven 400.

- La última fila de `ciencia.fact_reviews`, ordenada por `reviewed_at DESC,
  review_id DESC`, debe ser `approved`. El estado del payload recibido no
  sustituye la revisión humana. Un rechazo o pendiente posterior retira esa revisión.
- Solo se sirven registros con calidad `accepted` o `not_applicable`, con al
  menos una evidencia y todas marcadas `verified_against_preserved_source=true`.
- Sin `recordId`, se elige la revisión elegible con aprobación más reciente
  (mismo desempate por `review_id`). Eso no significa mayor versión del dataset.
  Con `recordId`, se exige esa revisión exacta de la clave y el idioma; nunca
  se sustituye por otra. Una revisión retirada devuelve 404 incluso con ID fijado.
- La ficha, su decisión y sus relaciones se leen en una sola sentencia SQL.
  La respuesta lleva `Cache-Control: no-store` para no conservar aprobaciones retiradas.

Campos: `id` (`fact_key`), `recordId`, `schemaVersion`, `processorId`, `language`,
`title`, `explanation` (`child_explanation`), `backedFact`
(`scientific_statement`), `missionContext`, `sourceContext`, `gameAdaptation`,
`limitations`, `mechanicIds`, `references` y `evidence`.

`references` contiene hashes únicos de los archivos de evidencia. Cada evidencia
incluye `index`, `type`, `sourceFileId`, `locator`, `expected` y
`verifiedAgainstPreservedSource`; se conserva el tipo JSON de `expected` y
`locator`. El orden es `evidence_index`; las mecánicas se ordenan por ID.
No se exponen rutas locales, payload completo ni identidad/notas del revisor.

**Cambio del borrador anterior:** no existe `version` numérica en las fichas de
`ciencia`; se usa `recordId`. La evidencia se identifica por archivo y localizador,
sin fabricar DOI, estudio ni fuente a partir de joins del esquema anterior.
El adaptador del frontend consume el borrador 2 de escenarios y comprueba la revisión solicitada.

Este endpoint publica contenido editorial aprobado de forma independiente; no
declara validado un `dataset_release`, no selecciona una publicación ni alimenta
automáticamente las partidas. Los controles administrativos de publicación ya
están implementados en `backend/src/publicaciones/`. El primer escenario puede
prepararse con el catálogo del juego y mantenerse como borrador hasta su publicación.

## Escenarios científicos

`GET /api/v1/scenarios` lista versiones publicadas y disponibles. Cada entrada
incluye `scenarioId`, `scenarioVersion`, `releaseId`, `rulesVersion`, `language`
y `title`. El orden es ID y versión descendente.

`GET /api/v1/scenarios/{id}[?version=N]` devuelve una versión completa desde
`juego`, vinculada a `ciencia`. Sin versión elige la última disponible; con versión
exige esa revisión exacta. El detalle, sus condiciones, fichas y procedencia se
leen en una sola sentencia SQL. Ambos endpoints llevan `Cache-Control: no-store`.

Contrato: [scenario.schema.json](../contrato/scenario.schema.json), **borrador 2**
(`schemaVersion: "2"`). Respuesta sintética completa:
[escenario.response.example.json](../backend/examples/escenario.response.example.json).
Ese ejemplo es documentación de prueba, no un escenario publicado en desarrollo.

La respuesta fija `releaseId`, `rulesVersion`, definición `rules` y revisiones
`recordId`. Conserva las estadísticas y nulos de `environment_hour` en `data`,
las observaciones, los eventos solares y las referencias ISS con su contexto.
Las fechas marcianas se conservan en LMST; `marsCoverage` no se convierte a UTC.
`sourceCoverage` y `retrievedAt` permanecen NULL cuando falta cobertura temporal
interpretada o una captura conocida de cada archivo seleccionado.

Las fichas esenciales tienen `recordId` en lugar de una versión entera. Sus
`factIds` son claves de `ciencia.fact_cards` y permiten consultar el detalle con
`/facts/{id}?lang=...&recordId=...`. Las claves narrativas anteriores requieren
una correspondencia editorial explícita.

Una dependencia retirada, una ficha no elegible o una selección inválida ocultan
el escenario entero: 404, sin contenido parcial. Las tablas anteriores de
`public` se conservan, pero estos endpoints ya no las sirven.

`version` acepta enteros decimales positivos hasta 2147483647. Parámetros
repetidos, desconocidos, notación exponencial, decimales o cadenas vacías → 400.

Definición editorial, publicación, retiro, exportación y comportamiento del
respaldo del frontend: `backend/src/escenarios/`. Los comandos son
administrativos; no se añaden endpoints públicos de escritura.

## DONKI en vivo

`GET /api/v1/live/donki/flares[?days=N | ?startDate=AAAA-MM-DD[&endDate=AAAA-MM-DD]]`. Contrato: [contrato/donki-live.schema.json](../contrato/donki-live.schema.json) (**borrador no aprobado**). Es independiente del escenario: éste sigue siendo `dataMode: "historical"`; este endpoint es `data_mode: "near_real_time"` y **no** alimenta escenarios ni reglas de juego (un evento solar no es una emergencia marciana).

**Origen y criterios** (heredados de la extracción): API oficial `https://ccmc.gsfc.nasa.gov/DONKI-API/get/FLR`, sin clave, con `catalog=M2M_CATALOG`, `class=ALL`, `version=Latest`. El endpoint antiguo de `api.nasa.gov` daba 404; no se prueban rutas alternativas. Ante 429 no se reintenta. CME queda fuera (sin uso en mecánicas v1).

**Ventana:** fechas UTC inclusivas. Por defecto `days=3` (hoy y los 2 anteriores); `days` 1–30 (`DONKI_MAX_DAYS`). `days` no se combina con fechas; `endDate` requiere `startDate`, no puede ser futura ni dejar el rango por encima del máximo.

**Frescura:** el servidor cachea cada ventana `DONKI_CACHE_SECONDS` (300 s) y fusiona peticiones concurrentes, así el cliente puede sondear sin cargar a NASA. `freshness.cache` es `miss`/`hit`/`stale`; `stale` = NASA falló y se sirve la última copia buena (máx. 1 h). `retrieved_at` es la captura, no la fecha del fenómeno. Una revisión de NASA (`source_version`) cambia el `record_id`.

**Formato:** cada elemento de `events` es el sobre de la limpieza (`schema_version 1.0.0`, `record_type: solar_event`, `provenance` con SHA-256 del cuerpo recibido y puntero JSON) con `data` idéntico a `solar_event.data.schema.json`: fechas ISO-Z junto a `*_original`, faltantes como `null` (nunca 0), `class_type` tal cual, `is_mars_surface_measurement: false`. Mismas reglas de aceptación que `build.py`: sin id, fecha, clase o enlace → excluido; duplicado idéntico → ignorado; mismo id con contenido distinto → ambos excluidos; secuencia begin ≤ peak ≤ end incumplida → se conserva y se marca. Orden `begin_time, external_id`. Lo excluido se lista en `review`. `completeness: "not_asserted"`.

```json
{
  "schema_version": "1.0.0", "data_mode": "near_real_time", "source_context": "solar_event_catalogue",
  "is_mars_surface_measurement": false, "retrieved_at": "2026-11-14T12:00:00.000Z",
  "period_requested": { "startDate": "2026-11-12", "endDate": "2026-11-14" },
  "coverage": { "start": "2026-11-14T01:33:00Z", "end": "2026-11-14T01:33:00Z" },
  "source": { "id": "nasa_ccmc_donki", "product": "FLR", "params": { "…": "…" }, "http_status": 200, "source_file_id": "sha256:…", "empty_body": false },
  "freshness": { "cache": "miss", "age_s": 0, "ttl_s": 300, "stale": false },
  "count": 1, "input_count": 1, "ordering": "begin_time, external_id",
  "review": { "excluded": [], "duplicates_ignored": 0, "time_sequence_flagged": [] },
  "completeness": "not_asserted",
  "events": [ { "schema_version": "1.0.0", "record_type": "solar_event", "dataset_id": "donki_flr_live", "quality_status": "accepted", "data": { "external_id": "…", "begin_time": "…", "class_type": "M1.0", "…": "…" } } ]
}
```

Errores propios (además de los de abajo): `502 fuente_error | fuente_no_disponible | fuente_respuesta_invalida`, `503 fuente_limitada` (con `Retry-After`), `504 fuente_sin_respuesta`.

## Catálogo de juego dentro del escenario

El detalle de escenario puede incluir `gameplay`, una extensión opcional del
contrato 2. Fija catálogo, recursos iniciales, personajes, calendario, minijuegos,
emergencias/opciones, cartas, finales y referencias de audio/Ink. Los cambios de
recurso son objetos estructurados; las propuestas y efectos pendientes conservan
su estado. Los IDs de datos narrativos no heredan aprobación científica: se
excluyen sus resúmenes y fuentes pendientes. Los vínculos hacia `facts` son
referencias complementarias explícitas. Ver [contrato y operación](12-contenido-juego.md).
El campo viaja también en el respaldo exportado. Los escenarios sin catálogo
mantienen su respuesta anterior; no se añadió un endpoint global ni de escritura.

## Partidas del juego (única escritura)

`POST /api/v1/partidas` con `Content-Type: application/json` (64 KB como máximo). Lo manda la IA guía del juego
(`frontend/src/compania/guia.js`) al final de cada sol y de la misión. Crea la partida o la actualiza si ya existe y es
del mismo jugador.

```json
{
  "jugador": "<uuid al azar del navegador>",
  "partida": { "id": "<uuid>", "personaje": "judith", "dificultad": "normal", "idioma": "es",
    "inicio": "2026-11-15T16:00:00.000Z", "fin": null, "resultado": "en_curso", "soles": 2, "medalla": null, "puntaje": null },
  "dominio": { "energia": 0.25, "aire": 0.49, "escudo": 0.22, "decidir": 0.22 },
  "pruebas": [{ "tema": "aire", "tipo": "minijuego", "correcto": true, "sol": 1, "detalle": "invernadero: ganó", "antes": 0.19, "despues": 0.49 }],
  "modelo": "bkt-1"
}
```

| Respuesta | Cuándo |
| --- | --- |
| `201 { "guardada": true, "partida": "<uuid>" }` | Partida nueva |
| `200` (mismo cuerpo) | Partida actualizada |
| `400 consulta_invalida` | Campo de más (p. ej. un nombre), valor fuera de rango o más de 400 pruebas. No se toca la BD |
| `400 json_invalido` / `413 cuerpo_demasiado_grande` | Cuerpo mal formado o de más de 64 KB |
| `409 partida_de_otro_jugador` | Esa partida existe y es de otro jugador: no se modifica |

No hay ruta para leerlas: el equipo usa `pnpm --filter @jiimatzin/backend partidas -- <resumen|exportar|borrar>`.
Tablas `aprendizaje.partidas` y `aprendizaje.pruebas` (migración `20261119000000_partidas-aprendizaje`).

## Errores

Todos los errores tienen la forma:

```json
{ "error": { "codigo": "escenario_no_encontrado", "mensaje": "…" } }
```

| Estado | `codigo` | Cuándo |
| --- | --- | --- |
| 400 | `consulta_invalida` | Parámetro mal formado (incluye `detalles` por campo) |
| 404 | `escenario_no_encontrado`, `ficha_no_encontrada`, `fuente_no_encontrada`, `ruta_no_encontrada` | No existe o no está publicado/aprobado |
| 503 | — (`/health/listo`) | Sin conexión a la BD |
| 500 | `error_interno` | Error no previsto; el detalle solo va al registro del servidor |
