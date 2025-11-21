import React from "react";

export default function GameSettings({ config, onChange, onBack, onStart }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl text-white">
      <h2 className="text-2xl font-bold mb-4">Game Settings</h2>

      {/* Quarter Length */}
      <div className="mb-4">
        <label className="block text-slate-300 mb-1">Quarter Length (minutes)</label>
        <input
          type="number"
          value={config.quarterLength}
          min={1}
          max={20}
          onChange={(e) => onChange({ ...config, quarterLength: parseInt(e.target.value) })}
          className="w-full bg-slate-900 border border-slate-600 text-white p-2 rounded"
        />
      </div>

      {/* Starting Score */}
      <div className="mb-4">
        <label className="block text-slate-300 mb-1">Starting Score</label>
        <input
          type="number"
          value={config.startScore}
          min={0}
          onChange={(e) => onChange({ ...config, startScore: parseInt(e.target.value) })}
          className="w-full bg-slate-900 border border-slate-600 text-white p-2 rounded"
        />
      </div>

      {/* Plus-Minus Toggle */}
      <div className="flex items-center gap-3 mb-6">
        <input
          type="checkbox"
          checked={config.trackPlusMinus}
          onChange={(e) => onChange({ ...config, trackPlusMinus: e.target.checked })}
        />
        <span className="text-slate-300">Track Plus/Minus</span>
      </div>

      {/* Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
        >
          Back
        </button>

        <button
          onClick={onStart}
          className="px-6 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg font-bold"
        >
          Continue → Start Game
        </button>
      </div>
    </div>
  );
}
