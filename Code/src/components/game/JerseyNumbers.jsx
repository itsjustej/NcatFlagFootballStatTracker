import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { TEAM_COLORS } from '../../constants/teamColors';
import { isUnknownPlayer } from '../../utils/playerName';

function namedPlayers(players) {
  return (players || [])
    .filter((player) => player?.id && !isUnknownPlayer(player))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

function JerseyField({ value, duplicate, playerName, inputRef, onChange, onAdvance }) {
  const [editable, setEditable] = useState(false);
  const [text, setText] = useState(value != null ? String(value) : '');

  function commit(raw) {
    const next = raw === '' ? null : Number(raw);
    if (next !== (value ?? null)) onChange(next);
  }

  return (
    <input
      ref={inputRef}
      inputMode="numeric"
      enterKeyHint="next"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      readOnly={!editable}
      maxLength={2}
      value={text}
      aria-label={`Jersey number for ${playerName}`}
      placeholder="#"
      title={duplicate ? 'Another player already has this number' : 'Type two digits to move on. Press Enter after one digit.'}
      onPointerDown={(e) => {
        setEditable(true);
        e.target.readOnly = false;
      }}
      onFocus={(e) => {
        setEditable(true);
        e.target.readOnly = false;
        e.target.select();
      }}
      onClick={(e) => e.target.select()}
      onChange={(e) => {
        const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
        setText(raw);
        if (raw.length === 2) {
          commit(raw);
          requestAnimationFrame(onAdvance);
        }
      }}
      onBlur={() => commit(text)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit(text);
          onAdvance();
        }
      }}
      className={`w-16 min-h-11 text-center bg-slate-900 border rounded-lg px-2 text-white text-lg font-bold focus:outline-none focus:border-blue-400 tabular-nums ${
        duplicate ? 'border-amber-400' : 'border-slate-600'
      }`}
    />
  );
}

function AddPlayerForm({ onAdd }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (busy || !name.trim()) return;
    setBusy(true);
    setError('');
    try {
      await onAdd(name);
      setName('');
    } catch (err) {
      setError(err.message || 'Could not add that player.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-1 mt-2">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Add a player"
          aria-label="New player name"
          className="flex-1 min-h-11 bg-slate-900 border border-slate-600 rounded-lg px-3 text-white text-sm focus:outline-none focus:border-blue-400"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="min-h-11 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-40"
        >
          {busy ? 'Adding…' : 'Add'}
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}

function TeamList({ title, color, players, numbers, duplicates, inputRefs, onNumber, onAdvance, onAdd }) {
  return (
    <section>
      <h3 className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color }}>
        {title}
      </h3>
      {players.length > 0 && (
        <ul className="rounded-xl border border-slate-700 bg-slate-900/60">
          {players.map((player) => (
            <li
              key={player.id}
              className="flex items-center justify-between gap-3 px-3 py-1.5 border-b border-slate-700/60 last:border-0"
            >
              <span className="text-sm font-semibold text-white truncate">{player.name}</span>
              <JerseyField
                value={numbers[player.id] ?? player.number ?? null}
                duplicate={duplicates.has(numbers[player.id] ?? player.number)}
                playerName={player.name}
                inputRef={(node) => { inputRefs.current[player.id] = node; }}
                onChange={(next) => onNumber(player.id, next)}
                onAdvance={() => onAdvance(player.id)}
              />
            </li>
          ))}
        </ul>
      )}
      <AddPlayerForm onAdd={onAdd} />
    </section>
  );
}

export default function JerseyNumbers({
  homeName,
  awayName,
  homePlayers,
  awayPlayers,
  onJerseyUpdate,
  onAddPlayer,
  onClose,
}) {
  const home = namedPlayers(homePlayers);
  const away = namedPlayers(awayPlayers);
  const inputRefs = useRef({});
  const pendingFocus = useRef(null);
  const [numbers, setNumbers] = useState(() => {
    const draft = {};
    for (const player of [...home, ...away]) draft[player.id] = player.number ?? null;
    return draft;
  });

  function duplicatesFor(players) {
    const counts = {};
    for (const player of players) {
      const number = numbers[player.id];
      if (number == null) continue;
      counts[number] = (counts[number] || 0) + 1;
    }
    return new Set(
      Object.entries(counts)
        .filter(([, count]) => count > 1)
        .map(([number]) => Number(number)),
    );
  }

  function saveNumber(playerId, next) {
    setNumbers((current) => ({ ...current, [playerId]: next }));
    onJerseyUpdate(parseInt(playerId, 10), next);
  }

  function advanceFrom(playerId) {
    const order = [...home, ...away];
    const index = order.findIndex((player) => player.id === playerId);
    const next = order[index + 1];
    if (next) inputRefs.current[next.id]?.focus();
  }

  useEffect(() => {
    const id = pendingFocus.current;
    if (!id || !inputRefs.current[id]) return;
    pendingFocus.current = null;
    inputRefs.current[id].focus();
  }, [homePlayers, awayPlayers]);

  async function addTo(side, name) {
    const id = await onAddPlayer(side, name);
    if (!id) return;
    pendingFocus.current = String(id);
    setNumbers((current) => ({ ...current, [String(id)]: null }));
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="jersey-numbers-title"
        className="bg-slate-800 border border-slate-700 w-full sm:max-w-lg sm:rounded-xl rounded-t-2xl max-h-[85dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
          <div>
            <h2 id="jersey-numbers-title" className="text-lg font-bold text-white">
              Jersey numbers
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Add a player, then type their number. Two digits jumps to the next one.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 min-w-11 min-h-11 flex items-center justify-center text-slate-400 hover:text-white"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col gap-4">
          <TeamList
            title={homeName || 'Home'}
            color={TEAM_COLORS.home.muted}
            players={home}
            numbers={numbers}
            duplicates={duplicatesFor(home)}
            inputRefs={inputRefs}
            onNumber={saveNumber}
            onAdvance={advanceFrom}
            onAdd={(name) => addTo('home', name)}
          />
          <TeamList
            title={awayName || 'Away'}
            color={TEAM_COLORS.away.muted}
            players={away}
            numbers={numbers}
            duplicates={duplicatesFor(away)}
            inputRefs={inputRefs}
            onNumber={saveNumber}
            onAdvance={advanceFrom}
            onAdd={(name) => addTo('away', name)}
          />
        </div>
      </div>
    </div>
  );
}
