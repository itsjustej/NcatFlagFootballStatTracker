import React from "react";
import { ChevronDown } from "lucide-react";

export default function TeamSelector({
  teams,
  teamA,
  teamB,
  onTeamASelect,
  onTeamBSelect,
  onNext,
}) {
  return (
    <div className="space-y-12">
      {/* 2-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* TEAM A */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-3">Team A</h2>

          {/* Dropdown */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="relative">
              <select
                className="w-full bg-slate-800 text-white text-lg p-3 rounded-lg border border-slate-700 appearance-none cursor-pointer"
                value={teamA?.id || ""}
                onChange={(e) => {
                  const team = teams.find((t) => t.id === e.target.value);
                  onTeamASelect(team);
                }}
              >
                <option value="" disabled>
                  Select Team A
                </option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>

              <ChevronDown className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* ROSTER PREVIEW */}
          {teamA && (
            <div className="mt-4 bg-slate-800 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-8 h-8 rounded-md"
                  style={{ backgroundColor: teamA.color }}
                />
                <h3 className="text-lg font-bold text-white">{teamA.name}</h3>
              </div>

              <ul className="text-slate-300 space-y-1">
                {teamA.players.map((p) => (
                  <li key={p.id}>
                    #{p.jerseyNumber} {p.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* TEAM B */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-3">Team B</h2>

          {/* Dropdown */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="relative">
              <select
                className="w-full bg-slate-800 text-white text-lg p-3 rounded-lg border border-slate-700 appearance-none cursor-pointer"
                value={teamB?.id || ""}
                onChange={(e) => {
                  const team = teams.find((t) => t.id === e.target.value);
                  onTeamBSelect(team);
                }}
              >
                <option value="" disabled>
                  Select Team B
                </option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>

              <ChevronDown className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* ROSTER PREVIEW */}
          {teamB && (
            <div className="mt-4 bg-slate-800 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-8 h-8 rounded-md"
                  style={{ backgroundColor: teamB.color }}
                />
                <h3 className="text-lg font-bold text-white">{teamB.name}</h3>
              </div>

              <ul className="text-slate-300 space-y-1">
                {teamB.players.map((p) => (
                  <li key={p.id}>
                    #{p.jerseyNumber} {p.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* NEXT BUTTON */}
      <div className="flex justify-end pt-6">
        <button
          disabled={!teamA || !teamB}
          onClick={onNext}
          className={`px-6 py-3 rounded-lg font-semibold transition ${
            teamA && teamB
              ? "bg-orange-600 text-white hover:bg-orange-500"
              : "bg-slate-700 text-slate-500 cursor-not-allowed"
          }`}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
