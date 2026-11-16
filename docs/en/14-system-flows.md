# System flows (diagrams)

> English version of [../14-flujos-backend.md](../14-flujos-backend.md). The standalone Mermaid sources in [../diagramas/](../diagramas/) have Spanish labels; the diagrams below are the translated copies.

Mermaid diagrams of the current behaviour of the back end and of the parts of the game that connect to it (anonymous sessions, guide AI, sol cycle and deployment), ready for the deliverable. They reflect the code in `backend/src/`, `frontend/src/` and the migrations; if a flow changes, its diagram is updated together with the code.

| No. | Diagram | What it answers |
| --- | --- | --- |
| 1 | [Overview](#1-system-overview) | Which pieces exist and how they connect |
| 2 | [Content life cycle](#2-end-to-end-content-life-cycle) | From the data package to what the game shows |
| 3 | [Scientific import](#3-importing-the-scientific-package) | How the package is loaded without corrupting data |
| 4 | [Scientific publication](#4-states-of-a-scientific-publication) | When a package can be published |
| 5 | [Game import](#5-importing-the-game-catalogues) | How characters, minigames, cards… are loaded |
| 6 | [Scenario states](#6-states-of-a-scenario) | Draft, published and retired |
| 7 | [HTTP request](#7-path-of-an-http-request) | API layers, validation and errors |
| 8 | [Scenario query](#8-querying-a-scenario) | What happens in `GET /scenarios/{id}` |
| 9 | [Fact card](#9-when-a-fact-card-is-served) | Conditions to return or deny a fact card |
| 10 | [Live DONKI](#10-live-donki-solar-flares) | Cache, single request and stale copy |
| 11 | [Front-end loading](#11-loading-the-scenario-in-the-front-end) | API first, static fallback second |
| 12 | [Start and shutdown](#12-server-start-and-shutdown) | Environment validation and orderly shutdown |
| 13 | [Saving a session](#13-saving-an-anonymous-session) | Local queue, strict validation and atomic write |
| 14 | [Sol cycle](#14-the-cycle-of-a-sol-in-the-game) | Morning, day, emergency and night in the game |
| 15 | [Guide AI](#15-the-guide-ai-measures-and-adapts-its-help) | From the child's answer to the help they get |
| 16 | [Deployment](#16-deployment) | Where each piece lives in production |

## 1. System overview

Content enters only through administrative commands (never through HTTP). The API reads and has **a single write**: `POST /api/v1/partidas`, which stores the game's anonymous sessions in the `aprendizaje` schema; only the team reads them, with the `partidas` CLI. The only query to an external service is DONKI, and it is not stored in the database.

```mermaid
flowchart LR
    subgraph Entradas["Administrative inputs (CLI, no HTTP)"]
        ZIP["Scientific package ZIP<br/>external SHA-256"]
        DES["Game breakdown<br/>JSON + optional CSV"]
    end

    subgraph CLI["backend/ commands"]
        IMP["importar"]
        PUB["publicaciones<br/>validar · publicar · retirar"]
        CON["contenido<br/>validar · importar"]
        ESC["escenarios<br/>preparar · crear · publicar<br/>retirar · exportar"]
        PAR["partidas<br/>resumen · exportar · borrar"]
    end

    subgraph DB["PostgreSQL"]
        CIE[("ciencia schema<br/>data, fact cards, reviews")]
        JUE[("juego schema<br/>catalogues and scenarios")]
        APR[("aprendizaje schema<br/>anonymous sessions and probes")]
    end

    subgraph API["Express API (reads and one anonymous write)"]
        RS["/api/v1/scenarios"]
        RF["/api/v1/facts"]
        RU["/api/v1/sources"]
        RD["/api/v1/live/donki/flares"]
        RP["POST /api/v1/partidas"]
        RH["/health"]
    end

    NASA["NASA DONKI<br/>official API"]
    FRONT["Phaser front end<br/>src/api"]
    RESP["frontend/public/escenarios<br/>static fallback"]

    ZIP --> IMP --> CIE
    ZIP --> PUB --> CIE
    DES --> CON --> JUE
    ESC --> JUE
    ESC -- export --> RESP

    CIE --> RF
    CIE --> RU
    CIE --> RS
    JUE --> RS
    RD -- live query --> NASA

    RS --> FRONT
    RF --> FRONT
    RD --> FRONT
    RESP -. if the API fails .-> FRONT

    FRONT -- "guide AI: anonymous session" --> RP
    RP --> APR
    APR --> PAR
```

## 2. End-to-end content life cycle

Shows the real order of the steps and which step requires the next. A scenario only reaches the game when the science it references is published and reviewed by a person.

```mermaid
flowchart TD
    A["Step 1 · importar<br/>loads the ZIP into ciencia"] --> B["Publication in candidate state"]
    B --> C["Step 2 · Human review of each fact card<br/>decision recorded in fact_reviews"]
    C --> D["Step 3 · publicaciones validar<br/>compares the database against the ZIP"]
    D --> E{"Technically correct<br/>and no pending fact cards?"}
    E -- no --> F["Report with blockers<br/>stays in candidate"]
    F --> C
    E -- yes --> G["Step 4 · publicaciones publicar<br/>seals the publication"]

    H["Step 5 · contenido importar<br/>sealed game catalogue"] --> I
    G --> I["Step 6 · escenarios preparar<br/>builds the definition from catalogue + publication"]
    I --> J["Step 7 · escenarios crear<br/>draft"]
    J --> K["Step 8 · escenarios publicar<br/>validates the output contract"]
    K --> L["Step 9 · escenarios exportar<br/>versioned JSON fallback"]
    K --> M["API serves the scenario<br/>GET /api/v1/scenarios"]
    L --> N["Front end uses the fallback<br/>if the API does not answer"]
    M --> N
```

## 3. Importing the scientific package

`pnpm importar` verifies before writing, loads everything in one transaction and is repeatable: loading the same package again neither duplicates nor overwrites anything. Different content with the same identity aborts the load.

```mermaid
flowchart TD
    S(["pnpm importar --archivo --sha256"]) --> P["Open the package<br/>verifies external SHA-256 and safe paths<br/>without running the ZIP's pipeline"]
    P --> V["Full pre-validation<br/>contracts, quality policy,<br/>counts and links"]
    V -- fails --> X1(["Aborts before touching the database"])
    V --> L["Advisory lock<br/>one load at a time"]
    L --> R["Record the publication<br/>only if candidate"]
    R --> Q{"Already exists with<br/>different content?"}
    Q -- yes --> X2(["Content conflict: aborts"])
    Q -- no --> RUN["Record the attempt<br/>import_runs = running"]
    RUN --> T["Transaction<br/>temporary tables in batches"]
    T --> M["Insert in dependency order<br/>ON CONFLICT DO NOTHING"]
    M --> C{"Does the existing data match<br/>the incoming data?"}
    C -- no --> RB["ROLLBACK<br/>import_runs = failed + error"]
    C -- yes --> K["Check lineage, counts<br/>and hourly statistics"]
    K -- fails --> RB
    K -- ok --> OK["COMMIT<br/>import_runs = succeeded"]
    OK --> END(["Publication stays in candidate<br/>no fact cards are approved"])
```

## 4. States of a scientific publication

The publication is born `candidate`. Validating does not change its state: it only records a report. Publishing requires a correct technical validation and that every fact card used has a latest human approval decision.

```mermaid
stateDiagram-v2
    [*] --> candidate: importar
    candidate --> candidate: validar<br/>records a checked report
    candidate --> published: publicar<br/>technical OK and no pending fact cards
    published --> retired: retirar<br/>requires a reason
    retired --> [*]

    note right of candidate
        Publication blockers:
        content inconsistent with the ZIP,
        fact cards without current human approval,
        unverified evidence.
    end note
    note right of published
        Content and history are immutable.
        Retiring hides the publication
        and the scenarios that depend on it.
    end note
```

## 5. Importing the game catalogues

The catalogue is identified by the hash of its sorted content (`cat_<sha256>`). Importing the same breakdown twice changes nothing; a change produces a new catalogue.

```mermaid
flowchart TD
    S(["pnpm contenido importar<br/>--archivo --sha256 --actor"]) --> F["Read the breakdown<br/>max. 5 MiB, external SHA-256"]
    F --> Z["Validate the schema<br/>characters, resources, sols, minigames,<br/>emergencies, cards, endings, data"]
    Z -- fails --> X1(["Aborts with the reason"])
    Z --> CSV{"Is there a CSV folder?"}
    CSV -- yes --> CC["Compare each CSV with the JSON<br/>counts, IDs and values"]
    CC -- differs --> X1
    CC --> ID
    CSV -- no --> ID["catalog_id = cat_ + SHA-256<br/>of the sorted content"]
    ID --> TX["Transaction with lock"]
    TX --> E{"Does the catalogue<br/>already exist?"}
    E -- yes --> CMP["Compare what is persisted<br/>with the content"]
    E -- no --> INS["Insert the catalogue and 11 tables<br/>resources, characters, minigames…"]
    INS --> CMP
    CMP -- inconsistent --> RB(["ROLLBACK"])
    CMP -- matches --> SEAL["Seal the catalogue<br/>sealed = true"]
    SEAL --> OK(["COMMIT: created true or false"])
```

## 6. States of a scenario

A scenario is an immutable version that pins the scientific publication, the fact-card revisions and the game rules. Every state change is recorded in the event log.

```mermaid
stateDiagram-v2
    [*] --> draft: escenarios crear<br/>created event
    draft --> draft: create again with the same content<br/>idempotent
    draft --> published: escenarios publicar<br/>validates the output contract
    published --> retired: escenarios retirar<br/>requires a reason
    retired --> [*]

    note right of draft
        A draft does not appear in the API
        and is not exported.
    end note
    note right of published
        Visible in the API and exportable.
        Rules, conditions and fact cards
        become immutable.
    end note
```

## 7. Path of an HTTP request

Every resource follows the same layers. Validation happens in the controller, SQL only in the repository and the public format only in the view. `partidas` is the only `POST` route: it validates with a strict schema (extra fields are rejected), accepts bodies of up to 64 KB and answers 201, 200 or 409.

```mermaid
flowchart TD
    REQ(["GET request, or POST /partidas"]) --> H["helmet<br/>security headers"]
    H --> CO["cors<br/>GET, HEAD, POST and OPTIONS"]
    CO --> LOG["request logging"]
    LOG --> RT{"Route?"}
    RT -- "/health" --> SALUD["health<br/>no cache"]
    RT -- "/api/v1/..." --> RL["per-IP rate limit"]
    RL -- exceeded --> E429(["429 demasiadas_peticiones"])
    RL --> CA["public Cache-Control<br/>CACHE_SECONDS<br/>(partidas: no cache)"]
    CA --> ROUTER["resource router<br/>scenarios · facts · sources · live/donki · partidas"]
    RT -- other --> E404R(["404 ruta_no_encontrada"])

    ROUTER --> CT["controller<br/>validates with zod<br/>(partidas: strict, body max. 64 KB)"]
    CT -- invalid --> E400(["400 consulta_invalida<br/>with per-field details<br/>413 if the body exceeds 64 KB"])
    CT --> MO["model<br/>use case"]
    MO --> RP["repository<br/>parameterised SQL, a single statement"]
    RP --> PG[("PostgreSQL")]
    PG --> RP
    RP --> MO
    MO -- does not exist --> E404(["404 resource not found"])
    MO -- "session belongs to another player" --> E409(["409 partida_de_otro_jugador"])
    MO --> VI["view<br/>JSON projection of the contract"]
    VI --> OK(["200 JSON<br/>201 when creating a session"])

    MO -. unexpected error .-> E500(["500 error_interno<br/>no details"])
```

## 8. Querying a scenario

A single statement reads the scenario, its conditions, fact cards, provenance and game catalogue in the same PostgreSQL snapshot. Without `version`, it returns the latest published.

```mermaid
sequenceDiagram
    participant C as Client
    participant R as Route and controller
    participant M as Model
    participant P as Repository
    participant B as PostgreSQL
    participant V as View

    C->>R: GET /api/v1/scenarios/{id}?version=n
    R->>R: validates id and version with zod
    alt invalid parameters
        R-->>C: 400 consulta_invalida
    else valid parameters
        R->>M: obtener(id, version)
        M->>P: buscarPublicado(id, version)
        P->>B: a single statement
        Note over P,B: published scenario from the available_scenarios view<br/>+ conditions and fact cards from ciencia<br/>+ rules + sealed game catalogue
        B-->>P: row or none
        alt no published scenario
            M-->>R: ErrorNoEncontrado
            R-->>C: 404 escenario_no_encontrado
        else exists
            P-->>M: internal data
            M-->>R: internal data
            R->>V: presentarEscenario()
            V-->>R: contract 2 JSON
            R-->>C: 200 no cache
        end
    end
```

## 9. When a fact card is served

The API never takes the package's status as approval: the latest human decision rules. An old approval does not skip a later rejection or pending review.

```mermaid
flowchart TD
    S(["GET /api/v1/facts/{id}?lang=es&recordId="]) --> V{"Valid parameters?<br/>id, 2-letter lang,<br/>optional SHA-256 recordId"}
    V -- no --> E400(["400 consulta_invalida"])
    V -- yes --> F{"Does the fact card exist<br/>in that language?"}
    F -- no --> E404(["404"])
    F -- yes --> R{"Is the latest review<br/>approved?"}
    R -- no --> E404
    R -- yes --> Q{"Quality accepted<br/>or not_applicable?"}
    Q -- no --> E404
    Q -- yes --> EV{"At least one piece of evidence<br/>and all verified?"}
    EV -- no --> E404
    EV -- yes --> ID{"Is a recordId given?"}
    ID -- yes --> EXA["Only that exact revision"]
    ID -- no --> LAT["The latest approved one"]
    EXA --> OK
    LAT --> OK(["200 fact card + limits + evidence<br/>Cache-Control no-store"])
```

## 10. Live DONKI solar flares

DONKI is near real time. The server caches per date window, makes a single request to NASA per window even if several arrive at once and, if NASA fails, serves the last good copy (up to 1 hour) marked as stale.

```mermaid
flowchart TD
    S(["GET /api/v1/live/donki/flares<br/>days or startDate and endDate"]) --> V{"Valid window?<br/>no mixing days and dates,<br/>not in the future, maximum range"}
    V -- no --> E400(["400 consulta_invalida"])
    V -- yes --> C{"Cached copy<br/>within the TTL?"}
    C -- yes --> HIT(["200 cache hit"])
    C -- no --> IF{"Is a request already<br/>in flight for this window?"}
    IF -- yes --> ESP["Wait for the same result"]
    IF -- no --> NASA["Ask NASA DONKI<br/>a single attempt, no retries"]
    NASA -- ok --> N["Normalise events<br/>and compute the body hash"]
    ESP --> N
    N --> G["Store in the cache<br/>max. 50 windows"]
    G --> MISS(["200 cache miss"])
    NASA -- fails --> OB{"Is there a previous copy<br/>under 1 h old?"}
    ESP -- fails --> OB
    OB -- yes --> STALE(["200 marked stale"])
    OB -- no --> ERR(["502 · 503 · 504<br/>external source unavailable,<br/>limited or unresponsive"])
```

## 11. Loading the scenario in the front end

The API rules. The static fallback is only used on an outage (network, timeout, invalid response, 5xx error or 429 limit). An explicit 400 or 404 from the API is not replaced, so retired content is never served.

```mermaid
sequenceDiagram
    participant J as Phaser
    participant A as cargarEscenario
    participant S as Express API
    participant R as Static fallback

    J->>A: cargarEscenario(id, version)
    A->>A: validates the requested identity
    A->>S: GET /api/v1/scenarios/{id}
    alt the API answers 200
        S-->>A: contract 2 JSON
        A->>A: validarEscenario()
        A-->>J: scenario, origin api
    else explicit 400 or 404
        S-->>A: error
        A-->>J: error, no fallback
    else outage: network, timeout, 5xx, 429, invalid JSON
        S--xA: failure
        A->>R: GET /escenarios/{id}/v{n}.json
        R-->>A: versioned JSON
        A->>A: validarEscenario() with the same version
        A-->>J: scenario, origin respaldo-local
    end
    Note over J: The session keeps the scenario and version until it ends
```

## 12. Server start and shutdown

In production the API does not start with insecure configuration. The process shuts down in an orderly way and, in an unknown state, logs and exits so the host restarts it.

```mermaid
flowchart TD
    A(["Process start"]) --> ENV["Read and validate environment variables<br/>zod in env.js"]
    ENV -- "invalid or insecure in production" --> X(["Does not start"])
    ENV --> POOL["Create the PostgreSQL pool<br/>TLS, connection cap, timeouts"]
    POOL --> APP["Create the Express app<br/>middleware and routes"]
    APP --> LIS["Listen on PORT<br/>maximum request times"]
    LIS --> RUN{"Running"}

    RUN -- "SIGINT or SIGTERM" --> CL["Orderly shutdown<br/>stops accepting and closes connections"]
    RUN -- "unhandled exception or promise" --> LOG["Log and exit with code 1<br/>the host restarts the process"]
    RUN -- "error on an idle database connection" --> IGN["Logged<br/>the process continues"]
    IGN --> RUN
    LOG --> CL
    CL --> POOLEND["Close the pool"]
    POOLEND --> FIN(["Exit"])
    CL -. "after 10 s" .-> FORZ(["Forced exit"])
```

## 13. Saving an anonymous session

The guide AI leaves the session in a local queue and sends it at the end of every sol and of the mission. The server validates with a strict schema and writes in a single atomic statement; re-sending the same session updates it and never duplicates it. If the session belongs to another player, nothing is touched.

```mermaid
sequenceDiagram
    participant G as Guide AI (browser)
    participant LS as localStorage
    participant API as POST /api/v1/partidas
    participant Z as Controller (strict zod)
    participant R as Repository
    participant B as PostgreSQL (aprendizaje)

    G->>LS: leaves the session as pending
    G->>API: JSON of max. 64 KB (keepalive)
    API->>Z: validates the body
    alt extra field, out of range or more than 400 probes
        Z-->>G: 400 consulta_invalida, database untouched
        G->>LS: discards the session (the API will not accept it)
    else valid body
        Z->>R: guardar(data)
        R->>B: a single atomic statement
        Note over R,B: INSERT … ON CONFLICT (partida_id) DO UPDATE<br/>only if jugador_id matches<br/>deletes surplus probes and rewrites the rest
        alt the session belongs to another player
            B-->>R: no rows
            R-->>G: 409 partida_de_otro_jugador
        else new or from the same player
            B-->>R: partida_id, nueva
            R-->>G: 201 if new, 200 if updated
            G->>LS: removes the session from the pending queue
        end
    end
    Note over G,LS: No network, 429 or 5xx: the session stays pending<br/>and is retried at the next save
```

## 14. The cycle of a sol in the game

Every sol goes through morning, day, emergency and night. The AI dictates the time that the map and the interface show; the rules' state (`GameState.fase`) and the announced clock are different things. A game ends on completing sol 10 or when a resource (energy, oxygen or shielding) reaches zero.

```mermaid
stateDiagram-v2
    [*] --> Manana: start game (sol 1)
    Manana: MORNING
    Dia: DAY
    Emergencia: EMERGENCY
    Noche: NIGHT
    Fin: END

    Manana --> Dia: the AI announces daylight<br/>and power is shared out at the console
    Dia --> Dia: task from the character's route<br/>(panels · CO₂ filter · greenhouse)
    Dia --> Emergencia: three tasks done
    Emergencia --> Noche: decision with countdown<br/>(sol 1 is a tutorial with no emergency)
    Noche --> Manana: sleep in the Refuge<br/>card and next sol
    Noche --> Fin: sol 10 completed
    Emergencia --> Fin: a resource reaches zero
    Dia --> Fin: a resource reaches zero
    Fin --> [*]: final report and medal

    note right of Dia
        Every minigame, console allocation
        and emergency decision is a learning
        probe for the guide AI.
    end note
```

## 15. The guide AI measures and adapts its help

All of the game's machine learning runs in the browser. Every probe updates the topic's mastery with Bayesian Knowledge Tracing; the teaching policy chooses the type of help and, when several are possible, a bandit with Thompson sampling learns which works for that child. Only the anonymous summary travels to the API.

```mermaid
flowchart TD
    P(["Child's probe<br/>minigame · console allocation · emergency"]) --> OBS["Rastreador.observar(topic, correct, type)"]
    OBS --> BKT["BKT: updates the topic's P(L)<br/>with G and S by probe type<br/>(after a hint, guessing is more likely)"]
    BKT --> REG["Records the probe<br/>topic · type · before · after"]
    BKT --> POL{"Teaching policy<br/>by mastery and streak"}
    POL -- "weak, below 0.4" --> A1["Concrete hint or worked example"]
    POL -- "failed twice in a row" --> A2["Worked example (scaffolding)"]
    POL -- "partial, 0.4 to 0.7" --> A3["General or concrete hint"]
    POL -- "mastered, from 0.7" --> A4["Removes help and sets a challenge"]
    POL -- "topic unpractised for 2 sols" --> A5["Review question"]
    A1 --> TS
    A3 --> TS{"More than one possible help?"}
    TS -- yes --> BAN["Bernoulli bandit<br/>Thompson sampling Beta(successes+1, failures+1)"]
    TS -- no --> DEC
    BAN --> DEC["Help phrase<br/>in the chosen language"]
    A2 --> DEC
    A4 --> DEC
    A5 --> DEC
    DEC --> NIN(["Child: stars and words<br/>more or less time on weak and mastered topics"])
    NIN -. "next probe on the same topic" .-> REW["Reward: 1 if correct, 0 if wrong<br/>stored only in this browser"]
    REW -.-> BAN
    REG --> SOL["End of the sol or mission"]
    SOL --> ENV["POST /api/v1/partidas<br/>anonymous, with local backup"]
    SOL --> ADU(["Report for adults<br/>mastery in %, correct answers, download"])
```

## 16. Deployment

The game is static and can be published on GitHub Pages (automatic on every push to `main`) or on Firebase Hosting; with Firebase, `/api/**` and `/health` go through the same domain to Cloud Run and no CORS is needed. The API and the migrations come from the same image. Steps in [07-google-cloud.md](07-google-cloud.md). Both sites are already published: Google Cloud (<https://project-dd0f486a-7a8b-44de-86e.web.app>, with API and database) and GitHub Pages (<https://as9689138.github.io/juniorAstronautMissionTrainer_JIIMATZIN/>, static game only).

```mermaid
flowchart LR
    DEV["Team<br/>push to main"] --> GHA["GitHub Actions<br/>pages.yml: pnpm construir"]
    GHA --> GHP["GitHub Pages<br/>static frontend/dist"]
    DEV -. "firebase deploy" .-> FH["Firebase Hosting<br/>frontend/dist"]
    DEV -. "gcloud builds submit" .-> AR["Artifact Registry<br/>Dockerfile image"]
    AR --> CR["Cloud Run<br/>jiimatzin-api"]
    AR --> JOB["Cloud Run Job<br/>jiimatzin-migrar"]
    SM["Secret Manager<br/>DATABASE_URL"] --> CR
    SM --> JOB
    JOB -. "once per release" .-> SQL[("Cloud SQL<br/>PostgreSQL 17")]
    CR -- "/cloudsql socket" --> SQL
    CR -- "HTTPS" --> NASA["NASA DONKI"]

    N["Child's browser"] --> GHP
    N --> FH
    FH -- "/api/** and /health<br/>same domain, no CORS" --> CR
    GHP -. "VITE_API_URL + CORS_ORIGINS<br/>different domains" .-> CR
    EQ["Team (partidas CLI)<br/>Cloud SQL Auth Proxy"] -.-> SQL
```
