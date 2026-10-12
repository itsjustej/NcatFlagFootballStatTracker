import React, { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
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

function Mark({ value, rank, total }) {
  const tone = rank != null ? rankTone(rank, total) : "#e2e8f0";
  return (
    <span className="inline-flex items-baseline gap-1.5 shrink-0">
      <span className="text-sm sm:text-base font-bold tabular-nums" style={{ color: tone }}>{value}</span>
      {rank != null && (
        <span className="text-[11px] font-bold tabular-nums" style={{ color: tone }}>#{rank}</span>
      )}
    </span>
  );
}

function CompareRow({ label, offense, defense, total }) {
  return (
    <div className="border-b border-slate-800/80 py-2.5 last:border-0">
      <p className="mb-1.5 text-sm text-slate-300 sm:hidden">{label}</p>
      <div className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_7.25rem_7.25rem] sm:gap-3">
        <p className="hidden text-sm text-slate-300 sm:block">{label}</p>
        <div className="flex min-h-11 items-center justify-between gap-2 rounded-md bg-blue-500/10 px-2.5 sm:min-h-0 sm:justify-end sm:bg-transparent sm:px-0">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-300 sm:hidden">Off</span>
          <Mark value={offense.value} rank={offense.rank} total={total} />
        </div>
        <div className="flex min-h-11 items-center justify-between gap-2 rounded-md bg-red-500/10 px-2.5 sm:min-h-0 sm:justify-end sm:bg-transparent sm:px-0">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-red-300 sm:hidden">Def</span>
          <Mark value={defense.value} rank={defense.rank} total={total} />
        </div>
      </div>
    </div>
  );
}

