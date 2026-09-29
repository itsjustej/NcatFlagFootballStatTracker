import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Trophy } from "lucide-react";
import { useLeague } from "../../context/LeagueContext";
import { loadLeagueSeason } from "../../utils/leagueSeason";
import { computeLeagueStandings } from "../../utils/standingsHelpers";

const MINIMIZED_KEY = "standingsTickerMinimized";

function TickerSegment({ standings }) {
  return (
    <>
      {standings.map((team, i) => (
        <span key={team.team_id} className="inline-flex items-center gap-2 shrink-0">
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
          {i < standings.length - 1 && <span className="text-slate-600 ml-6">•</span>}
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
  const viewportRef = useRef(null);
  const listRef = useRef(null);

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
      try {
        const { teams, games, plays } = await loadLeagueSeason(currentLeague.league_id);
        setStandings(computeLeagueStandings(teams, games, plays));
      } catch (err) {
        console.error(err);
        setStandings([]);
      }
      setLoading(false);
    };

    fetchStandings();
  }, [currentLeague]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const list = listRef.current;
    if (!viewport || !list || minimized || standings.length === 0) return;

    let frame = 0;
    let x = 0;
    let mode = "hold-start";
    let holdUntil = performance.now() + 2200;
    let last = performance.now();
    const pixelsPerSecond = 70;

    const tick = (now) => {
      const style = getComputedStyle(viewport);
      const padL = parseFloat(style.paddingLeft) || 0;
      const padR = parseFloat(style.paddingRight) || 0;
      const contentWidth = viewport.clientWidth - padL - padR;
      const endX = Math.min(0, contentWidth - list.scrollWidth);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (endX === 0) {
        x = 0;
        list.style.transform = "translateX(0px)";
        frame = requestAnimationFrame(tick);
        return;
      }

      if (mode === "hold-start" || mode === "hold-end") {
        if (now >= holdUntil) mode = mode === "hold-start" ? "to-end" : "to-start";
      } else if (mode === "to-end") {
        x = Math.max(endX, x - pixelsPerSecond * dt);
        if (x === endX) {
          mode = "hold-end";
          holdUntil = now + 2200;
        }
      } else {
        x = Math.min(0, x + pixelsPerSecond * dt);
        if (x === 0) {
          mode = "hold-start";
          holdUntil = now + 2200;
        }
      }

      list.style.transform = `translateX(${x}px)`;
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [standings, minimized]);

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

      <div ref={viewportRef} className="relative h-11 overflow-hidden px-3 sm:px-4">
        {loading ? (
          <p className="text-xs text-slate-500 text-center py-3">Loading standings…</p>
        ) : standings.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-3">No games played yet</p>
        ) : (
          <div ref={listRef} className="flex items-center justify-between h-full min-w-full w-max will-change-transform">
            <TickerSegment standings={standings} />
          </div>
        )}
      </div>
    </div>
  );
}
