import React from 'react';

export const PlayerCard = ({ 
  player, 
  isSelected, 
  onSelect, 
  flashEffect 
}) => {
  const teamColors = {
    // sets team cards and colors based on if the teams on the left or right
    A: {
      bg: isSelected ? 'bg-blue-600' : 'bg-blue-500',
      hover: 'hover:bg-blue-600',
      border: 'border-blue-400',
      text: 'text-white'
    },
    B: {
      bg: isSelected ? 'bg-yellow-600' : 'bg-yellow-500',
      hover: 'hover:bg-yellow-600',
      border: 'border-yellow-400',
      text: 'text-white'
    }
  };

  const colors = teamColors[player.team];

  return (
    <button
      onClick={() => onSelect(player)}
      // run handle player select in main
      className={`
        w-full p-2 rounded-md transition-all duration-200 transform
        ${colors.bg} ${colors.hover} ${colors.border} ${colors.text}
        border-2 shadow-lg font-semibold text-left
        ${isSelected ? 'ring-4 ring-gray-400 scale-105' : 'hover:scale-102'}
        active:scale-95
      `}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-bold">{player.name}</div>
        </div>
        <div className="text-2xl font-black opacity-75">
          #{player.jerseyNumber}
        </div>
      </div>
    </button>
  );
};
