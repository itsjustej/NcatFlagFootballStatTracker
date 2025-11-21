import React, { useEffect, useState } from "react";

export default function PlayerStats() {
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState("");
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);

  // ----------------------------
  // Load teams for the dropdown
  // ----------------------------
  useEffect(() => {
    fetch("http://localhost:5000/api/teams")
      .then((res) => res.json())
      .then((data) => {
        setTeams(data);
      })
      .catch((err) => console.error("Failed loading teams:", err));
  }, []);

  // ----------------------------
  // Load player stats when team changes
  // ----------------------------
  useEffect(() => {
    if (!teamId) return;

    setLoading(true);

    fetch(`http://localhost:5000/api/players/stats/${teamId}`)
      .then((res) => res.json())
      .then((data) => {
        setPlayers(data);
      })
      .catch((err) => console.error("Failed loading player stats:", err))
      .finally(() => setLoading(false));
  }, [teamId]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Player Statistics</h2>

      {/* Team Dropdown */}
      <div>
        <label className="text-slate-300 text-sm">Select Team</label>
        <select
          className="w-full mt-2 p-3 rounded bg-slate-800 border border-slate-700 text-white"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
        >
          <option value="">-- Select a Team --</option>

          {teams.map((t) => (
            <option key={t.TeamID} value={t.TeamID}>
              {t.TeamName}
            </option>
          ))}
        </select>
      </div>

      {/* No team selected */}
      {!teamId && (
        <p className="text-slate-400">Choose a team to view player stats.</p>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-slate-300 animate-pulse">
          Loading player stats...
        </div>
      )}

      {/* No players */}
      {teamId && !loading && players.length === 0 && (
        <p className="text-slate-400">No stats available for this team.</p>
      )}

      {/* Stats Table */}
      {!loading && players.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800">
                <th className="p-3 text-slate-300">Player</th>
                <th className="p-3 text-slate-300">PPG</th>
                <th className="p-3 text-slate-300">RPG</th>
                <th className="p-3 text-slate-300">APG</th>
                <th className="p-3 text-slate-300">SPG</th>
                <th className="p-3 text-slate-300">BPG</th>
                <th className="p-3 text-slate-300">TOV</th>
                <th className="p-3 text-slate-300">FG%</th>
                <th className="p-3 text-slate-300">3P%</th>
                <th className="p-3 text-slate-300">FT%</th>
              </tr>
            </thead>

            <tbody>
              {players.map((p) => (
                <tr
                  key={p.PlayerID}
                  className="border-b border-slate-700 hover:bg-slate-800/60"
                >
                  <td className="p-3 text-white">{p.PlayerName}</td>

                  <td className="p-3 text-slate-300">{p.ppg.toFixed(1)}</td>
                  <td className="p-3 text-slate-300">{p.rpg.toFixed(1)}</td>
                  <td className="p-3 text-slate-300">{p.apg.toFixed(1)}</td>
                  <td className="p-3 text-slate-300">{p.spg.toFixed(1)}</td>
                  <td className="p-3 text-slate-300">{p.bpg.toFixed(1)}</td>
                  <td className="p-3 text-slate-300">{p.tov.toFixed(1)}</td>

                  <td className="p-3 text-slate-300">
                    {(p.fgPct * 100).toFixed(1)}%
                  </td>
                  <td className="p-3 text-slate-300">
                    {(p.threePct * 100).toFixed(1)}%
                  </td>
                  <td className="p-3 text-slate-300">
                    {(p.ftPct * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
