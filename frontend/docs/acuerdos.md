# Acuerdos de entrega

Lo que cada rol entrega a los demás. Si hay que cambiar algo, se avisa al equipo **antes** de cambiarlo.

## 1. Eventos del motor (rol 1 ↔ todos)

Archivo: `src/motor/eventos.js`. Se importa así:

```js
import { bus, EV, control } from '../motor/eventos.js';
bus.on(EV.INTERACTUAR, datos => { /* abrir consola o minijuego */ });
bus.emit(EV.CERRAR_PANEL);   // al terminar: devuelve el control al jugador
```

| Evento | Quién lo emite | Datos |
| --- | --- | --- |
| `EV.INTERACTUAR` | Motor | `{ nombre, accion, sistema, etiqueta }`. `accion`: `consola`, `minijuego`, `refugio` o `antena` |
| `EV.CERRAR_PANEL` | Quien abrió la pantalla | — |
| `EV.ESTADO_CAMBIO` | Mecánicas (rol 2) | El objeto `estado` completo (ver punto 2) |
| `EV.CERCA_DE` | Motor | `{ nombre, etiqueta, sistema }` o `null` |
| `EV.HABITACION` | Motor | Nombre de la habitación |
| `EV.PEDIR_INTERACCION` | Interfaz | — (igual que pulsar E) |
| `EV.DEPURACION` | Motor | `true` o `false` |
| `EV.OBJETIVO` | Mecánicas (rol 2) | Nombre de la estación a la que debe ir el jugador (p. ej. `'tarea_paneles'`) o `null`. El motor pone una flecha que rebota encima y la interfaz otra en el borde de la pantalla si no se ve. Úsenlo en el tutorial del sol 1 y en cada tarea nueva |
| `EV.HORA` | Diálogo (cuando la IA anuncia la hora) | `{ fase, hora }`, p. ej. `{ fase: 'noche', hora: '20:00' }`. El ciclo lo guarda en `GameState.reloj` y publica el estado (ver punto 10) |
| `EV.APRENDIZAJE` | IA guía | `{ tema, nombre, tipo, correcto, antes, despues, nivel, subio }`: hubo una prueba de aprendizaje (punto 11) |
| `EV.DATO` | Diálogo | Id de un recuerdo o ficha (`dato:<id>` de Ink). La IA lo abre en el álbum |

`control.bloqueado` es `true` mientras hay una pantalla abierta: el astronauta no se mueve.
Cuando el rol 2 conecte sus pantallas, cambiar `PANEL_PROVISIONAL` a `false` en `src/motor/config.js`.

## 2. Estado del juego (rol 2 → todos)

El rol 2 guarda el estado en `this.registry.set('estado', estado)` y emite `EV.ESTADO_CAMBIO` cada vez que cambia.

```js
{
  sol: 1, solesTotales: 10,
  energia: 0-100, oxigeno: 0-100, blindaje: 0-100,
  fase: 'manana' | 'dia' | 'emergencia' | 'noche',   // la que ANUNCIÓ la IA: el motor cambia la luz y la visión con ella
  hora: '06:00',                                     // la hora de la base que dijo la IA
  faseJuego: 'MAÑANA' | 'DIA' | 'EMERGENCIA' | 'NOCHE' | 'MEJORA' | 'FIN',   // la de las reglas
  tripulacion: { comandante: {...}, ingeniera: {...}, biologo: {...}, ia: {...} }
}
```

**Luz por fase** (`FASES_LUZ` en `src/motor/config.js`): de día casi no hay oscuridad; de noche solo se ve alrededor del astronauta y los muros tapan la vista; en emergencia la luz es roja y late. Las estaciones siempre brillan para que se encuentren. Para probar sin el rol 2: tecla F3. Otras partes pueden añadir luces que se mueven: `escena.luces.agregarFuente(() => ({ x, y, radio, alfa }))` devuelve una función para quitarla (así funciona la linterna del robot).

## 3. Eventos reales (rol 3 → rol 2)

Archivo: `data/eventos.json`. Registrar en `src/motor/recursos.js` → `DATOS`.

```json
[
  { "tipo": "llamarada", "fecha": "2024-05-14", "intensidad": "X8.7",
    "fuente": "NASA DONKI", "url": "https://...", "texto_nino": "El Sol lanzó una llamarada enorme..." }
]
```

