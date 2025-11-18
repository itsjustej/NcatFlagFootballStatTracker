import React, { useMemo } from 'react';

export const Scoreboard = ({ gameState, setGameState, teamA, teamB }) => {
  const quarterOptions = ['1', '2', '3', '4', 'OT'];

  const currentQuarterIndex = useMemo(() => {
    return quarterOptions.indexOf(gameState.quarter);
  }, [gameState.quarter]);

  const handleQuarterChange = (direction) => {
    setGameState((prev) => {
      const idx = quarterOptions.indexOf(prev.quarter);

      if (direction === 'up' && idx < quarterOptions.length - 1) {
        return { ...prev, quarter: quarterOptions[idx + 1] };
      }

      if (direction === 'down' && idx > 0) {
        return { ...prev, quarter: quarterOptions[idx - 1] };
      }

      return prev;
    });
  };

  return (
    <div className="scoreboard">
      
      {/* TEAM A */}
      <div className="team-box">
        <div className="team-name">{teamA.name}</div>
        <div className="team-score">{gameState.teamAScore}</div>
        <div className="team-fouls">
          FOULS: <span>{gameState.teamAFouls}</span>
        </div>
      </div>

      {/* QUARTER BOX */}
      <div className="quarter-box">
        <div className="quarter-title">QUARTER</div>

        <div className="quarter-number">
          {gameState.quarter}
        </div>

        <div className="quarter-buttons">
          <button
            className="q-btn"
            onClick={() => handleQuarterChange("down")}
            disabled={currentQuarterIndex <= 0}
          >
            -
          </button>

          <button
            className="q-btn"
            onClick={() => handleQuarterChange("up")}
            disabled={currentQuarterIndex >= quarterOptions.length - 1}
          >
            +
          </button>
        </div>
      </div>

      {/* TEAM B */}
      <div className="team-box">
        <div className="team-name">{teamB.name}</div>
        <div className="team-score">{gameState.teamBScore}</div>
        <div className="team-fouls">
          FOULS: <span>{gameState.teamBFouls}</span>
        </div>
      </div>

    </div>
  );
};
