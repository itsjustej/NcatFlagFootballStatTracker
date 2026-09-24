// Shared stat calculation helpers used by DebugPage, TeamStats, PlayerStats, LeagueLeaders.

import { attacksIncreasing, yardsGained as calcYardsGained, effectiveHomeAttacksRight, fieldLength } from '../gameLogic';

/** eslint-disable eqeqeq — Supabase team IDs may be string or number */

export function yardsGainedForPlay(play, homeTeamId, openingHomeAttacksRight = true, hasFortyYard = true) {
  const offenseIsHome = play.offense_team == homeTeamId;
  const possession = offenseIsHome ? 'home' : 'away';
  const homeAttacksRight = play.overtime
    ? possession === 'home'
    : effectiveHomeAttacksRight(openingHomeAttacksRight, play.first_half !== false);
  const length = fieldLength(hasFortyYard);

  if (play.outcome === 'td') {
    const endZone = attacksIncreasing(possession, homeAttacksRight) ? length : 0;
    const newYard = play.new_yard_line ?? endZone;
    return calcYardsGained(play.yard_line, newYard, possession, homeAttacksRight);
  }

  if (play.new_yard_line == null) return 0;

  return calcYardsGained(play.yard_line, play.new_yard_line, possession, homeAttacksRight);
}

export function isPassCompletionOutcome(outcome) {
  return outcome === 'complete' || outcome === 'td';
}

export function isReceivingOutcome(outcome) {
  return outcome === 'complete' || outcome === 'td';
}

export function isInterceptionOutcome(outcome) {
  return outcome === 'interception' || outcome === 'pick_6';
}

/** 4th-down go-for-it attempts — excludes punts and penalty-only rows. */
export function isFourthDownAttempt(play) {
  return (
    play.down === 4 &&
    play.play_type !== 'punt' &&
    play.outcome !== 'punt' &&
    play.play_type !== 'penalty'
  );
}

export function isConverted(play, homeTeamId, homeAttacksRight = true, hasFortyYard = true) {
  if (play.outcome === 'td') return true;
  if (
    play.play_type === 'punt' ||
    play.outcome === 'punt' ||
    play.outcome === 'turnover_on_downs' ||
    isInterceptionOutcome(play.outcome) ||
    play.outcome === 'safety'
  ) {
    return false;
  }
  if (play.new_yard_line == null) return false;
  return yardsGainedForPlay(play, homeTeamId, homeAttacksRight, hasFortyYard) >= play.distance;
}

/** Conversion plays where a receiver was targeted (has receiver participant). */
export function conversionWithReceiver(play, participants) {
  if (!play.is_conversion) return false;
  return participants.some((p) => p.play_id === play.play_id && p.role === 'receiver');
}

export function countConversionMade(convPlays, participants, points) {
  return convPlays.filter(
    (p) => p.conv_points === points && p.outcome === 'complete',
  ).length;
}

export function countConversionAttempts(convPlays, participants, points) {
  return convPlays.filter((p) => p.conv_points === points).length;
}

/** Player conversion stats — successful throws/catches only. */
export function countPlayerConversionSuccess(convPlays, participants, playerId, role, points) {
  const madeIds = new Set(
    convPlays
      .filter((p) => p.conv_points === points && p.outcome === 'complete')
      .map((p) => p.play_id),
  );
  return participants.filter(
    (p) =>
      p.player_id === playerId &&
      p.role === role &&
      madeIds.has(p.play_id),
  ).length;
}

/** INTs caught — interceptor role, or defender on an INT/pick-6 play. */
export function countPlayerInterceptions(playerId, participants, plays) {
  const intPlayIds = new Set(
    plays
      .filter((p) => !p.is_conversion && isInterceptionOutcome(p.outcome))
      .map((p) => p.play_id),
  );
  return participants.filter(
    (p) =>
      p.player_id === playerId &&
      intPlayIds.has(p.play_id) &&
      (p.role === 'interceptor' || p.role === 'defender'),
  ).length;
}

export function sumPassYards(offPlays, homeTeamId, homeAttacksRight = true, hasFortyYard = true) {
  return offPlays
    .filter((p) => p.play_type === 'pass' && isPassCompletionOutcome(p.outcome))
    .reduce((s, p) => s + yardsGainedForPlay(p, homeTeamId, homeAttacksRight, hasFortyYard), 0);
}

