import React, { useState } from "react";
import { Edit, Trash2, Plus, X, Check } from "lucide-react";

export default function TeamCard({
  team,
  canDelete = false,
  onEdit,
  onRequestDelete,
  onAddPlayer,
  onRemovePlayer,
  onUpdatePlayer,
}) {
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [editingPlayer, setEditingPlayer] = useState(null);

  const handleAddPlayer = () => {
    if (!playerName.trim()) return;
    onAddPlayer(team.id, playerName);
    setPlayerName("");
    setShowAddPlayer(false);
  };

  const handleUpdatePlayer = () => {
    if (!editingPlayer.name.trim()) return;
    onUpdatePlayer(team.id, editingPlayer.id, editingPlayer.name);
    setEditingPlayer(null);
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden shadow-md">
      {/* Top header */}
      <div className="p-4 sm:p-6 border-b border-slate-700">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 pr-1">
            <h3 className="text-lg sm:text-2xl font-bold break-words leading-tight">
              {team.name}
            </h3>
            <span className="inline-flex mt-1.5 whitespace-nowrap bg-blue-800 text-blue-200 text-xs sm:text-sm font-semibold px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full">
              {team.players.length} players
            </span>
          </div>

          <div className="flex gap-1 sm:gap-2 shrink-0">
            <button
              onClick={() => onEdit(team)}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-slate-700 rounded-lg"
              aria-label="Edit team"
            >
              <Edit className="w-5 h-5 text-slate-300 hover:text-white" />
            </button>
            {canDelete && onRequestDelete && (
              <button
                onClick={() => onRequestDelete(team.id)}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-slate-700 rounded-lg"
                aria-label="Delete team"
              >
                <Trash2 className="w-5 h-5 text-red-400 hover:text-red-500" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Players */}
      <div className="p-6 bg-slate-900/40">
        {team.players.length === 0 ? (
          <p className="text-slate-400 mb-4">No players yet</p>
        ) : (
          <div className="space-y-3 mb-4 max-h-[280px] overflow-y-auto pr-1">
            {team.players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between bg-slate-800 p-3 rounded-lg"
              >
                {editingPlayer?.id === player.id ? (
                  <input
                    className="bg-slate-700 px-2 py-1 rounded text-white flex-1 mr-2"
                    value={editingPlayer.name}
                    onChange={(e) => setEditingPlayer({ ...editingPlayer, name: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && handleUpdatePlayer()}
                    autoFocus
                  />
                ) : (
                  <p className="font-medium">{player.name}</p>
                )}

                <div className="flex gap-2">
                  {editingPlayer?.id === player.id ? (
                    <>
                      <button onClick={handleUpdatePlayer} className="p-1 hover:bg-slate-700 rounded">
                        <Check className="w-4 h-4 text-green-400" />
                      </button>
                      <button onClick={() => setEditingPlayer(null)} className="p-1 hover:bg-slate-700 rounded">
                        <X className="w-4 h-4 text-slate-400" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditingPlayer({ id: player.id, name: player.name })}
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-slate-700 rounded"
                        aria-label="Edit player"
                      >
                        <Edit className="w-4 h-4 text-slate-300 hover:text-white" />
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => onRemovePlayer(team.id, player.id)}
                          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-slate-700 rounded"
                          aria-label="Remove player"
                        >
                          <X className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!showAddPlayer && (
          <button
            onClick={() => setShowAddPlayer(true)}
            className="w-full flex items-center justify-center gap-2 py-2 text-slate-300 hover:text-blue-400 transition border-t border-slate-700 pt-4"
          >
            <Plus className="w-4 h-4" />
            Add Player
          </button>
        )}

        {showAddPlayer && (
          <div className="border-t border-slate-700 pt-4 space-y-3">
            <input
              className="w-full bg-slate-800 px-3 py-2 rounded border border-slate-700 text-white"
              placeholder="Player name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddPlayer}
                className="flex-1 bg-blue-700 hover:bg-blue-800 py-2 rounded text-white"
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