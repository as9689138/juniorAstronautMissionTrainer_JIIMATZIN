// =====================================================================
// Junior Astronaut Mission Trainer - historia.ink
// Historia para niñas y niños de 7 a 12 años. Tono: aventura de película,
// humor de la tripulación, nunca muerte ni daño a los personajes.
//
// CÓMO LO USA EL JUEGO (ver README en paquete_historia.md):
//  - El juego decide CUÁNDO llamar cada nudo (ChoosePathString).
//  - El juego escribe energia / oxigeno / blindaje: 0 agotado, 1 bajo, 2 medio, 3 alto.
//  - Etiquetas (#): hab:<quién habla>  cara:<expresión del retrato>
//                   musica:<tema>  sfx:<efecto: alarma, apagon, celebracion, viento_marte,
//                                   remolino, primer_audio>  dato:<id de ficha>
//                   costo:<recurso>-<n>  (decisión de emergencia)
//                   efecto:<recurso>+<n> o -<n>  (resultado de un minijuego)
//                   instruccion  (texto que explica el minijuego)
//                   visual:linterna  (energía baja: oscurecer la cabina)
//                   fin:<id>  accion:<acción>
// =====================================================================

// ---- Nombres (cámbialos aquí y cambian en todo el texto) ----
CONST WEN = "Wenceslao"   // Ingeniero
CONST JUD = "Judith"      // Científica
CONST ATL = "Atlas"       // Médico
CONST IA  = "IA"

// ---- Variables que escribe el juego ----
VAR jugador = "Astronauta"   // lo escribe el juego: nombre del personaje elegido
VAR rol = ""                 // lo escribe el juego: "wen", "jud" o "atl"
VAR energia = 2    // 0 agotado, 1 bajo, 2 medio, 3 alto
VAR oxigeno = 2
VAR blindaje = 2
VAR sol = 1

// =====================================================================
// INICIO
// =====================================================================
// Flujo de inicio:
//   prologo -> (el juego muestra las 3 cartas carta_wen/jud/atl, el jugador elige rol;
//   el juego escribe rol y jugador) -> introduccion
=== inicio ===
-> prologo

=== prologo ===
# musica:inicio
# titulo:Viaje espacial
Humanos, seres vivos, converjan entre sí. Afuera de este planeta hay un mundo todavía más grande… infinito, inmenso, colmado de enigmas, preguntas que esperan una respuesta y tesoros que buscan ser encontrados.
Neil Armstrong, en 1969, fue el primer individuo en llegar a la Luna.
¿Qué nos hace humanos? ¿Qué nos hace ser lo que realmente somos? No son nuestras habilidades sociales, no es nuestra anatomía y, claramente, no es nuestra inteligencia…
Entonces… ¿Qué es?...
Sí, es la necesidad de saber qué más, el saber qué hay más allá de lo que nuestra visión es capaz de alcanzar a ver. Es tener esa sed de conocimiento, tener ganas de tomar al mundo y devorarlo por completo de un solo bocado, saber qué es lo que mueve al planeta, cada dimensión, cada partícula, cada onda y cada electrón.
Todo se mueve gracias al querer saber más, hacer más, lograr más y llegar más alto… No solo mirar el cielo y tapar el sol con el dedo; es estar frente al sol y ver en el reflejo de tus ojos esas olas que danzan tan voraces al compás de las estrellas…
El tiempo pasa y, entre más pasa el tiempo, más cosas van surgiendo de entre la Tierra y el espacio. Todo esto es el legado de miles de personas, el cual ha sido transferido generación por generación y han dedicado su vida entera para encontrar respuestas.
Nada es imposible, porque cuando lo intentas… no siempre será lo que esperas, pero siempre tendrás un resultado…
Ahora a ti te toca… Tienes la antorcha de la sabiduría, del conocimiento, de la necesidad y de la perseverancia… Demuestra tus capacidades, supérate y demuestra lo capaz que eres.
Porque si lo intentas, lo logras…
# accion:elegir_rol
-> END

// ---- Cartas de personaje (pantalla de selección de rol) ----
=== carta_wen ===
# carta:wen
# titulo:Ingeniero Wenceslao
# habilidades:Mecánica, Física, Electricidad, Informática, Disciplina
Construye y arregla máquinas, robots y naves espaciales.
Entiende cómo se mueven las cosas y cómo viaja la electricidad.
Cuida las computadoras de la base y trabaja con disciplina bajo presión.
-> END

=== carta_jud ===
# carta:jud
# titulo:Científica Judith
# habilidades:Botánica, Geología, Meteorología
Estudia las plantas y sabe cómo cuidarlas en el invernadero.
Lee las rocas y el suelo para entender cómo es Marte.
Vigila el clima: el viento, el polvo y las tormentas.
-> END

=== carta_atl ===
# carta:atl
# titulo:Médico Atlas
# habilidades:Anatomía, Primeros auxilios
Conoce el cuerpo humano y sabe cómo cuidarlo en el espacio.
Da primeros auxilios y mantiene al equipo sano y tranquilo.
-> END

