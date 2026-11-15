# Guía de estilo del mapa

Reglas para **todo el arte que no son personajes** (suelo, muros, máquinas, luces, ventanas, paneles). Los personajes los dibuja el rol 4; deben respetar el punto 2 (luz) y el contorno del punto 3 para que encajen.

Se inspira en cuatro referencias: cartel pulp retro, interior vectorial violeta con círculos de luz, carta estelar en papel antiguo y cómic entintado naranja-teal. Las usamos solo como inspiración: **no se calcan ni se usan en el juego**.

## 1. Dónde va cada estilo

| Parte | Estilo |
| --- | --- |
| Interior de la base (se juega aquí) | Vectorial plano, violeta, con círculos de luz y contorno de tinta |
| Exterior de Marte (ventanas, título, escenas) | Cómic entintado: naranja contra teal, luz de borde |
| Paneles de datos, bitácora, mapa de la misión | Papel crema con tinta negra y sello rojo, como documento real |
| Emergencias | Rojo naranja del cartel retro |

## 2. Luz

- Viene **de arriba a la izquierda**. Los bordes de arriba y de la izquierda se aclaran; las sombras caen abajo a la derecha.
- Cada sala tiene un **círculo de luz cálida** en el centro; las esquinas quedan en penumbra.
- Lo que se puede usar brilla con el **color de su sistema**.

- **De noche y en emergencias** la luz la pone el motor (`src/motor/luces.js`), no el dibujo: una capa de oscuridad con la visión del astronauta y las lámparas recortadas. El arte se pinta siempre "de día".

## 3. Línea y textura

- Contorno de tinta `#141026` de 1,5 px (a escala del juego) en muros, máquinas y estaciones. El suelo no lleva contorno, solo juntas.
- Sin degradados de computadora: volumen con 2–3 tonos planos.
- **Grano de impresión** encima de todo, suave.

## 4. Vista y medidas

- Vista desde arriba en **3/4**: los muros muestran la tapa (clara) y el frente (más oscuro) cuando debajo hay suelo.
- Casilla de 32 px en el juego, arte pintado al **doble (64 px)**.
- El astronauta choca en los pies: el frente de un muro o máquina termina donde empieza el suelo.

## 5. Paleta

| Uso | Color |
| --- | --- |
| Tinta | `#141026` |
| Suelo / junta / brillo | `#3a366e` / `#282550` / `#524e92` |
| Muro tapa / luz / frente / zócalo | `#807cd2` / `#b0acf4` / `#504c98` / `#262250` |
| Luz cálida | `#f3e3c3` |
| Invernadero suelo / tierra / hojas | `#1c464c` / `#4e322a` / `#6fb3a7` y `#f0b07a` |
| Peligro (puertas) | `#ffc83d` |
| Marte: cielo de día / suelo / sombra | `#d6a06e` / `#aa5434` / `#703424` |

**Color de cada sistema** (el mismo en estaciones, franjas de las salas e interfaz):

| Sistema | Color | Sala |
| --- | --- | --- |
| Mando | `#e48ad8` | Mando |
| Energía | `#ffc83d` | Energía |
| Oxígeno | `#5ec8f2` | Invernadero, Soporte vital |
| Blindaje | `#b58cff` | Refugio |
| Comunicaciones | `#7cf0a0` | Comunicaciones |

## 6. Marte real

- Cielo **caramelo** de día y **azul** al atardecer.
- Las lunas son Fobos y Deimos: pequeñas e irregulares. **Nunca planetas con anillos en el cielo.**
- El suelo es óxido de hierro: rojos y marrones, con rocas y polvo.

## 7. Cómo se genera

```bash
python herramientas/pintar_mapa.py
```

Lee `public/assets/mapas/base.json` y crea `public/assets/mapas/fondo_base.png` y `encima_base.png`. Si se cambia el mapa en Tiled, se vuelve a ejecutar y el dibujo se actualiza. La paleta está al principio del script, con los mismos nombres que esta guía.

## 8. Qué identifica a cada sala

Todo es decoración plana (suelo o pared), así no cambia las colisiones. Cada detalle enseña algo real de una base en Marte.

| Sala | Pared | Suelo |
| --- | --- | --- |
| Energía | Señal de alto voltaje, cuadro eléctrico | Cables gruesos de las baterías a la estación, zona de peligro |
| Mando | Pantalla con la órbita de Marte, panel con los 3 recursos | Alfombra circular bajo la consola |
| Comunicaciones | Monitores con ondas de radio, póster de antena en papel antiguo | Mazos de cables hacia la antena |
| Pasillo | — | Nombre de cada sala pintado junto a su puerta, con flecha |
| Invernadero | Luces LED magenta (las de cultivo real son rojas y azules) | Macetas, manguera, charcos; luz magenta en la sala |
| Soporte vital | Tuberías con manómetros de O2 y CO2 | Tubería del tanque, desagüe |
| Refugio | Paneles de agua (el agua protege de la radiación) | Zona segura marcada |

