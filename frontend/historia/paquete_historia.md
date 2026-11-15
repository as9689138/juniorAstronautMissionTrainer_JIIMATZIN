# Paquete de Historia, música y sonido
Junior Astronaut Mission Trainer · Responsable: Rol 5 · Versión 4 del 14 nov 2026 (integra el guion narrativo v3 de tu compañera)

Contenido: 1) Cómo se integra, 2) Personajes y tono, 3) Cartas de mejora, 4) Minijuegos, 5) Audio, 6) Video demo, 7) Datos reales verificados, 8) Misiones reales de referencia, 9) APIs recomendadas, 10) Voz en off con IA, 11) Pendientes, 12) Qué se tomó del guion de la compañera y qué se corrigió.
Los textos de la historia están en `historia.ink` (fuente) y `historia.json` (compilado, inkjs 2.4.0).

---

## 1. Cómo se integra (para Rol 1, 2 y 4)

**El juego decide cuándo llamar cada nudo** con `story.ChoosePathString("nombre")`.

| Nudo | Cuándo lo llama el juego |
|---|---|
| `inicio` o `prologo` | Al pulsar "Comenzar misión". Es el prólogo "Viaje espacial" |
| `carta_wen`, `carta_jud`, `carta_atl` | Para dibujar las 3 cartas de selección de rol (título, habilidades y 2 o 3 frases) |
| `introduccion` | Después de que el jugador elige su rol. Es igual para los tres roles |
| `manana` | Al empezar cada sol (lee `sol`). En el sol 1 la IA explica la consola de energía |
| `dia` | Fase de día: una línea de la IA que abre los minijuegos |
| `mini_paneles`, `mini_filtro`, `mini_riego` | Al abrir ese minijuego (explicación, dato y consejo). Después el juego llama `…_gana` o `…_falla` según el resultado |
| `emergencia_solar`, `emergencia_radiacion`, `emergencia_polvo`, `emergencia_co2`, `emergencia_calor`, `emergencia_fuga`, `emergencia_impacto`, `emergencia_comunicacion` | Al disparar la emergencia (8 en total; cada una cierra con un dato real de la NASA). Ver propuesta de calendario abajo |
| `noche_1` … `noche_10` | Fase de noche de cada sol |
| `fin_exito` | Al terminar el sol 10 con los 3 recursos mayores que 0 |
| `fin_energia`, `fin_oxigeno`, `fin_blindaje` | Cuando ese recurso llegue a 0 |

**Calendario sugerido de emergencias (Rol 2 lo decide).** Se alinea con el texto de la mañana de cada sol: sol 1 ninguna (tutorial); 2 `calor`; 3 `fuga`; 4 `co2`; 5 `radiacion`; 6 `polvo`; 7 `impacto`; 8 `comunicacion` (retraso de la Tierra; la mañana del sol 8 ya lo anticipa); 9 `solar`; 10 a elección. Si se usa DONKI en vivo, un evento real de eyección o de partículas dispara `emergencia_solar` o `emergencia_radiacion` y se salta el calendario. **Un minijuego por sol, rotando** (paneles, filtro, riego): así cada sol sigue durando cerca de lo estimado; con los 3 en cada sol, el juego se alarga. Ningún minijuego sube el blindaje: solo las decisiones de emergencia y las cartas.

**Variables que escribe el juego:** `rol` (`"wen"`, `"jud"` o `"atl"`), `jugador` (nombre del personaje elegido: Wenceslao, Judith o Atlas), `energia`, `oxigeno`, `blindaje` (niveles: 0 agotado, 1 bajo, 2 medio, 3 alto) y `sol`. Las noches añaden un comentario si un recurso está en nivel bajo (1) o menos. Los `costo:` de las decisiones son de 1 nivel.

**Saludo por rol.** En la introducción la IA saluda según `rol` (nudo `saludo`, texto adaptado del guion de la compañera). Los consejos de los minijuegos también cambian según el rol: el personaje elegido da su consejo; si su rol no tiene uno para ese minijuego, lo da otro de la tripulación. Rol 2 puede usar ese mismo dato para dar un bono al jugador (idea: el consejo del rol elegido se convierte en pista visible).

**El jugador es uno de los 3 personajes.** Los tres hablan en todas las escenas. Cuando `hab` coincide con `rol`, el juego muestra esa línea como del propio jugador (retrato del jugador). Así no hay que escribir tres historias distintas.

