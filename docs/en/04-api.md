# API v1

> English version of [../04-api.md](../04-api.md). Routes, JSON fields and error codes are the real identifiers and stay as they are in the code.

Read (`GET`) plus **a single write**: `POST /api/v1/partidas`, which stores the game's anonymous sessions. There are no public endpoints to import or edit content (the live DONKI endpoint queries NASA but writes nothing to the database). Base: `/api/v1`. Scenario contract: [contrato/scenario.schema.json](../../contrato/scenario.schema.json) (**draft, not approved**).

| Method and route | Response | Status |
| --- | --- | --- |
| `GET /health` | `{ "estado": "ok" }` | Implemented |
| `GET /health/listo` | `200` if the database is reachable, `503` if not | Implemented |
| `GET /api/v1/scenarios` | Published scenarios | Adapted to `juego` + `ciencia` |
| `GET /api/v1/scenarios/{id}?version={n}` | Full scenario; without `version`, the latest published | Adapted to `juego` + `ciencia` |
| `GET /api/v1/facts/{id}?lang=es[&recordId={sha256}]` | Approved scientific fact card, limits and verified evidence | Adapted to `ciencia` |
| `GET /api/v1/sources/{id}` | Institution, product and URL by `source_id` | Adapted to `ciencia` |
| `GET /api/v1/live/donki/flares` | Near-real-time DONKI solar flares (FLR), in the clean-up format | Implemented (draft) |
| `POST /api/v1/partidas` | The game saves an anonymous session and its learning probes (guide AI) | Implemented |

Adaptation to the scientific model (`ciencia`) and to scenarios (`juego`). Sources and fact cards query `ciencia`; scenarios use `juego` and the `ciencia` memberships. Keys are not mixed and the package's memberships are not converted into scenarios. Health and DONKI keep their behaviour. Fact cards without human approval return 404; sources are served from the imported catalogue. Importing does not enable scientific scenarios.

Automated verification: `pnpm test` (58 tests, no database) and `pnpm test:integracion` (tests with PostgreSQL, migrations from scratch and fixtures in temporary databases removed at the end). The importer has an extra optional test with the full ZIP; see [05](05-import.md).

## Scientific source

`GET /api/v1/sources/nasa_pds_nmsu_rems`. Contract: [source.schema.json](../../contrato/source.schema.json) (draft). `id` is the package's `source_id`, not the old `rems` code.

```json
{
  "id": "nasa_pds_nmsu_rems",
  "institution": "NASA PDS Atmospheres Node (NMSU)",
  "product": "MSL REMS MODRDR",
  "url": "https://atmos.nmsu.edu/PDS/data/mslrem_1001/"
}
```

Illustrative example. Only the public columns of `ciencia.sources` are returned. `url` may be `null`. The new model has no `name`, `provider`, `accessType`, `attribution` or `challengeResource`: those fields of the previous contract are replaced by `institution` and `product`, without inventing anything. The source catalogue does not certify that a publication has been validated.

## Scientific fact card

`GET /api/v1/facts/{fact_key}?lang=es[&recordId={64 hexadecimal characters}]`. Contract: [fact.schema.json](../../contrato/fact.schema.json) (**draft, not approved**). The default language is `es`; there is no translation or language fallback. Repeated, unknown or malformed parameters return 400.

- The latest row of `ciencia.fact_reviews`, ordered by `reviewed_at DESC, review_id DESC`, must be `approved`. The status in the received payload does not replace the human review. A later rejection or pending review withdraws that revision.
- Only records with `accepted` or `not_applicable` quality are served, with at least one piece of evidence and all of it marked `verified_against_preserved_source=true`.
- Without `recordId`, the eligible revision with the most recent approval is chosen (same tie-break by `review_id`). That does not mean the highest dataset version. With `recordId`, exactly that revision of the key and language is required; it is never replaced by another. A withdrawn revision returns 404 even with a pinned ID.
- The card, its decision and its relations are read in a single SQL statement. The response carries `Cache-Control: no-store` so withdrawn approvals are not kept.

