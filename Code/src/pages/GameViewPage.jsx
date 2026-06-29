import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import PlayByPlay from "../components/game/PlayByPlay";
import { yardsGainedForPlay } from "../utils/statsHelpers";

// ── Outcome → driveResult mapping (inverse of useSavePlay) ───────────────────
const OUTCOME_TO_DRIVE_RESULT = {
  td:                 'Touchdown',
  pick_6:             'Pick 6',
  interception:       'Interception',
  turnover_on_downs:  'Turnover on Downs',
  punt:               'Punt',
  safety:             'Safety',
  end_of_half:        'End of Half',
};

// ── Build a human-readable description from a play row + participants ─────────
function buildDescription(play, participants, homeTeamId, homeAttacksRight) {
  const passer   = participants.find(p => p.role === 'passer');
  const receiver = participants.find(p => p.role === 'receiver');
  const rusher   = participants.find(p => p.role === 'rusher');
  const defender = participants.find(p => p.role === 'defender');

  const passerName   = passer?.player_name?.split(' ')[0]   ?? 'QB';
  const receiverName = receiver?.player_name?.split(' ')[0] ?? 'Receiver';
  const rusherName   = rusher?.player_name?.split(' ')[0]   ?? 'Runner';
  const defName      = defender?.player_name?.split(' ')[0];
  const tackleStr    = defName ? ` (tackled by ${defName})` : '';

  const yards = yardsGainedForPlay(play, homeTeamId, homeAttacksRight);

  switch (play.outcome) {
    case 'td':
      return play.play_type === 'rush'
        ? `${rusherName} rushed for a touchdown`
        : `${passerName} passes to ${receiverName} for a touchdown`;
    case 'pick_6':
      return `${passerName} throws interception${defName ? ` to ${defName}` : ''} for a touchdown`;
    case 'interception':
      return `${passerName} throws interception${defName ? ` to ${defName}` : ''}`;
    case 'safety':
      return play.play_type === 'rush'
        ? `${rusherName} rushed for a safety`
        : `${passerName} passes to ${receiverName} for a safety`;
    case 'punt':
      return `${play.offense_team_name} punts`;
    case 'penalty':
      return `Penalty on ${play.penalty_team_name ?? 'unknown team'}`;
    case 'incomplete':
      return `${passerName} throws incompletion`;
    case 'complete':
      if (play.play_type === 'rush') {
        return `${rusherName} rushed for ${yards} yard${yards !== 1 ? 's' : ''}${tackleStr}`;
      }
      if (play.is_conversion) {
        return `${passerName} passes to ${receiverName} for ${play.conv_points}-point conversion`;
      }
      return `${passerName} passes to ${receiverName} for ${yards} yard${yards !== 1 ? 's' : ''}${tackleStr}`;
    default:
      return `${play.play_type} — ${play.outcome}`;
  }
}

