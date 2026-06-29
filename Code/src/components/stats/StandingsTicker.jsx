import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Trophy } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { useLeague } from "../../context/LeagueContext";
import { computeLeagueStandings } from "../../utils/standingsHelpers";

const MINIMIZED_KEY = "standingsTickerMinimized";

function TickerSegment({ standings }) {
  return (
    <>
      {standings.map((team, i) => (
        <span key={`${team.team_id}-${i}`} className="inline-flex items-center gap-2 shrink-0 px-6">
          <span
            className={`text-[10px] font-black tabular-nums ${
              team.rank === 1 ? "text-yellow-400" : "text-slate-500"
            }`}
          >
            #{team.rank}
          </span>
          <span className="text-sm font-bold text-white whitespace-nowrap">{team.name}</span>
          <span className="text-sm font-mono text-slate-300 tabular-nums">{team.record}</span>
          {team.gamesPlayed > 0 && (
            <span className="text-[10px] text-slate-500 tabular-nums">
              ({(team.winPct * 100).toFixed(0)}%)
            </span>
          )}
          <span className="text-slate-600 mx-1">•</span>
        </span>
      ))}
    </>
  );
}

export default function StandingsTicker({ onExpandedChange }) {
  const { currentLeague } = useLeague();
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [minimized, setMinimized] = useState(() => {
    try {
      return localStorage.getItem(MINIMIZED_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    onExpandedChange?.(!minimized);
  }, [minimized, onExpandedChange]);

  useEffect(() => {
    if (!currentLeague) {
      setStandings([]);
      setLoading(false);
      return;
    }

    const fetchStandings = async () => {
      setLoading(true);
      const { data: teams } = await supabase
        .from("Team")
        .select("*")
        .eq("league_id", currentLeague.league_id);
      const { data: games } = await supabase
        .from("Game")
        .select("*")
        .eq("league_id", currentLeague.league_id);
      const { data: allPlays } = await supabase.from("Play").select("*");

      const leagueGameIds = new Set((games || []).map((g) => g.game_id));
      const plays = (allPlays || []).filter((p) => leagueGameIds.has(p.game_id));

      setStandings(computeLeagueStandings(teams, games, plays));
      setLoading(false);
    };

    fetchStandings();
  }, [currentLeague]);

  const toggleMinimized = () => {
    setMinimized((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(MINIMIZED_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  if (!currentLeague) return null;

  if (minimized) {
    return (
      <div className="fixed bottom-0 inset-x-0 z-40 flex justify-center pointer-events-none pb-safe">
        <button
          type="button"
          onClick={toggleMinimized}
          className="pointer-events-auto mb-3 flex items-center gap-2 px-4 py-2 rounded-full
            bg-slate-900/95 border border-slate-600/80 shadow-lg shadow-black/40
            backdrop-blur-md text-slate-200 text-xs font-bold uppercase tracking-wider
            hover:bg-slate-800 hover:border-slate-500 transition-colors"
        >
          <Trophy className="w-3.5 h-3.5 text-yellow-400" />
          Standings
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-600/60
        bg-slate-950/95 backdrop-blur-md shadow-[0_-8px_32px_rgba(0,0,0,0.45)] pb-safe"
    >
      <div className="flex items-center justify-between px-3 sm:px-4 h-9 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            League Standings
          </span>
        </div>
        <button
          type="button"
          onClick={toggleMinimized}
          className="p-1.5 rounded-md text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
          title="Minimize standings"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      <div
        className="relative h-11 overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {loading ? (
          <p className="text-xs text-slate-500 text-center py-3">Loading standings…</p>
        ) : standings.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-3">No games played yet</p>
        ) : (
          <div
            className={`standings-marquee-track flex items-center h-full w-max ${paused ? "standings-marquee-paused" : ""}`}
          >
            <TickerSegment standings={standings} />
            <TickerSegment standings={standings} />
          </div>
        )}
      </div>
    </div>
  );
}
