import { pointsForTeam } from "./statsHelpers";

/** Standard 8-team bracket. The better seed is home until a game is saved. */
export const BRACKET_SLOTS = [
  { id: "qf1", round: "Quarterfinals", seeds: [1, 8] },
  { id: "qf2", round: "Quarterfinals", seeds: [4, 5] },
  { id: "qf3", round: "Quarterfinals", seeds: [2, 7] },
  { id: "qf4", round: "Quarterfinals", seeds: [3, 6] },
  { id: "sf1", round: "Semifinals", from: ["qf1", "qf2"] },
  { id: "sf2", round: "Semifinals", from: ["qf3", "qf4"] },
  { id: "final", round: "Final", from: ["sf1", "sf2"] },
];

const SLOT_BY_ID = new Map(BRACKET_SLOTS.map((slot) => [slot.id, slot]));

export const SEED_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8];

const SEED_SLOT = {
  1: "qf1",
  8: "qf1",
  4: "qf2",
  5: "qf2",
  2: "qf3",
  7: "qf3",
  3: "qf4",
  6: "qf4",
};

export function slotById(id) {
  return SLOT_BY_ID.get(id) || null;
}

export function seedColumn(seed) {
  return `seed_${seed}`;
}

export function emptySeeds() {
  return Object.fromEntries(SEED_NUMBERS.map((seed) => [seed, ""]));
}

export function seedsFromRow(row) {
  const seeds = emptySeeds();
  if (!row) return seeds;
  for (const seed of SEED_NUMBERS) {
    const value = row[seedColumn(seed)];
    seeds[seed] = value == null ? "" : String(value);
  }
  return seeds;
}

export function slotForSeed(seed) {
  return SEED_SLOT[seed] || null;
}

/** The match that this slot feeds. A recorded result stays put until that next match is cleared. */
export const NEXT_SLOT = {
  qf1: "sf1",
  qf2: "sf1",
  qf3: "sf2",
  qf4: "sf2",
  sf1: "final",
  sf2: "final",
};

export function parseSlotResult(result) {
  if (!result || typeof result !== "object") return null;
  const homeScore = Number(result.homeScore);
  const awayScore = Number(result.awayScore);
  if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0) return null;
  if (result.home == null || result.away == null || result.home === "" || result.away === "") return null;
  return {
    home: result.home,
    away: result.away,
    homeScore,
    awayScore,
  };
}

export function resultsFromRow(row) {
  const raw = row?.results;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const results = {};
  for (const slot of BRACKET_SLOTS) {
    const parsed = parseSlotResult(raw[slot.id]);
    if (parsed) results[slot.id] = parsed;
  }
  return results;
}

/** The team that moves on. Equal scores, including 0–0, advance nobody. */
export function advancingTeamId(result) {
  const parsed = parseSlotResult(result);
  if (!parsed || parsed.homeScore === parsed.awayScore) return null;
  return parsed.homeScore > parsed.awayScore ? parsed.home : parsed.away;
}

function findTeam(teams, teamId) {
  if (teamId == null || teamId === "") return null;
  return (teams || []).find((team) => String(team.team_id) === String(teamId)) || null;
}

function seedOf(seeds, teamId) {
  for (const seed of SEED_NUMBERS) {
    if (seeds[seed] != null && seeds[seed] !== "" && String(seeds[seed]) === String(teamId)) return seed;
  }
  return null;
}

function asSide(team, seed) {
  if (!team) return null;
  return { team_id: team.team_id, name: team.name, seed };
}

export function scoreBracketGame(game, plays) {
  const gamePlays = (plays || []).filter((play) => play.game_id === game.game_id);
  return {
    home: pointsForTeam(gamePlays, game.home_team),
    away: pointsForTeam(gamePlays, game.away_team),
    played: gamePlays.length > 0,
  };
}

function winnerId(game, plays) {
  if (!game) return null;
  const score = scoreBracketGame(game, plays);
  if (!score.played || score.home === score.away) return null;
  return score.home > score.away ? game.home_team : game.away_team;
}

function orderSides(home, away) {
  if (home?.seed != null && away?.seed != null && away.seed < home.seed) {
    return { home: away, away: home };
  }
  return { home, away };
}

function sideFromId(teams, seeds, teamId) {
  const side = asSide(findTeam(teams, teamId), seedOf(seeds, teamId));
  if (side) return side;
  if (teamId == null || teamId === "") return null;
  return { team_id: teamId, name: "Unknown", seed: null };
}

function feederOutcome(match) {
  if (match?.winner) return "winner";
  if (match?.vacated) return "dead";
  if (match?.score?.played) return "dead";
  return "pending";
}

