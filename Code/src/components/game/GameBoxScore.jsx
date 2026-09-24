import { useState } from "react";

function fmtPct(val) {
  if (typeof val !== 'number' || Number.isNaN(val)) return '—';
  return `${val.toFixed(1)}%`;
}

function CmpRow({ label, home, away, higherIsBetter = true }) {
  const homeNum = typeof home === 'number' ? home : null;
  const awayNum = typeof away === 'number' ? away : null;
  const homeWins = homeNum != null && awayNum != null && homeNum !== awayNum
    ? (higherIsBetter ? homeNum > awayNum : homeNum < awayNum)
    : false;
  const awayWins = homeNum != null && awayNum != null && homeNum !== awayNum
    ? (higherIsBetter ? awayNum > homeNum : awayNum < homeNum)
    : false;

  return (
    <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-700/50 last:border-0 items-center">
      <span className={`text-right tabular-nums text-sm ${homeWins ? 'text-white font-bold' : 'text-slate-300'}`}>
        {home}
      </span>
      <span className="text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span className={`text-left tabular-nums text-sm ${awayWins ? 'text-white font-bold' : 'text-slate-300'}`}>
        {away}
      </span>
    </div>
  );
}

const PLAYER_CATEGORIES = [
  {
    id: "passing",
    label: "Passing",
    columns: [
      { key: "comp", label: "C/ATT", render: (p) => `${p.passCompletions}/${p.passAttempts}` },
      { key: "passingYards", label: "Yds" },
      { key: "passingTDs", label: "TD" },
      { key: "interceptionsThrown", label: "INT" },
    ],
  },
  {
    id: "rushing",
    label: "Rushing",
    columns: [
      { key: "carries", label: "Car" },
      { key: "rushingYards", label: "Yds" },
      { key: "rushingTDs", label: "TD" },
    ],
  },
  {
    id: "receiving",
    label: "Receiving",
    columns: [
      { key: "receptions", label: "Rec" },
      { key: "receivingYards", label: "Yds" },
      { key: "receivingTDs", label: "TD" },
    ],
  },
  {
    id: "defense",
    label: "Defense",
    columns: [
      { key: "interceptions", label: "INT" },
      { key: "flagPulls", label: "FP" },
      { key: "flagPullsForLoss", label: "FPL" },
    ],
  },
];

