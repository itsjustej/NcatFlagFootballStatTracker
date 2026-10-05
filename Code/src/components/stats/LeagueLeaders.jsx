import React, { useState, useEffect } from "react";
import { loadLeagueSeason } from "../../utils/leagueSeason";
import { useLeague } from "../../context/LeagueContext";
import { isUnknownPlayer } from "../../utils/playerName";

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
  pointsForTeam,
} from "../../utils/statsHelpers";

const fmt = (val, digits = 1) =>
  typeof val === "number" && !isNaN(val) ? val.toFixed(digits) : "0.0";

const NAME_SUFFIXES = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"]);

function shortPlayerName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] || "";
  let lastIndex = parts.length - 1;
  if (NAME_SUFFIXES.has(parts[lastIndex].toLowerCase())) lastIndex -= 1;
  if (lastIndex < 1) return parts[0];
  return `${parts[0]} ${parts[lastIndex][0].toUpperCase()}.`;
}

const RANK_STYLES = {
  1: "bg-yellow-400 text-yellow-950",
  2: "bg-slate-300 text-slate-800",
  3: "bg-amber-700 text-amber-50",
};

function RankBadge({ rank, className = "w-8 h-8 text-sm" }) {
  const medal = RANK_STYLES[rank] || "bg-slate-600 text-slate-200";
  return (
    <div className={`flex rounded-full items-center justify-center font-black tabular-nums shrink-0 ${medal} ${className}`}>
      {rank}
    </div>
  );
}

function PlayerName({ name }) {
  return (
    <p className="text-slate-100 text-sm font-semibold truncate">
      {shortPlayerName(name)}
    </p>
  );
}

function teamLabel(entry) {
  return entry.team_name || entry.team_abbr || "";
}

function statText(entry, stat) {
  return `${fmt(entry[stat.key], stat.digits ?? 0)}${stat.suffix || ""}`;
}

function MobilePlayerIdentity({ rank, name, team, trailing = null }) {
  return (
    <div className="flex items-center gap-3">
      <RankBadge rank={rank} />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-slate-50 leading-snug">{shortPlayerName(name)}</p>
        <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-slate-400 leading-snug">{team}</p>
      </div>
      {trailing}
    </div>
  );
}