// ---- Introducción (igual para los tres roles) ----
=== introduccion ===
# musica:inicio
Año 2030… # titulo:Año 2030
Todo empezó en 2023, cuando cuatro voluntarios de la NASA vivieron 378 días dentro de una base simulada de Marte, en Houston. # dato:chapea
Desde entonces, la humanidad se prepara para llevar personas a Marte.
Hoy, en 2030, un equipo pequeño hace su misión de prueba en la Base Marte Uno. Es una simulación, pero se parece mucho a la realidad.
{IA}: Sistemas encendidos. Te damos la bienvenida a la Base Marte Uno, {jugador}. # hab:ia # cara:feliz
{IA}: Soy la IA de la base. Cuidaré de ustedes y les explicaré lo que pase. # hab:ia # cara:neutral
-> saludo ->
{WEN}: Yo soy Wenceslao, ingeniero. Si algo se rompe, es mío. Si algo explota, también es mío. # hab:wen # cara:sonriente
{JUD}: Yo soy Judith, científica. Estudio las plantas, las rocas y el clima. Y a las plantas les hablo, por si acaso. # hab:jud # cara:curiosa
{ATL}: Yo soy Atlas, médico. Mi trabajo es que todos estemos bien. # hab:atl # cara:sereno
{IA}: Aviso importante: esto es la misión de prueba antes de ir a Marte. Nadie corre peligro. Aquí se aprende. # hab:ia # cara:neutral
{ATL}: Vamos a vivir diez soles. Un sol es un día en Marte. # hab:atl # cara:sereno
{IA}: La base usa tres recursos: energía, oxígeno y blindaje. Cada uno tiene tres niveles: bajo, medio y alto. Si uno llega a cero, la base se apaga y la misión se reinicia. # hab:ia # cara:procesando
{WEN}: Spoiler: la energía nunca alcanza para todo. # hab:wen # cara:concentrado
{ATL}: Por eso hay que decidir en equipo. Respiramos hondo y decidimos. # hab:atl # cara:sereno
{JUD}: ¿Ya dije que las plantas también cuentan? # hab:jud # cara:curiosa
{ATL}: Listo, equipo. A la consola. # hab:atl # cara:orgulloso
# dato:marte_base
-> END

// ---- Saludo de la IA según el rol elegido (túnel, se usa en la introducción) ----
=== saludo ===
{
- rol == "wen":
    {IA}: ¡Hola, Ingeniero {WEN}! Tú sabes cómo funciona cada cable y cada motor de la base. La energía nunca alcanza para prender todo a la vez, así que tú decides qué máquinas reciben poder. # hab:ia # cara:feliz
- rol == "jud":
    {IA}: ¡Lista para explorar, Científica {JUD}! Afuera hay un planeta misterioso, tormentas de polvo y rocas increíbles. Tu amor por las plantas mantendrá viva la base. # hab:ia # cara:feliz
- rol == "atl":
    {IA}: ¡Qué bueno tenerte a bordo, Médico {ATL}! En el espacio hay que cuidar muy bien la salud y el aire. Tú vigilarás que toda la tripulación esté fuerte y lista para la aventura. # hab:ia # cara:feliz
}
->->

// =====================================================================
// MAÑANAS (una línea de Atlas por sol)
// =====================================================================
=== manana ===
# musica:dia
{ sol:
- 1:
    {ATL}: Buenos días. Hoy aprendemos a repartir la energía de la base. # hab:atl # cara:sereno
    {IA}: La batería no alcanza para todo. Usa la consola de mando para elegir dónde va la energía hoy. # hab:ia # cara:neutral
- 2:
    {ATL}: Las luces de hoy dependen del sol. Revisemos los paneles. # hab:atl # cara:sereno
- 3:
    {ATL}: Hoy el viento suena fuerte afuera. Mantengamos el oído atento. # hab:atl # cara:sereno
- 4:
    {ATL}: El aire es nuestro tesoro. Cuidemos el filtro de CO₂. # hab:atl # cara:sereno
- 5:
    {ATL}: Hoy toca revisar el blindaje. Es nuestro paraguas contra la radiación. # hab:atl # cara:sereno
- 6:
    {ATL}: Hay polvo en el cielo. Que no nos pille sin energía. # hab:atl # cara:preocupado
- 7:
    {ATL}: El invernadero espera. Las plantas también son parte de la tripulación. # hab:atl # cara:sereno
- 8:
    {ATL}: Aquí pesamos menos. Nos movemos con cuidado, aunque parezca divertido. # hab:atl # cara:sereno
    {IA}: Aviso: la señal con la Tierra va lenta. Cada mensaje tarda varios minutos. # hab:ia # cara:neutral
- 9:
    {ATL}: Hay noticias del Sol. Atentos a los avisos. # hab:atl # cara:preocupado
- 10:
    {ATL}: Último sol. Hemos llegado lejos, equipo. Un esfuerzo más. # hab:atl # cara:orgulloso
}
-> END

