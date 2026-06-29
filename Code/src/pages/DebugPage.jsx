import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useLeague } from "../context/LeagueContext";
import {
  yardsGainedForPlay,
  isConverted,
  isFourthDownAttempt,
  isPassCompletionOutcome,
  isReceivingOutcome,
  isInterceptionOutcome,
  countConversionAttempts,
  countConversionMade,
  countPlayerInterceptions,
  countPassCompletions,
  isSuccessRatePlay,
  isOffenseSuccessful,
  isExplosiveYards,
  countExplosivePlays,
} from "../utils/statsHelpers";

const pct = (num, den) =>
  den > 0 ? ((num / den) * 100).toFixed(1) + "%" : "—";

const fmt = (val, digits = 1) =>
  typeof val === "number" && !isNaN(val) ? val.toFixed(digits) : "0.0";

const ratio = (num, den) => `${num}/${den}`;

// ─── Team stat computation ────────────────────────────────────────────────────

function computeTeamStats(tid, homeTeamId, plays, participants, games) {
  const harMap = {};
  for (const g of games) harMap[g.game_id] = g.home_attacks_right ?? true;
  const yg = (p) => yardsGainedForPlay(p, homeTeamId, harMap[p.game_id]);
  const converted = (p) => isConverted(p, homeTeamId, harMap[p.game_id]);
  // eslint-disable-next-line eqeqeq
  const offPlays = plays.filter(p => p.offense_team == tid && !p.is_conversion && p.play_type !== "penalty");
  // eslint-disable-next-line eqeqeq
  const defPlays = plays.filter(p => p.defense_team == tid && !p.is_conversion && p.play_type !== "penalty");

  // Scoring
  // eslint-disable-next-line eqeqeq
  const allOff = plays.filter(p => p.offense_team == tid);
  const points = allOff.reduce((s, p) => {
    if (p.outcome === "td") return s + 6;
    if (p.is_conversion && p.outcome === "complete") return s + (p.conv_points || 0);
    return s;
  }, 0);

  // Yards
  const passYards = offPlays
    .filter((p) => p.play_type === "pass" && isPassCompletionOutcome(p.outcome))
    .reduce((s, p) => s + yg(p), 0);
  const rushYards = offPlays
    .filter((p) => p.play_type === "rush")
    .reduce((s, p) => s + yg(p), 0);
  const totalYards = passYards + rushYards;
  const scrimmagePlays = offPlays.filter(isSuccessRatePlay);
  const ypp        = scrimmagePlays.length > 0 ? totalYards / scrimmagePlays.length : 0;

  const passAtt  = offPlays.filter(p => p.play_type === "pass").length;
  const passComp = countPassCompletions(offPlays.filter(p => p.play_type === "pass"));
  const passTDs  = offPlays.filter(p => p.play_type === "pass" && p.outcome === "td").length;
  const rushTDs  = offPlays.filter(p => p.play_type === "rush" && p.outcome === "td").length;

  const ints = defPlays.filter(p => isInterceptionOutcome(p.outcome)).length;

  // Success rate (recalculated from yard lines + down/distance)
  const successible = offPlays.filter(isSuccessRatePlay);
  const successful  = successible.filter(p => isOffenseSuccessful(p, homeTeamId, harMap[p.game_id]));
  const successRate = successible.length > 0
    ? (successful.length / successible.length) * 100
    : 0;

  const explosivePlays = countExplosivePlays(offPlays, p => homeTeamId, p => harMap[p.game_id]);

  // TFLs forced — rush plays that went backward with a defender participant
  const defRushTFLIds = new Set(
  defPlays
    .filter(p => (p.play_type === "rush" || p.play_type === "pass") 
      && p.outcome === "complete"
      && yg(p) < 0)
    .map(p => p.play_id)
);

  const tflsForced = [...defRushTFLIds].filter(pid =>
    participants.some(p => p.play_id === pid && p.role === "defender")
  ).length;

  const third  = offPlays.filter(p => p.down === 3);
  const fourth = offPlays.filter(isFourthDownAttempt);
  const thirdConv  = third.filter(converted).length;
  const fourthConv = fourth.filter(converted).length;

  const convPlays = plays.filter(p => p.offense_team == tid && p.is_conversion);
  const conv1Att  = countConversionAttempts(convPlays, participants, 1);
  const conv1Made = countConversionMade(convPlays, participants, 1);
  const conv2Att  = countConversionAttempts(convPlays, participants, 2);
  const conv2Made = countConversionMade(convPlays, participants, 2);
  const conv3Att  = countConversionAttempts(convPlays, participants, 3);
  const conv3Made = countConversionMade(convPlays, participants, 3);

  return {
    points, passYards, rushYards, totalYards, totalPlays: offPlays.length,
    ypp, passAtt, passComp, passTDs, rushTDs, ints,
    successRate, explosivePlays, tflsForced,
    thirdAtt: third.length, thirdConv,
    fourthAtt: fourth.length, fourthConv,
    conv1Att, conv1Made, conv2Att, conv2Made, conv3Att, conv3Made,
  };
}

