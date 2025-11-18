import React, { useState, useMemo } from 'react';
import { BarChart3, Users, Activity } from 'lucide-react';
import { extractPlayByPlay } from "../utils/StatCalculations.jsx";


export const StatsPanel = ({
  playerStats,
  teamAStats,
  teamBStats,
  statHistory,
  allPlayers
}) => {
  const [viewMode, setViewMode] = useState('box-score');

  const teamAPlayers = useMemo(() => playerStats.filter(p => p.team === 'A'), [playerStats]);
  const teamBPlayers = useMemo(() => playerStats.filter(p => p.team === 'B'), [playerStats]);
  const playByPlayItems = useMemo(() => extractPlayByPlay(statHistory, allPlayers), [statHistory, allPlayers]);

  // Calculate actual team stats from player stats
  const calculatedTeamAStats = useMemo(() => {
    const totals = teamAPlayers.reduce((acc, player) => ({
      points: acc.points + player.points,
      fieldGoalsMade: acc.fieldGoalsMade + player.fieldGoalsMade,
      fieldGoalsAttempted: acc.fieldGoalsAttempted + player.fieldGoalsAttempted,
      threePointersMade: acc.threePointersMade + player.threePointersMade,
      threePointersAttempted: acc.threePointersAttempted + player.threePointersAttempted,
      freeThrowsMade: acc.freeThrowsMade + player.freeThrowsMade,
      freeThrowsAttempted: acc.freeThrowsAttempted + player.freeThrowsAttempted,
      rebounds: acc.rebounds + player.rebounds,
      assists: acc.assists + player.assists,
      steals: acc.steals + player.steals,
      blocks: acc.blocks + player.blocks,
      turnovers: acc.turnovers + player.turnovers,
      fouls: acc.fouls + player.fouls,
    }), {
      points: 0, fieldGoalsMade: 0, fieldGoalsAttempted: 0,
      threePointersMade: 0, threePointersAttempted: 0,
      freeThrowsMade: 0, freeThrowsAttempted: 0,
      rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0,
    });

    return {
      ...totals,
      fieldGoalPercentage: totals.fieldGoalsAttempted > 0 
        ? Math.round((totals.fieldGoalsMade / totals.fieldGoalsAttempted) * 100) 
        : 0,
      threePointPercentage: totals.threePointersAttempted > 0 
        ? Math.round((totals.threePointersMade / totals.threePointersAttempted) * 100) 
        : 0,
      freeThrowPercentage: totals.freeThrowsAttempted > 0 
        ? Math.round((totals.freeThrowsMade / totals.freeThrowsAttempted) * 100) 
        : 0,
    };
  }, [teamAPlayers]);

  const calculatedTeamBStats = useMemo(() => {
    const totals = teamBPlayers.reduce((acc, player) => ({
      points: acc.points + player.points,
      fieldGoalsMade: acc.fieldGoalsMade + player.fieldGoalsMade,
      fieldGoalsAttempted: acc.fieldGoalsAttempted + player.fieldGoalsAttempted,
      threePointersMade: acc.threePointersMade + player.threePointersMade,
      threePointersAttempted: acc.threePointersAttempted + player.threePointersAttempted,
      freeThrowsMade: acc.freeThrowsMade + player.freeThrowsMade,
      freeThrowsAttempted: acc.freeThrowsAttempted + player.freeThrowsAttempted,
      rebounds: acc.rebounds + player.rebounds,
      assists: acc.assists + player.assists,
      steals: acc.steals + player.steals,
      blocks: acc.blocks + player.blocks,
      turnovers: acc.turnovers + player.turnovers,
      fouls: acc.fouls + player.fouls,
    }), {
      points: 0, fieldGoalsMade: 0, fieldGoalsAttempted: 0,
      threePointersMade: 0, threePointersAttempted: 0,
      freeThrowsMade: 0, freeThrowsAttempted: 0,
      rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0,
    });

    return {
      ...totals,
      fieldGoalPercentage: totals.fieldGoalsAttempted > 0 
        ? Math.round((totals.fieldGoalsMade / totals.fieldGoalsAttempted) * 100) 
        : 0,
      threePointPercentage: totals.threePointersAttempted > 0 
        ? Math.round((totals.threePointersMade / totals.threePointersAttempted) * 100) 
        : 0,
      freeThrowPercentage: totals.freeThrowsAttempted > 0 
        ? Math.round((totals.freeThrowsMade / totals.freeThrowsAttempted) * 100) 
        : 0,
    };
  }, [teamBPlayers]);

  const renderPlayerRow = (player) => (
    <tr key={player.playerId} className="border-b border-gray-100">
      <td className="p-2 font-medium">{player.playerName}</td>
      <td className="text-center p-2 font-bold">{player.points}</td>
      <td className="text-center p-2">{player.fieldGoalsMade}/{player.fieldGoalsAttempted}</td>
      <td className="text-center p-2">{player.threePointersMade}/{player.threePointersAttempted}</td>
      <td className="text-center p-2">{player.freeThrowsMade}/{player.freeThrowsAttempted}</td>
      <td className="text-center p-2">{player.rebounds}</td>
      <td className="text-center p-2">{player.assists}</td>
      <td className="text-center p-2">{player.steals}</td>
      <td className="text-center p-2">{player.blocks}</td>
      <td className="text-center p-2">{player.turnovers}</td>
      <td className="text-center p-2">{player.fouls}</td>
      <td className={`text-center p-2 font-semibold ${player.plusMinus > 0 ? 'text-green-600' : player.plusMinus < 0 ? 'text-red-600' : 'text-gray-600'}`}>
        {player.plusMinus > 0 ? '+' : ''}{player.plusMinus}
      </td>
    </tr>
  );

  const renderStatRow = (label, teamAValue, teamBValue, highlight = 'none') => (
    <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-100">
      <div className={`text-center p-2 rounded ${highlight === 'A' ? 'bg-blue-100 font-bold' : ''}`}>
        {teamAValue}
      </div>
      <div className="text-center font-medium text-gray-700">{label}</div>
      <div className={`text-center p-2 rounded ${highlight === 'B' ? 'bg-yellow-100 font-bold' : ''}`}>
        {teamBValue}
      </div>
    </div>
  );

  const getHighlight = (valueA, valueB) => {
    if (valueA > valueB) return 'A';
    if (valueB > valueA) return 'B';
    return 'none';
  };

  const getActionIcon = (action) => {
    switch (action) {
      case '2PT_MAKE': return '🏀';
      case '3PT_MAKE': return '🎯';
      case 'FT_MAKE': return '👍';
      case '2PT_MISS': return '❌';
      case '3PT_MISS': return '🧱';
      case 'FT_MISS': return '👎';
      case 'REBOUND': return '⬆️';
      case 'ASSIST': return '🤝';
      case 'STEAL': return '🦾';
      case 'BLOCK': return '🚫';
      case 'TURNOVER': return '❓';
      case 'FOUL': return '⚠️';
      default: return '⚡';
    }
  };

  const getActionLabel = (action) => {
    switch (action) {
      case '2PT_MAKE': return '2PT Make';
      case '3PT_MAKE': return '3PT Make';
      case 'FT_MAKE': return 'FT Make';
      case '2PT_MISS': return '2PT Miss';
      case '3PT_MISS': return '3PT Miss';
      case 'FT_MISS': return 'FT Miss';
      case 'REBOUND': return 'Rebound';
      case 'ASSIST': return 'Assist';
      case 'STEAL': return 'Steal';
      case 'BLOCK': return 'Block';
      case 'TURNOVER': return 'Turnover';
      case 'FOUL': return 'Foul';
      default: return action.replace('_', ' ');
    }
  };

  const getPlayerStatDisplay = (action, playerCurrentStats) => {
    if (!playerCurrentStats) return '';
    
    switch (action) {
      case '2PT_MAKE':
      case '3PT_MAKE':
      case 'FT_MAKE':
        return playerCurrentStats.points ? `(${playerCurrentStats.points} points)` : '';
      case 'REBOUND':
        return playerCurrentStats.rebounds ? `(${playerCurrentStats.rebounds} rebounds)` : '';
      case 'ASSIST':
        return playerCurrentStats.assists ? `(${playerCurrentStats.assists} assists)` : '';
      case 'STEAL':
        return playerCurrentStats.steals ? `(${playerCurrentStats.steals} steals)` : '';
      case 'BLOCK':
        return playerCurrentStats.blocks ? `(${playerCurrentStats.blocks} blocks)` : '';
      case 'TURNOVER':
        return playerCurrentStats.turnovers ? `(${playerCurrentStats.turnovers} turnovers)` : '';
      case 'FOUL':
        return playerCurrentStats.fouls ? `(${playerCurrentStats.fouls} fouls)` : '';
      default:
        return '';
    }
  };

  const groupedPlayByPlay = useMemo(() => {
    const groups = {};
    playByPlayItems.forEach(play => {
      if (!groups[play.quarter]) {
        groups[play.quarter] = [];
      }
      groups[play.quarter].push(play);
    });
    return groups;
  }, [playByPlayItems]);

  return (
    <div className="h-full bg-white border-l border-gray-200 flex flex-col">
      {/* Header Toggle */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex rounded-lg bg-gray-200 p-1">
          <button
            onClick={() => setViewMode('box-score')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-md font-medium transition-all duration-200 text-sm ${
              viewMode === 'box-score' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 size={16} />
            Box Score
          </button>
          <button
            onClick={() => setViewMode('team-comparison')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-md font-medium transition-all duration-200 text-sm ${
              viewMode === 'team-comparison' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users size={16} />
            Team Stats
          </button>
          <button
            onClick={() => setViewMode('play-by-play')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-md font-medium transition-all duration-200 text-sm ${
              viewMode === 'play-by-play' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Activity size={16} />
            Play by Play
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
        {viewMode === 'box-score' ? (
          <>
            {/* Team A */}
            <div>
              <h3 className="text-lg font-bold text-blue-600 mb-3">TEAM A</h3>
              <table className="w-full text-xs bg-blue-50 rounded-lg overflow-hidden">
                <thead className="bg-blue-100">
                  <tr>
                    <th className="text-left p-2 font-semibold">Player</th>
                    <th className="text-center p-2 font-semibold">PTS</th>
                    <th className="text-center p-2 font-semibold">FG</th>
                    <th className="text-center p-2 font-semibold">3PT</th>
                    <th className="text-center p-2 font-semibold">FT</th>
                    <th className="text-center p-2 font-semibold">REB</th>
                    <th className="text-center p-2 font-semibold">AST</th>
                    <th className="text-center p-2 font-semibold">STL</th>
                    <th className="text-center p-2 font-semibold">BLK</th>
                    <th className="text-center p-2 font-semibold">TO</th>
                    <th className="text-center p-2 font-semibold">FLS</th>
                    <th className="text-center p-2 font-semibold">+/-</th>
                  </tr>
                </thead>
                <tbody>
                  {teamAPlayers.map(renderPlayerRow)}
                </tbody>
              </table>
            </div>

            {/* Team B */}
            <div>
              <h3 className="text-lg font-bold text-yellow-600 mb-3">TEAM B</h3>
              <table className="w-full text-xs bg-yellow-50 rounded-lg overflow-hidden">
                <thead className="bg-yellow-100">
                  <tr>
                    <th className="text-left p-2 font-semibold">Player</th>
                    <th className="text-center p-2 font-semibold">PTS</th>
                    <th className="text-center p-2 font-semibold">FG</th>
                    <th className="text-center p-2 font-semibold">3PT</th>
                    <th className="text-center p-2 font-semibold">FT</th>
                    <th className="text-center p-2 font-semibold">REB</th>
                    <th className="text-center p-2 font-semibold">AST</th>
                    <th className="text-center p-2 font-semibold">STL</th>
                    <th className="text-center p-2 font-semibold">BLK</th>
                    <th className="text-center p-2 font-semibold">TO</th>
                    <th className="text-center p-2 font-semibold">FLS</th>
                    <th className="text-center p-2 font-semibold">+/-</th>
                  </tr>
                </thead>
                <tbody>
                  {teamBPlayers.map(renderPlayerRow)}
                </tbody>
              </table>
            </div>
          </>
        ) : viewMode === 'team-comparison' ? (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4 mb-4 pb-3 border-b-2 border-gray-200">
              <div className="text-center font-bold text-blue-600">TEAM A</div>
              <div className="text-center font-bold text-gray-800">STATS</div>
              <div className="text-center font-bold text-yellow-600">TEAM B</div>
            </div>

            <div className="space-y-1">
              {renderStatRow("Points", calculatedTeamAStats.points, calculatedTeamBStats.points, getHighlight(calculatedTeamAStats.points, calculatedTeamBStats.points))}
              {renderStatRow("Field Goals (FG%)", `${calculatedTeamAStats.fieldGoalsMade}/${calculatedTeamAStats.fieldGoalsAttempted} (${calculatedTeamAStats.fieldGoalPercentage}%)`, `${calculatedTeamBStats.fieldGoalsMade}/${calculatedTeamBStats.fieldGoalsAttempted} (${calculatedTeamBStats.fieldGoalPercentage}%)`, getHighlight(calculatedTeamAStats.fieldGoalPercentage, calculatedTeamBStats.fieldGoalPercentage))}
              {renderStatRow("3-Pointers (3PT%)", `${calculatedTeamAStats.threePointersMade}/${calculatedTeamAStats.threePointersAttempted} (${calculatedTeamAStats.threePointPercentage}%)`, `${calculatedTeamBStats.threePointersMade}/${calculatedTeamBStats.threePointersAttempted} (${calculatedTeamBStats.threePointPercentage}%)`, getHighlight(calculatedTeamAStats.threePointPercentage, calculatedTeamBStats.threePointPercentage))}
              {renderStatRow("Free Throws (FT%)", `${calculatedTeamAStats.freeThrowsMade}/${calculatedTeamAStats.freeThrowsAttempted} (${calculatedTeamAStats.freeThrowPercentage}%)`, `${calculatedTeamBStats.freeThrowsMade}/${calculatedTeamBStats.freeThrowsAttempted} (${calculatedTeamBStats.freeThrowPercentage}%)`, getHighlight(calculatedTeamAStats.freeThrowPercentage, calculatedTeamBStats.freeThrowPercentage))}
              {renderStatRow("Rebounds", calculatedTeamAStats.rebounds, calculatedTeamBStats.rebounds, getHighlight(calculatedTeamAStats.rebounds, calculatedTeamBStats.rebounds))}
              {renderStatRow("Assists", calculatedTeamAStats.assists, calculatedTeamBStats.assists, getHighlight(calculatedTeamAStats.assists, calculatedTeamBStats.assists))}
              {renderStatRow("Steals", calculatedTeamAStats.steals, calculatedTeamBStats.steals, getHighlight(calculatedTeamAStats.steals, calculatedTeamBStats.steals))}
              {renderStatRow("Blocks", calculatedTeamAStats.blocks, calculatedTeamBStats.blocks, getHighlight(calculatedTeamAStats.blocks, calculatedTeamBStats.blocks))}
              {renderStatRow("Turnovers", calculatedTeamAStats.turnovers, calculatedTeamBStats.turnovers, getHighlight(calculatedTeamBStats.turnovers, calculatedTeamAStats.turnovers))}
              {renderStatRow("Fouls", calculatedTeamAStats.fouls, calculatedTeamBStats.fouls, getHighlight(calculatedTeamBStats.fouls, calculatedTeamAStats.fouls))}
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">Play by Play</h3>
            
            {Object.keys(groupedPlayByPlay).length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Activity size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg">No plays recorded yet</p>
                <p className="text-sm">All game actions will appear here as they happen</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.keys(groupedPlayByPlay)
                  .map(Number)
                  .sort((a, b) => b - a) // Most recent quarter first
                  .map(quarter => (
                    <div key={quarter} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="bg-gray-700 text-white px-3 py-1 rounded-full text-sm font-bold">
                          Q{quarter}
                        </div>
                        <div className="flex-1 h-px bg-gray-300"></div>
                      </div>
                      
                      <div className="space-y-2">
                        {groupedPlayByPlay[quarter].map(play => (
                          <div
                            key={play.id}
                            className={`flex items-center justify-between p-3 rounded-lg border-l-4 ${
                              play.team === 'A' 
                                ? 'bg-blue-50 border-blue-500' 
                                : 'bg-yellow-50 border-yellow-500'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{getActionIcon(play.action)}</span>
                              <div>
                                <div className="font-semibold text-gray-800">
                                  {play.playerName} {getPlayerStatDisplay(play.action, play.playerCurrentStats)}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {getActionLabel(play.action)}
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-800">
                                {play.teamAScoreAfter} - {play.teamBScoreAfter}
                              </div>
                              <div className="text-xs text-gray-500">
                                Team {play.team}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};