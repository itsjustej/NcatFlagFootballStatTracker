import React, { useState } from "react";
import { logout } from "../auth/authService";

export default function SettingsPage() {
  const [season, setSeason] = useState("2024-2025");

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-slate-900 pt-20 px-4">
      <div className="max-w-3xl mx-auto bg-slate-800 border border-slate-700 rounded-lg p-8 shadow-xl">
        <h1 className="text-3xl font-bold text-white mb-6">Settings</h1>

        {/* SEASON SELECTOR */}
        <div className="mb-10">
          <label className="block text-slate-300 mb-2 font-medium">
            Season (placeholder)
          </label>
          <select
            className="w-full bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
          >
            <option value="2024-2025">2024–2025</option>
            <option value="2023-2024">2023–2024</option>
            <option value="2022-2023">2022–2023</option>
          </select>

          <p className="text-slate-500 text-sm mt-2">
            * Season switching is not implemented yet. Placeholder only.
          </p>
        </div>

        {/* LOGOUT BUTTON */}
        <div className="mt-12">
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 transition text-white font-semibold py-3 rounded"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
