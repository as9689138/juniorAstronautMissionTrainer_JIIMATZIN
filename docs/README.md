# Documentación técnica

Se actualiza junto con el código (un commit `docs(...)` por cambio relevante). Los diagramas usan Mermaid: en VS Code se ven con la vista previa de Markdown.

| Documento | Contenido |
| --- | --- |
| [02-arquitectura.md](02-arquitectura.md) | Screaming architecture + MVC, componentes, flujo de carga, despliegue |
| [03-modelo-datos.md](03-modelo-datos.md) | Diagrama entidad-relación y reglas de datos |
| [04-api.md](04-api.md) | Endpoints, errores y ejemplos |
| [05-importacion.md](05-importacion.md) | Flujo del importador y política de calidad |
| [06-produccion.md](06-produccion.md) | Variables de entorno, despliegue y lista de comprobación |
| [07-google-cloud.md](07-google-cloud.md) | Despliegue en Google Cloud (Firebase Hosting, Cloud Run, Cloud SQL) y los datos de los jugadores |
| [10-diccionario-bd.md](10-diccionario-bd.md) | Propósito, columnas, tipos, PK, FK y restricciones de las tablas de ciencia |
| [11-diagrama-er.md](11-diagrama-er.md) | Diagrama completo de ciencia y su fuente Mermaid |
| [12-contenido-juego.md](12-contenido-juego.md) | Importación del desglose, catálogos versionados, escenarios y contrato del frontend |
| [13-modelo-juego.md](13-modelo-juego.md) | Diccionario y relaciones de las 19 tablas de juego |
| [14-flujos-backend.md](14-flujos-backend.md) | 16 diagramas Mermaid de los flujos del sistema: backend, partidas, IA guía, ciclo del sol y despliegue (fuentes en `diagramas/flujo-*.mmd`) |
| [15-frontend.md](15-frontend.md) | Arquitectura del juego en Phaser: capas, bus de eventos, un sol de juego, carga y despliegue |
| [16-aprendizaje-partidas.md](16-aprendizaje-partidas.md) | IA guía (BKT y política de ayuda), esquema `aprendizaje`, guardado anónimo y privacidad |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | Commits, ramas y flujo |
| [en/README.md](en/README.md) | **English documentation** (traducción de los documentos principales) |

## Cómo mantener esta documentación

- Cambias una ruta → actualiza `04-api.md` y el contrato de su recurso en `contrato/`.
- Cambias una migración → actualiza el diagrama de `03-modelo-datos.md` y regenera `10`/`11` con `node scripts/documentar-bd.mjs`. El esquema `aprendizaje` se documenta a mano en `16-aprendizaje-partidas.md` (el generador no lo cubre).
- Cambias un flujo → edita su `diagramas/flujo-NN-*.mmd` y copia el contenido al bloque correspondiente de `14-flujos-backend.md`; haz lo mismo en `en/14-system-flows.md`.
- Cada documento en español tiene su traducción en `en/`: actualiza ambos en el mismo commit.
- Las decisiones, diseños previos y revisiones del equipo viven en `docs-internos/` (solo local, fuera del repositorio).
