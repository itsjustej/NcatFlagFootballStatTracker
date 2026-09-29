/** First name, skipping a leading tab or spaces that would otherwise render blank. */
export function playerFirstName(name, fallback = '') {
  const first = String(name ?? '').trim().split(/\s+/).find(Boolean);
  return first || fallback;
}

/** Drop leading and trailing whitespace, including tabs pasted in from a spreadsheet. */
export function cleanPlayerName(name) {
  return String(name ?? '').trim().replace(/\s+/g, ' ');
}

export const UNKNOWN_PLAYER_NAME = 'Unknown';

/** Placeholder credit used when the tracker does not know who made the play. */
export function isUnknownPlayer(player) {
  const name = typeof player === 'string' ? player : player?.name;
  return cleanPlayerName(name).toLowerCase() === UNKNOWN_PLAYER_NAME.toLowerCase();
}
