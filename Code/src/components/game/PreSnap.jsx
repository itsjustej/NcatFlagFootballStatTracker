import { useState, useRef } from "react";
import { possessionColor } from "../../constants/teamColors";
import { playerFirstName } from "../../utils/playerName";

function JerseyEditor({ currentNumber, onSave, onCancel }) {
  const [val, setVal] = useState(currentNumber != null ? String(currentNumber) : "");
  const inputRef = useRef(null);
  const mounted = useRef(false);
  if (!mounted.current) {
    mounted.current = true;
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function handleKey(e) {
    if (e.key === "Enter") {
      const n = val.trim() === "" ? null : parseInt(val);
      onSave(isNaN(n) ? null : n);
    }
    if (e.key === "Escape") onCancel();
  }

  return (
    <input
      ref={inputRef}
      type="number"
      min={0}
      max={99}
      value={val}
      onClick={e => e.stopPropagation()}
      onChange={e => setVal(e.target.value)}
      onBlur={() => {
        const n = val.trim() === "" ? null : parseInt(val);
        onSave(isNaN(n) ? null : n);
      }}
      onWheel={e => e.target.blur()}
      onKeyDown={handleKey}
      className="w-10 text-center bg-slate-600 border border-blue-400 rounded px-0.5 py-0 text-white text-[10px] font-bold focus:outline-none tabular-nums"
      style={{ height: 18 }}
    />
  );
}

const DOUBLE_TAP_MS = 350;

function PlayerBtn({ player, selected, accentColor, onClick, onJerseyUpdate, compact }) {
  const [editing, setEditing] = useState(false);
  const lastTapRef = useRef(0);

  function saveJersey(n) {
    setEditing(false);
    if (n !== player.number) onJerseyUpdate(parseInt(player.id), n);
  }

  function handleTap(e) {
    e.stopPropagation();
    if (editing) return;
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      setEditing(true);
      return;
    }
    lastTapRef.current = now;
    if (!compact) onClick?.();
  }

  const jerseyLabel = player.number != null ? `#${player.number}` : '—';
  const jerseyEditor = (
    <JerseyEditor
      currentNumber={player.number}
      onSave={saveJersey}
      onCancel={() => setEditing(false)}
    />
  );

  if (compact) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold"
        style={{
          background:  `${accentColor}22`,
          borderColor: accentColor,
          color:       '#fff',
        }}
      >
        {editing ? jerseyEditor : (
          <button
            type="button"
            onClick={handleTap}
            title="Double-tap to edit jersey #"
            className="flex items-center gap-2 min-h-[28px] touch-manipulation"
          >
            <span style={{ color: accentColor }}>{jerseyLabel}</span>
            {playerFirstName(player.name)}
          </button>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          className="text-slate-500 font-normal touch-manipulation"
          aria-label="Clear selection"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleTap}
      title="Double-tap to edit jersey #"
      className="flex-shrink-0 flex flex-col items-center justify-center rounded-xl border transition-all duration-150 active:scale-95 cursor-pointer select-none hover:border-white/20 touch-manipulation"
      style={{
        width:       72,
        height:      60,
        background:  selected ? accentColor : '#1e293b',
        borderColor: selected ? accentColor : 'rgba(255,255,255,0.12)',
        boxShadow:   selected ? `0 0 0 1px ${accentColor}` : 'none',
      }}
    >
      <div className="flex items-center justify-center mb-0.5" style={{ height: 18 }} onClick={e => editing && e.stopPropagation()}>
        {editing ? jerseyEditor : (
          <span
            className="text-[10px] font-semibold leading-none"
            style={{ color: selected ? 'rgba(255,255,255,0.65)' : accentColor }}
          >
            {jerseyLabel}
          </span>
        )}
      </div>
      <span className="text-[12px] font-bold text-white leading-tight text-center px-1">
        {playerFirstName(player.name)}
      </span>
    </button>
  );
}

export default function PreSnap({
  possession,
  offensePlayers,
  defensePlayers,
  selectedOffender,
  selectedDefender,
  onSelectOffender,
  onSelectDefender,
  homeName,
  awayName,
  onJerseyUpdate,
  pulse = false,
}) {
  const offColor = possessionColor(possession);
  const defColor = possessionColor(possession === 'home' ? 'away' : 'home');
  const offTeam  = possession === 'home' ? homeName : awayName;
  const defTeam  = possession === 'home' ? awayName : homeName;
  const showDefense = !!selectedOffender;

  return (
    <div className={`card-panel flex flex-col gap-3 ${pulse ? 'step-pulse' : ''}`}>
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="w-2 h-2 rounded-full" style={{ background: offColor }} />
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: offColor }}>
            {offTeam} — Offense
          </span>
          {selectedOffender ? (
            <PlayerBtn
              player={selectedOffender}
              selected
              accentColor={offColor}
              onClick={() => onSelectOffender(selectedOffender)}
              onJerseyUpdate={onJerseyUpdate}
              compact
            />
          ) : (
            <span className="ml-auto text-[10px] text-blue-400/90 font-medium animate-pulse">
              Select ball carrier →
            </span>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {offensePlayers.map(p => (
            <PlayerBtn
              key={p.id}
              player={p}
              selected={selectedOffender?.id === p.id}
              accentColor={offColor}
              onClick={() => onSelectOffender(p)}
              onJerseyUpdate={onJerseyUpdate}
            />
          ))}
        </div>
      </div>

      <div
        className={`transition-all duration-300 overflow-hidden ${
          showDefense ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full" style={{ background: defColor }} />
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: defColor }}>
            {defTeam} — Defense
          </span>
          {selectedDefender ? (
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
              #{selectedDefender.number} {playerFirstName(selectedDefender.name)}
            </span>
          ) : (
            <span className="ml-auto text-[10px] text-slate-500 italic">Optional</span>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {defensePlayers.map(p => (
            <PlayerBtn
              key={p.id}
              player={p}
              selected={selectedDefender?.id === p.id}
              accentColor={defColor}
              onClick={() => onSelectDefender(p)}
              onJerseyUpdate={onJerseyUpdate}
            />
          ))}
        </div>
      </div>

      <p className="text-[10px] text-slate-600 text-center">
        Double-tap a player to edit jersey #
      </p>
    </div>
  );
}
