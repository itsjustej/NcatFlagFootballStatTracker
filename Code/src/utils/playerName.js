/** First name, skipping a leading tab or spaces that would otherwise render blank. */
export function playerFirstName(name, fallback = '') {
  const first = String(name ?? '').trim().split(/\s+/).find(Boolean);
  return first || fallback;
}

/** Drop leading and trailing whitespace, including tabs pasted in from a spreadsheet. */
export function cleanPlayerName(name) {
  return String(name ?? '').trim().replace(/\s+/g, ' ');
}
