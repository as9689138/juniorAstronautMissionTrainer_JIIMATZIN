# Accesibilidad y lineamientos

Para que **cualquier niña o niño de 7 a 12 años** pueda jugar: quien lee despacio, tiene dislexia, no distingue rojo y verde, ve poco, no oye, usa una sola mano o se pone nervioso con el tiempo. Revisado el 14 de noviembre de 2026.

Nos basamos en cuatro referencias:
- **[Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/?p=21)**: niveles básico, intermedio y avanzado.
- **[Xbox Accessibility Guidelines](https://learn.microsoft.com/en-us/gaming/accessibility/guidelines)** (XAG 3.2).
- **[WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)**, el estándar web.
- **Lectura Fácil (UNE 153101)** para el texto en español.

## Reglas para todo el equipo

### Texto y lectura
- **Tamaño mínimo en pantalla: 16 px** para el texto que se lee y **14 px** para las etiquetas cortas. Los subtítulos, más grandes, porque duran poco en pantalla (XAG 101 y 104).
- **Contraste mínimo de 4,5 : 1** para el texto normal y 3 : 1 para el texto grande (WCAG 1.4.3). Comprobarlo con el [verificador de WebAIM](https://webaim.org/articles/contrast/).
- **Lectura Fácil**: frases cortas, una idea por frase, palabras de uso diario y nada de jerga sin explicar ([pautas UNE 153101](https://www.clariane.es/sites/default/files/pdfs/CREA_Lectura_facil.pdf)).
- **Pensando en la dislexia**: letra sin remates, sin cursivas, sin bloques de MAYÚSCULAS largos, con un poco más de espacio entre letras y fondo claro no blanco puro, como el papel crema de la guía de estilo ([BDA](https://www.bdadyslexia.org.uk/advice/educators/teaching-for-neurodiversity/creating-dyslexia-friendly-resources)).
- **El texto aparece letra por letra, pero un toque lo muestra completo**, y no se va solo hasta que dé tiempo a leerlo.

### Color y visión
- **El color nunca va solo.** Entre el 4 y el 8 % de los niños tiene alguna dificultad para distinguir colores, sobre todo rojo y verde ([MDPI 2025](https://www.mdpi.com/2227-9032/13/16/2031)). Cada sistema lleva **color + ícono + nombre** (las barras ya lo hacen) y cada estado, **forma + color**: la cara del robot cambia de forma, no solo de luz.
- **Nada parpadea más de 3 veces por segundo** (WCAG 2.3.1, por riesgo de epilepsia). Comprobado: la alarma roja late a 0,6 veces por segundo y la luz del robot a 1,8.
- **La oscuridad de la noche tiene que tener una opción de "más luz"**, para quien ve poco.

### Sonido
- **Subtítulos en todo lo que se dice**, con el nombre de quien habla (XAG 104). La voz en off nunca va sin texto.
- **Los sonidos importantes también se ven**: la alarma suena, pero además la pantalla se pone roja y el robot dice "¡BIP-BIP!" por escrito (XAG 103).
- **Volúmenes separados** de música, efectos y voz.

### Control y tiempo
- **Se puede jugar con una sola mano**: con las flechas o WASD y E, o solo tocando la pantalla.
- **Botones táctiles de 44 × 44 px o más**, por encima del mínimo de 24 px de WCAG 2.5.8, porque los dedos de los niños son menos precisos.
- **Las cuentas atrás de las emergencias se pueden alargar o quitar** (WCAG 2.2.1). La tensión es parte del juego, pero no debe dejar fuera a quien lee o reacciona despacio.
- **Pausa en cualquier momento** y guardar para seguir después.
- **Movimiento reducido**: si el sistema tiene activado `prefers-reduced-motion`, quitar el temblor de pantalla y el balanceo fuerte.

### Comprensión
- **Empezar a jugar sin pasar por menús**: "Comenzar misión" y a jugar (ya es así).
- **Un objetivo visible siempre**: qué toca hacer ahora y dónde, con flecha o resaltado.
- **Repetir la última instrucción**: con la tecla Q, el robot vuelve a decirla.

## Estado actual del juego

| Punto | Estado | Qué falta | Quién |
| --- | --- | --- | --- |
| Arrancar sin menús | ✅ | — | — |
| Barras con ícono, nombre y número (no solo color) | ✅ | — | — |
| Estaciones con nombre en el aviso, no solo color | ✅ | — | — |
| Nada parpadea más de 3 veces por segundo | ✅ | Revisarlo de nuevo cuando haya temblor de pantalla o destellos | Rol 1 |
| Teclado con una mano + táctil | ✅ | Probarlo con un dedo de verdad en una tableta | Rol 1 |
| Caras del robot distintas en forma | ✅ | — | IA |
| Tamaño de texto | ⚠️ Las etiquetas del HUD miden 10–12 px y el texto del panel 13 px | Subir a 14 y 16 px como mínimo | Rol 1 |
| Burbuja del robot | ✅ **Corregido**: antes medía unos 10 px en el teléfono; ahora siempre mide 16 px o más en pantalla | — | IA |
| Contraste del texto de ayuda en el inicio | ⚠️ Queda justo en 4,7 : 1 | Aclararlo un poco | Rol 1 |
| Cuentas atrás de las emergencias | ❌ Sin opción para alargarlas | Opción "Más tiempo" (×2) o "Sin tiempo" | Rol 2 |
| Más luz de noche | ❌ | Opción que baje la oscuridad de `FASES_LUZ` | Rol 1 |
| Subtítulos y volúmenes separados | ❌ Aún no hay audio | Al integrar el audio | Rol 5 y rol 1 |
| Preguntarle al robot desde el teléfono o la tableta | ❌ La tecla Q no existe en la pantalla táctil (el saludo ya no la menciona allí) | Botón del robot en la interfaz que llame a `window.__robot.contarPronostico(true)` | Rol 1 |
| Pausa y guardar | ❌ | Tecla P o Esc y botón en pantalla; guardar en el navegador | Rol 1 |
| Movimiento reducido | ❌ | Leer `prefers-reduced-motion` | Rol 1 |

## Menú de opciones mínimo (propuesta)

Un solo panel, al que se llega desde la pausa, con interruptores grandes:

1. **Tamaño de letra**: normal o grande.
2. **Tiempo en emergencias**: normal, más tiempo o sin tiempo.
3. **Más luz de noche**: sí o no.
4. **Menos movimiento**: sí o no (se activa solo si el sistema lo pide).
5. **Volumen** de música, efectos y voz.
6. **Subtítulos**: siempre activados por defecto.

Ninguna opción quita puntos ni cambia el final: jugar con ayudas también es jugar bien.

## Lineamientos del concurso y de diseño para niños

- **Sin datos personales ni cuentas.** No guardamos nombres ni nada que identifique al niño; el progreso se guarda solo en su navegador.
- **Sin trucos para retener**: nada de rachas, monedas ni "vuelve mañana" (ver `docs/aprendizaje.md`).
- **El video demo no muestra a menores de 18 años**, ni en imagen ni en voz (regla del concurso). **El equipo no hace pruebas con niños**: lo revisamos con adultos (ver `docs-internos/evaluacion.md` (interno, no se versiona)).
- **Se declara el uso de IA** en `docs/uso-de-ia.md`.
- **No usar el logo de la NASA**, solo el nombre en texto, y poner el aviso de no afiliación (guía del rol 5).

## Fuentes

- [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/?p=21) · [nivel básico](https://gameaccessibilityguidelines.com/?p=3102)
- Xbox Accessibility Guidelines: [índice](https://learn.microsoft.com/en-us/gaming/accessibility/guidelines) · [XAG 102, contraste](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/102) · [XAG 101, texto](https://devdocs.xbox.com/gaming/accessibility/xbox-accessibility-guidelines/101)
- WCAG 2.2: [W3C, novedades](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/) · [WebAIM, contraste](https://webaim.org/articles/contrast/)
- Dislexia: [British Dyslexia Association](https://www.bdadyslexia.org.uk/advice/educators/teaching-for-neurodiversity/creating-dyslexia-friendly-resources) · [modo para dislexia (Smashing)](https://shop.smashingmagazine.com/2021/11/dyslexia-friendly-mode-website/)
- Lectura Fácil: [CREA](https://www.clariane.es/sites/default/files/pdfs/CREA_Lectura_facil.pdf) · [Fundación Pilares](https://fundacionpilares.org/wp-content/uploads/2023/04/2023_acc_cog_03_lectura_facil.pdf)
- Daltonismo: [MDPI 2025](https://www.mdpi.com/2227-9032/13/16/2031) · [niños en California](https://revieweducationgroup.com/article/color-blindness-most-common-in-white-boys)
- ICO, código para niños: [técnicas de empujón y bienestar](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/13-nudge-techniques/)
