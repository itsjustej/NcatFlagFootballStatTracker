import React, { useState } from 'react';

export const SubstitutionModal = ({
  isOpen,
  teamAPlayers,
  teamBPlayers,
  onSubstitute,
  onClose
}) => {
  const [team, setTeam] = useState('A');
  const [selectedOut, setSelectedOut] = useState(null);

  if (!isOpen) return null;

  const currentTeamPlayers = team === 'A' ? teamAPlayers : teamBPlayers;
  const activePlayers = currentTeamPlayers.filter(p => p.isActive);
  const benchPlayers = currentTeamPlayers.filter(p => !p.isActive);

  const handleSubstituteInstant = (playerIn) => {
    if (!selectedOut) {
      alert('Please select a player on the court to substitute out first.');
      return;
    }

    if (playerIn.team !== selectedOut.team) {
      alert('Players must be from the same team.');
      return;
    }

    onSubstitute(selectedOut, playerIn);
    setSelectedOut(null);
  };

  const teamColors = {
    A: {
      primary: 'bg-blue-500',
      hover: 'hover:bg-blue-600',
      selected: 'bg-blue-700 ring-4 ring-yellow-400',
      text: 'text-blue-600'
    },
    B: {
      primary: 'bg-yellow-500',
      hover: 'hover:bg-yellow-600',
      selected: 'bg-yellow-700 ring-4 ring-yellow-400',
      text: 'text-yellow-600'
    }
  };

  const colors = teamColors[team];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 max-w-5xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
        {/* Team Toggle */}
        <div className="flex justify-center gap-4 mb-4">
          <button
            onClick={() => { setTeam('A'); setSelectedOut(null); }}
            className={`px-3 py-1.5 text-sm font-bold rounded-lg transition ${
              team === 'A' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-blue-600'
            }`}
          >
            Team A
          </button>
          <button
            onClick={() => { setTeam('B'); setSelectedOut(null); }}
            className={`px-3 py-1.5 text-sm font-bold rounded-lg transition ${
              team === 'B' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-yellow-600'
            }`}
          >
            Team B
          </button>
        </div>

        <h2 className={`text-xl font-bold text-center mb-4 ${colors.text}`}>
          Team {team} Substitution
        </h2>

        {/* Player Lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* On-Court Players */}
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-3 text-center">ON COURT</h3>
            <div className="space-y-2">
              {activePlayers.map((player) => (
                <button
                  key={player.id}
                  onClick={() => setSelectedOut(player)}
                  className={`w-full p-2.5 rounded-lg transition-all duration-200 font-semibold text-white text-sm
                    ${selectedOut?.id === player.id ? colors.selected : `${colors.primary} ${colors.hover}`}
                    hover:scale-102 active:scale-95
                  `}
                >
                  <div className="flex justify-between items-center">
                    <div className="text-left">
                      <div className="font-bold">{player.name}</div>
                    </div>
                    <div className="text-lg font-black opacity-75">#{player.jerseyNumber}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Bench Players */}
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-3 text-center">BENCH</h3>
            <div className="space-y-2">
              {benchPlayers.length > 0 ? (
                benchPlayers.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handleSubstituteInstant(player)}
                    className={`w-full p-2.5 rounded-lg transition-all duration-200 font-semibold text-white text-sm
                      ${colors.primary} ${colors.hover}
                      hover:scale-102 active:scale-95
                    `}
                  >
                    <div className="flex justify-between items-center">
                      <div className="text-left">
                        <div className="font-bold">{player.name}</div>
                      </div>
                      <div className="text-lg font-black opacity-75">#{player.jerseyNumber}</div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center text-gray-500 py-6">
                  <p className="text-sm">No bench players available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        {selectedOut && (
          <div className="mt-4 p-3 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-700 text-center">
              <span className="font-semibold">{selectedOut.name}</span> selected to come out. 
              Click a bench player to substitute in.
            </p>
          </div>
        )}

        {/* Done Button */}
        <div className="flex justify-center mt-4">
          <button
            onClick={onClose}
            className="w-full bg-gray-700 hover:bg-gray-800 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors text-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
