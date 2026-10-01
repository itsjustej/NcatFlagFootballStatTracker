import { useEffect, useState, useRef } from "react";
import { possessionColor } from "../../constants/teamColors";
import { isUnknownPlayer, playerFirstName } from "../../utils/playerName";

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

  const unknown = isUnknownPlayer(player);

  function handleTap(e) {
    e.stopPropagation();
    if (editing) return;
    if (unknown) {
      onClick?.();
      return;
    }
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
            {!unknown && <span style={{ color: accentColor }}>{jerseyLabel}</span>}
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
      title={unknown ? "Credit this play to Unknown" : "Double-tap to edit jersey #"}
      className="w-full min-h-14 flex flex-col items-center justify-center rounded-xl border transition-all duration-150 active:scale-95 cursor-pointer select-none hover:border-white/20 touch-manipulation"
      style={{
        background:  selected ? accentColor : '#1e293b',
        borderColor: selected ? accentColor : 'rgba(255,255,255,0.12)',
        boxShadow:   selected ? `0 0 0 1px ${accentColor}` : 'none',
      }}
    >
      <div className="flex items-center justify-center mb-0.5" style={{ height: 18 }} onClick={e => editing && e.stopPropagation()}>
        {editing ? jerseyEditor : !unknown && (
          <span
            className="text-[10px] font-semibold leading-none"
            style={{ color: selected ? 'rgba(255,255,255,0.65)' : accentColor }}
          >
            {jerseyLabel}
          </span>
        )}
      </div>
      <span className="text-[12px] font-bold text-white leading-tight text-center px-1 truncate w-full">
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
  hideDefense = false,
  collapsible = false,
  playCount = 0,
}) {
  const offColor = possessionColor(possession);
  const defColor = possessionColor(possession === 'home' ? 'away' : 'home');
  const offTeam  = possession === 'home' ? homeName : awayName;
  const defTeam  = possession === 'home' ? awayName : homeName;
  const showDefense = !!selectedOffender && !hideDefense;
  const [rosterOpen, setRosterOpen] = useState(() => !(collapsible && selectedOffender));

  useEffect(() => {
    if (!collapsible) return;
    setRosterOpen(!selectedOffender);
  }, [collapsible, possession, selectedOffender?.id, playCount]);

  function pickOffender(player) {
    const clearing = selectedOffender?.id === player.id;
    onSelectOffender(player);
    if (collapsible) setRosterOpen(clearing);
  }

  if (collapsible && !rosterOpen) {
    return (
      <button
        type="button"
        onClick={() => setRosterOpen(true)}
        className="card-panel w-full min-h-12 flex items-center justify-between gap-3 px-3 py-2 text-left"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: offColor }} />
          <span className="text-[11px] font-bold uppercase tracking-widest shrink-0" style={{ color: offColor }}>
            QB
          </span>
          <span className="text-sm font-bold text-white truncate">
            {selectedOffender ? playerFirstName(selectedOffender.name) : 'Pick passer'}
          </span>
        </span>
        <span className="text-xs font-bold text-slate-300 shrink-0">Change</span>
      </button>
    );
  }

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
              onClick={() => pickOffender(selectedOffender)}
              onJerseyUpdate={onJerseyUpdate}
              compact
            />
          ) : (
            <span className="ml-auto text-[10px] text-blue-400/90 font-medium animate-pulse">
              Select ball carrier →
            </span>
          )}
          {collapsible && (
            <button
              type="button"
              onClick={() => setRosterOpen(false)}
              className="ml-auto min-h-9 px-2 text-xs font-bold text-slate-300"
            >
              Hide
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {offensePlayers.map(p => (
            <PlayerBtn
              key={p.id}
              player={p}
              selected={selectedOffender?.id === p.id}
              accentColor={offColor}
              onClick={() => pickOffender(p)}
              onJerseyUpdate={onJerseyUpdate}
            />
          ))}
        </div>
      </div>

      <div
        className={`transition-all duration-300 overflow-hidden ${
          showDefense ? 'max-h-[40rem] opacity-100' : 'max-h-0 opacity-0'
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
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
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
