import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLeague } from "../../context/LeagueContext";
import { loadLeagueSeason } from "../../utils/leagueSeason";
import { isUnknownPlayer } from "../../utils/playerName";

import {
  yardsGainedForPlay,
  isPassCompletionOutcome,
  isReceivingOutcome,
  isInterceptionOutcome,
  countPassCompletions,
  countPlayerInterceptions,
  countPlayerDefensiveTDs,
  isExplosiveYards,
} from "../../utils/statsHelpers";

const fmt = (val, digits = 1) =>
  typeof val === "number" && !isNaN(val) ? val.toFixed(digits) : "0.0";

const CATEGORIES = [
  {
    id: 'passing',
    label: 'Passing',
    played: (p) => p.passAttempts > 0,
    columns: [
      { key: 'passingYards', label: 'Yds' },
      { key: 'yardsPerAttempt', label: 'Yds/Att', rate: true, render: (p) => fmt(p.yardsPerAttempt) },
      { key: 'completionPct', label: 'Comp %', rate: true, render: (p) => `${fmt(p.completionPct)}% (${p.passCompletions}/${p.passAttempts})` },
      { key: 'passingTDs', label: 'TD' },
      { key: 'passExplosive', label: 'Expl.' },
      { key: 'interceptionsThrown', label: 'INT' },
    ],
  },
  {
    id: 'rushing',
    label: 'Rushing',
    played: (p) => p.carries > 0,
    columns: [
      { key: 'rushingYards', label: 'Yds' },
      { key: 'carries', label: 'Car' },
      { key: 'rushingTDs', label: 'TD' },
      { key: 'rushExplosive', label: 'Expl.' },
      { key: 'yardsPerCarry', label: 'Yds/Car', rate: true, render: (p) => fmt(p.yardsPerCarry) },
    ],
  },
  {
    id: 'receiving',
    label: 'Receiving',
    played: (p) => p.receptions > 0,
    columns: [
      { key: 'receivingYards', label: 'Yds' },
      { key: 'receptions', label: 'Rec' },
      { key: 'receivingTDs', label: 'TD' },
      { key: 'recExplosive', label: 'Expl.' },
      { key: 'yardsPerReception', label: 'Yds/Rec', rate: true, render: (p) => fmt(p.yardsPerReception) },
      { key: 'conversionsCaught', label: 'Conv' },
    ],
  },
  {
    id: 'defense',
    label: 'Defense',
    played: (p) => p.interceptions > 0 || p.defensiveTDs > 0 || p.flagPulls > 0,
    columns: [
      { key: 'interceptions', label: 'INT' },
      { key: 'defensiveTDs', label: 'TD' },
      { key: 'flagPulls', label: 'FP' },
      { key: 'flagPullsForLoss', label: 'FPL' },
    ],
  },
];

