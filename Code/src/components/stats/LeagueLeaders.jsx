import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { useLeague } from "../../context/LeagueContext";

import {
  yardsGainedForPlay,
  isPassCompletionOutcome,
  isReceivingOutcome,
  isInterceptionOutcome,
  countPassCompletions,
  countPlayerInterceptions,
  countConversionAttempts,
  countConversionMade,
  isSuccessRatePlay,
  computeOffenseSuccessRate,
  opponentOffPlaysForTeam,
  countExplosivePlays,
  computeRedZoneStats,
} from "../../utils/statsHelpers";

const fmt = (val, digits = 1) =>
  typeof val === "number" && !isNaN(val) ? val.toFixed(digits) : "0.0";

function PlayerAvatar({ name }) {
  const initials = (name || "?")
    .split(" ")
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-200 shrink-0">
      {initials}
    </div>
  );
}

// Fixed-height row count (5 visible rows)
const ROW_HEIGHT = 60; // px, approx height of one row including border
const VISIBLE_ROWS = 5;

// Multi-stat player leader card — primary stat sorts/filters, secondary stats shown in columns
function PlayerMultiStatCard({ title, players, primaryKey, primaryLabel, primaryDigits = 0, secondary = [] }) {
  const filtered = players.filter(p => p[primaryKey] > 0);
  const sorted = [...filtered].sort((a, b) => b[primaryKey] - a[primaryKey]).slice(0, 10);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden flex flex-col">
      <div className="flex items-center px-4 py-3 border-b border-slate-700">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide flex-1">{title}</h3>
        <div className="flex items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-wide shrink-0">
          {secondary.map(s => (
            <span key={s.key} className="w-12 text-right">{s.label}</span>
          ))}
          <span className="w-14 text-right">{primaryLabel}</span>
        </div>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: ROW_HEIGHT * VISIBLE_ROWS }}>
        {sorted.map((p, i) => (
          <div key={p.player_id} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-700/50 last:border-b-0 hover:bg-slate-700/30">
            <PlayerAvatar name={p.name} />
            <div className="flex-1 min-w-0">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wide">{p.team_abbr || p.team_name}</p>
              <p className="text-slate-100 text-sm font-semibold truncate">{p.name}</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              {secondary.map(s => (
                <span key={s.key} className="w-12 text-right text-slate-300 text-sm">
                  {fmt(p[s.key], s.digits ?? 0)}{s.suffix || ''}
                </span>
              ))}
              <span className="w-14 text-right text-white font-bold text-sm">
                {fmt(p[primaryKey], primaryDigits)}
              </span>
            </div>
          </div>
        ))}
        {sorted.length === 0 && <p className="text-slate-500 text-sm px-4 py-3">No data</p>}
      </div>
    </div>
  );
}

function PlayerLeaderCard({ title, players, valueKey, valueLabel, digits = 0, suffix = "", secondary = [] }) {
  const filtered = players.filter(p => p[valueKey] > 0);
  const sorted = [...filtered].sort((a, b) => b[valueKey] - a[valueKey]).slice(0, 10);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden flex flex-col">
      <div className="flex items-center px-4 py-3 border-b border-slate-700">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide flex-1">{title}</h3>
        <div className="flex items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-wide shrink-0">
          {secondary.map(s => (
            <span key={s.key} className="w-12 text-right">{s.label}</span>
          ))}
          <span className="w-14 text-right">{valueLabel}</span>
        </div>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: ROW_HEIGHT * VISIBLE_ROWS }}>
        {sorted.map((p, i) => (
          <div key={p.player_id} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-700/50 last:border-b-0 hover:bg-slate-700/30">
            <PlayerAvatar name={p.name} />
            <div className="flex-1 min-w-0">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wide">{p.team_abbr || p.team_name}</p>
              <p className="text-slate-100 text-sm font-semibold truncate">{p.name}</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              {secondary.map(s => (
                <span key={s.key} className="w-12 text-right text-slate-300 text-sm">
                  {fmt(p[s.key], s.digits ?? 0)}{s.suffix || ''}
                </span>
              ))}
              <span className="w-14 text-right text-white font-bold text-sm">
                {fmt(p[valueKey], digits)}{suffix}
              </span>
            </div>
          </div>
        ))}
        {sorted.length === 0 && <p className="text-slate-500 text-sm px-4 py-3">No data</p>}
      </div>
    </div>
  );
}

