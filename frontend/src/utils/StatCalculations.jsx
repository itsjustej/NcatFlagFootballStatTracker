export const calculatePlayerStats = (players, statHistory, baseStatsByPlayerId = {}) => {
  return players.map((player) => {
    const playerActions = statHistory.filter((stat) => stat.playerId === player.id);

    // If we have initial DB stats for this player (from a continued game),
    // start from those; otherwise start from zero.
    const base = baseStatsByPlayerId[player.id] || {};

    const stats = {
      playerId: player.id,
      playerName: player.name,
      team: player.team,
      points: base.points || 0,
      fieldGoalsMade: base.fieldGoalsMade || 0,
      fieldGoalsAttempted: base.fieldGoalsAttempted || 0,
      threePointersMade: base.threePointersMade || 0,
      threePointersAttempted: base.threePointersAttempted || 0,
      freeThrowsMade: base.freeThrowsMade || 0,
      freeThrowsAttempted: base.freeThrowsAttempted || 0,
      rebounds: base.rebounds || 0,
      assists: base.assists || 0,
      steals: base.steals || 0,
      blocks: base.blocks || 0,
      turnovers: base.turnovers || 0,
      fouls: base.fouls || 0,
      plusMinus: 0,
    };

    playerActions.forEach((action) => {
      switch (action.action) {
        case '2PT_MAKE':
          stats.points += 2;
          stats.fieldGoalsMade += 1;
          stats.fieldGoalsAttempted += 1;
          break;
        case '2PT_MISS':
          stats.fieldGoalsAttempted += 1;
          break;
        case '3PT_MAKE':
          stats.points += 3;
          stats.fieldGoalsMade += 1;
          stats.fieldGoalsAttempted += 1;
          stats.threePointersMade += 1;
          stats.threePointersAttempted += 1;
          break;
        case '3PT_MISS':
          stats.fieldGoalsAttempted += 1;
          stats.threePointersAttempted += 1;
          break;
        case 'FT_MAKE':
          stats.points += 1;
          stats.freeThrowsMade += 1;
          stats.freeThrowsAttempted += 1;
          break;
        case 'FT_MISS':
          stats.freeThrowsAttempted += 1;
          break;
        case 'REBOUND':
          stats.rebounds += 1;
          break;
        case 'ASSIST':
          stats.assists += 1;
          break;
        case 'STEAL':
          stats.steals += 1;
          break;
        case 'BLOCK':
          stats.blocks += 1;
          break;
        case 'TURNOVER':
          stats.turnovers += 1;
          break;
        case 'FOUL':
          stats.fouls += 1;
          break;
      }
    });

    return stats;
  });
};

export const calculateTeamStats = (team, playerStats) => {
  const teamPlayerStats = playerStats.filter((stats) => stats.team === team);

  const totals = teamPlayerStats.reduce(
    (acc, player) => ({
      points: acc.points + player.points,
      fieldGoalsMade: acc.fieldGoalsMade + player.fieldGoalsMade,
      fieldGoalsAttempted: acc.fieldGoalsAttempted + player.fieldGoalsAttempted,
      threePointersMade: acc.threePointersMade + player.threePointersMade,
      threePointersAttempted:
        acc.threePointersAttempted + player.threePointersAttempted,
      freeThrowsMade: acc.freeThrowsMade + player.freeThrowsMade,
      freeThrowsAttempted: acc.freeThrowsAttempted + player.freeThrowsAttempted,
      rebounds: acc.rebounds + player.rebounds,
      assists: acc.assists + player.assists,
      steals: acc.steals + player.steals,
      blocks: acc.blocks + player.blocks,
      turnovers: acc.turnovers + player.turnovers,
      fouls: acc.fouls + player.fouls,
    }),
    {
      points: 0,
      fieldGoalsMade: 0,
      fieldGoalsAttempted: 0,
      threePointersMade: 0,
      threePointersAttempted: 0,
      freeThrowsMade: 0,
      freeThrowsAttempted: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      turnovers: 0,
      fouls: 0,
    }
  );

  return {
    team,
    ...totals,
    fieldGoalPercentage:
      totals.fieldGoalsAttempted > 0
        ? Math.round((totals.fieldGoalsMade / totals.fieldGoalsAttempted) * 100)
        : 0,
    threePointPercentage:
      totals.threePointersAttempted > 0
        ? Math.round((totals.threePointersMade / totals.threePointersAttempted) * 100)
        : 0,
    freeThrowPercentage:
      totals.freeThrowsAttempted > 0
        ? Math.round((totals.freeThrowsMade / totals.freeThrowsAttempted) * 100)
        : 0,
  };
};

