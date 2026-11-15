// Flecha de objetivo (dibujada con código, estilo de la guía: ámbar con tinta).
// La usan el mapa (marcador encima de la estación) y la interfaz (flecha en el borde).
// Apunta hacia la derecha: girarla con setAngle / setRotation.
export function asegurarFlecha(escena) {
  if (escena.textures.exists('flecha_objetivo')) return 'flecha_objetivo';
  const g = escena.make.graphics({}, false);
  const pts = [{ x: 4, y: 12 }, { x: 22, y: 12 }, { x: 22, y: 4 }, { x: 40, y: 20 }, { x: 22, y: 36 }, { x: 22, y: 28 }, { x: 4, y: 28 }];
  g.fillStyle(0x141026, 1).fillPoints(pts.map(p => ({ x: p.x + 2, y: p.y + 2 })), true);   // sombra de tinta
  g.fillStyle(0xffc83d, 1).fillPoints(pts, true);
  g.lineStyle(3, 0x141026, 1).strokePoints(pts, true);
  g.lineStyle(2, 0xfff0b8, 0.9).lineBetween(8, 15, 21, 15);                                  // brillo arriba
  g.generateTexture('flecha_objetivo', 46, 42);
  g.destroy();
  return 'flecha_objetivo';
}