function TeamLeaderCard({ title, teams, valueKey, digits = 1, suffix = "", lowerIsBetter = false, minKey = null, ratioKeys = null }) {
  let list = [...teams];
  if (minKey) list = list.filter((t) => (t[minKey] ?? 0) > 0);
  const sorted = list.sort((a, b) =>
    lowerIsBetter ? a[valueKey] - b[valueKey] : b[valueKey] - a[valueKey]
  );
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 flex flex-col">
      <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wide">{title}</h3>
      <div className="space-y-2">
        {sorted.map((t, i) => (
          <div key={t.team_id} className="flex items-center gap-3 p-2 rounded bg-slate-700/40">
            <span className="text-slate-400 text-xs w-5 text-center font-bold">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-slate-200 text-sm truncate">{t.name}</p>
            </div>
            <span className="text-white font-bold text-sm shrink-0 text-right">
              {ratioKeys && (
                <span className="text-slate-400 font-medium text-xs mr-1.5">
                  {t[ratioKeys.num]}/{t[ratioKeys.den]}
                </span>
              )}
              {fmt(t[valueKey], digits)}{suffix}
            </span>
          </div>
        ))}
        {sorted.length === 0 && <p className="text-slate-500 text-sm">No data</p>}
      </div>
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <div className="flex-1 h-px bg-slate-700" />
    </div>
  );
}

const VIEWS = [
  { key: "players", label: "Individual" },
  { key: "offense", label: "Offense" },
  { key: "defense", label: "Defense" },
];

