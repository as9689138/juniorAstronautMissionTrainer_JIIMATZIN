// Lo que dice la IA guía, con variantes: la política (src/ml/politica.js) decide QUÉ tipo de ayuda dar y aquí se
// eligen las PALABRAS, llenas con los datos reales de la partida:
//   - recursos de la base (cuál está más bajo y qué tan bajo);
//   - pronóstico de llamaradas (modelo de NOAA de src/ml/pronostico.js);
//   - nombre del personaje y tema que se practica.
// Nunca inventa un dato: solo combina lo que mide el juego.
//
// Cada frase es una lista de líneas (una línea = un globo del diálogo; una pregunta va en una línea y su respuesta en
// la siguiente, para que el niño piense antes de seguir). Las líneas se cortan en frases cortas para que la voz de la
// IA se pueda grabar por piezas (herramientas/voz_ia: enumerar.mjs llama a todasLasFrases()).
// No repite la variante que usó las dos últimas veces.

// --- Palabras que cambian, en los dos idiomas ---
const R = {
  energia: { tu: ['tu energía', 'your energy'], la: ['la energía', 'energy'], f: true,
    sis: ['los Colectores Solares', 'the Solar Collectors'], a: ['a los Colectores Solares', 'to the Solar Collectors'] },
  oxigeno: { tu: ['tu oxígeno', 'your oxygen'], la: ['el oxígeno', 'oxygen'], f: false,
    sis: ['el Soporte Vital', 'Life Support'], a: ['al Soporte Vital', 'to Life Support'] },
  blindaje: { tu: ['tu blindaje', 'your shielding'], la: ['el blindaje', 'shielding'], f: false,
    sis: ['los Escudos del Casco', 'the Hull Shields'], a: ['a los Escudos del Casco', 'to the Hull Shields'] },
};
const NIVEL = {      // qué tan bajo está el recurso más bajo (con género en español)
  muy: { m: 'muy bajo', f: 'muy baja', en: 'very low' },
  bajo: { m: 'bajo', f: 'baja', en: 'low' },
  menos: { m: 'más bajo que lo demás', f: 'más baja que lo demás', en: 'lower than the rest' },
};
const TEMA = {
  energia: ['la energía', 'energy'], aire: ['el aire', 'air'], escudo: ['el escudo contra la radiación', 'the radiation shield'],
  decidir: ['decidir con datos', 'deciding with data'],
};
const NUM = [['cero', 'zero'], ['uno', 'one'], ['dos', 'two'], ['tres', 'three'], ['cuatro', 'four'], ['cinco', 'five'],
  ['seis', 'six'], ['siete', 'seven'], ['ocho', 'eight'], ['nueve', 'nine'], ['diez', 'ten']];

