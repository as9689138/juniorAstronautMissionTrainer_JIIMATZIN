# Documentación técnica

Se actualiza junto con el código (un commit `docs(...)` por cambio relevante). Los diagramas usan Mermaid: en VS Code se ven con la vista previa de Markdown.

| Documento | Contenido |
| --- | --- |
| [02-arquitectura.md](02-arquitectura.md) | Screaming architecture + MVC, componentes, flujo de carga, despliegue |
| [03-modelo-datos.md](03-modelo-datos.md) | Diagrama entidad-relación y reglas de datos |
| [04-api.md](04-api.md) | Endpoints, errores y ejemplos |
| [05-importacion.md](05-importacion.md) | Flujo del importador y política de calidad |
| [06-produccion.md](06-produccion.md) | Variables de entorno, despliegue y lista de comprobación |
| [10-diccionario-bd.md](10-diccionario-bd.md) | Propósito, columnas, tipos, PK, FK y restricciones de las tablas de ciencia |
| [11-diagrama-er.md](11-diagrama-er.md) | Diagrama completo de ciencia y su fuente Mermaid |
| [12-contenido-juego.md](12-contenido-juego.md) | Importación del desglose, catálogos versionados, escenarios y contrato del frontend |
| [13-modelo-juego.md](13-modelo-juego.md) | Diccionario y relaciones de las 19 tablas de juego |
| [14-flujos-backend.md](14-flujos-backend.md) | 12 diagramas Mermaid de los flujos del backend (fuentes en `diagramas/flujo-*.mmd`) |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | Commits, ramas y flujo |

## Cómo mantener esta documentación

- Cambias una ruta → actualiza `04-api.md` y el contrato de su recurso en `contrato/`.
- Cambias una migración → actualiza el diagrama de `03-modelo-datos.md` y regenera `10`/`11` con `node scripts/documentar-bd.mjs`.
- Las decisiones, diseños previos y revisiones del equipo viven en `docs-internos/` (solo local, fuera del repositorio).
