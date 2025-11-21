import React, { useState } from "react";
import TeamSelector from "../components/start-game/TeamSelector";

import { teamAPlayers } from "../data/onePlayers";
import { teamBPlayers } from "../data/twoPlayers";
import { teams as mockTeams } from "../data/orgs";

export default function StartGamePage() {
  const [teamA, setTeamA] = useState(null);
  const [teamB, setTeamB] = useState(null);
  const [error, setError] = useState("");

  // These are your mock teams for now
  const allTeams = [
    {
      id: "A",
      name: mockTeams.A.name,
      color: "#f97316",
      players: teamAPlayers,
    },
    {
      id: "B",
      name: mockTeams.B.name,
      color: "#3b82f6",
      players: teamBPlayers,
    },
  ];

  const handleStartGame = () => {
    if (!teamA || !teamB) {
      setError("Please select both teams.");
      return;
    }

    if (teamA.id === teamB.id) {
      setError("Team A and Team B cannot be the same.");
      return;
    }

    setError("");

    const gameData = {
      teamA,
      teamB,
      settings: {
        quarterLength: 12,
        startScore: 0,
        trackPlusMinus: true,
      },
      startTime: new Date().toISOString(),
    };

    localStorage.setItem("currentGame", JSON.stringify(gameData));

    // NAVIGATE TO TRACKER
    window.location.href = "/game";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-16">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-4xl font-bold text-white mb-2">Start New Game</h1>
        <p className="text-slate-400 mb-10">Select two teams to begin.</p>

        {error && (
          <div className="bg-red-600/20 border border-red-600 text-red-300 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <TeamSelector
          teams={allTeams}
          teamA={teamA}
          teamB={teamB}
          onTeamASelect={(t) => {
            setTeamA(t);
            setError("");
          }}
          onTeamBSelect={(t) => {
            setTeamB(t);
            setError("");
          }}
          onNext={handleStartGame}
        />
      </div>
    </div>
  );
}