export const calculatePlusMinus = (players, statHistory) => {
  const plusMinusMap = {};
  players.forEach((player) => {
    plusMinusMap[player.id] = 0;
  });

  statHistory.forEach((action) => {
    if (action.points && action.points > 0 && action.activePlayersAtTime) {
      const scoringTeam = action.team;
      action.activePlayersAtTime.forEach((playerId) => {
        const player = players.find((p) => p.id === playerId);
        if (player) {
          plusMinusMap[player.id] +=
            player.team === scoringTeam ? action.points : -action.points;
        }
      });
    }
  });

  return plusMinusMap;
};

export const extractPlayByPlay = (statHistory, players) => {
  return statHistory
    .map((action, index) => {
      const actionsUpToNow = statHistory.slice(0, index + 1);
      const playerProgressiveStats = calculateProgressiveStatsForPlayer(
        action.playerId,
        actionsUpToNow,
        players
      );

      const relevantStats = {};

      switch (action.action) {
        case '2PT_MAKE':
        case '3PT_MAKE':
        case 'FT_MAKE':
          relevantStats.points = playerProgressiveStats.points;
          break;
        case 'REBOUND':
          relevantStats.rebounds = playerProgressiveStats.rebounds;
          break;
        case 'ASSIST':
          relevantStats.assists = playerProgressiveStats.assists;
          break;
        case 'STEAL':
          relevantStats.steals = playerProgressiveStats.steals;
          break;
        case 'BLOCK':
          relevantStats.blocks = playerProgressiveStats.blocks;
          break;
        case 'TURNOVER':
          relevantStats.turnovers = playerProgressiveStats.turnovers;
          break;
        case 'FOUL':
          relevantStats.fouls = playerProgressiveStats.fouls;
          break;
      }

      return {
        id: action.id,
        quarter: action.quarter,
        playerName: action.playerName,
        action: action.action,
        points: action.points,
        teamAScoreAfter: action.teamAScoreAfter,
        teamBScoreAfter: action.teamBScoreAfter,
        team: action.team,
        timestamp: action.timestamp,
        playerCurrentStats: relevantStats,
      };
    })
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

const calculateProgressiveStatsForPlayer = (playerId, actionsUpToNow, players) => {
  const player = players.find((p) => p.id === playerId);
  if (!player) {
    return {
      playerId,
      playerName: '',
      team: 'A',
      points: 0,
      fieldGoalsMade: 0,
      fieldGoalsAttempted: 0,
      threePointersMade: 0,
      threePointersAttempted: 0,
      freeThrowsMade: 0,
      freeThrowsAttempted: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      turnovers: 0,
      fouls: 0,
      plusMinus: 0,
    };
  }

  const playerActions = actionsUpToNow.filter((stat) => stat.playerId === playerId);

  const stats = {
    playerId: player.id,
    playerName: player.name,
    team: player.team,
    points: 0,
    fieldGoalsMade: 0,
    fieldGoalsAttempted: 0,
    threePointersMade: 0,
    threePointersAttempted: 0,
    freeThrowsMade: 0,
    freeThrowsAttempted: 0,
    rebounds: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
    turnovers: 0,
    fouls: 0,
    plusMinus: 0,
  };

  playerActions.forEach((action) => {
    switch (action.action) {
      case '2PT_MAKE':
        stats.points += 2;
        stats.fieldGoalsMade += 1;
        stats.fieldGoalsAttempted += 1;
        break;
      case '2PT_MISS':
        stats.fieldGoalsAttempted += 1;
        break;
      case '3PT_MAKE':
        stats.points += 3;
        stats.fieldGoalsMade += 1;
        stats.fieldGoalsAttempted += 1;
        stats.threePointersMade += 1;
        stats.threePointersAttempted += 1;
        break;
      case '3PT_MISS':
        stats.fieldGoalsAttempted += 1;
        stats.threePointersAttempted += 1;
        break;
      case 'FT_MAKE':
        stats.points += 1;
        stats.freeThrowsMade += 1;
        stats.freeThrowsAttempted += 1;
        break;
      case 'FT_MISS':
        stats.freeThrowsAttempted += 1;
        break;
      case 'REBOUND':
        stats.rebounds += 1;
        break;
      case 'ASSIST':
        stats.assists += 1;
        break;
      case 'STEAL':
        stats.steals += 1;
        break;
      case 'BLOCK':
        stats.blocks += 1;
        break;
      case 'TURNOVER':
        stats.turnovers += 1;
        break;
      case 'FOUL':
        stats.fouls += 1;
        break;
    }
  });

  return stats;
};
