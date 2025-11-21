import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Trash2 } from "lucide-react";

const DEMO_GAMES = [
  {
    id: "1",
    teamA: "Lakers",
    teamB: "Celtics",
    scoreA: 112,
    scoreB: 108,
    colorA: "#4f46e5",
    colorB: "#10b981",
  },
  {
    id: "2",
    teamA: "Warriors",
    teamB: "Lakers",
    scoreA: 118,
    scoreB: 115,
    colorA: "#f59e0b",
    colorB: "#4f46e5",
  },
  {
    id: "3",
    teamA: "Celtics",
    teamB: "Warriors",
    scoreA: 121,
    scoreB: 110,
    colorA: "#10b981",
    colorB: "#f59e0b",
  },
];

export default function GameHistoryPage() {
  const [games, setGames] = useState(DEMO_GAMES);

  const handleDelete = (id) => {
    if (!confirm("Delete this game?")) return;
    setGames(games.filter((g) => g.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-4xl font-bold text-white mb-6">Game History</h1>

        {/* TWO COLUMN GRID */}
        <div className="grid md:grid-cols-2 gap-6">
          {games.map((g) => (
            <div
              key={g.id}
              className="bg-slate-800 rounded-xl border border-slate-700 p-6 hover:border-slate-500 transition"
            >
              <div className="flex items-center justify-between w-full">

                {/* LEFT SIDE: TEAMS & SCORES */}
                <div className="flex items-center gap-6">

                  {/* Team A */}
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: g.colorA }}
                    ></div>
                    <span className="text-white font-semibold">{g.teamA}</span>
                    <span className="text-xl font-bold text-white">{g.scoreA}</span>
                  </div>

                  {/* VS */}
                  <span className="text-slate-500 text-sm font-medium">vs</span>

                  {/* Team B */}
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-white">{g.scoreB}</span>
                    <span className="text-white font-semibold">{g.teamB}</span>
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: g.colorB }}
                    ></div>
                  </div>
                </div>

                {/* RIGHT SIDE: BUTTONS */}
                <div className="flex items-center gap-3 ml-4">
                  <Link to={`/games/${g.id}`}>
                    <button className="px-3 py-2 border border-slate-600 rounded-lg text-white hover:bg-slate-700 text-sm flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      View Game
                    </button>
                  </Link>

                  <button
                    onClick={() => handleDelete(g.id)}
                    className="p-2 text-red-400 hover:bg-slate-700 rounded transition"
                  >
                    <Trash2 className="w-4 h-4" />
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