// =====================================================================
// DÍA: hora de los minijuegos
// El juego llama dia y luego el minijuego que toque:
//   mini_paneles -> (mini_paneles_gana | mini_paneles_falla)
//   mini_filtro  -> (mini_filtro_gana  | mini_filtro_falla)
//   mini_riego   -> (mini_riego_gana   | mini_riego_falla)
// La ficha "¿Sabías que?" larga sale solo la primera vez (cuenta de visitas).
// El consejo lo da el personaje del rol elegido; si ese rol no tiene consejo, lo da otro.
// =====================================================================
=== dia ===
# musica:dia
{IA}: Hay luz solar. ¡Manos a la obra! Limpiar paneles, cambiar el filtro y regar las plantas antes de que oscurezca. # hab:ia # cara:feliz
-> END

// ---- Minijuego 1: ¡Adiós, polvo! (energía) ----
=== mini_paneles ===
# musica:dia
{ mini_paneles == 1:
    {IA}: Aviso: el polvo cubrió los paneles solares y la batería no carga. # hab:ia # cara:procesando
    {IA}: Dato curioso: a los robots Spirit y Opportunity les pasaba lo mismo en Marte. A veces el viento los limpiaba solo, pero no se puede contar con eso. # hab:ia # cara:feliz
    # dato:viento_limpia
- else:
    {IA}: Otra vez hay polvo en los paneles. Aquí no hay viento que nos ayude. # hab:ia # cara:procesando
}
-> consejo_paneles ->
Desliza el dedo sobre los paneles para quitar el polvo antes de que oscurezca. # instruccion
-> END

=== consejo_paneles ===
{ rol == "jud":
    {JUD}: Este polvo es finito y se pega. Límpialo con movimientos suaves para no rayar los paneles. # hab:jud # cara:curiosa
- else:
    {WEN}: Empieza por los paneles más tapados: ahí se pierde más luz. # hab:wen # cara:concentrado
}
->->

=== mini_paneles_gana ===
{IA}: ¡Genial! Los paneles brillan otra vez y la batería sube. Habrá buena luz toda la noche. # hab:ia # cara:feliz
# efecto:energia+1
-> END

=== mini_paneles_falla ===
{WEN}: Quedó mucho polvo. Esta noche habrá poca batería y la cabina estará oscura. # hab:wen # cara:concentrado
# efecto:energia-1
-> END

// ---- Minijuego 2: ¡Aire limpio! (oxígeno) ----
=== mini_filtro ===
# musica:dia
{ mini_filtro == 1:
    {IA}: ¡Alerta de aire! El filtro de CO₂ se tapó y el repuesto no encaja en el hueco. # hab:ia # cara:procesando
    {IA}: Dato curioso: en 1970 la nave Apolo 13 tuvo el mismo problema. Los ingenieros inventaron un adaptador con bolsas de plástico, cartón, mangueras y cinta. # hab:ia # cara:feliz
    # dato:apolo13
- else:
    {IA}: El filtro se saturó otra vez. A armar el adaptador. # hab:ia # cara:procesando
}
-> consejo_filtro ->
Arma el adaptador: junta cartón, bolsa, manguera y cinta para que el filtro cuadrado encaje en el hueco redondo antes de que se acabe el tiempo. # instruccion
-> END

=== consejo_filtro ===
{ rol == "atl":
    {ATL}: Si no limpiamos el aire rápido, nos marearemos y costará ver bien. Concéntrate, tú puedes. # hab:atl # cara:preocupado
- else:
    {WEN}: No lo metas a la fuerza. Usa el cartón como embudo y pega bien los bordes con cinta. # hab:wen # cara:concentrado
}
->->

=== mini_filtro_gana ===
{IA}: ¡Lo lograste! El filtro quedó bien sellado y ya respiramos aire fresco. Gran trabajo en equipo. # hab:ia # cara:feliz
# efecto:oxigeno+1
-> END

=== mini_filtro_falla ===
{IA}: Se escapó un poco de aire cargado. Estamos cansados y el aire bajó. # hab:ia # cara:procesando
# efecto:oxigeno-1
-> END

// ---- Minijuego 3: ¡Gotas de vida! (oxígeno) ----
=== mini_riego ===
# musica:dia
{ mini_riego == 1:
    {IA}: ¡Hora de cuidar el jardín! Estas plantas nos ayudan a tener oxígeno. En el espacio el agua flota en burbujas: dales solo las gotas que necesitan. # hab:ia # cara:feliz
    {IA}: Dato curioso: en 2016 el astronauta Scott Kelly cuidó las primeras zinnias que florecieron en la Estación Espacial. Les salió moho por la humedad, y él las salvó. # hab:ia # cara:feliz
    # dato:veggie_zinnias
- else:
    {IA}: Las plantas tienen sed, pero ojo con el exceso de agua. # hab:ia # cara:neutral
}
-> consejo_riego ->
Riega cada planta justo cuando su medidor esté en amarillo. Si ves gotitas flotando, prende el ventilador. # instruccion
-> END

=== consejo_riego ===
{ rol == "jud":
    {JUD}: Mira el medidor de cada maceta: agua solo cuando esté en amarillo, y ventilador si ves gotitas flotando. # hab:jud # cara:curiosa
- else:
    {ATL}: Si les sale moho, el aire se ensucia. Mantén las hojas limpiecitas. # hab:atl # cara:sereno
}
->->

