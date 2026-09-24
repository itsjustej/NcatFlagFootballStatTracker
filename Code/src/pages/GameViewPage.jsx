import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BarChart3, List, Play, Trash2, Users } from "lucide-react";
import { supabase } from "../supabaseClient";
import PlayByPlay from "../components/game/PlayByPlay";
import GameBoxScore from "../components/game/GameBoxScore";
import { ConfirmDeleteDialog } from "../components/teams/ConfirmDeleteDialog";
import { useLeague } from "../context/LeagueContext";
import { useAuth } from "../auth/AuthContext";
import { deleteGameById } from "../utils/deleteGame";
import {
  yardsGainedForPlay,
  computeTeamBoxStats,
  computePlayerBoxStats,
} from "../utils/statsHelpers";
import { playerFirstName } from "../utils/playerName";
import { playPeriod } from "../gameLogic";

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
function buildDescription(play, participants, homeTeamId, homeAttacksRight, hasFortyYard) {
  const passer   = participants.find(p => p.role === 'passer');
  const receiver = participants.find(p => p.role === 'receiver');
  const rusher   = participants.find(p => p.role === 'rusher');
  const defender = participants.find(p => p.role === 'defender');

  const passerName   = playerFirstName(passer?.player_name, 'QB');
  const receiverName = playerFirstName(receiver?.player_name, 'Receiver');
  const rusherName   = playerFirstName(rusher?.player_name, 'Runner');
  const defName      = playerFirstName(defender?.player_name);
  const tackleStr    = defName ? ` (tackled by ${defName})` : '';

  const yards = yardsGainedForPlay(play, homeTeamId, homeAttacksRight, hasFortyYard);

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
      has_forty_yard,
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
  const hasFortyYard = gameRow.has_forty_yard !== false;

  // 2. All plays for this game ordered by play_id
  const { data: plays, error: playsErr } = await supabase
    .from('Play')
    .select('*')
    .eq('game_id', gameId)
    .order('play_id', { ascending: true });

  const { data: rosterPlayers } = await supabase
    .from('Player')
    .select('player_id, name, team_id')
    .in('team_id', [homeTeamId, gameRow.away.team_id]);

  const emptyBox = {
    homeName,
    awayName,
    log: [],
    finalHome: 0,
    finalAway: 0,
    periodScores: scoresByPeriod([]),
    homeStats: computeTeamBoxStats(homeTeamId, [], homeTeamId, homeAttacksRight, hasFortyYard),
    awayStats: computeTeamBoxStats(gameRow.away.team_id, [], homeTeamId, homeAttacksRight, hasFortyYard),
    homePlayers: (rosterPlayers || [])
      .filter((p) => p.team_id === homeTeamId)
      .map((p) => computePlayerBoxStats(p, [], [], homeTeamId, homeAttacksRight, hasFortyYard)),
    awayPlayers: (rosterPlayers || [])
      .filter((p) => p.team_id === gameRow.away.team_id)
      .map((p) => computePlayerBoxStats(p, [], [], homeTeamId, homeAttacksRight, hasFortyYard)),
  };

  if (playsErr) throw playsErr;
  if (!plays?.length) return emptyBox;

  // 3. All participants for these plays with player names
  const playIds = plays.map(p => p.play_id);
  const { data: parts, error: partsErr } = await supabase
    .from('Participants')
    .select(`
      play_id,
      role,
      player_id,
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

    // Drive tracking — a new half starts a new drive even if the same team has the ball
    const prevPlay = plays[i - 1];
    const halfChanged = prevPlay && playPeriod(play) !== playPeriod(prevPlay) && !play.is_conversion && !prevPlay.is_conversion;
    if (lastPossession !== null && (possession !== lastPossession || halfChanged)) driveId++;
    lastPossession = possession;

    const yardsGained = yardsGainedForPlay(play, homeTeamId, homeAttacksRight, hasFortyYard);

    // driveResult only on final play of a drive (possession change or end)
    const nextPlay       = plays[i + 1];
    const nextPossession = nextPlay
      ? (nextPlay.offense_team === homeTeamId ? 'home' : 'away')
      : null;
    const isDriveEnd     = !nextPlay || nextPossession !== possession;
    const nextHalfChanged = nextPlay && playPeriod(play) !== playPeriod(nextPlay) && !play.is_conversion && !nextPlay.is_conversion;
    const driveResult    = isDriveEnd || nextHalfChanged
      ? (OUTCOME_TO_DRIVE_RESULT[play.outcome] ?? (nextHalfChanged ? 'End of Half' : undefined))
      : undefined;

    return {
      id:              String(play.play_id),
      playNumber:      i + 1,
      half:            playPeriod(play),
      down:            play.down,
      distance:        play.distance,
      yardLine:        play.yard_line,
      description:     buildDescription(play, participants, homeTeamId, homeAttacksRight, hasFortyYard),
      yardsGained,
      homeScore,
      awayScore,
      driveId,
      drivePossession: possession,
      driveResult,
    };
  });

  const last = log[log.length - 1];
  const awayTeamId = gameRow.away.team_id;
  const homeStats = computeTeamBoxStats(homeTeamId, plays, homeTeamId, homeAttacksRight, hasFortyYard);
  const awayStats = computeTeamBoxStats(awayTeamId, plays, homeTeamId, homeAttacksRight, hasFortyYard);
  const statParticipants = (parts || []).map((p) => ({
    play_id: p.play_id,
    role: p.role,
    player_id: p.player_id,
  }));
  const homePlayers = (rosterPlayers || [])
    .filter((p) => p.team_id === homeTeamId)
    .map((p) => computePlayerBoxStats(p, plays, statParticipants, homeTeamId, homeAttacksRight, hasFortyYard));
  const awayPlayers = (rosterPlayers || [])
    .filter((p) => p.team_id === awayTeamId)
    .map((p) => computePlayerBoxStats(p, plays, statParticipants, homeTeamId, homeAttacksRight, hasFortyYard));

  return {
    homeName,
    awayName,
    log,
    finalHome: last?.homeScore ?? 0,
    finalAway: last?.awayScore ?? 0,
    periodScores: scoresByPeriod(log),
    homeStats,
    awayStats,
    homePlayers,
    awayPlayers,
  };
}

const PERIODS = [
  { id: 1, label: '1st' },
  { id: 2, label: '2nd' },
  { id: 3, label: 'OT' },
];

/** Points scored in each half, plus overtime when the game reached it. */
function scoresByPeriod(log) {
  let prevHome = 0;
  let prevAway = 0;
  const rows = PERIODS.map((period) => {
    const plays = log.filter((entry) => entry.half === period.id);
    if (!plays.length) return { ...period, home: null, away: null, played: false };
    const last = plays[plays.length - 1];
    const home = last.homeScore - prevHome;
    const away = last.awayScore - prevAway;
    prevHome = last.homeScore;
    prevAway = last.awayScore;
    return { ...period, home, away, played: true };
  });
  const reachedOt = rows.some((row) => row.id === 3 && row.played);
  return rows.filter((row) => row.id !== 3 || reachedOt);
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function GameViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { startGame, clearGame, currentGameId } = useLeague();
  const { canDelete, canTrackGames } = useAuth();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tab, setTab] = useState("plays");

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

  const { homeName, awayName, log, finalHome, finalAway, periodScores, homeStats, awayStats, homePlayers, awayPlayers } = data;

  const handleResume = () => {
    startGame(Number(id));
    navigate('/game');
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    try {
      await deleteGameById(Number(id));
      if (currentGameId === Number(id)) clearGame();
      navigate('/');
    } catch (err) {
      console.error(err);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="bg-slate-900 text-white h-[calc(100dvh-4.75rem)] overflow-hidden pt-4 sm:pt-5 px-4 pb-4">
      <div className="max-w-5xl mx-auto h-full flex flex-col gap-4">

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link to="/" className="text-slate-400 text-sm hover:text-white transition-colors shrink-0">
              ← Back to Games
            </Link>
          <div className="flex items-center gap-2">
            {canDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/50 border border-slate-700 hover:border-red-500/40 transition-colors"
                aria-label="Delete game"
                title="Delete game"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            {canTrackGames && (
              <button
                type="button"
                onClick={handleResume}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-semibold transition-colors"
              >
                <Play className="w-4 h-4" />
                Resume game
              </button>
            )}
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="grid grid-cols-3 items-center gap-4">
            <div className="text-center">
              <p className="text-[11px] font-black uppercase tracking-widest text-[#3b82f6] mb-1">{homeName}</p>
              <p className="text-5xl font-black text-white tabular-nums">{finalHome}</p>
            </div>
            <div className="flex justify-center">
              {log.length ? (
                <div
                  className="grid items-center gap-x-3 gap-y-1 text-center"
                  style={{ gridTemplateColumns: `repeat(${periodScores.length}, minmax(1.75rem, auto))` }}
                >
                  {periodScores.map((period) => (
                    <p key={period.id} className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      {period.label}
                    </p>
                  ))}
                  {periodScores.map((period) => (
                    <p key={`home-${period.id}`} className="text-sm font-black tabular-nums text-[#3b82f6]">
                      {period.played ? period.home : '–'}
                    </p>
                  ))}
                  {periodScores.map((period) => (
                    <p key={`away-${period.id}`} className="text-sm font-black tabular-nums text-[#C9A84C]">
                      {period.played ? period.away : '–'}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-xs uppercase tracking-widest">Kickoff</p>
              )}
            </div>
            <div className="text-center">
              <p className="text-[11px] font-black uppercase tracking-widest text-[#C9A84C] mb-1">{awayName}</p>
              <p className="text-5xl font-black text-white tabular-nums">{finalAway}</p>
            </div>
          </div>
        </div>

        <div className="flex bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden shrink-0">
          <ViewTab label="Plays" icon={List} active={tab === "plays"} onClick={() => setTab("plays")} />
          <ViewTab label="Team" icon={BarChart3} active={tab === "team"} onClick={() => setTab("team")} />
          <ViewTab label="Players" icon={Users} active={tab === "players"} onClick={() => setTab("players")} />
        </div>

        <div className="flex-1 min-h-0 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          {tab === "plays" && (
            <PlayByPlay log={log} homeName={homeName} awayName={awayName} />
          )}
          {tab === "team" && (
            <div className="h-full overflow-y-auto">
              <GameBoxScore
                view="team"
                homeName={homeName}
                awayName={awayName}
                homeStats={homeStats}
                awayStats={awayStats}
                homePlayers={homePlayers}
                awayPlayers={awayPlayers}
              />
            </div>
          )}
          {tab === "players" && (
            <div className="h-full overflow-y-auto">
              <GameBoxScore
                view="players"
                homeName={homeName}
                awayName={awayName}
                homeStats={homeStats}
                awayStats={awayStats}
                homePlayers={homePlayers}
                awayPlayers={awayPlayers}
              />
            </div>
          )}
        </div>

      </div>

      {confirmDelete && canDelete && (
        <ConfirmDeleteDialog
          onConfirm={handleDelete}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}

function ViewTab({ label, icon: Icon, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 text-sm font-medium transition min-h-[44px] ${
        active ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-700"
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
    </button>
  );
}