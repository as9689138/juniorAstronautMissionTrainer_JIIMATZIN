# Technical documentation (English)

English translation of the main technical documents. The Spanish originals in [../](../README.md) are the reference and are updated together with the code (one `docs(...)` commit per relevant change). Diagrams use Mermaid; in VS Code they render in the Markdown preview.

Folder and identifier names in the code are in Spanish (`escenarios` = scenarios, `fichas` = fact cards, `fuentes` = sources, `partidas` = game sessions, `ciencia` = science, `juego` = game, `aprendizaje` = learning). A glossary is at the end of this page.

| Document | Contents |
| --- | --- |
| [02-architecture.md](02-architecture.md) | Screaming architecture + MVC, components, front ↔ back connection, deployment |
| [03-data-model.md](03-data-model.md) | The four database schemas and the rules built into the data model |
| [04-api.md](04-api.md) | Endpoints, errors and examples |
| [05-import.md](05-import.md) | Scientific package importer and quality policy |
| [06-production.md](06-production.md) | Environment variables, hardening and checklist |
| [07-google-cloud.md](07-google-cloud.md) | Google Cloud deployment (Firebase Hosting, Cloud Run, Cloud SQL) and player data |
| [12-game-content.md](12-game-content.md) | Game catalogue import, scenarios and the front-end contract |
| [14-system-flows.md](14-system-flows.md) | 16 Mermaid diagrams of the system flows |
| [15-frontend.md](15-frontend.md) | Phaser game architecture |
| [16-learning-and-sessions.md](16-learning-and-sessions.md) | Guide AI (BKT and help policy), `aprendizaje` schema, anonymous saving and privacy |

## Spanish-only references

These documents are generated from the migrations or are long tables of the schema; they are kept in Spanish and regenerated with `node scripts/documentar-bd.mjs`.

| Document | Contents |
| --- | --- |
| [10-diccionario-bd.md](../10-diccionario-bd.md) | Purpose, columns, types, PK, FK and constraints of the 28 `ciencia` tables |
| [11-diagrama-er.md](../11-diagrama-er.md) | Complete entity–relationship diagram of `ciencia` |
| [13-modelo-juego.md](../13-modelo-juego.md) | Dictionary and relationships of the 19 `juego` tables |
| [../../CONTRIBUTING.md](../../CONTRIBUTING.md) | Commits, branches and workflow |

Table and column names inside these files are the real identifiers (mostly English for `ciencia`, Spanish for `juego` and `aprendizaje`).

## Keeping the documentation up to date

- Change a route → update `04-api.md` (both languages) and the resource contract in `contrato/`.
- Change a migration → update the diagram in `03-data-model.md` and regenerate `10`/`11` with `node scripts/documentar-bd.mjs`. The `aprendizaje` schema is documented by hand in `16-learning-and-sessions.md`.
- Change a flow → edit its `docs/diagramas/flujo-NN-*.mmd` source, copy it into the matching block of `14-flujos-backend.md` and translate it into `14-system-flows.md`.
- Decisions, earlier designs and team reviews live in `docs-internos/` (local only, outside the repository).

## Glossary

| Spanish | English |
| --- | --- |
| sol | Martian day |
| escenario | scenario (a mission: ten sols with real conditions) |
| ficha («Dato real») | fact card ("Real data") |
| fuente | source |
| partida | game session (one playthrough) |
| prueba | learning probe (one scored task: minigame, console allocation or emergency decision) |
| dominio | mastery (probability that the child knows a topic) |
| IA guía | guide AI (the robot companion and its learning model) |
| respaldo estático | static fallback |
| desglose | game breakdown (the team's game-content export) |
| paquete científico | scientific package |
