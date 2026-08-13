import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { useLeague } from "../../context/LeagueContext";

import {
  yardsGainedForPlay,
  isPassCompletionOutcome,
  isReceivingOutcome,
  isInterceptionOutcome,
  countPassCompletions,
  countPlayerInterceptions,
  isExplosiveYards,
} from "../../utils/statsHelpers";

const fmt = (val, digits = 1) =>
  typeof val === "number" && !isNaN(val) ? val.toFixed(digits) : "0.0";

export default function PlayerStats() {
  const { currentLeague } = useLeague();
  const [teams, setTeams]     = useState([]);
  const [teamId, setTeamId]   = useState("");
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (key) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sortedPlayers = [...players].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
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

  const GroupHeader = ({ label, cols, className = "" }) => (
    <th colSpan={cols} className={`px-2 py-2 text-[10px] font-bold uppercase tracking-widest text-center ${className}`}>
      {label}
    </th>
  );

  const stickyPlayerCell = (idx) =>
    `sticky left-0 z-10 whitespace-nowrap font-medium text-white shadow-[4px_0_10px_-4px_rgba(0,0,0,0.65)] ${
      idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-800'
    }`;

  useEffect(() => {
    if (!currentLeague) return;
    setTeamId(""); setPlayers([]);
    const fetchTeams = async () => {
      const { data } = await supabase.from("Team").select("*").eq("league_id", currentLeague.league_id);
      setTeams(data || []);
    };
    fetchTeams();
  }, [currentLeague]);

  useEffect(() => {
    if (!teamId) return;
    const fetchPlayers = async () => {
      setLoading(true);

      const { data: playersData } = await supabase.from("Player").select("*").eq("team_id", teamId);
      const { data: plays }       = await supabase.from("Play").select("*");
      const { data: participants }= await supabase.from("Participants").select("*");
      const { data: games }       = await supabase.from("Game").select("game_id, home_team, home_attacks_right");

      // Build game→home map
      const ghMap = {};
      const harMap = {};
      for (const g of (games || [])) {
        ghMap[g.game_id] = g.home_team;
        harMap[g.game_id] = g.home_attacks_right ?? true;
      }

      const computed = (playersData || []).map(player => {
        const pid = player.player_id;

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
        const convPasser   = getPlays(passerIds).filter(p => p.is_conversion);
        const convReceiver = getPlays(receiverIds).filter(p => p.is_conversion);

        const yg = p => yardsGainedForPlay(p, ghMap[p.game_id], harMap[p.game_id]);

        const playerPlayIds = new Set([...passerIds, ...rusherIds, ...receiverIds, ...defenderIds, ...interceptorIds]);
        const playerGameIds = new Set((plays || []).filter(p => playerPlayIds.has(p.play_id)).map(p => p.game_id));
        const gamesPlayed   = playerGameIds.size || 1;

        // Passing
        const passAttempts       = passerData.filter(p => p.play_type === 'pass').length;
        const passCompletions    = countPassCompletions(passerData.filter(p => p.play_type === 'pass'));
        const passingYards       = passerData.filter(p => p.play_type === 'pass' && isPassCompletionOutcome(p.outcome)).reduce((s, p) => s + yg(p), 0);
        const passingTDs         = passerData.filter(p => p.play_type === 'pass' && p.outcome === 'td').length;
        const interceptionsThrown= passerData.filter(p => isInterceptionOutcome(p.outcome)).length;
        const completionPct      = passAttempts > 0 ? (passCompletions / passAttempts) * 100 : 0;
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

        // Defense — TFL includes backward passes too
        const interceptions     = countPlayerInterceptions(pid, participants, plays);
        const flagPulls         = defenderData.length;
        const flagPullsForLoss  = defenderData.filter(p =>
          (p.play_type === 'rush' || (p.play_type === 'pass' && p.outcome === 'complete'))
          && yg(p) < 0
        ).length;

        // Conversions
        const conv1Thrown = convPasser.filter(p => p.conv_points === 1 && p.outcome === 'complete').length;
        const conv1Caught = convReceiver.filter(p => p.conv_points === 1 && p.outcome === 'complete').length;
        const conv2Thrown = convPasser.filter(p => p.conv_points === 2 && p.outcome === 'complete').length;
        const conv2Caught = convReceiver.filter(p => p.conv_points === 2 && p.outcome === 'complete').length;
        const conv3Thrown = convPasser.filter(p => p.conv_points === 3 && p.outcome === 'complete').length;
        const conv3Caught = convReceiver.filter(p => p.conv_points === 3 && p.outcome === 'complete').length;

        return {
          player_id: pid, name: player.name, gamesPlayed,
          passingYards, passCompletions, passAttempts, completionPct, passingTDs, passExplosive, interceptionsThrown,
          carries, rushingYards, rushingTDs, yardsPerCarry, rushExplosive,
          receptions, receivingYards, receivingTDs, yardsPerReception, recExplosive,
          interceptions, flagPulls, flagPullsForLoss,
          conv1Thrown, conv1Caught, conv2Thrown, conv2Caught, conv3Thrown, conv3Caught,
          passYpg: passingYards / gamesPlayed,
          rushYpg: rushingYards / gamesPlayed,
          recYpg:  receivingYards / gamesPlayed,
        };
      });

      setPlayers(computed);
      setLoading(false);
    };
    fetchPlayers();
  }, [teamId]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-4 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white shrink-0">Player Statistics</h2>
          <div className="relative w-full sm:w-auto sm:min-w-[220px] shrink-0">
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
          <div className="overflow-x-auto overscroll-x-contain scroll-smooth [-webkit-overflow-scrolling:touch]">
            <table className="w-max min-w-full text-left text-sm border-collapse">
              <thead className="sticky top-0 z-30">
                <tr className="bg-slate-900 border-b border-slate-700">
                  <th colSpan={2} className="sticky left-0 z-40 bg-slate-900 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.65)]" />
                  <GroupHeader label="Passing"     cols={5} className="text-blue-400 border-l border-slate-600" />
                  <GroupHeader label="Rushing"     cols={5} className="text-green-400 border-l border-slate-600" />
                  <GroupHeader label="Receiving"   cols={5} className="text-yellow-400 border-l border-slate-600" />
                  <GroupHeader label="Defense"     cols={3} className="text-red-400 border-l border-slate-600" />
                  <GroupHeader label="Conversions" cols={6} className="text-orange-400 border-l border-slate-600" />
                  <GroupHeader label="Per Game"    cols={3} className="text-purple-400 border-l border-slate-600" />
                </tr>
                <tr className="bg-slate-800 border-b border-slate-700">
                  <SortTh label="Player"     colKey="name"           sticky className="min-w-[130px] pl-3" />
                  <SortTh label="GP"         colKey="gamesPlayed"    className="min-w-[44px] text-center" />
                  <SortTh label="Pass Yds"   colKey="passingYards"   className="border-l border-slate-600 min-w-[72px] text-center" />
                  <SortTh label="Comp %"     colKey="completionPct"  className="min-w-[110px] text-center" />
                  <SortTh label="Pass TDs"   colKey="passingTDs"     className="min-w-[72px] text-center" />
                  <SortTh label="Expl."      colKey="passExplosive"  className="min-w-[52px] text-center" />
                  <SortTh label="INT Thr"    colKey="interceptionsThrown" className="min-w-[68px] text-center" />
                  <SortTh label="Rush Yds"   colKey="rushingYards"   className="border-l border-slate-600 min-w-[72px] text-center" />
                  <SortTh label="Carries"    colKey="carries"        className="min-w-[64px] text-center" />
                  <SortTh label="Rush TDs"   colKey="rushingTDs"     className="min-w-[72px] text-center" />
                  <SortTh label="Expl."      colKey="rushExplosive"  className="min-w-[52px] text-center" />
                  <SortTh label="Yds/Car"    colKey="yardsPerCarry"  className="min-w-[68px] text-center" />
                  <SortTh label="Rec Yds"    colKey="receivingYards" className="border-l border-slate-600 min-w-[72px] text-center" />
                  <SortTh label="Catches"    colKey="receptions"     className="min-w-[64px] text-center" />
                  <SortTh label="Rec TDs"    colKey="receivingTDs"   className="min-w-[68px] text-center" />
                  <SortTh label="Expl."      colKey="recExplosive"   className="min-w-[52px] text-center" />
                  <SortTh label="Yds/Rec"    colKey="yardsPerReception" className="min-w-[68px] text-center" />
                  <SortTh label="INTs"       colKey="interceptions"  className="border-l border-slate-600 min-w-[52px] text-center" />
                  <SortTh label="FP"         colKey="flagPulls"      className="min-w-[44px] text-center" />
                  <SortTh label="FPL"        colKey="flagPullsForLoss" className="min-w-[44px] text-center" />
                  <SortTh label="1pt Thr"    colKey="conv1Thrown"    className="border-l border-slate-600 min-w-[64px] text-center" />
                  <SortTh label="1pt Cau"    colKey="conv1Caught"    className="min-w-[64px] text-center" />
                  <SortTh label="2pt Thr"    colKey="conv2Thrown"    className="min-w-[64px] text-center" />
                  <SortTh label="2pt Cau"    colKey="conv2Caught"    className="min-w-[64px] text-center" />
                  <SortTh label="3pt Thr"    colKey="conv3Thrown"    className="min-w-[64px] text-center" />
                  <SortTh label="3pt Cau"    colKey="conv3Caught"    className="min-w-[64px] text-center" />
                  <SortTh label="Pass Yds/G" colKey="passYpg"        className="border-l border-slate-600 min-w-[84px] text-center" />
                  <SortTh label="Rush Yds/G" colKey="rushYpg"        className="min-w-[84px] text-center" />
                  <SortTh label="Rec Yds/G"  colKey="recYpg"         className="min-w-[84px] text-center pr-3" />
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
                    <td className="px-2 py-2 text-slate-300 text-center tabular-nums border-l border-slate-700/80">{p.passingYards}</td>
                    <td className="px-2 py-2 text-slate-300 text-center tabular-nums">
                      {fmt(p.completionPct)}%
                      <span className="text-slate-500 text-[10px] ml-1">({p.passCompletions}/{p.passAttempts})</span>
                    </td>
                    <td className="px-2 py-2 text-slate-300 text-center tabular-nums">{p.passingTDs}</td>
                    <td className="px-2 py-2 text-slate-300 text-center tabular-nums">{p.passExplosive}</td>
                    <td className="px-2 py-2 text-slate-300 text-center tabular-nums">{p.interceptionsThrown}</td>
                    <td className="px-2 py-2 text-slate-300 text-center tabular-nums border-l border-slate-700/80">{p.rushingYards}</td>
                    <td className="px-2 py-2 text-slate-300 text-center tabular-nums">{p.carries}</td>
                    <td className="px-2 py-2 text-slate-300 text-center tabular-nums">{p.rushingTDs}</td>
                    <td className="px-2 py-2 text-slate-300 text-center tabular-nums">{p.rushExplosive}</td>
                    <td className="px-2 py-2 text-slate-300 text-center tabular-nums">{fmt(p.yardsPerCarry)}</td>
                    <td className="px-2 py-2 text-slate-300 text-center tabular-nums border-l border-slate-700/80">{p.receivingYards}</td>
                    <td className="px-2 py-2 text-slate-300 text-center tabular-nums">{p.receptions}</td>
                    <td className="px-2 py-2 text-slate-300 text-center tabular-nums">{p.receivingTDs}</td>
                    <td className="px-2 py-2 text-slate-300 text-center tabular-nums">{p.recExplosive}</td>
                    <td className="px-2 py-2 text-slate-300 text-center tabular-nums">{fmt(p.yardsPerReception)}</td>
                    <td className="px-2 py-2 text-slate-300 text-center tabular-nums border-l border-slate-700/80">{p.interceptions}</td>
                    <td className="px-2 py-2 text-slate-300 text-center tabular-nums">{p.flagPulls}</td>
                    <td className="px-2 py-2 text-slate-300 text-center tabular-nums">{p.flagPullsForLoss}</td>
                    <td className="px-2 py-2 text-slate-300 text-center tabular-nums border-l border-slate-700/80">{p.conv1Thrown}</td>
                    <td className="px-2 py-2 text-slate-300 text-center tabular-nums">{p.conv1Caught}</td>
                    <td className="px-2 py-2 text-slate-300 text-center tabular-nums">{p.conv2Thrown}</td>
                    <td className="px-2 py-2 text-slate-300 text-center tabular-nums">{p.conv2Caught}</td>
                    <td className="px-2 py-2 text-slate-300 text-center tabular-nums">{p.conv3Thrown}</td>
                    <td className="px-2 py-2 text-slate-300 text-center tabular-nums">{p.conv3Caught}</td>
                    <td className="px-2 py-2 text-slate-300 text-center tabular-nums border-l border-slate-700/80">{fmt(p.passYpg)}</td>
                    <td className="px-2 py-2 text-slate-300 text-center tabular-nums">{fmt(p.rushYpg)}</td>
                    <td className="px-2 py-2 text-slate-300 text-center tabular-nums pr-3">{fmt(p.recYpg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}