// ─── Player stat computation ──────────────────────────────────────────────────

function computePlayerStats(playersData, homeTeamId, plays, participants, games) {
  const harMap = {};
  for (const g of games) harMap[g.game_id] = g.home_attacks_right ?? true;
  const yg = (p) => yardsGainedForPlay(p, homeTeamId, harMap[p.game_id]);
  return playersData.map((player) => {
    const pid = player.player_id;

    const byRole = (role) =>
      participants.filter(p => p.player_id === pid && p.role === role).map(p => p.play_id);

    const passerIds   = byRole("passer");
    const rusherIds   = byRole("rusher");
    const receiverIds = byRole("receiver");
    const defenderIds = byRole("defender");

    const get = ids => plays.filter(p => ids.includes(p.play_id));

    const passerData   = get(passerIds).filter(p => !p.is_conversion && p.play_type !== "penalty");
    const rusherData   = get(rusherIds).filter(p => !p.is_conversion && p.play_type !== "penalty");
    const receiverData = get(receiverIds).filter(p => !p.is_conversion && p.play_type !== "penalty");
    const defenderData = get(defenderIds).filter(p => !p.is_conversion && p.play_type !== "penalty");
    const convPasser   = get(passerIds).filter(p => p.is_conversion);
    const convReceiver = get(receiverIds).filter(p => p.is_conversion);

    const passAtt   = passerData.filter(p => p.play_type === "pass").length;
    const passComp  = countPassCompletions(passerData.filter(p => p.play_type === "pass"));
    const passYards = passerData
      .filter(p => p.play_type === "pass" && isPassCompletionOutcome(p.outcome))
      .reduce((s, p) => s + yg(p), 0);
    const passTDs   = passerData.filter(p => p.play_type === "pass" && p.outcome === "td").length;
    const intThrown = passerData.filter(p => isInterceptionOutcome(p.outcome)).length;
    const passExplosive = passerData
      .filter(p => p.play_type === "pass" && isPassCompletionOutcome(p.outcome) && isExplosiveYards(yg(p)))
      .length;

    const carries   = rusherData.length;
    const rushYards = rusherData.reduce((s, p) => s + yg(p), 0);
    const rushTDs   = rusherData.filter(p => p.outcome === "td").length;
    const rushExplosive = rusherData.filter(p => isExplosiveYards(yg(p))).length;

    const recs     = receiverData.filter(p => isReceivingOutcome(p.outcome)).length;
    const recYards = receiverData
      .filter(p => isReceivingOutcome(p.outcome))
      .reduce((s, p) => s + yg(p), 0);
    const recTDs   = receiverData.filter(p => p.outcome === "td").length;
    const recExplosive = receiverData
      .filter(p => isReceivingOutcome(p.outcome) && isExplosiveYards(yg(p)))
      .length;

    const intCaught = countPlayerInterceptions(pid, participants, plays);
    const flagPulls = defenderData.length;
    // After
const tflPulls = defenderData.filter(p =>
  (p.play_type === "rush" || (p.play_type === "pass" && p.outcome === "complete"))
  && yg(p) < 0
).length;

    const c1Thr = convPasser.filter(p => p.conv_points === 1 && p.outcome === 'complete').length;
    const c1Cau = convReceiver.filter(p => p.conv_points === 1 && p.outcome === 'complete').length;
    const c2Thr = convPasser.filter(p => p.conv_points === 2 && p.outcome === 'complete').length;
    const c2Cau = convReceiver.filter(p => p.conv_points === 2 && p.outcome === 'complete').length;
    const c3Thr = convPasser.filter(p => p.conv_points === 3 && p.outcome === 'complete').length;
    const c3Cau = convReceiver.filter(p => p.conv_points === 3 && p.outcome === 'complete').length;

    const hasActivity = passAtt + carries + recs + flagPulls + intCaught > 0;

    return {
      player_id: pid, name: player.name, hasActivity,
      passAtt, passComp, passYards, passTDs, intThrown, passExplosive,
      carries, rushYards, rushTDs, rushExplosive,
      recs, recYards, recTDs, recExplosive,
      intCaught, flagPulls, tflPulls,
      c1Thr, c1Cau, c2Thr, c2Cau, c3Thr, c3Cau,
    };
  }).filter(p => p.hasActivity);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCell({ label, value, highlight }) {
  return (
    <div className={`flex flex-col items-center p-2 rounded-lg ${highlight ? "bg-slate-700/60" : ""}`}>
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">{label}</span>
      <span className="text-white font-black text-sm tabular-nums">{value}</span>
    </div>
  );
}

function TeamBox({ name, color, s }) {
  if (!s) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ background: color }} />
        <span className="font-black text-white tracking-wide text-sm uppercase">{name}</span>
        <span className="ml-auto text-3xl font-black tabular-nums" style={{ color }}>{s.points}</span>
      </div>
      <div className="grid grid-cols-4 gap-1 border-t border-slate-700 pt-3">
        <StatCell label="Pass Yds"  value={s.passYards} />
        <StatCell label="Rush Yds"  value={s.rushYards} />
        <StatCell label="Total Yds" value={s.totalYards} highlight />
        <StatCell label="Plays"     value={s.totalPlays} />
        <StatCell label="Yds/Play"  value={fmt(s.ypp)} />
        <StatCell label="Success%"  value={fmt(s.successRate) + "%"} highlight />
        <StatCell label="Comp%"     value={pct(s.passComp, s.passAtt)} />
        <StatCell label="Comp/Att"  value={ratio(s.passComp, s.passAtt)} />
      </div>
      <div className="grid grid-cols-4 gap-1 border-t border-slate-700 pt-2">
        <StatCell label="Pass TDs" value={s.passTDs} />
        <StatCell label="Rush TDs" value={s.rushTDs} />
        <StatCell label="Explosive" value={s.explosivePlays} highlight />
        <StatCell label="INTs"     value={s.ints} />
        <StatCell label="TFLs"     value={s.tflsForced} />
      </div>
      <div className="grid grid-cols-2 gap-1 border-t border-slate-700 pt-2">
        <StatCell label="3rd Down" value={`${s.thirdConv}/${s.thirdAtt} ${pct(s.thirdConv, s.thirdAtt)}`} highlight />
        <StatCell label="4th Down" value={`${s.fourthConv}/${s.fourthAtt} ${pct(s.fourthConv, s.fourthAtt)}`} highlight />
      </div>
      <div className="grid grid-cols-3 gap-1 border-t border-slate-700 pt-2">
        <StatCell label="1-pt Conv" value={ratio(s.conv1Made, s.conv1Att)} />
        <StatCell label="2-pt Conv" value={ratio(s.conv2Made, s.conv2Att)} />
        <StatCell label="3-pt Conv" value={ratio(s.conv3Made, s.conv3Att)} />
      </div>
    </div>
  );
}

