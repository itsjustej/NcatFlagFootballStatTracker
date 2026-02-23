import React, {
  useState,
  useMemo,
  useEffect,
  useCallback
} from "react";

import { Scoreboard } from "../components/scoreboard/Scoreboard.jsx";
import { PlayerSection } from "../components/players/PlayerSection.jsx";
import { ActionGrid } from "../components/actions/ActionGrid.jsx";
import { Footer } from "../components/layout/Footer.jsx";
import { FollowUpModal } from "../components/modals/FollowUpModal.jsx";
import { StatusOverlay } from "../components/modals/StatusOverlay.jsx";
import { SubstitutionModal } from "../components/modals/SubstitutionModal.jsx";
import { StatsPanel } from "../components/stats/StatsPanel.jsx";

import {
  calculatePlayerStats,
  calculateTeamStats,
  calculatePlusMinus
} from "../utils/StatCalculations.jsx";

import { defaultGameState } from "../data/gameDefaults.js";

const FALLBACK_SETTINGS = {
  quarterLength: 12,
  startScore: 0,
  trackPlusMinus: true
};

export default function GamePage() {

  /* ---------------------------------------------------------
     LOAD GAME
  --------------------------------------------------------- */
  const [loaded, setLoaded] = useState(false);
  const [teamA, setTeamA] = useState([]);
  const [teamB, setTeamB] = useState([]);
  const [teamAMeta, setTeamAMeta] = useState({
    name: "Team A",
    color: null,
    id: null
  });
  const [teamBMeta, setTeamBMeta] = useState({
    name: "Team B",
    color: null,
    id: null
  });
  const [settings, setSettings] = useState(null);
  const [gameState, setGameState] = useState(defaultGameState);
  const [gameId, setGameId] = useState(null);
  const [initialPlayerStats, setInitialPlayerStats] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("currentGame");

    if (!saved) {
      window.location.href = "/start-game";
      return;
    }

    const parsed = JSON.parse(saved);

    const normalizePlayers = (teamData, teamLabel) => {
      const rawPlayers =
        Array.isArray(teamData?.players) && teamData.players.length
          ? teamData.players
          : Array.isArray(teamData?.Players)
            ? teamData.Players
            : [];

      return rawPlayers.map((player) => ({
        ...player,
        id: player.id ?? player.PlayerID,
        name: player.name ?? player.PlayerName,
        team: teamLabel,
        isActive: player.isActive ?? true
      }));
    };

    setTeamA(normalizePlayers(parsed.teamA, "A"));
    setTeamB(normalizePlayers(parsed.teamB, "B"));
    setTeamAMeta({
      name: parsed.teamA?.TeamName || parsed.teamA?.name || "Team A",
      color: parsed.teamA?.TeamColor || parsed.teamA?.color || null,
      id: parsed.teamA?.TeamID ?? parsed.teamA?.id ?? null
    });
    setTeamBMeta({
      name: parsed.teamB?.TeamName || parsed.teamB?.name || "Team B",
      color: parsed.teamB?.TeamColor || parsed.teamB?.color || null,
      id: parsed.teamB?.TeamID ?? parsed.teamB?.id ?? null
    });
    setGameId(parsed.gameId ?? parsed.GameID ?? null);

    // If we continued a game from history, we may have an initial box score
    // with per-player stats from the database. Normalize that into a map
    // keyed by player ID so live stats start from those values.
    if (parsed.initialBoxScore) {
      const baseStats = {};

      const addTeam = (players, teamLabel) => {
        (players || []).forEach((p) => {
          const id = p.number ?? p.PlayerID ?? p.id;
          if (!id) return;
          baseStats[id] = {
            team: teamLabel,
            points: p.points ?? p.Points ?? 0,
            // We don't have shooting attempt detail from DB, so keep them at 0.
            fieldGoalsMade: 0,
            fieldGoalsAttempted: 0,
            threePointersMade: 0,
            threePointersAttempted: 0,
            freeThrowsMade: 0,
            freeThrowsAttempted: 0,
            rebounds: p.rebounds ?? p.Rebounds ?? 0,
            assists: p.assists ?? p.Assists ?? 0,
            steals: p.steals ?? p.Steals ?? 0,
            blocks: p.blocks ?? p.Blocks ?? 0,
            turnovers: p.turnovers ?? p.Turnovers ?? 0,
            fouls: p.fouls ?? p.Fouls ?? 0
          };
        });
      };

      addTeam(parsed.initialBoxScore.teamA, "A");
      addTeam(parsed.initialBoxScore.teamB, "B");

      setInitialPlayerStats(baseStats);
    }

    const savedSettings = parsed.settings || FALLBACK_SETTINGS;
    setSettings(savedSettings);

    const baseState = {
      ...defaultGameState,
      teamAScore: savedSettings.startScore ?? 0,
      teamBScore: savedSettings.startScore ?? 0,
      quarterLength: savedSettings.quarterLength ?? 12
    };

    const initial = parsed.initialState || {};

    setGameState({
      ...baseState,
      teamAScore: initial.teamAScore ?? baseState.teamAScore,
      teamBScore: initial.teamBScore ?? baseState.teamBScore,
      teamAFouls: initial.teamAFouls ?? baseState.teamAFouls,
      teamBFouls: initial.teamBFouls ?? baseState.teamBFouls
    });

    setLoaded(true);
  }, []);

  /* ---------------------------------------------------------
     UI STATE
  --------------------------------------------------------- */
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [statHistory, setStatHistory] = useState([]);
  const [statusMessages, setStatusMessages] = useState([]);
  const [substitutionModal, setSubstitutionModal] = useState({ isOpen: false });

  // Follow-up state
  const [followUpAction, setFollowUpAction] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

  /* ---------------------------------------------------------
     PLAYER GROUPS
  --------------------------------------------------------- */
  const activeTeamAPlayers = teamA.filter((p) => p.isActive);
  const activeTeamBPlayers = teamB.filter((p) => p.isActive);
  const allActivePlayers = [...activeTeamAPlayers, ...activeTeamBPlayers];
  const allPlayers = [...teamA, ...teamB];

  /* ---------------------------------------------------------
     STATS
  --------------------------------------------------------- */
  const playerStats = useMemo(() => {
    const base = calculatePlayerStats(allPlayers, statHistory, initialPlayerStats || {});
    const plusMinus = calculatePlusMinus(allPlayers, statHistory);

    return base.map((p) => ({
      ...p,
      plusMinus: plusMinus[p.playerId] || 0
    }));
  }, [allPlayers, statHistory, initialPlayerStats]);

  const teamAStats = useMemo(
    () => calculateTeamStats("A", playerStats),
    [playerStats]
  );
  const teamBStats = useMemo(
    () => calculateTeamStats("B", playerStats),
    [playerStats]
  );

  /* ---------------------------------------------------------
     STATUS MESSAGE
  --------------------------------------------------------- */
  const showStatus = useCallback((text, color) => {
    setStatusMessages((prev) => [...prev, { text, color }]);
  }, []);

  const statusColor = (type) =>
    ({
      ASSIST: "bg-yellow-500",
      REBOUND: "bg-purple-500",
      STEAL: "bg-black",
      BLOCK: "bg-black",
      FOUL: "bg-orange-500",
      "2PT_MAKE": "bg-green-500",
      "3PT_MAKE": "bg-green-500",
      "FT_MAKE": "bg-green-600",
      "2PT_MISS": "bg-red-500",
      "3PT_MISS": "bg-red-500",
      "FT_MISS": "bg-red-500",
      TURNOVER: "bg-red-500"
    }[type] || "bg-gray-800");

  /* ---------------------------------------------------------
     SELECT PLAYER
  --------------------------------------------------------- */
  const handlePlayerSelect = useCallback((p) => {
    setSelectedPlayer(p);
  }, []);

  /* ---------------------------------------------------------
     LOG STAT ENTRY
  --------------------------------------------------------- */
  const logStat = (player, action, points, newAScore, newBScore) => {
    const entry = {
      id: Date.now().toString(),
      playerId: player.id,
      playerName: player.name,
      team: player.team,
      action,
      points,
      quarter: gameState.quarter,
      teamAScoreAfter: newAScore,
      teamBScoreAfter: newBScore,
      activePlayersAtTime: allActivePlayers.map((p) => p.id),
      timestamp: new Date()
    };

    setStatHistory((prev) => [...prev, entry]);

    // Persist to backend aggregated stats so DB-backed views (team stats,
    // league leaders, box scores) stay in sync with the live tracker.
    if (gameId && player.id) {
      fetch("http://localhost:5000/api/game-stats/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameID: Number(gameId),
          playerID: Number(player.id),
          action,
          points
        })
      }).catch((err) => {
        console.error("Failed to update game stats:", err);
      });
    }
  };

  /* ---------------------------------------------------------
     PROCESS NON-FOLLOW-UP ACTION
  --------------------------------------------------------- */
  const processImmediateAction = (player, action, points) => {
    const isTeamA = player.team === "A";

    // Score updates
    const newAScore = isTeamA ? gameState.teamAScore + (points || 0) : gameState.teamAScore;
    const newBScore = !isTeamA ? gameState.teamBScore + (points || 0) : gameState.teamBScore;

    if (points) {
      setGameState((prev) => ({ ...prev, teamAScore: newAScore, teamBScore: newBScore }));
    }

    // Foul increments
    if (action === "FOUL") {
      setGameState((prev) => ({
        ...prev,
        teamAFouls: isTeamA ? prev.teamAFouls + 1 : prev.teamAFouls,
        teamBFouls: !isTeamA ? prev.teamBFouls + 1 : prev.teamBFouls
      }));
    }

    logStat(player, action, points, newAScore, newBScore);

    showStatus(
      `${player.name} — ${action.replace("_", " ")} ✓`,
      statusColor(action)
    );
  };

  /* ---------------------------------------------------------
     ACTION TRIGGER
  --------------------------------------------------------- */
