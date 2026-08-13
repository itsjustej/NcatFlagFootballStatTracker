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
    <div className="bg-slate-900/50 border border-slate-700/80 rounded-lg overflow-hidden">
      {/* Top header */}
      <div className="px-4 py-4 border-b border-slate-700/80">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 pr-1">
            <h3 className="text-lg font-bold text-white break-words leading-tight">
              {team.name}
            </h3>
            <span className="inline-flex mt-1.5 whitespace-nowrap bg-blue-900/60 text-blue-200 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-blue-800/50">
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
      <div className="p-4">
        {team.players.length === 0 ? (
          <p className="text-slate-400 text-sm mb-4 text-center py-2">No players yet</p>
        ) : (
          <div className="space-y-2 mb-4 max-h-[280px] overflow-y-auto overscroll-y-contain scroll-smooth pr-1">
            {team.players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between bg-slate-800/80 border border-slate-700/60 p-3 rounded-lg hover:bg-slate-800 transition-colors"
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
                  <p className="font-medium text-white text-sm">{player.name}</p>
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
            className="w-full flex items-center justify-center gap-2 py-2.5 text-slate-400 hover:text-blue-400 transition border-t border-slate-700/80 pt-4 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Player
          </button>
        )}

        {showAddPlayer && (
          <div className="border-t border-slate-700/80 pt-4 space-y-3">
            <input
              className="w-full bg-slate-900 px-3 py-2.5 rounded-lg border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              placeholder="Player name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddPlayer}
                className="flex-1 bg-blue-600 hover:bg-blue-700 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => setShowAddPlayer(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 py-2.5 rounded-lg text-sm transition-colors"
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