`tipo`: `llamarada`, `particulas`, `tormenta_geomagnetica`, `tormenta_polvo`.

## 4. Arte (rol 4 → rol 1)

- Carpeta `public/assets/arte/`, PNG con fondo transparente, nombres en minúsculas sin tildes ni espacios.
- **Sustituir** los provisionales con el **mismo nombre y tamaño**; si cambia el tamaño, avisar al rol 1.

| Archivo | Tamaño |
| --- | --- |
| `tiles_base.png` | 6 piezas de 32 × 32 en una fila (192 × 32): suelo, suelo invernadero, pared, base de máquina, parte alta de máquina, puerta |
| `astronauta.png` | 32 × 44, mirando a la derecha; los pies abajo en el centro |
| `estacion.png` | 24 × 24 |
| `icono_energia.png`, `icono_oxigeno.png`, `icono_blindaje.png` | 32 × 32 |
| `retrato_<personaje>_<expresion>.png` | 512 × 512; personajes: `comandante`, `ingeniera`, `biologo`, `ia`; expresiones: `neutral`, `feliz`, `preocupado` |

- Mapa: **por salas, al estilo Hades** (ver `docs/estilo-mapa.md`, sección 14). Se define en `herramientas/pintar_zonas.py` y se genera en `public/assets/zonas/`. Los nombres de estación (`consola`, `tarea_paneles`, …) y de habitación (`EV.HABITACION`: `Pasillo`, `Energia`, `Mando`, …) no cambian. *(Antes:* `public/assets/mapas/base.json`, se edita en Tiled.*)* Capas: `suelo`, `paredes` (piezas con `colisiona = true`), `encima`, `objetos`.
- Objetos del mapa: `inicio`; estaciones con tipo `interaccion` y propiedades `accion`, `sistema`, `etiqueta`; habitaciones con tipo `habitacion` (rectángulos).
- Muebles: rectángulos de tipo `mueble` con la propiedad `tipo` (`cajas`, `banco`, `estanteria`, `mesa`, `escritorio`, `litera`, `taquilla`). El rectángulo es la huella que choca; ajustarlo a la rejilla de 32 px. Después de moverlos: `python herramientas/pintar_mapa.py`.

## 5. Historia y audio (rol 5 → roles 1 y 2)

- Ink exportado a `historia/historia.json`. Nudos con nombre fijo: `inicio`, `noche_sol_1` … `noche_sol_10`, `fracaso_oxigeno`, `fracaso_energia`, `fracaso_radiacion`, `exito`.
- Audio en `public/assets/audio/`, cada tema en OGG y MP3 con el mismo nombre: `tema_base`, `tema_tareas`, `tema_emergencia`, `tema_noche`. Efectos: `sfx_<nombre>`.
- Registrar los archivos en `src/motor/recursos.js` → `AUDIO`.

## 6. IA de la base y pronóstico (robot → roles 2 y 5)

Archivos: `src/compania/robot.js` (el robot en el mapa) y `src/ml/pronostico.js` (el modelo). Se engancha solo a la escena Base desde `main.js`.

- **Cada mañana** (`estado.fase === 'manana'`), la IA pronostica y emite `EV.PRONOSTICO`:

```js
bus.on(EV.PRONOSTICO, p => {
  // p.sol, p.prob (0-1), p.porcentaje, p.nivel: 'bajo' | 'medio' | 'alto'
  // p.fechaDatos, p.fechaPronostico: días REALES del Sol (cada Sol del juego usa un día reciente)
  // p.resultadoReal: true/false si ese día ya pasó (hubo llamarada M o X), null si es el futuro
  // p.llamaradasReales: { m, x } · p.razones · p.fuente
});
```

- **Rol 2:** puede disparar `emergencia_solar` o `emergencia_radiacion` cuando `resultadoReal === true` (pasó de verdad) o cuando `nivel === 'alto'`. Lo decide el rol 2.
- **Al llegar la noche** después de una emergencia, la IA cuenta si acertó. También: `window.__robot.contarResultado()`.
- **API del robot** (`window.__robot` en la consola): `decir(texto, { cara, duracion })`, `cara('neutral' | 'feliz' | 'procesando')`, `posicion`.
- **Tecla Q:** preguntarle a la IA en qué se fijó.
- **Rol 5:** las frases largas siguen en Ink (`hab:ia`). Las burbujas cortas del mapa están en `PISTAS` dentro de `robot.js`.
- **Arte:** `public/assets/arte/robot_ia.png`, 3 cuadros de 64 × 72 en una fila: neutral, feliz, procesando. Provisional, hecho con `herramientas/dibujar_robot.py`; se puede sustituir con el mismo nombre y tamaño.

