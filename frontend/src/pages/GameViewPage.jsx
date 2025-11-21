import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import BoxScore from "../components/games/BoxScore.jsx";
import PlayByPlayLog from "../components/games/PlayByPlayLog.jsx";

/* -------------------------------------------------------
   TEMP DEMO GAME — replace later with real saved game data
--------------------------------------------------------- */
const DEMO_GAME = {
  id: "1",
  date: "2024-11-18",
  teamA: {
    name: "Lakers",
    color: "#4f46e5",
    players: [
      { name: "LeBron James", number: 23, points: 28, rebounds: 8, assists: 7, steals: 1, blocks: 1, fouls: 2 },
      { name: "Anthony Davis", number: 3, points: 24, rebounds: 13, assists: 2, steals: 1, blocks: 3, fouls: 3 },
      { name: "Austin Reaves", number: 15, points: 18, rebounds: 4, assists: 9, steals: 2, blocks: 0, fouls: 1 },
    ],
  },
  teamB: {
    name: "Celtics",
    color: "#10b981",
    players: [
      { name: "Jayson Tatum", number: 0, points: 31, rebounds: 9, assists: 3, steals: 1, blocks: 1, fouls: 2 },
      { name: "Jaylen Brown", number: 7, points: 27, rebounds: 8, assists: 4, steals: 2, blocks: 1, fouls: 3 },
      { name: "Derrick White", number: 9, points: 12, rebounds: 5, assists: 10, steals: 2, blocks: 0, fouls: 1 },
    ],
  },
  playByPlay: [
    { time: "12:00", team: "A", player: "LeBron James", action: "Made 2PT" },
    { time: "11:45", team: "B", player: "Jayson Tatum", action: "Made 3PT" },
    { time: "11:30", team: "A", player: "Anthony Davis", action: "Rebound" },
    { time: "11:15", team: "B", player: "Jaylen Brown", action: "Made 2PT" },
  ],
  finalScore: { A: 112, B: 108 }
};

export default function GameViewPage() {
  const { id } = useParams();
  const [tab, setTab] = useState("box"); // "box" or "pbp"

  // TEMP: always load demo game
  const game = DEMO_GAME;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      
      {/* Back Button */}
      <Link to="/games" className="inline-block mb-6">
        <button className="px-4 py-2 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-700">
          ← Back to History
        </button>
      </Link>

      {/* Scoreboard Header */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
        <div className="grid md:grid-cols-3 items-center gap-6">

          {/* Team A */}
          <div className="text-center">
            <div className="flex justify-center items-center gap-2 mb-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: game.teamA.color }} />
              <h2 className="text-xl text-white font-bold">{game.teamA.name}</h2>
            </div>
            <p className="text-4xl font-bold text-white">{game.finalScore.A}</p>
          </div>

          {/* Date */}
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-1">Final</p>
            <p className="text-white">
              {new Date(game.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric"
              })}
            </p>
          </div>

          {/* Team B */}
          <div className="text-center">
            <div className="flex justify-center items-center gap-2 mb-2">
              <h2 className="text-xl text-white font-bold">{game.teamB.name}</h2>
              <div className="w-4 h-4 rounded" style={{ backgroundColor: game.teamB.color }} />
            </div>
            <p className="text-4xl font-bold text-white">{game.finalScore.B}</p>
          </div>

        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setTab("box")}
          className={`px-4 py-2 rounded-lg ${
            tab === "box" ? "bg-orange-600 text-white" : "bg-slate-700 text-slate-300"
          }`}
        >
          Box Score
        </button>

        <button
          onClick={() => setTab("pbp")}
          className={`px-4 py-2 rounded-lg ${
            tab === "pbp" ? "bg-orange-600 text-white" : "bg-slate-700 text-slate-300"
          }`}
        >
          Play-By-Play
        </button>
      </div>

      {/* CONTENT */}
      {tab === "box" && <BoxScore teamA={game.teamA} teamB={game.teamB} />}
      {tab === "pbp" && <PlayByPlayLog playByPlay={game.playByPlay} teams={[game.teamA, game.teamB]} />}
    </div>
  );
}
