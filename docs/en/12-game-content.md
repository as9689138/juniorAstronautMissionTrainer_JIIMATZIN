# Game catalogues and scenario integration

> English version of [../12-contenido-juego.md](../12-contenido-juego.md). Commands, JSON fields and table names are the real identifiers.

The back end imports the team's combined breakdown JSON ("desglose"). It keeps characters, resources, calendar, minigames, emergencies and options, cards, endings, narrative data, audio references and variable definitions. It does not run text as code and does not include the image, audio or compiled story files.

The `juego` schema has 19 tables; see the [model and dictionary](../13-modelo-juego.md) (Spanish). The `ciencia` schema keeps its data, evidence and independent reviews.

## Validate and import

From `desarrollo/backend`, obtain the SHA-256 of the received file and keep it with the delivery. `--sha256` requires that explicit hash. The importer accepts the combined JSON and can cross-check the seven CSV files of the same delivery:

```powershell
$archivo = 'path/to/base_de_datos_juego.json'
$huella = (Get-FileHash -LiteralPath $archivo -Algorithm SHA256).Hash.ToLower()
pnpm contenido -- validar --archivo $archivo --sha256 $huella --csv-directorio 'path/to/the/csv'
pnpm contenido -- importar --archivo $archivo --sha256 $huella --csv-directorio 'path/to/the/csv' --actor 'operator-name'
```

`validar` does not connect to PostgreSQL. `importar` loads and compares all projections in one transaction and seals the catalogue version. When repeated, it compares the persisted content without inserting or overwriting. The `catalogId` is derived from the normalised content: two different deliveries are never confused even if they declare the same `version` label. Collections are presented sorted by identifier, and the calendar by sol; the received document is kept apart.

Keys and references are mandatory according to the contract [`contenido-juego.schema.json`](../../contrato/contenido-juego.schema.json). Costs must belong to the declared resources. `energia+1` and equivalent permitted expressions become `{resource, change}` through a restricted parser. `eval` is never used. Optional suggested costs in cards and optional emergencies in the calendar are accepted.

The combined JSON includes information that is not in the CSV files, such as resources, audio and variables. It is the complete input document. The cross-check compares the columns present and warns about columns the CSV omits. In the shared V2, `finales.csv` omits `exito.sfx`; it is kept from the JSON. A discrepancy in value, identifier or row count aborts the load.

## Preparing a ten-sol scenario

```powershell
pnpm escenarios -- preparar --catalogo 'cat_<SHA256>' --release 'rel_<id>' --id base-marte-uno --version 1 --salida 'my-scenario.json' --vinculos 'my-links.json'
pnpm escenarios -- crear --definicion 'my-scenario.json' --actor 'editor-name'
```

`preparar` queries a read-only snapshot and requires the 240 REMS positions of the ten sols. It produces a new JSON without overwriting an existing file. It does not insert or publish. It proposes starting with the three resources at level 3 and keeps the catalogue's suggested calendar. That choice is recorded as an educational assumption; it can be changed explicitly in `gameplay.initialResources` before creating the draft. Card effects remain `design_pending`.

`crear` accepts the catalogue through the optional field:

```json
{
  "gameplay": {
    "catalogId": "cat_<SHA256>",
    "initialResources": {"energia": 3, "oxigeno": 3, "blindaje": 3},
    "factBindings": [
      {"narrativeId": "apolo13", "recordId": "<SHA256 of the selected fact card>", "justification": "Complementary reference and limits of use"}
    ]
  }
}
```

The links file is a list like `factBindings`, not the whole object. There is an example in `backend/examples/vinculos-narrativos.example.json` for the scientific revisions of the imported package. The FKs prevent linking an entry or fact card that does not belong to the pinned catalogue/scenario. An existing scenario version with another catalogue, resources or links is rejected.

## Public response and front end

`GET /api/v1/scenarios/{id}` adds `gameplay` to contract 2 when the scenario has a catalogue. Earlier scenarios keep their response without that field. There are no HTTP write endpoints and no ambiguous global catalogue: the mission delivers the exact version of the characters, activities, calendar and rules it uses.

`gameplay` includes:

- The catalogue's identity, source version and `initialResources`.
- Resources, characters, ten sols and references to Ink knots.
- Minigames with structured resource changes, emergencies and their options.
- Cards with structured cost, effect text and `effectStatus: design_pending`.
- Endings, audio identifiers and variable types.
- The 22 narrative IDs with `reviewStatus: pending_human_review` and complementary links to the selected approved scientific revisions.

The boolean/date `verificado` received in the breakdown does not create scientific decisions. Summaries, sources and scene lines of `datos_reales` are kept administratively; they are not exposed as approved fact cards. The narrative field `minijuegos.evento_real` is not exposed either. The front end shows the approved explanations from `facts` or queries `/facts/{id}?recordId=...` for the detail. An entry without a link stays pending and must not be presented as verified.

The existing export includes exactly this same DTO. The front-end adapter validates the catalogue and its references both from the API and from the fallback, rejecting corrupted changes and private narrative text introduced into the response. Undefined card formulas remain pending design; the back end does not deduce them from phrases like "more energy every morning". Game sessions and the execution of activities belong to the game engine and are not writes of this API (the only write is the anonymous session record, see [16](16-learning-and-sessions.md)).

## Publishing and checks

The scenario stays hidden while it is a draft or while its scientific publication is not active. The commands `escenarios publicar`, `retirar` and `exportar` keep their earlier conditions. Publishing also pins the catalogue, resources and links; retiring hides the mission and keeps its history.

Content tests include rejection of orphan references and expressions, quoted CSV, repeatable import, identity under new revisions, immutability, Up/Down/Up rollback, API → fallback → adapter and exclusion of unapproved narrative text. Run `pnpm test` and `pnpm test:integracion`.