export default function PlayerStats() {
  const { currentLeague } = useLeague();
  const [teams, setTeams]     = useState([]);
  const [teamId, setTeamId]   = useState("");
  const [players, setPlayers] = useState([]);
  const [season, setSeason]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [category, setCategory] = useState('passing');
  const [perGame, setPerGame] = useState(false);

  const handleSort = (key) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const activeCategory = CATEGORIES.find((item) => item.id === category) ?? CATEGORIES[0];

  const statValue = (player, key) => {
    const col = activeCategory.columns.find((item) => item.key === key);
    const value = player[key];
    if (perGame && col && !col.rate && typeof value === 'number') {
      return player.gamesPlayed > 0 ? value / player.gamesPlayed : 0;
    }
    return value;
  };

  const cellText = (player, col) => {
    if (col.rate && col.render) return col.render(player);
    if (perGame && !col.rate && typeof player[col.key] === 'number') {
      const value = statValue(player, col.key);
      return typeof value === 'number' ? value.toFixed(1) : value;
    }
    return col.render ? col.render(player) : player[col.key];
  };

  const visiblePlayers = activeCategory.played
    ? players.filter(activeCategory.played)
    : players;
  const sortedPlayers = [...visiblePlayers].sort((a, b) => {
    const av = statValue(a, sortKey);
    const bv = statValue(b, sortKey);
    if (typeof av === 'string') return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortAsc ? av - bv : bv - av;
  });

  const SortTh = ({ label, colKey, className = "", sticky = false }) => (
    <th
      className={`px-2 py-2.5 cursor-pointer hover:text-white select-none whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide ${
        sortKey === colKey ? 'text-blue-400' : 'text-slate-400'
      } ${sticky ? 'sticky left-0 z-20 bg-slate-800 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.65)]' : ''} ${className}`}
      onClick={() => handleSort(colKey)}
    >
      {label} {sortKey === colKey ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  );

  const playerCol = "w-[9.5rem] min-w-[9.5rem] max-w-[9.5rem] box-border";
  const stickyPlayerCell = (idx) =>
    `sticky left-0 z-10 whitespace-nowrap font-medium text-white shadow-[4px_0_10px_-4px_rgba(0,0,0,0.65)] ${playerCol} ${
      idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-800'
    }`;

  useEffect(() => {
    if (!currentLeague) return;
    let cancelled = false;
    setTeamId("");
    setPlayers([]);
    setSeason(null);
    loadLeagueSeason(currentLeague.league_id)
      .then((data) => {
        if (cancelled) return;
        setTeams(data.teams);
        setSeason(data);
      })
      .catch((err) => console.error(err));
    return () => { cancelled = true; };
  }, [currentLeague]);

  useEffect(() => {
    if (!teamId || !season) return;
    const fetchPlayers = async () => {
      setLoading(true);

      const playersData = season.players.filter(
        (p) => String(p.team_id) === String(teamId) && !isUnknownPlayer(p),
      );
      const { plays, participants, games, roster } = season;
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

      const computed = (playersData || []).map(player => {
        const pid = player.player_id;

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
        const convReceiver = getPlays(receiverIds).filter(p => p.is_conversion);

        const yg = p => yardsGainedForPlay(p, ghMap[p.game_id], harMap[p.game_id], fortyMap[p.game_id]);

        const gamesPlayed = gamesWithJersey.get(pid)?.size ?? 0;

        // Passing
        const passAttempts       = passerData.filter(p => p.play_type === 'pass').length;
        const passCompletions    = countPassCompletions(passerData.filter(p => p.play_type === 'pass'));
        const passingYards       = passerData.filter(p => p.play_type === 'pass' && isPassCompletionOutcome(p.outcome)).reduce((s, p) => s + yg(p), 0);
        const passingTDs         = passerData.filter(p => p.play_type === 'pass' && p.outcome === 'td').length;
        const interceptionsThrown= passerData.filter(p => isInterceptionOutcome(p.outcome)).length;
        const completionPct      = passAttempts > 0 ? (passCompletions / passAttempts) * 100 : 0;
        const yardsPerAttempt    = passAttempts > 0 ? passingYards / passAttempts : 0;
        const passExplosive      = passerData
          .filter(p => p.play_type === 'pass' && isPassCompletionOutcome(p.outcome) && isExplosiveYards(yg(p), 'pass'))
          .length;

        // Rushing
        const carries      = rusherData.length;
        const rushingYards = rusherData.reduce((s, p) => s + yg(p), 0);
        const rushingTDs   = rusherData.filter(p => p.outcome === 'td').length;
        const yardsPerCarry= carries > 0 ? rushingYards / carries : 0;
        const rushExplosive = rusherData.filter(p => isExplosiveYards(yg(p), 'rush')).length;

        // Receiving
        const receptions         = receiverData.filter(p => isReceivingOutcome(p.outcome)).length;
        const receivingYards     = receiverData.filter(p => isReceivingOutcome(p.outcome)).reduce((s, p) => s + yg(p), 0);
        const receivingTDs      = receiverData.filter(p => p.outcome === 'td').length;
        const yardsPerReception = receptions > 0 ? receivingYards / receptions : 0;
        const recExplosive = receiverData
          .filter(p => isReceivingOutcome(p.outcome) && isExplosiveYards(yg(p), 'pass'))
          .length;
        const conversionsCaught = convReceiver.filter(p => p.outcome === 'complete').length;

        // Defense — TFL includes backward passes too
        const interceptions     = countPlayerInterceptions(pid, participants, plays);
        const defensiveTDs      = countPlayerDefensiveTDs(pid, participants, plays);
        const flagPulls         = defenderData.length;
        const flagPullsForLoss  = defenderData.filter(p =>
          (p.play_type === 'rush' || (p.play_type === 'pass' && p.outcome === 'complete'))
          && yg(p) < 0
        ).length;

        return {
          player_id: pid, name: String(player.name ?? '').trim(), gamesPlayed,
          passingYards, passCompletions, passAttempts, completionPct, yardsPerAttempt, passingTDs, passExplosive, interceptionsThrown,
          carries, rushingYards, rushingTDs, yardsPerCarry, rushExplosive,
          receptions, receivingYards, receivingTDs, yardsPerReception, recExplosive, conversionsCaught,
          interceptions, defensiveTDs, flagPulls, flagPullsForLoss,
        };
      });

      setPlayers(computed);
      setLoading(false);
    };
    fetchPlayers();
  }, [teamId, season]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-4 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white shrink-0">Player Statistics</h2>
          <div className="flex flex-col items-stretch sm:items-end gap-2 w-full sm:w-auto sm:min-w-[220px] shrink-0">
            <div className="relative w-full">
              <select
                className="w-full px-4 py-2.5 pr-10 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                value={teamId}
                onChange={e => setTeamId(e.target.value)}
              >
                <option value="">Select a team</option>
                {teams.map(t => <option key={t.team_id} value={t.team_id}>{t.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            </div>
            <div className="flex rounded-lg border border-slate-600 overflow-hidden self-end">
              <button
                type="button"
                onClick={() => setPerGame(false)}
                className={`px-3 py-1.5 text-xs font-semibold ${
                  perGame ? 'text-slate-400 hover:text-white' : 'bg-blue-600 text-white'
                }`}
              >
                Totals
              </button>
              <button
                type="button"
                onClick={() => setPerGame(true)}
                className={`px-3 py-1.5 text-xs font-semibold ${
                  perGame ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Per game
              </button>
            </div>
          </div>
        </div>

        {!teamId && (
          <p className="px-4 py-8 text-slate-400 text-center">Choose a team to view player stats.</p>
        )}
        {loading && (
          <p className="px-4 py-8 text-slate-400 text-center animate-pulse">Loading player stats...</p>
        )}
        {teamId && !loading && players.length === 0 && (
          <p className="px-4 py-8 text-slate-400 text-center">No stats available for this team.</p>
        )}

        {!loading && players.length > 0 && (
          <>
            <div className="flex gap-1 overflow-x-auto px-3 py-3 border-b border-slate-700">
              {CATEGORIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCategory(item.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    category === item.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {sortedPlayers.length === 0 ? (
              <p className="px-4 py-8 text-slate-400 text-center">No players with these stats.</p>
            ) : (
            <div className="overflow-x-auto overscroll-x-contain scroll-smooth [-webkit-overflow-scrolling:touch]">
              <table className="w-full min-w-[20rem] text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-800 border-b border-slate-700">
                    <SortTh label="Player" colKey="name" sticky className={`${playerCol} pl-3`} />
                    <SortTh label="GP" colKey="gamesPlayed" className="min-w-[3rem] text-center" />
                    {activeCategory.columns.map((col, index) => (
                      <SortTh
                        key={col.key}
                        label={col.label}
                        colKey={col.key}
                        className={`text-center ${index === 0 ? 'border-l border-slate-600' : ''} ${index === activeCategory.columns.length - 1 ? 'pr-3' : ''}`}
                      />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedPlayers.map((p, idx) => (
                    <tr
                      key={p.player_id}
                      className={`border-b border-slate-700/80 hover:bg-slate-700/30 transition-colors ${
                        idx % 2 === 0 ? 'bg-slate-900/70' : 'bg-slate-800/50'
                      }`}
                    >
                      <td className={`px-3 py-2 ${stickyPlayerCell(idx)}`}>{p.name}</td>
                      <td className="px-2 py-2 text-slate-300 text-center tabular-nums">{p.gamesPlayed}</td>
                      {activeCategory.columns.map((col, index) => (
                        <td
                          key={col.key}
                          className={`px-2 py-2 text-slate-300 text-center tabular-nums whitespace-nowrap ${
                            index === 0 ? 'border-l border-slate-700/80' : ''
                          } ${index === activeCategory.columns.length - 1 ? 'pr-3' : ''}`}
                        >
                          {cellText(p, col)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}