function sameMatchup(entered, home, away) {
  if (!entered || !home || !away) return false;
  const stored = [String(entered.home), String(entered.away)].sort();
  const current = [String(home.team_id), String(away.team_id)].sort();
  return stored[0] === current[0] && stored[1] === current[1];
}

function scoreForSide(entered, side) {
  if (!entered || !side) return null;
  if (String(entered.home) === String(side.team_id)) return entered.homeScore;
  if (String(entered.away) === String(side.team_id)) return entered.awayScore;
  return null;
}

/**
 * One matchup per bracket slot. An entered score keeps the teams that were scored.
 * A tracked game does the same. Later rounds fill in once an earlier match has a winner.
 * A finished match with no winner, including 0–0, is a bye for the team that would have played them.
 */
export function buildBracket({ seeds, teams, games, plays, results }) {
  const gamesBySlot = new Map();
  for (const game of games || []) {
    if (game.bracket_slot) gamesBySlot.set(game.bracket_slot, game);
  }

  const matches = {};

  function finish(slot, { home, away, score, winner, entered, game, bye = false, vacated = false }) {
    const match = {
      ...slot,
      game: game || null,
      entered: entered || null,
      home,
      away,
      score,
      winner,
      bye,
      vacated,
    };
    matches[slot.id] = match;
    return match;
  }

  function resolve(slot) {
    if (matches[slot.id]) return matches[slot.id];
    const game = gamesBySlot.get(slot.id) || null;
    const entered = parseSlotResult(results?.[slot.id]);

    if (slot.from) {
      const left = resolve(SLOT_BY_ID.get(slot.from[0]));
      const right = resolve(SLOT_BY_ID.get(slot.from[1]));
      const leftOutcome = feederOutcome(left);
      const rightOutcome = feederOutcome(right);

      if (leftOutcome === "dead" && rightOutcome === "dead") {
        return finish(slot, { home: null, away: null, score: null, winner: null, vacated: true });
      }
      if (leftOutcome === "winner" && rightOutcome === "dead") {
        return finish(slot, { home: left.winner, away: null, score: null, winner: left.winner, bye: true });
      }
      if (rightOutcome === "winner" && leftOutcome === "dead") {
        return finish(slot, { home: right.winner, away: null, score: null, winner: right.winner, bye: true });
      }

      const ordered = orderSides(left.winner, right.winner);
      const gameMatches = game && ordered.home && ordered.away
        && [String(game.home_team), String(game.away_team)].sort().join()
          === [String(ordered.home.team_id), String(ordered.away.team_id)].sort().join();
      if (sameMatchup(entered, ordered.home, ordered.away)) {
        const homeScore = scoreForSide(entered, ordered.home);
        const awayScore = scoreForSide(entered, ordered.away);
        const winner = homeScore === awayScore
          ? null
          : homeScore > awayScore ? ordered.home : ordered.away;
        return finish(slot, {
          home: ordered.home,
          away: ordered.away,
          entered,
          score: { home: homeScore, away: awayScore, played: true, entered: true },
          winner,
        });
      }
      if (gameMatches) {
        const score = scoreBracketGame(game, plays);
        const wonId = winnerId(game, plays);
        const winner = wonId == null
          ? null
          : [ordered.home, ordered.away].find((side) => side && String(side.team_id) === String(wonId)) || null;
        return finish(slot, { home: ordered.home, away: ordered.away, score, winner, game });
      }
      return finish(slot, { home: ordered.home, away: ordered.away, score: null, winner: null });
    }

    let home = null;
    let away = null;
    if (entered) {
      home = sideFromId(teams, seeds, entered.home);
      away = sideFromId(teams, seeds, entered.away);
    } else if (game) {
      home = sideFromId(teams, seeds, game.home_team);
      away = sideFromId(teams, seeds, game.away_team);
    } else if (slot.seeds) {
      home = asSide(findTeam(teams, seeds[slot.seeds[0]]), slot.seeds[0]);
      away = asSide(findTeam(teams, seeds[slot.seeds[1]]), slot.seeds[1]);
    }

    const score = entered
      ? { home: entered.homeScore, away: entered.awayScore, played: true, entered: true }
      : game
        ? scoreBracketGame(game, plays)
        : null;
    const wonId = entered ? advancingTeamId(entered) : winnerId(game, plays);
    const winner = wonId == null
      ? null
      : [home, away].find((side) => side && String(side.team_id) === String(wonId)) || null;

    return finish(slot, { home, away, score, winner, entered, game });
  }

  for (const slot of BRACKET_SLOTS) resolve(slot);
  return matches;
}