const handleAction = useCallback(
  (action, points) => {
    if (!selectedPlayer) return;

    // Prevent new actions during follow-up
    if (followUpAction) return;

    // 🔥 Follow-up for STEAL
    if (action === "STEAL") {
      const eligible = allActivePlayers.filter(
        (p) => p.team !== selectedPlayer.team
      );

      setPendingAction({ action, points });
      setFollowUpAction({
        question: "Who lost the ball?",
        eligiblePlayers: eligible
      });

      return;
    }

    // 🔥 Follow-up for MISSES → Who rebounded?
    if (["2PT_MISS", "3PT_MISS", "FT_MISS"].includes(action)) {
      const eligible = allActivePlayers;

      setPendingAction({ action, points });
      setFollowUpAction({
        question: "Who got the rebound?",
        eligiblePlayers: eligible
      });

      return;
    }

    // 🔥 Follow-up for MADE SHOTS → Who made the assist?
    if (["2PT_MAKE", "3PT_MAKE"].includes(action)) {
      const eligible = allActivePlayers.filter(
        (p) => p.team === selectedPlayer.team && p.id !== selectedPlayer.id
      );

      setPendingAction({ action: "ASSIST", points, madeShot: action });
      setFollowUpAction({
        question: "Who made the assist?",
        eligiblePlayers: eligible
      });

      return;
    }

    // Immediate actions (rebounds, fouls, blocks, etc.)
    processImmediateAction(selectedPlayer, action, points);
  },
  [selectedPlayer, followUpAction, allActivePlayers, gameState]
);

