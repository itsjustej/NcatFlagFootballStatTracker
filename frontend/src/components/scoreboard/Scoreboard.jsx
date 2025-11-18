import React, { useMemo } from 'react';

export const Scoreboard = ({ gameState, setGameState, teamA, teamB }) => {
  const quarterOptions = ['1', '2', '3', '4', 'OT'];

  // Gets the index of the quarter options
  const currentQuarterIndex = useMemo(() => {
    return quarterOptions.indexOf(gameState.quarter);
  }, [gameState.quarter]);

  // Up & Down Buttons Logic
  const handleQuarterChange = (direction) => {
    setGameState((prev) => {
      // Access's previous stat and updates based on that
      const currentIndex = quarterOptions.indexOf(prev.quarter);

      if (direction === 'up' && currentIndex < quarterOptions.length - 1) {
        return { ...prev, quarter: quarterOptions[currentIndex + 1] };
      }

      if (direction === 'down' && currentIndex > 0) {
        return { ...prev, quarter: quarterOptions[currentIndex - 1] };
      }

      return prev;
    });
  };

  return (
    <div className="w-full bg-gradient-to-r from-[#00205B] via-[#001a4a] to-[#00205B] text-white py-2 px-6 shadow-lg">
      <div className="flex items-center justify-between max-w-6xl mx-auto">

        {/* Team A */}
        <div className="flex flex-col items-center space-y-1">
          <div className="text-blue-300 text-lg font-bold tracking-wide">{teamA.name}</div>
          <div className="text-4xl font-black">{gameState.teamAScore}</div>
          <div className="text-sm text-gray-300">
            FOULS: <span className="text-blue-300 font-semibold">{gameState.teamAFouls}</span>
          </div>
        </div>

        {/* Quarter Section */}
        <div className="flex flex-col items-center space-y-2">
          <div className="text-sm font-semibold text-gray-300 tracking-wider">QUARTER</div>
          <div className="bg-gray-500 text-white text-2xl font-bold rounded-lg w-16 h-8 flex items-center justify-center shadow-lg">
            {gameState.quarter}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleQuarterChange('down')}
              className="bg-gray-500 hover:bg-gray-600 text-white w-8 h-8 rounded-md text-xl font-bold shadow-md transition-colors"
              disabled={currentQuarterIndex <= 0}
            >
              -
            </button>
            <button
              onClick={() => handleQuarterChange('up')}
              className="bg-gray-500 hover:bg-gray-600 text-white w-8 h-8 rounded-md text-xl font-bold shadow-md transition-colors"
              disabled={currentQuarterIndex >= quarterOptions.length - 1}
            >
              +
            </button>
          </div>
        </div>

        {/* Team B */}
        <div className="flex flex-col items-center space-y-1">
          <div className="text-yellow-400 text-lg font-bold tracking-wide">{teamB.name}</div>
          <div className="text-4xl font-black">{gameState.teamBScore}</div>
          <div className="text-sm text-gray-300">
            FOULS: <span className="text-yellow-400 font-semibold">{gameState.teamBFouls}</span>
          </div>
        </div>
        
      </div>
    </div>
  );
};
