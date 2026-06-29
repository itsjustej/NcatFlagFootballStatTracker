import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useLeague } from "../context/LeagueContext";
import TeamSelector from "../components/start-game/TeamSelector";

export default function StartGamePage() {
  const { currentLeague, startGame } = useLeague();
  const navigate = useNavigate();

  const [teams, setTeams]         = useState([]);
  const [teamA, setTeamA]         = useState(null);
  const [teamB, setTeamB]         = useState(null);
  const [jerseyMapA, setJerseyMapA] = useState({}); // { player_id: jersey_number }
  const [jerseyMapB, setJerseyMapB] = useState({});
  const [error, setError]               = useState("");
  const [isStarting, setIsStarting]     = useState(false);
  const [openingPossession, setOpeningPossession] = useState("home");
  const [homeAttacksRight, setHomeAttacksRight]   = useState(true);

  useEffect(() => {
    if (!currentLeague) return;
    const fetchTeams = async () => {
      const { data: teamsData, error: teamsError } = await supabase
        .from("Team")
        .select("*")
        .eq("league_id", currentLeague.league_id);

      if (teamsError) { console.error(teamsError); return; }

      const { data: playersData } = await supabase.from("Player").select("*");

      const formatted = teamsData.map(t => ({
        team_id: t.team_id,
        name: t.name,
        players: (playersData || [])
          .filter(p => p.team_id === t.team_id)
          .map(p => ({ player_id: p.player_id, name: p.name })),
      }));

      setTeams(formatted);
    };
    fetchTeams();
  }, [currentLeague]);

  // Reset jersey maps when teams change
  useEffect(() => {
    if (!teamA) { setJerseyMapA({}); return; }
    // Seed with jersey index from roster position so inputs aren't blank
    setJerseyMapA(prev => {
      const next = {};
      teamA.players.forEach(p => { next[p.player_id] = prev[p.player_id] ?? null; });
      return next;
    });
  }, [teamA]);

  useEffect(() => {
    if (!teamB) { setJerseyMapB({}); return; }
    setJerseyMapB(prev => {
      const next = {};
      teamB.players.forEach(p => { next[p.player_id] = prev[p.player_id] ?? null; });
      return next;
    });
  }, [teamB]);

  const handleJerseyChangeA = (playerId, value) => {
    setJerseyMapA(prev => ({ ...prev, [playerId]: value }));
  };

  const handleJerseyChangeB = (playerId, value) => {
    setJerseyMapB(prev => ({ ...prev, [playerId]: value }));
  };

  const handleStartGame = async () => {
    if (!teamA || !teamB) { setError("Please select both teams."); return; }
    if (teamA.team_id === teamB.team_id) { setError("Home and Away teams cannot be the same."); return; }

    setError("");
    setIsStarting(true);

    try {
      // 1. Create the game
      const { data: gameRow, error: gameError } = await supabase
        .from("Game")
        .insert([{
          league_id:            currentLeague.league_id,
          home_team:            teamA.team_id,
          away_team:            teamB.team_id,
          opening_possession:   openingPossession,
          home_attacks_right:   homeAttacksRight,
        }])
        .select()
        .single();

      if (gameError) throw new Error(gameError.message);

      const gameId = gameRow.game_id;

      // 2. Build roster rows for both teams
      // Players without a jersey number get null — that's fine, they can be set in-game
      const rosterRows = [
        ...teamA.players.map(p => ({
          game_id:   gameId,
          player_id: p.player_id,
          jersey:    jerseyMapA[p.player_id] ?? null,
        })),
        ...teamB.players.map(p => ({
          game_id:   gameId,
          player_id: p.player_id,
          jersey:    jerseyMapB[p.player_id] ?? null,
        })),
      ];

      const { error: rosterError } = await supabase
        .from("Roster")
        .insert(rosterRows);

      if (rosterError) throw new Error(rosterError.message);

      // 3. Navigate into the game
      startGame(gameId);
      navigate("/game");
    } catch (err) {
      console.error("Failed to start game:", err);
      setError(err.message || "Could not start the game.");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-5">
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10">
        <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">Start New Game</h1>
        <p className="text-slate-400 mb-8">
          {currentLeague
            ? `${currentLeague.name} — Select teams and assign jersey numbers.`
            : 'Loading...'}
        </p>

        {error && (
          <div className="bg-red-600/20 border border-red-600 text-red-300 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <TeamSelector
          teams={teams}
          teamA={teamA}
          teamB={teamB}
          jerseyMapA={jerseyMapA}
          jerseyMapB={jerseyMapB}
          openingPossession={openingPossession}
          homeAttacksRight={homeAttacksRight}
          onTeamASelect={setTeamA}
          onTeamBSelect={setTeamB}
          onJerseyChangeA={handleJerseyChangeA}
          onJerseyChangeB={handleJerseyChangeB}
          onOpeningPossessionChange={setOpeningPossession}
          onHomeAttacksRightChange={setHomeAttacksRight}
          onNext={handleStartGame}
          isLoading={isStarting}
        />
      </div>
    </div>
  );
}