Fields: `id` (`fact_key`), `recordId`, `schemaVersion`, `processorId`, `language`, `title`, `explanation` (`child_explanation`), `backedFact` (`scientific_statement`), `missionContext`, `sourceContext`, `gameAdaptation`, `limitations`, `mechanicIds`, `references` and `evidence`.

`references` holds unique hashes of the evidence files. Each piece of evidence includes `index`, `type`, `sourceFileId`, `locator`, `expected` and `verifiedAgainstPreservedSource`; the JSON type of `expected` and `locator` is preserved. Order is `evidence_index`; mechanics are sorted by ID. Local paths, the full payload and the reviewer's identity or notes are not exposed.

**Change from the previous draft:** `ciencia` fact cards have no numeric `version`; `recordId` is used. Evidence is identified by file and locator, without fabricating a DOI, study or source from joins of the old schema. The front-end adapter consumes draft 2 of scenarios and checks the requested revision.

This endpoint publishes editorial content approved independently; it does not declare a `dataset_release` validated, does not select a publication and does not feed game sessions automatically. The administrative publication controls are already implemented in `backend/src/publicaciones/`. The first scenario can be prepared with the game catalogue and kept as a draft until it is published.

## Scientific scenarios

`GET /api/v1/scenarios` lists published and available versions. Each entry includes `scenarioId`, `scenarioVersion`, `releaseId`, `rulesVersion`, `language` and `title`. Order is ID, then version descending.

`GET /api/v1/scenarios/{id}[?version=N]` returns a full version from `juego`, linked to `ciencia`. Without a version it picks the latest available; with a version it requires that exact revision. The detail, its conditions, fact cards and provenance are read in a single SQL statement. Both endpoints carry `Cache-Control: no-store`.

Contract: [scenario.schema.json](../../contrato/scenario.schema.json), **draft 2** (`schemaVersion: "2"`). Complete synthetic response: [escenario.response.example.json](../../backend/examples/escenario.response.example.json). That example is test documentation, not a scenario published in development.

The response pins `releaseId`, `rulesVersion`, the `rules` definition and the `recordId` revisions. It keeps the statistics and nulls of `environment_hour` in `data`, the observations, the solar events and the ISS references with their context. Martian dates are kept in LMST; `marsCoverage` is not converted to UTC. `sourceCoverage` and `retrievedAt` stay NULL when there is no interpreted time coverage or no known capture for each selected file.

Essential fact cards carry a `recordId` instead of an integer version. Their `factIds` are keys of `ciencia.fact_cards` and allow fetching the detail with `/facts/{id}?lang=...&recordId=...`. The earlier narrative keys need an explicit editorial mapping.

A withdrawn dependency, an ineligible fact card or an invalid selection hides the whole scenario: 404, with no partial content. The earlier `public` tables are kept, but these endpoints no longer serve them.

`version` accepts positive decimal integers up to 2147483647. Repeated or unknown parameters, exponent notation, decimals or empty strings → 400.

Editorial definition, publishing, retiring, export and the front end's fallback behaviour: `backend/src/escenarios/`. The commands are administrative; no public write endpoints are added.

## Live DONKI

`GET /api/v1/live/donki/flares[?days=N | ?startDate=YYYY-MM-DD[&endDate=YYYY-MM-DD]]`. Contract: [contrato/donki-live.schema.json](../../contrato/donki-live.schema.json) (**draft, not approved**). It is independent of the scenario: the scenario remains `dataMode: "historical"`; this endpoint is `data_mode: "near_real_time"` and does **not** feed scenarios or game rules (a solar event is not a Martian emergency).

**Origin and criteria** (inherited from the extraction): official API `https://ccmc.gsfc.nasa.gov/DONKI-API/get/FLR`, no key, with `catalog=M2M_CATALOG`, `class=ALL`, `version=Latest`. The old `api.nasa.gov` endpoint returned 404; alternative routes are not tried. On a 429 there is no retry. CME is out (unused by v1 mechanics).

**Window:** inclusive UTC dates. Default `days=3` (today and the previous 2); `days` 1–30 (`DONKI_MAX_DAYS`). `days` cannot be combined with dates; `endDate` requires `startDate`, cannot be in the future and cannot push the range over the maximum.