// Plantillas: { es: [líneas], en: [líneas] }. {Mayúscula} = misma palabra con mayúscula inicial.
// Marcadores: {tu_bajo} {la_bajo} {a_bajo} {sis_bajo} {nivel} {tu_alto} {la_alto} {nombre} {tema} {n}
const P = (es, en) => ({ es, en });
export const FRASES = {
  // ---------- Consola de Mando: antes de repartir ----------
  consola_antes: {
    pista: [
      P(['Antes de repartir, mira las tres barras. La más baja es la que más te necesita.'],
        ['Before sharing out, look at the three bars. The lowest one needs you most.']),
      P(['Pregúntate primero: ¿qué barra está más baja hoy?'], ['Ask yourself first: which bar is lowest today?']),
      P(['Una pista: los núcleos van donde más falta.'], ['A hint: the cores go where they are needed most.']),
    ],
    concreta: [
      P(['Mira {tu_bajo}: está {nivel}. Dale más núcleos {a_bajo}.'], ['Look at {tu_bajo}: it is {nivel}. Give more cores {a_bajo}.']),
      P(['Pista: {tu_bajo} está {nivel}. Busca su sistema en la consola: {sis_bajo}.'], ['Hint: {tu_bajo} is {nivel}. Find its system on the console: {sis_bajo}.']),
      P(['Hoy lo que más falta es {la_bajo}. Ya sabes a qué sistema darle núcleos.'], ['Today what we need most is {la_bajo}. You know which system needs cores.']),
    ],
    ejemplo: [
      P(['Te enseño cómo lo pienso yo.', '{Tu_bajo} está {nivel}. {Tu_alto} está mejor.', 'Entonces le doy más núcleos {a_bajo}. ¡Ahora tú!'],
        ['Let me show you how I think about it.', '{Tu_bajo} is {nivel}. {Tu_alto} is better.', 'So I give more cores {a_bajo}. Now you try!']),
      P(['Vamos paso a paso.', 'Primero busco la barra más baja: {la_bajo}.', 'Después le doy más núcleos {a_bajo}. ¡Inténtalo!'],
        ['Let’s go step by step.', 'First I look for the lowest bar: {la_bajo}.', 'Then I give more cores {a_bajo}. Give it a try!']),
    ],
    reto: [
      P(['Hoy no te doy pista, {nombre}. ¡Confío en tu plan!'], ['No hint today, {nombre}. I trust your plan!']),
      P(['Ya sabes repartir la energía. Esta vez el plan es todo tuyo.'], ['You already know how to share out the energy. This time the plan is all yours.']),
    ],
  },
  // Con pronóstico de llamarada fuerte (tema: escudo)
  consola_antes_llamarada: {
    pista: [
      P(['Mi pronóstico dice: de diez días como hoy, en {n} hubo llamarada fuerte.', 'Piensa qué sistema nos protege.'],
        ['My forecast says: out of ten days like today, {n} had a strong flare.', 'Think about which system protects us.']),
    ],
    concreta: [
      P(['Hay riesgo de llamarada. Los Escudos del Casco van a necesitar núcleos.'], ['There’s a flare risk. The Hull Shields will need cores.']),
      P(['De diez días como hoy, en {n} hubo llamarada fuerte. Pon núcleos en los Escudos.'],
        ['Out of ten days like today, {n} had a strong flare. Put cores in the Shields.']),
    ],
    ejemplo: [
      P(['Te enseño cómo lo pienso yo.', 'Mi pronóstico avisa llamarada fuerte. La llamarada daña el blindaje.',
        'Entonces le doy dos núcleos a los Escudos del Casco. ¡Ahora tú!'],
      ['Let me show you how I think about it.', 'My forecast warns of a strong flare. Flares damage the shielding.',
        'So I give two cores to the Hull Shields. Now you try!']),
    ],
    reto: [
      P(['Hay riesgo de llamarada. Tú decides cómo protegernos.'], ['There’s a flare risk. You decide how to protect us.']),
    ],
  },
  // ---------- Consola: después de repartir ----------
  consola_bien: {
    elogio: [
      P(['¡Buena estrategia, {nombre}! Le diste más a lo que más faltaba.'], ['Great strategy, {nombre}! You gave more to what we needed most.']),
      P(['¡Así se piensa! Primero miraste las barras y luego decidiste.'], ['That’s how to think! First you checked the bars, then you decided.']),
      P(['¡Muy bien! Cuidaste {la_bajo}, que era lo más bajo.'], ['Very good! You took care of {la_bajo}, which was the lowest.']),
    ],
    autoexplicacion: [
      P(['Pregunta rápida: ¿por qué le diste más núcleos {a_bajo}?', '¡Exacto! Porque {la_bajo} era lo más bajo.'],
        ['Quick question: why did you give more cores {a_bajo}?', 'Exactly! Because {la_bajo} was the lowest.']),
      P(['Piensa un momento: ¿cómo elegiste?', 'Yo lo vi así: miraste la barra más baja y le diste más. ¡Eso es decidir con datos!'],
        ['Think for a moment: how did you choose?', 'Here’s how I saw it: you found the lowest bar and gave it more. That’s deciding with data!']),
    ],
  },
  consola_mal: {
    correccion: [
      P(['Un consejo: {tu_bajo} estaba {nivel}. Había que darle más núcleos {a_bajo}.'],
        ['A tip: {tu_bajo} was {nivel}. It needed more cores {a_bajo}.']),
      P(['Casi. Lo que más faltaba era {la_bajo}. La próxima vez, dale más núcleos {a_bajo}.'],
        ['Almost. What we needed most was {la_bajo}. Next time, give more cores {a_bajo}.']),
    ],
    ejemplo: [
      P(['Vamos a verlo juntos.', '{Tu_bajo} estaba {nivel}. {Tu_alto} estaba mejor.', 'Por eso convenía darle más núcleos {a_bajo}. ¡Mañana lo intentas!'],
        ['Let’s look at it together.', '{Tu_bajo} was {nivel}. {Tu_alto} was better.', 'That’s why it was best to give more cores {a_bajo}. Try again tomorrow!']),
    ],
  },
  consola_mal_llamarada: {
    correccion: [
      P(['Un consejo: mi pronóstico decía llamarada fuerte. Con más núcleos en los Escudos, el blindaje se cuida.'],
        ['A tip: my forecast said a strong flare. With more cores in the Shields, the shielding stays safe.']),
    ],
    ejemplo: [
      P(['Vamos a verlo juntos.', 'Mi pronóstico avisaba llamarada fuerte. La llamarada daña el blindaje.',
        'Por eso convenía poner dos núcleos en los Escudos.'],
      ['Let’s look at it together.', 'My forecast warned of a strong flare. Flares damage the shielding.',
        'That’s why it was best to put two cores in the Shields.']),
    ],
  },
  // ---------- Emergencias: antes de elegir (una línea corta: va encima de las opciones) ----------
  emergencia_antes: {
    pista: [P(['Pista: antes de elegir, mira cuál de tus recursos está más alto.'], ['Hint: before choosing, check which of your resources is highest.']),
      P(['Pista: gasta lo que te sobra y cuida lo que falta.'], ['Hint: spend what you have plenty of and protect what’s low.'])],
    concreta: [P(['Pista: ahora tienes más {la_alto}. Gasta lo que tienes de sobra.'], ['Hint: right now you have more {la_alto}. Spend what you have plenty of.'])],
    ejemplo: [P(['Pista: {tu_alto} está mejor y {tu_bajo} está {nivel}. Elige la opción que gasta {la_alto}.'],
      ['Hint: {tu_alto} is better and {tu_bajo} is {nivel}. Choose the option that spends {la_alto}.'])],
    reto: [P(['Esta vez la decisión es toda tuya.'], ['This time the decision is all yours.'])],
  },
  // ---------- Emergencias: después ----------
  emergencia_bien: {
    elogio: [
      P(['¡Bien pensado! Gastaste {la_alto}, que tenías de sobra, y cuidaste {la_bajo}, que era lo más bajo.'],
        ['Well thought out! You spent {la_alto}, which you had plenty of, and protected {la_bajo}, which was the lowest.']),
      P(['¡Decisión de astronauta, {nombre}! Cuidaste lo que más faltaba.'], ['An astronaut’s decision, {nombre}! You protected what we needed most.']),
    ],
    autoexplicacion: [
      P(['Pregunta rápida: ¿por qué no gastaste {la_bajo}?', '¡Claro! Porque era lo que menos teníamos.'],
        ['Quick question: why didn’t you spend {la_bajo}?', 'Of course! Because it was what we had least of.']),
    ],
  },
  emergencia_mal: {
    correccion: [
      P(['Ojo: {la_bajo} era lo más bajo y gastaste justo eso. La próxima vez, gasta lo que más tienes: {la_alto}.'],
        ['Careful: {la_bajo} was the lowest and you spent exactly that. Next time, spend what you have the most of: {la_alto}.']),
    ],
    ejemplo: [
      P(['Vamos paso a paso.', 'Primero miro la barra más baja: {la_bajo}. Esa la cuido.', 'Luego elijo la opción que gasta {la_alto}, que me sobra.'],
        ['Let’s go step by step.', 'First I look at the lowest bar: {la_bajo}. I protect that one.', 'Then I pick the option that spends {la_alto}, which I have plenty of.']),
    ],
  },
  emergencia_tiempo: {
    correccion: [
      P(['Se acabó el tiempo y la base eligió sola. Si miras las barras primero, decides más rápido.'],
        ['Time ran out and the base chose on its own. If you check the bars first, you decide faster.']),
    ],
  },
  // ---------- Repaso espaciado al amanecer: pregunta y, en el siguiente globo, la respuesta ----------
  repaso: {
    energia: [
      P(['Pregunta rápida: ¿de dónde sale nuestra energía de día?', '¡Del Sol! Los paneles la guardan en baterías para la noche.'],
        ['Quick question: where does our energy come from during the day?', 'From the Sun! The panels store it in batteries for the night.']),
      P(['A ver si te acuerdas: ¿qué le pasa a los paneles si se llenan de polvo?', 'Dan menos energía. Por eso los limpiamos.'],
        ['Let’s see if you remember: what happens to the panels when they get dusty?', 'They make less energy. That’s why we clean them.']),
    ],
    aire: [
      P(['Pregunta rápida: ¿qué limpia el dióxido de carbono que respiramos?', '¡El filtro! Y las plantas también ayudan: sueltan oxígeno.'],
        ['Quick question: what cleans the carbon dioxide we breathe out?', 'The filter! And the plants help too: they release oxygen.']),
      P(['A ver si te acuerdas: ¿qué sueltan las plantas del invernadero?', '¡Oxígeno! Por eso las cuidamos tanto.'],
        ['Let’s see if you remember: what do the greenhouse plants release?', 'Oxygen! That’s why we look after them so well.']),
    ],
    escudo: [
      P(['Pregunta rápida: ¿qué nos protege de la radiación al dormir?', '¡El agua de las paredes del refugio! Frena la radiación.'],
        ['Quick question: what protects us from radiation while we sleep?', 'The water in the shelter walls! It stops radiation.']),
      P(['A ver si te acuerdas: ¿de dónde vienen las llamaradas?', '¡Del Sol! Por eso miramos el pronóstico cada día.'],
        ['Let’s see if you remember: where do flares come from?', 'From the Sun! That’s why we check the forecast every day.']),
    ],
    decidir: [
      P(['Pregunta rápida: en una emergencia, ¿qué recurso conviene gastar?', '¡El que más tienes! Y cuidas el más bajo.'],
        ['Quick question: in an emergency, which resource is best to spend?', 'The one you have the most of! And you protect the lowest.']),
    ],
  },
  // ---------- Resumen al anochecer ----------
  resumen_subio: { x: [P(['Hoy aprendiste más sobre {tema}.'], ['Today you learned more about {tema}.']),
    P(['Hoy mejoraste en {tema}. ¡Se nota!'], ['Today you got better at {tema}. It shows!'])] },
  resumen_flojo: { x: [P(['Mañana practiquemos {tema}.'], ['Tomorrow let’s practice {tema}.']),
    P(['Mañana te ayudo más con {tema}.'], ['Tomorrow I’ll help you more with {tema}.'])] },
  resumen_bien: { x: [P(['¡Vas muy bien en todo!'], ['You’re doing great at everything!']),
    P(['¡Vas muy bien en todo! Mañana te daré menos pistas.'], ['You’re doing great at everything! Tomorrow I’ll give you fewer hints.'])] },
};

