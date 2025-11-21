import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar
} from "recharts";
import { ChevronDown } from "lucide-react";

// ---------------- DEMO DATA ---------------- //

const DEMO_TEAMS = [
  { id: "1", name: "Lakers" },
  { id: "2", name: "Celtics" },
  { id: "3", name: "Warriors" },
];

const DEMO_TEAM_STATS = {
  "1": {
    games: 10,
    wins: 6,
    losses: 4,
    ppg: 112.5,
    rpg: 45.3,
    apg: 28.1,
    spg: 8.2,
    bpg: 5.1,
    tpg: 14.4,
    fgp: 47.2,
    threepp: 35.8,
    ftp: 78.5,
    pointsAcrossGames: [110, 102, 118, 120, 115, 130, 125, 118, 111, 128],
    pointsAgainstGames: [101, 98, 115, 103, 107, 129, 121, 112, 109, 120],
  },

  "2": {
    games: 10,
    wins: 8,
    losses: 2,
    ppg: 115.3,
    rpg: 46.8,
    apg: 26.5,
    spg: 8.9,
    bpg: 5.8,
    tpg: 12.1,
    fgp: 48.1,
    threepp: 37.2,
    ftp: 79.1,
    pointsAcrossGames: [118, 114, 120, 113, 119, 132, 129, 121, 110, 135],
    pointsAgainstGames: [101, 100, 122, 110, 105, 130, 120, 111, 104, 129],
  },

  "3": {
    games: 10,
    wins: 7,
    losses: 3,
    ppg: 118.2,
    rpg: 42.1,
    apg: 30.2,
    spg: 7.5,
    bpg: 4.9,
    tpg: 13.1,
    fgp: 49.5,
    threepp: 38.5,
    ftp: 80.2,
    pointsAcrossGames: [121, 119, 128, 115, 117, 140, 132, 126, 118, 134],
    pointsAgainstGames: [108, 112, 119, 109, 101, 138, 124, 121, 120, 131],
  },
};

// ---------------- DONUT FIXED ---------------- //

function Donut({ title, value, color }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 flex flex-col items-center">
      <h3 className="text-white font-bold mb-2">{title}</h3>

      <ResponsiveContainer width="100%" height={220}>
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="70%"
          outerRadius="100%"
          startAngle={90}
          endAngle={90 - (value / 100) * 360}
          barSize={18}
          data={[{ value }]}
        >
          <RadialBar dataKey="value" fill={color} background={{ fill: "#1e293b" }} />
        </RadialBarChart>
      </ResponsiveContainer>

      <p className="text-xl font-bold text-white mt-2">{value.toFixed(1)}%</p>
    </div>
  );
}

// ---------------- STATS CARD ---------------- //

function StatCard({ label, value, color }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 text-center">
      <p className="text-slate-400 text-sm mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value.toFixed(1)}</p>
    </div>
  );
}

// ---------------- MAIN COMPONENT ---------------- //

export default function TeamStats() {
  const [selectedTeam, setSelectedTeam] = useState("1");
  const stats = DEMO_TEAM_STATS[selectedTeam];

  // Build line chart data
  const chartData = useMemo(() => {
    return stats.pointsAcrossGames.map((pf, i) => ({
      game: `G${i + 1}`,
      pf,
      pa: stats.pointsAgainstGames[i],
    }));
  }, [stats]);

  // 🚀 Compute dynamic Y-axis domain snapping to 20-point increments
  const { minY, maxY } = useMemo(() => {
    const allValues = [...stats.pointsAcrossGames, ...stats.pointsAgainstGames];
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);

    // Snap down/up to nearest 20
    const snappedMin = Math.floor(min / 20) * 20;
    const snappedMax = Math.ceil(max / 20) * 20;

    return {
      minY: snappedMin,
      maxY: snappedMax,
    };
  }, [stats]);

  return (
    <div className="space-y-10">

      {/* Team Selector */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">
          Select Team
        </label>

        <div className="relative inline-block w-full max-w-xs">
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white appearance-none"
          >
            {DEMO_TEAMS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* Top Row Stats */}
      <div className="grid md:grid-cols-6 gap-4">
        <StatCard label="PPG" value={stats.ppg} color="text-orange-500" />
        <StatCard label="RPG" value={stats.rpg} color="text-blue-400" />
        <StatCard label="APG" value={stats.apg} color="text-green-400" />
        <StatCard label="SPG" value={stats.spg} color="text-purple-400" />
        <StatCard label="BPG" value={stats.bpg} color="text-yellow-400" />
        <StatCard label="TPG" value={stats.tpg} color="text-red-400" />
      </div>

      {/* Donut Charts */}
      <div className="grid md:grid-cols-3 gap-6">
        <Donut title="FG%" value={stats.fgp} color="#6366f1" />
        <Donut title="3PT%" value={stats.threepp} color="#22c55e" />
        <Donut title="FT%" value={stats.ftp} color="#f59e0b" />
      </div>

      {/* Line Chart */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg text-white font-bold mb-4">Points Across Season</h3>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <XAxis dataKey="game" stroke="#94a3b8" hide={true} />

            <YAxis
              stroke="#94a3b8"
              domain={[minY, maxY]}
              tick={{ fill: "white" }}
            />

            <Legend wrapperStyle={{ color: "white" }} />

            <Line
              type="monotone"
              dataKey="pf"
              stroke="#f59e0b"
              strokeWidth={3}
              dot={{ r: 5 }}
              name="Points For"
            />

            <Line
              type="monotone"
              dataKey="pa"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 5 }}
              name="Points Against"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