=== mini_riego_gana ===
{JUD}: ¡Qué bonitas! Plantas sanas, felices y llenando la base de oxígeno. # hab:jud # cara:asombrada
# efecto:oxigeno+1
-> END

=== mini_riego_falla ===
{JUD}: Cayó demasiada agua y salió un poco de moho. Gastamos aire extra limpiando el jardín. # hab:jud # cara:apenada
# efecto:oxigeno-1
-> END

// =====================================================================
// COMENTARIO DE ESTADO (túnel: se usa dentro de las noches)
// "Bajo" = nivel 1 o menos (0 es agotado).
// =====================================================================
=== comentario_estado ===
{ energia <= 1:
    {WEN}: Las luces parpadean. Con tan poca energía hay que elegir qué se queda encendido. # hab:wen # cara:concentrado
    {IA}: Las luces de la cabina bajan. Enciende la linterna del casco para ver los controles. # hab:ia # cara:neutral # visual:linterna
}
{ oxigeno <= 1:
    {JUD}: El aire se siente pesado. Mis plantas piden refuerzos. # hab:jud # cara:apenada
}
{ blindaje <= 1:
    {IA}: Aviso: el blindaje está débil. Conviene reforzarlo mañana. # hab:ia # cara:procesando
}
{ energia > 1 && oxigeno > 1 && blindaje > 1:
    {ATL}: Todo en verde. Buen trabajo, equipo. # hab:atl # cara:orgulloso
}
->->

// =====================================================================
// NOCHES (una escena por sol, cada una con un dato real)
// =====================================================================
=== noche_1 ===
# musica:noche
# sfx:viento_marte
{IA}: Fin del primer sol. Afuera hace mucho frío. En Marte la noche puede bajar de los 60 grados bajo cero. # hab:ia # cara:neutral
{JUD}: ¿Le ponemos un suéter a las plantas? # hab:jud # cara:curiosa
{WEN}: Mejor un buen calentador. Y chocolate caliente para nosotros. # hab:wen # cara:sonriente
{ATL}: Un sol dura unas 24 horas y 39 minutos. Casi como un día en la Tierra, con 39 minutos extra para soñar. # hab:atl # cara:sereno
{IA}: Dato curioso: los equipos de las misiones reales han llegado a vivir con horario marciano para trabajar con sus robots. # hab:ia # cara:feliz
-> comentario_estado ->
{ATL}: A dormir, equipo. Mañana aprendemos más. # hab:atl # cara:sereno
# dato:sol_marciano
-> END

=== noche_2 ===
# musica:noche
{WEN}: Estuve mirando los paneles solares. Hoy dieron menos de lo que esperaba. # hab:wen # cara:concentrado
{IA}: Marte está más lejos del Sol que la Tierra. Aquí llega menos de la mitad de la luz. # hab:ia # cara:neutral
{JUD}: Entonces las plantas y los paneles compiten por la luz. # hab:jud # cara:asombrada
{WEN}: Y yo que pensaba que mi mayor rival era la cinta adhesiva. # hab:wen # cara:sonriente
{ATL}: Por eso planear la energía importa. No se puede encender todo a la vez. # hab:atl # cara:sereno
-> comentario_estado ->
{IA}: Buenas noches. Guardando energía en modo de ahorro. # hab:ia # cara:feliz
# dato:luz_solar_marte
-> END

=== noche_3 ===
# musica:noche
# sfx:viento_marte
{JUD}: ¿Escuchan eso? Es el viento de Marte. # hab:jud # cara:asombrada
{IA}: El robot Perseverance tiene micrófonos. Grabó el viento marciano, sus propias ruedas y hasta el helicóptero Ingenuity. # hab:ia # cara:feliz # sfx:primer_audio
{WEN}: Aquí el aire es muy delgado, por eso los sonidos suenan más suaves que en la Tierra. # hab:wen # cara:sonriente
{ATL}: Hasta un grito sonaría más suave. # hab:atl # cara:sereno
{JUD}: Yo igual susurro a mis plantas, así no les da pena. # hab:jud # cara:apenada
-> comentario_estado ->
{IA}: Los sonidos de Marte que escuchas son grabaciones reales de la NASA. Buenas noches. # hab:ia # cara:feliz
# dato:sonidos_perseverance
-> END

=== noche_4 ===
# musica:noche
{IA}: El aire de Marte es casi todo dióxido de carbono, CO₂. No se puede respirar. # hab:ia # cara:neutral
{JUD}: Menos mal que mis plantas toman CO₂ y sueltan oxígeno. # hab:jud # cara:curiosa
{WEN}: Y tenemos filtros para quitarlo del aire de la base. # hab:wen # cara:concentrado
{ATL}: ¿Sabían que un experimento llamado MOXIE sacó oxígeno del CO₂ marciano? # hab:atl # cara:sereno
{IA}: Sí. Viajó con Perseverance y demostró que se puede. En total hizo 122 gramos de oxígeno, lo que respira un perro pequeño en 10 horas. # hab:ia # cara:feliz
-> comentario_estado ->
{JUD}: Respirar con ayuda de plantas y máquinas. ¡Fascinante! # hab:jud # cara:asombrada
# dato:moxie
-> END