function RateLine({ label, made, attempts, rank, total }) {
  const hasTries = attempts > 0;
  const pct = hasTries ? `${((made / attempts) * 100).toFixed(1)}%` : "—";
  const tone = rank != null ? rankTone(rank, total) : "#e2e8f0";
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 border-b border-slate-800/80 py-2 last:border-0">
      <span className="text-sm text-slate-300">{label}</span>
      <span className="flex items-baseline gap-2.5 shrink-0">
        <span className="text-xs tabular-nums text-slate-500">{made}/{attempts}</span>
        <span className="text-base font-bold tabular-nums" style={{ color: tone }}>{pct}</span>
        {rank != null && (
          <span className="text-[11px] font-bold tabular-nums" style={{ color: tone }}>#{rank}</span>
        )}
      </span>
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

function PlaceChip({ label, value, color }) {
  return (
    <div className="min-w-0 text-center">
      <p className={`text-xl font-black leading-none tabular-nums sm:text-2xl ${color}`}>{value}</p>
      <p className="mt-1 truncate text-[10px] sm:text-xs text-slate-400">{label}</p>
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
              className="w-full min-h-11 px-4 py-2.5 pr-10 bg-slate-900 border border-slate-600 rounded-lg text-white text-base sm:text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/40"
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
          <div className="grid grid-cols-1 gap-8 p-3 sm:p-5 lg:grid-cols-2 lg:gap-x-12 lg:gap-y-8">
            <div className="lg:col-start-2">
              <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
                <div className="min-w-0 shrink-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Record</p>
                  <p className="mt-1 text-4xl font-black leading-none tracking-tight text-white tabular-nums">
                    {stats.wins}
                    <span className="text-slate-600">–</span>
                    {stats.losses}
                    {Number(stats.ties) > 0 && (
                      <>
                        <span className="text-slate-600">–</span>
                        {stats.ties}
                      </>
                    )}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">{stats.winPct}% wins</p>
                </div>
                <div className="grid min-w-[16rem] flex-1 grid-cols-4 gap-2">
                  <PlaceChip label="Standings" value={standingsPlace.value} color={standingsPlace.color} />
                  <PlaceChip label="Power" value={powerPlace.value} color={powerPlace.color} />
                  <PlaceChip label="Offense" value={offensePlace.value} color={offensePlace.color} />
                  <PlaceChip label="Defense" value={defensePlace.value} color={defensePlace.color} />
                </div>
              </div>
            </div>

            <div className="lg:col-start-1 lg:row-span-3 lg:row-start-1 lg:grid lg:h-full lg:grid-rows-[auto_1fr]">
              <div>
                <div className="mb-1 hidden grid-cols-[minmax(0,1fr)_7.25rem_7.25rem] gap-3 sm:grid">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Per game</p>
                  <p className="text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-300">Offense</p>
                  <p className="text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-red-300">Defense</p>
                </div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:hidden">Per game</p>
              </div>
              <div className="lg:flex lg:flex-col lg:justify-between">
                <CompareRow label="Points" offense={{ value: stats.ppg, rank: rank("ppg") }} defense={{ value: stats.papg, rank: rank("papg", true) }} total={rankedTotal} />
                <CompareRow label="Pass yards" offense={{ value: stats.passYpg, rank: rank("passYpg") }} defense={{ value: stats.passYpgAgainst, rank: rank("passYpgAgainst", true) }} total={rankedTotal} />
                <CompareRow label="Rush yards" offense={{ value: stats.rushYpg, rank: rank("rushYpg") }} defense={{ value: stats.rushYpgAgainst, rank: rank("rushYpgAgainst", true) }} total={rankedTotal} />
                <CompareRow label="Total yards" offense={{ value: stats.totalYpg, rank: rank("totalYpg") }} defense={{ value: stats.totalYpgAgainst, rank: rank("totalYpgAgainst", true) }} total={rankedTotal} />
                <CompareRow label="Plays" offense={{ value: stats.playsPerGame, rank: rank("playsPerGame") }} defense={{ value: stats.playsPerGameAgainst, rank: rank("playsPerGameAgainst", true) }} total={rankedTotal} />
                <CompareRow label="Explosive plays" offense={{ value: stats.explosivePlays, rank: rank("explosivePlays") }} defense={{ value: stats.explosivePlaysAgainst, rank: rank("explosivePlaysAgainst", true) }} total={rankedTotal} />
                <CompareRow label="Pass TDs" offense={{ value: stats.passingTDs, rank: rank("passingTDs") }} defense={{ value: stats.passingTDsAgainst, rank: rank("passingTDsAgainst", true) }} total={rankedTotal} />
                <CompareRow label="Rush TDs" offense={{ value: stats.rushingTDs, rank: rank("rushingTDs") }} defense={{ value: stats.rushingTDsAgainst, rank: rank("rushingTDsAgainst", true) }} total={rankedTotal} />
                <CompareRow label="Interceptions" offense={{ value: stats.interceptionsThrown, rank: rank("interceptionsThrown", true) }} defense={{ value: stats.interceptions, rank: rank("interceptions") }} total={rankedTotal} />
                <CompareRow label="TFLs" offense={{ value: stats.tflsAllowed, rank: rank("tflsAllowed", true) }} defense={{ value: stats.tflsForced, rank: rank("tflsForced") }} total={rankedTotal} />
                <CompareRow label="Penalties" offense={{ value: stats.offPenaltiesPerGame, rank: rank("offPenaltiesPerGame", true) }} defense={{ value: stats.defPenaltiesPerGame, rank: rank("defPenaltiesPerGame", true) }} total={rankedTotal} />
                <CompareRow label="Penalty yards" offense={{ value: stats.offPenaltyYardsPerGame, rank: rank("offPenaltyYardsPerGame", true) }} defense={{ value: stats.defPenaltyYardsPerGame, rank: rank("defPenaltyYardsPerGame", true) }} total={rankedTotal} />
              </div>
            </div>

            <div className="lg:col-start-2">
              <div className="mb-1 hidden grid-cols-[minmax(0,1fr)_7.25rem_7.25rem] gap-3 sm:grid">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Rates</p>
                <p className="text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-300">Offense</p>
                <p className="text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-red-300">Defense</p>
              </div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:hidden">Rates</p>
              <CompareRow label="Yards / play" offense={{ value: stats.yardsPerPlay, rank: rank("yardsPerPlay") }} defense={{ value: stats.yardsPerPlayAgainst, rank: rank("yardsPerPlayAgainst", true) }} total={rankedTotal} />
              <CompareRow label="Success" offense={{ value: `${stats.successFor}%`, rank: rank("successFor") }} defense={{ value: `${stats.successAgainst}%`, rank: rank("successAgainst", true) }} total={rankedTotal} />
              <CompareRow label="Completion" offense={{ value: `${stats.completionPct}%`, rank: rank("completionPct") }} defense={{ value: `${stats.completionPctAgainst}%`, rank: rank("completionPctAgainst", true) }} total={rankedTotal} />
            </div>

            <div className="lg:col-start-2">
              <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Situational</h3>
              <RateLine label="3rd down" made={stats.thirdDownConversions} attempts={stats.thirdDownAttempts} rank={stats.thirdDownAttempts > 0 ? rank("thirdDownPct") : null} total={rankedTotal} />
              <RateLine label="4th down" made={stats.fourthDownConversions} attempts={stats.fourthDownAttempts} rank={stats.fourthDownAttempts > 0 ? rank("fourthDownPct") : null} total={rankedTotal} />
              <RateLine label="Red zone" made={stats.redZoneScores} attempts={stats.redZoneAttempts} rank={stats.redZoneAttempts > 0 ? rank("redZonePct") : null} total={rankedTotal} />
              <h3 className="mb-1 mt-8 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Extra points</h3>
              <RateLine label="1-point" made={stats.conv1Made} attempts={stats.conv1Attempts} rank={stats.conv1Attempts > 0 ? rank("conv1Pct") : null} total={rankedTotal} />
              <RateLine label="2-point" made={stats.conv2Made} attempts={stats.conv2Attempts} rank={stats.conv2Attempts > 0 ? rank("conv2Pct") : null} total={rankedTotal} />
              <RateLine label="3-point" made={stats.conv3Made} attempts={stats.conv3Attempts} rank={stats.conv3Attempts > 0 ? rank("conv3Pct") : null} total={rankedTotal} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}