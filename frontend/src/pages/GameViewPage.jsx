import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import BoxScore from "../components/games/BoxScore.jsx";
import PlayByPlayLog from "../components/games/PlayByPlayLog.jsx";

export default function GameViewPage() {
  const { id } = useParams();
  const [tab, setTab] = useState("box");

  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBoxScore() {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:5000/api/games/${id}/boxscore`);

        if (!res.ok) {
          setError("Failed to load game");
          setLoading(false);
          return;
        }

        const data = await res.json();
        setGame(data);
      } catch (err) {
        console.error("Failed to load game view:", err);
        setError("Could not connect to server");
      } finally {
        setLoading(false);
      }
    }

    loadBoxScore();
  }, [id]);

  if (loading) {
    return (
      <div className="text-center text-slate-400 p-8">
        Loading game…
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="text-center text-red-400 p-8">
        {error || "Game not found"}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">

      {/* Back Button */}
      <Link to="/games" className="inline-block mb-6">
        <button className="px-4 py-2 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-700">
          ← Back to History
        </button>
      </Link>

      {/* SCOREBOARD HEADER */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
        <div className="grid md:grid-cols-3 items-center gap-6">

          {/* HOME / TEAM A */}
          <div className="text-center">
            <div className="flex justify-center items-center gap-2 mb-2">
              <span className="w-4 h-4 rounded"
                style={{ backgroundColor: game.teamA.color }} />
              <h2 className="text-xl font-bold text-white">
                {game.teamA.name}
              </h2>
            </div>
            <p className="text-4xl font-bold text-white">
              {game.finalScore.A}
            </p>
          </div>

          {/* DATE - Optional (remove if not stored) */}
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-1">Final Score</p>
            <p className="text-white text-lg">
              {game.teamA.name} vs {game.teamB.name}
            </p>
          </div>

          {/* AWAY / TEAM B */}
          <div className="text-center">
            <div className="flex justify-center items-center gap-2 mb-2">
              <h2 className="text-xl font-bold text-white">
                {game.teamB.name}
              </h2>
              <span className="w-4 h-4 rounded"
                style={{ backgroundColor: game.teamB.color }} />
            </div>
            <p className="text-4xl font-bold text-white">
              {game.finalScore.B}
            </p>
          </div>

        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setTab("box")}
          className={`px-4 py-2 rounded-lg ${tab === "box"
            ? "bg-orange-600 text-white"
            : "bg-slate-700 text-slate-300"
            }`}
        >
          Box Score
        </button>

        <button
          onClick={() => setTab("pbp")}
          className={`px-4 py-2 rounded-lg ${tab === "pbp"
            ? "bg-orange-600 text-white"
            : "bg-slate-700 text-slate-300"
            }`}
        >
          Play-by-Play
        </button>
      </div>

      {/* CONTENT RENDER */}
      {tab === "box" && (
        <BoxScore teamA={game.teamA} teamB={game.teamB} />
      )}

      {tab === "pbp" && (
        <PlayByPlayLog playByPlay={game.playByPlay || []} />
      )}
    </div>
  );
}