Los detalles están en `detalles_suelo()` y `detalles_muro()` de `herramientas/pintar_mapa.py`, en coordenadas del juego. Si se mueve una sala en Tiled, hay que mover también sus detalles.

## 9. Muebles

Se colocan en Tiled como rectángulos de tipo `mueble` (propiedad `tipo`). El rectángulo es lo que **choca**; el dibujo sube un poco por encima y esa parte va a la capa "encima", así el astronauta pasa por detrás. Se dibujan en `dibujar_mueble()`.

| Tipo | Dónde | Cómo se ve |
| --- | --- | --- |
| `cajas` | Varias salas | Cajas naranjas (acento cálido contra el violeta), a veces apiladas |
| `banco` | Energía | Banco de trabajo con cajones, llave inglesa y batería de repuesto |
| `estanteria` | Mando, Invernadero, Soporte vital | Carpetas de la misión, frascos de semillas o cartuchos de filtro según la sala |
| `mesa` | Mando | Mesa con un holograma de Marte (casquete polar, sin anillos) y sillas rosas |
| `escritorio` | Comunicaciones | Monitores con ondas y una radio |
| `litera` | Refugio | Literas con mantas del color del blindaje |
| `taquilla` | Refugio | Taquillas con placa de nombre |

## 10. Interfaz

Dibujada en Phaser (no en HTML) con piezas de `herramientas/pintar_interfaz.py` (carpeta `public/assets/interfaz/`, al doble de resolución):

| Elemento | Estilo |
| --- | --- |
| Tablero de recursos (arriba a la izquierda) | Placa de instrumentos violeta con remaches; barras en celdas como un medidor de carga, con el color de cada sistema. **Por debajo de 25** la barra late en rojo, el número se pone rojo y el icono tiembla |
| Ficha del Sol (arriba a la derecha) | Papel de bitácora: `SOL 4 / 10` y la fase con su icono (amanecer, Sol pequeño en cielo caramelo, Fobos de noche, alerta). En pantallas estrechas baja debajo del tablero |
| Nombre de la sala | Banderín con una tira del color del sistema de la sala; entra y se va solo |
| Aviso de interacción | Tecla dibujada en 3/4 con la letra E (☝ en pantallas táctiles) que sube y baja |
| Panel provisional | Hoja de bitácora con sello rojo «PROVISIONAL» |
| Joystick táctil | Aro de tinta con pomo color papel |

Todo se escala con la pantalla (entre 0,72 y 1,3) para que se lea en móvil y en pizarras digitales. Fuentes del sistema (Trebuchet MS para texto, Consolas o Menlo para números): no se descarga nada.

## 11. Cómo el mapa aplica la guía de aprendizaje

Cambios del rol 1 basados en [docs/aprendizaje.md](aprendizaje.md):

| Cambio | Método de la guía |
| --- | --- |
| **Flecha de objetivo** que rebota sobre la estación y flecha en el borde si no se ve (`EV.OBJETIVO`) | Guía, no descubrimiento libre; instrucciones con flechas e íconos |
| **Pictogramas en cada estación**: panel solar, ventilador, brote, escudo, antena y barras de reparto | Instrucciones con íconos, no solo texto |
| **Menos rejillas y remaches** en el suelo; las pantallas de las estaciones, más oscuras para que el icono se lea | Quitar detalles atractivos que no enseñan; lo visual claro |
| **Onda de color al usar una estación**, el astronauta se aplasta un poco, botones que se aplastan, el aviso aparece con un saltito | Respuesta "jugosa", pero moderada |
| **Leve temblor de cámara** al empezar una emergencia | Respuesta moderada; adrenalina en la emergencia |
| **Noche más acogedora**: menos oscuridad y lámparas más fuertes | Una emoción por fase: calma acogedora de noche, no miedo |
| **En pantallas táctiles**, el aviso y el panel no bajan de un tamaño cómodo para el dedo | Táctil primero: botones grandes |

Lo que **no** se añadió a propósito: contadores, rachas ni nada que presione a seguir jugando.

## 12. Estilo de impresión (lo que lo acerca a las referencias)

El pintor dibuja todo "limpio" y al final le aplica una etapa de impresión (`estilo_impresion()` en `herramientas/pintar_mapa.py`). Es lo que hace que el mapa se parezca a las cuatro imágenes de referencia:

