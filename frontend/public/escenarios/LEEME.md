# Respaldo de escenarios (sin conexión)

Aquí va el JSON que exporta el backend del equipo (`pnpm escenarios -- exportar ...`), con el mismo formato que
`GET /api/v1/scenarios/{id}` (contrato 2). Si la API no responde, el adaptador (`src/api`) lo busca en:

- `escenarios/base-marte-uno.json` (la última versión)
- `escenarios/base-marte-uno/v<versión>.json` (una revisión exacta)

Solo se ponen aquí exportaciones reales del equipo: no inventar datos. Sin API ni respaldo, el juego usa su contenido
propio y no muestra "Marte real".
