// Field runs 0–80 (left→right on screen). Direction depends on homeAttacksRight.
// End zone labels show the team that attacks/scores in that direction.

const INC_LANDMARKS = [20, 40, 60, 80];
const DEC_LANDMARKS = [60, 40, 20, 0];
/** Own-yard line where new drives begin (after scores, kickoffs, halftime, etc.). */
const DRIVE_START_YARD = 14;

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

function ownGoalYard(possession, homeAttacksRight) {
  const homeAtLeft = homeAttacksRight;
  if (possession === 'home') return homeAtLeft ? 0 : 80;
  return homeAtLeft ? 80 : 0;
}

function oppGoalYard(possession, homeAttacksRight) {
  const own = ownGoalYard(possession, homeAttacksRight);
  return own === 0 ? 80 : 0;
}

export function yardLabel(yard, possession, homeAttacksRight = true) {
  if (yard <= 0) {
    const team = teamAttackingToward('left', homeAttacksRight);
    return team === 'home' ? 'Home EZ' : 'Away EZ';
  }
  if (yard >= 80) {
    const team = teamAttackingToward('right', homeAttacksRight);
    return team === 'home' ? 'Home EZ' : 'Away EZ';
  }

  const yOwn = Math.abs(yard - ownGoalYard(possession, homeAttacksRight));
  const yOpp = Math.abs(yard - oppGoalYard(possession, homeAttacksRight));
  return yOwn <= 40 ? `Own ${yOwn}` : `Opp ${yOpp}`;
}

export function secondHalfPossession(openingPossession) {
  return openingPossession === 'home' ? 'away' : 'home';
}

/** Opening game direction from DB; 2nd-half plays use flipped end zones. */
export function effectiveHomeAttacksRight(openingHomeAttacksRight = true, isFirstHalf = true) {
  const opening = openingHomeAttacksRight !== false;
  return isFirstHalf ? opening : !opening;
}

export function firstDownYard(yardLine, possession, homeAttacksRight = true) {
  if (attacksIncreasing(possession, homeAttacksRight)) {
    return INC_LANDMARKS.find((m) => m > yardLine) ?? 80;
  }
  return DEC_LANDMARKS.find((m) => m < yardLine) ?? 0;
}

export function distanceToFirst(yardLine, possession, homeAttacksRight = true) {
  const fd = firstDownYard(yardLine, possession, homeAttacksRight);
  return attacksIncreasing(possession, homeAttacksRight) ? fd - yardLine : yardLine - fd;
}

export function crossedFirstDown(oldYard, newYard, possession, homeAttacksRight = true) {
  const fd = firstDownYard(oldYard, possession, homeAttacksRight);
  if (attacksIncreasing(possession, homeAttacksRight)) return newYard >= fd;
  return newYard <= fd;
}

export function isTouchdown(newYard, possession, homeAttacksRight = true) {
  const target = oppGoalYard(possession, homeAttacksRight);
  if (attacksIncreasing(possession, homeAttacksRight)) return newYard >= target;
  return newYard <= target;
}

export function isSafety(newYard, possession, homeAttacksRight = true) {
  const own = ownGoalYard(possession, homeAttacksRight);
  if (attacksIncreasing(possession, homeAttacksRight)) return newYard <= own;
  return newYard >= own;
}

export function kickoffYard(possession, homeAttacksRight = true) {
  const homeAtLeft = homeAttacksRight;
  const fromRight = 80 - DRIVE_START_YARD;
  if (possession === 'home') return homeAtLeft ? DRIVE_START_YARD : fromRight;
  return homeAtLeft ? fromRight : DRIVE_START_YARD;
}
