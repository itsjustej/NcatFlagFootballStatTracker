import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useGame } from "./useGame";

const LeagueContext = createContext(null);
const STORED_LEAGUE_KEY = "currentLeague";

function readStoredLeague() {
  try {
    const raw = localStorage.getItem(STORED_LEAGUE_KEY);
    if (raw) {
      const league = JSON.parse(raw);
      if (league && typeof league.league_id === "number") return league;
    }
  } catch {
    /* fall through to the id saved by older sessions */
  }
  const id = parseInt(localStorage.getItem("currentLeagueId") || "", 10);
  if (Number.isNaN(id)) return null;
  return { league_id: id, name: "" };
}

function storeLeague(league) {
  if (!league) {
    localStorage.removeItem(STORED_LEAGUE_KEY);
    localStorage.removeItem("currentLeagueId");
    return;
  }
  localStorage.setItem(STORED_LEAGUE_KEY, JSON.stringify({
    league_id: league.league_id,
    name: league.name,
  }));
  localStorage.setItem("currentLeagueId", String(league.league_id));
}

export function LeagueProvider({ children }) {
  const { pathname } = useLocation();
  // ── League state ──────────────────────────────────────────────────
  const [leagues, setLeagues] = useState([]);
  const [currentLeague, setCurrentLeague] = useState(readStoredLeague);

  useEffect(() => {
    const fetchLeagues = async () => {
      const { data } = await supabase.from("League").select("*");
      if (!data) return;
      setLeagues(data);

      const storedId = readStoredLeague()?.league_id
        ?? parseInt(localStorage.getItem("currentLeagueId") || "", 10);
      const found = data.find((l) => l.league_id === storedId);
      if (found) {
        setCurrentLeague(found);
        storeLeague(found);
        return;
      }
      if (data.length > 0) {
        setCurrentLeague(data[0]);
        storeLeague(data[0]);
      }
    };
    fetchLeagues();
  }, []);

  const switchLeague = (league) => {
    setCurrentLeague(league);
    storeLeague(league);
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
        storeLeague(null);
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
  } = useGame(pathname === "/game" ? currentGameId : null);

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