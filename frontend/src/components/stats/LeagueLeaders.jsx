import React, { useEffect, useState } from "react";

// Safe formatter
const fmt = (val, digits = 1) =>
  typeof val === "number" && !isNaN(val) ? val.toFixed(digits) : "0.0";

// UI Card for each category
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
              <div className="w-6 text-center font-bold text-white">
                {index + 1}
              </div>
              <div className="text-slate-300">{player.PlayerName}</div>
            </div>

            <div className="text-white font-semibold">
              {isRatio
                ? fmt(player.AstToRatio, 2)
                : fmt(player[statKey])}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LeagueLeaders() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5000/api/league-leaders")
      .then((res) => res.json())
      .then((data) => {
        // 🔥 Convert all SQL string results into numbers
        const normalized = data.map((p) => ({
          ...p,
          PPG: Number(p.PPG),
          RPG: Number(p.RPG),
          APG: Number(p.APG),
          SPG: Number(p.SPG),
          BPG: Number(p.BPG),
          TOPG: Number(p.TOPG),
        }));

        // 🔥 Add AST/TOV ratio
        const withRatio = normalized.map((p) => ({
          ...p,
          AstToRatio: p.TOPG === 0 ? p.APG : p.APG / p.TOPG,
        }));

        setLeaders(withRatio);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load league leaders:", err);
        setLoading(false);
      });
  }, []);

  if (loading)
    return (
      <p className="text-slate-400 text-center py-6">
        Loading league leaders…
      </p>
    );

  if (!leaders.length)
    return (
      <p className="text-slate-400 text-center py-6">
        No player stats available yet.
      </p>
    );

  // Categories to show
  const categories = [
    { title: "Points Per Game", key: "PPG" },
    { title: "Rebounds Per Game", key: "RPG" },
    { title: "Assists Per Game", key: "APG" },
    { title: "Steals Per Game", key: "SPG" },
    { title: "Blocks Per Game", key: "BPG" },
  ];

  // Get top 5 for a stat
  const topFive = (key) =>
    [...leaders]
      .filter((p) => typeof p[key] === "number" && !isNaN(p[key]))
      .sort((a, b) => b[key] - a[key])
      .slice(0, 5);

  // Top 5 AST/TOV ratio
  const topFiveRatio = [...leaders]
    .sort((a, b) => b.AstToRatio - a.AstToRatio)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-white">League Leaders</h2>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map(({ title, key }) => (
          <LeaderCard
            key={key}
            title={title}
            statKey={key}
            leaders={topFive(key)}
          />
        ))}

        <LeaderCard
          title="Assist to Turnover Ratio"
          statKey="AstToRatio"
          leaders={topFiveRatio}
          isRatio={true}
        />
      </div>
    </div>
  );
}