function ViewToggle({ view, setView }) {
  return (
    <div className="flex gap-2 mb-8 bg-slate-800 border border-slate-700 rounded-lg p-1 w-fit">
      {VIEWS.map(v => (
        <button
          key={v.key}
          onClick={() => setView(v.key)}
          className={`px-4 py-2 rounded-md text-sm font-bold uppercase tracking-wide transition-colors ${
            view === v.key
              ? "bg-blue-600 text-white"
              : "text-slate-400 hover:text-white hover:bg-slate-700"
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}

export default function LeagueLeaders() {
  const { currentLeague } = useLeague();
  const [playerStats, setPlayerStats] = useState([]);
  const [teamStats, setTeamStats]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [view, setView]               = useState("players");

  useEffect(() => {
    if (!currentLeague) return;
    const fetchAll = async () => {
      setLoading(true);

      const { data: teams }        = await supabase.from("Team").select("*").eq("league_id", currentLeague.league_id);
      const { data: players }      = await supabase.from("Player").select("*").in("team_id", (teams || []).map(t => t.team_id));
      const { data: games }        = await supabase.from("Game").select("*").eq("league_id", currentLeague.league_id);
      const { data: allPlays }     = await supabase.from("Play").select("*");
      const { data: participants } = await supabase.from("Participants").select("*");

      const leagueGameIds = new Set((games || []).map((g) => g.game_id));
      const plays = (allPlays || []).filter((p) => leagueGameIds.has(p.game_id));

      // Build game→home map
      const ghMap = {};
      const harMap = {};
      for (const g of (games || [])) {
        ghMap[g.game_id] = g.home_team;
        harMap[g.game_id] = g.home_attacks_right ?? true;
      }

      const yg = p => yardsGainedForPlay(p, ghMap[p.game_id], harMap[p.game_id]);

      // ── PLAYER STATS ──────────────────────────────────────────────────────
      const computedPlayers = (players || []).map(player => {
        const pid  = player.player_id;
        const team = (teams || []).find(t => t.team_id === player.team_id);

        const byRole = role => (participants || []).filter(p => p.player_id === pid && p.role === role).map(p => p.play_id);
        const passerIds      = byRole('passer');
        const rusherIds      = byRole('rusher');
        const receiverIds    = byRole('receiver');
        const defenderIds    = byRole('defender');
        const interceptorIds = byRole('interceptor');

        const getPlays = ids => (plays || []).filter(p => ids.includes(p.play_id));

        const passerData   = getPlays(passerIds).filter(p => !p.is_conversion && p.play_type !== 'penalty');
        const rusherData   = getPlays(rusherIds).filter(p => !p.is_conversion && p.play_type !== 'penalty');
        const receiverData = getPlays(receiverIds).filter(p => !p.is_conversion && p.play_type !== 'penalty');
        const defenderData = getPlays(defenderIds).filter(p => !p.is_conversion && p.play_type !== 'penalty');

        const passAttempts    = passerData.filter(p => p.play_type === 'pass').length;
        const passCompletions = countPassCompletions(passerData.filter(p => p.play_type === 'pass'));
        const passingYards    = passerData.filter(p => p.play_type === 'pass' && isPassCompletionOutcome(p.outcome)).reduce((s, p) => s + yg(p), 0);
        const passingTDs      = passerData.filter(p => p.play_type === 'pass' && p.outcome === 'td').length;
        const completionPct   = passAttempts > 0 ? (passCompletions / passAttempts) * 100 : 0;

        const rushingYards  = rusherData.reduce((s, p) => s + yg(p), 0);
        const rushes        = rusherData.length;
        const rushingTDs    = rusherData.filter(p => p.outcome === 'td').length;

        const receptions     = receiverData.filter(p => isReceivingOutcome(p.outcome)).length;
        const receivingYards = receiverData.filter(p => isReceivingOutcome(p.outcome)).reduce((s, p) => s + yg(p), 0);
        const receivingTDs   = receiverData.filter(p => p.outcome === 'td').length;

        const interceptions    = countPlayerInterceptions(pid, participants, plays);
        const flagPulls        = defenderData.length;
        // TFL includes backward passes too
        const flagPullsForLoss = defenderData.filter(p =>
          (p.play_type === 'rush' || (p.play_type === 'pass' && p.outcome === 'complete'))
          && yg(p) < 0
        ).length;

        const allIds    = new Set([...passerIds, ...rusherIds, ...receiverIds, ...defenderIds, ...interceptorIds]);
        const gameIds   = new Set((plays || []).filter(p => allIds.has(p.play_id)).map(p => p.game_id));
        const gamesPlayed = gameIds.size || 1;

        return {
          player_id: pid,
          name: player.name,
          team_name: team?.name || '',
          team_abbr: team?.abbreviation || team?.abbr || team?.name || '',
          passingYards, passingTDs, completionPct,
          rushingYards, rushes, rushingTDs,
          receivingYards, receivingTDs, receptions,
          passingYpg:   passingYards   / gamesPlayed,
          rushingYpg:   rushingYards   / gamesPlayed,
          receivingYpg: receivingYards / gamesPlayed,
          interceptions, flagPulls, flagPullsForLoss,
        };
      });

      setPlayerStats(computedPlayers);

      // ── TEAM STATS ────────────────────────────────────────────────────────
      const computedTeams = (teams || []).map(team => {
        const tid = team.team_id;
        // eslint-disable-next-line eqeqeq
        const teamGames  = (games || []).filter(g => g.home_team == tid || g.away_team == tid);
        const gamesPlayed = teamGames.length || 1;

        // eslint-disable-next-line eqeqeq
        const offPlays  = (plays || []).filter(p => p.offense_team == tid && !p.is_conversion && p.play_type !== 'penalty');
        // eslint-disable-next-line eqeqeq
        const defPlays  = (plays || []).filter(p => p.defense_team == tid && !p.is_conversion && p.play_type !== 'penalty');
        // eslint-disable-next-line eqeqeq
        const allOff    = (plays || []).filter(p => p.offense_team == tid);

        const points = allOff.reduce((sum, p) => {
          if (p.outcome === 'td') return sum + 6;
          if (p.is_conversion && p.outcome === 'complete') return sum + (p.conv_points || 0);
          return sum;
        }, 0);
        // eslint-disable-next-line eqeqeq
        const pointsAgainst = (plays || []).filter(p => p.defense_team == tid).reduce((sum, p) => {
          if (p.outcome === 'td') return sum + 6;
          if (p.is_conversion && p.outcome === 'complete') return sum + (p.conv_points || 0);
          return sum;
        }, 0);

        const passYards         = offPlays.filter(p => p.play_type === 'pass' && isPassCompletionOutcome(p.outcome)).reduce((s, p) => s + yg(p), 0);
        const rushYards         = offPlays.filter(p => p.play_type === 'rush').reduce((s, p) => s + yg(p), 0);
        const totalYards        = passYards + rushYards;
        const passYardsAgainst  = defPlays.filter(p => p.play_type === 'pass' && isPassCompletionOutcome(p.outcome)).reduce((s, p) => s + yg(p), 0);
        const rushYardsAgainst  = defPlays.filter(p => p.play_type === 'rush').reduce((s, p) => s + yg(p), 0);
        const totalYardsAgainst = passYardsAgainst + rushYardsAgainst;

        const scrimmageOffPlays = offPlays.filter(isSuccessRatePlay);
        const scrimmageDefPlays = defPlays.filter(isSuccessRatePlay);
        const yardsPerPlay        = scrimmageOffPlays.length > 0 ? totalYards / scrimmageOffPlays.length : 0;
        const yardsPerPlayAgainst = scrimmageDefPlays.length > 0 ? totalYardsAgainst / scrimmageDefPlays.length : 0;

        const passAttempts    = offPlays.filter(p => p.play_type === 'pass').length;
        const passCompletions = countPassCompletions(offPlays.filter(p => p.play_type === 'pass'));
        const completionPct   = passAttempts > 0 ? (passCompletions / passAttempts) * 100 : 0;

        const successibleOff = offPlays.filter(isSuccessRatePlay);
        const successFor = computeOffenseSuccessRate(
          successibleOff,
          (p) => ghMap[p.game_id],
          (p) => harMap[p.game_id],
        );

        const oppOffPlays = opponentOffPlaysForTeam(tid, teamGames, plays);
        const successAgainst = computeOffenseSuccessRate(
          oppOffPlays,
          (p) => ghMap[p.game_id],
          (p) => harMap[p.game_id],
        );

        const explosivePlays = countExplosivePlays(offPlays, p => ghMap[p.game_id], p => harMap[p.game_id]);
        const explosivePlaysAgainst = countExplosivePlays(defPlays, p => ghMap[p.game_id], p => harMap[p.game_id]);

        const interceptions = defPlays.filter(p => isInterceptionOutcome(p.outcome)).length;

        const defTFLIds = new Set(
          defPlays
            .filter(p => (p.play_type === 'rush' || (p.play_type === 'pass' && p.outcome === 'complete'))
              && yg(p) < 0)
            .map(p => p.play_id),
        );
        const tflsForced = [...defTFLIds].filter(pid =>
          (participants || []).some(p => p.play_id === pid && p.role === 'defender'),
        ).length;

        // eslint-disable-next-line eqeqeq
        const convPlays     = (plays || []).filter(p => p.offense_team == tid && p.is_conversion);
        const conv1Attempts = countConversionAttempts(convPlays, participants, 1);
        const conv1Made     = countConversionMade(convPlays, participants, 1);
        const conv2Attempts = countConversionAttempts(convPlays, participants, 2);
        const conv2Made     = countConversionMade(convPlays, participants, 2);
        const conv3Attempts = countConversionAttempts(convPlays, participants, 3);
        const conv3Made     = countConversionMade(convPlays, participants, 3);

        const pointsPerGame = teamGames.map(g => {
          // eslint-disable-next-line eqeqeq
          const gp = (plays || []).filter(p => p.game_id === g.game_id && p.offense_team == tid);
          return gp.reduce((sum, p) => {
            if (p.outcome === 'td') return sum + 6;
            if (p.is_conversion && p.outcome === 'complete') return sum + (p.conv_points || 0);
            return sum;
          }, 0);
        });
        const pointsAgainstPerGame = teamGames.map(g => {
          // eslint-disable-next-line eqeqeq
          const oppId = g.home_team == tid ? g.away_team : g.home_team;
          // eslint-disable-next-line eqeqeq
          const gp = (plays || []).filter(p => p.game_id === g.game_id && p.offense_team == oppId);
          return gp.reduce((sum, p) => {
            if (p.outcome === 'td') return sum + 6;
            if (p.is_conversion && p.outcome === 'complete') return sum + (p.conv_points || 0);
            return sum;
          }, 0);
        });

        const wins   = teamGames.filter((g, i) => pointsPerGame[i] > pointsAgainstPerGame[i]).length;
        const winPct = gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0;

        const { redZoneAttempts, redZoneScores, redZonePct } = computeRedZoneStats(
          tid,
          teamGames,
          plays,
          (gameId) => ghMap[gameId],
          (gameId) => harMap[gameId],
        );

        return {
          team_id: tid, name: team.name,
          winPct,
          ppg:  points        / gamesPlayed,
          papg: pointsAgainst / gamesPlayed,
          passYpg:          passYards         / gamesPlayed,
          rushYpg:          rushYards         / gamesPlayed,
          totalYpg:         totalYards        / gamesPlayed,
          passYpgAgainst:   passYardsAgainst  / gamesPlayed,
          rushYpgAgainst:   rushYardsAgainst  / gamesPlayed,
          totalYpgAgainst:  totalYardsAgainst / gamesPlayed,
          yardsPerPlay, yardsPerPlayAgainst,
          completionPct, successFor, successAgainst,
          explosivePlays, explosivePlaysAgainst, interceptions, tflsForced,
          redZoneAttempts, redZoneScores, redZonePct,
          conv1Pct: conv1Attempts > 0 ? (conv1Made / conv1Attempts) * 100 : 0,
          conv2Pct: conv2Attempts > 0 ? (conv2Made / conv2Attempts) * 100 : 0,
          conv3Pct: conv3Attempts > 0 ? (conv3Made / conv3Attempts) * 100 : 0,
        };
      });

      setTeamStats(computedTeams);
      setLoading(false);
    };

    fetchAll();
  }, [currentLeague]);

  if (loading) return <p className="text-slate-400">Loading league leaders...</p>;

  return (
    <div className="space-y-10">
      <ViewToggle view={view} setView={setView} />

      {view === "players" && (
  <div>
    <SectionHeader title="Player Leaders" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <PlayerMultiStatCard
        title="Pass Yards"
        players={playerStats}
        primaryKey="passingYards"
        primaryLabel="YDS"
        secondary={[
          { key: 'completionPct', label: 'COMP%', digits: 0, suffix: '%' },
          { key: 'passingTDs', label: 'TD', digits: 0 },
        ]}
      />
      <PlayerLeaderCard
        title="Flag Pulls"
        players={playerStats}
        valueKey="flagPulls"
        valueLabel="PULLS"
        digits={0}
      />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <PlayerMultiStatCard
        title="Rush Yards"
        players={playerStats}
        primaryKey="rushingYards"
        primaryLabel="YDS"
        secondary={[
          { key: 'rushes', label: 'RUSH', digits: 0 },
          { key: 'rushingTDs', label: 'TD', digits: 0 },
        ]}
      />
      <PlayerLeaderCard
        title="Flag Pulls For Loss"
        players={playerStats}
        valueKey="flagPullsForLoss"
        valueLabel="TFL"
        digits={0}
      />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <PlayerMultiStatCard
        title="Receiving Yards"
        players={playerStats}
        primaryKey="receivingYards"
        primaryLabel="YDS"
        secondary={[
          { key: 'receptions', label: 'REC', digits: 0 },
          { key: 'receivingTDs', label: 'TD', digits: 0 },
        ]}
      />
      <PlayerLeaderCard
        title="Interceptions"
        players={playerStats}
        valueKey="interceptions"
        valueLabel="INT"
        digits={0}
      />
    </div>
  </div>
)}

      {view === "offense" && (
        <div>
          <SectionHeader title="Team Leaders — Offense" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <TeamLeaderCard title="Points Per Game"     teams={teamStats} valueKey="ppg" />
            <TeamLeaderCard title="Passing Yards / Game"teams={teamStats} valueKey="passYpg" />
            <TeamLeaderCard title="Rushing Yards / Game"teams={teamStats} valueKey="rushYpg" />
            <TeamLeaderCard title="Total Yards / Game"  teams={teamStats} valueKey="totalYpg" />
            <TeamLeaderCard title="Yards Per Play"      teams={teamStats} valueKey="yardsPerPlay" />
            <TeamLeaderCard title="Completion %"        teams={teamStats} valueKey="completionPct"   suffix="%" />
            <TeamLeaderCard title="Success Rate"        teams={teamStats} valueKey="successFor"      suffix="%" />
            <TeamLeaderCard title="Explosive Plays (20+)" teams={teamStats} valueKey="explosivePlays" digits={0} />
          </div>

          <p className="text-slate-500 text-xs mb-4 uppercase tracking-wide">Conversions</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <TeamLeaderCard title="1-Point %" teams={teamStats} valueKey="conv1Pct" suffix="%" />
            <TeamLeaderCard title="2-Point %" teams={teamStats} valueKey="conv2Pct" suffix="%" />
            <TeamLeaderCard title="3-Point %" teams={teamStats} valueKey="conv3Pct" suffix="%" />
            <TeamLeaderCard title="Red Zone Success" teams={teamStats} valueKey="redZonePct" suffix="%" minKey="redZoneAttempts" ratioKeys={{ num: 'redZoneScores', den: 'redZoneAttempts' }} />
          </div>
        </div>
      )}

      {view === "defense" && (
        <div>
          <SectionHeader title="Team Leaders — Defense" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <TeamLeaderCard title="Points Against / Game"      teams={teamStats} valueKey="papg"                lowerIsBetter />
            <TeamLeaderCard title="Pass Yards Against / Game"  teams={teamStats} valueKey="passYpgAgainst"      lowerIsBetter />
            <TeamLeaderCard title="Rush Yards Against / Game"  teams={teamStats} valueKey="rushYpgAgainst"      lowerIsBetter />
            <TeamLeaderCard title="Total Yards Against / Game" teams={teamStats} valueKey="totalYpgAgainst"     lowerIsBetter />
            <TeamLeaderCard title="Yards Per Play Against"     teams={teamStats} valueKey="yardsPerPlayAgainst" lowerIsBetter />
            <TeamLeaderCard title="Success Rate Against"       teams={teamStats} valueKey="successAgainst"      suffix="%" lowerIsBetter />
            <TeamLeaderCard title="Explosive Plays Allowed"    teams={teamStats} valueKey="explosivePlaysAgainst" digits={0} lowerIsBetter />
            <TeamLeaderCard title="Interceptions"              teams={teamStats} valueKey="interceptions"       digits={0} />
            <TeamLeaderCard title="Flag Pulls For Loss"        teams={teamStats} valueKey="tflsForced"          digits={0} />
          </div>
        </div>
      )}
    </div>
  );
}