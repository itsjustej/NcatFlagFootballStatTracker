import React from 'react';

export const FollowUpModal = ({
  followUpAction,
  onPlayerSelect,
  onSkip
}) => {
  if (!followUpAction) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-2xl">
        <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
          {followUpAction.question}
        </h3>
        
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {followUpAction.eligiblePlayers.map((player) => (
            <button
              key={player.id}
              onClick={() => onPlayerSelect(player)}
              className={`
                w-full p-3 rounded-lg font-semibold transition-all duration-200
                ${player.team === 'A' 
                  ? 'bg-blue-500 hover:bg-blue-700 text-white' 
                  : 'bg-yellow-500 hover:bg-yellow-700 text-white'
                }
              `}
            >
              <div className="flex justify-between items-center">
                <span>{player.name}</span>
                <span>#{player.jerseyNumber}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onSkip}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
};
