/** eslint-disable eqeqeq — Supabase team IDs may be string or number */

import { pointsForTeam } from './statsHelpers';

export function formatRecord(wins, losses, ties = 0) {
  return ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
}

/** League standings sorted by win %, then point differential. */
export function computeLeagueStandings(teams, games, plays) {
  const leagueGameIds = new Set((games || []).map((g) => g.game_id));
  const leaguePlays = (plays || []).filter((p) => leagueGameIds.has(p.game_id));

  const rows = (teams || []).map((team) => {
    const tid = team.team_id;
    const teamGames = (games || []).filter(
      (g) => g.home_team == tid || g.away_team == tid,
    );
    const gamesPlayed = teamGames.length;

    const pointsPerGame = teamGames.map((g) => {
      const gp = leaguePlays.filter((p) => p.game_id === g.game_id);
      return pointsForTeam(gp, tid);
    });

    const pointsAgainstPerGame = teamGames.map((g) => {
      const oppId = g.home_team == tid ? g.away_team : g.home_team;
      const gp = leaguePlays.filter((p) => p.game_id === g.game_id);
      return pointsForTeam(gp, oppId);
    });

    const wins = teamGames.filter(
      (g, i) => pointsPerGame[i] > pointsAgainstPerGame[i],
    ).length;
    const losses = teamGames.filter(
      (g, i) => pointsPerGame[i] < pointsAgainstPerGame[i],
    ).length;
    const ties = teamGames.filter(
      (g, i) => pointsPerGame[i] === pointsAgainstPerGame[i],
    ).length;
    const winPct = gamesPlayed > 0 ? wins / gamesPlayed : 0;
    const pointsFor = pointsPerGame.reduce((sum, n) => sum + n, 0);
    const pointsAgainst = pointsAgainstPerGame.reduce((sum, n) => sum + n, 0);

    return {
      team_id: tid,
      name: team.name,
      wins,
      losses,
      ties,
      gamesPlayed,
      winPct,
      pointsFor,
      pointsAgainst,
      pointDiff: pointsFor - pointsAgainst,
      record: formatRecord(wins, losses, ties),
    };
  }).filter((row) => row.gamesPlayed > 0);

  rows.sort((a, b) => {
    if (b.winPct !== a.winPct) return b.winPct - a.winPct;
    if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
    return a.name.localeCompare(b.name);
  });

  return rows.map((row, i) => ({ ...row, rank: i + 1 }));
}
