# Flujos del sistema (diagramas)

Diagramas Mermaid del comportamiento actual del backend y de las partes del juego que se conectan con él
(partidas anónimas, IA guía, ciclo del sol y despliegue), listos para el entregable. Cada uno
tiene su fuente independiente en [diagramas/](diagramas/) (`flujo-NN-*.mmd`) y se ve con la
vista previa de Markdown de VS Code. Reflejan el código en `backend/src/`, `frontend/src/` y las
migraciones; si cambia un flujo, se actualiza el diagrama junto con el código. Versión en inglés:
[en/14-system-flows.md](en/14-system-flows.md).

| N.º | Diagrama | Qué responde |
| --- | --- | --- |
| 1 | [Panorama](#1-panorama-del-sistema) | Qué piezas hay y cómo se conectan |
| 2 | [Ciclo de vida del contenido](#2-ciclo-de-vida-del-contenido-de-punta-a-punta) | Del paquete de datos a lo que ve el juego |
| 3 | [Importación científica](#3-importación-del-paquete-científico) | Cómo se carga el paquete sin corromper datos |
| 4 | [Publicación científica](#4-estados-de-la-publicación-científica) | Cuándo un paquete puede publicarse |
| 5 | [Importación del juego](#5-importación-de-los-catálogos-del-juego) | Cómo se cargan personajes, minijuegos, cartas… |
| 6 | [Estados del escenario](#6-estados-de-un-escenario) | Borrador, publicado y retirado |
| 7 | [Petición HTTP](#7-recorrido-de-una-petición-http) | Capas, validación y errores de la API |
| 8 | [Consulta de escenario](#8-consulta-de-un-escenario) | Qué ocurre en `GET /scenarios/{id}` |
| 9 | [Ficha científica](#9-cuándo-se-sirve-una-ficha) | Condiciones para devolver o negar una ficha |
| 10 | [DONKI en vivo](#10-fulguraciones-donki-en-vivo) | Caché, petición única y copia obsoleta |
| 11 | [Carga en el frontend](#11-carga-del-escenario-en-el-frontend) | API primero, respaldo estático después |
| 12 | [Arranque y cierre](#12-arranque-y-cierre-del-servidor) | Validación de entorno y cierre ordenado |
| 13 | [Guardado de una partida](#13-guardado-de-una-partida-anónima) | Cola local, validación estricta y escritura atómica |
| 14 | [Ciclo de un sol](#14-ciclo-de-un-sol-en-el-juego) | Mañana, día, emergencia y noche en el juego |
| 15 | [IA guía](#15-la-ia-guía-mide-y-adapta-la-ayuda) | Del acierto del niño a la ayuda que recibe |
| 16 | [Despliegue](#16-despliegue) | Dónde vive cada pieza en producción |

## 1. Panorama del sistema

El contenido entra solo por comandos administrativos (nunca por HTTP). La API es de lectura y tiene **una sola
escritura**: `POST /api/v1/partidas`, que guarda partidas anónimas del juego en el esquema `aprendizaje`; solo el equipo
las lee, con el CLI `partidas`. La única consulta a un servicio externo es DONKI, y no se guarda en la base de datos.

<!-- archivo: flujo-01-panorama -->
```mermaid
flowchart LR
    subgraph Entradas["Entradas administrativas (CLI, sin HTTP)"]
        ZIP["Paquete científico ZIP<br/>SHA-256 externo"]
        DES["Desglose del juego<br/>JSON + CSV opcional"]
    end

    subgraph CLI["backend/ comandos"]
        IMP["importar"]
        PUB["publicaciones<br/>validar · publicar · retirar"]
        CON["contenido<br/>validar · importar"]
        ESC["escenarios<br/>preparar · crear · publicar<br/>retirar · exportar"]
        PAR["partidas<br/>resumen · exportar · borrar"]
    end

    subgraph DB["PostgreSQL"]
        CIE[("esquema ciencia<br/>datos, fichas, revisiones")]
        JUE[("esquema juego<br/>catálogos y escenarios")]
        APR[("esquema aprendizaje<br/>partidas anónimas y pruebas")]
    end

    subgraph API["API Express (lectura y una escritura anónima)"]
        RS["/api/v1/scenarios"]
        RF["/api/v1/facts"]
        RU["/api/v1/sources"]
        RD["/api/v1/live/donki/flares"]
        RP["POST /api/v1/partidas"]
        RH["/health"]
    end

    NASA["NASA DONKI<br/>API oficial"]
    FRONT["Frontend Phaser<br/>src/api"]
    RESP["frontend/public/escenarios<br/>respaldo estático"]

    ZIP --> IMP --> CIE
    ZIP --> PUB --> CIE
    DES --> CON --> JUE
    ESC --> JUE
    ESC -- exportar --> RESP

    CIE --> RF
    CIE --> RU
    CIE --> RS
    JUE --> RS
    RD -- consulta en vivo --> NASA

    RS --> FRONT
    RF --> FRONT
    RD --> FRONT
    RESP -. si la API falla .-> FRONT

    FRONT -- "IA guía: partida anónima" --> RP
    RP --> APR
    APR --> PAR
```

## 2. Ciclo de vida del contenido de punta a punta

Muestra el orden real de los pasos y qué paso exige el siguiente. Un escenario solo llega al juego
cuando la ciencia que referencia está publicada y revisada por una persona.

<!-- archivo: flujo-02-ciclo-contenido -->
```mermaid
flowchart TD
    A["Paso 1 · importar<br/>carga el ZIP en ciencia"] --> B["Publicación en estado candidate"]
    B --> C["Paso 2 · Revisión humana de cada ficha<br/>decisión registrada en fact_reviews"]
    C --> D["Paso 3 · publicaciones validar<br/>compara la BD contra el ZIP"]
    D --> E{"¿Técnica correcta<br/>y sin fichas pendientes?"}
    E -- no --> F["Informe con bloqueos<br/>sigue en candidate"]
    F --> C
    E -- sí --> G["Paso 4 · publicaciones publicar<br/>sella la publicación"]

    H["Paso 5 · contenido importar<br/>catálogo del juego sellado"] --> I
    G --> I["Paso 6 · escenarios preparar<br/>arma la definición con catálogo + publicación"]
    I --> J["Paso 7 · escenarios crear<br/>borrador"]
    J --> K["Paso 8 · escenarios publicar<br/>valida el contrato de salida"]
    K --> L["Paso 9 · escenarios exportar<br/>respaldo JSON versionado"]
    K --> M["API sirve el escenario<br/>GET /api/v1/scenarios"]
    L --> N["Frontend usa el respaldo<br/>si la API no responde"]
    M --> N
```

## 3. Importación del paquete científico

`pnpm importar` verifica antes de escribir, carga todo en una transacción y es repetible:
volver a cargar el mismo paquete no duplica ni sobrescribe nada. Un contenido distinto con la
misma identidad aborta la carga.

<!-- archivo: flujo-03-importacion-cientifica -->
```mermaid
flowchart TD
    S(["pnpm importar --archivo --sha256"]) --> P["Abrir paquete<br/>verifica SHA-256 externo y rutas seguras<br/>sin ejecutar el pipeline del ZIP"]
    P --> V["Validación previa completa<br/>contratos, política de calidad,<br/>conteos y vínculos"]
    V -- falla --> X1(["Aborta antes de tocar la BD"])
    V --> L["Bloqueo de asesoría<br/>una sola carga a la vez"]
    L --> R["Registrar la publicación<br/>solo si es candidate"]
    R --> Q{"¿Ya existe con<br/>otro contenido?"}
    Q -- sí --> X2(["Conflicto de contenido: aborta"])
    Q -- no --> RUN["Registrar intento<br/>import_runs = running"]
    RUN --> T["Transacción<br/>tablas temporales por lote"]
    T --> M["Insertar en orden de dependencias<br/>ON CONFLICT DO NOTHING"]
    M --> C{"¿Lo existente coincide<br/>con lo entrante?"}
    C -- no --> RB["ROLLBACK<br/>import_runs = failed + error"]
    C -- sí --> K["Comprobar linaje, conteos<br/>y estadísticas horarias"]
    K -- falla --> RB
    K -- ok --> OK["COMMIT<br/>import_runs = succeeded"]
    OK --> END(["Publicación sigue en candidate<br/>no se aprueban fichas"])
```

## 4. Estados de la publicación científica

La publicación nace `candidate`. Validar no cambia su estado: solo registra un informe. Publicar
exige validación técnica correcta y que cada ficha usada tenga una última decisión humana de
aprobación.

<!-- archivo: flujo-04-estados-publicacion -->
```mermaid
stateDiagram-v2
    [*] --> candidate: importar
    candidate --> candidate: validar<br/>registra informe checked
    candidate --> published: publicar<br/>técnica OK y sin fichas pendientes
    published --> retired: retirar<br/>exige motivo
    retired --> [*]

    note right of candidate
        Bloqueos de publicación:
        contenido inconsistente con el ZIP,
        fichas sin aprobación humana vigente,
        evidencia sin verificar.
    end note
    note right of published
        Contenido e historial inmutables.
        Retirar oculta la publicación
        y los escenarios que dependen de ella.
    end note
```

## 5. Importación de los catálogos del juego

El catálogo se identifica por el hash de su contenido ordenado (`cat_<sha256>`). Importar dos veces
el mismo desglose no cambia nada; un cambio genera un catálogo nuevo.

<!-- archivo: flujo-05-importacion-juego -->
```mermaid
flowchart TD
    S(["pnpm contenido importar<br/>--archivo --sha256 --actor"]) --> F["Leer desglose<br/>máx. 5 MiB, SHA-256 externo"]
    F --> Z["Validar esquema<br/>personajes, recursos, soles, minijuegos,<br/>emergencias, cartas, finales, datos"]
    Z -- falla --> X1(["Aborta con el motivo"])
    Z --> CSV{"¿Hay carpeta CSV?"}
    CSV -- sí --> CC["Comparar cada CSV con el JSON<br/>conteos, IDs y valores"]
    CC -- difiere --> X1
    CC --> ID
    CSV -- no --> ID["catalog_id = cat_ + SHA-256<br/>del contenido ordenado"]
    ID --> TX["Transacción con bloqueo"]
    TX --> E{"¿El catálogo<br/>ya existe?"}
    E -- sí --> CMP["Comparar lo persistido<br/>con el contenido"]
    E -- no --> INS["Insertar catálogo y 11 tablas<br/>recursos, personajes, minijuegos…"]
    INS --> CMP
    CMP -- inconsistente --> RB(["ROLLBACK"])
    CMP -- coincide --> SEAL["Sellar catálogo<br/>sealed = true"]
    SEAL --> OK(["COMMIT: created true o false"])
```

## 6. Estados de un escenario

Un escenario es una versión inmutable que fija la publicación científica, las revisiones de fichas
y las reglas del juego. Cada cambio de estado queda en la bitácora de eventos.

<!-- archivo: flujo-06-estados-escenario -->
```mermaid
stateDiagram-v2
    [*] --> draft: escenarios crear<br/>evento created
    draft --> draft: crear de nuevo con el mismo contenido<br/>idempotente
    draft --> published: escenarios publicar<br/>valida el contrato de salida
    published --> retired: escenarios retirar<br/>exige motivo
    retired --> [*]

    note right of draft
        El borrador no aparece en la API
        ni se exporta.
    end note
    note right of published
        Visible en la API y exportable.
        Reglas, condiciones y fichas
        quedan inmutables.
    end note
```

## 7. Recorrido de una petición HTTP

Cada recurso sigue las mismas capas. La validación ocurre en el controlador, el SQL solo en el
repositorio y el formato público solo en la vista. `partidas` es la única ruta `POST`: valida con
un esquema estricto (rechaza campos de más), acepta cuerpos de hasta 64 KB y responde 201, 200 o 409.

<!-- archivo: flujo-07-peticion-http -->
```mermaid
flowchart TD
    REQ(["Petición GET, o POST /partidas"]) --> H["helmet<br/>cabeceras de seguridad"]
    H --> CO["cors<br/>GET, HEAD, POST y OPTIONS"]
    CO --> LOG["registro de solicitudes"]
    LOG --> RT{"¿Ruta?"}
    RT -- "/health" --> SALUD["salud<br/>sin caché"]
    RT -- "/api/v1/..." --> RL["límite de peticiones por IP"]
    RL -- excedido --> E429(["429 demasiadas_peticiones"])
    RL --> CA["Cache-Control público<br/>CACHE_SECONDS<br/>(partidas: sin caché)"]
    CA --> ROUTER["router del recurso<br/>scenarios · facts · sources · live/donki · partidas"]
    RT -- otra --> E404R(["404 ruta_no_encontrada"])

    ROUTER --> CT["controlador<br/>valida con zod<br/>(partidas: estricto, cuerpo máx. 64 KB)"]
    CT -- inválido --> E400(["400 consulta_invalida<br/>con detalles por campo<br/>413 si el cuerpo supera 64 KB"])
    CT --> MO["modelo<br/>caso de uso"]
    MO --> RP["repositorio<br/>SQL parametrizado, una sola sentencia"]
    RP --> PG[("PostgreSQL")]
    PG --> RP
    RP --> MO
    MO -- no existe --> E404(["404 recurso no encontrado"])
    MO -- "partida de otro jugador" --> E409(["409 partida_de_otro_jugador"])
    MO --> VI["vista<br/>proyección JSON del contrato"]
    VI --> OK(["200 JSON<br/>201 al crear una partida"])

    MO -. error inesperado .-> E500(["500 error_interno<br/>sin detalles"])
```

## 8. Consulta de un escenario

Una sola sentencia lee el escenario, sus condiciones, fichas, procedencia y catálogo del juego en
la misma instantánea de PostgreSQL. Sin `version`, devuelve la publicada más reciente.

<!-- archivo: flujo-08-consulta-escenario -->
```mermaid
sequenceDiagram
    participant C as Cliente
    participant R as Ruta y controlador
    participant M as Modelo
    participant P as Repositorio
    participant B as PostgreSQL
    participant V as Vista

    C->>R: GET /api/v1/scenarios/{id}?version=n
    R->>R: valida id y version con zod
    alt parámetros inválidos
        R-->>C: 400 consulta_invalida
    else parámetros válidos
        R->>M: obtener(id, version)
        M->>P: buscarPublicado(id, version)
        P->>B: una sentencia
        Note over P,B: escenario publicado de la vista available_scenarios<br/>+ condiciones y fichas de ciencia<br/>+ reglas + catálogo del juego sellado
        B-->>P: fila o ninguna
        alt no hay escenario publicado
            M-->>R: ErrorNoEncontrado
            R-->>C: 404 escenario_no_encontrado
        else existe
            P-->>M: datos internos
            M-->>R: datos internos
            R->>V: presentarEscenario()
            V-->>R: JSON del contrato 2
            R-->>C: 200 sin caché
        end
    end
```

## 9. Cuándo se sirve una ficha

La API nunca toma el estado del paquete como aprobación: manda la última decisión humana. Una
aprobación vieja no se salta un rechazo o una revisión pendiente posterior.

<!-- archivo: flujo-09-ficha-aprobada -->
```mermaid
flowchart TD
    S(["GET /api/v1/facts/{id}?lang=es&recordId="]) --> V{"¿Parámetros válidos?<br/>id, lang de 2 letras,<br/>recordId SHA-256 opcional"}
    V -- no --> E400(["400 consulta_invalida"])
    V -- sí --> F{"¿Existe la ficha<br/>en ese idioma?"}
    F -- no --> E404(["404"])
    F -- sí --> R{"¿La última revisión<br/>es approved?"}
    R -- no --> E404
    R -- sí --> Q{"¿Calidad accepted<br/>o not_applicable?"}
    Q -- no --> E404
    Q -- sí --> EV{"¿Tiene al menos una evidencia<br/>y todas verificadas?"}
    EV -- no --> E404
    EV -- sí --> ID{"¿Viene recordId?"}
    ID -- sí --> EXA["Solo esa revisión exacta"]
    ID -- no --> LAT["La aprobada más reciente"]
    EXA --> OK
    LAT --> OK(["200 ficha + límites + evidencias<br/>Cache-Control no-store"])
```

## 10. Fulguraciones DONKI en vivo

DONKI es casi en tiempo real. El servidor cachea por ventana de fechas, hace una sola petición a
NASA por ventana aunque lleguen varias a la vez y, si NASA falla, sirve la última copia buena
(hasta 1 hora) marcada como obsoleta.

<!-- archivo: flujo-10-donki-en-vivo -->
```mermaid
flowchart TD
    S(["GET /api/v1/live/donki/flares<br/>days o startDate y endDate"]) --> V{"¿Ventana válida?<br/>sin mezclar days y fechas,<br/>no futura, rango máximo"}
    V -- no --> E400(["400 consulta_invalida"])
    V -- sí --> C{"¿Copia en caché<br/>dentro del TTL?"}
    C -- sí --> HIT(["200 cache hit"])
    C -- no --> IF{"¿Ya hay una petición<br/>en vuelo para esta ventana?"}
    IF -- sí --> ESP["Esperar el mismo resultado"]
    IF -- no --> NASA["Pedir a NASA DONKI<br/>un solo intento, sin reintentos"]
    NASA -- ok --> N["Normalizar eventos<br/>y calcular huella del cuerpo"]
    ESP --> N
    N --> G["Guardar en caché<br/>máx. 50 ventanas"]
    G --> MISS(["200 cache miss"])
    NASA -- falla --> OB{"¿Hay copia previa<br/>de menos de 1 h?"}
    ESP -- falla --> OB
    OB -- sí --> STALE(["200 marcada stale"])
    OB -- no --> ERR(["502 · 503 · 504<br/>fuente externa no disponible,<br/>limitada o sin respuesta"])
```

## 11. Carga del escenario en el frontend

La API manda. El respaldo estático solo se usa ante una caída (red, tiempo agotado, respuesta no
válida, error 5xx o límite 429). Un 400 o 404 explícito de la API no se sustituye, para no servir
contenido retirado.

<!-- archivo: flujo-11-carga-frontend -->
```mermaid
sequenceDiagram
    participant J as Phaser
    participant A as cargarEscenario
    participant S as API Express
    participant R as Respaldo estático

    J->>A: cargarEscenario(id, version)
    A->>A: valida identidad pedida
    A->>S: GET /api/v1/scenarios/{id}
    alt la API responde 200
        S-->>A: JSON contrato 2
        A->>A: validarEscenario()
        A-->>J: escenario, origen api
    else 400 o 404 explícito
        S-->>A: error
        A-->>J: error, sin respaldo
    else caída: red, tiempo, 5xx, 429, JSON inválido
        S--xA: fallo
        A->>R: GET /escenarios/{id}/v{n}.json
        R-->>A: JSON versionado
        A->>A: validarEscenario() con la misma versión
        A-->>J: escenario, origen respaldo-local
    end
    Note over J: La partida conserva escenario y versión hasta terminar
```

## 12. Arranque y cierre del servidor

En producción la API no arranca con configuración insegura. El proceso se cierra de forma
ordenada y, ante un estado desconocido, se registra y sale para que el hosting lo reinicie.

<!-- archivo: flujo-12-arranque-cierre -->
```mermaid
flowchart TD
    A(["Inicio del proceso"]) --> ENV["Leer y validar variables de entorno<br/>zod en env.js"]
    ENV -- "inválidas o inseguras en producción" --> X(["No arranca"])
    ENV --> POOL["Crear pool PostgreSQL<br/>TLS, tope de conexiones, timeouts"]
    POOL --> APP["Crear app Express<br/>middlewares y rutas"]
    APP --> LIS["Escuchar en PORT<br/>tiempos máximos de petición"]
    LIS --> RUN{"En ejecución"}

    RUN -- "SIGINT o SIGTERM" --> CL["Cierre ordenado<br/>deja de aceptar y cierra conexiones"]
    RUN -- "excepción o promesa sin manejar" --> LOG["Registrar y cerrar con código 1<br/>el hosting reinicia el proceso"]
    RUN -- "error en conexión inactiva de la BD" --> IGN["Se registra<br/>el proceso continúa"]
    IGN --> RUN
    LOG --> CL
    CL --> POOLEND["Cerrar el pool"]
    POOLEND --> FIN(["Salida"])
    CL -. "pasados 10 s" .-> FORZ(["Salida forzada"])
```


## 13. Guardado de una partida anónima

La IA guía deja la partida en una cola local y la manda al terminar cada sol y la misión. El
servidor valida con un esquema estricto y escribe en una sola sentencia atómica; reenviar la
misma partida la actualiza y nunca la duplica. Si la partida pertenece a otro jugador, no se toca.

<!-- archivo: flujo-13-guardar-partida -->
```mermaid
sequenceDiagram
    participant G as IA guía (navegador)
    participant LS as localStorage
    participant API as POST /api/v1/partidas
    participant Z as Controlador (zod estricto)
    participant R as Repositorio
    participant B as PostgreSQL (aprendizaje)

    G->>LS: deja la partida como pendiente
    G->>API: JSON de máx. 64 KB (keepalive)
    API->>Z: valida el cuerpo
    alt campo de más, fuera de rango o más de 400 pruebas
        Z-->>G: 400 consulta_invalida, sin tocar la BD
        G->>LS: descarta la partida (la API no la acepta)
    else cuerpo válido
        Z->>R: guardar(datos)
        R->>B: una sola sentencia atómica
        Note over R,B: INSERT … ON CONFLICT (partida_id) DO UPDATE<br/>solo si jugador_id coincide<br/>borra pruebas sobrantes y reescribe las demás
        alt la partida es de otro jugador
            B-->>R: ninguna fila
            R-->>G: 409 partida_de_otro_jugador
        else nueva o del mismo jugador
            B-->>R: partida_id, nueva
            R-->>G: 201 si es nueva, 200 si se actualizó
            G->>LS: quita la partida de los pendientes
        end
    end
    Note over G,LS: Sin red, 429 o 5xx: la partida sigue pendiente<br/>y se reintenta en el siguiente guardado
```


## 14. Ciclo de un sol en el juego

Cada sol recorre mañana, día, emergencia y noche. La IA dicta la hora que ven el mapa y la interfaz;
el estado de las reglas (`GameState.fase`) y el reloj anunciado son distintos. Una partida termina
al completar el sol 10 o cuando un recurso (energía, oxígeno o blindaje) llega a cero.

<!-- archivo: flujo-14-ciclo-sol -->
```mermaid
stateDiagram-v2
    [*] --> Manana: iniciar partida (sol 1)
    Manana: MAÑANA
    Dia: DÍA
    Emergencia: EMERGENCIA
    Noche: NOCHE
    Fin: FIN

    Manana --> Dia: la IA anuncia la luz<br/>y se reparte la energía en la consola
    Dia --> Dia: tarea de la ruta del personaje<br/>(paneles · filtro de CO₂ · invernadero)
    Dia --> Emergencia: tres tareas hechas
    Emergencia --> Noche: decisión con cuenta atrás<br/>(el sol 1 es un tutorial sin emergencia)
    Noche --> Manana: dormir en el Refugio<br/>carta y sol siguiente
    Noche --> Fin: sol 10 completado
    Emergencia --> Fin: un recurso llega a cero
    Dia --> Fin: un recurso llega a cero
    Fin --> [*]: reporte final y medalla

    note right of Dia
        Cada minijuego, reparto de la consola
        y decisión de emergencia es una prueba
        de aprendizaje para la IA guía.
    end note
```


## 15. La IA guía mide y adapta la ayuda

Todo el machine learning del juego corre en el navegador. Cada prueba actualiza el dominio del tema
con Bayesian Knowledge Tracing; la política pedagógica elige el tipo de ayuda y, si hay varias
posibles, un bandido con muestreo de Thompson aprende cuál le funciona a ese niño. Solo el resumen
anónimo viaja a la API.

<!-- archivo: flujo-15-ia-guia -->
```mermaid
flowchart TD
    P(["Prueba del niño<br/>minijuego · reparto de la consola · emergencia"]) --> OBS["Rastreador.observar(tema, acierto, tipo)"]
    OBS --> BKT["BKT: actualiza P(L) del tema<br/>con G y S según el tipo de prueba<br/>(con pista previa se adivina más)"]
    BKT --> REG["Registra la prueba<br/>tema · tipo · antes · después"]
    BKT --> POL{"Política pedagógica<br/>según dominio y racha"}
    POL -- "flojo, menos de 0,4" --> A1["Pista concreta o ejemplo resuelto"]
    POL -- "falló 2 seguidas" --> A2["Ejemplo resuelto (andamiaje)"]
    POL -- "a medias, 0,4 a 0,7" --> A3["Pista general o concreta"]
    POL -- "dominado, desde 0,7" --> A4["Retira la ayuda y plantea un reto"]
    POL -- "tema sin practicar 2 soles" --> A5["Pregunta de repaso"]
    A1 --> TS
    A3 --> TS{"¿Más de una ayuda posible?"}
    TS -- sí --> BAN["Bandido de Bernoulli<br/>muestreo de Thompson Beta(éxitos+1, fallos+1)"]
    TS -- no --> DEC
    BAN --> DEC["Frase de la ayuda<br/>en el idioma elegido"]
    A2 --> DEC
    A4 --> DEC
    A5 --> DEC
    DEC --> NIN(["Niño: estrellas y palabras<br/>más tiempo o menos en lo flojo y lo dominado"])
    NIN -. "siguiente prueba del mismo tema" .-> REW["Recompensa: 1 si acierta, 0 si falla<br/>se guarda solo en este navegador"]
    REW -.-> BAN
    REG --> SOL["Fin del sol o de la misión"]
    SOL --> ENV["POST /api/v1/partidas<br/>anónima, con respaldo local"]
    SOL --> ADU(["Reporte para adultos<br/>dominio en %, aciertos, descarga"])
```


## 16. Despliegue

El juego es estático y puede publicarse en GitHub Pages (automático con cada push a `main`) o en Firebase
Hosting; con Firebase, `/api/**` y `/health` pasan por el mismo dominio a Cloud Run y no hace falta CORS.
La API y las migraciones salen de la misma imagen. Pasos en [07-google-cloud.md](07-google-cloud.md). Ambos sitios
ya están publicados: Google Cloud (<https://project-dd0f486a-7a8b-44de-86e.web.app>, con API y base de datos) y GitHub Pages (<https://as9689138.github.io/juniorAstronautMissionTrainer_JIIMATZIN/>, solo el juego estático).

<!-- archivo: flujo-16-despliegue -->
```mermaid
flowchart LR
    DEV["Equipo<br/>push a main"] --> GHA["GitHub Actions<br/>pages.yml: pnpm construir"]
    GHA --> GHP["GitHub Pages<br/>frontend/dist estático"]
    DEV -. "firebase deploy" .-> FH["Firebase Hosting<br/>frontend/dist"]
    DEV -. "gcloud builds submit" .-> AR["Artifact Registry<br/>imagen del Dockerfile"]
    AR --> CR["Cloud Run<br/>jiimatzin-api"]
    AR --> JOB["Cloud Run Job<br/>jiimatzin-migrar"]
    SM["Secret Manager<br/>DATABASE_URL"] --> CR
    SM --> JOB
    JOB -. "una vez por versión" .-> SQL[("Cloud SQL<br/>PostgreSQL 17")]
    CR -- "socket /cloudsql" --> SQL
    CR -- "HTTPS" --> NASA["NASA DONKI"]

    N["Navegador del niño"] --> GHP
    N --> FH
    FH -- "/api/** y /health<br/>mismo dominio, sin CORS" --> CR
    GHP -. "VITE_API_URL + CORS_ORIGINS<br/>dominios distintos" .-> CR
    EQ["Equipo (CLI partidas)<br/>Cloud SQL Auth Proxy"] -.-> SQL
```

