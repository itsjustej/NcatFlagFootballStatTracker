import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Trash2 } from "lucide-react";

export default function GameHistoryPage() {
  const [games, setGames] = useState([]);

  const loadGames = () => {
    fetch("http://localhost:5000/api/games")
      .then((res) => res.json())
      .then((data) => setGames(data || []))
      .catch((err) => console.error("Failed to load games:", err));
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 px-6 text-white">
      <div className="max-w-7xl mx-auto py-6">
        <h1 className="text-4xl font-bold mb-8">Game History</h1>

        {/* THREE COLUMN GRID */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((g) => (
            <div
              key={g.GameID}
              className="bg-slate-800 rounded-xl border border-slate-700 p-6 hover:border-slate-500 transition flex flex-col justify-between"
            >
              {/* TOP: TEAMS & SCORES */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">

                  {/* HOME */}
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: g.HomeTeamColor }}
                    ></div>

                    <span className="text-white font-semibold">
                      {g.HomeTeamName}
                    </span>

                    <span className="text-xl font-bold">
                      {g.HomeScore ?? "-"}
                    </span>
                  </div>

                  <span className="text-slate-500 text-sm font-medium">vs</span>

                  {/* AWAY */}
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">
                      {g.AwayScore ?? "-"}
                    </span>

                    <span className="text-white font-semibold">
                      {g.AwayTeamName}
                    </span>

                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: g.AwayTeamColor }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* BOTTOM: DATE + VIEW + DELETE */}
              <div className="flex items-center justify-between mt-6">

                {/* DATE */}
                <p className="text-slate-400 text-sm">
                  {g.GameDate?.slice(0, 10)}
                </p>

                {/* BUTTONS */}
                <div className="flex items-center gap-4">
                  <Link to={`/games/${g.GameID}`}>
                    <button className="px-4 py-1.5 border border-slate-600 rounded-lg text-white hover:bg-slate-700 text-sm flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  </Link>

                  <button
                    onClick={() => deleteGame(g.GameID)}
                    className="p-2 text-red-400 hover:text-red-600 rounded transition"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>

        {/* EMPTY STATE */}
        {games.length === 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center mt-8">
            <p className="text-slate-400 text-lg">No games recorded</p>
          </div>
        )}
      </div>
    </div>
  );
}
