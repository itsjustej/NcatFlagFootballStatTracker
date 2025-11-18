import React, { useState, useCallback, useMemo, useEffect } from 'react';
// COMPONENTS
import { Scoreboard } from "../components/scoreboard/Scoreboard.jsx";
import { PlayerSection } from "../components/players/PlayerSection.jsx";
import { ActionGrid } from "../components/actions/ActionGrid.jsx";
import { Footer } from "../components/layout/Footer.jsx";

// MODALS & OVERLAYS
import { FollowUpModal } from "../components/modals/FollowUpModal.jsx";
import { StatusOverlay } from "../components/modals/StatusOverlay.jsx";
import { SubstitutionModal } from "../components/modals/SubstitutionModal.jsx";

// STATS
import { StatsPanel } from "../components/stats/StatsPanel.jsx";

// STAT CALCULATIONS
import {
  calculatePlayerStats,
  calculateTeamStats,
  calculatePlusMinus
} from "../utils/StatCalculations.jsx";



function GamePage() {
  // Game State
  const [gameState, setGameState] = useState({
    teamAScore: 0,
    teamBScore: 0,
    quarter: '1',
    teamAFouls: 0,
    teamBFouls: 0,
  });
  
  // Players
  const [teamAPlayers, setTeamAPlayers] = useState([
    { id: 'a1', name: 'Sapri Sise', jerseyNumber: 23, team: 'A', isActive: true },
    { id: 'a2', name: 'Ej Lockhart', jerseyNumber: 15, team: 'A', isActive: true },
    { id: 'a3', name: 'Ant DesRavines', jerseyNumber: 7, team: 'A', isActive: true },
    { id: 'a4', name: 'Elias Lopes', jerseyNumber: 32, team: 'A', isActive: true },
    { id: 'a5', name: 'Imani Dinkins', jerseyNumber: 11, team: 'A', isActive: true },
    // Bench players
    { id: 'a6', name: 'Jadin Hutchinson', jerseyNumber: 44, team: 'A', isActive: false },
    { id: 'a7', name: 'Elijah Lewis', jerseyNumber: 9, team: 'A', isActive: false },
  ]);

  const [teamBPlayers, setTeamBPlayers] = useState([
    { id: 'b1', name: 'Seth Williams', jerseyNumber: 24, team: 'B', isActive: true },
    { id: 'b2', name: 'Weston Culpepper', jerseyNumber: 8, team: 'B', isActive: true },
    { id: 'b3', name: 'Staci Tranquill', jerseyNumber: 16, team: 'B', isActive: true },
    { id: 'b4', name: 'Madison Pegram', jerseyNumber: 3, team: 'B', isActive: true },
    { id: 'b5', name: 'Jevaun Keith', jerseyNumber: 21, team: 'B', isActive: true },
    // Bench players
    { id: 'b6', name: 'Jamaal Davis', jerseyNumber: 0, team: 'B', isActive: false },
    { id: 'b7', name: 'Kendall Dixon', jerseyNumber: 4, team: 'B', isActive: false },
  ]);

  const [teams, setTeams] = useState({
  A: { name: "Aggies", roster: teamAPlayers },
  B: { name: "Bulldogs", roster: teamBPlayers }
  });

  // UI State
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [statHistory, setStatHistory] = useState([]);
  const [substitutionHistory, setSubstitutionHistory] = useState([]);
  const [followUpAction, setFollowUpAction] = useState(null);
  const [statusMessages, setStatusMessages] = useState([]);
  const [substitutionModal, setSubstitutionModal] = useState({
    isOpen: false,
  });

  // Get active players for display
  const activeTeamAPlayers = teams.A.roster.filter(p => p.isActive);
  const activeTeamBPlayers = teams.B.roster.filter(p => p.isActive);
  const allActivePlayers = [...activeTeamAPlayers, ...activeTeamBPlayers];
  const allPlayers = [...teams.A.roster, ...teams.B.roster];

  // Calculate stats with plus-minus
  const playerStats = useMemo(() => {
    const baseStats = calculatePlayerStats(allPlayers, statHistory);
    const plusMinusMap = calculatePlusMinus(allPlayers, statHistory);
    
    return baseStats.map(stats => ({
      ...stats,
      plusMinus: plusMinusMap[stats.playerId] || 0
    }));
  }, [allPlayers, statHistory]);
  
  const teamAStats = useMemo(() => 
    calculateTeamStats('A', playerStats), 
    [playerStats]
  );
  
  const teamBStats = useMemo(() => 
    calculateTeamStats('B', playerStats), 
    [playerStats]
  );

  const showStatus = useCallback((text, color) => {
    setStatusMessages(prev => [...prev, { text, color }]);
  }, []);

  // Takes in a player object when a user clicks/selects a player.
  // Checks If the previously selected player's ID matches the one just clicked, 
  // it deselects the player by setting selectedPlayer to null if so
  // Otherwise, it selects the new player by setting selectedPlayer to that player
  const handlePlayerSelect = useCallback((player) => {
    setSelectedPlayer(prev => prev?.id === player.id ? null : player);
  }, []);

  const getStatusColor = (type) => {
    switch (type) {
      case 'ASSIST': return 'bg-yellow-500';
      case 'REBOUND': return 'bg-purple-500';
      case 'STEAL': return 'bg-black';
      case 'BLOCK': return 'bg-black';
      case 'FOUL': return 'bg-orange-500';
      case '2PT_MAKE': return 'bg-green-500';
      case '3PT_MAKE': return 'bg-green-500';
      case 'FT_MAKE': return 'bg-green-600';
      case '2PT_MISS': return 'bg-red-500';
      case '3PT_MISS': return 'bg-red-500';
      case 'FT_MISS': return 'bg-red-500';
      case 'TURNOVER': return 'bg-red-500';
      default: return 'bg-gray-800';
    }
  };

  // Take the new stat action and add it to the end of the existing stat history list
  const addStatToHistory = useCallback((statAction) => {
    setStatHistory(prev => [...prev, statAction]);
  }, []);

  const handleAction = useCallback((action, points) => {
    
    // Depending on what team a player is on decides what value is returned for their updated score

    const newTeamAScore = selectedPlayer.team === 'A' 
  ? gameState.teamAScore + (points || 0) 
  : gameState.teamAScore;

    const newTeamBScore = selectedPlayer.team === 'B' 
  ? gameState.teamBScore + (points || 0) 
  : gameState.teamBScore;


    // creates an array of player ids of players whos onCourt boolean is set to true
    const activePlayersAtTime = allActivePlayers.map(p => p.id);

    const statAction = {
      // one row in play-by-play log, and it's what gets pushed to statHistory array
      id: Date.now().toString(),
      playerId: selectedPlayer.id,
      playerName: selectedPlayer.name,
      team: selectedPlayer.team,
      // this.action = action
      action,
      points,
      quarter: gameState.quarter,
      teamAScoreAfter: newTeamAScore,
      teamBScoreAfter: newTeamBScore,
      // an array of player IDs at the moment something happens for plus/minus purposes
      activePlayersAtTime,
      // allows u to order play by plays
      timestamp: new Date(),
    };

    // Update score if applicable
    if (points) {
      // saves previous value of the game state
      setGameState(prev => ({ 
        ...prev,
        // Overide what we want to change
        teamAScore: newTeamAScore,
        teamBScore: newTeamBScore,
      }));
    }

    // Update fouls
    if (action === 'FOUL') {
      setGameState(prev => ({
        ...prev,
        teamAFouls: selectedPlayer.team === 'A' ? prev.teamAFouls + 1 : prev.teamAFouls,
        teamBFouls: selectedPlayer.team === 'B' ? prev.teamBFouls + 1 : prev.teamBFouls,
      }));
    }

    // an array of actions that would require follow up
    const needsFollowUp = ['2PT_MAKE', '3PT_MAKE', '2PT_MISS', '3PT_MISS', 'FT_MISS', 'STEAL'];
    
    if (needsFollowUp.includes(action)) {
      let question = '';
      let eligiblePlayers = [];

      switch (action) {
        case '2PT_MAKE':
        case '3PT_MAKE':
          question = 'Who assisted?';
          eligiblePlayers = selectedPlayer.team === 'A' ? activeTeamAPlayers : activeTeamBPlayers;
          eligiblePlayers = eligiblePlayers.filter(p => p.id !== selectedPlayer.id);
          break;
        case '2PT_MISS':
        case '3PT_MISS':
        case 'FT_MISS':
          question = 'Who got the rebound?';
          eligiblePlayers = allActivePlayers;
          break;
        case 'STEAL':
          question = 'Who was stolen from?';
          eligiblePlayers = selectedPlayer.team === 'A' ? activeTeamBPlayers : activeTeamAPlayers;
          break;
      }

      setFollowUpAction({ 
        // updates something follow up modal
        type: action.includes('MAKE') ? 'assist' : action.includes('MISS') ? 'rebound' : 'steal', 
        // If the action includes the word 'MAKE', then the type is 'assist'. If miss type is rebound, else the type is steal
        originalAction: statAction,
        // Stores the full original stat so stats can update simultaneously
        question,
        // Stores question to update the modal
        eligiblePlayers,
        // list of players who can be selected off this modal
      });
    }

    addStatToHistory(statAction);
    
    // If the action does not require a follow-up, then show a status message immediately.
    if (!needsFollowUp.includes(action)) {
      showStatus(`${selectedPlayer.name} — ${action.replace('_', ' ')} ✅`, getStatusColor(action));
    }
  }, 
  
  // Rerender component everytime a change in any of these are made
  [selectedPlayer, activeTeamAPlayers, activeTeamBPlayers, allActivePlayers, showStatus, gameState, addStatToHistory]);

  const handleFollowUpSelect = useCallback((followUpPlayer) => {
    if (!followUpAction) return;

    const updatedAction = { ...followUpAction.originalAction };
    
    switch (followUpAction.type) {
      case 'assist':
        updatedAction.assistedBy = followUpPlayer.name;
        break;
      case 'rebound':
        updatedAction.reboundedBy = followUpPlayer.name;
        break;
      case 'steal':
        updatedAction.stolenFrom = followUpPlayer.name;
        break;
    }

    setStatHistory(prev => prev.map(stat => 
      stat.id === updatedAction.id ? updatedAction : stat
    ));

    // Create follow-up action for the secondary player
    const followUpStatAction = {
      id: (Date.now() + 1).toString(),
      playerId: followUpPlayer.id,
      playerName: followUpPlayer.name,
      team: followUpPlayer.team,
      action: followUpAction.type === 'assist' ? 'ASSIST' : 
              followUpAction.type === 'rebound' ? 'REBOUND' : 
              'TURNOVER',
      quarter: gameState.quarter,
      teamAScoreAfter: updatedAction.teamAScoreAfter,
      teamBScoreAfter: updatedAction.teamBScoreAfter,
      activePlayersAtTime: updatedAction.activePlayersAtTime,
      timestamp: new Date(Date.now() + 1),
    };

    addStatToHistory(followUpStatAction);

    const original = followUpAction.originalAction;
    const originalFormatted = original.action.replace(/_/g, ' ');
    const secondaryAction = followUpAction.type === 'steal' ? 'TURNOVER' : followUpAction.type.toUpperCase();

    showStatus(`${original.playerName} — ${originalFormatted} ✅`, getStatusColor(original.action));
    showStatus(`${followUpPlayer.name} — ${secondaryAction} ✅`, getStatusColor(secondaryAction));

    setFollowUpAction(null);
  }, [followUpAction, showStatus, gameState, addStatToHistory]);

  const handleFollowUpSkip = useCallback(() => {
    if (!followUpAction) return;

    const original = followUpAction.originalAction;
    showStatus(`${original.playerName} — ${original.action.replace('_', ' ')} ✅`, getStatusColor(original.action));
    setFollowUpAction(null);
  }, [followUpAction, showStatus]);

  const handleUndo = useCallback(() => {
    
  
    const lastStat = statHistory[statHistory.length - 1];
    const lastSub = substitutionHistory[substitutionHistory.length - 1];
    
    // We should undo the last stat action if, A stat exists, and Either no substitution exists, or The stat happened after the substitution”
    const shouldUndoStat = lastStat && (!lastSub || lastStat.timestamp > lastSub.timestamp);
    
    if (shouldUndoStat) {
      // Undo last stat action
      const lastAction = statHistory[statHistory.length - 1];
      
      // Reverse score changes
      if (lastAction.points) {
        setGameState(prev => ({
          ...prev,
          teamAScore: lastAction.team === 'A' ? prev.teamAScore - lastAction.points : prev.teamAScore,
          teamBScore: lastAction.team === 'B' ? prev.teamBScore - lastAction.points : prev.teamBScore,
        }));
      }

      // Reverse foul changes
      if (lastAction.action === 'FOUL') {
        setGameState(prev => ({
          ...prev,
          teamAFouls: lastAction.team === 'A' ? prev.teamAFouls - 1 : prev.teamAFouls,
          teamBFouls: lastAction.team === 'B' ? prev.teamBFouls - 1 : prev.teamBFouls,
        }));
      }

      // Now the last stat is 1 stat previous
      setStatHistory(prev => prev.slice(0, -1));
      // Flash Conifrmation message
      showStatus('Last action undone');
    } else if (lastSub) {
      // Undo last substitution
      const { team, playerOut, playerIn } = lastSub;
      
      if (team === 'A') {
        setTeamAPlayers(prev => prev.map(p => {
          if (p.id === playerOut.id) return { ...p, isActive: true };
          if (p.id === playerIn.id) return { ...p, isActive: false };
          return p;
        }));
      } else {
        setTeamBPlayers(prev => prev.map(p => {
          if (p.id === playerOut.id) return { ...p, isActive: true };
          if (p.id === playerIn.id) return { ...p, isActive: false };
          return p;
        }));
      }
      
      setSubstitutionHistory(prev => prev.slice(0, -1));
      showStatus(`Substitution undone: ${playerOut.name} back in, ${playerIn.name} to bench`);
    }
  }, [statHistory, substitutionHistory, showStatus]);

  const handleSubstitution = useCallback(() => {
    setSubstitutionModal({ isOpen: true });
  }, []);

  const handleSubstitutionSelect = useCallback((playerOut, playerIn) => {
    const substitution = {
      id: Date.now().toString(),
      team: playerOut.team,
      playerOut,
      playerIn,
      timestamp: new Date(),
    };

    // Update player rosters
    if (playerOut.team === 'A') {
      setTeamAPlayers(prev => prev.map(p => {
        if (p.id === playerOut.id) return { ...p, isActive: false };
        if (p.id === playerIn.id) return { ...p, isActive: true };
        return p;
      }));
    } else {
      setTeamBPlayers(prev => prev.map(p => {
        if (p.id === playerOut.id) return { ...p, isActive: false };
        if (p.id === playerIn.id) return { ...p, isActive: true };
        return p;
      }));
    }

    // Clear selected player if they were substituted out
    if (selectedPlayer?.id === playerOut.id) {
      setSelectedPlayer(null);
    }

    setSubstitutionHistory(prev => [...prev, substitution]);
    showStatus(`Substitution: ${playerOut.name} out, ${playerIn.name} in`);
  }, [selectedPlayer, showStatus]);

  const handleSaveExit = useCallback(() => {
    showStatus('Game saved successfully!');
    // Here you would implement actual save logic
  }, [showStatus]);

  const canUndo = statHistory.length > 0 || substitutionHistory.length > 0;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col lg:flex-row">
      {/* Left Side - Stat Tracking Interface */}
      <div className="flex-1 lg:w-1/2 flex flex-col max-h-screen overflow-y-auto scrollbar-hide">
        {/* Scoreboard */}
        <Scoreboard 
        gameState={gameState} 
        setGameState={setGameState}
        teamA={teams.A}
        teamB={teams.B}/>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Players Section */}
          <PlayerSection
            teamAPlayers={activeTeamAPlayers}
            teamBPlayers={activeTeamBPlayers}
            selectedPlayer={selectedPlayer}
            onPlayerSelect={handlePlayerSelect}
          />

          {/* Action Grid */}
          <ActionGrid
            onAction={handleAction}
            // Sets disabled depeneding on if a player is selected or not
            disabled={!selectedPlayer}
          />

          {/* Footer */}
          <Footer
            onUndo={handleUndo}
            onSubstitution={handleSubstitution}
            onSaveExit={handleSaveExit}
            canUndo={canUndo}
          />
        </div>
      </div>

      {/* Right Side - Stats Panel */}
      <div className="flex-1 lg:w-1/2 max-h-screen overflow-y-auto scrollbar-hide">
        <StatsPanel
          playerStats={playerStats}
          teamAStats={teamAStats}
          teamBStats={teamBStats}
          statHistory={statHistory}
          allPlayers={allPlayers}
        />
      </div>

      {/* Modals and Overlays */}
      <FollowUpModal
        followUpAction={followUpAction}
        onPlayerSelect={handleFollowUpSelect}
        onSkip={handleFollowUpSkip}
      />

      <SubstitutionModal
        isOpen={substitutionModal.isOpen}
        teamAPlayers={teamAPlayers}
        teamBPlayers={teamBPlayers}
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

export default GamePage;