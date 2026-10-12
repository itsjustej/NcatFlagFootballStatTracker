import { supabase } from "../supabaseClient";

const FRESH_MS = 20000;
const PAGE_SIZE = 1000;
const ID_CHUNK = 80;
const cached = new Map();
const inflight = new Map();

export function chunkIds(ids) {
  const unique = [...new Set((ids || []).filter((id) => id != null))];
  const chunks = [];
  for (let i = 0; i < unique.length; i += ID_CHUNK) chunks.push(unique.slice(i, i + ID_CHUNK));
  return chunks;
}

/** Read every matching row. PostgREST stops at 1,000 unless the query asks for the next page. */
export async function fetchAllRows(makeQuery) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await makeQuery().range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const batch = data || [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return rows;
}

export async function fetchWhereIn(table, column, ids, columns, orderBy) {
  const rows = [];
  const orderKeys = [].concat(orderBy);
  for (const slice of chunkIds(ids)) {
    const part = await fetchAllRows(() => {
      let query = supabase.from(table).select(columns).in(column, slice);
      for (const key of orderKeys) query = query.order(key);
      return query;
    });
    rows.push(...part);
  }
  return rows;
}

async function fetchLeagueSeason(leagueId) {
  const [teams, games] = await Promise.all([
    fetchAllRows(() => supabase.from("Team").select("*").eq("league_id", leagueId).order("team_id")),
    fetchAllRows(() => supabase.from("Game").select("*").eq("league_id", leagueId).order("game_id")),
  ]);

  const teamIds = teams.map((team) => team.team_id);
  const gameIds = games.map((game) => game.game_id);

  const [players, plays] = await Promise.all([
    fetchWhereIn("Player", "team_id", teamIds, "*", "player_id"),
    fetchWhereIn("Play", "game_id", gameIds, "*", "play_id"),
  ]);

  const playIds = plays.map((play) => play.play_id);
  const playerIds = players.map((player) => player.player_id);
  const leagueGameIds = new Set(gameIds);

  const [participants, roster] = await Promise.all([
    fetchWhereIn("Participants", "play_id", playIds, "*", ["play_id", "player_id", "role"]),
    fetchWhereIn("Roster", "player_id", playerIds, "player_id, game_id, jersey", ["player_id", "game_id"]),
  ]);

  return {
    teams,
    games,
    players,
    plays,
    participants,
    roster: roster.filter((row) => leagueGameIds.has(row.game_id)),
  };
}

/** One shared load for team stats, player stats, leaders, and the standings ticker. */
export function invalidateLeagueSeason(leagueId) {
  cached.delete(leagueId);
}

export function loadLeagueSeason(leagueId) {
  const hit = cached.get(leagueId);
  if (hit && Date.now() - hit.at < FRESH_MS) return Promise.resolve(hit.data);

  const pending = inflight.get(leagueId);
  if (pending) return pending;

  const promise = fetchLeagueSeason(leagueId)
    .then((data) => {
      cached.set(leagueId, { at: Date.now(), data });
      inflight.delete(leagueId);
      return data;
    })
    .catch((err) => {
      inflight.delete(leagueId);
      throw err;
    });

  inflight.set(leagueId, promise);
  return promise;
}