- **Cómo lo dice:** «de 10 días como hoy, en 3 hubo llamarada fuerte», con **10 soles dibujados** (estrella naranja = llamarada; sol redondo = tranquilo) y el % pequeño. Ver por qué en `docs/aprendizaje.md`.
- **Archivos de memoria** (8 recuerdos del guion, se guardan en el navegador):
  - Se abren al terminar el minijuego de su estación (paneles → Spirit y Opportunity, filtro → Apolo 13, riego → zinnias).
  - **Rol 1 y rol 5:** cuando el diálogo muestre una etiqueta `dato:<id>`, emitir `bus.emit(EV.DATO, '<id>')`. Abre el recuerdo con ese id: `skylab`, `iss_fuga_2013`, `mir_1997`, `tormentas_polvo`, `tormenta_1972`, `viento_limpia`, `apolo13`, `veggie_zinnias`.
  - La IA emite `EV.MEMORIA` `{ id, numero, titulo, abiertas, total }`, por ejemplo para un álbum en la interfaz. La lista completa está en `window.__robot.memorias`.
  - Cada noche, la IA adelanta un recuerdo que sigue cerrado 🔒.
- **Humor:** si pasan 80 s sin que hable, dice un chiste corto (nunca durante una emergencia). A veces se "despista" antes del pronóstico.

**El modelo:** regresión logística entrenada con el archivo diario de NOAA SWPC (1996-01-03 a 2026-11-12). Responde: «¿Habrá al menos una llamarada M o X mañana?». Medido con 2017-2025, años que no vio: AUC 0.915, TSS 0.674, 45 % mejor que adivinar el promedio. Para reentrenar: `python herramientas/entrenar_pronostico.py`.


## 7. Juego completo sobre el mapa (rol 2 + rol 5 integrados)

- **Ciclo de los 10 soles:** `src/mecanicas/ciclo.js`. Escucha `EV.INTERACTUAR` y decide según la fase:
  consola de Mando → reparto de energía (`src/mecanicas/Consola.js`); Energía, Soporte vital e Invernadero → minijuegos
  (`src/minijuegos/`, adaptados del prototipo; el original está en `src/minijuegos/original`); Refugio de noche → dormir,
  nudo `noche_N` y carta de mejora. Al terminar las 3 tareas llega la emergencia del sol (tabla `soles.csv` de la base de datos).
- **Estado:** `src/mecanicas/estado.js` (el `GameState` del prototipo). `publicar()` emite `EV.ESTADO_CAMBIO` y el ciclo lo
  guarda en `registry('estado')`, que leen el mapa (luz por fase) y la interfaz (barras).
- **Historia:** `historia/historia.json` con inkjs (`lib/ink.js`). `src/mecanicas/narrador.js` busca la voz de cada línea
  en `public/assets/audio/voces/audios.json` y la escena `Dialogo` la muestra con el retrato del personaje.
  Un nivel de Ink (`costo:energia-1`) son 20 puntos de 100.
- **Personajes:** Wenceslao (ingeniero), Judith (científica) y Atlas (médico). La científica es Judith, como en la historia
  y en las voces; el prototipo de minijuegos la llamaba Margaret. Retratos en `public/assets/personajes/`.
- **Pantallas encima del mapa:** mientras hay un diálogo, la consola o un minijuego, `control.modal` es `true`: el mapa no
  se mueve ni cierra nada con E/Espacio/Esc, y el robot espera para hablar.
- **Sonido:** `src/motor/sonido.js` (música por fase con fundido, efectos, viento real de Marte y voces que se cargan al
  hablar). Tecla M o el botón del altavoz: silencio. El álbum de recuerdos se abre con R (antes usaba la M y, al
  abrirlo, el juego se quedaba sin sonido).

## 8. Datos reales: API de contenido del equipo

Repositorio del equipo: `as9689138/juniorAstronautMissionTrainer_JIIMATZIN` (backend, contrato y adaptador).

