# Voz de la IA: lo que no grabó el rol 5

La IA habla **siempre con la misma voz**: la del rol 5 (Chatterbox Multilingual clonando `IA.wav`, la voz suave
diseñada con Qwen3-TTS). Las 86 líneas de la IA de `historia.ink` en español ya venían grabadas en
`../<escena>/`. Aquí está todo lo demás:

- `es/`: los avisos que arma el juego en español (amanecer de cada sol y personaje, avisos de las estaciones, la
  antena, el anochecer con su gasto de energía, el resumen del sol, las pistas y el porqué de la IA guía y las
  noticias del Sol).
- `en/`: lo mismo en inglés, más las líneas de la IA de `historia.ink` en inglés (texto de `lineas_es_en.json`).
- `indice.json`: `{ es: { texto normalizado: archivo }, en: {…} }`. Lo usa `sonido.decirIA()` (`src/motor/sonido.js`):
  busca la línea entera y, si no está, frase por frase.
- `textos_es.json`, `textos_en.json`: qué dice cada archivo, para revisarlo a mano.

**Sin voz** (solo texto en pantalla, con el bip-bup del robot): lo que cambia con datos en vivo y no se puede grabar
antes, como la clase y la fecha de la llamarada más fuerte o las medidas del clima de Marte del escenario.
La IA ya no usa la voz del navegador. La narración y, en inglés, Wenceslao, Judith y Atlas sí la siguen usando.

## Regenerar

Los scripts están en `frontend/herramientas/voz_ia/` (instrucciones en su `LEEME.txt`):
`enumerar.mjs` arma la lista y `generar.py` la genera con los mismos ajustes que el rol 5
(`8_casting_voces/generar_voz.py` y `organiza.py`). Esos ajustes son:

- expresividad 0,55, semilla 7;
- variante natural en las líneas cortas y conversacional en las de 120 caracteres o más;
- −16 LUFS y MP3 de 24 kHz.

Para el español se usa el modelo latinoamericano (`t3_es_mx_latam`) y para el inglés el multilingüe v3.
Si cambia un texto en el código, hay que volver a correr los dos scripts.

```bash
cd frontend/herramientas/voz_ia
node enumerar.mjs ../..
.venv-cb/Scripts/python generar.py ../.. --idioma es
.venv-cb/Scripts/python generar.py ../.. --idioma en
```

Créditos: voces generadas con IA, en local. Usan Chatterbox Multilingual (Resemble AI, licencia MIT) y la voz de
la IA diseñada con Qwen3-TTS 1.7B VoiceDesign (Alibaba Qwen, licencia Apache 2.0), igual que las del rol 5.
