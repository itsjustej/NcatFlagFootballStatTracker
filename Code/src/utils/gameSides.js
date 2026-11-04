import { supabase } from "../supabaseClient";

const OFFENSE_ROLES = new Set(["passer", "rusher", "receiver"]);

/** Team a credit belongs to in that game. Offense roles follow the offense. */
function creditedTeamId(playerId, plays, participants) {
  const playById = new Map((plays || []).map((play) => [Number(play.play_id), play]));
  const counts = new Map();
  for (const credit of participants || []) {
    if (Number(credit.player_id) !== Number(playerId)) continue;
    const play = playById.get(Number(credit.play_id));
    if (!play) continue;
    const teamId = OFFENSE_ROLES.has(credit.role) ? play.offense_team : play.defense_team;
    if (teamId == null) continue;
    const key = Number(teamId);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  let best = null;
  let bestCount = 0;
  for (const [teamId, count] of counts) {
    if (count > bestCount) {
      best = teamId;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Sideline for this game. Plays they were credited on win over the current
 * roster, so a player who later changed teams still shows with the team they
 * played for. Everyone else stays on their current team when that team is
 * in the game.
 */
export function gameSide(player, homeTeamId, awayTeamId, plays, participants) {
  const home = Number(homeTeamId);
  const away = Number(awayTeamId);
  const credited = creditedTeamId(player?.player_id, plays, participants);
  if (credited === home || credited === away) return credited;
  const current = Number(player?.team_id);
  if (current === home || current === away) return current;
  return null;
}

/** Players who recorded this game, including anyone who has since changed teams. */
export async function withPlayersFromGame(players, rosterRows, participants) {
  const known = new Set((players || []).map((player) => Number(player.player_id)));
  const missing = new Set();
  for (const row of rosterRows || []) {
    const id = Number(row.player_id);
    if (id && !known.has(id)) missing.add(id);
  }
  for (const credit of participants || []) {
    const id = Number(credit.player_id);
    if (id && !known.has(id)) missing.add(id);
  }
  if (missing.size === 0) return players || [];

  const { data, error } = await supabase
    .from("Player")
    .select("player_id, name, team_id")
    .in("player_id", [...missing]);
  if (error) throw error;
  return [...(players || []), ...(data || [])];
}