| Paso | Qué hace | De qué referencia viene |
| --- | --- | --- |
| Tinta en los bordes | Línea oscura donde hay un cambio fuerte de tono | Cómic entintado y grabado |
| Tono partido | Las sombras tiran a **teal** y las luces a **naranja**, sin tocar los colores de sistema | Cartel pulp y cómic (naranja contra teal) |
| Serigrafía | Cada píxel se reduce a una lista corta de tintas (`TINTAS`): la luz cae en **bandas planas**, no en degradado | Cartel pulp; círculos de luz del interior violeta |
| Trama de puntos | Puntos teal a 45°, más grandes cuanto más lejos de la luz | Cartel pulp |
| Rayado | Líneas de grabado en la sombra de los muros; cruzadas donde es más oscuro | Carta estelar / grabado |
| Tinta corrida | Un píxel de violeta junto a la tinta, como una imprenta mal alineada | Serigrafía / riso |
| Luz de borde cálida | Los bordes iluminados de muros y máquinas son melocotón (`MURO_TAPA_LUZ`) | Cómic entintado (luz naranja, sombra teal) |

**Regla nueva:** si se añade un color al dibujo que no está en `TINTAS`, la serigrafía lo cambiará por el más cercano. Para un color nuevo de verdad (por ejemplo, un sistema nuevo), añadirlo también a `TINTAS`.

**La noche también va impresa:** la capa de oscuridad del motor (`src/motor/luces.js`) lleva la misma trama de puntos a 45°. Solo aparece cuando está oscuro (mañana, noche y emergencia) y se desvanece en la penumbra de las luces; de día no hay trama.

Los muros reciben luz pareja; los círculos de luz solo caen en el suelo. Las placas de la interfaz llevan la misma luz de borde y trama (`herramientas/pintar_interfaz.py`).

## 13. Línea actual del mapa (aprobada): el interior de la base

**Esta sección manda sobre las anteriores (5 y 12)** en paleta y acabado. El mapa sigue la escena aprobada `docs-internos/propuestas/estilo_2_interior.png`, basada en Mars Dune Alpha (NASA CHAPEA); ver `docs-internos/propuestas/fuentes.md`.

- **Colores planos** de una lista corta (`TINTAS_INTERIOR`): violetas claros para el suelo, violeta medio para el frente de los muros, blanco lila para la luz.
- **Contorno violeta oscuro** `#282256`, no negro. Sin trama de puntos en el mapa.
- **Muros impresos en 3D**: la tapa y el frente llevan las capas horizontales de la impresora (`NERVIO`), como el hábitat real.
- **Luz en círculos planos** de dos tonos (anillo y centro), no degradados.
- **Acentos rosas**: guías del umbral de cada puerta y contenedores.
- **Invernadero** en violeta oscuro bajo luz LED magenta, con plantas verdes.
- **Ventanas** con el muro grueso (blindaje) y el **atardecer azul de Gale** con las buttes de cima plana en el horizonte.
- La sombra de los muros se marca con un rayado violeta, no con negro.

El acabado está en `acabado_interior()` de `herramientas/pintar_mapa.py`. El anterior (`estilo_impresion()`, con trama y teal-naranja) sigue en el código por si se quiere volver.

## 14. El mapa por salas, al estilo Hades (actual)

**Esta sección manda sobre todas las anteriores en cómo es el mapa.** Ya no es una planta vista desde arriba: cada zona es una **sala aparte**, dibujada como un diorama en perspectiva isométrica, con el **paisaje de Marte alrededor** (buttes de Gale, monte Sharp, dunas Bagnold y el atardecer azul). Se pasa de una sala a otra **cruzando sus puertas**, con un fundido.

- **Distribución:** un **pasillo central** con 6 puertas: 3 al fondo (Energía, Mando, Comunicaciones) y 3 delante (Invernadero, Soporte vital, Refugio). Cada sala tiene una puerta de vuelta.
- **Dentro**, la línea del interior aprobado: muros impresos en 3D con capas, violetas planos, luz en círculos, acentos rosa, ventanas al atardecer azul, decoración de cada sala en sus muros (señal de alto voltaje, pantalla de la órbita, monitores, LED de cultivo, manómetros de O2 y CO2, muros de agua).
- **Fuera**, la línea del cómic aprobado: suelo de óxido rayado, losas rotas, mesas con capas y roca de remate.
- **Profundidad:** los muebles y máquinas son imágenes aparte; el juego decide en cada momento si van delante o detrás del astronauta. El murete delantero tapa los pies en el borde.

### Cómo se edita

