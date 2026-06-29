import React, { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, Legend, ResponsiveContainer, Tooltip
} from "recharts";
import { ChevronDown, TrendingUp, Shield, RefreshCw } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { useLeague } from "../../context/LeagueContext";

import {
  yardsGainedForPlay,
  isConverted,
  isFourthDownAttempt,
  isPassCompletionOutcome,
  isInterceptionOutcome,
  countPassCompletions,
  countConversionAttempts,
  countConversionMade,
  isSuccessRatePlay,
  computeOffenseSuccessRate,
  opponentOffPlaysForTeam,
  countExplosivePlays,
  computeRedZoneStats,
} from "../../utils/statsHelpers";

// ---------------- STAT ROW ---------------- //
function StatRow({ label, value, rank, total, isPercentage, pctValue, lowerIsBetter }) {
  const barWidth = isPercentage
    ? parseFloat(pctValue) || 0
    : total > 0 && rank > 0
      ? ((total - rank + 1) / total) * 100
      : 0;
  const barColor = lowerIsBetter ? "bg-red-500" : "bg-blue-500";
  return (
    <div className="flex items-center gap-4 py-3 border-b border-slate-700/50 last:border-0">
      <span className="text-slate-300 text-sm w-52 shrink-0">{label}</span>
      <div className="flex-1 bg-slate-700 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${barWidth}%` }} />
      </div>
      <span className="text-white font-bold text-sm w-16 text-right">{value}</span>
      {rank != null && (
        <span className="text-slate-400 text-xs w-16 text-right">#{rank} of {total}</span>
      )}
    </div>
  );
}

// ---------------- CONVERSION BAR ---------------- //
function ConversionBar({ label, attempts, completions, rank, total }) {
  const pct = attempts > 0 ? ((completions / attempts) * 100).toFixed(1) : 0;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-400 text-xs">{label}</span>
        <span className="text-slate-400 text-xs">#{rank} of {total}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-white font-bold text-lg w-16 shrink-0">{pct}%</span>
        <div className="flex-1 bg-slate-700 rounded-full h-2">
          <div className="h-2 rounded-full bg-green-500" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-slate-400 text-xs w-12 text-right shrink-0">{completions}/{attempts}</span>
      </div>
    </div>
  );
}

// ---------------- RECORD CARD ---------------- //
function RecordCard({ label, value, color }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 text-center">
      <p className={`text-4xl font-bold ${color}`}>{value}</p>
      <p className="text-slate-400 text-sm mt-1">{label}</p>
    </div>
  );
}

// ---------------- DOWN CONVERSION CARD ---------------- //
function DownConversionCard({ label, attempts, conversions, rank, total, color, hint }) {
  const pct = attempts > 0 ? ((conversions / attempts) * 100).toFixed(1) : '—';
  const barWidth = attempts > 0 ? (conversions / attempts) * 100 : 0;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <span className={`text-sm font-bold ${color}`}>{label}</span>
        {rank != null && <span className="text-slate-400 text-xs">#{rank} of {total}</span>}
      </div>
      <div className="flex items-end gap-3 mb-3">
        <span className="text-white font-black text-3xl tabular-nums">
          {pct}{attempts > 0 ? '%' : ''}
        </span>
        <span className="text-slate-400 text-sm mb-1">{conversions}/{attempts}</span>
      </div>
      <div className="bg-slate-700 rounded-full h-2">
        <div className="h-2 rounded-full transition-all"
          style={{ width: `${barWidth}%`, background: color === 'text-yellow-400' ? '#facc15' : color === 'text-red-400' ? '#f87171' : '#f97316' }} />
      </div>
      {hint && <p className="text-slate-500 text-xs mt-2">{hint}</p>}
    </div>
  );
}

