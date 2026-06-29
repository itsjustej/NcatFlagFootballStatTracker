import { useRef, useState, useEffect } from 'react';
import { Pause, Play, Undo2 } from 'lucide-react';
import { yardLabel as fieldYardLabel } from '../../gameLogic';
import { possessionColor, TEAM_COLORS } from '../../constants/teamColors';

function downStr(down, dist) {
  const sfx = ['', 'st', 'nd', 'rd', 'th'];
  return `${down}${sfx[down] ?? 'th'} & ${dist}`;
}

function isValidClock(v) {
  return /^\d{1,2}:\d{2}$/.test(v);
}

export default function Scoreboard({
  gs,
  clockRunning,
  canUndo,
  onClockToggle,
  onClockSet,
  onHalfChange,
  onUndo,
  homeName,
  awayName,
  scoreFlash,
}) {
  const { homeScore, awayScore, half, clock, down, distance, possession, yardLine, homeAttacksRight = true } = gs;
  const teamName = possession === 'home' ? homeName : awayName;
  const offColor = possessionColor(possession);

  const [editing, setEditing]   = useState(false);
  const [editVal, setEditVal]   = useState('');
  const [flashHome, setFlashHome] = useState(false);
  const [flashAway, setFlashAway] = useState(false);
  const clickTimer              = useRef(null);
  const inputRef                = useRef(null);

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

  function handleClockClick() {
    if (editing) return;
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      setEditVal(clock);
      setEditing(true);
      setTimeout(() => inputRef.current?.select(), 0);
    } else {
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        onClockToggle();
      }, 220);
    }
  }

  function commitEdit() {
    const trimmed = editVal.trim();
    if (isValidClock(trimmed)) onClockSet(trimmed);
    setEditing(false);
  }

  function handleEditKeyDown(e) {
    if (e.key === 'Enter')  commitEdit();
    if (e.key === 'Escape') setEditing(false);
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-stretch border-b border-slate-700">
        <div
          className={`flex-1 flex flex-col items-center justify-center py-4 gap-1 transition-colors duration-300 ${
            possession === 'home' ? 'bg-slate-700/40' : ''
          }`}
        >
          <span
            className="text-[10px] font-black uppercase tracking-[0.2em]"
            style={{ color: TEAM_COLORS.home.muted }}
          >
            {homeName}
          </span>
          <span
            className={`text-5xl font-black text-white tabular-nums ${flashHome ? 'score-flash-home' : ''}`}
          >
            {homeScore}
          </span>
        </div>

        <div className="flex flex-col items-center justify-center px-3 gap-1.5 border-x border-slate-700 bg-slate-900/40">
          <button
            onClick={handleClockClick}
            className="flex items-center gap-1.5 group select-none focus:outline-none"
            title="Click to pause/resume · Double-click to set time"
          >
            <span className="transition-opacity group-hover:opacity-70">
              {clockRunning
                ? <Pause size={11} className="text-slate-400" />
                : <Play  size={11} className={clock === '0:00' ? 'text-slate-600' : 'text-emerald-400'} />
              }
            </span>
            {editing ? (
              <input
                ref={inputRef}
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={handleEditKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="w-16 text-sm font-mono font-bold text-white bg-slate-700 border border-slate-500 rounded px-1 text-center focus:outline-none focus:border-blue-400"
                placeholder="M:SS"
              />
            ) : (
              <span className={`text-sm font-mono font-bold tabular-nums ${clockRunning ? 'text-white' : 'text-slate-400'}`}>
                {clock}
              </span>
            )}
          </button>

          <div className="flex rounded-md overflow-hidden border border-slate-600">
            {[1, 2].map((h) => (
              <button
                key={h}
                onClick={() => onHalfChange(h)}
                className={`px-2 py-0.5 text-[10px] font-bold transition-colors ${
                  half === h
                    ? 'bg-slate-600 text-white'
                    : 'bg-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {h === 1 ? '1st' : '2nd'}
              </button>
            ))}
          </div>
        </div>

        <div
          className={`flex-1 flex flex-col items-center justify-center py-4 gap-1 transition-colors duration-300 ${
            possession === 'away' ? 'bg-slate-700/40' : ''
          }`}
        >
          <span
            className="text-[10px] font-black uppercase tracking-[0.2em]"
            style={{ color: TEAM_COLORS.away.muted }}
          >
            {awayName}
          </span>
          <span
            className={`text-5xl font-black text-white tabular-nums ${flashAway ? 'score-flash-away' : ''}`}
          >
            {awayScore}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700 bg-slate-900/30">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: offColor }} />
          <span className="text-[12px] font-bold text-slate-300 truncate">
            {teamName} ball
            <span className="text-slate-500 font-normal ml-1.5">·</span>
            <span className="text-slate-400 font-normal ml-1.5">
              {fieldYardLabel(yardLine, possession, homeAttacksRight)}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="text-[12px] font-black text-white px-2.5 py-0.5 rounded-full"
            style={{ background: TEAM_COLORS.home.primary }}
          >
            {downStr(down, distance)}
          </span>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo last play"
            className={`flex items-center justify-center w-6 h-6 rounded transition-colors ${
              canUndo
                ? 'text-slate-300 hover:text-white hover:bg-slate-600'
                : 'text-slate-700 cursor-not-allowed'
            }`}
          >
            <Undo2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
