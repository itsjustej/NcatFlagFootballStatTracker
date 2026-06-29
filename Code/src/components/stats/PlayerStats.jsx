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

  const SortTh = ({ label, colKey, className = "" }) => (
    <th
      className={`px-4 py-3 cursor-pointer hover:text-white select-none whitespace-nowrap ${sortKey === colKey ? 'text-blue-400' : 'text-slate-300'} ${className}`}
      onClick={() => handleSort(colKey)}
    >
      {label} {sortKey === colKey ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  );

  const GroupHeader = ({ label, cols, className = "" }) => (
    <th colSpan={cols} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest text-center ${className}`}>
      {label}
    </th>
  );

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
          .filter(p => p.play_type === 'pass' && isPassCompletionOutcome(p.outcome) && isExplosiveYards(yg(p)))
          .length;

        // Rushing
        const carries      = rusherData.length;
        const rushingYards = rusherData.reduce((s, p) => s + yg(p), 0);
        const rushingTDs   = rusherData.filter(p => p.outcome === 'td').length;
        const yardsPerCarry= carries > 0 ? rushingYards / carries : 0;
        const rushExplosive = rusherData.filter(p => isExplosiveYards(yg(p))).length;

        // Receiving
        const receptions         = receiverData.filter(p => isReceivingOutcome(p.outcome)).length;
        const receivingYards     = receiverData.filter(p => isReceivingOutcome(p.outcome)).reduce((s, p) => s + yg(p), 0);
        const receivingTDs      = receiverData.filter(p => p.outcome === 'td').length;
        const yardsPerReception = receptions > 0 ? receivingYards / receptions : 0;
        const recExplosive = receiverData
          .filter(p => isReceivingOutcome(p.outcome) && isExplosiveYards(yg(p)))
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
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Player Statistics</h2>

      <div className="relative inline-block w-full max-w-xs">
        <select className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white appearance-none"
          value={teamId} onChange={e => setTeamId(e.target.value)}>
          <option value="">Select a team</option>
          {teams.map(t => <option key={t.team_id} value={t.team_id}>{t.name}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
      </div>

      {!teamId && <p className="text-slate-400">Choose a team to view player stats.</p>}
      {loading  && <p className="text-slate-400 animate-pulse">Loading player stats...</p>}
      {teamId && !loading && players.length === 0 && <p className="text-slate-400">No stats available for this team.</p>}

      {!loading && players.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-700">
                <th colSpan={2} />
                <GroupHeader label="Passing"     cols={5} className="text-blue-400 border-l border-slate-600" />
                <GroupHeader label="Rushing"     cols={5} className="text-green-400 border-l border-slate-600" />
                <GroupHeader label="Receiving"   cols={5} className="text-yellow-400 border-l border-slate-600" />
                <GroupHeader label="Defense"     cols={3} className="text-red-400 border-l border-slate-600" />
                <GroupHeader label="Conversions" cols={6} className="text-orange-400 border-l border-slate-600" />
                <GroupHeader label="Per Game"    cols={3} className="text-purple-400 border-l border-slate-600" />
              </tr>
              <tr className="bg-slate-800 text-xs uppercase tracking-wide">
                <SortTh label="Player"     colKey="name"           className="sticky left-0 bg-slate-800 min-w-[140px]" />
                <SortTh label="GP"         colKey="gamesPlayed"    className="min-w-[50px]" />
                <SortTh label="Pass Yds"   colKey="passingYards"   className="border-l border-slate-600 min-w-[90px]" />
                <SortTh label="Comp %"     colKey="completionPct"  className="min-w-[130px]" />
                <SortTh label="Pass TDs"   colKey="passingTDs"     className="min-w-[90px]" />
                <SortTh label="20+"        colKey="passExplosive"  className="min-w-[60px]" />
                <SortTh label="INT Thr"    colKey="interceptionsThrown" className="min-w-[80px]" />
                <SortTh label="Rush Yds"   colKey="rushingYards"   className="border-l border-slate-600 min-w-[90px]" />
                <SortTh label="Carries"    colKey="carries"        className="min-w-[80px]" />
                <SortTh label="Rush TDs"   colKey="rushingTDs"     className="min-w-[90px]" />
                <SortTh label="20+"        colKey="rushExplosive"  className="min-w-[60px]" />
                <SortTh label="Yds/Car"    colKey="yardsPerCarry"  className="min-w-[80px]" />
                <SortTh label="Rec Yds"    colKey="receivingYards" className="border-l border-slate-600 min-w-[90px]" />
                <SortTh label="Catches"    colKey="receptions"     className="min-w-[80px]" />
                <SortTh label="Rec TDs"    colKey="receivingTDs"   className="min-w-[80px]" />
                <SortTh label="20+"        colKey="recExplosive"   className="min-w-[60px]" />
                <SortTh label="Yds/Rec"    colKey="yardsPerReception" className="min-w-[80px]" />
                <SortTh label="INTs"       colKey="interceptions"  className="border-l border-slate-600 min-w-[60px]" />
                <SortTh label="FP"         colKey="flagPulls"      className="min-w-[60px]" />
                <SortTh label="FPL"        colKey="flagPullsForLoss" className="min-w-[60px]" />
                <SortTh label="1pt Thr"    colKey="conv1Thrown"    className="border-l border-slate-600 min-w-[80px]" />
                <SortTh label="1pt Cau"    colKey="conv1Caught"    className="min-w-[80px]" />
                <SortTh label="2pt Thr"    colKey="conv2Thrown"    className="min-w-[80px]" />
                <SortTh label="2pt Cau"    colKey="conv2Caught"    className="min-w-[80px]" />
                <SortTh label="3pt Thr"    colKey="conv3Thrown"    className="min-w-[80px]" />
                <SortTh label="3pt Cau"    colKey="conv3Caught"    className="min-w-[80px]" />
                <SortTh label="Pass Yds/G" colKey="passYpg"        className="border-l border-slate-600 min-w-[100px]" />
                <SortTh label="Rush Yds/G" colKey="rushYpg"        className="min-w-[100px]" />
                <SortTh label="Rec Yds/G"  colKey="recYpg"         className="min-w-[100px]" />
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((p, idx) => (
                <tr key={p.player_id}
                  className={`border-b border-slate-700 hover:bg-slate-700/40 transition ${idx % 2 === 0 ? 'bg-slate-800/20' : ''}`}>
                  <td className="px-4 py-3 text-white font-medium sticky left-0 bg-slate-900 whitespace-nowrap">{p.name}</td>
                  <td className="px-4 py-3 text-slate-300">{p.gamesPlayed}</td>
                  <td className="px-4 py-3 text-slate-300 border-l border-slate-700">{p.passingYards}</td>
                  <td className="px-4 py-3 text-slate-300">{fmt(p.completionPct)}%<span className="text-slate-500 text-xs ml-1">({p.passCompletions}/{p.passAttempts})</span></td>
                  <td className="px-4 py-3 text-slate-300">{p.passingTDs}</td>
                  <td className="px-4 py-3 text-slate-300">{p.passExplosive}</td>
                  <td className="px-4 py-3 text-slate-300">{p.interceptionsThrown}</td>
                  <td className="px-4 py-3 text-slate-300 border-l border-slate-700">{p.rushingYards}</td>
                  <td className="px-4 py-3 text-slate-300">{p.carries}</td>
                  <td className="px-4 py-3 text-slate-300">{p.rushingTDs}</td>
                  <td className="px-4 py-3 text-slate-300">{p.rushExplosive}</td>
                  <td className="px-4 py-3 text-slate-300">{fmt(p.yardsPerCarry)}</td>
                  <td className="px-4 py-3 text-slate-300 border-l border-slate-700">{p.receivingYards}</td>
                  <td className="px-4 py-3 text-slate-300">{p.receptions}</td>
                  <td className="px-4 py-3 text-slate-300">{p.receivingTDs}</td>
                  <td className="px-4 py-3 text-slate-300">{p.recExplosive}</td>
                  <td className="px-4 py-3 text-slate-300">{fmt(p.yardsPerReception)}</td>
                  <td className="px-4 py-3 text-slate-300 border-l border-slate-700">{p.interceptions}</td>
                  <td className="px-4 py-3 text-slate-300">{p.flagPulls}</td>
                  <td className="px-4 py-3 text-slate-300">{p.flagPullsForLoss}</td>
                  <td className="px-4 py-3 text-slate-300 border-l border-slate-700">{p.conv1Thrown}</td>
                  <td className="px-4 py-3 text-slate-300">{p.conv1Caught}</td>
                  <td className="px-4 py-3 text-slate-300">{p.conv2Thrown}</td>
                  <td className="px-4 py-3 text-slate-300">{p.conv2Caught}</td>
                  <td className="px-4 py-3 text-slate-300">{p.conv3Thrown}</td>
                  <td className="px-4 py-3 text-slate-300">{p.conv3Caught}</td>
                  <td className="px-4 py-3 text-slate-300 border-l border-slate-700">{fmt(p.passYpg)}</td>
                  <td className="px-4 py-3 text-slate-300">{fmt(p.rushYpg)}</td>
                  <td className="px-4 py-3 text-slate-300">{fmt(p.recYpg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}