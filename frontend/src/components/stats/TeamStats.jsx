import React, { useState, useMemo, useEffect } from "react";
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

// This component now uses real stats from the backend

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
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState("");
  const [teamStats, setTeamStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState(null);

  // Match PlayerStats: load teams from API for dropdown
  useEffect(() => {
    fetch("http://localhost:5000/api/teams")
      .then((res) => res.json())
      .then((data) => {
        setTeams(data);
      })
      .catch((err) => console.error("Failed loading teams:", err));
  }, []);

  // Load team stats when a team is selected
  useEffect(() => {
    if (!teamId) {
      setTeamStats(null);
      return;
    }

    setLoadingStats(true);
    setStatsError(null);

    fetch(`http://localhost:5000/api/teams/stats/${teamId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load team stats");
        }
        return res.json();
      })
      .then((data) => {
        setTeamStats(data);
      })
      .catch((err) => {
        console.error("Failed loading team stats:", err);
        setStatsError(err.message || "Failed to load team stats");
      })
      .finally(() => setLoadingStats(false));
  }, [teamId]);

  const stats = teamStats;

  // Build line chart data
  const chartData = useMemo(() => {
    if (!stats) return [];
    if (!Array.isArray(stats.pointsAcrossGames)) return [];

    return stats.pointsAcrossGames.map((pf, i) => ({
      game: `G${i + 1}`,
      pf,
    }));
  }, [stats]);

  // 🚀 Compute dynamic Y-axis domain snapping to 20-point increments
  const { minY, maxY } = useMemo(() => {
    if (!stats) return { minY: 0, maxY: 0 };

    if (!Array.isArray(stats.pointsAcrossGames) || stats.pointsAcrossGames.length === 0) {
      return { minY: 0, maxY: 0 };
    }

    const allValues = [...stats.pointsAcrossGames];
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
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white appearance-none"
          >
            <option value="">-- Select a Team --</option>

            {teams.map((t) => (
              <option key={t.TeamID} value={t.TeamID}>
                {t.TeamName}
              </option>
            ))}
          </select>

          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* No team selected */}
      {!teamId && (
        <p className="text-slate-400">Choose a team to view team stats.</p>
      )}

      {/* Loading stats */}
      {teamId && loadingStats && (
        <p className="text-slate-400">Loading team stats…</p>
      )}

      {/* Stats error */}
      {teamId && !loadingStats && statsError && (
        <p className="text-red-400">Error: {statsError}</p>
      )}

      {/* Team selected but no stats yet */}
      {teamId && !loadingStats && !statsError && !stats && (
        <p className="text-slate-400">
          No stats available yet for this team.
        </p>
      )}

      {/* Show stats only when we have demo data for that team */}
      {stats && (
        <>
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
            <h3 className="text-lg text-white font-bold mb-4">Team Points Across Games</h3>

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
                  name="Points Per Game"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
