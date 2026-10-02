import { supabase } from '../supabaseClient';
import { attacksIncreasing, fieldLength } from '../gameLogic';
import { isSuccessfulPlayResult } from '../utils/statsHelpers';

function isSuccessfulPlay(entry, outcome, yardsGained) {
  if (entry._isConversion) return null;
  if (entry.description?.includes('conversion')) return null;
  if (entry._playType === 'punt' || outcome === 'penalty' || outcome === 'punt' || outcome === 'punt_return_td') return null;

  const result = isSuccessfulPlayResult(outcome, entry.down, entry.distance, yardsGained);
  return result;
}

function resolveNewYardLine(gs, entry, outcome) {
  if (['incomplete', 'interception', 'pick_6'].includes(outcome)) return null;

  if (gs.newSpot != null) return gs.newSpot;

  const yards = entry.yardsGained ?? 0;
  if (gs.homeAttacksRight != null) {
    const increasing = attacksIncreasing(gs.possession, gs.homeAttacksRight);
    if (yards !== 0) {
      return increasing ? gs.yardLine + yards : gs.yardLine - yards;
    }
    if (outcome === 'td') {
      return increasing ? fieldLength(gs.hasFortyYard) : 0;
    }
  }

  return gs.yardLine;
}

function participantRole(outcome, baseRole) {
  if (baseRole === 'defender' && (outcome === 'interception' || outcome === 'pick_6')) {
    return 'interceptor';
  }
  return baseRole;
}

export async function savePlay(gs, entry, { passer, receiver, defender, rusher, penaltyTeamId } = {}) {
  try {
    const offenseTeamId = gs.possession === 'home' ? gs.homeTeamId : gs.awayTeamId;
    const defenseTeamId = gs.possession === 'home' ? gs.awayTeamId : gs.homeTeamId;

    const isConversion =
      entry._isConversion === true ||
      (/(?:\d+-point conversion|incomplete conversion)/i.test(entry.description || '') &&
        !/touchdown/i.test(entry.description || ''));

    const convPoints = isConversion
      ? (() => {
          const m = entry.description.match(/(\d+)-point/);
          return m ? parseInt(m[1], 10) : (entry._convPoints ?? 0);
        })()
      : 0;

    let outcome;
    if (isConversion) {
      outcome = (entry.driveResult ?? '').includes('no good') ? 'incomplete' : 'complete';
    } else if (entry._outcome) {
      outcome = entry._outcome;
    } else {
      const outcomeMap = {
        Touchdown:         'td',
        'Pick 6':          'pick_6',
        Interception:      'interception',
        'Turnover on Downs': 'turnover_on_downs',
        Punt:              'punt',
        'Punt Return TD':  'punt_return_td',
        Safety:            'safety',
        'End of Half':     'end_of_half',
      };
      outcome = outcomeMap[entry.driveResult] ?? 'complete';
    }

    const playTypeMap = { rush: 'rush', pass: 'pass', penalty: 'penalty', punt: 'punt', conversion: 'conversion' };
    let playType;
    if (isConversion) {
      playType = 'conversion';
    } else if (entry._playType) {
      playType = playTypeMap[entry._playType] ?? 'pass';
    } else {
      playType = rusher ? 'rush' : 'pass';
    }

    const yardsGained       = entry.yardsGained ?? 0;
    const successForOffense = isSuccessfulPlay(entry, outcome, yardsGained);
    let homeGoodPlay = null;
    if (successForOffense !== null) {
      homeGoodPlay = gs.possession === 'home' ? successForOffense : !successForOffense;
    }

    const newYardLine = resolveNewYardLine(gs, entry, outcome);

    const playRow = {
      game_id:         gs.gameId,
      offense_team:    offenseTeamId,
      defense_team:    defenseTeamId,
      play_type:       playType,
      outcome,
      first_half:      entry.half === 1,
      overtime:        entry.half === 3,
      is_conversion:   isConversion,
      conv_points:     isConversion ? convPoints : null,
      home_good_play:  homeGoodPlay,
      penalty_team_id: penaltyTeamId ? parseInt(penaltyTeamId, 10) : null,
      yard_line:       entry.yardLine,
      new_yard_line:   newYardLine,
      down:            entry.down,
      distance:        entry.distance,
    };

    const participants = [];
    if (passer) {
      participants.push({ player_id: parseInt(passer.id, 10), role: 'passer' });
    }
    if (receiver) {
      participants.push({ player_id: parseInt(receiver.id, 10), role: 'receiver' });
    }
    if (defender && outcome !== 'td') {
      participants.push({
        player_id: parseInt(defender.id, 10),
        role: participantRole(outcome, 'defender'),
      });
    }
    if (rusher) {
      participants.push({ player_id: parseInt(rusher.id, 10), role: 'rusher' });
    }

    const { data: playId, error: rpcErr } = await supabase.rpc('log_live_play', {
      p_game_id: playRow.game_id,
      p_offense_team: playRow.offense_team,
      p_defense_team: playRow.defense_team,
      p_play_type: playRow.play_type,
      p_outcome: playRow.outcome,
      p_first_half: playRow.first_half,
      p_overtime: playRow.overtime,
      p_is_conversion: playRow.is_conversion,
      p_conv_points: playRow.conv_points,
      p_home_good_play: playRow.home_good_play,
      p_penalty_team_id: playRow.penalty_team_id,
      p_yard_line: playRow.yard_line,
      p_new_yard_line: playRow.new_yard_line,
      p_down: playRow.down,
      p_distance: playRow.distance,
      p_participants: participants,
    });

    if (!rpcErr && playId) return { play_id: playId };

    const { data: play, error: playErr } = await supabase
      .from('Play')
      .insert(playRow)
      .select('play_id')
      .single();

    if (playErr) throw playErr;

    if (participants.length > 0) {
      const { error: partErr } = await supabase
        .from('Participants')
        .insert(participants.map((row) => ({ ...row, play_id: play.play_id })));
      if (partErr) throw partErr;
    }

    return play;
  } catch (err) {
    console.error('savePlay error:', err);
    return null;
  }
}
