import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useLeague } from "../context/LeagueContext";
import { cleanPlayerName, isUnknownPlayer } from "../utils/playerName";
import TeamSelector from "../components/start-game/TeamSelector";

export default function StartGamePage() {
  const { currentLeague, startGame } = useLeague();
  const navigate = useNavigate();

  const [teams, setTeams]         = useState([]);
  const [teamA, setTeamA]         = useState(null);
  const [teamB, setTeamB]         = useState(null);
  const [jerseys, setJerseys] = useState({}); // { player_id: number | null }
  const [error, setError]               = useState("");
  const [isStarting, setIsStarting]     = useState(false);
  const [openingPossession, setOpeningPossession] = useState("home");
  const [homeAttacksRight, setHomeAttacksRight]   = useState(true);
  const [hasFortyYard, setHasFortyYard]           = useState(true);

  useEffect(() => {
    if (!currentLeague) return;
    const fetchTeams = async () => {
      const [teamsResult, playersResult] = await Promise.all([
        supabase.from("Team").select("*").eq("league_id", currentLeague.league_id),
        supabase.from("Player").select("player_id, name, team_id"),
      ]);
      const { data: teamsData, error: teamsError } = teamsResult;
      const { data: playersData } = playersResult;

      if (teamsError) { console.error(teamsError); return; }

      const formatted = teamsData.map(t => ({
        team_id: t.team_id,
        name: t.name,
        players: (playersData || [])
          .filter(p => p.team_id === t.team_id && !isUnknownPlayer(p))
          .map(p => ({ player_id: p.player_id, name: p.name })),
      }));

      setTeams(formatted);
      // A new game never inherits jersey numbers. Ignore anything already in state.
      setJerseys(() => {
        const next = {};
        for (const player of playersData || []) next[player.player_id] = null;
        return next;
      });
    };
    fetchTeams();
  }, [currentLeague]);

  const handleJerseyChange = (playerId, value) => {
    setJerseys(prev => ({ ...prev, [playerId]: value }));
  };

  const handleAddPlayer = async (teamId, rawName) => {
    const name = cleanPlayerName(rawName);
    if (!name || isUnknownPlayer(name)) {
      setError("Enter a player name.");
      return null;
    }

    setError("");
    const { data, error: insertError } = await supabase
      .from("Player")
      .insert([{ name, team_id: teamId }])
      .select("player_id, name")
      .single();

    if (insertError) {
      setError(insertError.message || "Could not add that player.");
      return null;
    }

    const player = { player_id: data.player_id, name: data.name };
    const addToTeam = (team) => {
      if (!team || team.team_id !== teamId) return team;
      if (team.players.some((p) => p.player_id === player.player_id)) return team;
      return { ...team, players: [...team.players, player] };
    };

    setTeams((prev) => prev.map(addToTeam));
    setTeamA(addToTeam);
    setTeamB(addToTeam);
    setJerseys((prev) => ({ ...prev, [player.player_id]: null }));
    return player.player_id;
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
          has_forty_yard:       hasFortyYard,
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
          jersey:    jerseys[p.player_id] ?? null,
        })),
        ...teamB.players.map(p => ({
          game_id:   gameId,
          player_id: p.player_id,
          jersey:    jerseys[p.player_id] ?? null,
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
    <div className="bg-slate-900 pt-4 sm:pt-5 px-4 pb-8">
      <div className="max-w-5xl mx-auto">
        <Link to="/" className="text-slate-400 text-sm hover:text-white transition-colors">
          ← Games
        </Link>
        <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2 mt-3">Start New Game</h1>
        <p className="text-slate-400 mb-8">
          {currentLeague
            ? `${currentLeague.name} — Pick the teams and enter jersey numbers. Two digits jumps to the next player.`
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
          jerseys={jerseys}
          openingPossession={openingPossession}
          homeAttacksRight={homeAttacksRight}
          hasFortyYard={hasFortyYard}
          onTeamASelect={setTeamA}
          onTeamBSelect={setTeamB}
          onJerseyChange={handleJerseyChange}
          onAddPlayer={handleAddPlayer}
          onOpeningPossessionChange={setOpeningPossession}
          onHomeAttacksRightChange={setHomeAttacksRight}
          onHasFortyYardChange={setHasFortyYard}
          onNext={handleStartGame}
          isLoading={isStarting}
        />
      </div>
    </div>
  );
}