function MobileStatStrip({ stats }) {
  return (
    <div className={`mt-2.5 ml-11 grid gap-1.5 ${stats.length > 1 ? "grid-cols-3" : "grid-cols-1"}`}>
      {stats.map((stat) => (
        <div key={stat.key} className="rounded-md bg-slate-800/90 px-2 py-1.5 text-center min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-none">{stat.label}</p>
          <p className="mt-1 text-sm font-bold text-white tabular-nums leading-none">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

// Multi-stat player leader card — primary stat sorts/filters, secondary stats shown in columns
function PlayerMultiStatCard({ title, players, sortKey, secondary = [] }) {
  const filtered = players.filter(p => p[sortKey] > 0);
  const sorted = [...filtered].sort((a, b) => b[sortKey] - a[sortKey]).slice(0, 10);

  return (
    <div className="bg-slate-900/50 border border-slate-700/80 rounded-lg overflow-hidden flex flex-col">
      <div className="lg:hidden px-3 py-3 border-b border-slate-700">
        <h3 className="text-sm font-bold text-white uppercase tracking-wide">{title}</h3>
      </div>
      <div className="hidden lg:flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-700">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide min-w-0 truncate">{title}</h3>
        <div className="flex items-center gap-3 text-xs font-bold text-slate-500 uppercase tracking-wide shrink-0">
          {secondary.map(s => (
            <span key={s.key} className={`text-right ${s.label.length > 3 ? "w-14" : "w-10"}`}>{s.short || s.label}</span>
          ))}
        </div>
      </div>
      <div className="overflow-y-auto max-h-[28rem] lg:max-h-[300px]">
        {sorted.map((p, i) => (
          <div key={p.player_id} className="border-b border-slate-700/50 last:border-b-0">
            <div className="lg:hidden px-3 py-3">
              <MobilePlayerIdentity rank={i + 1} name={p.name} team={teamLabel(p)} />
              <MobileStatStrip
                stats={secondary.map(s => ({
                  key: s.key,
                  label: s.label,
                  value: statText(p, s),
                }))}
              />
            </div>
            <div className="hidden lg:flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700/30">
              <RankBadge rank={i + 1} className="w-10 h-10 text-sm" />
              <div className="flex-1 min-w-0">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wide truncate">{p.team_abbr || p.team_name}</p>
                <PlayerName name={p.name} />
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {secondary.map(s => (
                  <span key={s.key} className={`text-right text-slate-300 text-sm tabular-nums ${s.label.length > 3 ? "w-14" : "w-10"}`}>
                    {statText(p, s)}
                  </span>
                ))}
              </div>
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
    <div className="bg-slate-900/50 border border-slate-700/80 rounded-lg overflow-hidden flex flex-col">
      <div className="lg:hidden px-3 py-3 border-b border-slate-700">
        <h3 className="text-sm font-bold text-white uppercase tracking-wide">{title}</h3>
      </div>
      <div className="hidden lg:flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-700">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide min-w-0 truncate">{title}</h3>
        <div className="flex items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-wide shrink-0">
          {secondary.map(s => (
            <span key={s.key} className="w-12 text-right">{s.short || s.label}</span>
          ))}
          <span className="w-14 text-right">{valueLabel}</span>
        </div>
      </div>
      <div className="overflow-y-auto max-h-[28rem] lg:max-h-[300px]">
        {sorted.map((p, i) => (
          <div key={p.player_id} className="border-b border-slate-700/50 last:border-b-0">
            <div className="lg:hidden px-3 py-3">
              <MobilePlayerIdentity
                rank={i + 1}
                name={p.name}
                team={teamLabel(p)}
                trailing={(
                  <div className="shrink-0 text-right pl-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-none">{valueLabel}</p>
                    <p className="mt-1 text-lg font-bold text-white tabular-nums leading-none">
                      {fmt(p[valueKey], digits)}{suffix}
                    </p>
                  </div>
                )}
              />
              {secondary.length > 0 && (
                <MobileStatStrip
                  stats={secondary.map(s => ({
                    key: s.key,
                    label: s.short || s.label,
                    value: statText(p, s),
                  }))}
                />
              )}
            </div>
            <div className="hidden lg:flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700/30">
              <RankBadge rank={i + 1} className="w-10 h-10 text-sm" />
              <div className="flex-1 min-w-0">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wide truncate">{p.team_abbr || p.team_name}</p>
                <PlayerName name={p.name} />
              </div>
              <div className="flex items-center gap-4 shrink-0">
                {secondary.map(s => (
                  <span key={s.key} className="w-12 text-right text-slate-300 text-sm tabular-nums">
                    {statText(p, s)}
                  </span>
                ))}
              </div>
              <span className="w-14 text-right text-white font-bold text-sm tabular-nums shrink-0">
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
    <div className="bg-slate-900/50 border border-slate-700/80 rounded-lg p-3 sm:p-5 flex flex-col">
      <h3 className="text-sm font-bold text-white mb-2.5 sm:mb-3 uppercase tracking-wide leading-snug">{title}</h3>
      <div className="space-y-2">
        {sorted.map((t, i) => (
          <div key={t.team_id} className="flex items-center gap-3 px-2.5 py-2 sm:p-2 rounded-lg bg-slate-700/40">
            <RankBadge rank={i + 1} />
            <p className="flex-1 min-w-0 text-slate-100 text-sm font-medium leading-snug">{t.name}</p>
            <span className="text-white font-bold text-sm shrink-0 text-right tabular-nums">
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
    <h3 className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-widest mb-2 sm:mb-4">{title}</h3>
  );
}

const VIEWS = [
  { key: "players", label: "Individual" },
  { key: "offense", label: "Offense" },
  { key: "defense", label: "Defense" },
];

function ViewToggle({ view, setView }) {
  return (
    <div className="flex gap-1 bg-slate-900 border border-slate-600 rounded-lg p-1 w-full sm:w-fit">
      {VIEWS.map(v => (
        <button
          key={v.key}
          onClick={() => setView(v.key)}
          className={`flex-1 sm:flex-none px-3 py-2 rounded-md text-xs sm:text-sm font-bold uppercase tracking-wide transition-colors ${
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

      let season;
      try {
        season = await loadLeagueSeason(currentLeague.league_id);
      } catch (err) {
        console.error(err);
        setLoading(false);
        return;
      }
      const { teams, players, games, plays, participants, roster } = season;
      const leagueGameIds = new Set((games || []).map((g) => g.game_id));
      const gamesWithJersey = new Map();
      for (const row of roster || []) {
        if (row.jersey == null || !leagueGameIds.has(row.game_id)) continue;
        const ids = gamesWithJersey.get(row.player_id) ?? new Set();
        ids.add(row.game_id);
        gamesWithJersey.set(row.player_id, ids);
      }

      // Build game→home map
      const ghMap = {};
      const harMap = {};
      const fortyMap = {};
      for (const g of (games || [])) {
        ghMap[g.game_id] = g.home_team;
        harMap[g.game_id] = g.home_attacks_right ?? true;
        fortyMap[g.game_id] = g.has_forty_yard !== false;
      }

      const yg = p => yardsGainedForPlay(p, ghMap[p.game_id], harMap[p.game_id], fortyMap[p.game_id]);

      // ── PLAYER STATS ──────────────────────────────────────────────────────
      const teamHasPlayed = (teamId) => (games || []).some(
        // eslint-disable-next-line eqeqeq
        (g) => !g.forfeit && (g.home_team == teamId || g.away_team == teamId),
      );

      const computedPlayers = (players || [])
        .filter((player) => !isUnknownPlayer(player) && teamHasPlayed(player.team_id))
        .map(player => {
        const pid  = player.player_id;
        const team = (teams || []).find(t => t.team_id === player.team_id);

        const byRole = role => (participants || []).filter(p => p.player_id === pid && p.role === role).map(p => p.play_id);
        const passerIds      = byRole('passer');
        const rusherIds      = byRole('rusher');
        const receiverIds    = byRole('receiver');
        const defenderIds    = byRole('defender');

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

        const gamesPlayed = gamesWithJersey.get(pid)?.size ?? 0;
        const perGame = (total) => (gamesPlayed > 0 ? total / gamesPlayed : 0);
        const round2 = (n) => Math.round(n * 100) / 100;
        const passingYpg = perGame(passingYards);
        const passingTdpg = perGame(passingTDs);
        const rushingYpg = perGame(rushingYards);
        const rushingTdpg = perGame(rushingTDs);
        const receivingYpg = perGame(receivingYards);
        const receivingTdpg = perGame(receivingTDs);
        const leaderScore = (ypg, tdpg, yardsWeight) => round2(ypg * yardsWeight + tdpg * 2.5);
        const passingFanPts = leaderScore(passingYpg, passingTdpg, 0.25);
        const rushingFanPts = leaderScore(rushingYpg, rushingTdpg, 0.1);
        const receivingFanPts = leaderScore(receivingYpg, receivingTdpg, 0.1);

        const interceptions    = countPlayerInterceptions(pid, participants, plays);
        const flagPulls        = defenderData.length;
        // TFL includes backward passes too
        const flagPullsForLoss = defenderData.filter(p =>
          (p.play_type === 'rush' || (p.play_type === 'pass' && p.outcome === 'complete'))
          && yg(p) < 0
        ).length;

        return {
          player_id: pid,
          name: String(player.name ?? '').trim(),
          team_name: team?.name || '',
          team_abbr: team?.abbreviation || team?.abbr || team?.name || '',
          completionPct, passingFanPts, rushingFanPts, receivingFanPts,
          passingYpg, passingTdpg,
          rushesPerGame: perGame(rushes),
          rushingYpg, rushingTdpg,
          receptionsPerGame: perGame(receptions),
          receivingYpg, receivingTdpg,
          interceptionsPerGame: perGame(interceptions),
          flagPullsPerGame: perGame(flagPulls),
          flagPullsForLossPerGame: perGame(flagPullsForLoss),
        };
      });

      setPlayerStats(computedPlayers);

      // ── TEAM STATS ────────────────────────────────────────────────────────
      const computedTeams = (teams || []).filter((team) => teamHasPlayed(team.team_id)).map(team => {
        const tid = team.team_id;
        // eslint-disable-next-line eqeqeq
        const teamGames  = (games || []).filter(g => !g.forfeit && (g.home_team == tid || g.away_team == tid));
        const gamesPlayed = teamGames.length;

        // eslint-disable-next-line eqeqeq
        const offPlays  = (plays || []).filter(p => p.offense_team == tid && !p.is_conversion && p.play_type !== 'penalty');
        // eslint-disable-next-line eqeqeq
        const defPlays  = (plays || []).filter(p => p.defense_team == tid && !p.is_conversion && p.play_type !== 'penalty');
        const points = pointsForTeam(plays, tid);
        const pointsAgainst = teamGames.reduce((sum, g) => {
          // eslint-disable-next-line eqeqeq
          const oppId = g.home_team == tid ? g.away_team : g.home_team;
          const gPlays = (plays || []).filter((p) => p.game_id === g.game_id);
          return sum + pointsForTeam(gPlays, oppId);
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
          (p) => fortyMap[p.game_id],
        );

        const oppOffPlays = opponentOffPlaysForTeam(tid, teamGames, plays);
        const successAgainst = computeOffenseSuccessRate(
          oppOffPlays,
          (p) => ghMap[p.game_id],
          (p) => harMap[p.game_id],
          (p) => fortyMap[p.game_id],
        );

        const explosivePlays = countExplosivePlays(offPlays, p => ghMap[p.game_id], p => harMap[p.game_id], p => fortyMap[p.game_id]);
        const explosivePlaysAgainst = countExplosivePlays(defPlays, p => ghMap[p.game_id], p => harMap[p.game_id], p => fortyMap[p.game_id]);

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
          const gp = (plays || []).filter(p => p.game_id === g.game_id);
          return pointsForTeam(gp, tid);
        });
        const pointsAgainstPerGame = teamGames.map(g => {
          // eslint-disable-next-line eqeqeq
          const oppId = g.home_team == tid ? g.away_team : g.home_team;
          const gp = (plays || []).filter(p => p.game_id === g.game_id);
          return pointsForTeam(gp, oppId);
        });

        const wins   = teamGames.filter((g, i) => pointsPerGame[i] > pointsAgainstPerGame[i]).length;
        const winPct = gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0;

        const { redZoneAttempts, redZoneScores, redZonePct } = computeRedZoneStats(
          tid,
          teamGames,
          plays,
          (gameId) => ghMap[gameId],
          (gameId) => harMap[gameId],
          (gameId) => fortyMap[gameId],
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
          explosivePlays: gamesPlayed > 0 ? explosivePlays / gamesPlayed : 0,
          explosivePlaysAgainst: gamesPlayed > 0 ? explosivePlaysAgainst / gamesPlayed : 0,
          interceptions: gamesPlayed > 0 ? interceptions / gamesPlayed : 0,
          tflsForced: gamesPlayed > 0 ? tflsForced / gamesPlayed : 0,
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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
          <div className="px-4 py-4 border-b border-slate-700">
            <h2 className="text-xl sm:text-2xl font-bold text-white">League Leaders</h2>
          </div>
          <p className="px-4 py-8 text-slate-400 text-center animate-pulse">Loading league leaders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-4 border-b border-slate-700">
          <h2 className="text-xl sm:text-2xl font-bold text-white shrink-0">League Leaders</h2>
          <ViewToggle view={view} setView={setView} />
        </div>

        <div className="p-2 sm:p-4 space-y-4 sm:space-y-8">
      {view === "players" && (
  <div>
    <SectionHeader title="Player Leaders" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      <PlayerMultiStatCard
        title="Passing"
        players={playerStats}
        sortKey="passingFanPts"
        secondary={[
          { key: 'completionPct', label: 'COMP%', short: 'CMP', digits: 0, suffix: '%' },
          { key: 'passingYpg', label: 'YDS/G', short: 'YPG', digits: 1 },
          { key: 'passingTdpg', label: 'TD/G', digits: 1 },
        ]}
      />
      <PlayerMultiStatCard
        title="Rushing"
        players={playerStats}
        sortKey="rushingFanPts"
        secondary={[
          { key: 'rushesPerGame', label: 'RUSH/G', short: 'RSH', digits: 1 },
          { key: 'rushingYpg', label: 'YDS/G', short: 'YPG', digits: 1 },
          { key: 'rushingTdpg', label: 'TD/G', digits: 1 },
        ]}
      />
      <PlayerMultiStatCard
        title="Receiving"
        players={playerStats}
        sortKey="receivingFanPts"
        secondary={[
          { key: 'receptionsPerGame', label: 'REC/G', short: 'REC', digits: 1 },
          { key: 'receivingYpg', label: 'YDS/G', short: 'YPG', digits: 1 },
          { key: 'receivingTdpg', label: 'TD/G', digits: 1 },
        ]}
      />
      <PlayerLeaderCard
        title="Flag Pulls"
        players={playerStats}
        valueKey="flagPullsPerGame"
        valueLabel="PER G"
        digits={1}
      />
      <PlayerLeaderCard
        title="Flag Pulls For Loss"
        players={playerStats}
        valueKey="flagPullsForLossPerGame"
        valueLabel="PER G"
        digits={1}
      />
      <PlayerLeaderCard
        title="Interceptions"
        players={playerStats}
        valueKey="interceptionsPerGame"
        valueLabel="PER G"
        digits={1}
      />
    </div>
  </div>
)}

      {view === "offense" && (
        <div>
          <SectionHeader title="Team Leaders — Offense" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-3 sm:mb-6">
            <TeamLeaderCard title="Points Per Game"     teams={teamStats} valueKey="ppg" />
            <TeamLeaderCard title="Passing Yards / Game"teams={teamStats} valueKey="passYpg" />
            <TeamLeaderCard title="Rushing Yards / Game"teams={teamStats} valueKey="rushYpg" />
            <TeamLeaderCard title="Total Yards / Game"  teams={teamStats} valueKey="totalYpg" />
            <TeamLeaderCard title="Yards Per Play"      teams={teamStats} valueKey="yardsPerPlay" />
            <TeamLeaderCard title="Completion %"        teams={teamStats} valueKey="completionPct"   suffix="%" />
            <TeamLeaderCard title="Success Rate"        teams={teamStats} valueKey="successFor"      suffix="%" />
            <TeamLeaderCard title="Explosive Plays / Game" teams={teamStats} valueKey="explosivePlays" />
          </div>

          <p className="text-slate-500 text-xs mb-4 uppercase tracking-wide">Conversions</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <TeamLeaderCard title="Points Against / Game"      teams={teamStats} valueKey="papg"                lowerIsBetter />
            <TeamLeaderCard title="Pass Yards Against / Game"  teams={teamStats} valueKey="passYpgAgainst"      lowerIsBetter />
            <TeamLeaderCard title="Rush Yards Against / Game"  teams={teamStats} valueKey="rushYpgAgainst"      lowerIsBetter />
            <TeamLeaderCard title="Total Yards Against / Game" teams={teamStats} valueKey="totalYpgAgainst"     lowerIsBetter />
            <TeamLeaderCard title="Yards Per Play Against"     teams={teamStats} valueKey="yardsPerPlayAgainst" lowerIsBetter />
            <TeamLeaderCard title="Success Rate Against"       teams={teamStats} valueKey="successAgainst"      suffix="%" lowerIsBetter />
            <TeamLeaderCard title="Explosive Plays Allowed / Game" teams={teamStats} valueKey="explosivePlaysAgainst" lowerIsBetter />
            <TeamLeaderCard title="Interceptions / Game"         teams={teamStats} valueKey="interceptions" />
            <TeamLeaderCard title="Flag Pulls For Loss / Game"   teams={teamStats} valueKey="tflsForced" />
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}