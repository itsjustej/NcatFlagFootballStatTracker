import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useGame } from "./useGame";

const LeagueContext = createContext(null);

export function LeagueProvider({ children }) {
  // ── League state ──────────────────────────────────────────────────
  const [leagues, setLeagues] = useState([]);
  const [currentLeague, setCurrentLeague] = useState(null);

  useEffect(() => {
    const fetchLeagues = async () => {
      const { data } = await supabase.from("League").select("*");
      if (!data) return;
      setLeagues(data);

      const stored = localStorage.getItem("currentLeagueId");
      if (stored) {
        const found = data.find((l) => l.league_id === parseInt(stored));
        if (found) { setCurrentLeague(found); return; }
      }
      if (data.length > 0) {
        setCurrentLeague(data[0]);
        localStorage.setItem("currentLeagueId", data[0].league_id);
      }
    };
    fetchLeagues();
  }, []);

  const switchLeague = (league) => {
    setCurrentLeague(league);
    localStorage.setItem("currentLeagueId", league.league_id);
  };

  const createLeague = async (name) => {
    const { data, error } = await supabase
      .from("League")
      .insert([{ name }])
      .select()
      .single();
    if (error) { console.error(error); return; }
    setLeagues((prev) => [...prev, data]);
    switchLeague(data);
    return data;
  };

  const deleteLeague = async (id) => {
    const { error } = await supabase.from("League").delete().eq("league_id", id);
    if (error) { console.error(error); return; }

    const remaining = leagues.filter((l) => l.league_id !== id);
    setLeagues(remaining);

    if (currentLeague?.league_id === id) {
      if (remaining.length > 0) {
        switchLeague(remaining[0]);
      } else {
        setCurrentLeague(null);
        localStorage.removeItem("currentLeagueId");
      }
    }
  };

  // ── Game state ────────────────────────────────────────────────────
  const [currentGameId, setCurrentGameId] = useState(() => {
    const stored = localStorage.getItem("currentGameId");
    return stored ? parseInt(stored, 10) : null;
  });

  const exitingRef = useRef(false);

  const {
    game,
    homePlayers,
    awayPlayers,
    initialGameState,
    loading: gameLoading,
    error: gameError,
    updateJersey,  // ← added
  } = useGame(currentGameId);

  const startGame = (gameId) => {
    exitingRef.current = false;
    setCurrentGameId(gameId);
    localStorage.setItem("currentGameId", String(gameId));
  };

  const clearGame = () => {
    exitingRef.current = true;
    setCurrentGameId(null);
    localStorage.removeItem("currentGameId");
  };

  return (
    <LeagueContext.Provider
      value={{
        // league
        leagues,
        currentLeague,
        switchLeague,
        createLeague,
        deleteLeague,
        // game
        currentGameId,
        startGame,
        clearGame,
        exitingRef,
        game,
        homePlayers,
        awayPlayers,
        initialGameState,
        gameLoading,
        gameError,
        updateJersey,  // ← added
      }}
    >
      {children}
    </LeagueContext.Provider>
  );
}

export function useLeague() {
  return useContext(LeagueContext);
}