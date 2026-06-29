import React from "react";
import { Link } from "react-router-dom";
import { PlayCircle, Users } from "lucide-react";

export default function MainActions() {
  return (
    <section className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid md:grid-cols-2 gap-6 mb-3">

        <Link to="/start-game" className="group">
          <div className="bg-gradient-to-br from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 p-8 rounded-lg transition-all hover:shadow-xl hover:shadow-blue-500/20 cursor-pointer">
            <PlayCircle className="w-12 h-12 mb-4 text-white" />
            <h3 className="text-2xl font-bold mb-2">Start New Game</h3>
            <p className="text-blue-100 mb-4">Select teams and begin live play tracking</p>
            <span className="inline-flex items-center text-sm font-semibold group-hover:translate-x-1 transition">
              Get Started →
            </span>
          </div>
        </Link>

        <Link to="/teams" className="group">
          <div className="bg-gradient-to-br from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 p-8 rounded-lg transition-all hover:shadow-xl hover:shadow-yellow-500/20 cursor-pointer">
            <Users className="w-12 h-12 mb-4 text-white" />
            <h3 className="text-2xl font-bold mb-2">Manage Teams</h3>
            <p className="text-yellow-100 mb-4">Create and edit teams and rosters</p>
            <span className="inline-flex items-center text-sm font-semibold group-hover:translate-x-1 transition">
              Manage →
            </span>
          </div>
        </Link>

      </div>
    </section>
  );
}