=== noche_5 ===
# musica:noche
{IA}: Esta noche hablemos de la radiación. # hab:ia # cara:procesando
{JUD}: Marte no tiene un campo magnético global como la Tierra. Casi no se protege. # hab:jud # cara:curiosa
{ATL}: Por eso la base necesita blindaje. Es como un escudo invisible que cuida a todo el equipo. # hab:atl # cara:sereno
{IA}: Dato curioso: un instrumento del robot Curiosity mide cuánta radiación llega al suelo marciano. # hab:ia # cara:feliz
{JUD}: ¿La radiación llega hasta mi invernadero? # hab:jud # cara:apenada
{WEN}: Si el blindaje está fuerte, no. Tranquilo. # hab:wen # cara:sonriente
-> comentario_estado ->
{ATL}: Descansa. Nuestro escudo está de guardia. # hab:atl # cara:sereno
# dato:radiacion_curiosity
-> END

=== noche_6 ===
# musica:noche
# sfx:viento_marte
{IA}: Hay una tormenta de polvo en el cielo. Algunas rodean todo el planeta. # hab:ia # cara:procesando
{JUD}: En 2018 una tormenta global tapó la luz del Sol y el robot Opportunity dejó de comunicarse. # hab:jud # cara:apenada # sfx:remolino
{JUD}: ¿Se quedó dormido? # hab:jud # cara:apenada
{ATL}: Entró en hibernación. Sus paneles solares casi no recibían luz. Por eso nosotros guardamos reservas. # hab:atl # cara:sereno
{WEN}: Y limpiamos los paneles. El polvo es el enemigo. # hab:wen # cara:concentrado
-> comentario_estado ->
{IA}: Buenas noches. Ojos abiertos. # hab:ia # cara:neutral
# dato:tormentas_polvo
-> END

=== noche_7 ===
# musica:noche
{JUD}: ¡Mis tomates crecen! Bueno, mis semillas brotan. Es casi lo mismo. # hab:jud # cara:asombrada
{IA}: El suelo de Marte tiene sales llamadas percloratos. No son buenas para plantas ni para comer sin tratar. # hab:ia # cara:procesando
{JUD}: Por eso hay que limpiar la tierra marciana antes de sembrar. Los científicos prueban usar microbios para quitarle esas sales. # hab:jud # cara:curiosa
{WEN}: Esto es agricultura espacial. Mitad ciencia, mitad paciencia. # hab:wen # cara:sonriente
{ATL}: Cuidar las plantas es cuidar el aire, el agua y la comida del equipo. # hab:atl # cara:orgulloso
-> comentario_estado ->
{JUD}: Buenas noches, plantas. Prometo no cantarles. # hab:jud # cara:apenada
# dato:percloratos_suelo
-> END

=== noche_8 ===
# musica:noche
{WEN}: Hoy volví a saltar en el pasillo. Aquí pesamos mucho menos. # hab:wen # cara:sorprendido
{IA}: La gravedad de Marte es poco más de un tercio de la terrestre. Un astronauta de 40 kilos pesaría unos 15. # hab:ia # cara:feliz
{JUD}: ¡Me sentí como una pluma! # hab:jud # cara:asombrada
{ATL}: Pero ojo: como médico les digo que el cuerpo necesita ejercicio para mantenerse fuerte. # hab:atl # cara:sereno
{WEN}: Dos horas de bicicleta mañana. Sin discusión. # hab:wen # cara:concentrado
-> comentario_estado ->
{IA}: Buenas noches. Registrando un récord de saltos. # hab:ia # cara:feliz
# dato:gravedad_marte
-> END

=== noche_9 ===
# musica:noche
{IA}: Noticias del Sol. Los científicos vigilan las tormentas solares. # hab:ia # cara:procesando
{JUD}: Una tormenta solar puede lanzar partículas al espacio. Pueden tardar de uno a tres días en llegar a la Tierra. # hab:jud # cara:curiosa
{WEN}: Y eso nos da tiempo para prepararnos. Para eso sirven los avisos. # hab:wen # cara:concentrado
{JUD}: La NASA ya logró predecir cuándo una tormenta solar llegaría a Marte, y la misión MAVEN lo comprobó. # hab:jud # cara:asombrada
{JUD}: Los satélites miran el Sol y avisan a los equipos en la Tierra. # hab:jud # cara:asombrada
{IA}: Dato curioso: servicios como DONKI, de la NASA, y NOAA registran estos eventos. # hab:ia # cara:feliz
-> comentario_estado ->
{ATL}: Saber lo que viene es la mitad de la protección. # hab:atl # cara:sereno
# dato:clima_espacial
-> END

=== noche_10 ===
# musica:noche
{IA}: Última noche. Miren hacia afuera. # hab:ia # cara:feliz
{JUD}: Esa estrella brillante... ¿no será la Tierra? # hab:jud # cara:asombrada
{IA}: Sí. En 2014 el robot Curiosity la fotografió: se veía como una estrella brillante, con la Luna al lado. # hab:ia # cara:feliz
{WEN}: Nuestro hogar, a millones de kilómetros. # hab:wen # cara:sorprendido
{JUD}: ¿Cuánto tarda un mensaje en llegar hasta allá? # hab:jud # cara:curiosa
{IA}: De 3 a 22 minutos, según dónde estén los planetas. # hab:ia # cara:neutral
{ATL}: Todo lo que hicimos aquí, lo hicimos juntos. # hab:atl # cara:orgulloso
-> comentario_estado ->
{ATL}: Mañana despertamos y cerramos la misión. # hab:atl # cara:sereno
# dato:tierra_desde_marte
-> END

