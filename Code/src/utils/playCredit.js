import { supabase } from '../supabaseClient';
import { playerFirstName } from './playerName';

export const CREDIT_ROLES = ['passer', 'rusher', 'receiver', 'defender', 'interceptor'];

export const ROLE_LABELS = {
  passer: 'Passer',
  rusher: 'Rusher',
  receiver: 'Receiver',
  defender: 'Flag pull',
  interceptor: 'Interception',
};

const OFFENSE_ROLES = new Set(['passer', 'rusher', 'receiver']);

export function isOffenseRole(role) {
  return OFFENSE_ROLES.has(role);
}

export function sortCredits(credits) {
  return [...(credits || [])].sort(
    (a, b) => CREDIT_ROLES.indexOf(a.role) - CREDIT_ROLES.indexOf(b.role),
  );
}

export function creditsFromParticipants(parts) {
  return sortCredits(
    (parts || [])
      .filter((p) => p.role && (p.player_id != null || p.playerId != null))
      .map((p) => ({
        role: p.role,
        playerId: Number(p.player_id ?? p.playerId),
        playerName: p.player_name ?? p.playerName ?? '',
      })),
  );
}

/** Credits captured on a live log entry before it is written to the database. */
export function creditsFromLogEntry(entry) {
  const credits = [];
  const push = (role, player) => {
    if (!player?.id) return;
    credits.push({
      role,
      playerId: Number(player.id),
      playerName: player.name ?? '',
    });
  };
  push('passer', entry._passer);
  push('receiver', entry._receiver);
  push('rusher', entry._rusher);
  const defRole = entry._outcome === 'interception' || entry._outcome === 'pick_6'
    ? 'interceptor'
    : 'defender';
  push(defRole, entry._defender);
  return sortCredits(credits);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Replace the credited player's first name in a play description.
 * Yardage and result wording stay as they are.
 */
export function swapCreditName(description, role, oldName, newName) {
  const oldFirst = playerFirstName(oldName);
  const newFirst = playerFirstName(newName);
  if (!description || !oldFirst || !newFirst || oldFirst === newFirst) return description;

  const name = escapeRegExp(oldFirst);
  const patterns = {
    passer: [new RegExp(`^${name}(?=\\s+(?:passes|throws)\\b)`)],
    receiver: [new RegExp(`(?<=\\bpasses to )${name}\\b`)],
    rusher: [new RegExp(`^${name}(?=\\s+rushed\\b)`)],
    defender: [
      new RegExp(`(?<=\\btackled by )${name}\\b`),
      new RegExp(`(?<=\\binterception to )${name}\\b`),
    ],
    interceptor: [
      new RegExp(`(?<=\\binterception to )${name}\\b`),
      new RegExp(`(?<=\\btackled by )${name}\\b`),
    ],
  };

  for (const pattern of patterns[role] ?? []) {
    if (pattern.test(description)) return description.replace(pattern, newFirst);
  }

  const loose = new RegExp(`\\b${name}\\b`, 'g');
  const matches = description.match(loose);
  if (matches?.length === 1) return description.replace(loose, newFirst);
  return description;
}

/** Point one existing credit at a different player. Does not change the play result. */
export async function updatePlayCredit({ playId, role, fromPlayerId, toPlayerId }) {
  const id = Number(playId);
  const nextId = Number(toPlayerId);
  const prevId = Number(fromPlayerId);
  if (!id || !role || !nextId) throw new Error('Missing credit details');
  if (prevId === nextId) return;

  const { data, error } = await supabase
    .from('Participants')
    .update({ player_id: nextId })
    .eq('play_id', id)
    .eq('role', role)
    .eq('player_id', prevId)
    .select('play_id, player_id, role');

  if (error) {
    if (error.code === '23505') {
      throw new Error('That player is already credited on this play.');
    }
    throw new Error(error.message || 'Could not update credit');
  }

  if (data?.length) return;

  const { data: existing, error: readErr } = await supabase
    .from('Participants')
    .select('player_id')
    .eq('play_id', id)
    .eq('role', role)
    .eq('player_id', nextId)
    .maybeSingle();

  if (readErr) throw new Error(readErr.message || 'Could not update credit');
  if (existing) return;
  throw new Error('Could not update that credit. Try again.');
}