**Etiquetas (#) en cada línea.** Cada línea trae el nombre del que habla al inicio ("Atlas: ...") y estas etiquetas:

| Etiqueta | Significado |
|---|---|
| `hab:` | Quién habla: `wen`, `jud`, `atl`, `ia`. Si no hay `hab`, es narración |
| `cara:` | Expresión del retrato (lista abajo) |
| `musica:` | `inicio`, `dia`, `emergencia`, `noche`, `exito`, `fracaso` |
| `sfx:` | `alarma`, `apagon`, `celebracion`, `viento_marte`, `remolino` (emergencia de polvo y `noche_6`), `primer_audio` (`noche_3`) |
| `dato:` | Id de la ficha "Dato real" que debe mostrarse (ver sección 7) |
| `costo:` | Coste de una decisión de emergencia, p. ej. `energia-1`. Rol 2 puede cambiar los números |
| `efecto:` | Resultado de un minijuego, p. ej. `oxigeno+1` (gana) u `oxigeno-1` (falla) |
| `instruccion` | La línea es la instrucción del minijuego (mostrar como texto de ayuda, no como diálogo) |
| `visual:linterna` | Energía baja: oscurecer la cabina y mostrar la linterna del casco |
| `titulo:`, `habilidades:`, `carta:` | Datos de las cartas de personaje y de los títulos de pantalla |
| `fin:` y `accion:` | Qué final es y qué hace el botón: `reiniciar`, `creditos` o `elegir_rol` |

**Expresiones de retrato que necesita Rol 4** (3 por personaje):
- Wenceslao (`wen`): sonriente, concentrado, sorprendido
- Judith (`jud`): curiosa, asombrada, apenada
- Atlas (`atl`): sereno, preocupado, orgulloso
- IA (`ia`): neutral, feliz, procesando

**Nombres.** En `historia.ink` están en las constantes `WEN`, `JUD`, `ATL`, `IA`. Se cambian en un solo lugar.

---

## 2. Personajes, cartas y tono

**Tono general.** Aventura de película con humor de tripulación. Frases cortas, palabras de uso diario, un dato real por escena. Hay tensión en las emergencias, pero nunca miedo ni daño: los fracasos siempre son "la base se apaga y se reinicia la misión", y la IA cierra con lo que se aprendió.

**El jugador** elige su rol en 3 cartas y juega como ese personaje. Los otros dos son su tripulación.

### Ingeniero Wenceslao (`wen`): el que arregla todo
- **Habilidades (carta):** Mecánica, Física, Electricidad, Informática y Disciplina.
- **Personalidad:** práctico, bromista y orgulloso de sus máquinas. Le gustan los retos.
- **Cómo habla:** rápido, con comparaciones de taller y chistes sobre la cinta adhesiva.
- **Muletilla:** "Si algo se rompe, es mío."
- **Qué enseña:** que casi todo problema tiene arreglo si se piensa con paciencia.
- **Ejemplo:** "Esto está cerca de ser emocionante."

### Científica Judith (`jud`): la que observa y pregunta
- **Habilidades (carta):** Botánica, Geología y Meteorología.
- **Personalidad:** curiosa, entusiasta y atenta a los detalles. Habla con las plantas como con amigas.
- **Cómo habla:** exclamaciones y preguntas. Explica el clima, el suelo y las plantas.
- **Muletilla:** "¡Fascinante!"
- **Qué enseña:** que mirar los datos con atención ayuda a anticiparse a los problemas.
- **Ejemplo:** "Mis plantas ayudan, pero despacio."

### Médico Atlas (`atl`): el que cuida al equipo
- **Habilidades (carta):** Anatomía y Primeros auxilios.
- **Personalidad:** sereno, protector y justo. Escucha antes de decidir. Su humor es seco y suave.
- **Cómo habla:** frases cortas y pausadas. Usa "equipo". Es quien explica cómo afectan al cuerpo la radiación y la gravedad.
- **Muletilla:** "Respiramos hondo y decidimos."
- **Qué enseña:** que decidir con calma en equipo vale más que decidir rápido.
- **Ejemplo:** "Mantengamos la calma. Tenemos pocos minutos."

### IA de la base (`ia`): la literal entrañable
- **Personalidad:** precisa y amable, y está aprendiendo a entender a los humanos. No sabe mentir y a veces se toma los chistes al pie de la letra.
- **Cómo habla:** frases cortas con formato de aviso ("Aviso:", "Alerta:") y una línea de "Dato curioso:" para explicar el dato real. Al final de cada fracaso resume lo que se aprendió.
- **Muletilla:** "Dato curioso:"
- **Qué enseña:** que la información real es la mejor herramienta del equipo.
- **Ejemplo:** "Aviso: esto es la misión de prueba antes de ir a Marte. Nadie corre peligro."

**Ideas de habilidad por rol para Rol 2** (propuestas, no están en la historia): Wenceslao rinde más en el minijuego de los paneles y en el ahorro de energía; Judith rinde más en el invernadero y recibe más tiempo en la cuenta atrás de las emergencias de clima; Atlas reduce el coste de las decisiones de blindaje y radiación.

### Prólogo y tarjetas
- **Prólogo "Viaje espacial":** el texto de las notas de arte, sin cambios de contenido (solo corregí espacios y puntuación). Está en el nudo `prologo`. Tiene 11 pantallas.
- **Cartas:** los textos de las cartas están resumidos y reescritos en lenguaje de 7 a 12 años (nudos `carta_wen`, `carta_jud`, `carta_atl`). Las definiciones largas de las notas son muy técnicas para ese público.
- **Cambio en "Militar":** en la carta de Wenceslao puse "Disciplina" en lugar de "Militar", para mantener el tono de entrenamiento y equipo. Se puede volver a cambiar en una línea.
- **Introducción "Año 2030…":** el nudo `introduccion` abre con la misión real CHAPEA (cuatro voluntarios de la NASA viven 378 días en una base simulada de Marte, desde 2023) y sigue en 2030, con la Base Marte Uno como misión de prueba. Lo de 2030 es ficción. Después se presentan los tres personajes y la IA explica los 3 recursos y sus 3 niveles.

---

## 3. Cartas de mejora (7)

**Regla propuesta:** ninguna carta es gratis. Cada una cuesta 1 nivel de un recurso al instalarla y el jugador solo puede tener 3 cartas por partida. El efecto y el costo son una sugerencia para Rol 2; los números se ajustan en el balance. Cada vez que el jugador supera un sol, la IA ofrece una carta. Las cartas 5 a 7 vienen del guion de la compañera.

| Carta | Texto para el niño | Efecto sugerido | Costo sugerido | Dato real |
|---|---|---|---|---|
| **Paneles Plus** | Paneles más grandes para captar más luz. En Marte llega menos luz, ¡hay que aprovecharla! | Más energía cada mañana | −1 blindaje (se usan placas del refuerzo para armar los paneles) | `luz_solar_marte` |
| **Baterías de respaldo** | Guardan energía del día para que la noche no se quede a oscuras. | Menos energía perdida de noche | −1 oxígeno (mientras se instalan, se apaga un rato el reciclaje de aire) | `sol_marciano` |
| **Filtro Súper CO₂** | Un filtro nuevo que dura más tiempo y deja el aire más limpio. | El filtro tarda más en saturarse | −1 energía (el filtro nuevo consume más batería) | `moxie` |
| **Ladrillos de regolito** (antes "Escudo de regolito", mezclado con "Ladrillos de polvo espacial" de la compañera) | El regolito es la tierra y el polvo de Marte. Apilado en las paredes y en parches, ayuda a frenar parte de la radiación. | Más blindaje (+1 nivel) | −1 energía (hay que salir a construir con las máquinas) | `radiacion_curiosity` |
| **Súper Jardín espacial** (antes "Luz verde del invernadero") | Mejores luces y ventiladores para que las plantas crezcan sanas y suelten más oxígeno. | Más oxígeno por sol | −1 energía (luces y ventiladores gastan batería) | `veggie_zinnias` |
| **Código de Margaret Hamilton** (antes "Linterna del casco") | Un programa inspirado en la científica que programó el viaje a la Luna. Hace que la batería dure más de noche y la linterna ilumine más. | Menos energía perdida de noche y menos oscuridad con energía baja | −1 oxígeno (mientras programan, nadie cuida las plantas) | `margaret_hamilton` |
| **Entrenamiento de astronauta** (nueva, Medicina) | Ayuda a la tripulación a aguantar mejor cuando hay poco aire, para que no se nuble la pantalla. | Más aguante con oxígeno bajo | −1 energía (el simulador de entrenamiento gasta batería) | `apolo13` |

---

## 4. Minijuegos (3)

Cada minijuego se abre con un nudo `mini_*` (la primera vez, con su ficha "¿Sabías que?"; las demás veces, una línea corta) y se cierra con `mini_*_gana` o `mini_*_falla`. La mecánica de los dos últimos viene del guion de la compañera, que es más rica y está atada a un evento real. Rol 2 decide si la adopta.

### Limpiar los paneles: "¡Adiós, polvo!" (energía)
- **Evento real:** los robots Spirit y Opportunity (Marte, desde 2004) acumulaban polvo en los paneles; a veces el viento los limpiaba solo y recuperaban energía. A Spirit se le vio pasar un remolino de polvo. Aun así no se puede contar con eso. `viento_limpia`
- **Instrucción:** "Desliza el dedo sobre los paneles para quitar el polvo antes de que oscurezca."
- **Consejo:** Judith: "Este polvo es finito y se pega. Límpialo con movimientos suaves." Si el rol es otro: Wenceslao: "Empieza por los paneles más tapados."
- **Gana:** IA: "¡Genial! Los paneles brillan otra vez y la batería sube." (energía +1)
- **Falla:** Wenceslao: "Quedó mucho polvo. Esta noche habrá poca batería." (energía -1)

### Cambiar el filtro de CO₂: "¡Aire limpio!" (oxígeno)
- **Evento real:** Apolo 13 (1970). Tres astronautas en una cabina diseñada para dos; los filtros de CO₂ del módulo de mando eran cuadrados y el hueco del módulo lunar era redondo. Los ingenieros en tierra inventaron un adaptador con bolsas de plástico, cartón de la tapa del plan de vuelo, mangueras de los trajes y cinta. `apolo13`
- **Mecánica propuesta (de la compañera):** "Arma el adaptador": arrastrar cartón, bolsa, manguera y cinta para que el filtro cuadrado encaje en el hueco redondo antes de que se acabe el tiempo.
- **Consejo:** Atlas (si el rol es Atlas): "Si no limpiamos el aire rápido, nos marearemos. Concéntrate." Si no: Wenceslao: "No lo metas a la fuerza. Usa el cartón como embudo y pega bien los bordes."
- **Gana:** IA: "¡Lo lograste! El filtro quedó bien sellado." (oxígeno +1)
- **Falla:** IA: "Se escapó un poco de aire cargado. El aire bajó." (oxígeno -1)

### Regar el invernadero: "¡Gotas de vida!" (oxígeno)
- **Evento real:** Estación Espacial Internacional, enero de 2016. Las primeras zinnias que florecieron allí tuvieron moho por humedad; el astronauta Scott Kelly las cuidó y se recuperaron. En el espacio el agua no cae: flota en burbujas. `veggie_zinnias`
- **Mecánica propuesta (de la compañera):** medidor por maceta: regar solo cuando esté en amarillo y prender el ventilador si hay gotitas flotando.
- **Consejo:** Judith: "Agua solo cuando el medidor esté en amarillo." Si el rol es otro: Atlas: "Si les sale moho, el aire se ensucia."
- **Gana:** Judith: "¡Qué bonitas! Llenando la base de oxígeno." (oxígeno +1)
- **Falla:** Judith: "Cayó demasiada agua y salió moho. Gastamos aire extra." (oxígeno -1)

**Dato extra (sin cambiar):** la Estación Espacial recicla cerca del 90 % del agua (NASA, página ECLSS). Rol 3 puede usarlo en la ficha de riego.

---

## 5. Audio

### Temas musicales (3, originales)
| Tema | Uso | Estilo | Notas para LMMS o BandLab |
|---|---|---|---|
| **Amanecer rojo** | Exploración de día | Aventura optimista, tipo película | 100 BPM, Re mayor. Pad suave, arpegio de sintetizador, bajo ligero, percusión ligera. Bucle de 90 s |
| **Cuenta atrás** | Emergencia | Tensión pero con ritmo | 140 BPM, La menor. Pulso de bajo, hi-hat rápido, notas agudas repetidas, riser. Bucle de 60 s |
| **Noche en Marte** | Escenas de noche | Calma, misterio | 70 BPM, Do mayor (modo lidio). Piano suave, pad, campanitas. Sin percusión. Bucle de 90 a 120 s |

También dos jingles cortos que no cuentan como tema: **éxito** (10 a 15 s, ascendente y luminoso) y **fracaso** (6 a 8 s, descendente pero suave, sin dramatismo).

### Efectos de sonido
Ids que usa la historia: `alarma`, `apagon`, `celebracion`, `viento_marte`. Para el resto del juego conviene también: clic de botón, carta que se voltea, paneles raspando, clic de filtro, gotas de riego, puerta presurizada, aviso de nueva emergencia, cuenta atrás (tictac). Se pueden generar con jsfxr o Audacity.

### Sonidos reales de Marte (Perseverance)
- **Dónde:** nasa.gov/sounds-from-beyond. Ahí NASA publica, entre otros, el viento y el sonido de Perseverance rodando, el primer registro de impactos del láser SuperCam en una roca, el helicóptero Ingenuity en su cuarto vuelo, 16 minutos de audio sin procesar del rover en el cráter Jezero y un remolino de polvo. El sonido del compresor de MOXIE está en science.nasa.gov/resource/the-sound-of-moxie-at-work-on-mars/.
- **Licencia:** la propia página remite a las Media Usage Guidelines de NASA, y el contenido se usa conforme a ellas. La insignia, el logotipo y los identificadores de NASA no son de dominio público, así que **no se pone el logo de NASA en el juego ni en el video, solo su nombre en texto**. Confirmar cada archivo antes de incluirlo.
- **Pantalla de créditos (texto sugerido):** "Sonidos de Marte: NASA/JPL-Caltech (rover Perseverance), usados según las Media Usage Guidelines de NASA. Este juego no está afiliado ni respaldado por la NASA."
- **Uso en el juego:** guardar los archivos dentro del juego. No hace falta ninguna API en vivo para el audio.

### Estado del audio (14 nov)
| Pieza | Estado | Archivos |
|---|---|---|
| Música: 3 temas y 2 jingles | Original, sintetizada con código y asistencia de IA (sin Suno ni material de terceros); licencia CC0; declarar el uso de IA en créditos | `musica_dia` (Amanecer rojo; también como `musica_inicio`), `musica_emergencia`, `musica_noche`, `musica_exito`, `musica_fracaso` |
| Efectos de sonido (versión 2, sintetizados) | Hechos, WAV y OGG | `sfx_alarma`, `sfx_apagon`, `sfx_celebracion`, `sfx_viento_marte`, `sfx_puerta_presurizada`, `ui_clic_boton`, `ui_carta_voltea`, `ui_carta_mejora`, `ui_tictac`, `ui_aviso_emergencia`, `mj_paneles_raspando`, `mj_filtro_clic`, `mj_gotas_riego` |
| Sonidos reales de Perseverance | Descargados, recortados, volumen igualado | `sfx_primer_audio_marte` (20 s, noche_3), `sfx_viento_marte_real_loop` (bucle de 5 s), `sfx_remolino_corto` (7.5 s, emergencia de polvo), `sfx_remolino_polvo` (17 s, noche_6 y minijuego de paneles) |
| Créditos de los sonidos | Texto listo | `CREDITOS_sonidos_reales_de_Marte.txt` |

**Fuentes de los sonidos reales (fichas copiadas de NASA, descargados el 14 nov 2026):** "First Audio Recording of Sounds on Mars" (SuperCam, 19 feb 2021; NASA/JPL-Caltech/LANL/CNES/CNRS/ISAE-Supaero) y "NASA's Perseverance Records a Martian Dust Devil" (27 sep 2021, sol 215; NASA/JPL-Caltech/LANL/CNES/CNRS/INTA-CSIC/Space Science Institute/ISAE-Supaero). El primero suena apagado porque el mástil seguía plegado; solo se oye un poco de viento.

---

## 6. Guion del video demo (2 a 3 minutos)

**Reglas.** Sin menores de 18 años, ni en cámara ni en voz. Voz en off generada con IA (voz adulta, no clonada de una persona real) y declarada como tal. Subtítulos en español. Solo captura de pantalla del juego y gráficos. Mostrar al final el aviso de no afiliación con la NASA.

| Tiempo | Bloque | En pantalla | Voz en off |
|---|---|---|---|
| 0:00 a 0:35 | **1. El problema** | Imágenes de Marte, texto "10 soles" | "¿Cómo se prepara una niña o un niño para vivir en Marte? Los astronautas practican durante años. La NASA hasta hizo vivir a cuatro voluntarios 378 días en una base simulada de Marte. Nosotros hicimos un juego para que cualquiera pueda practicar. Una misión de diez soles. Un sol es un día en Marte." |
| 0:35 a 1:55 | **2. El juego** | Captura: pantalla de inicio, elegir nombre, consola de energía, emergencia con cuenta atrás, un minijuego, una noche, final de fracaso, final de éxito | "Eres el astronauta de la Base Marte Uno. Cada sol, repartes tres recursos: energía, oxígeno y blindaje. Pero la energía nunca alcanza para todo. Cuando llega una tormenta solar, hay una cuenta atrás y una decisión con coste. Limpia los paneles, cambia el filtro de CO₂, riega el invernadero. De noche, tu tripulación te cuenta algo real sobre Marte. Y si un recurso llega a cero, la base se apaga, se reinicia la misión, y la IA te explica qué aprendiste." |
| 1:55 a 2:40 | **3. Los datos reales** | Pantalla de ficha "Dato real", logos de las fuentes (solo texto), pantalla de créditos | "Todo está basado en datos reales. Las emergencias vienen de historias de verdad: el Apolo 13 y su filtro de aire arreglado con cinta y cartón, la estación Skylab y su parasol, la fuga de la Estación Espacial Internacional. Las tormentas solares se vigilan con DONKI y NOAA, y la radiación la mide el rover Curiosity. Y los sonidos que escuchas en la noche son grabaciones reales del rover Perseverance en Marte." |
| 2:40 a 2:55 | **Cierre** | Título y enlace | "Junior Astronaut Mission Trainer. Aprende como un astronauta, con datos reales." |

**Edición.** Música "Amanecer rojo" en bajo volumen durante el problema, "Cuenta atrás" solo en la parte de la emergencia, "Noche en Marte" al hablar de las noches. Mantener la voz clara por encima de la música (aprox. 12 dB).

---

## 7. Datos reales verificados

Cada ficha `dato:<id>` está verificada contra una fuente de NASA el 14 nov 2026. Rol 3 debe copiar fuente y fecha a la ficha. Lo que no pude verificar está marcado.

| Id | Qué dice el juego | Fuente |
|---|---|---|
| `chapea` | Cuatro voluntarios vivieron 378 días en una base simulada de Marte (3D, en Houston), desde el 25 jun 2023 | nasa.gov/?p=439942 · nbcnews.com (NASA completes first mission simulating astronaut life on Mars) |
| `sol_marciano` | Un sol dura 24 h 39 min 35 s; los equipos de misiones reales trabajan con horario marciano | jpl.nasa.gov/news/press_kits/mars_2020/landing/quick_facts · astrobiology.nasa.gov/news/check-type-living-on-mars-time |
| `luz_solar_marte` | Marte está a 1.5 UA del Sol; recibe 589 W/m² frente a 1367 en la Tierra (menos de la mitad) | science.nasa.gov/mars/facts · ntrs.nasa.gov (TM-2001-210935) |
| `sonidos_perseverance` | Perseverance tiene dos micrófonos y grabó viento, ruedas, motores, láser e Ingenuity | nasa.gov/sounds-from-beyond · nasa.gov/?p=71031 |
| `moxie` | MOXIE hizo 122 g de oxígeno en 16 ejecuciones, lo que respira un perro pequeño en 10 horas | mars.nasa.gov/mars2020/spacecraft/instruments/moxie |
| `radiacion_curiosity` | Marte no tiene campo magnético global; el instrumento RAD de Curiosity mide la radiación en el suelo | jpl.nasa.gov/news/how-nasas-curiosity-rover-is-making-mars-safer-for-astronauts · nasa.gov (Real Martians) |
| `tormentas_polvo` | La tormenta de 2018 rodeó el planeta; Opportunity envió su última señal el 10 jun 2018 y entró en hibernación sin luz para sus paneles | science.nasa.gov/mission/mer-opportunity · jpl.nasa.gov (Six Things About Opportunity's Recovery Efforts) · svs.gsfc.nasa.gov/30983 |
| `percloratos_suelo` | Phoenix halló percloratos; esas sales dañan a casi todos los seres vivos y dificultan cultivar; se estudia quitarlas con microorganismos | science.nasa.gov/mission/mars-phoenix · science.nasa.gov/biological-physical/investigations/efri-elis-kpmsg |
| `gravedad_marte` | Gravedad de Marte: 38 % de la terrestre (40 kg se sentirían como unos 15, cuenta propia: 40 × 0.38) | jpl.nasa.gov/news/press_kits/mars_2020/landing/quick_facts |
| `clima_espacial` | Las eyecciones de masa coronal tardan 1 a 3 días en llegar a la Tierra (las más rápidas, 15 a 18 h); DONKI registra eyecciones, fulguraciones, partículas solares y tormentas geomagnéticas; MAVEN comprobó una predicción de llegada a Marte | nasa.gov/solar-system/cme-week-how-nasa-watches-cmes · swpc.noaa.gov/phenomena/coronal-mass-ejections · ccmc.gsfc.nasa.gov/tools/DONKI · nasa.gov (MAVEN Observes Martian Light Show) |
| `tierra_desde_marte` | Curiosity fotografió la Tierra el 31 ene 2014 como una estrella brillante, con la Luna al lado, a unos 160 millones de km | science.nasa.gov/resource/earth-from-mars |
| `marte_base` (aire y frío) | El aire es 95 % CO₂; el promedio es unos −60 °C y de noche baja de −60 °C | nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html |
| `viento_limpia` | Spirit y Opportunity (Marte) acumulaban polvo en los paneles; "eventos de limpieza" por viento los devolvían a más energía; a Spirit se le vio un remolino de polvo en 2005. Opportunity trabajó hasta 2018 (planeado: unos 90 soles). No siempre se confirma el remolino, por eso el texto dice "a veces el viento" | photojournal.jpl.nasa.gov (PIA03608) · space.com/861-spirit-dust-devil.html · pmc.ncbi.nlm.nih.gov/articles/PMC6350794 |
| `apolo13` | 1970: filtros cuadrados del módulo de mando vs. hueco redondo del módulo lunar; adaptador con bolsa de plástico, cartón, manguera de traje y cinta; tres astronautas en una nave para dos | nasa.gov/history/afj/ap13fj/15day4-mailbox.html · dlr.de/en/images/moon-special/carbon-dioxid-absorber-to-the-rescue · popsci.com (The Greatest Space Hack Ever) |
| `veggie_zinnias` | Zinnias en el experimento Veggie de la EEI; moho por humedad alta en diciembre de 2015; Scott Kelly las cuidó y florecieron el 16 ene 2016. **Corrección:** Kelly las llamó "la primera flor en el espacio", pero no lo fue (el trigo enano ya floreció en Mir en los 90); lo correcto es "las primeras zinnias en la EEI" | space.com/31687-zinnia-not-first-flower-in-space.html · space.com/31702 · cbsnews.com (Astronauts grow first flower in space) |
| `tormenta_1972` | Agosto de 1972: tormenta solar enorme entre Apolo 16 (abril) y Apolo 17 (diciembre); no había astronautas en el espacio; los expertos de la NASA lo atribuyen a la suerte | nationalacademies.org/read/10249/chapter/11 · svs.gsfc.nasa.gov/13275 |
| `skylab` | 14 may 1973: el escudo contra micrometeoritos y el sol se arrancó 63 s después del despegue; Skylab se sobrecalentó; la primera tripulación llegó el 25 mayo y desplegó un parasol por la esclusa, y la temperatura bajó | nasa.gov/history/skylab-2-first-repair-spacewalk · nasa.gov/?p=73999 |
| `iss_fuga_2013` | 9 may 2013: la tripulación vio copos blancos de amoníaco congelado (líquido enfriador); el 11 mayo Cassidy y Marshburn hicieron una caminata espacial (~5 h) y cambiaron una pieza; la tripulación no corrió peligro; apagar el canal costó cerca del 12.5 % de la potencia | space.com/21100-space-station-spacewalk-leak-fix.html · flightglobal.com (ISS ammonia pump replacement appears successful) |
| `mir_1997` | 25 jun 1997: la nave de carga Progress chocó con el módulo Spektr de la estación rusa Mir; el astronauta de la NASA Michael Foale estaba a bordo; la tripulación desconectó cables y selló la puerta; la estación siguió funcionando. **Corrección:** fue una nave de carga, no un meteorito | nasa.gov/?p=281772 · nasa.gov/history/SP-4225 (Mir NASA-5) · appel.nasa.gov (Progress Collides with Mir) |
| `margaret_hamilton` | Dirigió el equipo de software de vuelo del Apolo en el laboratorio del MIT; el programa de Apolo 11 manejó las alarmas del aterrizaje; Medalla Presidencial de la Libertad en 2016; **falleció el 30 sep 2026, a los 90 años** (conviene un homenaje sobrio en el crédito de la carta) | smithsonianmag.com (Margaret Hamilton Led the NASA Software Team…) · hpcwire.com (Margaret Hamilton… Dies at 90, 9 oct 2026) |
| `retraso_comunicacion` | Una señal entre la Tierra y Marte tarda de 3 a 22 minutos en un sentido, según dónde estén los planetas (la respuesta tarda otro tanto: cuenta propia, ×2). Por eso una tripulación en Marte debe saber decidir sola | science.nasa.gov/?p=354728 (Speaking Percy's Language: How to Talk so Perseverance Will Listen) |
| Minijuego de filtro y de riego | La Estación Espacial quita el CO₂ del aire con filtros especiales y recicla cerca del 90 % del agua | nasa.gov/reference/environmental-control-and-life-support-systems-eclss |

**Sin dato externo (decisión de la historia):** que la base sea una simulación de entrenamiento y que sea el año 2030 son ficción. El Atlas dice que "el cuerpo necesita ejercicio para mantenerse fuerte" y Judith que las plantas toman CO₂: son afirmaciones generales, no cifras de una misión. Quité un dato que no pude verificar (la velocidad del sonido en Marte). Del guion de la compañera quité además: que el polvo marciano se pega por "electricidad estática" y que los remolinos de polvo limpiaron los paneles de InSight (no lo verifiqué).

---

## 8. Misiones reales de referencia

| Misión | Qué aporta al juego |
|---|---|
| **CHAPEA** (NASA, Houston, 2023) | La premisa: una misión de prueba antes de ir a Marte, con 4 personas y recursos limitados |
| **Perseverance** (Marte, 2021) | MOXIE (oxígeno del CO₂), micrófonos (sonidos reales), estación del clima MEDA |
| **Curiosity** (Marte, 2012) | Radiación (RAD), foto de la Tierra como estrella, clima REMS |
| **Opportunity** (Marte, 2004 a 2018) | La tormenta de polvo que lo dejó sin energía |
| **Phoenix** (Marte, 2008) | Los percloratos del suelo |
| **MAVEN** (órbita de Marte) | Clima espacial en Marte y predicción de llegada de una tormenta solar |
| **Red de Espacio Profundo / Perseverance** (comunicaciones) | El retraso de 3 a 22 minutos de las señales entre la Tierra y Marte (`emergencia_comunicacion`) |
| **Estación Espacial Internacional** | Reciclaje de agua y quitar CO₂ del aire; el experimento Veggie (zinnias, 2016) y la fuga de líquido enfriador (2013) |
| **Apolo 13** (1970) | El adaptador del filtro de CO₂ (minijuego "¡Aire limpio!") |
| **Skylab** (1973) | El parasol contra el calor (`emergencia_calor`) |
| **Mir** (1997) | El choque con un módulo y los cables cortados para sellar la puerta (`emergencia_impacto`) |
| **Apolo: tormenta solar de 1972 y software de Margaret Hamilton** | La emergencia solar y la carta "Código de Margaret Hamilton" |
| **Spirit** (Marte, 2004) | Los "eventos de limpieza" de los paneles (minijuego de paneles) |

---

## 9. APIs recomendadas

Regla del plan: el juego nunca depende de un servicio. Todo va guardado en JSON dentro del juego, y solo dos fuentes se consultan en vivo.

1. **DONKI** (ccmc.gsfc.nasa.gov/tools/DONKI y api.nasa.gov): tiene una API web abierta con eyecciones de masa coronal, fulguraciones, partículas solares y tormentas geomagnéticas. Es la mejor para disparar `emergencia_solar` y `emergencia_radiacion`. Se pide clave en api.nasa.gov (revisar límites de uso).
2. **NOAA SWPC** (services.swpc.noaa.gov): publica JSON de alertas, escalas, índice Kp y viento solar (`products/alerts.json`, `noaa-scales.json`, `noaa-planetary-k-index.json`). Una fuente de terceros indica que no pide clave, hay que confirmarlo. Sirve de respaldo de DONKI.
3. **Clima de Marte** (Perseverance MEDA y Curiosity REMS): miden temperatura, presión, viento, humedad, radiación y polvo. No verifiqué un endpoint en vivo, así que Rol 3 debe bajar los datos y guardarlos.
4. **OSDR y RadLab** (de tu lista): para las fichas de estudios y radiación. Sin verificar por mí, son de Rol 3.
5. **NASA Trek** (de tu lista): referencia de relieve para el mapa. Es de Rol 4.
6. **Biblioteca de imágenes y video de NASA** (images-api.nasa.gov): una fuente de terceros indica que busca audio sin clave. Útil para encontrar los sonidos, pero se descargan a mano.
7. **Kit de alimentos de la Agencia Espacial Canadiense:** no sirve para Marte, trata de la Luna y de zonas remotas. Solo confirma el reciclaje de agua en la Estación.

---

## 10. Voz en off con IA

- **Voz:** adulta, en español, sin clonar la voz de ninguna persona real. Revisa que tu servicio de voz tenga una voz que suene adulta.
- **Declararla:** poner "Voz generada con IA" en el video, en los créditos y en la explicación del uso de IA que pide el plan.
- **Reglas del evento:** no encontré una regla pública de IA específica de NASA Space Apps. Otros programas de NASA sí tienen reglas distintas (uno exige declararla, otro la prohíbe), así que confirma en las reglas o preguntas frecuentes de Space Apps antes de enviar.
- **Guion:** frases cortas, una idea por frase y pausas marcadas con punto, para que la voz suene natural. Dejar los subtítulos en español.

---

## 11. Pendientes que necesito de ti

1. **Nombre de la científica.** El guion de la compañera la llama "Margaret"; el equipo ya había definido "Judith" y el arte de Rol 4 usa ese nombre. Dejé **Judith** y usé "Margaret Hamilton" como homenaje en una carta. Si prefieren cambiar el nombre del personaje, es un cambio en una línea (`CONST JUD`).
2. **Confirmar la continuación de "Año 2030…"** y la mención de CHAPEA.
3. **Confirmar los 3 niveles** de los recursos: 0 agotado (final de fracaso), 1 bajo, 2 medio, 3 alto. Las cifras del guion de la compañera (−25, −15, −30…) son de un esquema de 0 a 100; las pasé a 1 nivel por decisión, con un solo coste por opción. Si Rol 2 usa 0 a 100, se vuelven a escribir.
4. **Cuántos minijuegos por sol.** Propongo 1 por sol, rotando. Con los 3 cada sol, el juego pasa de 15 min.
5. **Mecánica de los minijuegos** (filtro con adaptador y riego con medidor) y calendario de emergencias: decide Rol 2.
6. **Decidir qué APIs usar en vivo** (recomiendo DONKI y NOAA SWPC) y pasarle a Rol 3 las rutas.
7. **Qué servicio de voz usarás** para el video.
8. **Medir los tiempos** de una partida completa y del modo rápido, ahora con minijuego y las 8 emergencias.
9. **Música:** reemplazada el 14 nov por temas originales generados con código (los de Suno, plan gratuito, no se usan por ser solo no comerciales). Falta: declarar el uso de IA en créditos y confirmar con el líder local de Space Apps que CC0 sirve.
10. **Video:** narración final, subtítulos y créditos (siguiente tarea de Rol 5).

---

## 12. Qué se tomó del guion de la compañera y qué se corrigió

**Se tomó (con crédito en el equipo):** la estructura de 4 fases por sol; el saludo de la IA por rol; los consejos por rol en cada minijuego; las historias reales que enmarcan cada minijuego y tres emergencias nuevas (Skylab 1973, fuga de la EEI 2013, choque de Mir 1997) más la tormenta solar de 1972; las cartas de Margaret Hamilton, jardín y entrenamiento de astronauta; el cierre del éxito ("No fue solo suerte… lo intentaron, lo lograron", que además hace eco del prólogo del arte) y los aprendizajes de los finales de fracaso.

**Se corrigió o se cambió:**

| En el guion | Qué hice | Por qué |
|---|---|---|
| "Científica Margaret" | Quedó Judith | Nombres ya definidos; Margaret Hamilton pasa a ser una carta |
| "Escudo magnético" en la tormenta solar | Se cambió por "refugio" y blindaje | Marte no tiene campo magnético global; la protección real es poner masa entre la tripulación y la radiación |
| "Choque de meteorito" (Mir 1997) | "Impacto en el casco"; el dato real dice nave de carga | Lo que chocó fue una nave Progress |
| "Astronautas" cortaron cables en Mir | "La tripulación" | Eran dos cosmonautas rusos y un astronauta de la NASA |
| Scott Kelly logró la primera flor en el espacio | "Las primeras zinnias en la Estación Espacial" | Ya habían florecido plantas en Mir |
| Moho "por demasiada agua" | "Por humedad" | La fuente de la NASA habla de humedad alta |
| Dust devils limpiaron paneles de Spirit, Opportunity e InSight | Solo Spirit y Opportunity, con "a veces" | No verifiqué InSight; la causa exacta no siempre está confirmada |
| Polvo con "electricidad estática" | Quitado | No lo verifiqué |
| Costes de −15, −20, −25, −30 | 1 nivel por opción | Esquema de 3 niveles |
| 4 emergencias históricas | Se sumaron a las 4 de Marte (7 en total) | Más variedad en 10 soles sin repetir |
| Retraso de comunicaciones (reto de Space Apps) | Nueva emergencia `emergencia_comunicacion` (8 en total) y una línea en `noche_10` | El reto lista "communication delay" entre las decisiones que debe haber; la historia no lo cubría |
| Cartas de mejora gratis | Se agregó una columna "Costo sugerido" a las 7 | El reto pide evitar opciones sin costo |