// =====================================================================
// EMERGENCIAS (cuenta atrás y decisión con coste; los números son
// una propuesta, la Mecánica los ajusta)
// =====================================================================
=== emergencia_solar ===
# musica:emergencia
# sfx:alarma
{IA}: ¡Alerta! Detecto una tormenta solar. Llegará pronto. # hab:ia # cara:procesando
{ATL}: Mantengamos la calma. Tenemos pocos minutos. # hab:atl # cara:preocupado
{WEN}: Esto está cerca de ser emocionante. # hab:wen # cara:concentrado
+ [Mandar a todos al refugio (cuesta energía)]
    {ATL}: Todos al refugio. Cerramos puertas. # hab:atl # cara:sereno
    {WEN}: Las luces bajan, pero el equipo está seguro. # hab:wen # cara:sonriente
    # costo:energia-1
    -> solar_dato
+ [Seguir trabajando y confiar en el blindaje (arriesgado)]
    {ATL}: Seguimos, pero con ojos abiertos. # hab:atl # cara:preocupado
    {IA}: Aviso: el blindaje recibe más carga de lo normal. # hab:ia # cara:procesando
    # costo:blindaje-1
    -> solar_dato

=== solar_dato ===
{IA}: Dato curioso: en agosto de 1972 el Sol lanzó una tormenta enorme entre dos misiones a la Luna. Nadie estaba en el espacio, fue pura suerte. Por eso hoy se vigila el clima espacial. # hab:ia # cara:feliz
# dato:tormenta_1972
-> END

=== emergencia_polvo ===
# musica:emergencia
# sfx:alarma
{IA}: ¡Alerta! Una tormenta de polvo cubre los paneles. # hab:ia # cara:procesando # sfx:remolino
{WEN}: La luz baja. Se acabaron las siestas. # hab:wen # cara:concentrado
{ATL}: Decidamos rápido. # hab:atl # cara:sereno
+ [Salir a limpiar los paneles (cuesta oxígeno)]
    {WEN}: Voy yo. Con traje y buen humor. # hab:wen # cara:sonriente
    {ATL}: Vuelve pronto. # hab:atl # cara:preocupado
    # costo:oxigeno-1
    -> END
+ [Esperar a que pase y gastar las reservas (cuesta energía)]
    {ATL}: Esperemos. Apaguemos lo que no se necesita. # hab:atl # cara:sereno
    {IA}: Reservas bajando. Calculando cuánto durarán. # hab:ia # cara:procesando
    # costo:energia-1
    -> END

=== emergencia_co2 ===
# musica:emergencia
# sfx:alarma
{IA}: ¡Alerta! El filtro de CO₂ está saturado. El aire se carga. # hab:ia # cara:procesando
{JUD}: ¿Será por mis suspiros dramáticos? # hab:jud # cara:apenada
{WEN}: Hay que cambiar el filtro ya. # hab:wen # cara:concentrado
+ [Cambiar el filtro ahora (cuesta energía)]
    {WEN}: Filtro nuevo, aire limpio. # hab:wen # cara:sonriente
    {JUD}: ¡Respiro mejor! # hab:jud # cara:asombrada
    # costo:energia-1
    -> END
+ [Pedir ayuda al invernadero y esperar (cuesta oxígeno)]
    {JUD}: Mis plantas ayudan, pero despacio. # hab:jud # cara:curiosa
    {ATL}: Aguantamos un rato. # hab:atl # cara:preocupado
    # costo:oxigeno-1
    -> END

=== emergencia_radiacion ===
# musica:emergencia
# sfx:alarma
{IA}: ¡Alerta! La radiación en el exterior subió. # hab:ia # cara:procesando
{ATL}: Todos adentro y lejos de las ventanas. # hab:atl # cara:preocupado
{JUD}: ¡Mis plantas! # hab:jud # cara:apenada
+ [Reforzar el blindaje (cuesta energía)]
    {WEN}: Subo el escudo. Dame un momento. # hab:wen # cara:concentrado
    {IA}: Blindaje reforzado. # hab:ia # cara:feliz
    # costo:energia-1
    -> END
+ [Cerrar el invernadero y esperar (cuesta oxígeno)]
    {JUD}: Cerramos. Las plantas descansan. # hab:jud # cara:apenada
    {ATL}: Decisión difícil, pero segura. # hab:atl # cara:sereno
    # costo:oxigeno-1
    -> END

=== emergencia_calor ===
# musica:emergencia
# sfx:alarma
{IA}: ¡Peligro de calor! Se soltó una pieza del techo protector y la cabina se calienta muy rápido. # hab:ia # cara:procesando
{WEN}: Esto ya parece un horno. # hab:wen # cara:sorprendido
{ATL}: Decidamos rápido, pero con calma. # hab:atl # cara:sereno
+ [Armar una sombrilla con placas del casco (cuesta blindaje)]
    {WEN}: Sombrilla espacial en camino. # hab:wen # cara:concentrado
    {IA}: Sombra lista. La temperatura baja. # hab:ia # cara:feliz
    # costo:blindaje-1
    -> calor_dato
