# Voces pendientes

Líneas del juego que todavía no tienen MP3 en `public/assets/audio/voces/`. Mientras tanto suenan con la voz del
navegador (Web Speech API), el último respaldo de la entrega del rol 5 (`entrega_rol5_LEEME.md`, punto 7). Si el rol 5
las graba con su servidor de voz (`9_servidor_voz`), basta con añadirlas a `audios.json` con su texto: el juego las
encuentra solas por el texto (sin acentos ni signos).

Las 213 líneas que ya tienen MP3 suenan todas.

**En inglés** no hay ningún MP3: todas las líneas suenan con la voz del navegador en inglés. El texto en inglés de las 213
líneas está en `lineas_es_en.json` (rol 5) y el de las demás en `src/textos/historia_en.js` y `src/textos/en.js`; con
eso se pueden generar las voces en inglés en el servidor de voz del rol 5.

## 1. Narración de `historia.ink` (sin `hab:`)

| Nudo | Texto |
| --- | --- |
| `prologo` | Humanos, seres vivos, converjan entre sí. Afuera de este planeta hay un mundo todavía más grande… infinito, inmenso, colmado de enigmas, preguntas que esperan una respuesta y tesoros que buscan ser encontrados. |
| `prologo` | Neil Armstrong, en 1969, fue el primer individuo en llegar a la Luna. |
| `prologo` | ¿Qué nos hace humanos? ¿Qué nos hace ser lo que realmente somos? No son nuestras habilidades sociales, no es nuestra anatomía y, claramente, no es nuestra inteligencia… |
| `prologo` | Entonces… ¿Qué es?... |
| `prologo` | Sí, es la necesidad de saber qué más, el saber qué hay más allá de lo que nuestra visión es capaz de alcanzar a ver. Es tener esa sed de conocimiento, tener ganas de tomar al mundo y devorarlo por completo de un solo bocado, saber qué es lo que mueve al planeta, cada dimensión, cada partícula, cada onda y cada electrón. |
| `prologo` | Todo se mueve gracias al querer saber más, hacer más, lograr más y llegar más alto… No solo mirar el cielo y tapar el sol con el dedo; es estar frente al sol y ver en el reflejo de tus ojos esas olas que danzan tan voraces al compás de las estrellas… |
| `prologo` | El tiempo pasa y, entre más pasa el tiempo, más cosas van surgiendo de entre la Tierra y el espacio. Todo esto es el legado de miles de personas, el cual ha sido transferido generación por generación y han dedicado su vida entera para encontrar respuestas. |
| `prologo` | Nada es imposible, porque cuando lo intentas… no siempre será lo que esperas, pero siempre tendrás un resultado… |
| `prologo` | Ahora a ti te toca… Tienes la antorcha de la sabiduría, del conocimiento, de la necesidad y de la perseverancia… Demuestra tus capacidades, supérate y demuestra lo capaz que eres. |
| `prologo` | Porque si lo intentas, lo logras… |
| `carta_wen` | Construye y arregla máquinas, robots y naves espaciales. |
| `carta_wen` | Entiende cómo se mueven las cosas y cómo viaja la electricidad. |
| `carta_wen` | Cuida las computadoras de la base y trabaja con disciplina bajo presión. |
| `carta_jud` | Estudia las plantas y sabe cómo cuidarlas en el invernadero. |
| `carta_jud` | Lee las rocas y el suelo para entender cómo es Marte. |
| `carta_jud` | Vigila el clima: el viento, el polvo y las tormentas. |
| `carta_atl` | Conoce el cuerpo humano y sabe cómo cuidarlo en el espacio. |
| `carta_atl` | Da primeros auxilios y mantiene al equipo sano y tranquilo. |
| `introduccion` | Año 2030… |
| `introduccion` | Todo empezó en 2023, cuando cuatro voluntarios de la NASA vivieron 378 días dentro de una base simulada de Marte, en Houston. |
| `introduccion` | Desde entonces, la humanidad se prepara para llevar personas a Marte. |
| `introduccion` | Hoy, en 2030, un equipo pequeño hace su misión de prueba en la Base Marte Uno. Es una simulación, pero se parece mucho a la realidad. |
| `fin_energia` | Las luces se apagan una por una. |

## 2. Avisos que escribe el juego (la IA)

Están en `src/mecanicas/ciclo.js`. Cambian con el sol, el personaje o los números, así que convendría grabar una
versión por caso o pasarlos a Ink.

| Cuándo | Texto (plantilla) |
| --- | --- |
| Amanecer del sol 1 | Sol 1 de 10. Son las 6 de la mañana en la Base Marte Uno. ¡Buenos días, {título} {nombre}! El sol está saliendo. |
| Amanecer de los soles 2 a 9 | Sol {n} de 10. Son las 6 de la mañana: ¡buenos días, {nombre}! El sol está saliendo. |
| Amanecer del sol 10 | Sol 10 de 10, el último. Son las 6 de la mañana. ¡Buenos días, {nombre}! El sol está saliendo. |
| Anochecer | Son las 8 de la noche. Ya es de noche y los paneles solares descansan. Los sistemas gastan {n} de energía. Vamos al Refugio a descansar con el equipo. |
| Anochecer con Wenceslao | (lo mismo) + Con tus ajustes de ingeniero, Wenceslao, son {n} menos que sin ellos. |
| Avisos de estaciones | «Primero reparte la energía en la consola de Mando.», «Ahora no hay luz solar para trabajar aquí.», «Esta tarea ya está hecha hoy. ¡Buen trabajo!», «El refugio tiene muros de agua contra la radiación. Aquí dormimos al caer la noche.», «La energía de hoy ya está repartida. La consola vuelve a abrirse mañana.» |
| Antena | Llamaradas reales de DONKI (cambian cada día) y «La antena habla con la Tierra. Cada mensaje tarda de 3 a 22 minutos en llegar, según dónde estén los dos planetas.» |

Las burbujas del robot en el mapa (pistas, pronóstico, objetivo) no llevan voz: el robot hace bip-bup.
