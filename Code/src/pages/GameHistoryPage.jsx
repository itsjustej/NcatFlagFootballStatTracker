import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useLeague } from "../context/LeagueContext";
import { useAuth } from "../auth/AuthContext";
import { pointsForTeam } from "../utils/statsHelpers";

export default function GameHistoryPage() {
  const { currentLeague } = useLeague();
  const { canTrackGames } = useAuth();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

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
        away_team:away_team ( team_id, name ),
        Play ( offense_team, defense_team, outcome, is_conversion, conv_points )
      `)
      .eq("league_id", currentLeague.league_id);

    if (error) { console.error(error); setLoading(false); return; }

    const formatted = data.map((g) => {
      const gamePlays = g.Play || [];

      const homePoints = pointsForTeam(gamePlays, g.home_team.team_id);
      const awayPoints = pointsForTeam(gamePlays, g.away_team.team_id);

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

  const truncate = (str, n = 12) =>
    str?.length > n ? str.slice(0, n) + "…" : str;

  if (!currentLeague) {
    return (
      <div className="bg-slate-900 pt-4 sm:pt-5 px-6">
        <p className="text-slate-400 text-center animate-pulse">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 text-white pt-4 sm:pt-5 px-4 pb-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">Games</h1>
          <p className="text-slate-400 text-sm sm:text-base">
            {currentLeague.name}
          </p>
        </header>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-4 border-b border-slate-700">
            <p className="text-slate-400 text-sm">
              {loading ? "Loading games..." : `${games.length} game${games.length !== 1 ? "s" : ""} recorded`}
            </p>
            {canTrackGames && (
              <Link
                to="/start-game"
                className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center gap-2 text-white text-sm font-semibold min-h-[44px] shrink-0 transition-colors"
              >
                <Play className="w-4 h-4" />
                Start Game
              </Link>
            )}
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
                    className="bg-slate-900/50 border border-slate-700/80 rounded-lg overflow-hidden flex flex-col hover:border-slate-500 transition-colors"
                  >
                    <Link
                      to={`/games/${g.game_id}`}
                      className="p-4 flex flex-col gap-3 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
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
                    </Link>
                    {canTrackGames && (
                      <Link
                        to={`/games/${g.game_id}/credits`}
                        className="border-t border-slate-700 px-4 py-3 min-h-[44px] flex items-center justify-center text-xs font-bold uppercase tracking-wide text-amber-300 hover:bg-slate-800"
                      >
                        Fill in players
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
