import React, { useState } from "react";
import { X } from "lucide-react";

export function MovePlayerDialog({ player, teamName, teams, onMove, onClose }) {
  const destinations = teams.filter((team) => team.id !== player.teamId);
  const [teamId, setTeamId] = useState(destinations[0]?.id ?? "");
  const [replaceId, setReplaceId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const destination = destinations.find((team) => String(team.id) === String(teamId));
  const replacing = destination?.players.find((other) => String(other.id) === String(replaceId));

  const handleTeam = (value) => {
    setTeamId(value);
    setReplaceId("");
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!destination || saving) return;
    setSaving(true);
    setError("");
    try {
      await onMove(player.id, destination.id, replacing ? replacing.id : null);
      onClose();
    } catch (err) {
      setError(err?.message || "Could not move that player.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 sm:p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Move player</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-slate-300 text-sm mb-4">
          <span className="text-white font-semibold">{player.name}</span> is on {teamName}. Season stats follow them to the new team. Team totals stay with the team that played the game.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="move-team" className="block text-sm font-medium text-slate-300 mb-2">
              New team
            </label>
            <select
              id="move-team"
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm min-h-[44px]"
              value={teamId}
              onChange={(e) => handleTeam(e.target.value)}
            >
              {destinations.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>

          {destination?.players.length > 0 && (
            <div>
              <label htmlFor="move-replace" className="block text-sm font-medium text-slate-300 mb-2">
                Already on that roster
              </label>
              <select
                id="move-replace"
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm min-h-[44px]"
                value={replaceId}
                onChange={(e) => { setReplaceId(e.target.value); setError(""); }}
              >
                <option value="">Add them as a new player</option>
                {destination.players.map((other) => (
                  <option key={other.id} value={other.id}>
                    Replace {other.name} and combine stats
                  </option>
                ))}
              </select>
              {replacing && (
                <p className="text-slate-400 text-sm mt-2">
                  {player.name} takes {replacing.name}&apos;s spot. Their plays are combined, and {replacing.name} is removed.
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={!destination || saving}
              className="flex-1 py-3 min-h-[44px] bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg font-semibold"
            >
              {saving ? "Moving..." : replacing ? "Combine and move" : "Move player"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 min-h-[44px] bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
