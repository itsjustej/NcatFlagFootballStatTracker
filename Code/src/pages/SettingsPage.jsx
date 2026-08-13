import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useLeague } from "../context/LeagueContext";
import { ConfirmDeleteDialog } from "../components/teams/ConfirmDeleteDialog";
import { Plus, Check, Trash2, Calendar } from "lucide-react";

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
    <div className="min-h-[100dvh] bg-slate-900 text-white pt-4 sm:pt-5 px-4 pb-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">Settings</h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className={`text-sm font-medium ${canDelete ? "text-purple-400" : "text-slate-500"}`}>
              {roleLabel}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
            >
              Log out
            </button>
          </div>
        </header>

        {/* Seasons */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
          <div className="flex items-center justify-between gap-4 px-4 py-4 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-400 shrink-0" />
              <h2 className="text-2xl font-bold text-white shrink-0">Seasons</h2>
            </div>
            <p className="text-slate-400 text-sm shrink-0 text-right">
              {leagues.length} season{leagues.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="p-4 space-y-6">
            {leagues.length === 0 ? (
              <p className="text-slate-400 text-center py-4">No seasons yet. Create one below.</p>
            ) : (
              <div className="space-y-2">
                {leagues.map((league) => {
                  const isActive = currentLeague?.league_id === league.league_id;
                  return (
                    <div
                      key={league.league_id}
                      className={`flex items-center justify-between gap-2 px-3 py-3 rounded-lg border transition-colors ${
                        isActive
                          ? "border-blue-500/60 bg-blue-500/10"
                          : "border-slate-700/80 bg-slate-900/50 hover:border-slate-600"
                      }`}
                    >
                      <button
                        onClick={() => switchLeague(league)}
                        className="flex-1 flex items-center gap-3 text-left min-w-0 min-h-[44px]"
                      >
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isActive ? "bg-blue-400" : "bg-slate-600"
                          }`}
                        />
                        <span
                          className={`font-medium truncate ${
                            isActive ? "text-white" : "text-slate-300"
                          }`}
                        >
                          {league.name}
                        </span>
                        {isActive && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-full shrink-0">
                            <Check className="w-3 h-3" />
                            Active
                          </span>
                        )}
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => setConfirmDelete(league.league_id)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-slate-800 rounded-lg transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                          aria-label="Delete season"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="bg-slate-900/50 border border-slate-700/80 rounded-lg p-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                Create New Season
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  placeholder="Season name e.g. Spring 2025"
                  value={newLeagueName}
                  onChange={(e) => setNewLeagueName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
                <button
                  onClick={handleCreate}
                  disabled={creating || !newLeagueName.trim()}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2 text-sm font-semibold min-h-[44px] shrink-0 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  <Plus className="w-4 h-4" />
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </div>
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
