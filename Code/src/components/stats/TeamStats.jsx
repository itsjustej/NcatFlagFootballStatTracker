import React, { useState, useEffect } from "react";
import { ChevronDown, TrendingUp, Shield, RefreshCw } from "lucide-react";
import { useLeague } from "../../context/LeagueContext";
import { loadLeagueSeason } from "../../utils/leagueSeason";
import {
  computeLeagueStandings,
  computePowerRankings,
  computeOffenseRankings,
  computeDefenseRankings,
} from "../../utils/standingsHelpers";

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
  pointsForTeam,
} from "../../utils/statsHelpers";

// Best → solid green, then light green, yellow, light red, solid red.
const RANK_STOPS = [
  { t: 0, rgb: [185, 28, 28] },
  { t: 0.16, rgb: [239, 68, 68] },
  { t: 0.32, rgb: [249, 115, 22] },
  { t: 0.5, rgb: [234, 179, 8] },
  { t: 0.66, rgb: [132, 204, 22] },
  { t: 0.82, rgb: [74, 222, 128] },
  { t: 1, rgb: [21, 128, 61] },
];

function rankTone(rank, total) {
  if (rank == null || total <= 0) return '#64748b';
  const quality = total <= 1 ? 1 : Math.min(1, Math.max(0, (total - rank) / (total - 1)));
  let i = 0;
  while (i < RANK_STOPS.length - 2 && quality > RANK_STOPS[i + 1].t) i += 1;
  const left = RANK_STOPS[i];
  const right = RANK_STOPS[i + 1];
  const span = right.t - left.t || 1;
  const local = (quality - left.t) / span;
  const rgb = left.rgb.map((channel, idx) => Math.round(channel + (right.rgb[idx] - channel) * local));
  return `rgb(${rgb.join(', ')})`;
}

// ---------------- STAT ROW ---------------- //
function StatRow({ label, short, value, rank, total, isPercentage, pctValue }) {
  const barWidth = isPercentage
    ? parseFloat(pctValue) || 0
    : total > 0 && rank > 0
      ? ((total - rank + 1) / total) * 100
      : 0;
  const tone = rankTone(rank, total);
  return (
    <div className="py-1.5 sm:py-3 border-b border-slate-700/50 last:border-0">
      <div className="flex items-baseline justify-between gap-1.5 sm:gap-3 mb-1">
        <span className="text-slate-300 text-[11px] sm:text-sm min-w-0 leading-tight">
          <span className="sm:hidden">{short || label}</span>
          <span className="hidden sm:inline">{label}</span>
        </span>
        <span className="flex items-baseline gap-1 sm:gap-2 shrink-0">
          <span className="text-white font-bold text-[11px] sm:text-sm tabular-nums">{value}</span>
          {rank != null && (
            <span className="text-[10px] sm:text-[11px] font-bold tabular-nums" style={{ color: tone }}>#{rank}</span>
          )}
        </span>
      </div>
      <div className="bg-slate-700 rounded-full h-1 sm:h-1.5">
        <div className="h-1 sm:h-1.5 rounded-full" style={{ width: `${Math.min(barWidth, 100)}%`, background: tone }} />
      </div>
    </div>
  );
}

// ---------------- CONVERSION BAR ---------------- //
function ConversionBar({ label, attempts, completions, rank, total }) {
  const pct = attempts > 0 ? ((completions / attempts) * 100).toFixed(1) : 0;
  const tone = rankTone(rank, total);
  return (
    <div className="bg-slate-900/50 border border-slate-700/80 rounded-lg p-2 sm:p-4">
      <div className="flex items-center justify-between gap-1 mb-1 sm:mb-2">
        <span className="text-slate-400 text-[10px] sm:text-xs">{label}</span>
        {rank != null && (
          <span className="text-[10px] sm:text-xs font-bold" style={{ color: tone }}>#{rank}</span>
        )}
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <span className="text-white font-bold text-sm sm:text-lg shrink-0 tabular-nums">{pct}%</span>
        <div className="flex-1 bg-slate-700 rounded-full h-1.5 sm:h-2">
          <div className="h-1.5 sm:h-2 rounded-full" style={{ width: `${pct}%`, background: tone }} />
        </div>
        <span className="text-slate-400 text-[10px] sm:text-xs text-right shrink-0">{completions}/{attempts}</span>
      </div>
    </div>
  );
}

