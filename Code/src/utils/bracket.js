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

/**
 * One matchup per bracket slot. A saved game keeps the teams that started it.
 * Later rounds fill in once the earlier game has a winner.
 */
export function buildBracket({ seeds, teams, games, plays }) {
  const gamesBySlot = new Map();
  for (const game of games || []) {
    if (game.bracket_slot) gamesBySlot.set(game.bracket_slot, game);
  }

  const matches = {};

  function resolve(slot) {
    if (matches[slot.id]) return matches[slot.id];
    const game = gamesBySlot.get(slot.id) || null;
    let home = null;
    let away = null;

    if (game) {
      home = asSide(findTeam(teams, game.home_team), seedOf(seeds, game.home_team));
      away = asSide(findTeam(teams, game.away_team), seedOf(seeds, game.away_team));
      if (!home) home = { team_id: game.home_team, name: "Unknown", seed: null };
      if (!away) away = { team_id: game.away_team, name: "Unknown", seed: null };
    } else if (slot.seeds) {
      home = asSide(findTeam(teams, seeds[slot.seeds[0]]), slot.seeds[0]);
      away = asSide(findTeam(teams, seeds[slot.seeds[1]]), slot.seeds[1]);
    } else {
      const left = resolve(SLOT_BY_ID.get(slot.from[0]));
      const right = resolve(SLOT_BY_ID.get(slot.from[1]));
      const leftWinner = left.winner;
      const rightWinner = right.winner;
      const ordered = orderSides(leftWinner, rightWinner);
      home = ordered.home;
      away = ordered.away;
    }

    const score = game ? scoreBracketGame(game, plays) : null;
    const wonId = winnerId(game, plays);
    const winner = wonId == null
      ? null
      : [home, away].find((side) => side && String(side.team_id) === String(wonId)) || null;

    const match = {
      ...slot,
      game,
      home,
      away,
      score,
      winner,
    };
    matches[slot.id] = match;
    return match;
  }

  for (const slot of BRACKET_SLOTS) resolve(slot);
  return matches;
}
