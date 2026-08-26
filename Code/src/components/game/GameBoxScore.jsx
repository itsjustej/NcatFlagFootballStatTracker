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

function PlayerTable({ players }) {
  const rows = players.filter((p) => p.hasStats);
  if (rows.length === 0) {
    return <p className="px-4 py-6 text-slate-500 text-sm text-center">No player stats yet.</p>;
  }

  return (
    <div className="overflow-x-auto overscroll-x-contain scroll-smooth [-webkit-overflow-scrolling:touch]">
      <table className="w-max min-w-full text-left text-sm border-collapse">
        <thead>
          <tr className="bg-slate-900 border-b border-slate-700 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <th className="px-3 py-2 sticky left-0 bg-slate-900 z-10 min-w-[120px]">Player</th>
            <th className="px-2 py-2 text-center border-l border-slate-700 text-blue-400">C/ATT</th>
            <th className="px-2 py-2 text-center text-blue-400">P Yds</th>
            <th className="px-2 py-2 text-center text-blue-400">P TD</th>
            <th className="px-2 py-2 text-center text-blue-400">INT</th>
            <th className="px-2 py-2 text-center border-l border-slate-700 text-green-400">CAR</th>
            <th className="px-2 py-2 text-center text-green-400">R Yds</th>
            <th className="px-2 py-2 text-center text-green-400">R TD</th>
            <th className="px-2 py-2 text-center border-l border-slate-700 text-yellow-400">REC</th>
            <th className="px-2 py-2 text-center text-yellow-400">C Yds</th>
            <th className="px-2 py-2 text-center text-yellow-400">C TD</th>
            <th className="px-2 py-2 text-center border-l border-slate-700 text-red-400">INT</th>
            <th className="px-2 py-2 text-center text-red-400 pr-3">FP</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, idx) => (
            <tr
              key={p.player_id}
              className={`border-b border-slate-700/70 ${idx % 2 === 0 ? 'bg-slate-900/70' : 'bg-slate-800/40'}`}
            >
              <td className={`px-3 py-2 font-medium text-white sticky left-0 z-10 ${idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-800'}`}>
                {p.name}
              </td>
              <td className="px-2 py-2 text-center tabular-nums text-slate-300 border-l border-slate-700/80">
                {p.passCompletions}/{p.passAttempts}
              </td>
              <td className="px-2 py-2 text-center tabular-nums text-slate-300">{p.passingYards}</td>
              <td className="px-2 py-2 text-center tabular-nums text-slate-300">{p.passingTDs}</td>
              <td className="px-2 py-2 text-center tabular-nums text-slate-300">{p.interceptionsThrown}</td>
              <td className="px-2 py-2 text-center tabular-nums text-slate-300 border-l border-slate-700/80">{p.carries}</td>
              <td className="px-2 py-2 text-center tabular-nums text-slate-300">{p.rushingYards}</td>
              <td className="px-2 py-2 text-center tabular-nums text-slate-300">{p.rushingTDs}</td>
              <td className="px-2 py-2 text-center tabular-nums text-slate-300 border-l border-slate-700/80">{p.receptions}</td>
              <td className="px-2 py-2 text-center tabular-nums text-slate-300">{p.receivingYards}</td>
              <td className="px-2 py-2 text-center tabular-nums text-slate-300">{p.receivingTDs}</td>
              <td className="px-2 py-2 text-center tabular-nums text-slate-300 border-l border-slate-700/80">{p.interceptions}</td>
              <td className="px-2 py-2 text-center tabular-nums text-slate-300 pr-3">{p.flagPulls}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GameBoxScore({
  homeName,
  awayName,
  homeStats,
  awayStats,
  homePlayers,
  awayPlayers,
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
        <div className="px-4 py-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Team Stats</h2>
        </div>
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
    </div>
  );
}
