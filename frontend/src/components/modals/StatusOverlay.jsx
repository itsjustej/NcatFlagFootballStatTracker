import React, { useEffect } from 'react';

export const StatusOverlay = ({ messages = [], onClose = () => {} }) => {
  useEffect(() => {
    // id rhe message length exist 
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, 2000); // Clear the messages after 2 seconds
      return () => clearTimeout(timer); //If a new message comes in before the 2 seconds are up, the old timer is cleared to avoid premature dismissal.
    }
  }, [messages, onClose]);

  if (messages.length === 0) return null;

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 space-y-2">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`${message.color} text-white px-8 py-4 rounded-lg shadow-2xl font-bold text-xl animate-pulse`}
        >
          {message.text}
        </div>
      ))}
    </div>
  );
};