function PlayerRow({ p, color }) {
  return (
    <tr className="border-b border-slate-800 hover:bg-slate-700/20 text-xs">
      <td className="px-2 py-2 font-bold text-white whitespace-nowrap sticky left-0 bg-slate-900">
        <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: color }} />
        {p.name}
      </td>
      <td className="px-2 py-2 text-slate-300 text-center">{p.passYards}</td>
      <td className="px-2 py-2 text-slate-300 text-center">{ratio(p.passComp, p.passAtt)}</td>
      <td className="px-2 py-2 text-slate-300 text-center">{p.passTDs}</td>
      <td className="px-2 py-2 text-slate-300 text-center">{p.passExplosive}</td>
      <td className="px-2 py-2 text-slate-300 text-center">{p.intThrown}</td>
      <td className="px-2 py-2 text-slate-300 text-center border-l border-slate-700">{p.rushYards}</td>
      <td className="px-2 py-2 text-slate-300 text-center">{p.carries}</td>
      <td className="px-2 py-2 text-slate-300 text-center">{p.rushTDs}</td>
      <td className="px-2 py-2 text-slate-300 text-center">{p.rushExplosive}</td>
      <td className="px-2 py-2 text-slate-300 text-center border-l border-slate-700">{p.recYards}</td>
      <td className="px-2 py-2 text-slate-300 text-center">{p.recs}</td>
      <td className="px-2 py-2 text-slate-300 text-center">{p.recTDs}</td>
      <td className="px-2 py-2 text-slate-300 text-center">{p.recExplosive}</td>
      <td className="px-2 py-2 text-slate-300 text-center border-l border-slate-700">{p.intCaught}</td>
      <td className="px-2 py-2 text-slate-300 text-center">{p.flagPulls}</td>
      <td className="px-2 py-2 text-slate-300 text-center">{p.tflPulls}</td>
      <td className="px-2 py-2 text-slate-300 text-center border-l border-slate-700">{ratio(p.c1Cau, p.c1Thr)}</td>
      <td className="px-2 py-2 text-slate-300 text-center">{ratio(p.c2Cau, p.c2Thr)}</td>
      <td className="px-2 py-2 text-slate-300 text-center">{ratio(p.c3Cau, p.c3Thr)}</td>
    </tr>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DebugPage() {
  const { currentGameId } = useLeague();

  const [gameData, setGameData]         = useState(null);
  const [homeStats, setHomeStats]       = useState(null);
  const [awayStats, setAwayStats]       = useState(null);
  const [homePlayers, setHomePlayers]   = useState([]);
  const [awayPlayers, setAwayPlayers]   = useState([]);
  const [lastUpdate, setLastUpdate]     = useState(null);
  const [playCount, setPlayCount]       = useState(0);
  const [gameIdInput, setGameIdInput]   = useState("");
  const [resolvedGameId, setResolvedGameId] = useState(() => {
    const stored = localStorage.getItem("currentGameId");
    return stored ? Number(stored) : null;
  });

  useEffect(() => {
    if (currentGameId) setResolvedGameId(currentGameId);
  }, [currentGameId]);

  const refresh = useCallback(async (gid) => {
    if (!gid) return;

    const { data: gameRow } = await supabase
      .from("Game")
      .select("game_id, home_team, away_team, home_attacks_right, home:Team!home_team(team_id, name), away:Team!away_team(team_id, name)")
      .eq("game_id", gid)
      .single();

    if (!gameRow) return;

    const homeId = gameRow.home.team_id;
    const awayId = gameRow.away.team_id;

    const { data: plays } = await supabase
      .from("Play")
      .select("*")
      .eq("game_id", gid);

    const allPlays = plays || [];
    const playIds  = allPlays.map(p => p.play_id);

    let allParts = [];
    if (playIds.length > 0) {
      const { data: parts } = await supabase
        .from("Participants")
        .select("*")
        .in("play_id", playIds);
      allParts = parts || [];
    }

    const { data: homePData } = await supabase.from("Player").select("*").eq("team_id", homeId);
    const { data: awayPData } = await supabase.from("Player").select("*").eq("team_id", awayId);

    const games = [gameRow];

    setGameData({ homeId, awayId, homeName: gameRow.home.name, awayName: gameRow.away.name });
    setHomeStats(computeTeamStats(homeId, homeId, allPlays, allParts, games));
    setAwayStats(computeTeamStats(awayId, homeId, allPlays, allParts, games));
    setHomePlayers(computePlayerStats(homePData || [], homeId, allPlays, allParts, games));
    setAwayPlayers(computePlayerStats(awayPData || [], homeId, allPlays, allParts, games));
    setPlayCount(allPlays.length);
    setLastUpdate(new Date().toLocaleTimeString());
  }, []);

  useEffect(() => {
    if (resolvedGameId) refresh(resolvedGameId);
  }, [resolvedGameId, refresh]);

  useEffect(() => {
    if (!resolvedGameId) return;
    const handleChange = () => refresh(resolvedGameId);
    const channel = supabase
      .channel(`debug-${resolvedGameId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "Play",         filter: `game_id=eq.${resolvedGameId}` }, handleChange)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "Play",         filter: `game_id=eq.${resolvedGameId}` }, handleChange)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "Play"         }, handleChange)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "Participants" }, handleChange)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "Participants" }, handleChange)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [resolvedGameId, refresh]);

  const allPlayers = [
    ...homePlayers.map(p => ({ ...p, _team: "home" })),
    ...awayPlayers.map(p => ({ ...p, _team: "away" })),
  ];

  if (!resolvedGameId) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col gap-4 items-center">
          <p className="text-slate-400 text-sm font-mono">No active game — enter a Game ID</p>
          <div className="flex gap-2">
            <input
              type="number" value={gameIdInput}
              onChange={e => setGameIdInput(e.target.value)}
              placeholder="Game ID"
              className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white w-36 text-center font-mono focus:outline-none focus:border-blue-400"
            />
            <button
              onClick={() => setResolvedGameId(Number(gameIdInput))}
              className="px-4 py-2 bg-blue-600 rounded-lg font-bold text-white text-sm hover:bg-blue-700 transition-colors"
            >
              Load
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 border-b border-slate-700 pb-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Debug View</span>
          <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full font-bold">● LIVE</span>
          <span className="text-[10px] text-slate-600">Game #{resolvedGameId}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-slate-500">{playCount} plays · updated {lastUpdate}</span>
          <button
            onClick={() => refresh(resolvedGameId)}
            className="text-[10px] font-bold text-slate-400 hover:text-white border border-slate-600 hover:border-slate-400 px-2 py-1 rounded transition-colors"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {gameData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <TeamBox name={gameData.homeName} color="#3b82f6" s={homeStats} />
          <TeamBox name={gameData.awayName} color="#C9A84C" s={awayStats} />
        </div>
      )}

      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Player Box Score</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-700 text-[10px] uppercase tracking-widest text-slate-500">
                <th className="px-2 py-2 sticky left-0 bg-slate-900">Player</th>
                <th className="px-2 py-2 text-blue-400 text-center">Pass Yds</th>
                <th className="px-2 py-2 text-blue-400 text-center">Comp/Att</th>
                <th className="px-2 py-2 text-blue-400 text-center">Pass TD</th>
                <th className="px-2 py-2 text-blue-400 text-center">20+</th>
                <th className="px-2 py-2 text-blue-400 text-center">INT Thr</th>
                <th className="px-2 py-2 text-green-400 text-center border-l border-slate-700">Rush Yds</th>
                <th className="px-2 py-2 text-green-400 text-center">Car</th>
                <th className="px-2 py-2 text-green-400 text-center">Rush TD</th>
                <th className="px-2 py-2 text-green-400 text-center">20+</th>
                <th className="px-2 py-2 text-yellow-400 text-center border-l border-slate-700">Rec Yds</th>
                <th className="px-2 py-2 text-yellow-400 text-center">Rec</th>
                <th className="px-2 py-2 text-yellow-400 text-center">Rec TD</th>
                <th className="px-2 py-2 text-yellow-400 text-center">20+</th>
                <th className="px-2 py-2 text-red-400 text-center border-l border-slate-700">INT</th>
                <th className="px-2 py-2 text-red-400 text-center">FP</th>
                <th className="px-2 py-2 text-red-400 text-center">TFL</th>
                <th className="px-2 py-2 text-orange-400 text-center border-l border-slate-700">1pt</th>
                <th className="px-2 py-2 text-orange-400 text-center">2pt</th>
                <th className="px-2 py-2 text-orange-400 text-center">3pt</th>
              </tr>
            </thead>
            <tbody>
              {allPlayers.length === 0 ? (
                <tr><td colSpan={20} className="px-4 py-8 text-center text-slate-600 text-xs">No player activity yet</td></tr>
              ) : (
                allPlayers.map(p => (
                  <PlayerRow key={p.player_id} p={p} color={p._team === "home" ? "#3b82f6" : "#C9A84C"} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}