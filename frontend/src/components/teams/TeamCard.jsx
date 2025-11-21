import React, { useState } from "react";
import { Edit, Trash2, Plus, X } from "lucide-react";

export default function TeamCard({
  team,
  onEdit,
  onDelete,
  onAddPlayer,
  onRemovePlayer,
}) {
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");

  const handleAddPlayer = () => {
    if (!playerName.trim() || !jerseyNumber.trim()) return;
    onAddPlayer(team.id, playerName, jerseyNumber);
    setPlayerName("");
    setJerseyNumber("");
    setShowAddPlayer(false);
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden shadow-md">
      {/* Top header */}
      <div
        className="p-6 border-b border-slate-700"
        style={{ backgroundColor: team.color + "1A" }}
      >
        <div className="flex justify-between items-start">
          <h3 className="text-3xl font-bold">{team.name}</h3>

          <div className="flex gap-3">
            <button onClick={() => onEdit(team)}>
              <Edit className="w-5 h-5 text-slate-300 hover:text-white" />
            </button>

            <button
              onClick={() => {
                if (confirm(`Delete team "${team.name}"?`)) {
                  onDelete(team.id);
                }
              }}
            >
              <Trash2 className="w-5 h-5 text-red-400 hover:text-red-500" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: team.color }}
          ></div>
          <p className="text-slate-300">{team.players.length} players</p>
        </div>
      </div>

      {/* Players */}
      <div className="p-6 bg-slate-900/40">
        {team.players.length === 0 ? (
          <p className="text-slate-400 mb-4">No players yet</p>
        ) : (
          <div className="space-y-3 mb-4">
            {team.players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between bg-slate-800 p-3 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: team.color }}
                  >
                  </div>

                  <div>
                    <p className="font-medium">{player.name}</p>
                    <p className="text-xs text-slate-400">
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onRemovePlayer(team.id, player.id)}
                  className="p-1 hover:bg-slate-700 rounded"
                >
                  <X className="w-4 h-4 text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Player Button */}
        {!showAddPlayer && (
          <button
            onClick={() => setShowAddPlayer(true)}
            className="w-full flex items-center justify-center gap-2 py-2 text-slate-300 hover:text-orange-500 transition border-t border-slate-700 pt-4"
          >
            <Plus className="w-4 h-4" />
            Add Player
          </button>
        )}

        {/* Add Player Form */}
        {showAddPlayer && (
          <div className="border-t border-slate-700 pt-4 space-y-3">
            <input
              className="w-full bg-slate-800 px-3 py-2 rounded border border-slate-700 text-white"
              placeholder="Player name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
            <input
              className="w-full bg-slate-800 px-3 py-2 rounded border border-slate-700 text-white"
              placeholder="Jersey #"
              type="number"
              value={jerseyNumber}
              onChange={(e) => setJerseyNumber(e.target.value)}
            />

            <div className="flex gap-2">
              <button
                onClick={handleAddPlayer}
                className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded text-white"
              >
                Add
              </button>
              <button
                onClick={() => setShowAddPlayer(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