- **Adaptador:** `src/api/` es copia sin cambios de su `frontend/src/api`. El juego no llama a `fetch` directamente:
  `src/mecanicas/datosReales.js` usa `cargarEscenario('base-marte-uno')` y, si no hay API, el respaldo en
  `escenarios/` (ver `escenarios/LEEME.md`).
- **Desarrollo:** `scripts/servidor.mjs` (`pnpm dev:front`) reenvía `/api/...` y `/health` a la API (`JIIMATZIN_API`, por defecto
  `http://localhost:3000`, la de `pnpm dev:back`), como el proxy de su `vite.config.example.js`. Sin CORS.
- **Qué muestra el juego:**
  - Por la mañana, la IA dice la temperatura y la presión medidas en Marte para ese sol. Es modo histórico: dice que es
    una medición guardada y de qué sol de la misión viene.
  - Debajo del sol, la interfaz muestra "Marte real: −66 °C · 735 Pa".
  - En cada fase, las fichas «Dato real» con `appearsAt` de ese sol y fase, con su contexto de fuente.
  - Tras un nudo de Ink con `# dato:<id>`, la ficha aprobada vinculada (`gameplay.factBindings`). Sin vínculo no se
    muestra como verificada.
- **Sin API ni respaldo:** el juego sigue con su contenido propio y sin "Marte real".

## 9. Pantallas encima y carga por partes

- Una pantalla encima del mapa (diálogo, consola o minijuego) avisa que terminó cuando su escena **ya se apagó**.
  `ciclo.abrir()` espera si la escena sigue activa. Si se avisara antes, la siguiente pantalla de la misma escena
  arrancaría y el apagado pendiente la cerraría a medias, dejando el control bloqueado.
- **Vigilante:** si `control.modal` queda en `true` sin ninguna pantalla encima durante 2 s, `ciclo` devuelve el
  control y lo avisa en la consola.
- **Recursos:** se piden por grupos con `cargas.asegurar(grupo)`, que devuelve una promesa, y se adelantan con
  `cargas.precargar([...])`. Se liberan con `cargas.liberar(grupo)`. Nadie llama a `this.load` fuera de `Arranque` y del
  `Cargador`. Las voces son la excepción: se bajan al hablar y se liberan al terminar la línea.

## 10. La historia de cada personaje, la hora y los recuerdos

- **Ruta del personaje** (`src/mecanicas/rutas.js`): el día sigue al personaje elegido. Las tres tareas se piden en su
  orden, empezando por su especialidad (Wenceslao: paneles; Judith: invernadero; Atlas: filtro de CO₂). La IA lo dice
  en la burbuja del robot y el aviso de la estación lleva una ★. Ventajas, de las «Ideas de habilidad por rol» del
  paquete de historia: Wenceslao gasta un 20 % menos de energía de noche; Judith tiene 5 s más en las emergencias de
  clima (solar, polvo y radiación); Atlas paga la mitad en las decisiones de blindaje y en la emergencia de radiación.
  El +5 de cada minijuego ya venía del prototipo. Los números se cambian en ese archivo.
- **El jugador es el personaje:** en los diálogos, sus líneas dicen «NOMBRE · TÚ».
- **Minimapa** (`src/escenas/minimapa.js`, en la Interfaz): esquema isométrico de las salas con tu posición, la sala
  del objetivo (`registry('objetivo')`) y el camino. Lee la sala y la posición de la escena Base; no cambia nada.
- **Mezcla de sonido** (`MEZCLA` en `src/motor/sonido.js`): niveles objetivo en LUFS por tipo de sonido, con la sonoridad
  medida de cada archivo. Con un diálogo abierto la música y el viento bajan y se quedan abajo hasta que se cierra.
  La música es la «Propuesta 3» (`public/assets/audio/musica/propuesta3/`, CC0); para cambiarla, las rutas están en
  `src/motor/recursos.js` y su sonoridad medida en `LUFS` de `src/motor/sonido.js`.
- **La hora la dicta la IA:** la luz del mapa y la ficha del Sol cambian solo cuando la IA anuncia la hora en un diálogo
  (`EV.HORA`). Amanece a las 06:00 (aviso de la IA al empezar cada sol), hay luz a las 10:00 (nudo `dia`), la emergencia
  llega a las 16:00 (primera línea de la alerta) y anochece a las 20:00 (aviso de la IA con el gasto de energía, que se
  descuenta al terminar el aviso). Para anunciar una hora: `ciclo.narrar(nudo, { hora: ciclo.hora('noche') })` o una
  línea suelta con `hora`.
