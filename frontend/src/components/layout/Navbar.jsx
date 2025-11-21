import React from "react";
import { Medal } from "lucide-react";
import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="bg-slate-900 border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Medal className="w-8 h-8 text-orange-500" />
          <h1 className="text-2xl font-bold text-white">StatTracker</h1>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-sm font-medium text-white hover:text-orange-500 transition">Home</Link>
          <Link to="/games" className="text-sm font-medium text-white hover:text-orange-500 transition">Game History</Link>
          <Link to="/stats" className="text-sm font-medium text-white hover:text-orange-500 transition">Stats</Link>
          <Link to="/teams" className="text-sm font-medium text-white hover:text-orange-500 transition">Teams</Link>
        </nav>
      </div>
    </header>
  );
}