// --- Llenar una plantilla ---
const mayus = s => s.charAt(0).toUpperCase() + s.slice(1);

/** Datos de la situación -> valores de los marcadores en el idioma pedido. */
function valores(d, en) {
  const i = en ? 1 : 0, v = {};
  if (d.bajo) {
    const r = R[d.bajo];
    v.tu_bajo = r.tu[i]; v.la_bajo = r.la[i]; v.a_bajo = r.a[i]; v.sis_bajo = r.sis[i];
    const n = NIVEL[d.nivel ?? 'bajo'];
    v.nivel = en ? n.en : r.f ? n.f : n.m;
  }
  if (d.alto) { v.tu_alto = R[d.alto].tu[i]; v.la_alto = R[d.alto].la[i]; }
  if (d.nombre) v.nombre = d.nombre;
  if (d.tema) v.tema = TEMA[d.tema][i];
  if (d.n != null) v.n = NUM[Math.max(0, Math.min(10, d.n))][i];
  return v;
}
function llenar(linea, v) {
  return linea.replace(/\{(\w)(\w*)\}/g, (todo, a, b) => {
    const k = (a.toLowerCase() + b);
    if (v[k] === undefined) return todo;
    return a === a.toUpperCase() ? mayus(v[k]) : v[k];
  });
}

