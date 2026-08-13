import React, { useEffect, useState } from "react";
import { Eye, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { ConfirmDeleteDialog } from "../components/teams/ConfirmDeleteDialog";
import { useLeague } from "../context/LeagueContext";
import { useAuth } from "../auth/AuthContext";

export default function GameHistoryPage() {
  const { currentLeague, startGame } = useLeague();
  const { canDelete } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    if (!currentLeague) return;
    fetchGames();
  }, [currentLeague]);

  const fetchGames = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("Game")
      .select(`
        game_id,
        home_team:home_team ( team_id, name ),
        away_team:away_team ( team_id, name )
      `)
      .eq("league_id", currentLeague.league_id);

    if (error) { console.error(error); setLoading(false); return; }

    const { data: plays, error: playsError } = await supabase
      .from("Play")
      .select("game_id, offense_team, outcome, is_conversion, conv_points");

    if (playsError) { console.error(playsError); setLoading(false); return; }

    const formatted = data.map((g) => {
      const gamePlays = plays.filter((p) => p.game_id === g.game_id);

      const calcPoints = (teamId) =>
        gamePlays
          .filter((p) => p.offense_team === teamId)
          .reduce((sum, p) => {
            if (p.outcome === "td") return sum + 6;
            if (p.is_conversion && p.outcome === "complete") return sum + (p.conv_points || 0);
            return sum;
          }, 0);

      const homePoints = calcPoints(g.home_team.team_id);
      const awayPoints = calcPoints(g.away_team.team_id);

      return {
        game_id:     g.game_id,
        home_team:   g.home_team,
        away_team:   g.away_team,
        home_points: homePoints,
        away_points: awayPoints,
        home_won:    homePoints > awayPoints,
        away_won:    awayPoints > homePoints,
      };
    });

    setGames(formatted.sort((a, b) => b.game_id - a.game_id));
    setLoading(false);
  };

  const deleteGame = async (id) => {
    if (!canDelete) return;
    const { data: playData } = await supabase
      .from("Play")
      .select("play_id")
      .eq("game_id", id);

    if (playData?.length > 0) {
      const playIds = playData.map((p) => p.play_id);
      await supabase.from("Participants").delete().in("play_id", playIds);
      await supabase.from("Play").delete().in("play_id", playIds);
    }

    await supabase.from("Game").delete().eq("game_id", id);
    setGames(games.filter((g) => g.game_id !== id));
    setConfirmDelete(null);
  };

  const truncate = (str, n = 12) =>
    str?.length > n ? str.slice(0, n) + "…" : str;

  if (!currentLeague) {
    return (
      <div className="min-h-screen bg-slate-900 pt-24 px-6">
        <p className="text-slate-400 text-center animate-pulse">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-900 text-white pt-4 sm:pt-5 px-4 pb-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">Game History</h1>
          <p className="text-slate-400 text-sm sm:text-base">
            View past games and resume in-progress matchups for {currentLeague.name}.
          </p>
        </header>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
          <div className="flex items-center justify-between gap-4 px-4 py-4 border-b border-slate-700">
            <h2 className="text-2xl font-bold text-white shrink-0">Games</h2>
            <p className="text-slate-400 text-sm shrink-0 text-right">
              {loading ? "Loading games..." : `${games.length} game${games.length !== 1 ? "s" : ""} recorded`}
            </p>
          </div>

          {loading && (
            <p className="px-4 py-8 text-slate-400 text-center animate-pulse">Loading game history...</p>
          )}

          {!loading && games.length === 0 && (
            <p className="px-4 py-8 text-slate-400 text-center">No games recorded yet.</p>
          )}

          {!loading && games.length > 0 && (
            <div className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {games.map((g) => (
                  <div
                    key={g.game_id}
                    className="bg-slate-900/50 border border-slate-700/80 rounded-lg p-4 hover:border-slate-600 transition-colors flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`truncate flex-1 text-sm ${g.home_won ? "text-green-400 font-bold" : "text-white font-medium"}`}>
                        {truncate(g.home_team.name)}
                      </span>
                      <span className={`font-bold tabular-nums shrink-0 ${g.home_won ? "text-green-400 text-xl" : "text-white text-lg"}`}>
                        {g.home_points}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className={`truncate flex-1 text-sm ${g.away_won ? "text-green-400 font-bold" : "text-white font-medium"}`}>
                        {truncate(g.away_team.name)}
                      </span>
                      <span className={`font-bold tabular-nums shrink-0 ${g.away_won ? "text-green-400 text-xl" : "text-white text-lg"}`}>
                        {g.away_points}
                      </span>
                    </div>

                    <div className="border-t border-slate-700/80" />

                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          startGame(g.game_id);
                          navigate("/game");
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-2 min-h-[44px] text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm"
                        title="Resume game"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View</span>
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => setConfirmDelete(g.game_id)}
                          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                          aria-label="Delete game"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {confirmDelete && canDelete && (
        <ConfirmDeleteDialog
          onConfirm={() => deleteGame(confirmDelete)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
