import React, { useEffect, useState } from "react";
import { Eye, Trash2 } from "lucide-react";

export default function GameHistoryPage() {
  const [games, setGames] = useState([]);

  const loadGames = () => {
    fetch("http://localhost:5000/api/games")
      .then(res => res.json())
      .then(data => setGames(data))
      .catch(err => console.error("Failed to load games:", err));
  };

  useEffect(() => {
    loadGames();
  }, []);

  const deleteGame = (id) => {
    if (!confirm("Delete this game?")) return;
    fetch(`http://localhost:5000/api/games/${id}`, {
      method: "DELETE",
    }).then(() => loadGames());
  };

  const viewInTracker = async (game) => {
    try {
      // Load box score so we can reconstruct team rosters
      const res = await fetch(
        `http://localhost:5000/api/games/${game.GameID}/boxscore`
      );
      if (!res.ok) {
        console.error("Failed to load box score for tracker view");
        return;
      }
      const box = await res.json();

      const normalizeTeam = (side) => {
        const isHome = side === "teamA";
        const players = Array.isArray(box[side]?.players)
          ? box[side].players
          : [];

        return {
          TeamID: isHome ? game.HomeTeamID : game.AwayTeamID,
          TeamName: box[side]?.name || (isHome ? game.HomeTeamName : game.AwayTeamName),
          TeamColor: box[side]?.color || (isHome ? game.HomeTeamColor : game.AwayTeamColor),
          players: players.map((p) => ({
            id: p.number,
            name: p.name
          }))
        };
      };

      // Derive current team scores and fouls from the existing box score
      const initialScoreA = (box.teamA?.players || []).reduce(
        (sum, p) => sum + (p.points || 0),
        0
      );
      const initialScoreB = (box.teamB?.players || []).reduce(
        (sum, p) => sum + (p.points || 0),
        0
      );
      const initialFoulsA = (box.teamA?.players || []).reduce(
        (sum, p) => sum + (p.fouls || 0),
        0
      );
      const initialFoulsB = (box.teamB?.players || []).reduce(
        (sum, p) => sum + (p.fouls || 0),
        0
      );

      const gameData = {
        gameId: game.GameID,
        gameDate: game.GameDate,
        teamA: normalizeTeam("teamA"),
        teamB: normalizeTeam("teamB"),
        // Reuse the same default settings shape used when starting a game
        settings: {
          quarterLength: 12,
          startScore: 0,
          trackPlusMinus: true
        },
        initialState: {
          teamAScore: initialScoreA,
          teamBScore: initialScoreB,
          teamAFouls: initialFoulsA,
          teamBFouls: initialFoulsB
        },
        // Full per-player box score so the live tracker can start from DB stats
        initialBoxScore: {
          teamA: box.teamA?.players || [],
          teamB: box.teamB?.players || []
        },
        startedAt: new Date().toISOString()
      };

      localStorage.setItem("currentGame", JSON.stringify(gameData));
      window.location.href = "/game";
    } catch (err) {
      console.error("Failed to open game in tracker:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 px-6 text-white">
      <div className="max-w-7xl mx-auto py-6">
        <h1 className="text-4xl font-bold mb-8">Game History</h1>

        {/* 3 or 4 columns? Dynamic grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

          {games.map((g) => (
            <div
              key={g.GameID}
              className="bg-slate-800 rounded-xl border border-slate-700 p-6 hover:border-slate-500 transition flex flex-col"
            >

              {/* TOP MATCHUP - full width */}
              <div className="flex items-center justify-between w-full">

                {/* Home */}
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: g.HomeTeamColor || "#64748b" }}
                  ></div>
                  <span className="text-white font-semibold">{g.HomeTeamName}</span>
                  <span className="text-xl font-bold">{g.HomeScore ?? "-"}</span>
                </div>

                {/* VS */}
                <span className="text-slate-500 font-medium text-sm mx-2">vs</span>

                {/* Away */}
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold">{g.AwayScore ?? "-"}</span>
                  <span className="text-white font-semibold">{g.AwayTeamName}</span>
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: g.AwayTeamColor || "#64748b" }}
                  ></div>
                </div>
              </div>

              {/* BOTTOM ROW - full inline row */}
              <div className="flex items-center justify-between mt-4">

                {/* Date */}
                <p className="text-slate-400 text-sm">
                  {g.GameDate?.slice(0, 10)}
                </p>

                {/* Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => viewInTracker(g)}
                    className="px-3 py-2 border border-slate-600 rounded-lg text-white hover:bg-slate-700 text-sm flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>

                  <button
                    onClick={() => deleteGame(g.GameID)}
                    className="p-2 text-red-400 hover:bg-slate-700 rounded transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
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
    </div>
  );
}