**Freshness:** the server caches each window for `DONKI_CACHE_SECONDS` (300 s) and merges concurrent requests, so the client can poll without loading NASA. `freshness.cache` is `miss`/`hit`/`stale`; `stale` = NASA failed and the last good copy is served (max. 1 h). `retrieved_at` is the capture, not the phenomenon's date. A NASA revision (`source_version`) changes the `record_id`.

**Format:** each element of `events` is the clean-up envelope (`schema_version 1.0.0`, `record_type: solar_event`, `provenance` with the SHA-256 of the received body and a JSON pointer) with `data` identical to `solar_event.data.schema.json`: ISO-Z dates next to `*_original`, missing values as `null` (never 0), `class_type` as is, `is_mars_surface_measurement: false`. Same acceptance rules as `build.py`: no id, date, class or link → excluded; identical duplicate → ignored; same id with different content → both excluded; broken begin ≤ peak ≤ end sequence → kept and flagged. Order `begin_time, external_id`. What is excluded is listed in `review`. `completeness: "not_asserted"`.

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

Specific errors (besides the ones below): `502 fuente_error | fuente_no_disponible | fuente_respuesta_invalida`, `503 fuente_limitada` (with `Retry-After`), `504 fuente_sin_respuesta`.

## Game catalogue inside the scenario

The scenario detail may include `gameplay`, an optional extension of contract 2. It pins the catalogue, initial resources, characters, calendar, minigames, emergencies/options, cards, endings and audio/Ink references. Resource changes are structured objects; pending proposals and effects keep their status. Narrative data IDs do not inherit scientific approval: their summaries and pending sources are excluded. Links to `facts` are explicit complementary references. See [contract and operation](12-game-content.md). The field also travels in the exported fallback. Scenarios without a catalogue keep their earlier response; no global or write endpoint was added.

## Game sessions (the only write)

`POST /api/v1/partidas` with `Content-Type: application/json` (64 KB at most). It is sent by the game's guide AI (`frontend/src/compania/guia.js`) at the end of every sol and of the mission. It creates the session, or updates it if it already exists and belongs to the same player.

```json
{
  "jugador": "<random uuid from the browser>",
  "partida": { "id": "<uuid>", "personaje": "judith", "dificultad": "normal", "idioma": "es",
    "inicio": "2026-11-15T16:00:00.000Z", "fin": null, "resultado": "en_curso", "soles": 2, "medalla": null, "puntaje": null },
  "dominio": { "energia": 0.25, "aire": 0.49, "escudo": 0.22, "decidir": 0.22 },
  "pruebas": [{ "tema": "aire", "tipo": "minijuego", "correcto": true, "sol": 1, "detalle": "invernadero: ganó", "antes": 0.19, "despues": 0.49 }],
  "modelo": "bkt-1"
}
```

| Response | When |
| --- | --- |
| `201 { "guardada": true, "partida": "<uuid>" }` | New session |
| `200` (same body) | Session updated |
| `400 consulta_invalida` | Extra field (e.g. a name), out-of-range value or more than 400 probes. The database is not touched |
| `400 json_invalido` / `413 cuerpo_demasiado_grande` | Malformed body or one over 64 KB |
| `409 partida_de_otro_jugador` | That session exists and belongs to another player: it is not modified |

There is no route to read them: the team uses `pnpm --filter @jiimatzin/backend partidas -- <resumen|exportar|borrar>`. Tables `aprendizaje.partidas` and `aprendizaje.pruebas` (migration `20261119000000_partidas-aprendizaje`). Details in [16-learning-and-sessions.md](16-learning-and-sessions.md).

## Errors

All errors have the form:

```json
{ "error": { "codigo": "escenario_no_encontrado", "mensaje": "…" } }
```

| Status | `codigo` | When |
| --- | --- | --- |
| 400 | `consulta_invalida` | Malformed parameter (includes `detalles` per field) |
| 404 | `escenario_no_encontrado`, `ficha_no_encontrada`, `fuente_no_encontrada`, `ruta_no_encontrada` | It does not exist or is not published/approved |
| 503 | — (`/health/listo`) | No database connection |
| 500 | `error_interno` | Unexpected error; the detail goes only to the server log |