// ---------------- MAIN ---------------- //
export default function TeamStats() {
  const { currentLeague } = useLeague();
  const [teams, setTeams]       = useState([]);
  const [teamId, setTeamId]     = useState("");
  const [allStats, setAllStats] = useState({});
  const [loading, setLoading]   = useState(false);

  // We need homeTeamId per game to compute direction-aware yards.
  // Build a map: game_id → home_team_id from the games array.
  const [gameHomeMap, setGameHomeMap] = useState({});

  useEffect(() => {
    if (!currentLeague) return;
    setTeamId("");
    setAllStats({});

    const fetchAll = async () => {
      const { data: teamsData } = await supabase
        .from("Team").select("*").eq("league_id", currentLeague.league_id);
      if (!teamsData) return;
      setTeams(teamsData);

      setLoading(true);
      const { data: games }        = await supabase.from("Game").select("*").eq("league_id", currentLeague.league_id);
      const { data: allPlays }     = await supabase.from("Play").select("*");
      const { data: participants } = await supabase.from("Participants").select("*");

      const leagueGameIds = new Set((games || []).map((g) => g.game_id));
      const plays = (allPlays || []).filter((p) => leagueGameIds.has(p.game_id));

      // Build game→home map for direction-aware calculations
      const ghMap = {};
      const harMap = {};
      for (const g of (games || [])) {
        ghMap[g.game_id] = g.home_team;
        harMap[g.game_id] = g.home_attacks_right ?? true;
      }
      setGameHomeMap(ghMap);

      const computed = {};

      for (const team of teamsData) {
        const tid = team.team_id;
        // eslint-disable-next-line eqeqeq
        const teamGames   = (games || []).filter(g => g.home_team == tid || g.away_team == tid);
        const gamesPlayed = teamGames.length;

        // eslint-disable-next-line eqeqeq
        const offPlays = (plays || []).filter(p => p.offense_team == tid && !p.is_conversion && p.play_type !== 'penalty');
        // eslint-disable-next-line eqeqeq
        const defPlays = (plays || []).filter(p => p.defense_team == tid && !p.is_conversion && p.play_type !== 'penalty');

        // ── Scoring ────────────────────────────────────────────────────────
        // eslint-disable-next-line eqeqeq
        const allOffPlays   = (plays || []).filter(p => p.offense_team == tid);
        const points        = allOffPlays.reduce((sum, p) => {
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

        // ── Yards (direction-aware) ────────────────────────────────────────
        // For each play we look up which team was home in that game.
        const yg = (p) => yardsGainedForPlay(p, ghMap[p.game_id], harMap[p.game_id]);
        const converted = (p) => isConverted(p, ghMap[p.game_id], harMap[p.game_id]);

        const passYards  = offPlays.filter(p => p.play_type === 'pass' && isPassCompletionOutcome(p.outcome)).reduce((s, p) => s + yg(p), 0);
        const rushYards  = offPlays.filter(p => p.play_type === 'rush').reduce((s, p) => s + yg(p), 0);
        const totalYards = passYards + rushYards;

        const passYardsAgainst  = defPlays.filter(p => p.play_type === 'pass' && isPassCompletionOutcome(p.outcome)).reduce((s, p) => s + yg(p), 0);
        const rushYardsAgainst  = defPlays.filter(p => p.play_type === 'rush').reduce((s, p) => s + yg(p), 0);
        const totalYardsAgainst = passYardsAgainst + rushYardsAgainst;

        const scrimmageOffPlays = offPlays.filter(isSuccessRatePlay);
        const scrimmageDefPlays = defPlays.filter(isSuccessRatePlay);
        const yardsPerPlay        = scrimmageOffPlays.length > 0 ? totalYards / scrimmageOffPlays.length : 0;
        const yardsPerPlayAgainst = scrimmageDefPlays.length > 0 ? totalYardsAgainst / scrimmageDefPlays.length : 0;

        // ── Success rate ───────────────────────────────────────────────────
        const successibleOffPlays = offPlays.filter(isSuccessRatePlay);
        const successibleDefPlays = defPlays.filter(isSuccessRatePlay);

        const successFor = computeOffenseSuccessRate(
          successibleOffPlays,
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

        // ── 3rd & 4th down ─────────────────────────────────────────────────
        const thirdDownPlays  = offPlays.filter(p => p.down === 3);
        const fourthDownPlays = offPlays.filter(isFourthDownAttempt);
        const thirdDownConversions  = thirdDownPlays.filter(converted).length;
        const fourthDownConversions = fourthDownPlays.filter(converted).length;

        const opp3rdDownPlays  = defPlays.filter(p => p.down === 3);
        const opp4thDownPlays  = defPlays.filter(isFourthDownAttempt);
        const thirdDownStops   = opp3rdDownPlays.filter(p => !converted(p)).length;
        const fourthDownStops  = opp4thDownPlays.filter(p => !converted(p)).length;

        // ── Passing ────────────────────────────────────────────────────────
        const passAttempts         = offPlays.filter(p => p.play_type === 'pass').length;
        const passCompletions      = countPassCompletions(offPlays.filter(p => p.play_type === 'pass'));
        const completionPct        = passAttempts > 0 ? (passCompletions / passAttempts) * 100 : 0;
        const defPassAttempts      = defPlays.filter(p => p.play_type === 'pass').length;
        const defPassCompletions   = countPassCompletions(defPlays.filter(p => p.play_type === 'pass'));
        const completionPctAgainst = defPassAttempts > 0 ? (defPassCompletions / defPassAttempts) * 100 : 0;
        const passingTDs           = offPlays.filter(p => p.play_type === 'pass' && p.outcome === 'td').length;
        const rushingTDs           = offPlays.filter(p => p.play_type === 'rush' && p.outcome === 'td').length;
        const passingTDsAgainst    = defPlays.filter(p => p.play_type === 'pass' && p.outcome === 'td').length;
        const rushingTDsAgainst    = defPlays.filter(p => p.play_type === 'rush' && p.outcome === 'td').length;
        const interceptionsThrown  = offPlays.filter(p => isInterceptionOutcome(p.outcome)).length;
        const interceptions        = defPlays.filter(p => isInterceptionOutcome(p.outcome)).length;

        // ── TFLs (direction-aware, includes backward passes) ───────────────
        // TFL = any scrimmage play where the ball ended up behind the line of
        // scrimmage AND a defender participated.
        const offTFLIds = new Set(
          offPlays
            .filter(p => (p.play_type === 'rush' || (p.play_type === 'pass' && p.outcome === 'complete'))
              && yg(p) < 0)
            .map(p => p.play_id)
        );
        const defTFLIds = new Set(
          defPlays
            .filter(p => (p.play_type === 'rush' || (p.play_type === 'pass' && p.outcome === 'complete'))
              && yg(p) < 0)
            .map(p => p.play_id)
        );

        const tflsAllowed = [...offTFLIds].filter(pid =>
          (participants || []).some(p => p.play_id === pid && p.role === 'defender')
        ).length;
        const tflsForced = [...defTFLIds].filter(pid =>
          (participants || []).some(p => p.play_id === pid && p.role === 'defender')
        ).length;

        // ── Extra point conversions ────────────────────────────────────────
        // eslint-disable-next-line eqeqeq
        const convPlays     = (plays || []).filter(p => p.offense_team == tid && p.is_conversion);
        const conv1Attempts = countConversionAttempts(convPlays, participants, 1);
        const conv1Made     = countConversionMade(convPlays, participants, 1);
        const conv2Attempts = countConversionAttempts(convPlays, participants, 2);
        const conv2Made     = countConversionMade(convPlays, participants, 2);
        const conv3Attempts = countConversionAttempts(convPlays, participants, 3);
        const conv3Made     = countConversionMade(convPlays, participants, 3);
        const conv1Pct      = conv1Attempts > 0 ? ((conv1Made / conv1Attempts) * 100).toFixed(1) : 0;
        const conv2Pct      = conv2Attempts > 0 ? ((conv2Made / conv2Attempts) * 100).toFixed(1) : 0;
        const conv3Pct      = conv3Attempts > 0 ? ((conv3Made / conv3Attempts) * 100).toFixed(1) : 0;

        // ── Per-game arrays for charts ─────────────────────────────────────
        const pointsPerGame = teamGames.map(g => {
          // eslint-disable-next-line eqeqeq
          const gPlays = (plays || []).filter(p => p.game_id === g.game_id && p.offense_team == tid);
          return gPlays.reduce((sum, p) => {
            if (p.outcome === 'td') return sum + 6;
            if (p.is_conversion && p.outcome === 'complete') return sum + (p.conv_points || 0);
            return sum;
          }, 0);
        });
        const pointsAgainstPerGame = teamGames.map(g => {
          // eslint-disable-next-line eqeqeq
          const oppId  = g.home_team == tid ? g.away_team : g.home_team;
          // eslint-disable-next-line eqeqeq
          const gPlays = (plays || []).filter(p => p.game_id === g.game_id && p.offense_team == oppId);
          return gPlays.reduce((sum, p) => {
            if (p.outcome === 'td') return sum + 6;
            if (p.is_conversion && p.outcome === 'complete') return sum + (p.conv_points || 0);
            return sum;
          }, 0);
        });
        const yardsPerGame = teamGames.map(g => {
          // eslint-disable-next-line eqeqeq
          const gPlays = (plays || []).filter(p =>
            // eslint-disable-next-line eqeqeq
            p.game_id === g.game_id && p.offense_team == tid &&
            !p.is_conversion && p.play_type !== 'penalty' &&
            (p.play_type === 'rush' || isPassCompletionOutcome(p.outcome))
          );
          return gPlays.reduce((s, p) => s + yg(p), 0);
        });
        const yardsAgainstPerGame = teamGames.map(g => {
          // eslint-disable-next-line eqeqeq
          const oppId  = g.home_team == tid ? g.away_team : g.home_team;
          // eslint-disable-next-line eqeqeq
          const gPlays = (plays || []).filter(p =>
            // eslint-disable-next-line eqeqeq
            p.game_id === g.game_id && p.offense_team == oppId &&
            !p.is_conversion && p.play_type !== 'penalty' &&
            (p.play_type === 'rush' || isPassCompletionOutcome(p.outcome))
          );
          return gPlays.reduce((s, p) => s + yg(p), 0);
        });

        // ── Record ─────────────────────────────────────────────────────────
        const wins   = teamGames.filter((g, i) => pointsPerGame[i] > pointsAgainstPerGame[i]).length;
        const losses = teamGames.filter((g, i) => pointsPerGame[i] < pointsAgainstPerGame[i]).length;
        const ties   = teamGames.filter((g, i) => pointsPerGame[i] === pointsAgainstPerGame[i]).length;
        const winPct = gamesPlayed > 0 ? ((wins / gamesPlayed) * 100).toFixed(1) : 0;

        const thirdDownPct  = thirdDownPlays.length  > 0 ? (thirdDownConversions  / thirdDownPlays.length)  * 100 : 0;
        const fourthDownPct = fourthDownPlays.length > 0 ? (fourthDownConversions / fourthDownPlays.length) * 100 : 0;

        const { redZoneAttempts, redZoneScores, redZonePct } = computeRedZoneStats(
          tid,
          teamGames,
          plays,
          (gameId) => ghMap[gameId],
          (gameId) => harMap[gameId],
        );

        computed[tid] = {
          gamesPlayed, wins, losses, ties, winPct,
          ppg:  gamesPlayed > 0 ? (points        / gamesPlayed).toFixed(1) : 0,
          papg: gamesPlayed > 0 ? (pointsAgainst / gamesPlayed).toFixed(1) : 0,
          passYpg:         gamesPlayed > 0 ? (passYards        / gamesPlayed).toFixed(1) : 0,
          rushYpg:         gamesPlayed > 0 ? (rushYards        / gamesPlayed).toFixed(1) : 0,
          totalYpg:        gamesPlayed > 0 ? (totalYards       / gamesPlayed).toFixed(1) : 0,
          passYpgAgainst:  gamesPlayed > 0 ? (passYardsAgainst  / gamesPlayed).toFixed(1) : 0,
          rushYpgAgainst:  gamesPlayed > 0 ? (rushYardsAgainst  / gamesPlayed).toFixed(1) : 0,
          totalYpgAgainst: gamesPlayed > 0 ? (totalYardsAgainst / gamesPlayed).toFixed(1) : 0,
          yardsPerPlay:        yardsPerPlay.toFixed(1),
          yardsPerPlayAgainst: yardsPerPlayAgainst.toFixed(1),
          successFor:          successFor.toFixed(1),
          successAgainst:      successAgainst.toFixed(1),
          explosivePlays, explosivePlaysAgainst,
          completionPct:        completionPct.toFixed(1),
          completionPctAgainst: completionPctAgainst.toFixed(1),
          passingTDs, rushingTDs, passingTDsAgainst, rushingTDsAgainst,
          interceptions, interceptionsThrown,
          tflsAllowed, tflsForced,
          thirdDownAttempts: thirdDownPlays.length, thirdDownConversions,
          thirdDownPct: thirdDownPct.toFixed(1),
          fourthDownAttempts: fourthDownPlays.length, fourthDownConversions,
          fourthDownPct: fourthDownPct.toFixed(1),
          redZoneAttempts, redZoneScores,
          redZonePct: redZonePct.toFixed(1),
          opp3rdDownAttempts: opp3rdDownPlays.length, thirdDownStops,
          opp4thDownAttempts: opp4thDownPlays.length, fourthDownStops,
          conv1Attempts, conv1Made, conv1Pct,
          conv2Attempts, conv2Made, conv2Pct,
          conv3Attempts, conv3Made, conv3Pct,
          pointsPerGame, pointsAgainstPerGame,
          yardsPerGame, yardsAgainstPerGame,
        };
      }

      setAllStats(computed);
      setLoading(false);
    };

    fetchAll();
  }, [currentLeague]);

  const stats    = allStats[teamId];
  const numTeams = teams.length;

  const rank = (key, lowerIsBetter = false) => {
    const entries = Object.entries(allStats);
    if (entries.length === 0) return 1;
    const sorted = entries
      .map(([id, s]) => ({ id, val: parseFloat(s[key]) || 0 }))
      .sort((a, b) => lowerIsBetter ? a.val - b.val : b.val - a.val);
    // eslint-disable-next-line eqeqeq
    return sorted.findIndex(x => x.id == teamId) + 1;
  };

  const pointsChartData = useMemo(() => {
    if (!stats) return [];
    return stats.pointsPerGame.map((pf, i) => ({
      game: `G${i + 1}`,
      "Points For":     pf,
      "Points Against": stats.pointsAgainstPerGame[i] ?? 0,
    }));
  }, [stats]);

  const yardsChartData = useMemo(() => {
    if (!stats) return [];
    return stats.yardsPerGame.map((yf, i) => ({
      game: `G${i + 1}`,
      "Yards For":     yf,
      "Yards Against": stats.yardsAgainstPerGame[i] ?? 0,
    }));
  }, [stats]);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Team Statistics</h1>
          <p className="text-slate-400 mt-1">Season-wide stats, charts, and conversion data</p>
        </div>
        <div className="relative">
          <select value={teamId} onChange={e => setTeamId(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white appearance-none pr-10">
            <option value="">Select a team</option>
            {teams.map(t => <option key={t.team_id} value={t.team_id}>{t.name}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        </div>
      </div>

      {loading   && <p className="text-slate-400">Loading stats...</p>}
      {!teamId   && !loading && <p className="text-slate-400">Select a team to view stats.</p>}

      {stats && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <RecordCard label="WINS"   value={stats.wins}          color="text-green-400" />
            <RecordCard label="LOSSES" value={stats.losses}        color="text-red-400" />
            <RecordCard label="TIES"   value={stats.ties}          color="text-yellow-400" />
            <RecordCard label="WIN %"  value={`${stats.winPct}%`} color="text-blue-400" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <h2 className="text-white font-bold tracking-wide">OFFENSE</h2>
              </div>
              <StatRow label="Points per game"       value={stats.ppg}                 rank={rank('ppg')}               total={numTeams} />
              <StatRow label="Passing yards / game"  value={stats.passYpg}             rank={rank('passYpg')}           total={numTeams} />
              <StatRow label="Rushing yards / game"  value={stats.rushYpg}             rank={rank('rushYpg')}           total={numTeams} />
              <StatRow label="Total yards / game"    value={stats.totalYpg}            rank={rank('totalYpg')}          total={numTeams} />
              <StatRow label="Yards per play"        value={stats.yardsPerPlay}        rank={rank('yardsPerPlay')}      total={numTeams} />
              <StatRow label="Success rate"          value={`${stats.successFor}%`}    rank={rank('successFor')}        total={numTeams} isPercentage pctValue={stats.successFor} />
              <StatRow label="Explosive plays (20+)" value={stats.explosivePlays}      rank={rank('explosivePlays')}     total={numTeams} />
              <StatRow label="Completion %"          value={`${stats.completionPct}%`} rank={rank('completionPct')}     total={numTeams} isPercentage pctValue={stats.completionPct} />
              <StatRow label="Passing TDs"           value={stats.passingTDs}          rank={rank('passingTDs')}        total={numTeams} />
              <StatRow label="Rushing TDs"           value={stats.rushingTDs}          rank={rank('rushingTDs')}        total={numTeams} />
              <StatRow label="Interceptions thrown"  value={stats.interceptionsThrown} rank={rank('interceptionsThrown', true)} total={numTeams} lowerIsBetter />
              <StatRow label="TFLs allowed"          value={stats.tflsAllowed}         rank={rank('tflsAllowed', true)} total={numTeams} lowerIsBetter />
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-red-400" />
                <h2 className="text-white font-bold tracking-wide">DEFENSE</h2>
              </div>
              <StatRow label="Points against / game"      value={stats.papg}                   rank={rank('papg', true)}               total={numTeams} lowerIsBetter />
              <StatRow label="Pass yards against / game"  value={stats.passYpgAgainst}         rank={rank('passYpgAgainst', true)}     total={numTeams} lowerIsBetter />
              <StatRow label="Rush yards against / game"  value={stats.rushYpgAgainst}         rank={rank('rushYpgAgainst', true)}     total={numTeams} lowerIsBetter />
              <StatRow label="Total yards against / game" value={stats.totalYpgAgainst}        rank={rank('totalYpgAgainst', true)}    total={numTeams} lowerIsBetter />
              <StatRow label="Yards per play against"     value={stats.yardsPerPlayAgainst}    rank={rank('yardsPerPlayAgainst', true)} total={numTeams} lowerIsBetter />
              <StatRow label="Success rate against"    value={`${stats.successAgainst}%`}   rank={rank('successAgainst', true)}     total={numTeams} isPercentage pctValue={stats.successAgainst} lowerIsBetter />
              <StatRow label="Explosive plays allowed" value={stats.explosivePlaysAgainst} rank={rank('explosivePlaysAgainst', true)} total={numTeams} lowerIsBetter />
              <StatRow label="Completion % against"       value={`${stats.completionPctAgainst}%`} rank={rank('completionPctAgainst', true)} total={numTeams} isPercentage pctValue={stats.completionPctAgainst} lowerIsBetter />
              <StatRow label="Passing TDs against"       value={stats.passingTDsAgainst}      rank={rank('passingTDsAgainst', true)}  total={numTeams} lowerIsBetter />
              <StatRow label="Rushing TDs against"       value={stats.rushingTDsAgainst}      rank={rank('rushingTDsAgainst', true)}  total={numTeams} lowerIsBetter />
              <StatRow label="Interceptions"             value={stats.interceptions}          rank={rank('interceptions')}            total={numTeams} />
              <StatRow label="TFLs forced"               value={stats.tflsForced}             rank={rank('tflsForced')}               total={numTeams} />
              </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h2 className="text-white font-bold tracking-wide mb-4">Situational Conversions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <DownConversionCard label="3rd Down Conversion" attempts={stats.thirdDownAttempts}  conversions={stats.thirdDownConversions}  rank={stats.thirdDownAttempts  > 0 ? rank('thirdDownPct')  : null} total={numTeams} color="text-yellow-400" hint="A conversion is a 1st down gained or a score" />
              <DownConversionCard label="4th Down Conversion" attempts={stats.fourthDownAttempts} conversions={stats.fourthDownConversions} rank={stats.fourthDownAttempts > 0 ? rank('fourthDownPct') : null} total={numTeams} color="text-orange-400" hint="A conversion is a 1st down gained or a score" />
              <DownConversionCard label="Red Zone Success" attempts={stats.redZoneAttempts} conversions={stats.redZoneScores} rank={stats.redZoneAttempts > 0 ? rank('redZonePct') : null} total={numTeams} color="text-red-400" hint="Trips inside the opponent's 20 that result in a touchdown" />
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw className="w-5 h-5 text-green-400" />
              <h2 className="text-white font-bold tracking-wide">CONVERSIONS</h2>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <ConversionBar label="1-POINT" attempts={stats.conv1Attempts} completions={stats.conv1Made} rank={rank('conv1Pct')} total={numTeams} />
              <ConversionBar label="2-POINT" attempts={stats.conv2Attempts} completions={stats.conv2Made} rank={rank('conv2Pct')} total={numTeams} />
              <ConversionBar label="3-POINT" attempts={stats.conv3Attempts} completions={stats.conv3Made} rank={rank('conv3Pct')} total={numTeams} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="text-white font-bold mb-4">POINTS PER GAME</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={pointsChartData}>
                  <XAxis dataKey="game" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" tick={{ fill: "white" }} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "none" }} />
                  <Legend wrapperStyle={{ color: "white" }} />
                  <Line type="monotone" dataKey="Points For"     stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Points Against" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="text-white font-bold mb-4">YARDS PER GAME</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={yardsChartData}>
                  <XAxis dataKey="game" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" tick={{ fill: "white" }} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "none" }} />
                  <Legend wrapperStyle={{ color: "white" }} />
                  <Line type="monotone" dataKey="Yards For"     stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Yards Against" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}