import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useLeague } from "../context/LeagueContext";
import { ConfirmDeleteDialog } from "../components/teams/ConfirmDeleteDialog";
import { Plus, Check, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const { user, canDelete, logout } = useAuth();
  const navigate = useNavigate();
  const { leagues, currentLeague, switchLeague, createLeague, deleteLeague } = useLeague();
  const [newLeagueName, setNewLeagueName] = useState("");
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleCreate = async () => {
    if (!newLeagueName.trim()) return;
    setCreating(true);
    await createLeague(newLeagueName.trim());
    setNewLeagueName("");
    setCreating(false);
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    await deleteLeague(confirmDelete);
    setConfirmDelete(null);
  };

  const roleLabel = user?.role === "admin" ? "Admin" : "Worker";

  return (
    <div className="min-h-[100dvh] bg-slate-900 pt-4 sm:pt-8 px-4 pb-8">
      <div className="max-w-3xl mx-auto space-y-6">

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-slate-400 mb-8">Manage seasons and account settings.</p>

          <h2 className="text-lg font-bold text-white mb-4">Seasons</h2>

          <div className="space-y-3 mb-6">
            {leagues.map(league => (
              <div
                key={league.league_id}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition gap-2 ${
                  currentLeague?.league_id === league.league_id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-700 bg-slate-700/40 hover:border-slate-500'
                }`}
              >
                <button
                  onClick={() => switchLeague(league)}
                  className="flex-1 flex items-center gap-3 text-left min-w-0 min-h-[44px]"
                >
                  <span className={`font-medium truncate ${currentLeague?.league_id === league.league_id ? 'text-white' : 'text-slate-300'}`}>
                    {league.name}
                  </span>
                  {currentLeague?.league_id === league.league_id && (
                    <Check className="w-4 h-4 text-blue-400 shrink-0" />
                  )}
                </button>
                {canDelete && (
                  <button
                    onClick={() => setConfirmDelete(league.league_id)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-slate-600 rounded transition shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Delete season"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-slate-700 pt-6">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-3">Create New Season</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 text-base min-h-[44px]"
                placeholder="Season name e.g. Spring 2025"
                value={newLeagueName}
                onChange={e => setNewLeagueName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
              <button
                onClick={handleCreate}
                disabled={creating || !newLeagueName.trim()}
                className="px-4 py-3 bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white rounded-lg flex items-center justify-center gap-2 font-medium min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 sm:p-8">
          <h2 className="text-lg font-bold text-white mb-2">Account</h2>
          <p className="text-slate-400 text-sm mb-4">
            Signed in as <span className="text-white font-medium">{user?.username}</span>
            {' '}({roleLabel})
          </p>
          {!canDelete && (
            <p className="text-slate-500 text-xs mb-4">
              Worker accounts cannot delete seasons, teams, players, or games.
            </p>
          )}
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 transition text-white font-semibold py-3 rounded-lg min-h-[44px]"
          >
            Log Out
          </button>
        </div>

      </div>

      {confirmDelete && canDelete && (
        <ConfirmDeleteDialog
          onConfirm={handleDelete}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