+ [Poner el aire acondicionado al máximo (cuesta energía)]
    {WEN}: Aire frío a todo volumen. # hab:wen # cara:sonriente
    {IA}: La temperatura baja. La energía también. # hab:ia # cara:procesando
    # costo:energia-1
    -> calor_dato

=== calor_dato ===
{IA}: Dato curioso: en 1973 la estación Skylab perdió su escudo del Sol al despegar y se calentó como un horno. Su primera tripulación instaló un parasol y la salvó. # hab:ia # cara:feliz
# dato:skylab
-> END

=== emergencia_fuga ===
# musica:emergencia
# sfx:alarma
{IA}: ¡Fuga detectada! El líquido que enfría los paneles solares se escapa al espacio. # hab:ia # cara:procesando
{WEN}: Si no lo cerramos, los paneles se recalientan. # hab:wen # cara:concentrado
{ATL}: Piensen en el equipo, no solo en la máquina. # hab:atl # cara:preocupado
+ [Cerrar ese tubo desde la computadora (cuesta energía)]
    {WEN}: Cerrando el tubo. Perdemos un poco de potencia, pero nadie sale. # hab:wen # cara:concentrado
    {IA}: Fuga aislada. # hab:ia # cara:neutral
    # costo:energia-1
    -> fuga_dato
+ [Salir con traje espacial a repararlo (cuesta oxígeno)]
    {ATL}: Salgan con cuidado y vuelvan pronto. # hab:atl # cara:preocupado
    {WEN}: Pieza cambiada. La energía sigue completa. # hab:wen # cara:sonriente
    # costo:oxigeno-1
    -> fuga_dato

=== fuga_dato ===
{IA}: Dato curioso: en mayo de 2013 la tripulación de la Estación Espacial Internacional vio copos blancos de líquido enfriador congelado. Dos astronautas salieron en caminata espacial y cambiaron la pieza que fallaba. # hab:ia # cara:feliz
# dato:iss_fuga_2013
-> END

=== emergencia_impacto ===
# musica:emergencia
# sfx:alarma
{IA}: ¡Impacto en el casco! Se escapa aire por una grieta. Hay que cerrar la compuerta ya. # hab:ia # cara:procesando
{ATL}: Calma. Una cosa a la vez. # hab:atl # cara:preocupado
{WEN}: Los cables pasan justo por la puerta. # hab:wen # cara:sorprendido
+ [Cortar los cables y cerrar la puerta ya (cuesta energía)]
    {WEN}: Cortando. Luego lo arreglo. # hab:wen # cara:concentrado
    {IA}: Compuerta sellada. El aire se salvó. # hab:ia # cara:feliz
    # costo:energia-1
    -> impacto_dato
+ [Desconectar los cables con cuidado (cuesta oxígeno)]
    {WEN}: Desconecto uno por uno. Tardo un poco más. # hab:wen # cara:concentrado
    {IA}: Compuerta sellada. Se perdió algo de aire por el camino. # hab:ia # cara:procesando
    # costo:oxigeno-1
    -> impacto_dato

=== impacto_dato ===
{IA}: Dato curioso: en 1997 una nave de carga chocó con un módulo de la estación espacial rusa Mir, con un astronauta de la NASA a bordo. La tripulación desconectó cables para sellar la puerta y la estación siguió funcionando. # hab:ia # cara:feliz
# dato:mir_1997
-> END

=== emergencia_comunicacion ===
# musica:emergencia
# sfx:alarma
{IA}: ¡Alerta! El ventilador del invernadero se detuvo y no sé qué pieza falló. # hab:ia # cara:procesando
{WEN}: Mandemos un mensaje a la Tierra. Ellos tienen los planos. # hab:wen # cara:concentrado
{IA}: Aviso: un mensaje a la Tierra tarda entre 3 y 22 minutos en llegar. La respuesta tarda otro tanto. # hab:ia # cara:neutral
{JUD}: ¿O sea que hablar con la Tierra es como mandar una carta? # hab:jud # cara:curiosa
{ATL}: Y mientras tanto el aire no espera. Hay que decidir. # hab:atl # cara:preocupado
+ [Esperar la respuesta de la Tierra (cuesta oxígeno)]
    {ATL}: Esperemos con calma. Cuidemos el aire que queda. # hab:atl # cara:sereno
    {JUD}: Las plantas no respiran sin ventilador. Hay que ahorrar. # hab:jud # cara:apenada
    {IA}: Mensaje enviado. Esperando respuesta. El oxígeno baja mientras tanto. # hab:ia # cara:procesando
    # costo:oxigeno-1
    -> comunicacion_dato
+ [Decidir solos con lo que sabemos (cuesta energía)]
    {WEN}: Lo reiniciamos entero y probamos pieza por pieza. # hab:wen # cara:sonriente
    {IA}: Reinicio en marcha. Las baterías trabajan de más. # hab:ia # cara:procesando
    # costo:energia-1
    -> comunicacion_dato

