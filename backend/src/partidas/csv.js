/**
 * Una celda de CSV (RFC 4180) segura para abrir en Excel, LibreOffice o Google Sheets.
 * Los textos que empiezan con = + - @ (o tabulador / retorno) se toman como fórmulas en una hoja de cálculo: como el
 * `detalle` de las pruebas lo manda el navegador (POST sin sesión), se les antepone ' para que queden como texto.
 * Se entrecomilla lo que tiene comillas, comas o saltos de línea (\n y \r).
 */
export function celdaCsv(v) {
  if (v === null || v === undefined) return '';
  let s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}
