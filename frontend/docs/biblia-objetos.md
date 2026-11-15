# Biblia de objetos de las salas

Como la sección 10 de la biblia de arte del método procedural-film: **una regla de dibujo por objeto**, con medidas, partes y errores a evitar. La casilla mide 96 × 48 px (isométrica 2:1); las alturas van en px de juego. La luz viene de la izquierda: la cara izquierda (mira a +fila) va clara, la derecha (mira a +columna) en sombra, la tapa la más clara. Contorno violeta oscuro `#282256`.

**Regla general:** nada se dibuja fuera de su huella (margen mínimo 0,06 casillas por lado), todo se apoya en el suelo (nada flota), y cada objeto tiene al menos **3 detalles** que digan qué es.

## Referencias reales

| Objeto | Basado en | Fuente |
| --- | --- | --- |
| Cajas | Bolsas de carga **CTB** de la Estación Espacial: blancas, con asas | [NASA NTRS 20160001325](https://ntrs.nasa.gov/api/citations/20160001325/downloads/20160001325.pdf) |
| Torre de cultivo | **Veggie**: tapa de LED (rojo y azul → magenta), fuelle transparente, plantas en "almohadas" | [NASA NTRS 20120015545](https://ntrs.nasa.gov/citations/20120015545) · [NTRS 20110011606](https://ntrs.nasa.gov/api/citations/20110011606/downloads/20110011606.pdf) |
| Máquina de Soporte vital | Rack **CDRA** que quita el CO₂ del aire (sistema ECLSS) | [ISS ECLSS](https://en.wikipedia.org/wiki/ISS_ECLSS) |
| Bidón / tanque de agua | **CWC**: contenedores de agua de 44 L, como una bolsa de deporte; el agua además blinda | [NASA NTRS: agua de la ISS 2026](https://ntrs.nasa.gov/api/citations/20260004140/downloads/2026%20Status%20of%20ISS%20Water%20FINAL.pdf) |
| Literas | Camarotes de la tripulación con saco de dormir sujeto | [ESA: camarote de Samantha](https://www.esa.int/ESA_Multimedia/Images/2022/01/Samantha_s_sleeping_quarters) |
| Sala, mesa, cultivo | Mars Dune Alpha (NASA CHAPEA) | ver `docs-internos/propuestas/fuentes.md` |

## Reglas por objeto

| Objeto | Huella | Alto | Partes obligatorias | Errores a evitar → cómo se dibuja |
| --- | --- | --- | --- | --- |
| Batería (Energía) | 1×1 | 70 | zócalo · 4 módulos con barra de carga y asa · aletas de refrigeración a la derecha · cables gruesos que bajan al suelo por un pasamuros · pegatina de alto voltaje | caja lisa con pantalla → módulos apilados que se ven por separado |
| Consola (Mando) | 1×1 | 80 | mueble bajo · tablero inclinado con pantalla y botones · monitor vertical detrás · zócalo | caja con pantalla pegada → mesa inclinada + monitor |
| Servidor (Comunicaciones) | 1×1 | 78 | 6 bandejas con luces y ranuras · asa de puerta · bandeja de cables arriba | todas las máquinas iguales → cada una con su forma |
| Rack CDRA (Soporte vital) | ver ficha piloto | 46 | ver ficha piloto | — |
| Tanque de agua (Refugio) | 1×1 | 70 | cilindro con flejes · tubo de nivel con el agua visible · volante de la válvula · H2O | caja azul plana → cilindro |
| Torre Veggie | 1×1 | 74 | depósito de raíces abajo · fuelle transparente con pliegues · plantas dentro · tapa de LED con luz magenta hacia abajo | hojas pegadas a la cara → plantas dentro del fuelle |
| Bandeja de brotes | 1×2 | 22 | marco · almohadas beige en hilera · un brote por almohada | — |
| Bolsas CTB | 1×1 | 30 (+22 apiladas) | bolsa blanca con esquinas blandas · asa rosa · ventana de etiqueta · costura | cubos rosas → bolsas blancas |
| Bidón de agua | 1×1 | 44 | cilindro con elipse 2:1 correcta · 2 aros · tapón · H2O | cilindro sin elipses de verdad |
| Estantería | 2×1 / 1×2 | 84 | 2 laterales · 3 baldas con canto · fondo · bolsas y cajas **apoyadas** en las baldas | objetos flotando en la cara → apoyados en la balda |
| Mesa con holograma | 2×2 | 33 (holograma 64) | tablero con canto · pie central · proyector · 4 sillas **con respaldo y patas** dentro de la huella | sillas cubo o fuera de la huella |
| Escritorio | 3×1 | 26 (monitores 52) | patas · 2 monitores con pie mirando al jugador · teclado · radio | monitores flotando |
| Litera | 2×1 | 56 | 4 postes · 2 camas con colchón, almohada y saco · escalera | cama de arriba flotando sobre un poste |
| Taquilla | 1×1 | 80 | 2 puertas · rejillas · tiradores · placa con el color del sistema | — |
| Banco de trabajo (Energía) / banco (Pasillo) | 2×1 / 1×2 | 30 / 20 | patas · tablero · herramientas encima · cajonera; el del pasillo: asiento con cojín y patas | losa sin patas |
| Carrito | 1×1 | 40 | 4 ruedas **bajo** las esquinas · 2 baldas · asa · herramientas | ruedas separadas del cuerpo |
| Antena | 1×1 | 84 | base con trípode · mástil · plato con borde · bocina sobre 3 varillas · ondas | plato flotando |
| Maceta | 1×1 | 20 (+planta) | maceta que se estrecha abajo · tierra · tallos y hojas | cubo con hojas encima |

## La compuerta (se mide, no se mira a ojo)

`validar()` en `herramientas/pintar_zonas.py` mide en casillas **y en píxeles**: dibuja cada objeto con su máscara y comprueba que ningún par de objetos distintos se tape más de un 4 % entre sí, que nada tape una puerta, una ventana ni el pictograma de una estación, y que haya un pasillo libre de al menos 1 casilla alrededor de cada estación. `python herramientas/hoja_objetos.py` hace la hoja de contacto de todos los objetos para revisarlos uno por uno.

## Pasadas de realismo (cómo se ve "de verdad" y no como vectores)

Cada bloque (`caja()` en `pintar_zonas.py`) lleva de serie:

| Capa | Qué hace | Por qué |
| --- | --- | --- |
| Degradado por bandas | la mitad de abajo de cada cara, más oscura | la luz viene de arriba |
| Oclusión de contacto | franja oscura donde toca el suelo + sombra difusa bajo el objeto | sin ella los objetos "flotan pegados" |
| Sombra arrojada suave | desenfocada, hacia la derecha | luz desde la izquierda |
| Metal cepillado | rayitas finas **paralelas a la arista horizontal de cada cara** (26,57° y 153,43° en pantalla) | material, y respeta la perspectiva |
| Filos | brillo bajo la arista de arriba y en la arista delantera | volumen |
| Tornillos | en las esquinas de las caras grandes | escala y realismo |
| Contorno | grueso en la silueta, fino en las aristas interiores | separa el objeto del fondo sin aplanarlo |
| Brillo emisivo | halo suave alrededor de pantallas y luces (no del agua) | lo que emite luz se ve encendido |

Cilindros: reflejo vertical a la izquierda y bandas hacia la sombra; tapa con brillo en el borde. Tela (bolsas): tapa acolchada, arrugas y correas. Hojas: dos tonos y nervio. Cables y tubos: entran al suelo por un pasamuros (las salas no tienen techo: nada acaba en el aire).

**Trampa técnica:** en Pillow, dibujar con transparencia sobre una imagen RGBA **reemplaza** el píxel en vez de mezclarlo; `Lienzo.velo()` compone aparte para mezclar bien.

## Escala real (medida, no a ojo)

Cámara isométrica 2:1 = elevación de 30°. Con el astronauta (43 px de alto) como 1,9 m: **22,6 px por metro en vertical**, 26,1 px/m en el plano y **una casilla = 2,6 m**. Con eso, lo que había antes estaba agrandado frente al personaje:

| Pieza | Alto | En metros | Frente al astronauta |
| --- | --- | --- | --- |
| Muro | 128 px | 5,7 m | 2,98× |
| Puerta | 92 px | 4,1 m | 2,14× |
| Máquina (antes) | 72 px | 3,2 m | 1,67× |
| **Rack CDRA (piloto)** | **46 px** | **2,0 m** | **1,06×** |

## Ficha piloto: rack CDRA (quita el CO₂ del aire)

Basado en el **CDRA** de la Estación Espacial (sistema ECLSS) montado en un rack estándar **ISPR**. Fuentes: [ISS ECLSS](https://en.wikipedia.org/wiki/ISS_ECLSS) · [NASA NTRS, CDRA (ICES 2020-178)](https://ntrs.nasa.gov/api/citations/20205003542/downloads/ICES-2020-178.docx) · [NASA NTRS, estado del ECLSS (ICES 2023-437)](https://ntrs.nasa.gov/api/citations/20230007449/downloads/ICES-2023-437%20ISS%20ECLS%20Overview%20of%20Events%202022%20Final%20Paper.pdf).

**Medidas → píxeles** (22,6 px/m vertical; 1 casilla = 2,6 m):

| Parte | Real | En el juego |
| --- | --- | --- |
| Rack (alto × ancho × fondo) | 2,01 × 1,05 × 0,86 m | 45,5 px × 0,40 × 0,33 casillas |
| Bancada con patas niveladoras | 1,5 × 1,3 × 0,12 m | 0,58 × 0,50 casillas × 2,7 px |
| Soplante (ventilador) | Ø 0,30 m | Ø 6,8 px en la cara |
| Lechos (4 cartuchos) | Ø 0,17 m, 0,8 m de alto | 4 cilindros de 18 px en una bahía rebajada |
| Panel de control | pantalla 0,25 × 0,15 m + 4 LED | 3,4 px de alto |
| Tubo de salida de aire | Ø 0,20 m, flexible y anillado | al difusor del suelo |
| Línea de CO₂ al exterior | Ø 0,05 m, rígida | al suelo, con cinta ámbar |
| Asas del rack | 4, en las esquinas de la cara frontal | |

**Partes y conteos:** 4 lechos (2 **desecantes**, que quitan el agua: gel de sílice y zeolita 13X, tapa ámbar; 2 de **CO₂**, zeolita 5A, tapa azul) · 1 soplante · 2 válvulas selectoras de aire con volante en la cara lateral · rejilla de entrada de aire arriba · panel con pantalla del ciclo y 4 LED · etiquetas con pictograma (gota = agua, molécula O=C=O = CO₂) · 4 asas · bancada con 4 patas.

**Materiales:** chapa pintada (violeta del interior), mate, con rayones en filos y asas · cartuchos de aluminio anodizado · tubo flexible anillado · polvo rojizo de Marte acumulado abajo y en las esquinas (el polvo marciano se cuela en todo).

**Reglas de tono (se miden):**
- Trama **solo en caras en sombra**, en la dirección de la arista horizontal de cada cara (153,43° en pantalla en la cara derecha), y la cruzada vertical solo en la sombra profunda.
- Separación según la sombra: **suave 4,5 px · media 3,2 px · profunda 2,2 px**.
- Cada trazo con temblor: **±3° y ±15 % de largo**; presión variable **±25 %** en el grosor.
- Contorno **grueso en la silueta (1,5 px) y fino en las aristas interiores (0,6 px)**: proporcional a un objeto de 46 px (con 2,2 px la silueta se comía la forma).
- Polvo rojizo más denso abajo y en las esquinas; rayones claros en filos y asas.

**Capas (en este orden):** 1 sombra de contacto → 2 caras → 3 material → 4 rebajes y sombras de paneles → 5 detalles (juntas, tornillos, rejillas, etiquetas) → 6 trama y desgaste → 7 luz propia (LED, pantalla) → 8 tinta → 9 grano. Se dibuja a **4×** el tamaño final y se reduce.

**Animación:** 4 cuadros a 12 fps en una hoja aparte: el soplante gira (4 aspas, 22,5° por cuadro, vuelta sin saltos), un LED parpadea y la barra del ciclo avanza. El cuerpo no se mueve.

**Errores a evitar → cómo se dibuja:**

| Error | Correcto |
| --- | --- |
| Caja de 3,2 m que llena la casilla | Rack de 2 m sobre una bancada; la casilla queda con espacio alrededor |
| Tubos que suben al techo (no hay techo) | Salida de aire y línea de CO₂ que bajan al suelo |
| Ventilador pintado como un círculo de pantalla | Elipse en el plano de la cara, con aspas que giran |
| Trama en la cara iluminada | Trama solo en la cara derecha y en los rebajes |
| Mismo grosor de línea en todo | Silueta gruesa, aristas interiores finas, presión variable |
| Objeto limpio de catálogo | Polvo rojizo abajo y rayones en filos y asas |

**Revisión automática** (`python herramientas/revisar_objeto.py`): escala 1,0–1,35× el astronauta · píxeles dentro de la paleta · cara izquierda más clara que la derecha · silueta legible al 25 % · densidad de trazos ≥ 2× la versión anterior · mismo resultado en dos ejecuciones.

**Jerarquía de detalle:** máximo solo en los protagonistas (las 6 máquinas de estación y el robot), medio en la utilería y bajo en el escenario: lo muy recargado distrae a los niños (`docs/aprendizaje.md`).

## Fichas de las otras 5 estaciones (mismo método que el piloto)

Las medidas están en una sola tabla, `MEDIDAS` en `herramientas/pintar_zonas.py`: el dibujo y la revisión leen los mismos números. Todas usan las mismas capas que el CDRA, con piezas comunes (`base_prota`, `material_prota`, `rebaje_prota`, `desgaste_prota`, `tinta_prota`, `cable_al_suelo`).

| Sala | Objeto real | Medidas (alto × ancho × fondo) | Frente al astronauta | Partes | Animación (4 cuadros, 12 fps) |
| --- | --- | --- | --- | --- | --- |
| Energía | Armario con 3 módulos de baterías de litio como los **ORU de la Estación Espacial** (1,04 × 0,94 × 0,53 m, 194 kg cada uno) | 1,8 × 1,1 × 1,0 m | 1,01× | 3 módulos con asas grandes, indicador de 5 segmentos, conector de potencia y luz de estado · lamas y ventilador · aviso de alto voltaje · caja de bornes con cables al suelo | el módulo de abajo se carga (un segmento parpadea) y su luz destella |
| Mando | Consola de mando sentado | 1,5 × 1,2 × 0,8 m (mesa a 0,75 m) | 0,85× | 2 pantallas (reparto de energía y órbita de Marte) · **3 mandos deslizantes: energía, oxígeno y blindaje** · botones · teclado · botón de alarma · mueble con puertas | las barras del reparto se mueven, la nave avanza en la órbita, el botón de alarma parpadea |
| Comunicaciones | Armario de servidores estándar de 42U | 2,0 × 0,6 × 1,0 m | 1,11× | puerta de cristal con reflejos · 8 servidores con bahías de disco · panel de parcheo · ventiladores en la tapa · costura y perforado · pictograma de ondas | luces de actividad de red |
| Refugio | Tanque de agua de blindaje (el agua frena la radiación) | Ø 0,9 × 1,8 m ≈ 1100 L | 1,01× | 3 flejes con remaches · mirilla de nivel graduada (75 %) · placa H2O y escudo · válvula con volante rojo y salida al suelo · brida con 14 pernos, boca de hombre y respiradero | suben burbujas por la mirilla y la superficie del agua ondula |
| Invernadero | Unidad de cultivo con 3 cámaras del alto de un **Veggie** (47 cm; luz roja de 630 nm + azul de 455 nm → magenta, y verde de 530 nm) | 1,8 × 1,0 × 0,6 m | 1,01× | depósito de raíces con mirilla y bomba · tapa de LED magenta con LED verdes · manta de raíces con almohadas · lechuga roja, verde y mizuna · fuelle transparente con pliegues · tubos de riego | la luz de cultivo respira, cae una gota por el tubo, la bomba parpadea |

Fuentes: [NASA NTRS: baterías de litio de la ISS](https://ntrs.nasa.gov/api/citations/20170004112/downloads/20170004112.pdf) · [Aerojet Rocketdyne, SPW 2022](https://spw.aerospace.org/files/2022/05/2022-13_7_SLT1_E.-Soendker_Aerojet-Rocketdyne_Charts.pdf) · [NASA NTRS: especificaciones de Veggie](https://ntrs.nasa.gov/api/citations/20160001325/downloads/20160001325.pdf) · [Vegetable Production System](https://ipfs.ssi.eecc.de/ipns/en.wikipedia-on-ipfs.org/wiki/Vegetable_Production_System).

**Revisión** (`python herramientas/revisar_objeto.py`): las 6 estaciones en verde. La regla de luz se mide con la **mediana de cada cara sin su contorno de tinta** (medirla en una franja junto al borde caía sobre la tinta de la silueta y daba falsos fallos). Esa regla encontró un error real: el frente de cristal de los servidores era más oscuro que su lateral, como si la luz viniera de la derecha; ahora el cristal refleja la luz y el lateral está en sombra.

## Utilería a escala real

Cada objeto de utilería se dibuja como siempre y después se **encoge igual en las tres dimensiones desde el centro de su huella en el suelo** (en una proyección isométrica, escalar la imagen es exactamente escalar el objeto en 3D, así que la perspectiva no se rompe). La tabla `UTILERIA` de `pintar_zonas.py` dice el alto real y el alto con el que está dibujado:

| Objeto | Alto real | Factor |
| --- | --- | --- |
| Bolsa de carga CTB (0,50 × 0,42 × 0,25 m) | 0,25 m por bolsa | 0,19 |
| Bidón de agua de 200 L | 0,9 m | 0,43 |
| Maceta con planta | 0,9 m | 0,34 |
| Mesa (con su holograma encima) | 0,75 m | 0,51 |
| Banco del pasillo | 0,45 m | 0,44 |
| Banco de trabajo | 0,9 m | 0,64 |
| Estantería | 1,8 m | 0,48 |
| Escritorio | 0,75 m | 0,61 |
| Litera | 1,75 m | 0,68 |
| Taquilla | 1,8 m | 0,51 |
| Carrito | 0,95 m | 0,47 |
| Antena de plato | 1,8 m | 0,43 |
| Bandeja de brotes | 0,8 m | 0,82 |

Al encoger, la tinta se dibuja más gruesa antes (`Lienzo.grosor`, hasta ×2,6) para que el contorno no desaparezca, y la utilería encogida se dibuja a 4×.

**Colisión con la huella real.** Cada objeto guarda en `zonas.json` su rectángulo real (`caja`, en casillas): la bancada de las estaciones y la huella encogida de la utilería. El juego choca contra esos rectángulos (comprobación de cajas, no de esquinas, para que un objeto pequeño no se cuele entre las esquinas del astronauta) y los usa para decidir qué va delante. Probado: el astronauta se detiene justo en el borde de la batería (c = 1,93 = 2,20 − 0,27) y ya pasa pegado a ella, por donde antes bloqueaba la casilla entera.

## Salas a escala real

**El problema.** Con la casilla de 2,6 m el pasillo medía 31 × 21 m, los muros 5,7 m y las puertas 4,1 m: junto a objetos reales, las salas parecían hangares vacíos. La raíz: los muros (128 px) y las puertas (92 px) estaban dibujados para personajes **del doble**.

**La solución.** En el mundo, personas y objetos van al doble: **45,2 px por metro** (`ESCALA_MUNDO = 2`), así que **una casilla mide 1,3 m** y los muros y puertas ya son reales sin redibujarlos:

| Pieza | Alto en pantalla | En metros |
| --- | --- | --- |
| Muro | 128 px | 2,8 m |
| Puerta (hueco de 0,84 casillas) | 92 px | 2,0 × 1,1 m |
| Astronauta | 86 px | 1,9 m |
| Rack CDRA | 91 px | 2,0 m |
| Mesa | 34 px | 0,75 m |

**Las salas, en metros** (las comprueba `validar()`):

| Sala | Casillas | Metros |
| --- | --- | --- |
| Pasillo | 11 × 5 | 14,3 × 6,5 m |
| Energía, Comunicaciones, Invernadero, Soporte vital | 7 × 5 | 9,1 × 6,5 m |
| Mando | 8 × 5 | 10,4 × 6,5 m |
| Refugio | 9 × 5 | 11,7 × 6,5 m |

Como referencia, Mars Dune Alpha (el hábitat de la misión CHAPEA de la NASA) tiene unos 158 m² en total; aquí cada módulo mide entre 59 y 93 m².

**Cómo se dibuja cada cosa a esa escala:**

- **Estaciones:** se dibujan con su ficha (22,6 px/m) a 4× (K = 16) y se reducen al doble de tamaño. Ocupan 2 × 2 casillas (servidores 1 × 2 y cultivo 2 × 1). Como cuestan unos 10 s por cuadro, se guardan en `herramientas/.cache`; la clave incluye todo el código de dibujo, así que cualquier cambio las vuelve a dibujar.
- **Utilería pequeña** (bolsas de carga, bidón, maceta): se encoge igual en las tres dimensiones, con factores de 0,38, 0,87 y 0,69.
- **El resto de la utilería:** su huella es la de la rejilla (menos 0,1 casillas por lado) y solo cambia el alto (`IsoZ`). Factores: mesa 1,03, banco del pasillo 0,88, banco de trabajo 1,27, estantería 0,97, escritorio 1,21, litera 1,36, taquilla 1,02, carrito 0,93, antena 0,87 y bandeja 1,64.
- **Ventanas:** no se pintan detrás de nada de más de 0,7 m que esté en las dos primeras filas. Los rótulos de las puertas se desplazan hacia dentro si no caben en la esquina.

**`validar()`, con las huellas reales:** comprueba que

- haya al menos 0,26 m entre objetos distintos (los grupos de cajas, bidones o taquillas pueden ir juntos);
- el astronauta (radio de 0,35 m), moviéndose en una rejilla de 16 cm, llegue a todas las puertas y estaciones;
- no queden rincones a los que no se llega de más de 0,5 m²;
- la sala no esté ocupada en más del 35 %.

Después, la compuerta en píxeles mide que nada tape a nada.

**En el juego:** `zonas.json` lleva `"escala_personajes": 2`. Con eso, `Base.js` dibuja al doble al astronauta, su sombra, el polvo de las pisadas y el gesto de agacharse, y `robot.js` lo lee de `escena.escalaPj`.

## Arte de los minijuegos

`python herramientas/pintar_minijuegos.py [paneles|filtro|invernadero|fondos]` → `public/assets/minijuegos/` (1,5 MB).
Misma línea que el mapa: tinta violeta, luz desde la izquierda y trama en la sombra. Se dibuja en el lienzo lógico de los
minijuegos (960 × 600) y sale al doble.

| Minijuego | Piezas | Referencia real |
| --- | --- | --- |
| Paneles | `mj_panel` (7 × 3 módulos alineados con la rejilla), `mj_polvo_0..3` | Celdas de silicio monocristalino (pseudocuadradas, 2 barras colectoras). El polvo de óxido de hierro se pegaba a los paneles de Spirit y Opportunity |
| Filtro de CO₂ | `mj_carton`, `mj_cinta`, `mj_manguera`, `mj_ranura_*`, `mj_bandeja`, `mj_adaptador` | El "buzón" del Apolo 13 (1970): tapa del plan de vuelo, cinta gris, manguera del traje, cartucho cuadrado de LiOH y tubo redondo |
| Invernadero | `mj_veggie`, `mj_cojin_0..2`, `mj_tallo_0..2`, `mj_flor_0..2`, `mj_moho` | Cámara Veggie de la Estación Espacial (LED rojos, azules y verdes, fuelles, almohadas con arcilla cocida) y las zinnias de 2016 |
| Fondos | `mj_fondo_paneles`, `mj_fondo_filtro`, `mj_fondo_invernadero`, `mj_fondo_consola` | Suelo de Marte bajo el panel; muros de la base, oscurecidos para que se lea la interfaz |

En el código solo se cambiaron las figuras por imágenes; la lógica de los minijuegos es la del rol 2.
- Polvo y piezas conservan su tamaño y su zona para tocar o arrastrar.
- El tallo y la flor van en contenedores, para que el minijuego los siga estirando con `setScale`.
- El moho aparece cuando una planta tiene moho.

También se arreglaron dos detalles del prototipo del invernadero:
- faltaba importar `spawnFloatingText`, y regar trababa el juego;
- la presentación de la misión estaba repetida.
