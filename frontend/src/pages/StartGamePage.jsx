import React, { useEffect, useState } from "react";
import TeamSelector from "../components/start-game/TeamSelector";

const API_BASE = "http://localhost:5000/api";
const DEFAULT_GAME_SETTINGS = {
  quarterLength: 12,
  startScore: 0,
  trackPlusMinus: true
};

export default function StartGamePage() {
  const [teams, setTeams] = useState([]);
  const [teamA, setTeamA] = useState(null);
  const [teamB, setTeamB] = useState(null);
  const [error, setError] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  // -----------------------------
  // Load teams from backend
  // -----------------------------
  useEffect(() => {
    fetch("http://localhost:5000/api/teams")
      .then((res) => res.json())
      .then((data) => setTeams(data))
      .catch((err) => console.error("Failed to load teams:", err));
  }, []);

  // -----------------------------
  // Start Game Handler
  // -----------------------------
  const handleStartGame = async () => {
    if (!teamA || !teamB) {
      setError("Please select both teams.");
      return;
    }

    if (teamA.TeamID === teamB.TeamID) {
      setError("Team A and Team B cannot be the same.");
      return;
    }

    setError("");
    setIsStarting(true);

    // -----------------------------
    // Build game object for tracker
    // -----------------------------
    const payload = {
      homeTeamId: teamA.TeamID,
      awayTeamId: teamB.TeamID,
      settings: DEFAULT_GAME_SETTINGS
    };

    try {
      const response = await fetch(`${API_BASE}/games`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create game");
      }

      const data = await response.json();

      const normalizeTeam = (team) => {
        const players = Array.isArray(team?.Players) ? team.Players : [];
        return {
          TeamID: team.TeamID,
          TeamName: team.TeamName,
          TeamColor: team.TeamColor,
          players: players.map((player) => ({
            ...player,
            id: player.PlayerID,
            name: player.PlayerName
          }))
        };
      };

      const gameData = {
        gameId: data.GameID,
        gameDate: data.GameDate,
        teamA: normalizeTeam(data.teamA),
        teamB: normalizeTeam(data.teamB),
        settings: data.settings || DEFAULT_GAME_SETTINGS,
        startedAt: new Date().toISOString()
      };

      localStorage.setItem("currentGame", JSON.stringify(gameData));
      window.location.href = "/game";
    } catch (err) {
      console.error("Failed to start game:", err);
      setError(err.message || "Could not start the game.");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-4xl font-bold text-white mb-2">Start New Game</h1>
        <p className="text-slate-400 mb-8">Select two teams to begin.</p>

        {/* Error message */}
        {error && (
          <div className="bg-red-600/20 border border-red-600 text-red-300 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Team Selector */}
        <TeamSelector
          teams={teams}
          teamA={teamA}
          teamB={teamB}
          onTeamASelect={setTeamA}
          onTeamBSelect={setTeamB}
          onNext={handleStartGame}
          isLoading={isStarting}
        />
      </div>
    </div>
  );
}