/* ---------------------------------------------------------
     RESOLVE FOLLOW-UP
  --------------------------------------------------------- */
const handleFollowUpSelect = (otherPlayer) => {
  if (!pendingAction || !selectedPlayer) return;

  const { action, points, madeShot } = pendingAction;

  const isTeamA = selectedPlayer.team === "A";
  const newAScore = isTeamA ? gameState.teamAScore + (points || 0) : gameState.teamAScore;
  const newBScore = !isTeamA ? gameState.teamBScore + (points || 0) : gameState.teamBScore;

  // Update score if needed
  if (points) {
    setGameState((prev) => ({
      ...prev,
      teamAScore: newAScore,
      teamBScore: newBScore
    }));
  }

  /* -------------------- STEAL -------------------- */
  if (action === "STEAL") {
    logStat(selectedPlayer, "STEAL", 0, newAScore, newBScore);
    showStatus(`${selectedPlayer.name} — STEAL ✓`, statusColor("STEAL"));

    logStat(otherPlayer, "TURNOVER", 0, newAScore, newBScore);
    showStatus(`${otherPlayer.name} — TURNOVER ✓`, statusColor("TURNOVER"));
  }

  /* -------------------- MISSES → REBOUND -------------------- */
  if (["2PT_MISS", "3PT_MISS", "FT_MISS"].includes(action)) {
    logStat(selectedPlayer, action, 0, newAScore, newBScore);
    showStatus(`${selectedPlayer.name} — MISS ✓`, statusColor(action));

    logStat(otherPlayer, "REBOUND", 0, newAScore, newBScore);
    showStatus(`${otherPlayer.name} — REBOUND ✓`, statusColor("REBOUND"));
  }

  /* -------------------- MADE SHOT → ASSIST -------------------- */
  if (action === "ASSIST") {
    // scorer (selectedPlayer)
    logStat(selectedPlayer, madeShot, points, newAScore, newBScore);
    showStatus(`${selectedPlayer.name} — ${madeShot.replace("_", " ")} ✓`, statusColor(madeShot));

    // assister (otherPlayer)
    logStat(otherPlayer, "ASSIST", 0, newAScore, newBScore);
    showStatus(`${otherPlayer.name} — ASSIST ✓`, statusColor("ASSIST"));
  }

  // Reset follow-up
  setFollowUpAction(null);
  setPendingAction(null);
};

