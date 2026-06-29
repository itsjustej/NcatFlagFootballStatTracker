import { supabase } from '../supabaseClient';
import { firstDownYard, kickoffYard, yardsGained as calcYardsGained, distanceToFirst, effectiveHomeAttacksRight } from '../gameLogic';

const OUTCOME_TO_DRIVE_RESULT = {
  td:                'Touchdown',
  pick_6:            'Pick 6',
  interception:      'Interception',
  turnover_on_downs: 'Turnover on Downs',
  punt:              'Punt',
  punt_return_td:    'Punt Return TD',
  safety:            'Safety',
  end_of_half:       'End of Half',
};

const DRIVE_TERMINAL_OUTCOMES = new Set([
  'punt', 'interception', 'turnover_on_downs', 'safety', 'end_of_half',
]);

/** True when the last logged play finished the drive (next snap is a new drive). */
function isDriveComplete(lastPlay) {
  if (lastPlay.is_conversion) return true;
  if (DRIVE_TERMINAL_OUTCOMES.has(lastPlay.outcome)) return true;
  // TD / pick-6 stay on the same drive until the conversion is logged.
  return false;
}

/**
 * Fetches all plays for a game and reconstructs the GameState log + current state.
 *
 * Drive grouping rules:
 *   - A conversion play (is_conversion = true) belongs to the SAME drive as the
 *     TD that preceded it, even though possession may be listed differently.
 *   - driveResult is set on the LAST non-conversion play of each drive (the TD,
 *     interception, punt, etc.), NOT on the conversion play.
 *   - driveId only increments when a non-conversion play switches possession
 *     compared to the previous non-conversion play.
 */
