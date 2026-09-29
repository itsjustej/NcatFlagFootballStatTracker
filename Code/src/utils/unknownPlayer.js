import { supabase } from '../supabaseClient';
import { UNKNOWN_PLAYER_NAME, isUnknownPlayer } from './playerName';

/**
 * Each team has one Unknown player so a play can be saved before the
 * tracker knows who to credit. The same player can fill more than one
 * role on a play (passer and receiver, for example).
 */
export async function ensureUnknownPlayers(teamIds) {
  const ids = [...new Set(teamIds.map(Number).filter((id) => Number.isFinite(id)))];
  const byTeam = new Map();
  if (!ids.length) return byTeam;

  const { data: existing, error } = await supabase
    .from('Player')
    .select('player_id, name, team_id')
    .in('team_id', ids);
  if (error) throw error;

  for (const player of existing || []) {
    if (!isUnknownPlayer(player) || byTeam.has(player.team_id)) continue;
    byTeam.set(player.team_id, player);
  }

  const missing = ids.filter((id) => !byTeam.has(id));
  if (!missing.length) return byTeam;

  const { data: created, error: insertError } = await supabase
    .from('Player')
    .insert(missing.map((team_id) => ({ name: UNKNOWN_PLAYER_NAME, team_id })))
    .select('player_id, name, team_id');
  if (insertError) throw insertError;

  for (const player of created || []) byTeam.set(player.team_id, player);
  return byTeam;
}

/** Real players first, then one Unknown button. */
export function withUnknownLast(players) {
  const named = [];
  let unknown = null;
  for (const player of players || []) {
    if (isUnknownPlayer(player)) {
      if (!unknown) unknown = { ...player, number: null };
    } else {
      named.push(player);
    }
  }
  return unknown ? [...named, unknown] : named;
}

/** The same real player cannot take two credits. Unknown can. */
export function blocksSecondCredit(player, otherId) {
  if (otherId == null || otherId === '') return false;
  if (String(player?.id) !== String(otherId)) return false;
  return !isUnknownPlayer(player);
}
