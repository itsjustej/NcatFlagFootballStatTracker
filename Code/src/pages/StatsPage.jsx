import React, { useState } from "react";
import { BarChart3, Users, Trophy } from "lucide-react";

import TeamStats from "../components/stats/TeamStats";
import PlayerStats from "../components/stats/PlayerStats";
import LeagueLeaders from "../components/stats/LeagueLeaders";
import StandingsTicker from "../components/stats/StandingsTicker";

export default function StatsPage() {
  const [tab, setTab] = useState("team");
  const [standingsExpanded, setStandingsExpanded] = useState(() => {
    try {
      return localStorage.getItem("standingsTickerMinimized") !== "true";
    } catch {
      return true;
    }
  });

  return (
    <div className={`min-h-[100dvh] bg-slate-900 pt-4 sm:pt-5 px-4 transition-[padding] duration-300 ${
      standingsExpanded ? "pb-28 sm:pb-24" : "pb-20"
    }`}>
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-10">

        <header>
          <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">Season Statistics</h1>
          <p className="text-slate-400 text-sm sm:text-base">
            View team-wide stats, player breakdowns, and league leaders.
          </p>
        </header>

        <div className="flex flex-col sm:flex-row bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <StatsTab label="Team Stats" shortLabel="Teams" icon={BarChart3} active={tab === "team"} onClick={() => setTab("team")} />
          <StatsTab label="Player Stats" shortLabel="Players" icon={Users} active={tab === "players"} onClick={() => setTab("players")} />
          <StatsTab label="League Leaders" shortLabel="Leaders" icon={Trophy} active={tab === "leaders"} onClick={() => setTab("leaders")} />
        </div>

        <section className="bg-slate-800 border border-slate-700 rounded-xl p-3 sm:p-6 overflow-x-auto">
          {tab === "team" && <TeamStats />}
          {tab === "players" && <PlayerStats />}
          {tab === "leaders" && <LeagueLeaders />}
        </section>

      </div>

      <StandingsTicker onExpandedChange={setStandingsExpanded} />
    </div>
  );
}

function StatsTab({ label, shortLabel, icon: Icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 text-sm font-medium transition min-h-[44px]
      ${active ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-700"}`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="sm:hidden">{shortLabel}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}