import { supabase } from '../supabaseClient';
import { isUnknownPlayer, playerFirstName } from './playerName';

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

/** An offensive score. A pick-six is an interception, not a flag pull. */
export function isOffensiveTouchdown(entry) {
  if (entry?._outcome === 'td') return true;
  const text = String(entry?.description || '');
  if (/interception/i.test(text)) return false;
  return /\btouchdown\b/i.test(text);
}

export function creditsNeedingPlayers(entry) {
  return (entry?.credits || []).filter((credit) => {
    if (!isUnknownPlayer(credit?.playerName ?? '')) return false;
    if (credit.role === 'defender' && isOffensiveTouchdown(entry)) return false;
    return true;
  });
}

export function playNeedsPlayers(entry) {
  return creditsNeedingPlayers(entry).length > 0;
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
  if (entry._outcome !== 'td') {
    const defRole = entry._outcome === 'interception' || entry._outcome === 'pick_6'
      ? 'interceptor'
      : 'defender';
    push(defRole, entry._defender);
  }
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

/** Apply name edits onto one play without touching its place in the log. */
export function applyCreditChanges(entry, changes) {
  let description = entry?.description;
  let credits = (entry?.credits || []).map((credit) => ({ ...credit }));
  for (const change of changes || []) {
    if (change.remove) {
      description = stripDefenderFromDescription(description, change.fromName);
      credits = credits.filter((credit) => credit.role !== change.role);
      continue;
    }
    description = swapCreditName(description, change.role, change.fromName, change.toPlayer?.name);
    credits = credits.map((credit) => (
      credit.role === change.role
        ? {
            ...credit,
            playerId: Number(change.toPlayerId),
            playerName: change.toPlayer?.name ?? credit.playerName,
          }
        : credit
    ));
  }
  return { description, credits };
}

function samePlay(item, entry) {
  if (item?.id != null && entry?.id != null) return item.id === entry.id;
  if (entry?.playId == null || item?.playId == null) return false;
  return Number(item.playId) === Number(entry.playId);
}

/** Patch the current copy of a play so a second name save keeps the first. */
export function patchLogEntry(log, entry, changes) {
  return (log || []).map((item) => {
    if (!samePlay(item, entry)) return item;
    return { ...item, ...applyCreditChanges(item, changes) };
  });
}

/** Drop "(tackled by Name)" when a flag pull is cleared. */
export function stripDefenderFromDescription(description, name) {
  const first = playerFirstName(name);
  if (!description || !first) return description;
  const tackled = new RegExp(`\\s*\\(tackled by ${escapeRegExp(first)}\\)`, 'i');
  return description.replace(tackled, '').replace(/\s{2,}/g, ' ').trim();
}

/** Remove one credit, such as a flag pull on a play that ran out of bounds. */
export async function removePlayCredit({ playId, role, playerId }) {
  const id = Number(playId);
  const prevId = Number(playerId);
  if (!id || !role || !prevId) throw new Error('Missing credit details');

  const { error } = await supabase
    .from('Participants')
    .delete()
    .eq('play_id', id)
    .eq('role', role)
    .eq('player_id', prevId);

  if (error) throw new Error(error.message || 'Could not remove that credit');
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