=== comunicacion_dato ===
{IA}: Dato curioso: una señal entre la Tierra y Marte tarda de 3 a 22 minutos en cada sentido, según dónde estén los planetas. Por eso una tripulación en Marte tiene que saber decidir sola. # hab:ia # cara:feliz
# dato:retraso_comunicacion
-> END

// =====================================================================
// FINALES
// El juego llama fin_exito si llega al sol 10 con los 3 recursos > 0,
// o el final del primer recurso que llegue a 0.
// =====================================================================
=== fin_exito ===
# musica:exito
# sfx:celebracion
{ATL}: Sol diez completado. Todos los sistemas siguen en marcha. # hab:atl # cara:orgulloso
{WEN}: ¡La base aguantó! Y casi no tuve que usar cinta adhesiva. # hab:wen # cara:sonriente
{JUD}: ¡Mis plantas también sobrevivieron! Les dije que podían. # hab:jud # cara:asombrada
{IA}: Han pasado diez soles enteros en este rincón del universo y seguimos aquí. # hab:ia # cara:feliz
{IA}: No fue solo suerte. Fue curiosidad, valentía y ganas de aprender. # hab:ia # cara:feliz
{IA}: Resultado: misión exitosa. Datos reales y buenas decisiones. # hab:ia # cara:feliz
{IA}: {jugador}, ahora eres Astronauta Junior de la Base Marte Uno. # hab:ia # cara:feliz
{IA}: Aprendiste que en Marte el trabajo en equipo y la información real salvan la misión. # hab:ia # cara:feliz
{IA}: Porque lo intentaron… lo lograron. # hab:ia # cara:feliz
{ATL}: Cuando vayamos de verdad, ya sabremos cómo. # hab:atl # cara:sereno
# fin:exito
# accion:creditos
-> END

=== fin_energia ===
# musica:fracaso
# sfx:apagon
Las luces se apagan una por una. # sfx:apagon
{IA}: Energía agotada. La base se apaga y se reinicia la misión. # hab:ia # cara:procesando
{WEN}: ¡Estamos bien! Era una simulación. Sólo falta reiniciar. # hab:wen # cara:sonriente
{ATL}: Nadie está herido. Esto es lo que se practica. # hab:atl # cara:sereno
{IA}: Lo que aprendimos: en Marte llega menos de la mitad de luz solar. El polvo tapa los paneles y las tormentas lo empeoran. # hab:ia # cara:feliz
{IA}: Cuando la energía no alcanza, hay que decidir qué se queda encendido y guardar reservas antes de la noche. # hab:ia # cara:neutral
{IA}: Dato curioso: los robots Spirit y Opportunity vivieron años porque el viento a veces les limpiaba los paneles. Tú no puedes esperar al viento: limpia los paneles a tiempo. # hab:ia # cara:feliz
{ATL}: La próxima vez, repartimos mejor. # hab:atl # cara:sereno
# fin:energia
# dato:viento_limpia
# accion:reiniciar
-> END

=== fin_oxigeno ===
# musica:fracaso
# sfx:apagon
{IA}: Aire con demasiado CO₂. La base se apaga y se reinicia la misión. # hab:ia # cara:procesando
{JUD}: ¡Estamos bien! Fue un buen ensayo. # hab:jud # cara:apenada
{ATL}: Nadie corre peligro. La misión de prueba nos cuida. # hab:atl # cara:sereno
{IA}: Lo que aprendimos: en Marte el aire es casi todo CO₂. Los filtros y las plantas mantienen el aire respirable. # hab:ia # cara:feliz
{IA}: Cambiar el filtro a tiempo es tan importante como la energía. # hab:ia # cara:neutral
{IA}: Dato curioso: en el Apolo 13 el aire se llenó de CO₂ y la tripulación lo arregló con cinta, cartón y mangueras. Revisa bien los filtros y las plantas en el siguiente intento. # hab:ia # cara:feliz
{ATL}: Mañana lo hacemos mejor. # hab:atl # cara:sereno
# fin:oxigeno
# dato:apolo13
# accion:reiniciar
-> END

=== fin_blindaje ===
# musica:fracaso
# sfx:apagon
{IA}: Blindaje agotado. La base se apaga y se reinicia la misión. # hab:ia # cara:procesando
{WEN}: Todos a salvo. Esto era para ensayar. # hab:wen # cara:sonriente
{ATL}: Nadie sufrió daño. Así se aprende. # hab:atl # cara:sereno
{IA}: Lo que aprendimos: Marte casi no tiene protección natural contra la radiación. Por eso la base necesita blindaje. # hab:ia # cara:feliz
{IA}: Seguir los avisos de clima espacial nos da tiempo para prepararnos. # hab:ia # cara:neutral
{IA}: En 1972 el Sol lanzó una tormenta enorme justo entre dos misiones a la Luna. Hoy se vigila el clima espacial para estar listos. # hab:ia # cara:feliz
{ATL}: La próxima vez, escuchamos los avisos. # hab:atl # cara:sereno
# fin:blindaje
# dato:tormenta_1972
# accion:reiniciar
-> END
