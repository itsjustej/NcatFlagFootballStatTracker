import React from "react";

// Icon for each action
const getActionIcon = (action) => {
  switch (action) {
    case "2PT_MAKE": return "🏀";
    case "3PT_MAKE": return "🎯";
    case "FT_MAKE": return "👍";
    case "2PT_MISS": return "❌";
    case "3PT_MISS": return "🧱";
    case "FT_MISS": return "👎";
    case "REBOUND": return "⬆️";
    case "ASSIST": return "🤝";
    case "STEAL": return "🦾";
    case "BLOCK": return "🚫";
    case "TURNOVER": return "❓";
    case "FOUL": return "⚠️";
    default: return "⚡";
  }
};

// Display stats next to a play
const getStatDisplay = (action, stats) => {
  if (!stats) return "";

  switch (action) {
    case "2PT_MAKE":
    case "3PT_MAKE":
    case "FT_MAKE":
      return stats.points ? `(${stats.points} pts)` : "";
    case "REBOUND":
      return stats.rebounds ? `(${stats.rebounds} reb)` : "";
    case "ASSIST":
      return stats.assists ? `(${stats.assists} ast)` : "";
    case "STEAL":
      return stats.steals ? `(${stats.steals} stl)` : "";
    case "BLOCK":
      return stats.blocks ? `(${stats.blocks} blk)` : "";
    case "TURNOVER":
      return stats.turnovers ? `(${stats.turnovers} TO)` : "";
    case "FOUL":
      return stats.fouls ? `(${stats.fouls} fouls)` : "";
    default:
      return "";
  }
};

export default function PlayByPlayLog({ playByPlay }) {
  if (!Array.isArray(playByPlay)) {
    return <div className="text-gray-400">No play-by-play available.</div>;
  }

  // Normalize so nothing crashes
  const normalized = playByPlay.map((p, idx) => ({
    id: p.id ?? idx,
    quarter: p.quarter ?? 1,
    team: p.team ?? "A",
    player: p.player ?? "Unknown Player",
    action: p.action ?? "Action",
    teamAScoreAfter: p.teamAScoreAfter ?? "-",
    teamBScoreAfter: p.teamBScoreAfter ?? "-",
    playerCurrentStats: p.playerCurrentStats ?? {} // safe fallback
  }));

  // Group by quarter
  const grouped = {};
  normalized.forEach((p) => {
    if (!grouped[p.quarter]) grouped[p.quarter] = [];
    grouped[p.quarter].push(p);
  });

  return (
    <div className="space-y-6">
      {Object.keys(grouped)
        .map(Number)
        .sort((a, b) => a - b)
        .map((quarter) => (
          <div key={quarter} className="space-y-3">
            {/* Quarter Header */}
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="bg-slate-800 px-4 py-1 rounded-full">Q{quarter}</span>
              <div className="flex-1 h-[1px] bg-slate-600"></div>
            </h2>

            {/* Plays */}
            <div className="space-y-2">
              {grouped[quarter].map((play) => (
                <div
                  key={play.id}
                  className={`p-4 rounded-lg border-l-4 shadow-sm flex justify-between
                    ${play.team === "A"
                      ? "bg-slate-800 border-blue-500"
                      : "bg-slate-800 border-yellow-500"
                    }`}
                >
                  {/* Icon + Text */}
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{getActionIcon(play.action)}</span>
                    <div>
                      <p className="font-semibold text-white">
                        {play.player}{" "}
                        <span className="text-slate-400">
                          {getStatDisplay(play.action, play.playerCurrentStats)}
                        </span>
                      </p>
                      <p className="text-slate-400 text-sm">
                        {play.action.replace("_", " ")}
                      </p>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <p className="text-white text-lg font-bold">
                      {play.teamAScoreAfter} - {play.teamBScoreAfter}
                    </p>
                    <p className="text-slate-400 text-xs">Team {play.team}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
