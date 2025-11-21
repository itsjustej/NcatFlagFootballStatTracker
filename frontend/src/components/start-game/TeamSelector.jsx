import React from "react";

export default function TeamSelector({
  teams,
  teamA,
  teamB,
  onTeamASelect,
  onTeamBSelect,
  onNext,
  isLoading = false,
}) {
  // Convert named colors
  const normalizeColor = (c) => {
    if (!c) return "#64748b";
    const map = {
      Blue: "#3b82f6",
      Red: "#ef4444",
      Green: "#22c55e",
      Yellow: "#eab308",
      Purple: "#8b5cf6",
      Orange: "#f97316",
    };
    return map[c] || c;
  };

  const safePlayers = (team) => {
    if (!team || !Array.isArray(team.Players)) return [];
    return team.Players.filter(Boolean); // remove null entries
  };

  return (
    <div className="space-y-10">
      <div className="grid md:grid-cols-2 gap-12">
        
        {/* ----------------- TEAM A ----------------- */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Team A</h2>

          <select
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white mb-4"
            value={teamA?.TeamID || ""}
            onChange={(e) => {
              const selected = teams.find(
                (t) => t.TeamID === Number(e.target.value)
              );
              onTeamASelect(selected || null);
            }}
          >
            <option value="">Select Team A</option>

            {teams.map((team) => (
              <option
                key={team.TeamID}
                value={team.TeamID}
                disabled={teamB && teamB.TeamID === team.TeamID}
              >
                {team.TeamName}
              </option>
            ))}
          </select>

          {/* ROSTER */}
          {teamA && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: normalizeColor(teamA.TeamColor) }}
                ></span>
                {teamA.TeamName}
              </h3>

              <ul className="text-slate-300 text-sm space-y-1">
                {safePlayers(teamA).map((p) => (
                  <li key={p.PlayerID}>• {p.PlayerName}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ----------------- TEAM B ----------------- */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Team B</h2>

          <select
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white mb-4"
            value={teamB?.TeamID || ""}
            onChange={(e) => {
              const selected = teams.find(
                (t) => t.TeamID === Number(e.target.value)
              );
              onTeamBSelect(selected || null);
            }}
          >
            <option value="">Select Team B</option>

            {teams.map((team) => (
              <option
                key={team.TeamID}
                value={team.TeamID}
                disabled={teamA && teamA.TeamID === team.TeamID}
              >
                {team.TeamName}
              </option>
            ))}
          </select>

          {/* ROSTER */}
          {teamB && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: normalizeColor(teamB.TeamColor) }}
                ></span>
                {teamB.TeamName}
              </h3>

              <ul className="text-slate-300 text-sm space-y-1">
                {safePlayers(teamB).map((p) => (
                  <li key={p.PlayerID}>• {p.PlayerName}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

      </div>

      {/* Centered Start Button */}
      <div className="flex justify-center">
        <button
          onClick={onNext}
          disabled={isLoading}
          className={`px-6 py-3 rounded-lg transition font-semibold ${
            isLoading
              ? "bg-slate-500 text-slate-200 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {isLoading ? "Starting…" : "Start Game"}
        </button>
      </div>
    </div>
  );
}