// ---------------- RECORD CARD ---------------- //
function ordinal(rank) {
  const mod100 = rank % 100;
  const suffix = mod100 >= 11 && mod100 <= 13
    ? "th"
    : { 1: "st", 2: "nd", 3: "rd" }[rank % 10] || "th";
  return `${rank}${suffix}`;
}

function placeColor(rank) {
  if (rank === 1) return "text-yellow-400";
  if (rank === 2) return "text-slate-300";
  if (rank === 3) return "text-amber-600";
  return "text-white";
}

function RecordCard({ label, value, color }) {
  return (
    <div className="bg-slate-900/50 border border-slate-700/80 rounded-lg p-2 sm:p-4 text-center">
      <p className={`text-base sm:text-4xl font-bold leading-none ${color}`}>{value}</p>
      <p className="text-slate-400 text-[10px] sm:text-sm mt-0.5 sm:mt-1">{label}</p>
    </div>
  );
}

// ---------------- DOWN CONVERSION CARD ---------------- //
function DownConversionCard({ label, short, attempts, conversions, rank, total, hint }) {
  const pct = attempts > 0 ? ((conversions / attempts) * 100).toFixed(1) : '—';
  const barWidth = attempts > 0 ? (conversions / attempts) * 100 : 0;
  const tone = rankTone(rank, total);
  return (
    <div className="bg-slate-900/50 border border-slate-700/80 rounded-lg p-2 sm:p-5">
      <div className="flex items-start justify-between gap-1 mb-1 sm:mb-3">
        <span className="text-[11px] sm:text-sm font-bold text-white leading-tight">
          <span className="sm:hidden">{short || label}</span>
          <span className="hidden sm:inline">{label}</span>
        </span>
        {rank != null && (
          <span className="text-[10px] sm:text-xs font-bold shrink-0" style={{ color: tone }}>#{rank}</span>
        )}
      </div>
      <div className="flex items-end gap-1.5 sm:gap-3 mb-1.5 sm:mb-3">
        <span className="text-white font-black text-lg sm:text-3xl tabular-nums">
          {pct}{attempts > 0 ? '%' : ''}
        </span>
        <span className="text-slate-400 text-[10px] sm:text-sm mb-0.5">{conversions}/{attempts}</span>
      </div>
      <div className="bg-slate-700 rounded-full h-1.5 sm:h-2">
        <div className="h-1.5 sm:h-2 rounded-full transition-all" style={{ width: `${barWidth}%`, background: tone }} />
      </div>
      {hint && <p className="hidden sm:block text-slate-500 text-xs mt-2">{hint}</p>}
    </div>
  );
}

