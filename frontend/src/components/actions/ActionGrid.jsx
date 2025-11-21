import React from 'react';
import { ActionButton } from './ActionButton';

export const ActionGrid = ({ onAction, disabled }) => {
  // onAction Methods, and disability status passed into the grid



  // An array of button objects parameters

  const actions = [
    // Row 1
    { label: '2PT Make', icon: '🏀', color: 'green', action: '2PT_MAKE', points: 2 },
    { label: '3PT Make', icon: '🎯', color: 'green', action: '3PT_MAKE', points: 3 },
    { label: 'FT Make', icon: '👍', color: 'green', action: 'FT_MAKE', points: 1 },
    { label: '2PT Miss', icon: 'X', color: 'red', action: '2PT_MISS' },
    { label: '3PT Miss', icon: '🧱', color: 'red', action: '3PT_MISS' },
    { label: 'FT Miss', icon: '👎', color: 'red', action: 'FT_MISS' },

    // Row 2
    { label: 'Steal', icon: '🦾', color: 'gray', action: 'STEAL' },
    { label: 'Block', icon: '🚫', color: 'gray', action: 'BLOCK' },
    { label: 'Rebound', icon: '⬆️', color: 'yellow', action: 'REBOUND' },
    { label: 'Assist', icon: '🤝', color: 'yellow', action: 'ASSIST' },
    { label: 'Turnover', icon: '?', color: 'orange', action: 'TURNOVER' },
    { label: 'Foul', icon: '⚠️', color: 'orange', action: 'FOUL' },
  ];

  return (
    <div className="p-6">
      <div className="grid grid-cols-6 gap-4 max-w-4xl mx-auto">

        {/* 6 X 2 Grid made by creating Action Button objects and giving them parameters in the array*/}
        {actions.map((action) => (
          // for (ActionButton action : actions){
          // 
          // }
          <ActionButton
          // key must be a non changing value to keep track of each value consistently
            key={action.action} 
            label={action.label}
            icon={action.icon}
            color={action.color}
            // onclick and disabled taken from action grid parameters
            onClick={() => onAction(action.action, action.points)} 
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
};
