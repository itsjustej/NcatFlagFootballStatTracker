/** A playoff game is stored apart from the regular season. */
export function isPlayoffGame(game) {
  return game?.playoff === true;
}

/** phase: "regular" | "playoff" | "all" */
export function gamesInPhase(games, phase = "regular") {
  if (phase === "all") return games || [];
  if (phase === "playoff") return (games || []).filter(isPlayoffGame);
  return (games || []).filter((game) => !isPlayoffGame(game));
}

/**
 * Keep games, plays, credits, and jersey rows for one phase.
 * Player and team stat totals have to use the same game list, or a playoff
 * play still lands in a regular-season average.
 */
export function scopeSeason(season, phase = "regular") {
  const games = gamesInPhase(season?.games, phase);
  const gameIds = new Set(games.map((game) => game.game_id));
  const plays = (season?.plays || []).filter((play) => gameIds.has(play.game_id));
  const playIds = new Set(plays.map((play) => play.play_id));
  return {
    ...season,
    games,
    plays,
    participants: (season?.participants || []).filter((row) => playIds.has(row.play_id)),
    roster: (season?.roster || []).filter((row) => gameIds.has(row.game_id)),
  };
}