export async function resumeGame(gameId, homeTeamId, awayTeamId, homeAttacksRight = true) {
  const { data: gameRow } = await supabase
    .from('Game')
    .select('opening_possession, home_attacks_right')
    .eq('game_id', gameId)
    .single();

  const openingHomeAttacksRight = gameRow?.home_attacks_right !== false;
  const openingPossession = gameRow?.opening_possession === 'away' ? 'away' : 'home';

  const { data: plays, error } = await supabase
    .from('Play')
    .select('*')
    .eq('game_id', gameId)
    .order('play_id', { ascending: true });

  if (error) throw error;
  if (!plays || plays.length === 0) return null;

  // Fetch participants with player names
  const playIds = plays.map(p => p.play_id);
  let partsByPlay = {};
  if (playIds.length > 0) {
    const { data: parts } = await supabase
      .from('Participants')
      .select('play_id, role, player:Player(player_id, name)')
      .in('play_id', playIds);

    for (const p of (parts ?? [])) {
      if (!partsByPlay[p.play_id]) partsByPlay[p.play_id] = [];
      partsByPlay[p.play_id].push({ role: p.role, player_name: p.player?.name ?? '' });
    }
  }

  // ── Pass 1: assign driveIds ────────────────────────────────────────────────
  // We track driveId per play. Conversion plays inherit the driveId of the
  // play immediately before them (the TD). A non-conversion play that switches
  // possession from the previous non-conversion play starts a new drive.

  let driveId         = 1;
  let lastNonConvPoss = null; // possession of the last non-conversion play
  const driveIds      = [];   // parallel array, one entry per play

  for (let i = 0; i < plays.length; i++) {
    const play         = plays[i];
    const offenseIsHome = play.offense_team === homeTeamId;
    const possession   = offenseIsHome ? 'home' : 'away';

    if (play.is_conversion) {
      // Conversion belongs to the current drive (same driveId as the TD before it)
      driveIds.push(driveId);
    } else {
      if (lastNonConvPoss !== null && possession !== lastNonConvPoss) {
        driveId++;
      }
      driveIds.push(driveId);
      lastNonConvPoss = possession;
    }
  }

  // ── Pass 2: find the driveResult for each drive ────────────────────────────
  // The drive result is determined by the LAST non-conversion play in each drive.
  // Map: driveId → driveResult string
  const driveResults = {};
  for (let i = 0; i < plays.length; i++) {
    const play = plays[i];
    if (play.is_conversion) continue; // conversions don't carry the drive result

    const did    = driveIds[i];
    const result = OUTCOME_TO_DRIVE_RESULT[play.outcome];
    if (result) {
      driveResults[did] = result;
    } else {
      // A non-terminal play (complete, incomplete, etc.) — mark in-progress
      // but don't overwrite a terminal result already found for this drive.
      if (!driveResults[did]) driveResults[did] = undefined;
    }
  }

  // For conversions: the drive result is already set by the TD play above.
  // If a conversion is the last play (game is in conversion phase on resume),
  // the drive result was already set by the TD.

  // ── Pass 3: build log entries ──────────────────────────────────────────────
  let homeScore = 0;
  let awayScore = 0;

  // We need to know which play is the last play of each drive so we can
  // attach driveResult only to that play's log entry.
  // "Last play of a drive" = last play with that driveId.
  const lastPlayOfDrive = {};
  for (let i = 0; i < plays.length; i++) {
    lastPlayOfDrive[driveIds[i]] = i; // keeps overwriting → ends up as last index
  }

  const log = plays.map((play, i) => {
    const offenseIsHome = play.offense_team === homeTeamId;
    const possession    = offenseIsHome ? 'home' : 'away';
    const parts         = partsByPlay[play.play_id] ?? [];
    const did           = driveIds[i];

    // ── Score accumulation ───────────────────────────────────────────────────
    if (play.outcome === 'td') {
      if (offenseIsHome) homeScore += 6; else awayScore += 6;
    } else if (play.outcome === 'pick_6') {
      // Defending team scores
      if (offenseIsHome) awayScore += 6; else homeScore += 6;
    } else if (play.outcome === 'punt_return_td') {
      if (offenseIsHome) awayScore += 6; else homeScore += 6;
    } else if (play.outcome === 'safety') {
      if (offenseIsHome) awayScore += 2; else homeScore += 2;
    } else if (play.is_conversion && play.outcome === 'complete') {
      if (offenseIsHome) homeScore += play.conv_points ?? 0;
      else               awayScore += play.conv_points ?? 0;
    }

    // ── driveResult: only on the last play of the drive ──────────────────────
    const isLastOfDrive = lastPlayOfDrive[did] === i;
    const driveResult   = isLastOfDrive ? driveResults[did] : undefined;

    // ── yardsGained ──────────────────────────────────────────────────────────
    const yardsGained = play.new_yard_line !== null
      ? calcYardsGained(
          play.yard_line,
          play.new_yard_line,
          possession,
          effectiveHomeAttacksRight(openingHomeAttacksRight, play.first_half),
        )
      : 0;

    // ── description ──────────────────────────────────────────────────────────
    const passer   = parts.find(p => p.role === 'passer');
    const receiver = parts.find(p => p.role === 'receiver');
    const rusher   = parts.find(p => p.role === 'rusher');
    const defender = parts.find(p => p.role === 'defender');

    const pName    = passer?.player_name?.split(' ')[0]   ?? 'QB';
    const recName  = receiver?.player_name?.split(' ')[0] ?? 'Receiver';
    const rushName = rusher?.player_name?.split(' ')[0]   ?? 'Runner';
    const defStr   = defender?.player_name?.split(' ')[0]
      ? ` (tackled by ${defender.player_name.split(' ')[0]})`
      : '';

    let description = `${play.play_type} — ${play.outcome}`;

    if (play.is_conversion) {
      const pts    = play.conv_points ?? 0;
      const caught = play.outcome === 'complete';
      if (caught) {
        description = `${pName} passes to ${recName} for ${pts}-point conversion`;
      } else {
        description = `${pName} throws incomplete conversion, no good`;
      }
    } else if (play.play_type === 'rush') {
      if (play.outcome === 'td')        description = `${rushName} rushed for a touchdown`;
      else if (play.outcome === 'safety') description = `${rushName} rushed for a safety`;
      else description = `${rushName} rushed for ${yardsGained} yard${yardsGained !== 1 ? 's' : ''}${defStr}`;
    } else if (play.play_type === 'pass') {
      if (play.outcome === 'td')              description = `${pName} passes to ${recName} for a touchdown`;
      else if (play.outcome === 'pick_6')     description = `${pName} throws interception${defender ? ` to ${defender.player_name.split(' ')[0]}` : ''} for a touchdown`;
      else if (play.outcome === 'interception') description = `${pName} throws interception`;
      else if (play.outcome === 'incomplete')   description = `${pName} throws incompletion`;
      else description = `${pName} passes to ${recName} for ${yardsGained} yard${yardsGained !== 1 ? 's' : ''}${defStr}`;
    } else if (play.play_type === 'punt') {
      if (play.outcome === 'punt_return_td') {
        description = `${offenseIsHome ? 'Away' : 'Home'} returns punt for a touchdown`;
      } else {
        description = `${offenseIsHome ? 'Home' : 'Away'} punts`;
      }
    } else if (play.play_type === 'penalty') {
      description = `Penalty`;
    }

    return {
      id:              String(play.play_id),
      playNumber:      i + 1,
      half:            play.first_half ? 1 : 2,
      down:            play.down,
      distance:        play.distance,
      yardLine:        play.yard_line,
      clock:           play.game_clock,
      description,
      yardsGained,
      homeScore,
      awayScore,
      driveId:         did,
      drivePossession: possession,
      driveResult,
    };
  });

  // ── Reconstruct current game state from last non-conversion play ───────────
  // If the last play is a conversion we need to look further back to find
  // the yard line and possession the game should resume at (kickoff position).
  const lastPlay     = plays[plays.length - 1];
  const lastNonConv  = [...plays].reverse().find(p => !p.is_conversion) ?? lastPlay;

  const lastOffIsHome = lastNonConv.offense_team === homeTeamId;
  const lastPossession = lastOffIsHome ? 'home' : 'away';

  // After a TD + conversion the next drive starts from kickoff yard for the
  // receiving team. After anything else resume at new_yard_line.
  let currentYard;
  let currentPossession;

  const lastNonConvOutcome = lastNonConv.outcome;
  const scoringOutcomes    = ['td', 'pick_6', 'safety'];
  const possessionFlipOutcomes = ['punt', 'interception', 'turnover_on_downs'];

  const conversionPending = !lastPlay.is_conversion && (
    lastNonConvOutcome === 'td' ||
    lastNonConvOutcome === 'pick_6' ||
    lastNonConvOutcome === 'punt_return_td'
  );

  const currentHomeAttacksRight = effectiveHomeAttacksRight(openingHomeAttacksRight, lastPlay.first_half);

  if (conversionPending) {
    if (lastNonConvOutcome === 'td') {
      currentPossession = lastPossession;
    } else {
      // pick-6 / punt return TD — defending (receiving) team scored
      currentPossession = lastPossession === 'home' ? 'away' : 'home';
    }
    currentYard = lastNonConv.new_yard_line ?? lastNonConv.yard_line;
  } else if (scoringOutcomes.includes(lastNonConvOutcome)) {
    // Possession flips after a score — receiving team starts from their own 14
    currentPossession = lastPossession === 'home' ? 'away' : 'home';
    currentYard = kickoffYard(currentPossession, currentHomeAttacksRight);
  } else if (possessionFlipOutcomes.includes(lastNonConvOutcome)) {
    // Punt, INT, or turnover — defense takes over at the spot
    currentPossession = lastPossession === 'home' ? 'away' : 'home';
    currentYard       = lastNonConv.new_yard_line ?? lastNonConv.yard_line;
  } else {
    currentPossession = lastPossession;
    currentYard       = lastNonConv.new_yard_line ?? lastNonConv.yard_line;
  }

  const fdTarget = firstDownYard(currentYard, currentPossession, currentHomeAttacksRight);
  const distance = distanceToFirst(currentYard, currentPossession, currentHomeAttacksRight);

  // Determine down: if the last non-conv play advanced the ball or scored,
  // the next play is 1st down. Otherwise use the stored down + 1 (capped at 4).
  const advancingOutcomes = ['td', 'pick_6', 'punt_return_td', 'safety', 'punt', 'interception', 'turnover_on_downs'];
  const nextDown = advancingOutcomes.includes(lastNonConvOutcome) ? 1 : Math.min((lastNonConv.down ?? 1) + 1, 4);

  const lastDriveId    = driveIds[plays.length - 1];
  const currentDriveId = isDriveComplete(lastPlay) ? lastDriveId + 1 : lastDriveId;

  return {
    half:             lastPlay.first_half ? 1 : 2,
    clock:            lastPlay.game_clock ?? '20:00',
    down:             nextDown,
    distance,
    yardLine:         currentYard,
    fdTarget,
    possession:       currentPossession,
    openingPossession,
    openingHomeAttacksRight,
    homeAttacksRight: currentHomeAttacksRight,
    homeScore,
    awayScore,
    selectedOffender: null,
    selectedDefender: null,
    newSpot:          null,
    playPhase:        conversionPending ? 'conversion' : 'idle',
    playType:         null,
    selectedReceiver: null,
    penaltyTeam:      null,
    driveId:          currentDriveId,
    log,
    refreshTrigger:   0,
    gameId,
    homeTeamId,
    awayTeamId,
  };
}