import React from 'react';
import { useNavigate } from "react-router-dom";

export const Footer = ({
  onUndo,
  onSubstitution,
  onSaveExit,
  canUndo
}) => {
  const navigate = useNavigate();

  const handleSaveAndExit = () => {
    onSaveExit();      // keep your save logic
    navigate("/"); // 🔥 go to completed games menu
  };

  return (
    <div className="w-full bg-gray-800 p-4 shadow-lg">
      <div className="flex gap-4 max-w-4xl mx-auto">

        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`
            flex-1 py-3 px-6 rounded-lg font-semibold transition-all duration-200
            ${canUndo 
              ? 'bg-yellow-500 hover:bg-yellow-600 text-white hover:scale-105' 
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }
            active:scale-95
          `}
        >
          ↶ UNDO
        </button>

        <button
          onClick={onSubstitution}
          className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
        >
          🔄 SUBS
        </button>

        <button
          onClick={handleSaveAndExit}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
        >
          💾 SAVE & EXIT
        </button>

      </div>
    </div>
  );
};