- **Recuerdos (flashbacks):** los "datos curiosos" de la historia son recuerdos de la IA (guion v4: «Archivo de
  memoria»). `src/mecanicas/recuerdos.js` dice qué líneas de `historia.ink` son un recuerdo; el diálogo las muestra como
  flashback (rebobinado, holograma, año, lugar e ilustración de `herramientas/pintar_recuerdos.py`), sin la frase
  «Dato curioso:» y con la voz desde después de esa frase. Son 16 recuerdos; quedan abiertos en el álbum (tecla R).
- **Voces:** las 213 líneas con MP3 del rol 5 suenan todas. Las que no tienen MP3 (narración, avisos del juego, la hora
  de la IA) usan la voz del navegador, el último respaldo de la entrega del rol 5. La lista para grabarlas está en
  [voces-pendientes.md](voces-pendientes.md).

## 11. La IA guía: machine learning y medición del aprendizaje

- **Dónde:** `src/compania/guia.js` (la IA guía), con los modelos en `src/ml/` (`pronostico.js` y `aprendizaje.js`). El
  robot (`robot.js`) es su cara en el mapa; el panel `Aprendizaje.js` muestra lo que mide.
- **Modelo:** Bayesian Knowledge Tracing por tema. Parámetros en `PARAMETROS` de `src/ml/aprendizaje.js` (L0 0,25;
  T 0,15; adivinar y resbalón por tipo de prueba). Una prueba con pista cuenta menos (se "adivina" más).
- **Pruebas** (las llama `ciclo.js`):
  - `guia.evidenciaMinijuego(clave, exito)`: paneles → Energía; filtro e invernadero → Aire.
  - `guia.evidenciaConsola(asignacion, recursos, conPista)`: acierta si el sistema del recurso más bajo recibe más
    núcleos (y los Escudos al menos 2 si el pronóstico es alto). Si no hay un recurso claramente más bajo, no cuenta.
  - `guia.evidenciaEmergencia(nudo, eleccion, agotado, recursos, conPista)`: acierta si gasta el recurso que tiene de
    sobra y cuida el más bajo (los costes de cada opción están en `COSTES`, sacados de `historia.ink`). Si se acaba el
    tiempo, falla "Decidir con datos". La elección la apunta el diálogo en las etiquetas (`eleccion`, `agotado`).
- **Adaptación:** `ajusteTiempo` (×1,2 de tiempo en un minijuego flojo, ×0,9 si lo domina, vía `GameState.ajusteIA`),
  `pistaConsola`, `pistaEmergencia` (sale encima de las opciones), `pistaEstacion` (burbuja del robot) y
  `resumenDelSol` (lo que dice la IA al anochecer). Tras cada decisión, la IA dice el porqué.
- **Guardado:** `localStorage` (`jiimatzin.aprendizaje.v1`): la partida actual y el resumen de las 10 anteriores. Sin
  nombres ni servidor. Reporte en texto con `guia.reporteTexto()` o el botón «Descargar».

## 12. Idiomas (español e inglés)

- **Dónde:** `src/motor/idioma.js` (idioma elegido, `traducir`, `t`, historia) y los diccionarios `src/textos/en.js`
  (todo lo que no es Ink) y `src/textos/historia_en.js` (líneas de Ink sin voz). La traducción de las líneas con voz es
  la del rol 5 (`lineas_es_en.json`).
- **Cómo funciona:** al dibujarse, todo `Phaser.GameObjects.Text` pasa por `idioma.traducir()`: frase exacta o plantilla
  con `{…}` (lo que va dentro se traduce también). Lo que se escribe letra por letra (el diálogo y la burbuja del robot)
  lleva `sinTraducir = true` y se traduce entero antes. En el código propio, `t('Frase {n}', { n })`.
- **Para añadir un texto:** escribirlo en español como siempre y poner su inglés en `en.js` (clave: el texto tal como sale
  en pantalla). `__idioma.faltan`, en la consola del navegador jugando en inglés, lista lo que falta.
- **Voz:** en inglés no se tocan los MP3 (son en español): habla la voz del navegador en inglés.
- **No se traduce:** el arte (letreros pintados en las salas) ni los datos que vienen en español de la API del equipo.
