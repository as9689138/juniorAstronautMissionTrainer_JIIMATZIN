# JIIMATZIN — Junior Astronaut Mission Trainer

Aventura web 2D para niños de 7 a 12 años. Durante diez soles, el jugador administra una base en Marte: reparte energía, cuida el oxígeno y el blindaje, resuelve minijuegos y decide cómo responder a emergencias. Cada decisión tiene costos, y cada noche el juego explica el porqué con **datos reales de misiones de la NASA**.

Proyecto para NASA Space Apps Challenge 2026 · *Build a Junior Astronaut Mission Trainer*.

## Cómo funciona

```mermaid
flowchart LR
    N[Datos NASA<br/>REMS · DONKI · OSDR · NOAA] --> I[Importador]
    I --> DB[(PostgreSQL<br/>ciencia · juego)]
    DB --> API[API de contenido<br/>Node.js + Express]
    API -- "escenarios · fichas · fuentes" --> J[Juego en Phaser]
    J --> K[Jugador]
    J -- "IA guía: partida anónima" --> API
    API --> AP[(PostgreSQL<br/>aprendizaje)]
```

- **Escenarios:** condiciones ambientales y eventos reales (clima espacial, temperatura y presión en Marte) seleccionados para cada sol del juego.
- **Fichas «Dato real»:** explicaciones para niños, respaldadas por evidencia y con la fuente a la vista.
- **Procedencia:** cada dato conserva su origen, su fecha y su calidad; los valores faltantes nunca se convierten en medidas.
- **IA guía:** mide cuánto domina el niño cuatro temas (Bayesian Knowledge Tracing), adapta la ayuda y guarda cada partida de forma anónima para estudiar cómo se aprende con el juego.
- **Modo histórico:** el juego presenta datos de capturas fechadas y lo indica de forma explícita.

## Estructura

```
jiimatzin/
├── backend/          API de contenido (Node.js, Express 5, PostgreSQL)
│   ├── migrations/   esquema versionado (6 migraciones)
│   └── src/
│       ├── escenarios/        misiones y condiciones
│       ├── fichas/            fichas «Dato real» y su evidencia
│       ├── fuentes/           procedencia y atribución
│       ├── donki/             llamaradas solares casi en tiempo real
│       ├── partidas/          partidas anónimas del juego (única escritura)
│       ├── salud/             estado del servicio
│       ├── importador/        carga del paquete científico
│       ├── contenido/         carga de los catálogos del juego
│       ├── publicaciones/     validar, publicar y retirar contenido científico
│       ├── compartido/        errores de aplicación
│       └── infraestructura/   configuración, base de datos y middlewares
├── frontend/         juego en Phaser, IA guía y adaptador de la API
├── contrato/         JSON Schema del escenario, compartido por back y front
├── docs/             documentación técnica con diagramas
└── scripts/          validación de commits y de gestor de paquetes
```

Cada funcionalidad del backend reúne su modelo, vista JSON, controlador, rutas y repositorio. Detalle en [backend/README.md](backend/README.md).

## Puesta en marcha

Requisitos: Node ≥ 22.9, pnpm (`corepack enable`) y Docker (o un PostgreSQL local).

```bash
cp .env.example .env
pnpm install
pnpm db:up
pnpm migrar
pnpm dev:back
```

Comprobar: <http://localhost:3000/health> y <http://localhost:3000/api/v1/scenarios>.

| Comando | Qué hace |
| --- | --- |
| `pnpm dev:back` | API con recarga automática (puerto 3000) |
| `pnpm dev:front` | Servidor de desarrollo del frontend |
| `pnpm db:up` / `db:down` | Inicia / detiene PostgreSQL 17 en Docker (puerto 5433) |
| `pnpm migrar` / `migrar:revertir` | Aplica / revierte migraciones |
| `pnpm test` | Pruebas del backend (sin PostgreSQL) |
| `pnpm test:integracion` | Pruebas con PostgreSQL temporal |

Con un PostgreSQL propio: apunta `DATABASE_URL` en `.env` a tu instancia, omite `pnpm db:up` y ejecuta `pnpm migrar`.

## API

| Ruta | Respuesta |
| --- | --- |
| `GET /health` · `GET /health/listo` | Estado del servicio y de la base de datos |
| `GET /api/v1/scenarios` | Escenarios publicados |
| `GET /api/v1/scenarios/{id}?version=` | Escenario completo con condiciones y fichas |
| `GET /api/v1/facts/{id}?lang=` | Ficha con evidencias y referencias |
| `GET /api/v1/sources/{id}` | Atribución y contexto de una fuente |
| `GET /api/v1/live/donki/flares` | Llamaradas solares recientes (DONKI en vivo) |
| `POST /api/v1/partidas` | Guarda una partida anónima del juego (única escritura) |

Formato y errores en [docs/04-api.md](docs/04-api.md).

## Calidad y producción

- API de lectura con una única escritura (`POST /api/v1/partidas`, anónima, validada de forma estricta y limitada a 64 KB), SQL parametrizado, `helmet`, CORS cerrado, límite de peticiones y caché controlada.
- En producción toda la configuración llega por variables de entorno y la API rechaza arrancar con valores inseguros. Ver [docs/06-produccion.md](docs/06-produccion.md).
- Pruebas automatizadas de rutas, validación, errores y configuración (58 sin base de datos, más las de integración).

## Hoja de ruta

1. **Base de datos e importadores:** hecho. Modelos `ciencia`, `juego` y `aprendizaje`, cargas idempotentes y controles de publicación. Ver [importación científica](docs/05-importacion.md) y [contenido del juego](docs/12-contenido-juego.md).
2. **Escenarios:** hecho. Endpoints conectados a `ciencia` mediante `juego`, contrato 2, versiones de reglas, catálogo fijado y respaldo estático. La publicación de la misión y sus parámetros editoriales se administran por CLI.
3. **Integración con el juego:** hecho. El juego en Phaser carga el escenario desde la API (con respaldo), muestra las fichas «Dato real», las llamaradas de DONKI y guarda partidas anónimas. Ver [arquitectura del frontend](docs/15-frontend.md).
4. **Despliegue:** el juego se publica en GitHub Pages con cada push a `main`. La API en Google Cloud (Cloud Run y Cloud SQL) está documentada en [docs/07-google-cloud.md](docs/07-google-cloud.md), pero aún no se ha ejecutado.
5. **Pendiente:** publicar el primer escenario con datos reales, revisión por hablantes nativos de los textos en inglés y decidir la política de conservación de las partidas.

## Documentación y colaboración

- Índice técnico: [docs/README.md](docs/README.md)
- English documentation: [README.en.md](README.en.md) and [docs/en/](docs/en/README.md)
- Convención de commits y ramas: [CONTRIBUTING.md](CONTRIBUTING.md)
- Solo se usa **pnpm**: con npm o yarn la instalación se detiene.