export function sumRushYards(offPlays, homeTeamId, homeAttacksRight = true, hasFortyYard = true) {
  return offPlays
    .filter((p) => p.play_type === 'rush')
    .reduce((s, p) => s + yardsGainedForPlay(p, homeTeamId, homeAttacksRight, hasFortyYard), 0);
}

export function countPassCompletions(offPlays) {
  return offPlays.filter(
    (p) => p.play_type === 'pass' && isPassCompletionOutcome(p.outcome),
  ).length;
}

/** NFL-style play success: 40% on 1st, 60% on 2nd, 100% on 3rd/4th. */
export function isSuccessfulPlayResult(outcome, down, distance, yardsGained) {
  if (outcome === 'incomplete' || isInterceptionOutcome(outcome)) return false;
  if (outcome === 'td' || outcome === 'safety') return true;
  if (outcome === 'turnover_on_downs') return false;

  const yards = yardsGained ?? 0;
  if (down === 1) return yards >= distance * 0.4;
  if (down === 2) return yards >= distance * 0.6;
  return yards >= distance;
}

/** Plays that count toward team success rate (excludes punts, penalties, conversions). */
export function isSuccessRatePlay(play) {
  if (play.is_conversion) return false;
  if (play.play_type === 'punt' || play.play_type === 'penalty') return false;
  if (play.outcome === 'punt') return false;
  return true;
}

/** Whether the offense succeeded on this play (recalculated from stored yard lines). */
export function isOffenseSuccessful(play, homeTeamId, homeAttacksRight = true, hasFortyYard = true) {
  if (!isSuccessRatePlay(play)) return false;
  const yards = yardsGainedForPlay(play, homeTeamId, homeAttacksRight, hasFortyYard);
  return isSuccessfulPlayResult(play.outcome, play.down, play.distance, yards);
}

/** Opponent offensive plays in this team's games (plays where they were on defense). */
export function opponentOffPlaysForTeam(teamId, teamGames, plays) {
  const gameIds = new Set(teamGames.map((g) => g.game_id));
  return plays.filter((p) => {
    if (!gameIds.has(p.game_id)) return false;
    if (p.is_conversion || p.play_type === 'penalty') return false;
    // eslint-disable-next-line eqeqeq
    return p.offense_team != teamId;
  });
}

/** Offensive success rate for a set of plays (0–100). */
export function computeOffenseSuccessRate(plays, getHomeTeamId, getOpeningHar = () => true, getHasForty = () => true) {
  const eligible = plays.filter(isSuccessRatePlay);
  if (eligible.length === 0) return 0;
  const successes = eligible.filter((p) =>
    isOffenseSuccessful(p, getHomeTeamId(p), getOpeningHar(p), getHasForty(p)),
  ).length;
  return (successes / eligible.length) * 100;
}

export const EXPLOSIVE_PASS_MIN_YARDS = 20;
export const EXPLOSIVE_RUSH_MIN_YARDS = 10;
/** @deprecated use EXPLOSIVE_PASS_MIN_YARDS */
export const EXPLOSIVE_PLAY_MIN_YARDS = EXPLOSIVE_PASS_MIN_YARDS;

export function isExplosivePassYards(yards) {
  return yards >= EXPLOSIVE_PASS_MIN_YARDS;
}

export function isExplosiveRushYards(yards) {
  return yards >= EXPLOSIVE_RUSH_MIN_YARDS;
}

/** Pass/reception threshold (20); rush threshold (10) when playType is 'rush'. */
export function isExplosiveYards(yards, playType = 'pass') {
  return playType === 'rush' ? isExplosiveRushYards(yards) : isExplosivePassYards(yards);
}

/** Scrimmage pass completion (20+ yds) or rush (10+ yds). */
export function isExplosivePlay(play, homeTeamId, homeAttacksRight = true, hasFortyYard = true) {
  if (!isSuccessRatePlay(play)) return false;
  const yards = yardsGainedForPlay(play, homeTeamId, homeAttacksRight, hasFortyYard);
  if (play.play_type === 'pass') {
    return isPassCompletionOutcome(play.outcome) && isExplosivePassYards(yards);
  }
  if (play.play_type === 'rush') {
    return isExplosiveRushYards(yards);
  }
  return false;
}

