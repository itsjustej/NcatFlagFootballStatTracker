import React from "react";
import { Link } from "react-router-dom";
import { BarChart3, History, Settings } from "lucide-react";

export default function SecondaryActions() {
  return (
    <section className="max-w-7xl mx-auto px-4">
      <div className="grid md:grid-cols-3 gap-6 pb-20">

        <Link to="/stats" className="group">
          <div className="bg-slate-800 hover:bg-slate-700 p-6 rounded-lg border border-slate-700 hover:border-blue-500/50 transition-all">
            <BarChart3 className="w-10 h-10 mb-3 text-blue-400" />
            <h3 className="text-lg font-bold mb-2">View Stats</h3>
            <p className="text-slate-400 text-sm">Analyze team and player performance</p>
          </div>
        </Link>

        <Link to="/games" className="group">
          <div className="bg-slate-800 hover:bg-slate-700 p-6 rounded-lg border border-slate-700 hover:border-yellow-500/50 transition-all">
            <History className="w-10 h-10 mb-3 text-yellow-500" />
            <h3 className="text-lg font-bold mb-2">Game History</h3>
            <p className="text-slate-400 text-sm">Review past games and play by play logs</p>
          </div>
        </Link>

        <Link to="/settings" className="group">
          <div className="bg-slate-800 hover:bg-slate-700 p-6 rounded-lg border border-slate-700 hover:border-slate-500/50 transition-all">
            <Settings className="w-10 h-10 mb-3 text-slate-400" />
            <h3 className="text-lg font-bold mb-2">Settings</h3>
            <p className="text-slate-400 text-sm">Manage seasons and preferences</p>
          </div>
        </Link>

      </div>
    </section>
  );
}