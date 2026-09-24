// Field runs left→right on screen. Direction depends on homeAttacksRight.
// With a 40: 80 yards (GL, 20, 40, 20, GL). Without: 60 yards (GL, 20, 20, GL).
// End zone labels show the team that attacks/scores in that direction.

export const FIELD_LENGTH_WITH_40 = 80;
export const FIELD_LENGTH_NO_40 = 60;

const INC_LANDMARKS_WITH_40 = [20, 40, 60, 80];
const DEC_LANDMARKS_WITH_40 = [60, 40, 20, 0];
const INC_LANDMARKS_NO_40 = [20, 40, 60];
const DEC_LANDMARKS_NO_40 = [40, 20, 0];

export function includesFortyYard(hasFortyYard = true) {
  return hasFortyYard !== false;
}

export function fieldLength(hasFortyYard = true) {
  return includesFortyYard(hasFortyYard) ? FIELD_LENGTH_WITH_40 : FIELD_LENGTH_NO_40;
}

export function fieldMidpoint(hasFortyYard = true) {
  return fieldLength(hasFortyYard) / 2;
}

/** Painted 20/40 lines (excludes goal lines). On the 60-yard field both hashes are 20s. */
export function fieldMarkerYards(hasFortyYard = true) {
  return includesFortyYard(hasFortyYard) ? [20, 40, 60] : [20, 40];
}

export function fieldMarkerLabel(yard, hasFortyYard = true) {
  if (includesFortyYard(hasFortyYard) && yard === 40) return '40';
  return '20';
}

function incLandmarks(hasFortyYard = true) {
  return includesFortyYard(hasFortyYard) ? INC_LANDMARKS_WITH_40 : INC_LANDMARKS_NO_40;
}

function decLandmarks(hasFortyYard = true) {
  return includesFortyYard(hasFortyYard) ? DEC_LANDMARKS_WITH_40 : DEC_LANDMARKS_NO_40;
}

/** Own-yard line where new drives begin (after scores, kickoffs, halftime, etc.). */
const DRIVE_START_YARD = 10;

export function attacksIncreasing(possession, homeAttacksRight = true) {
  return possession === 'home' ? homeAttacksRight : !homeAttacksRight;
}

/** Which team ('home' | 'away') attacks toward the given screen side. */
export function teamAttackingToward(side, homeAttacksRight = true) {
  if (side === 'right') return homeAttacksRight ? 'home' : 'away';
  return homeAttacksRight ? 'away' : 'home';
}

export function yardsGained(oldYard, newYard, possession, homeAttacksRight = true) {
  return attacksIncreasing(possession, homeAttacksRight)
    ? newYard - oldYard
    : oldYard - newYard;
}

function ownGoalYard(possession, homeAttacksRight, hasFortyYard = true) {
  const homeAtLeft = homeAttacksRight;
  const far = fieldLength(hasFortyYard);
  if (possession === 'home') return homeAtLeft ? 0 : far;
  return homeAtLeft ? far : 0;
}

function oppGoalYard(possession, homeAttacksRight, hasFortyYard = true) {
  const own = ownGoalYard(possession, homeAttacksRight, hasFortyYard);
  return own === 0 ? fieldLength(hasFortyYard) : 0;
}

export function yardLabel(yard, possession, homeAttacksRight = true, hasFortyYard = true) {
  const length = fieldLength(hasFortyYard);
  if (yard <= 0) {
    const team = teamAttackingToward('left', homeAttacksRight);
    return team === 'home' ? 'Home EZ' : 'Away EZ';
  }
  if (yard >= length) {
    const team = teamAttackingToward('right', homeAttacksRight);
    return team === 'home' ? 'Home EZ' : 'Away EZ';
  }

  const yOwn = Math.abs(yard - ownGoalYard(possession, homeAttacksRight, hasFortyYard));
  const yOpp = Math.abs(yard - oppGoalYard(possession, homeAttacksRight, hasFortyYard));
  return yOwn <= fieldMidpoint(hasFortyYard) ? `Own ${yOwn}` : `Opp ${yOpp}`;
}

export function secondHalfPossession(openingPossession) {
  return openingPossession === 'home' ? 'away' : 'home';
}

/** Opening game direction from DB; 2nd-half plays use flipped end zones. */
export function effectiveHomeAttacksRight(openingHomeAttacksRight = true, isFirstHalf = true) {
  const opening = openingHomeAttacksRight !== false;
  return isFirstHalf ? opening : !opening;
}

/** Yard line in front of the right end zone. Every OT drive starts here, aimed at that goal. */
export function otStartYard(hasFortyYard = true) {
  return fieldLength(hasFortyYard) - 20;
}

/** In overtime the offense always attacks toward the right side of the screen. */
export function otHomeAttacksRight(possession) {
  return possession === 'home';
}

/** 1 = first half, 2 = second half, 3 = overtime. */
export function playPeriod(play) {
  if (play?.overtime) return 3;
  if (play?.first_half === false) return 2;
  return 1;
}

export function firstDownYard(yardLine, possession, homeAttacksRight = true, hasFortyYard = true) {
  const length = fieldLength(hasFortyYard);
  if (attacksIncreasing(possession, homeAttacksRight)) {
    return incLandmarks(hasFortyYard).find((m) => m > yardLine) ?? length;
  }
  return decLandmarks(hasFortyYard).find((m) => m < yardLine) ?? 0;
}

export function distanceToFirst(yardLine, possession, homeAttacksRight = true, hasFortyYard = true) {
  const fd = firstDownYard(yardLine, possession, homeAttacksRight, hasFortyYard);
  return attacksIncreasing(possession, homeAttacksRight) ? fd - yardLine : yardLine - fd;
}

export function crossedFirstDown(oldYard, newYard, possession, homeAttacksRight = true, hasFortyYard = true) {
  const fd = firstDownYard(oldYard, possession, homeAttacksRight, hasFortyYard);
  if (attacksIncreasing(possession, homeAttacksRight)) return newYard >= fd;
  return newYard <= fd;
}

export function isTouchdown(newYard, possession, homeAttacksRight = true, hasFortyYard = true) {
  const target = oppGoalYard(possession, homeAttacksRight, hasFortyYard);
  if (attacksIncreasing(possession, homeAttacksRight)) return newYard >= target;
  return newYard <= target;
}

export function isSafety(newYard, possession, homeAttacksRight = true, hasFortyYard = true) {
  const own = ownGoalYard(possession, homeAttacksRight, hasFortyYard);
  if (attacksIncreasing(possession, homeAttacksRight)) return newYard <= own;
  return newYard >= own;
}

export function kickoffYard(possession, homeAttacksRight = true, hasFortyYard = true) {
  const homeAtLeft = homeAttacksRight;
  const fromRight = fieldLength(hasFortyYard) - DRIVE_START_YARD;
  if (possession === 'home') return homeAtLeft ? DRIVE_START_YARD : fromRight;
  return homeAtLeft ? fromRight : DRIVE_START_YARD;
}

export function scoringEndZone(possession, homeAttacksRight = true, hasFortyYard = true) {
  return attacksIncreasing(possession, homeAttacksRight) ? fieldLength(hasFortyYard) : 0;
}