export function countExplosivePlays(plays, getHomeTeamId, getHomeAttacksRight = () => true, getHasForty = () => true) {
  return plays.filter((p) =>
    isExplosivePlay(p, getHomeTeamId(p), getHomeAttacksRight(p), getHasForty(p)),
  ).length;
}

/** Distance in yards from the offense's snap to the opponent's goal line. */
export const RED_ZONE_YARDS = 20;

export function yardsToOpponentGoal(yardLine, possession, homeAttacksRight = true, hasFortyYard = true) {
  const homeAtLeft = homeAttacksRight !== false;
  const length = fieldLength(hasFortyYard);
  const own = possession === 'home' ? (homeAtLeft ? 0 : length) : (homeAtLeft ? length : 0);
  const opp = own === 0 ? length : 0;
  return Math.abs(yardLine - opp);
}

export function isRedZoneSnap(yardLine, possession, homeAttacksRight = true, hasFortyYard = true) {
  return yardsToOpponentGoal(yardLine, possession, homeAttacksRight, hasFortyYard) <= RED_ZONE_YARDS;
}

function possessionForOffenseTeam(offenseTeamId, homeTeamId) {
  return offenseTeamId == homeTeamId ? 'home' : 'away';
}

/** Assign drive IDs within a game (non-conversion plays; new drive on possession change). */
function assignDriveIdsForGame(sortedNonConvPlays) {
  let driveId = 1;
  let lastOffenseTeam = null;
  const driveIds = new Map();

  for (const play of sortedNonConvPlays) {
    if (lastOffenseTeam !== null && play.offense_team != lastOffenseTeam) {
      driveId += 1;
    }
    driveIds.set(play.play_id, driveId);
    lastOffenseTeam = play.offense_team;
  }

  return driveIds;
}

/**
 * Red zone trips: drives with at least one snap inside the opponent's 20.
 * Success: offensive touchdown on that drive.
 */
export function computeRedZoneStats(teamId, teamGames, plays, getHomeTeamId, getHar, getHasForty = () => true) {
  let redZoneAttempts = 0;
  let redZoneScores = 0;

  for (const game of teamGames) {
    const homeId = getHomeTeamId(game.game_id);
    const gamePlays = (plays || [])
      .filter((p) => p.game_id === game.game_id)
      .sort((a, b) => a.play_id - b.play_id);
    const nonConv = gamePlays.filter((p) => !p.is_conversion);
    const driveIds = assignDriveIdsForGame(nonConv);

    const drives = new Map();
    for (const play of nonConv) {
      const did = driveIds.get(play.play_id);
      const key = `${did}-${play.offense_team}`;
      if (!drives.has(key)) drives.set(key, []);
      drives.get(key).push(play);
    }

    for (const drivePlays of drives.values()) {
      // eslint-disable-next-line eqeqeq
      if (drivePlays[0].offense_team != teamId) continue;

      const har = getHar(game.game_id);
      const hasForty = getHasForty(game.game_id);
      const inRedZone = drivePlays.some((p) => {
        const possession = possessionForOffenseTeam(p.offense_team, homeId);
        return isRedZoneSnap(p.yard_line, possession, har, hasForty);
      });

      if (!inRedZone) continue;

      redZoneAttempts += 1;
      if (drivePlays.some((p) => p.outcome === 'td')) {
        redZoneScores += 1;
      }
    }
  }

  const redZonePct = redZoneAttempts > 0 ? (redZoneScores / redZoneAttempts) * 100 : 0;
  return { redZoneAttempts, redZoneScores, redZonePct };
}