function PlayerTable({ players }) {
  const [category, setCategory] = useState("passing");
  const active = PLAYER_CATEGORIES.find((item) => item.id === category) ?? PLAYER_CATEGORIES[0];
  const rows = players.filter((p) => p.hasStats);
  const playerCol = "w-[9.5rem] min-w-[9.5rem] max-w-[9.5rem] box-border";

  if (rows.length === 0) {
    return <p className="px-4 py-6 text-slate-500 text-sm text-center">No player stats yet.</p>;
  }

  return (
    <>
      <div className="flex gap-1 overflow-x-auto px-3 py-3 border-b border-slate-700">
        {PLAYER_CATEGORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setCategory(item.id)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              category === item.id
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto overscroll-x-contain scroll-smooth [-webkit-overflow-scrolling:touch]">
        <table className="w-full min-w-[20rem] text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-800 border-b border-slate-700 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <th className={`px-3 py-2 sticky left-0 z-10 bg-slate-800 text-left ${playerCol}`}>Player</th>
              {active.columns.map((col, index) => (
                <th
                  key={col.key}
                  className={`px-2 py-2 text-center whitespace-nowrap ${index === 0 ? "border-l border-slate-600" : ""} ${index === active.columns.length - 1 ? "pr-3" : ""}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p, idx) => (
              <tr
                key={p.player_id}
                className={`border-b border-slate-700/70 ${idx % 2 === 0 ? "bg-slate-900/70" : "bg-slate-800/40"}`}
              >
                <td className={`px-3 py-2 font-medium text-white sticky left-0 z-10 whitespace-nowrap shadow-[4px_0_10px_-4px_rgba(0,0,0,0.65)] ${playerCol} ${idx % 2 === 0 ? "bg-slate-900" : "bg-slate-800"}`}>
                  {p.name}
                </td>
                {active.columns.map((col, index) => (
                  <td
                    key={col.key}
                    className={`px-2 py-2 text-center tabular-nums text-slate-300 whitespace-nowrap ${index === 0 ? "border-l border-slate-700/80" : ""} ${index === active.columns.length - 1 ? "pr-3" : ""}`}
                  >
                    {col.render ? col.render(p) : p[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function GameBoxScore({
  homeName,
  awayName,
  homeStats,
  awayStats,
  homePlayers,
  awayPlayers,
  view = "all",
}) {
  const [side, setSide] = useState("home");
  const showTeam = view === "all" || view === "team";
  const showPlayers = view === "all" || view === "players";
  const playerName = side === "home" ? homeName : awayName;
  const playerRows = side === "home" ? homePlayers : awayPlayers;

  return (
    <div className="space-y-6">
      {showTeam && (
      <div className={view === "all" ? "rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden" : ""}>
        {view === "all" && (
          <div className="px-4 py-4 border-b border-slate-700">
            <h2 className="text-xl font-bold text-white">Team Stats</h2>
          </div>
        )}
        <div className="px-4 py-3">
          <div className="grid grid-cols-3 gap-2 pb-2 mb-1 border-b border-slate-700">
            <span className="text-right text-xs font-black uppercase tracking-widest text-blue-400 truncate">{homeName}</span>
            <span />
            <span className="text-left text-xs font-black uppercase tracking-widest text-[#C9A84C] truncate">{awayName}</span>
          </div>
          <CmpRow label="Total Yds" home={homeStats.totalYards} away={awayStats.totalYards} />
          <CmpRow label="Pass Yds" home={homeStats.passYards} away={awayStats.passYards} />
          <CmpRow label="Rush Yds" home={homeStats.rushYards} away={awayStats.rushYards} />
          <CmpRow
            label="Comp"
            home={`${homeStats.passCompletions}/${homeStats.passAttempts}`}
            away={`${awayStats.passCompletions}/${awayStats.passAttempts}`}
          />
          <CmpRow label="Comp %" home={fmtPct(homeStats.completionPct)} away={fmtPct(awayStats.completionPct)} />
          <CmpRow label="Pass TD" home={homeStats.passingTDs} away={awayStats.passingTDs} />
          <CmpRow label="Rush TD" home={homeStats.rushingTDs} away={awayStats.rushingTDs} />
          <CmpRow label="INT" home={homeStats.interceptionsThrown} away={awayStats.interceptionsThrown} higherIsBetter={false} />
          <CmpRow
            label="3rd Down"
            home={`${homeStats.thirdDownConversions}/${homeStats.thirdDownAttempts}`}
            away={`${awayStats.thirdDownConversions}/${awayStats.thirdDownAttempts}`}
          />
          <CmpRow label="Success" home={fmtPct(homeStats.successRate)} away={fmtPct(awayStats.successRate)} />
          <CmpRow label="Expl." home={homeStats.explosivePlays} away={awayStats.explosivePlays} />
        </div>
      </div>
      )}

      {showPlayers && view === "all" && (
        <>
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
            <div className="px-4 py-4 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">{homeName}</h2>
              <p className="text-slate-400 text-sm mt-0.5">Player stats</p>
            </div>
            <PlayerTable players={homePlayers} />
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
            <div className="px-4 py-4 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">{awayName}</h2>
              <p className="text-slate-400 text-sm mt-0.5">Player stats</p>
            </div>
            <PlayerTable players={awayPlayers} />
          </div>
        </>
      )}

      {showPlayers && view === "players" && (
        <div>
          <div className="flex gap-2 px-4 py-3 border-b border-slate-700">
            {[
              { id: "home", name: homeName },
              { id: "away", name: awayName },
            ].map((team) => (
              <button
                key={team.id}
                type="button"
                onClick={() => setSide(team.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  side === team.id
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                {team.name}
              </button>
            ))}
          </div>
          <div className="px-4 pt-3 pb-1">
            <h2 className="text-lg font-bold text-white">{playerName}</h2>
            <p className="text-slate-400 text-sm">Player stats</p>
          </div>
          <PlayerTable players={playerRows} />
        </div>
      )}
    </div>
  );
}
