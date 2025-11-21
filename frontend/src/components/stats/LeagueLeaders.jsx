import React from "react";

// ---------------- Helpers ---------------- //

// Return top 5 by a DB stat field (descending)
function topFive(players, statKey) {
  return [...players]
    .sort((a, b) => (b[statKey] || 0) - (a[statKey] || 0))
    .slice(0, 5);
}

// Compute AST/TO ratio
function topFiveAstToRatio(players) {
  return [...players]
    .map((p) => ({
      ...p,
      ratio:
        p.TotalTurnovers === 0
          ? p.TotalAssists || 0
          : (p.TotalAssists || 0) / p.TotalTurnovers
    }))
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 5);
}

// ---------------- Card Component ---------------- //
function LeaderCard({ title, statKey, leaders, isRatio = false }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
      <h3 className="text-lg font-bold text-white mb-4">{title}</h3>

      <div className="space-y-3">
        {leaders.map((player, index) => (
          <div
            key={player.PlayerID}
            className="flex items-center justify-between p-2 rounded bg-slate-700/40"
          >
            <div className="flex items-center gap-3">
              <div className="w-6 text-center font-bold text-white">{index + 1}</div>
              <div className="text-slate-300">{player.PlayerName}</div>
            </div>

            <div className="text-white font-semibold">
              {isRatio
                ? Number(player.ratio || 0).toFixed(2)
                : Number(player[statKey] || 0).toFixed(1)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ---------------- Main Component ---------------- //
export default function LeagueLeaders({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-slate-300">No stats available.</p>;
  }

  const categories = [
    { title: "Points", key: "TotalPoints" },
    { title: "Rebounds", key: "TotalRebounds" },
    { title: "Assists", key: "TotalAssists" },
    { title: "Steals", key: "TotalSteals" },
    { title: "Blocks", key: "TotalBlocks" }
  ];

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-white">League Leaders</h2>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Normal Categories */}
        {categories.map(({ title, key }) => (
          <LeaderCard
            key={key}
            title={title}
            statKey={key}
            leaders={topFive(data, key)}
          />
        ))}

        {/* AST/TO Ratio */}
        <LeaderCard
          title="Assist / Turnover Ratio"
          statKey="ratio"
          leaders={topFiveAstToRatio(data)}
          isRatio={true}
        />
      </div>
    </div>
  );
}