/** Single-game team totals for the recap box score. */
export function computeTeamBoxStats(teamId, plays, homeTeamId, homeAttacksRight = true, hasFortyYard = true) {
  const yg = (p) => yardsGainedForPlay(p, homeTeamId, homeAttacksRight, hasFortyYard);
  const converted = (p) => isConverted(p, homeTeamId, homeAttacksRight, hasFortyYard);

  const offPlays = (plays || []).filter(
    (p) => p.offense_team == teamId && !p.is_conversion && p.play_type !== 'penalty',
  );
  const passPlays = offPlays.filter((p) => p.play_type === 'pass');
  const rushPlays = offPlays.filter((p) => p.play_type === 'rush');
  const thirdDownPlays = offPlays.filter((p) => p.down === 3);

  const passYards = passPlays
    .filter((p) => isPassCompletionOutcome(p.outcome))
    .reduce((s, p) => s + yg(p), 0);
  const rushYards = rushPlays.reduce((s, p) => s + yg(p), 0);
  const passAttempts = passPlays.length;
  const passCompletions = countPassCompletions(passPlays);

  return {
    passYards,
    rushYards,
    totalYards: passYards + rushYards,
    passAttempts,
    passCompletions,
    completionPct: passAttempts > 0 ? (passCompletions / passAttempts) * 100 : 0,
    passingTDs: passPlays.filter((p) => p.outcome === 'td').length,
    rushingTDs: rushPlays.filter((p) => p.outcome === 'td').length,
    interceptionsThrown: passPlays.filter((p) => isInterceptionOutcome(p.outcome)).length,
    thirdDownConversions: thirdDownPlays.filter(converted).length,
    thirdDownAttempts: thirdDownPlays.length,
    successRate: computeOffenseSuccessRate(offPlays, () => homeTeamId, () => homeAttacksRight, () => hasFortyYard),
    explosivePlays: countExplosivePlays(offPlays, () => homeTeamId, () => homeAttacksRight, () => hasFortyYard),
  };
}

/** Single-game player line for the recap box score. */
export function computePlayerBoxStats(player, plays, participants, homeTeamId, homeAttacksRight = true, hasFortyYard = true) {
  const pid = player.player_id;
  const byRole = (role) =>
    (participants || [])
      .filter((p) => p.player_id === pid && p.role === role)
      .map((p) => p.play_id);
  const getPlays = (ids) => (plays || []).filter((p) => ids.includes(p.play_id));
  const yg = (p) => yardsGainedForPlay(p, homeTeamId, homeAttacksRight, hasFortyYard);

  const passerIds = byRole('passer');
  const rusherIds = byRole('rusher');
  const receiverIds = byRole('receiver');
  const defenderIds = byRole('defender');

  const passerData = getPlays(passerIds).filter((p) => !p.is_conversion && p.play_type !== 'penalty');
  const rusherData = getPlays(rusherIds).filter((p) => !p.is_conversion && p.play_type !== 'penalty');
  const receiverData = getPlays(receiverIds).filter((p) => !p.is_conversion && p.play_type !== 'penalty');
  const defenderData = getPlays(defenderIds).filter((p) => !p.is_conversion && p.play_type !== 'penalty');

  const passAttempts = passerData.filter((p) => p.play_type === 'pass').length;
  const passCompletions = countPassCompletions(passerData.filter((p) => p.play_type === 'pass'));
  const passingYards = passerData
    .filter((p) => p.play_type === 'pass' && isPassCompletionOutcome(p.outcome))
    .reduce((s, p) => s + yg(p), 0);
  const passingTDs = passerData.filter((p) => p.play_type === 'pass' && p.outcome === 'td').length;
  const interceptionsThrown = passerData.filter((p) => isInterceptionOutcome(p.outcome)).length;

  const carries = rusherData.length;
  const rushingYards = rusherData.reduce((s, p) => s + yg(p), 0);
  const rushingTDs = rusherData.filter((p) => p.outcome === 'td').length;

  const receptions = receiverData.filter((p) => isReceivingOutcome(p.outcome)).length;
  const receivingYards = receiverData
    .filter((p) => isReceivingOutcome(p.outcome))
    .reduce((s, p) => s + yg(p), 0);
  const receivingTDs = receiverData.filter((p) => p.outcome === 'td').length;

  const interceptions = countPlayerInterceptions(pid, participants, plays);
  const flagPulls = defenderData.length;
  const flagPullsForLoss = defenderData.filter((p) =>
    (p.play_type === 'rush' || (p.play_type === 'pass' && p.outcome === 'complete'))
    && yg(p) < 0
  ).length;

  const hasStats =
    passAttempts + carries + receptions + interceptions + flagPulls + passingYards + rushingYards + receivingYards > 0;

  return {
    player_id: pid,
    name: String(player.name ?? '').trim(),
    team_id: player.team_id,
    passAttempts,
    passCompletions,
    passingYards,
    passingTDs,
    interceptionsThrown,
    carries,
    rushingYards,
    rushingTDs,
    receptions,
    receivingYards,
    receivingTDs,
    interceptions,
    flagPulls,
    flagPullsForLoss,
    hasStats,
  };
}