Las salas se definen en `ZONAS`, al principio de `herramientas/pintar_zonas.py`: tamaño en casillas, objetos `(tipo, columna, fila, ancho, alto)`, estaciones `(letra, columna, fila)`, lámparas y puertas `(lado, posición, destino, llegada)`. Después:

```bash
python herramientas/pintar_zonas.py            # todas las salas (≈ 3 min; las estaciones salen de herramientas/.cache)
python herramientas/pintar_zonas.py mando      # solo una
```

Genera `public/assets/zonas/` (≈ 8 MB: el fondo de cada sala va en JPG). El mapa anterior (Tiled, `pintar_mapa.py`) quedó fuera del repositorio: el juego ya no lo usa; `pintar_mapa.py` solo aporta la paleta y los pinceles.

### Vida, entradas y cámara (en `src/escenas/Base.js`)

- **Paisaje vivo:** estrellas que titilan, polvo que cruza el suelo marciano, un remolino de polvo que va y viene (Curiosity los grabó en Gale) y luces que parpadean en las máquinas.
- **Entrada a una sala:** el astronauta aparece en el umbral y entra caminando solo 1,5 m; debajo de él sale el **nombre de la sala en grande** (debajo para no tapar la burbuja del robot) con una frase de lo que se aprende ahí (`LEMAS` en `src/escenas/Interfaz.js`).
- **Cámara:** se adelanta un poco hacia donde camina el astronauta y se acerca al usar una estación. Las botas levantan polvo al caminar.
- **Más detalle por sala:** cables de las máquinas a la estación, rejillas, zona de peligro (Energía), charcos y bandejas de brotes (Invernadero), señal de radiación y bidones de agua (Refugio), antena de plato (Comunicaciones), carritos de herramientas y la base de carga de la IA (Pasillo).

### Reglas de perspectiva y de juego (se comprueban solas)

**Una sola cámara.** Todo, dentro y fuera de la sala, está en la misma isométrica 2:1 (casilla de 96 × 48 px), con la luz desde la izquierda: la cara izquierda de cada bloque va iluminada, la derecha en sombra rayada y las sombras caen a la derecha. El paisaje **no** tiene horizonte de frente: las buttes son mesas isométricas, los cráteres son elipses 2:1 y las estrías del viento siguen la diagonal de la rejilla. Solo arriba del todo, a lo lejos, se ve la bruma del atardecer.

**Escala real** (45,2 px por metro; detalle en `docs/biblia-objetos.md`, «Salas a escala real»). Una casilla mide 1,3 m. El astronauta mide 86 px (1,9 m), la puerta 92 px (2,0 × 1,1 m), el muro 128 px (2,8 m), un rack 91 px (2,0 m) y la mesa 34 px (0,75 m). Las salas miden entre 9,1 × 6,5 m y 14,3 × 6,5 m (el pasillo).

**Alrededor de la base**, para que se sienta real: túneles presurizados que salen de las puertas delanteras, paneles solares a la izquierda, vehículo aparcado a la derecha con sus rodadas, dunas oscuras, cráteres y buttes en las esquinas.

**El validador** (`validar()` en `pintar_zonas.py`) no deja pintar una sala si:
- un objeto se sale o se monta sobre otro, o dos objetos distintos quedan pegados (sí se permiten grupos de cajas, bidones, taquillas, torres o máquinas);
- una puerta queda tapada, o una estación tiene menos de 3 lados libres;
- hay suelo al que no se puede llegar;
- la sala tiene más del 32 % del suelo ocupado.

**En el juego**, si el astronauta roza la esquina de un objeto se desliza para rodearlo, y las estaciones siempre brillan un poco para encontrarlas.

### Método de trabajo para los objetos (adaptado de procedural-film)

1. **Investigar** qué es cada objeto en la realidad (bolsas CTB, Veggie, CDRA, CWC, camarotes) → `docs/biblia-objetos.md`.
2. **Biblia de objetos**: una regla por objeto con huella, alto, partes obligatorias y errores a evitar.
3. **Hoja de contacto**: `python herramientas/hoja_objetos.py` dibuja cada objeto solo y grande → `docs-internos/propuestas/objetos.png`. Se mira entera antes de seguir.
4. **Compuerta en píxeles** (`compuerta_pixeles()`): al pintar cada sala mide cuánto tapa cada objeto a otro (máx. 6 %) y a puertas, ventanas, decoración del muro y estaciones (máx. 3 %). Si falla, la sala no se pinta y dice qué objeto y cuánto.
5. **Crítica**: hoja de todas las salas a tamaño real, arreglos por prioridad (P1 primero) y se vuelve a mirar.
