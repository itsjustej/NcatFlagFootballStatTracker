import React from 'react';
import { PlayerCard } from './PlayerCard';

// Populates Screen with Player Card Obects
export const PlayerSection = ({
  teamAPlayers,
  teamBPlayers,
  selectedPlayer,
  onPlayerSelect,
}) => {
  return (
    <div className="flex gap-6 p-6">
      {/* Team A */}
      <div className="flex-1">
        <div className="space-y-3">
          {teamAPlayers.map((player) => (
            // Puts in every Player card from teamAPlayers
            <PlayerCard
              key={player.id}
              player={player}
              isSelected={selectedPlayer?.id === player.id} 
              // see if the seleced player equals this player and set the boolean accordingly
              onSelect={onPlayerSelect}
            />
          ))}
        </div>
      </div>

      {/* Team B */}
      <div className="flex-1">
        <div className="space-y-3">
          {teamBPlayers.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isSelected={selectedPlayer?.id === player.id}
              onSelect={onPlayerSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
