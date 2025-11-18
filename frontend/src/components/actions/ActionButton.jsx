import React from 'react';

export const ActionButton = ({
  label,
  icon,
  color,
  onClick,
  disabled = false
}) => {
  const colorClasses = {
    green: 'bg-green-500 hover:bg-green-600 border-green-400',
    red: 'bg-red-500 hover:bg-red-600 border-red-400',
    blue: 'bg-blue-500 hover:bg-blue-600 border-blue-400',
    gray: 'bg-gray-500 hover:bg-gray-600 border-gray-400',
    yellow: 'bg-yellow-500 hover:bg-yellow-600 border-yellow-400',
    orange: 'bg-orange-500 hover:bg-orange-600 border-orange-400'
  };

  return (
    <button
      onClick={onClick}
      // onClick equals whatever onClick method was passed
      disabled={disabled}
      // disabled equals true or false depending on what was passed

      
        // Takes the efects from coloClasses for whats passed
        // Defines what the button being disabled  does
      className={`
        ${colorClasses[color]}

        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
        text-white font-bold py-2 px-6 rounded-lg
        border-2 shadow-lg transition-all duration-200
        flex flex-col items-center justify-center space-y-2
        min-h-[100px]
      `}
    >

      {/* Buttons have Icon passed in + Text Label passed in on top */}
      <span className="text-2xl">{icon}</span>
      <span className="text-sm text-center leading-tight">{label}</span>
    </button>
  );
};