// ── Fetch and reconstruct game ────────────────────────────────────────────────
async function fetchGameData(gameId) {
  // 1. Game + team names
  const { data: gameRow, error: gameErr } = await supabase
    .from('Game')
    .select(`
      game_id,
      home_attacks_right,
      home:Team!home_team(team_id, name),
      away:Team!away_team(team_id, name)
    `)
    .eq('game_id', gameId)
    .single();

  if (gameErr) throw gameErr;

  const homeName    = gameRow.home.name;
  const awayName    = gameRow.away.name;
  const homeTeamId  = gameRow.home.team_id;
  const homeAttacksRight = gameRow.home_attacks_right !== false;

  // 2. All plays for this game ordered by play_id
  const { data: plays, error: playsErr } = await supabase
    .from('Play')
    .select('*')
    .eq('game_id', gameId)
    .order('play_id', { ascending: true });

  if (playsErr) throw playsErr;
  if (!plays.length) return { homeName, awayName, log: [], finalHome: 0, finalAway: 0 };

  // 3. All participants for these plays with player names
  const playIds = plays.map(p => p.play_id);
  const { data: parts, error: partsErr } = await supabase
    .from('Participants')
    .select(`
      play_id,
      role,
      player:Player(player_id, name)
    `)
    .in('play_id', playIds);

  if (partsErr) throw partsErr;

  // Group participants by play_id
  const partsByPlay = {};
  for (const p of parts) {
    if (!partsByPlay[p.play_id]) partsByPlay[p.play_id] = [];
    partsByPlay[p.play_id].push({
      role:        p.role,
      player_name: p.player?.name ?? '',
    });
  }

  // 4. Reconstruct running score and log entries
  let homeScore = 0;
  let awayScore = 0;

  // Score map from outcome
  const scoreMap = {
    td:     6,
    pick_6: 6,
    safety: 2,
  };

  // Track drive IDs — a new drive starts when possession changes or after a scoring play
  let driveId       = 1;
  let lastPossession = null;

  const log = plays.map((play, i) => {
    const offenseIsHome   = play.offense_team === homeTeamId;
    const possession      = offenseIsHome ? 'home' : 'away';
    const participants    = partsByPlay[play.play_id] ?? [];

    // Annotate play with team name for description building
    play.offense_is_home      = offenseIsHome;
    play.offense_team_name    = offenseIsHome ? homeName : awayName;
    play.penalty_team_name    = play.penalty_team_id
      ? (play.penalty_team_id === homeTeamId ? homeName : awayName)
      : null;

    // Score updates
    if (play.outcome === 'td' || play.outcome === 'safety') {
      if (offenseIsHome) homeScore += scoreMap[play.outcome];
      else               awayScore += scoreMap[play.outcome];
    }
    if (play.outcome === 'pick_6') {
      // defending team scores
      if (offenseIsHome) awayScore += 6;
      else               homeScore += 6;
    }
    if (play.is_conversion && play.outcome === 'complete') {
      if (offenseIsHome) homeScore += play.conv_points ?? 0;
      else               awayScore += play.conv_points ?? 0;
    }

    // Drive tracking
    if (lastPossession !== null && possession !== lastPossession) driveId++;
    lastPossession = possession;

    const yardsGained = yardsGainedForPlay(play, homeTeamId, homeAttacksRight);

    // driveResult only on final play of a drive (possession change or end)
    const nextPlay       = plays[i + 1];
    const nextPossession = nextPlay
      ? (nextPlay.offense_team === homeTeamId ? 'home' : 'away')
      : null;
    const isDriveEnd     = !nextPlay || nextPossession !== possession;
    const driveResult    = isDriveEnd
      ? (OUTCOME_TO_DRIVE_RESULT[play.outcome] ?? undefined)
      : undefined;

    return {
      id:              String(play.play_id),
      playNumber:      i + 1,
      half:            play.first_half ? 1 : 2,
      down:            play.down,
      distance:        play.distance,
      yardLine:        play.yard_line,
      clock:           play.game_clock,
      description:     buildDescription(play, participants, homeTeamId, homeAttacksRight),
      yardsGained,
      homeScore,
      awayScore,
      driveId,
      drivePossession: possession,
      driveResult,
    };
  });

  const last = log[log.length - 1];

  return {
    homeName,
    awayName,
    log,
    finalHome: last?.homeScore ?? 0,
    finalAway: last?.awayScore ?? 0,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function GameViewPage() {
  const { id } = useParams();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    fetchGameData(Number(id))
      .then(setData)
      .catch(err => { console.error(err); setError(err.message ?? 'Failed to load game'); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-900 text-slate-400 text-sm">
      Loading game…
    </div>
  );

  if (error || !data) return (
    <div className="flex h-screen items-center justify-center bg-slate-900 text-red-400 text-sm">
      {error || 'Game not found'}
    </div>
  );

  const { homeName, awayName, log, finalHome, finalAway } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20">
      <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">

        {/* Back */}
        <Link to="/games" className="text-slate-400 text-sm hover:text-white transition-colors">
          ← Back to History
        </Link>

        {/* Score header */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="grid grid-cols-3 items-center gap-4">
            <div className="text-center">
              <p className="text-[11px] font-black uppercase tracking-widest text-[#3b82f6] mb-1">{homeName}</p>
              <p className="text-5xl font-black text-white tabular-nums">{finalHome}</p>
            </div>
            <div className="text-center">
              <p className="text-slate-500 text-xs uppercase tracking-widest">Final</p>
            </div>
            <div className="text-center">
              <p className="text-[11px] font-black uppercase tracking-widest text-[#C9A84C] mb-1">{awayName}</p>
              <p className="text-5xl font-black text-white tabular-nums">{finalAway}</p>
            </div>
          </div>
        </div>

        {/* Play by play */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden" style={{ minHeight: 400 }}>
          <PlayByPlay log={log} homeName={homeName} awayName={awayName} />
        </div>

      </div>
    </div>
  );
}