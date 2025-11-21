import React, { useState, useEffect } from "react";
import { BarChart3, Users, Trophy } from "lucide-react";

import TeamStats from "../components/stats/TeamStats";
import PlayerStats from "../components/stats/PlayerStats";
import LeagueLeaders from "../components/stats/LeagueLeaders";

export default function StatsPage() {
  const [tab, setTab] = useState("team");
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch league leaders ONLY when user switches to the tab
  useEffect(() => {
    if (tab !== "leaders") return;

    setLoading(true);
    fetch("http://localhost:5000/api/league-leaders")
      .then((res) => res.json())
      .then((data) => {
        setLeaders(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load league leaders:", err);
        setLoading(false);
      });

  }, [tab]);


  return (
    <div className="min-h-screen bg-slate-900 pt-20 pb-16 px-4">
      <div className="max-w-6xl mx-auto space-y-10">

        {/* Header */}
        <header>
          <h1 className="text-4xl font-bold text-white mb-2">Season Statistics</h1>
          <p className="text-slate-400">
            View team-wide stats, player breakdowns, and league leaders.
          </p>
        </header>

        {/* Tabs */}
        <div className="flex bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">

          <StatsTab
            label="Team Stats"
            icon={BarChart3}
            active={tab === "team"}
            onClick={() => setTab("team")}
          />

          <StatsTab
            label="Player Stats"
            icon={Users}
            active={tab === "players"}
            onClick={() => setTab("players")}
          />

          <StatsTab
            label="League Leaders"
            icon={Trophy}
            active={tab === "leaders"}
            onClick={() => setTab("leaders")}
          />

        </div>

        {/* Content */}
        <section className="bg-slate-800 border border-slate-700 rounded-xl p-6">

          {tab === "team" && <TeamStats />}

          {tab === "players" && <PlayerStats />}

          {tab === "leaders" && (
            loading ? (
              <p className="text-slate-300">Loading league leaders...</p>
            ) : (
              <LeagueLeaders data={leaders} />
            )
          )}

        </section>

      </div>
    </div>
  );
}


/* -------------------- Tab Component -------------------- */

function StatsTab({ label, icon: Icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition
      ${
        active
          ? "bg-blue-600 text-white"
          : "text-slate-400 hover:text-white hover:bg-slate-700"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}