const handleFollowUpSkip = () => {
  setFollowUpAction(null);
  setPendingAction(null);
};

  /* ---------------------------------------------------------
     SUBSTITUTIONS
  --------------------------------------------------------- */
  const handleSubstitution = () => setSubstitutionModal({ isOpen: true });

  const ensureGameStatRow = useCallback(
    (playerId) => {
      if (!gameId || !playerId) return;

      fetch("http://localhost:5000/api/game-stats/create-if-missing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameID: Number(gameId),
          playerID: Number(playerId)
        })
      }).catch((err) => {
        console.error("Failed to ensure game stat row:", err);
      });
    },
    [gameId]
  );

  const handleSubstitutionSelect = useCallback(
    (playerOut, playerIn) => {
      const updateTeam = (teamSetter, teamPlayers) =>
        teamSetter(
          teamPlayers.map((p) =>
            p.id === playerOut.id
              ? { ...p, isActive: false }
              : p.id === playerIn.id
              ? { ...p, isActive: true }
              : p
          )
        );

      playerOut.team === "A"
        ? updateTeam(setTeamA, teamA)
        : updateTeam(setTeamB, teamB);

      showStatus(
        `Sub — ${playerOut.name} out → ${playerIn.name} in`,
        "bg-blue-600"
      );

      ensureGameStatRow(playerIn.id);
    },
    [teamA, teamB, ensureGameStatRow]
  );

  /* ---------------------------------------------------------
     SAVE GAME (placeholder)
  --------------------------------------------------------- */
  const handleSaveExit = () => {
    const payload = {
      gameId,
      gameDate: new Date().toISOString(),
      teamA: { ...teamAMeta, players: teamA },
      teamB: { ...teamBMeta, players: teamB },
      settings,
      statHistory,
      gameState
    };

    localStorage.setItem("currentGame", JSON.stringify(payload));

    showStatus("Game saved!", "bg-green-700");
  };

  /* ---------------------------------------------------------
     UNDO
  --------------------------------------------------------- */
  const handleUndo = () => {
    if (statHistory.length < 1) return;

    setStatHistory((prev) => prev.slice(0, -1));
    showStatus("Last action undone", "bg-gray-600");
  };

  /* ---------------------------------------------------------
     RENDER
  --------------------------------------------------------- */
  if (!loaded) {
    return <div className="text-center text-gray-600 p-8">Loading game…</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col lg:flex-row">
      {/* LEFT SIDE */}
      <div className="flex-1 lg:w-1/2 flex flex-col max-h-screen overflow-y-auto">
        <Scoreboard
          gameState={gameState}
          setGameState={setGameState}
          teamA={teamAMeta}
          teamB={teamBMeta}
        />

        <PlayerSection
          teamAPlayers={activeTeamAPlayers}
          teamBPlayers={activeTeamBPlayers}
          selectedPlayer={selectedPlayer}
          onPlayerSelect={handlePlayerSelect}
        />

        <ActionGrid onAction={handleAction} disabled={!selectedPlayer} />

        <Footer
          onUndo={handleUndo}
          onSubstitution={handleSubstitution}
          onSaveExit={handleSaveExit}
          canUndo={statHistory.length > 0}
        />
      </div>

      {/* RIGHT SIDE */}
      <div className="flex-1 lg:w-1/2 max-h-screen overflow-y-auto">
        <StatsPanel
          playerStats={playerStats}
          teamAStats={teamAStats}
          teamBStats={teamBStats}
          statHistory={statHistory}
          allPlayers={allPlayers}
        />
      </div>

      {/* MODALS */}
      <FollowUpModal
        followUpAction={followUpAction}
        onPlayerSelect={handleFollowUpSelect}
        onSkip={handleFollowUpSkip}
      />

      <SubstitutionModal
        isOpen={substitutionModal.isOpen}
        teamAPlayers={teamA}
        teamBPlayers={teamB}
        onSubstitute={handleSubstitutionSelect}
        onClose={() => setSubstitutionModal({ isOpen: false })}
      />

      <StatusOverlay
        messages={statusMessages}
        onClose={() => setStatusMessages([])}
      />
    </div>
  );
}