// ---------------- MAIN ---------------- //
export default function TeamStats() {
  const { currentLeague } = useLeague();
  const [teams, setTeams]       = useState([]);
  const [teamId, setTeamId]     = useState("");
  const [allStats, setAllStats] = useState({});
  const [rankBoards, setRankBoards] = useState({ standings: [], power: [], offense: [], defense: [] });
  const [loading, setLoading]   = useState(false);

  // We need homeTeamId per game to compute direction-aware yards.
  // Build a map: game_id → home_team_id from the games array.
  const [gameHomeMap, setGameHomeMap] = useState({});

  useEffect(() => {
    if (!currentLeague) return;
    setTeamId("");
    setAllStats({});
    setRankBoards({ standings: [], power: [], offense: [], defense: [] });

    const fetchAll = async () => {
      setLoading(true);
      let season;
      try {
        season = await loadLeagueSeason(currentLeague.league_id);
      } catch (err) {
        console.error(err);
        setLoading(false);
        return;
      }
      const { teams: teamsData, games, plays, participants } = season;
      setTeams(teamsData);

      // Build game→home map for direction-aware calculations
      const ghMap = {};
      const harMap = {};
      const fortyMap = {};
      for (const g of (games || [])) {
        ghMap[g.game_id] = g.home_team;
        harMap[g.game_id] = g.home_attacks_right ?? true;
        fortyMap[g.game_id] = g.has_forty_yard !== false;
      }
      setGameHomeMap(ghMap);

      const computed = {};

      for (const team of teamsData) {
        const tid = team.team_id;
        // eslint-disable-next-line eqeqeq
        const teamGames   = (games || []).filter(g => g.home_team == tid || g.away_team == tid);
        const playedGames = teamGames.filter((g) => !g.forfeit);
        const gamesPlayed = playedGames.length;

        // eslint-disable-next-line eqeqeq
        const offPlays = (plays || []).filter(p => p.offense_team == tid && !p.is_conversion && p.play_type !== 'penalty');
        // eslint-disable-next-line eqeqeq
        const defPlays = (plays || []).filter(p => p.defense_team == tid && !p.is_conversion && p.play_type !== 'penalty');

        // ── Scoring ────────────────────────────────────────────────────────
        const points = pointsForTeam(plays, tid);
        const pointsAgainst = playedGames.reduce((sum, g) => {
          // eslint-disable-next-line eqeqeq
          const oppId = g.home_team == tid ? g.away_team : g.home_team;
          const gPlays = (plays || []).filter((p) => p.game_id === g.game_id);
          return sum + pointsForTeam(gPlays, oppId);
        }, 0);

        // ── Yards (direction-aware) ────────────────────────────────────────
        // For each play we look up which team was home in that game.
        const yg = (p) => yardsGainedForPlay(p, ghMap[p.game_id], harMap[p.game_id], fortyMap[p.game_id]);
        const converted = (p) => isConverted(p, ghMap[p.game_id], harMap[p.game_id], fortyMap[p.game_id]);

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
          (p) => fortyMap[p.game_id],
        );

        const oppOffPlays = opponentOffPlaysForTeam(tid, playedGames, plays);
        const successAgainst = computeOffenseSuccessRate(
          oppOffPlays,
          (p) => ghMap[p.game_id],
          (p) => harMap[p.game_id],
          (p) => fortyMap[p.game_id],
        );

        const explosivePlays = countExplosivePlays(offPlays, p => ghMap[p.game_id], p => harMap[p.game_id], p => fortyMap[p.game_id]);
        const explosivePlaysAgainst = countExplosivePlays(defPlays, p => ghMap[p.game_id], p => harMap[p.game_id], p => fortyMap[p.game_id]);

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

        // ── Record ─────────────────────────────────────────────────────────
        let wins = 0;
        let losses = 0;
        let ties = 0;
        for (const game of teamGames) {
          if (game.forfeit) {
            // eslint-disable-next-line eqeqeq
            if (game.home_team == tid) wins += 1;
            else losses += 1;
            continue;
          }
          const gamePlays = (plays || []).filter((p) => p.game_id === game.game_id);
          const pf = pointsForTeam(gamePlays, tid);
          // eslint-disable-next-line eqeqeq
          const oppId = game.home_team == tid ? game.away_team : game.home_team;
          const pa = pointsForTeam(gamePlays, oppId);
          if (pf > pa) wins += 1;
          else if (pf < pa) losses += 1;
          else ties += 1;
        }
        const decisions = wins + losses + ties;
        const winPct = decisions > 0 ? ((wins / decisions) * 100).toFixed(1) : 0;

        const thirdDownPct  = thirdDownPlays.length  > 0 ? (thirdDownConversions  / thirdDownPlays.length)  * 100 : 0;
        const fourthDownPct = fourthDownPlays.length > 0 ? (fourthDownConversions / fourthDownPlays.length) * 100 : 0;
        const rate = (n) => (gamesPlayed > 0 ? (n / gamesPlayed).toFixed(1) : 0);

        const playedGameIds = new Set(playedGames.map((g) => g.game_id));
        const teamPenalties = (plays || []).filter((p) =>
          // eslint-disable-next-line eqeqeq
          p.play_type === 'penalty' && p.penalty_team_id == tid && playedGameIds.has(p.game_id)
        );
        const penaltyYardsFor = (list) => list.reduce((sum, p) => {
          const gained = yg(p);
          // eslint-disable-next-line eqeqeq
          const charged = p.penalty_team_id == p.offense_team ? -gained : gained;
          return sum + Math.max(0, charged);
        }, 0);
        // eslint-disable-next-line eqeqeq
        const offensivePenalties = teamPenalties.filter((p) => p.penalty_team_id == p.offense_team);
        // eslint-disable-next-line eqeqeq
        const defensivePenalties = teamPenalties.filter((p) => p.penalty_team_id == p.defense_team);

        const { redZoneAttempts, redZoneScores, redZonePct } = computeRedZoneStats(
          tid,
          playedGames,
          plays,
          (gameId) => ghMap[gameId],
          (gameId) => harMap[gameId],
          (gameId) => fortyMap[gameId],
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
          playsPerGame: gamesPlayed > 0 ? (scrimmageOffPlays.length / gamesPlayed).toFixed(1) : 0,
          playsPerGameAgainst: gamesPlayed > 0 ? (scrimmageDefPlays.length / gamesPlayed).toFixed(1) : 0,
          yardsPerPlay:        yardsPerPlay.toFixed(1),
          yardsPerPlayAgainst: yardsPerPlayAgainst.toFixed(1),
          successFor:          successFor.toFixed(1),
          successAgainst:      successAgainst.toFixed(1),
          explosivePlays: rate(explosivePlays),
          explosivePlaysAgainst: rate(explosivePlaysAgainst),
          completionPct:        completionPct.toFixed(1),
          completionPctAgainst: completionPctAgainst.toFixed(1),
          passingTDs: rate(passingTDs),
          rushingTDs: rate(rushingTDs),
          passingTDsAgainst: rate(passingTDsAgainst),
          rushingTDsAgainst: rate(rushingTDsAgainst),
          interceptions: rate(interceptions),
          interceptionsThrown: rate(interceptionsThrown),
          tflsAllowed: rate(tflsAllowed),
          tflsForced: rate(tflsForced),
          offPenaltiesPerGame: rate(offensivePenalties.length),
          offPenaltyYardsPerGame: rate(penaltyYardsFor(offensivePenalties)),
          defPenaltiesPerGame: rate(defensivePenalties.length),
          defPenaltyYardsPerGame: rate(penaltyYardsFor(defensivePenalties)),
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
        };
      }

      setAllStats(computed);
      setRankBoards({
        standings: computeLeagueStandings(teamsData, games, plays),
        power: computePowerRankings(teamsData, games, plays),
        offense: computeOffenseRankings(teamsData, games, plays),
        defense: computeDefenseRankings(teamsData, games, plays),
      });
      setLoading(false);
    };

    fetchAll();
  }, [currentLeague]);

  const stats = allStats[teamId];
  const place = (rows) => {
    // eslint-disable-next-line eqeqeq
    const row = rows.find((team) => team.team_id == teamId);
    if (!row) return { value: "—", color: "text-white" };
    return { value: ordinal(row.rank), color: placeColor(row.rank) };
  };
  const standingsPlace = place(rankBoards.standings);
  const powerPlace = place(rankBoards.power);
  const offensePlace = place(rankBoards.offense);
  const defensePlace = place(rankBoards.defense);
  const playedEntries = Object.entries(allStats).filter(([, s]) => s.gamesPlayed > 0);
  const rankedTotal = playedEntries.length;

  const rank = (key, lowerIsBetter = false) => {
    if (!stats || stats.gamesPlayed <= 0 || playedEntries.length === 0) return null;
    // eslint-disable-next-line eqeqeq
    const mine = playedEntries.find(([id]) => id == teamId);
    if (!mine) return null;
    const mineVal = parseFloat(mine[1][key]) || 0;
    const better = playedEntries.filter(([, s]) => {
      const val = parseFloat(s[key]) || 0;
      return lowerIsBetter ? val < mineVal : val > mineVal;
    }).length;
    return better + 1;
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-4 border-b border-slate-700">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white shrink-0">Team Statistics</h2>
            <p className="hidden sm:block text-slate-400 text-sm mt-0.5">Per-game stats and conversion rates</p>
          </div>
          <div className="relative w-full sm:w-auto sm:min-w-[220px] shrink-0">
            <select
              value={teamId}
              onChange={e => setTeamId(e.target.value)}
              className="w-full px-4 py-2.5 pr-10 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="">Select a team</option>
              {teams.map(t => <option key={t.team_id} value={t.team_id}>{t.name}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          </div>
        </div>

        {loading && (
          <p className="px-4 py-8 text-slate-400 text-center animate-pulse">Loading stats...</p>
        )}
        {!teamId && !loading && (
          <p className="px-4 py-8 text-slate-400 text-center">Select a team to view stats.</p>
        )}

        {stats && (
          <div className="p-3 sm:p-4 space-y-3 sm:space-y-6">
          <div className="grid grid-cols-4 gap-2 sm:gap-4">
            <RecordCard label="WINS"   value={stats.wins}          color="text-green-400" />
            <RecordCard label="LOSSES" value={stats.losses}        color="text-red-400" />
            <RecordCard label="TIES"   value={stats.ties}          color="text-yellow-400" />
            <RecordCard label="WIN %"  value={`${stats.winPct}%`} color="text-white" />
          </div>

          <div className="grid grid-cols-4 gap-2 sm:gap-4">
            <RecordCard label="STANDINGS" value={standingsPlace.value} color={standingsPlace.color} />
            <RecordCard label="POWER" value={powerPlace.value} color={powerPlace.color} />
            <RecordCard label="OFFENSE" value={offensePlace.value} color={offensePlace.color} />
            <RecordCard label="DEFENSE" value={defensePlace.value} color={defensePlace.color} />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-6">
            <div className="bg-slate-900/50 border border-slate-700/80 rounded-lg p-2 sm:p-6">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-4">
                <TrendingUp className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-blue-400" />
                <h3 className="text-white text-xs sm:text-base font-bold tracking-wide">OFFENSE</h3>
              </div>
              <StatRow label="Points per game" short="PPG" value={stats.ppg} rank={rank('ppg')} total={rankedTotal} />
              <StatRow label="Passing yards / game" short="Pass" value={stats.passYpg} rank={rank('passYpg')} total={rankedTotal} />
              <StatRow label="Rushing yards / game" short="Rush" value={stats.rushYpg} rank={rank('rushYpg')} total={rankedTotal} />
              <StatRow label="Total yards / game" short="Yds" value={stats.totalYpg} rank={rank('totalYpg')} total={rankedTotal} />
              <StatRow label="Plays per game" short="Plays" value={stats.playsPerGame} rank={rank('playsPerGame')} total={rankedTotal} />
              <StatRow label="Yards per play" short="YPP" value={stats.yardsPerPlay} rank={rank('yardsPerPlay')} total={rankedTotal} />
              <StatRow label="Success rate" short="Succ" value={`${stats.successFor}%`} rank={rank('successFor')} total={rankedTotal} isPercentage pctValue={stats.successFor} />
              <StatRow label="Explosive plays / game" short="Expl" value={stats.explosivePlays} rank={rank('explosivePlays')} total={rankedTotal} />
              <StatRow label="Completion %" short="Cmp%" value={`${stats.completionPct}%`} rank={rank('completionPct')} total={rankedTotal} isPercentage pctValue={stats.completionPct} />
              <StatRow label="Passing TDs / game" short="P-TD" value={stats.passingTDs} rank={rank('passingTDs')} total={rankedTotal} />
              <StatRow label="Rushing TDs / game" short="R-TD" value={stats.rushingTDs} rank={rank('rushingTDs')} total={rankedTotal} />
              <StatRow label="Interceptions thrown / game" short="INT" value={stats.interceptionsThrown} rank={rank('interceptionsThrown', true)} total={rankedTotal} />
              <StatRow label="TFLs allowed / game" short="TFL" value={stats.tflsAllowed} rank={rank('tflsAllowed', true)} total={rankedTotal} />
              <StatRow label="Penalties per game" short="Pen/G" value={stats.offPenaltiesPerGame} rank={rank('offPenaltiesPerGame', true)} total={rankedTotal} />
              <StatRow label="Penalty yards per game" short="Pen Yds" value={stats.offPenaltyYardsPerGame} rank={rank('offPenaltyYardsPerGame', true)} total={rankedTotal} />
            </div>

            <div className="bg-slate-900/50 border border-slate-700/80 rounded-lg p-2 sm:p-6">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-4">
                <Shield className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-red-400" />
                <h3 className="text-white text-xs sm:text-base font-bold tracking-wide">DEFENSE</h3>
              </div>
              <StatRow label="Points against / game" short="PPG" value={stats.papg} rank={rank('papg', true)} total={rankedTotal} />
              <StatRow label="Pass yards against / game" short="Pass" value={stats.passYpgAgainst} rank={rank('passYpgAgainst', true)} total={rankedTotal} />
              <StatRow label="Rush yards against / game" short="Rush" value={stats.rushYpgAgainst} rank={rank('rushYpgAgainst', true)} total={rankedTotal} />
              <StatRow label="Total yards against / game" short="Yds" value={stats.totalYpgAgainst} rank={rank('totalYpgAgainst', true)} total={rankedTotal} />
              <StatRow label="Plays per game against" short="Plays" value={stats.playsPerGameAgainst} rank={rank('playsPerGameAgainst', true)} total={rankedTotal} />
              <StatRow label="Yards per play against" short="YPP" value={stats.yardsPerPlayAgainst} rank={rank('yardsPerPlayAgainst', true)} total={rankedTotal} />
              <StatRow label="Success rate against" short="Succ" value={`${stats.successAgainst}%`} rank={rank('successAgainst', true)} total={rankedTotal} isPercentage pctValue={stats.successAgainst} />
              <StatRow label="Explosive plays allowed / game" short="Expl" value={stats.explosivePlaysAgainst} rank={rank('explosivePlaysAgainst', true)} total={rankedTotal} />
              <StatRow label="Completion % against" short="Cmp%" value={`${stats.completionPctAgainst}%`} rank={rank('completionPctAgainst', true)} total={rankedTotal} isPercentage pctValue={stats.completionPctAgainst} />
              <StatRow label="Passing TDs against / game" short="P-TD" value={stats.passingTDsAgainst} rank={rank('passingTDsAgainst', true)} total={rankedTotal} />
              <StatRow label="Rushing TDs against / game" short="R-TD" value={stats.rushingTDsAgainst} rank={rank('rushingTDsAgainst', true)} total={rankedTotal} />
              <StatRow label="Interceptions / game" short="INT" value={stats.interceptions} rank={rank('interceptions')} total={rankedTotal} />
              <StatRow label="TFLs forced / game" short="TFL" value={stats.tflsForced} rank={rank('tflsForced')} total={rankedTotal} />
              <StatRow label="Penalties per game" short="Pen/G" value={stats.defPenaltiesPerGame} rank={rank('defPenaltiesPerGame', true)} total={rankedTotal} />
              <StatRow label="Penalty yards per game" short="Pen Yds" value={stats.defPenaltyYardsPerGame} rank={rank('defPenaltyYardsPerGame', true)} total={rankedTotal} />
              </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-700/80 rounded-lg p-2 sm:p-6">
            <h3 className="text-white text-xs sm:text-base font-bold tracking-wide mb-2 sm:mb-4">
              <span className="sm:hidden">Situational</span>
              <span className="hidden sm:inline">Situational Conversions</span>
            </h3>
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <DownConversionCard label="3rd Down Conversion" short="3rd" attempts={stats.thirdDownAttempts}  conversions={stats.thirdDownConversions}  rank={stats.thirdDownAttempts  > 0 ? rank('thirdDownPct')  : null} total={rankedTotal} hint="A conversion is a 1st down gained or a score" />
              <DownConversionCard label="4th Down Conversion" short="4th" attempts={stats.fourthDownAttempts} conversions={stats.fourthDownConversions} rank={stats.fourthDownAttempts > 0 ? rank('fourthDownPct') : null} total={rankedTotal} hint="A conversion is a 1st down gained or a score" />
              <DownConversionCard label="Red Zone Success" short="Red Zone" attempts={stats.redZoneAttempts} conversions={stats.redZoneScores} rank={stats.redZoneAttempts > 0 ? rank('redZonePct') : null} total={rankedTotal} hint="Trips inside the opponent's 20 that result in a touchdown" />
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-700/80 rounded-lg p-2 sm:p-6">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-4">
              <RefreshCw className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-green-400" />
              <h3 className="text-white text-xs sm:text-base font-bold tracking-wide">CONVERSIONS</h3>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <ConversionBar label="1-POINT" attempts={stats.conv1Attempts} completions={stats.conv1Made} rank={rank('conv1Pct')} total={rankedTotal} />
              <ConversionBar label="2-POINT" attempts={stats.conv2Attempts} completions={stats.conv2Made} rank={rank('conv2Pct')} total={rankedTotal} />
              <ConversionBar label="3-POINT" attempts={stats.conv3Attempts} completions={stats.conv3Made} rank={rank('conv3Pct')} total={rankedTotal} />
            </div>
          </div>

          </div>
        )}
      </div>
    </div>
  );
}