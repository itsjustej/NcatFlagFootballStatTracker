import { supabase } from "../supabaseClient";

const FRESH_MS = 20000;
const cached = new Map();
const inflight = new Map();

function rowsOrEmpty(result) {
  if (result.error) throw result.error;
  return result.data || [];
}

async function fetchLeagueSeason(leagueId) {
  const [teamsResult, gamesResult] = await Promise.all([
    supabase.from("Team").select("*").eq("league_id", leagueId),
    supabase.from("Game").select("*").eq("league_id", leagueId),
  ]);
  const teams = rowsOrEmpty(teamsResult);
  const games = rowsOrEmpty(gamesResult);

  const teamIds = teams.map((team) => team.team_id);
  const gameIds = games.map((game) => game.game_id);

  const [playersResult, playsResult] = await Promise.all([
    teamIds.length
      ? supabase.from("Player").select("*").in("team_id", teamIds)
      : Promise.resolve({ data: [], error: null }),
    gameIds.length
      ? supabase.from("Play").select("*").in("game_id", gameIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const players = rowsOrEmpty(playersResult);
  const plays = rowsOrEmpty(playsResult);

  const playIds = plays.map((play) => play.play_id);
  const playerIds = players.map((player) => player.player_id);
  const leagueGameIds = new Set(gameIds);

  const [participantsResult, rosterResult] = await Promise.all([
    playIds.length
      ? supabase.from("Participants").select("*").in("play_id", playIds)
      : Promise.resolve({ data: [], error: null }),
    playerIds.length
      ? supabase.from("Roster").select("player_id, game_id, jersey").in("player_id", playerIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  return {
    teams,
    games,
    players,
    plays,
    participants: rowsOrEmpty(participantsResult),
    roster: rowsOrEmpty(rosterResult).filter((row) => leagueGameIds.has(row.game_id)),
  };
}

/** One shared load for team stats, player stats, leaders, and the standings ticker. */
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
