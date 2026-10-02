/** eslint-disable eqeqeq — Supabase team IDs may be string or number */

import { pointsForTeam } from './statsHelpers';

export function formatRecord(wins, losses, ties = 0) {
  return ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
}

/** A forfeit updates the record only. The winner is stored as the home team. */
export function isForfeitGame(game) {
  return game?.forfeit === true;
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
    const playedGames = teamGames.filter((g) => !isForfeitGame(g));
    const gamesPlayed = playedGames.length;

    const pointsPerGame = playedGames.map((g) => {
      const gp = leaguePlays.filter((p) => p.game_id === g.game_id);
      return pointsForTeam(gp, tid);
    });

    const pointsAgainstPerGame = playedGames.map((g) => {
      const oppId = g.home_team == tid ? g.away_team : g.home_team;
      const gp = leaguePlays.filter((p) => p.game_id === g.game_id);
      return pointsForTeam(gp, oppId);
    });

    let wins = 0;
    let losses = 0;
    let ties = 0;
    for (const game of teamGames) {
      if (isForfeitGame(game)) {
        if (game.home_team == tid) wins += 1;
        else losses += 1;
        continue;
      }
      const gp = leaguePlays.filter((p) => p.game_id === game.game_id);
      const pf = pointsForTeam(gp, tid);
      const oppId = game.home_team == tid ? game.away_team : game.home_team;
      const pa = pointsForTeam(gp, oppId);
      if (pf > pa) wins += 1;
      else if (pf < pa) losses += 1;
      else ties += 1;
    }
    const decisions = wins + losses + ties;
    const winPct = decisions > 0 ? wins / decisions : 0;
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
  }).filter((row) => row.wins + row.losses + row.ties > 0);

  rows.sort((a, b) => {
    if (b.winPct !== a.winPct) return b.winPct - a.winPct;
    if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
    return a.name.localeCompare(b.name);
  });

  return rows.map((row, i) => ({ ...row, rank: i + 1 }));
}

const MARGIN_CAP = 12;

function clampMargin(margin) {
  return Math.max(-MARGIN_CAP, Math.min(MARGIN_CAP, margin));
}

/**
 * Power ratings from adjusted scoring margin plus opponent strength.
 * Each game sets teamRating − opponentRating = margin, capped at ±12.
 * Ratings are centered so teams that have played average 0.
 */
export function computePowerRankings(teams, games, plays) {
  const standings = computeLeagueStandings(teams, games, plays)
    .filter((row) => row.gamesPlayed > 0);
  if (standings.length === 0) return [];

  const leagueGameIds = new Set((games || []).map((g) => g.game_id));
  const leaguePlays = (plays || []).filter((p) => leagueGameIds.has(p.game_id));
  const playedIds = new Set(standings.map((row) => String(row.team_id)));

  const matchups = [];
  for (const game of games || []) {
    if (isForfeitGame(game)) continue;
    const home = String(game.home_team);
    const away = String(game.away_team);
    if (!playedIds.has(home) || !playedIds.has(away)) continue;
    const gamePlays = leaguePlays.filter((p) => p.game_id === game.game_id);
    const homePts = pointsForTeam(gamePlays, game.home_team);
    const awayPts = pointsForTeam(gamePlays, game.away_team);
    matchups.push({ home, away, margin: clampMargin(homePts - awayPts) });
  }

  const ratings = new Map(standings.map((row) => [String(row.team_id), 0]));

  for (let iter = 0; iter < 200; iter += 1) {
    const next = new Map();
    for (const row of standings) {
      const id = String(row.team_id);
      const samples = [];
      for (const game of matchups) {
        if (game.home === id) samples.push(game.margin + (ratings.get(game.away) || 0));
        else if (game.away === id) samples.push(-game.margin + (ratings.get(game.home) || 0));
      }
      const target = samples.length
        ? samples.reduce((sum, n) => sum + n, 0) / samples.length
        : ratings.get(id) || 0;
      next.set(id, target);
    }

    const mean = [...next.values()].reduce((sum, n) => sum + n, 0) / next.size;
    let maxDelta = 0;
    for (const [id, target] of next) {
      const blended = (ratings.get(id) || 0) * 0.5 + (target - mean) * 0.5;
      maxDelta = Math.max(maxDelta, Math.abs(blended - (ratings.get(id) || 0)));
      ratings.set(id, blended);
    }
    if (maxDelta < 1e-6) break;
  }

  const rows = standings.map((row) => ({
    ...row,
    power: ratings.get(String(row.team_id)) || 0,
  }));

  rows.sort((a, b) => {
    if (b.power !== a.power) return b.power - a.power;
    if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
    return a.name.localeCompare(b.name);
  });

  return rows.map((row, i) => ({ ...row, rank: i + 1 }));
}
