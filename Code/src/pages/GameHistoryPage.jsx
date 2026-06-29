import React, { useEffect, useState } from "react";
import { Eye, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { ConfirmDeleteDialog } from "../components/teams/ConfirmDeleteDialog";
import { useLeague } from "../context/LeagueContext";
import { useAuth } from "../auth/AuthContext";
import { resumeGame } from "../context/useResumeGame";

export default function GameHistoryPage() {
  const { currentLeague, startGame } = useLeague();
  const { canDelete } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    if (!currentLeague) return;
    fetchGames();
  }, [currentLeague]);

  const fetchGames = async () => {
    const { data, error } = await supabase
      .from("Game")
      .select(`
        game_id,
        home_team:home_team ( team_id, name ),
        away_team:away_team ( team_id, name )
      `)
      .eq("league_id", currentLeague.league_id);

    if (error) { console.error(error); return; }

    const { data: plays, error: playsError } = await supabase
      .from("Play")
      .select("game_id, offense_team, outcome, is_conversion, conv_points");

    if (playsError) { console.error(playsError); return; }

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

    setGames(formatted);
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

  if (!currentLeague) return <div className="min-h-screen bg-slate-900 px-6 text-white">Loading...</div>;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-4 sm:pt-6 px-4 sm:px-6 pb-8 text-white">
      <div className="max-w-7xl mx-auto py-4 sm:py-6">
        <h1 className="text-2xl sm:text-4xl font-bold mb-1">Game History</h1>
        <p className="text-slate-400 mb-6">{currentLeague.name}</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {games.map((g) => (
            <div
              key={g.game_id}
              className="bg-slate-800 rounded-xl border border-slate-700 p-4 hover:border-slate-500 transition flex flex-col gap-3"
            >
              {/* Home team */}
              <div className="flex items-center justify-between">
                <span className={`truncate max-w-[80px] ${g.home_won ? 'text-green-400 font-bold text-base' : 'text-white font-semibold text-sm'}`}>
                  {truncate(g.home_team.name)}
                </span>
                <span className={`font-bold ml-2 ${g.home_won ? 'text-green-400 text-xl' : 'text-white text-lg'}`}>
                  {g.home_points}
                </span>
              </div>

              {/* Away team */}
              <div className="flex items-center justify-between">
                <span className={`truncate max-w-[80px] ${g.away_won ? 'text-green-400 font-bold text-base' : 'text-white font-semibold text-sm'}`}>
                  {truncate(g.away_team.name)}
                </span>
                <span className={`font-bold ml-2 ${g.away_won ? 'text-green-400 text-xl' : 'text-white text-lg'}`}>
                  {g.away_points}
                </span>
              </div>

              <div className="border-t border-slate-700" />

              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={async () => {
                    startGame(g.game_id);
                    navigate('/game');
                  }}
                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 rounded transition"
                  title="Resume game"
                >
                  <Eye className="w-4 h-4" />
                </button>
                {canDelete && (
                  <button
                    onClick={() => setConfirmDelete(g.game_id)}
                    className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-red-400 hover:bg-slate-700 rounded transition"
                    aria-label="Delete game"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {games.length === 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center mt-8">
            <p className="text-slate-400 text-lg">No games recorded</p>
          </div>
        )}
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