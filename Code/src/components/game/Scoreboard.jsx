import { useState, useEffect } from 'react';
import { Undo2 } from 'lucide-react';
import { yardLabel as fieldYardLabel } from '../../gameLogic';
import { possessionColor, TEAM_COLORS } from '../../constants/teamColors';

function downStr(down, dist) {
  const sfx = ['', 'st', 'nd', 'rd', 'th'];
  return `${down}${sfx[down] ?? 'th'} & ${dist}`;
}

export default function Scoreboard({
  gs,
  canUndo,
  onHalfChange,
  onUndo,
  homeName,
  awayName,
  scoreFlash,
  onOpenPlays,
}) {
  const { homeScore, awayScore, half, down, distance, possession, yardLine, homeAttacksRight = true } = gs;
  const teamName = possession === 'home' ? homeName : awayName;
  const offColor = possessionColor(possession);

  const [flashHome, setFlashHome] = useState(false);
  const [flashAway, setFlashAway] = useState(false);

  useEffect(() => {
    if (scoreFlash === 'home') {
      setFlashHome(true);
      const t = setTimeout(() => setFlashHome(false), 600);
      return () => clearTimeout(t);
    }
  }, [scoreFlash]);

  useEffect(() => {
    if (scoreFlash === 'away') {
      setFlashAway(true);
      const t = setTimeout(() => setFlashAway(false), 600);
      return () => clearTimeout(t);
    }
  }, [scoreFlash]);

  return (
    <div className="flex flex-col">
      <div className="flex items-stretch border-b border-slate-700">
        <div
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-2.5 md:py-4 gap-0.5 md:gap-1 px-1 transition-colors duration-300 ${
            possession === 'home' ? 'bg-slate-700/40' : ''
          }`}
        >
          <span
            className="text-[11px] md:text-[10px] font-black uppercase tracking-wide md:tracking-[0.2em] truncate max-w-full"
            style={{ color: TEAM_COLORS.home.muted }}
          >
            {homeName}
          </span>
          <span
            className={`text-4xl md:text-5xl font-black text-white tabular-nums ${flashHome ? 'score-flash-home' : ''}`}
          >
            {homeScore}
          </span>
        </div>

        <div className="flex flex-col items-center justify-center px-1.5 md:px-3 gap-1.5 border-x border-slate-700 bg-slate-900/40 shrink-0">
          <div className="flex rounded-md overflow-hidden border border-slate-600">
            {[
              { id: 1, label: '1st' },
              { id: 2, label: '2nd' },
              { id: 3, label: 'OT' },
            ].map((h) => (
              <button
                key={h.id}
                onClick={() => onHalfChange(h.id)}
                className={`px-2.5 py-2 md:px-2 md:py-0.5 text-xs md:text-[10px] font-bold transition-colors min-h-9 md:min-h-0 ${
                  half === h.id
                    ? 'bg-slate-600 text-white'
                    : 'bg-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>

        <div
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-2.5 md:py-4 gap-0.5 md:gap-1 px-1 transition-colors duration-300 ${
            possession === 'away' ? 'bg-slate-700/40' : ''
          }`}
        >
          <span
            className="text-[11px] md:text-[10px] font-black uppercase tracking-wide md:tracking-[0.2em] truncate max-w-full"
            style={{ color: TEAM_COLORS.away.muted }}
          >
            {awayName}
          </span>
          <span
            className={`text-4xl md:text-5xl font-black text-white tabular-nums ${flashAway ? 'score-flash-away' : ''}`}
          >
            {awayScore}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-3 md:px-4 py-2 border-b border-slate-700 bg-slate-900/30">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: offColor }} />
          <span className="text-[12px] font-bold text-slate-300 truncate">
            {teamName}
            <span className="text-slate-500 font-normal ml-1.5">·</span>
            <span className="text-slate-400 font-normal ml-1.5">
              {fieldYardLabel(yardLine, possession, homeAttacksRight, gs.hasFortyYard)}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="text-[12px] font-black text-white px-2.5 py-1 rounded-full"
            style={{ background: TEAM_COLORS.home.primary }}
          >
            {downStr(down, distance)}
          </span>
          {onOpenPlays && (
            <button
              type="button"
              onClick={onOpenPlays}
              className="md:hidden min-h-9 px-2.5 rounded-lg text-xs font-bold text-slate-200 bg-slate-700"
            >
              Plays
            </button>
          )}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo last play"
            className={`flex items-center justify-center w-9 h-9 md:w-6 md:h-6 rounded transition-colors ${
              canUndo
                ? 'text-slate-300 hover:text-white hover:bg-slate-600'
                : 'text-slate-700 cursor-not-allowed'
            }`}
          >
            <Undo2 size={16} className="md:w-[13px] md:h-[13px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
