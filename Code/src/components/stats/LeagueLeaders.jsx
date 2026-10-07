import React, { useState, useEffect, useRef } from "react";
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
  gamesPlayedByPlayer,
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

function teamLabel(entry) {
  return entry.team_name || entry.team_abbr || "";
}

function statText(entry, stat) {
  return `${fmt(entry[stat.key], stat.digits ?? 0)}${stat.suffix || ""}`;
}

function LeaderLine({ rank, name, detail, stats }) {
  const single = stats.length <= 1;
  return (
    <li className="px-2.5 py-2 sm:px-3.5 sm:py-2.5 border-b border-slate-800/80 last:border-b-0">
      <div className="flex items-center gap-2">
        <RankBadge rank={rank} className="w-6 h-6 text-[11px] sm:w-7 sm:h-7 sm:text-xs" />
        <div className="min-w-0 flex-1 lg:flex-none lg:w-40">
          <p className="text-[13px] sm:text-sm font-semibold text-slate-50 leading-tight truncate">{name}</p>
          {detail && (
            <p className="mt-0.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-slate-400 leading-tight truncate">{detail}</p>
          )}
        </div>
        {single && (
          <span className="text-sm font-bold text-white tabular-nums shrink-0">{stats[0]?.value ?? "—"}</span>
        )}
        {!single && (
          <div className="hidden lg:flex items-end gap-3 shrink-0">
            {stats.map((stat) => (
              <div key={stat.label} className="w-11 text-right">
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500 leading-none">{stat.label}</p>
                <p className="mt-1 text-sm font-semibold text-white tabular-nums leading-none">{stat.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      {!single && (
        <div className="lg:hidden mt-1.5 pl-8 grid grid-cols-2 gap-x-2 gap-y-0.5">
          {stats.map((stat) => (
            <p key={stat.label} className="text-[11px] leading-tight min-w-0 truncate">
              <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{stat.label} </span>
              <span className="font-semibold tabular-nums text-white">{stat.value}</span>
            </p>
          ))}
        </div>
      )}
    </li>
  );
}

function LeaderBoard({ rows }) {
  const split = rows.length > 5;
  const columns = split ? [rows.slice(0, 5), rows.slice(5)] : [rows];
  return (
    <section className="bg-slate-900/50 border border-slate-700/80 rounded-lg overflow-hidden">
      {rows.length === 0 ? (
        <p className="text-slate-500 text-sm px-4 py-3">No data</p>
      ) : (
        <div className={split ? "grid grid-cols-2 gap-px bg-slate-700/50" : ""}>
          {columns.map((column, index) => (
            <ol key={index} className="min-w-0 bg-slate-900/90">
              {column.map((row) => (
                <LeaderLine key={row.id} {...row} />
              ))}
            </ol>
          ))}
        </div>
      )}
    </section>
  );
}

// Multi-stat player leader card — primary stat sorts/filters, secondary stats shown in columns
function PlayerMultiStatCard({ players, sortKey, secondary = [] }) {
  const filtered = players.filter(p => p[sortKey] > 0);
  const sorted = [...filtered].sort((a, b) => b[sortKey] - a[sortKey]).slice(0, 10);
  const rows = sorted.map((player, index) => ({
    id: player.player_id,
    rank: index + 1,
    name: shortPlayerName(player.name),
    detail: teamLabel(player),
    stats: secondary.map((stat) => ({
      label: stat.short || stat.label,
      value: statText(player, stat),
    })),
  }));
  return <LeaderBoard rows={rows} />;
}

function PlayerLeaderCard({ players, valueKey, valueLabel, digits = 0, suffix = "", secondary = [] }) {
  const filtered = players.filter(p => p[valueKey] > 0);
  const sorted = [...filtered].sort((a, b) => b[valueKey] - a[valueKey]).slice(0, 10);
  const rows = sorted.map((player, index) => ({
    id: player.player_id,
    rank: index + 1,
    name: shortPlayerName(player.name),
    detail: teamLabel(player),
    stats: [
      ...secondary.map((stat) => ({
        label: stat.short || stat.label,
        value: statText(player, stat),
      })),
      { label: valueLabel, value: `${fmt(player[valueKey], digits)}${suffix}` },
    ],
  }));
  return <LeaderBoard rows={rows} />;
}

function TeamLeaderCard({ teams, valueKey, digits = 1, suffix = "", lowerIsBetter = false, minKey = null, ratioKeys = null }) {
  let list = [...teams];
  if (minKey) list = list.filter((t) => (t[minKey] ?? 0) > 0);
  const sorted = list.sort((a, b) =>
    lowerIsBetter ? a[valueKey] - b[valueKey] : b[valueKey] - a[valueKey]
  );
  const rows = sorted.map((team, index) => ({
    id: team.team_id,
    rank: index + 1,
    name: team.name,
    detail: ratioKeys ? `${team[ratioKeys.num]}/${team[ratioKeys.den]}` : "",
    stats: [{ label: "", value: `${fmt(team[valueKey], digits)}${suffix}` }],
  }));
  return <LeaderBoard rows={rows} />;
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

const LEADER_TABS = {
  players: [
    {
      key: "passing",
      label: "Passing",
      card: "player-multi",
      sortKey: "passingFanPts",
      secondary: [
        { key: "completionPct", label: "COMP%", short: "CMP", digits: 0, suffix: "%" },
        { key: "passingYpg", label: "YDS/G", short: "YPG", digits: 1 },
        { key: "yardsPerAttempt", label: "YDS/A", short: "YPA", digits: 1 },
        { key: "passingTdpg", label: "TD/G", short: "TD/G", digits: 1 },
      ],
    },
    {
      key: "rushing",
      label: "Rushing",
      card: "player-multi",
      sortKey: "rushingFanPts",
      secondary: [
        { key: "rushesPerGame", label: "RUSH/G", short: "RSH", digits: 1 },
        { key: "rushingYpg", label: "YDS/G", short: "YPG", digits: 1 },
        { key: "rushingTdpg", label: "TD/G", digits: 1 },
      ],
    },
    {
      key: "receiving",
      label: "Receiving",
      card: "player-multi",
      sortKey: "receivingFanPts",
      secondary: [
        { key: "receptionsPerGame", label: "REC/G", short: "REC", digits: 1 },
        { key: "receivingYpg", label: "YDS/G", short: "YPG", digits: 1 },
        { key: "receivingTdpg", label: "TD/G", digits: 1 },
      ],
    },
    {
      key: "flag-pulls",
      label: "Flag Pulls",
      card: "player",
      valueKey: "flagPullsPerGame",
      valueLabel: "PER G",
      digits: 1,
    },
    {
      key: "flag-pulls-loss",
      label: "For Loss",
      card: "player",
      valueKey: "flagPullsForLossPerGame",
      valueLabel: "PER G",
      digits: 1,
    },
    {
      key: "interceptions",
      label: "Interceptions",
      card: "player",
      valueKey: "interceptionsPerGame",
      valueLabel: "PER G",
      digits: 1,
    },
  ],
  offense: [
    { key: "ppg", label: "Points", card: "team", valueKey: "ppg" },
    { key: "pass-yds", label: "Pass Yards", card: "team", valueKey: "passYpg" },
    { key: "rush-yds", label: "Rush Yards", card: "team", valueKey: "rushYpg" },
    { key: "total-yds", label: "Total Yards", card: "team", valueKey: "totalYpg" },
    { key: "ypp", label: "Yards/Play", card: "team", valueKey: "yardsPerPlay" },
    { key: "comp", label: "Completion", card: "team", valueKey: "completionPct", suffix: "%" },
    { key: "success", label: "Success", card: "team", valueKey: "successFor", suffix: "%" },
    { key: "explosive", label: "Explosive", card: "team", valueKey: "explosivePlays" },
    { key: "conv1", label: "1-Point", card: "team", valueKey: "conv1Pct", suffix: "%" },
    { key: "conv2", label: "2-Point", card: "team", valueKey: "conv2Pct", suffix: "%" },
    { key: "conv3", label: "3-Point", card: "team", valueKey: "conv3Pct", suffix: "%" },
    {
      key: "red-zone",
      label: "Red Zone",
      card: "team",
      valueKey: "redZonePct",
      suffix: "%",
      minKey: "redZoneAttempts",
      ratioKeys: { num: "redZoneScores", den: "redZoneAttempts" },
    },
  ],
  defense: [
    { key: "papg", label: "Pts Against", card: "team", valueKey: "papg", lowerIsBetter: true },
    { key: "pass-against", label: "Pass Against", card: "team", valueKey: "passYpgAgainst", lowerIsBetter: true },
    { key: "rush-against", label: "Rush Against", card: "team", valueKey: "rushYpgAgainst", lowerIsBetter: true },
    { key: "total-against", label: "Total Against", card: "team", valueKey: "totalYpgAgainst", lowerIsBetter: true },
    { key: "ypp-against", label: "Yards/Play", card: "team", valueKey: "yardsPerPlayAgainst", lowerIsBetter: true },
    { key: "success-against", label: "Success", card: "team", valueKey: "successAgainst", suffix: "%", lowerIsBetter: true },
    { key: "explosive-against", label: "Explosive", card: "team", valueKey: "explosivePlaysAgainst", lowerIsBetter: true },
    { key: "def-int", label: "Interceptions", card: "team", valueKey: "interceptions" },
    { key: "def-tfl", label: "For Loss", card: "team", valueKey: "tflsForced" },
  ],
};

function LeaderStatTabs({ options, value, onChange }) {
  const scrollerRef = useRef(null);

  useEffect(() => {
    const active = scrollerRef.current?.querySelector('[data-active="true"]');
    active?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [value, options]);

  return (
    <div
      ref={scrollerRef}
      className="flex gap-1.5 overflow-x-auto overscroll-x-contain px-3 sm:px-4 py-3 border-b border-slate-700"
    >
      {options.map((option) => {
        const active = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            data-active={active}
            onClick={() => onChange(option.key)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              active ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-700"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function LeaderCard({ stat, playerStats, teamStats }) {
  if (stat.card === "player-multi") {
    return (
      <PlayerMultiStatCard
        players={playerStats}
        sortKey={stat.sortKey}
        secondary={stat.secondary}
      />
    );
  }
  if (stat.card === "player") {
    return (
      <PlayerLeaderCard
        players={playerStats}
        valueKey={stat.valueKey}
        valueLabel={stat.valueLabel}
        digits={stat.digits}
      />
    );
  }
  return (
    <TeamLeaderCard
      teams={teamStats}
      valueKey={stat.valueKey}
      digits={stat.digits}
      suffix={stat.suffix}
      lowerIsBetter={stat.lowerIsBetter}
      minKey={stat.minKey}
      ratioKeys={stat.ratioKeys}
    />
  );
}

export default function LeagueLeaders() {
  const { currentLeague } = useLeague();
  const [playerStats, setPlayerStats] = useState([]);
  const [teamStats, setTeamStats]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [view, setView]               = useState("players");
  const [statKey, setStatKey]         = useState(LEADER_TABS.players[0].key);

  const statOptions = LEADER_TABS[view];
  const activeStat = statOptions.find((stat) => stat.key === statKey) || statOptions[0];

  function changeView(next) {
    setView(next);
    setStatKey(LEADER_TABS[next][0].key);
  }

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
      const gamesByPlayer = gamesPlayedByPlayer(participants, plays, roster);

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
        const yardsPerAttempt = passAttempts > 0 ? passingYards / passAttempts : 0;

        const rushingYards  = rusherData.reduce((s, p) => s + yg(p), 0);
        const rushes        = rusherData.length;
        const rushingTDs    = rusherData.filter(p => p.outcome === 'td').length;

        const receptions     = receiverData.filter(p => isReceivingOutcome(p.outcome)).length;
        const receivingYards = receiverData.filter(p => isReceivingOutcome(p.outcome)).reduce((s, p) => s + yg(p), 0);
        const receivingTDs   = receiverData.filter(p => p.outcome === 'td').length;
        const conversionsThrown = getPlays(passerIds).filter(p => p.is_conversion && p.outcome === 'complete').length;
        const conversionsCaught = getPlays(receiverIds).filter(p => p.is_conversion && p.outcome === 'complete').length;

        const gamesPlayed = gamesByPlayer.get(Number(pid))?.size ?? 0;
        const perGame = (total) => (gamesPlayed > 0 ? total / gamesPlayed : 0);
        const round2 = (n) => Math.round(n * 100) / 100;
        const passingYpg = perGame(passingYards);
        const passingTdpg = perGame(passingTDs);
        const rushingYpg = perGame(rushingYards);
        const rushingTdpg = perGame(rushingTDs);
        const receivingYpg = perGame(receivingYards);
        const receivingTdpg = perGame(receivingTDs);
        const leaderScore = (ypg, tdpg, yardsWeight, convPg = 0) => round2(ypg * yardsWeight + tdpg * 2.5 + convPg * 0.5);
        const passingFanPts = leaderScore(passingYpg, passingTdpg, 0.25, perGame(conversionsThrown));
        const rushingFanPts = leaderScore(rushingYpg, rushingTdpg, 0.1);
        const receivingFanPts = leaderScore(receivingYpg, receivingTdpg, 0.1, perGame(conversionsCaught));

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
          completionPct, yardsPerAttempt, passingFanPts, rushingFanPts, receivingFanPts,
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
          <ViewToggle view={view} setView={changeView} />
        </div>

        <LeaderStatTabs options={statOptions} value={activeStat.key} onChange={setStatKey} />

        <div className="p-2 sm:p-4">
          <LeaderCard stat={activeStat} playerStats={playerStats} teamStats={teamStats} />
        </div>
      </div>
    </div>
  );
}