/** Nivel del recurso más bajo según su porcentaje y la distancia al más alto. */
export function nivelDe(pctBajo) { return pctBajo < 25 ? 'muy' : pctBajo < 45 ? 'bajo' : 'menos'; }

const recientes = new Map();     // momento|movida -> índices usados hace poco

/** Arma lo que dice la IA. Devuelve una lista de líneas (en el idioma pedido) o null. */
export function frase(momento, movida, datos, en = false) {
  const lista = FRASES[momento]?.[movida];
  if (!lista?.length) return null;
  const clave = `${momento}|${movida}`;
  const usados = recientes.get(clave) ?? [];
  const libres = lista.map((_, i) => i).filter(i => !usados.includes(i));
  const i = (libres.length ? libres : lista.map((_, k) => k))[Math.floor(Math.random() * (libres.length || lista.length))];
  recientes.set(clave, [...usados, i].slice(-Math.min(2, lista.length - 1)));
  const v = valores(datos, en);
  return lista[i][en ? 'en' : 'es'].map(l => llenar(l, v));
}

/** Todas las líneas posibles (para grabar la voz por piezas). Recorre cada variante con cada valor posible. */
export function todasLasFrases(en = false) {
  const recursos = Object.keys(R), salida = new Set();
  const nombres = ['Wenceslao', 'Judith', 'Atlas'];
  for (const [momento, movidas] of Object.entries(FRASES)) {
    for (const [movida, lista] of Object.entries(movidas)) {
      for (const p of lista) {
        const texto = p[en ? 'en' : 'es'].join(' ');
        const usa = k => texto.toLowerCase().includes(`{${k}`);
        const combos = [];
        for (const bajo of usa('tu_bajo') || usa('la_bajo') || usa('a_bajo') || usa('sis_bajo') || usa('nivel') ? recursos : [null]) {
          for (const alto of usa('tu_alto') || usa('la_alto') ? recursos.filter(r => r !== bajo) : [null]) {
            for (const nivel of usa('nivel') ? Object.keys(NIVEL) : [null]) {
              for (const nombre of usa('nombre') ? nombres : [null]) {
                for (const tema of usa('tema') ? Object.keys(TEMA) : [null]) {
                  for (const n of usa('n}') ? [...Array(11).keys()] : [null]) combos.push({ bajo, alto, nivel, nombre, tema, n });
                }
              }
            }
          }
        }
        for (const d of combos) {
          const v = valores(d, en);
          for (const l of p[en ? 'en' : 'es']) salida.add(llenar(l, v));
        }
      }
    }
  }
  return [...salida];
}
