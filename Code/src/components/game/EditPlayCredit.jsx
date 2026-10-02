import { useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { possessionColor } from '../../constants/teamColors';
import { sortByJersey } from '../../context/useGame';
import { playerFirstName } from '../../utils/playerName';
import { creditsNeedingPlayers, isOffenseRole, isOffensiveTouchdown, ROLE_LABELS } from '../../utils/playCredit';
import { isUnknownPlayer } from '../../utils/playerName';
import { withUnknownLast } from '../../utils/unknownPlayer';

function sideForRole(role, drivePossession) {
  const offenseSide = drivePossession === 'away' ? 'away' : 'home';
  if (isOffenseRole(role)) return offenseSide;
  return offenseSide === 'home' ? 'away' : 'home';
}

function rosterFor(role, entry, homePlayers, awayPlayers) {
  const side = sideForRole(role, entry.drivePossession);
  return side === 'home' ? homePlayers : awayPlayers;
}

const ASK = {
  passer: 'Who threw it?',
  rusher: 'Who ran it?',
  receiver: 'Who caught it?',
  defender: 'Who tagged them?',
  interceptor: 'Who picked it off?',
};

function NameButton({ player, accent, disabled, onClick }) {
  const unknown = isUnknownPlayer(player);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="min-h-16 flex flex-col items-center justify-center rounded-xl border border-white/10 bg-slate-800 active:scale-95 disabled:opacity-30"
    >
      {!unknown && (
        <span className="text-base font-black leading-none" style={{ color: accent }}>
          {player.number != null ? player.number : '—'}
        </span>
      )}
      <span className={`${unknown ? '' : 'mt-1 '}text-[11px] font-bold text-white leading-tight text-center px-1 truncate w-full`}>
        {playerFirstName(player.name)}
      </span>
    </button>
  );
}

function QuickFill({
  entry,
  credit,
  players,
  taken,
  step,
  total,
  nextAsk,
  error,
  onPick,
  onClear,
  onClose,
  onEditOthers,
}) {
  const ask = ASK[credit.role] ?? (ROLE_LABELS[credit.role] || credit.role);
  const accent = possessionColor(sideForRole(credit.role, entry.drivePossession));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col">
      <div className="shrink-0 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 border-b border-slate-800">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={onClose} className="min-h-11 text-sm font-bold text-slate-300">
            Close
          </button>
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            {step} of {total}
          </span>
        </div>
        <h2 className="text-2xl font-black leading-tight mt-1">{ask}</h2>
        <p className="text-sm text-slate-300 mt-1 line-clamp-2">{entry.description}</p>
        {nextAsk && <p className="text-xs font-semibold text-slate-500 mt-1">Next: {nextAsk}</p>}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {credit.role === 'defender' && (
          <button
            type="button"
            onClick={onClear}
            className="w-full min-h-12 mb-3 rounded-xl border border-slate-600 font-bold text-slate-100"
          >
            No flag pull
          </button>
        )}
        <div className="grid grid-cols-3 gap-2">
          {players.map((player) => (
            <NameButton
              key={player.id}
              player={player}
              accent={accent}
              disabled={taken.has(player.id)}
              onClick={() => onPick(player)}
            />
          ))}
        </div>
        {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
        <button type="button" onClick={onEditOthers} className="mt-4 min-h-11 text-sm font-semibold text-slate-400">
          Change a name already set
        </button>
      </div>
    </div>
  );
}

function CreditPicker({ role, credit, players, selectedId, takenIds, accent, disabled, allowClear, onSelect }) {
  const pool = useMemo(() => {
    const list = [...(players ?? [])];
    if (credit && !list.some((p) => p.id === String(credit.playerId))) {
      list.push({ id: String(credit.playerId), name: credit.playerName, number: null });
    }
    return withUnknownLast(sortByJersey(list));
  }, [players, credit]);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>
        {ROLE_LABELS[role] ?? role}
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {allowClear && (
          <button
            type="button"
            disabled={disabled}
            aria-pressed={!selectedId}
            onClick={() => onSelect('')}
            className="min-h-14 flex items-center justify-center rounded-xl border px-1 text-[12px] font-bold leading-tight text-center"
            style={{
              background: !selectedId ? accent : '#1e293b',
              borderColor: !selectedId ? accent : 'rgba(255,255,255,0.12)',
              color: '#fff',
            }}
          >
            No flag pull
          </button>
        )}
        {pool.map((player) => {
          const selected = player.id === selectedId;
          const taken = takenIds.has(player.id) && !selected && !isUnknownPlayer(player);
          return (
            <button
              key={player.id}
              type="button"
              disabled={disabled || taken}
              aria-pressed={selected}
              onClick={() => onSelect(allowClear && selected ? '' : player.id)}
              className="min-h-14 flex flex-col items-center justify-center rounded-xl border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: selected ? accent : '#1e293b',
                borderColor: selected ? accent : 'rgba(255,255,255,0.12)',
              }}
            >
              <span
                className="text-[10px] font-semibold leading-none mb-1"
                style={{ color: selected ? 'rgba(255,255,255,0.65)' : accent }}
              >
                #{player.number ?? '—'}
              </span>
              <span className="text-[12px] font-bold text-white leading-tight text-center px-1 truncate w-full">
                {playerFirstName(player.name)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function EditPlayCredit({
  entry,
  homePlayers,
  awayPlayers,
  onSave,
  onClose,
  onFinished,
  focusMissing = false,
}) {
  const [draft, setDraft] = useState(() =>
    Object.fromEntries((entry.credits || []).map((c) => [c.role, String(c.playerId)])),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showFilled, setShowFilled] = useState(false);
  const [doneRoles, setDoneRoles] = useState([]);
  const doneRef = useRef([]);

  const credits = (entry.credits || []).filter(
    (credit) => !(credit.role === 'defender' && isOffensiveTouchdown(entry)),
  );
  const missing = creditsNeedingPlayers({ ...entry, credits });
  const filled = credits.filter((credit) => !isUnknownPlayer(credit.playerName));
  const visible = focusMissing && !showFilled && missing.length ? missing : credits;
  const remaining = missing.filter((credit) => !doneRoles.includes(credit.role));
  const current = remaining[0];

  function commit(credit, player) {
    if (doneRef.current.includes(credit.role)) return;
    doneRef.current = [...doneRef.current, credit.role];
    const change = player
      ? {
          role: credit.role,
          fromPlayerId: credit.playerId,
          toPlayerId: Number(player.id),
          fromName: credit.playerName,
          toPlayer: player,
        }
      : {
          role: credit.role,
          fromPlayerId: credit.playerId,
          fromName: credit.playerName,
          remove: true,
        };
    const still = missing.filter((item) => item.role !== credit.role && !doneRoles.includes(item.role));
    setDoneRoles((prev) => [...prev, credit.role]);
    setDraft((prev) => ({ ...prev, [credit.role]: player ? String(player.id) : '' }));
    setError('');
    onSave([change]).then(() => {
      if (still.length === 0) onFinished?.(entry);
    }).catch((err) => {
      doneRef.current = doneRef.current.filter((role) => role !== credit.role);
      setDoneRoles((prev) => prev.filter((role) => role !== credit.role));
      setError(err.message || 'Could not save');
    });
  }

  if (focusMissing && !showFilled && missing.length) {
    if (!current) {
      return (
        <div className="fixed inset-0 z-50 bg-slate-900 text-white flex items-center justify-center">
          <p className="text-sm font-semibold text-slate-300">Saving…</p>
        </div>
      );
    }
    const fullRoster = withUnknownLast(sortByJersey(
      rosterFor(current.role, entry, homePlayers, awayPlayers) || [],
    ));
    const unknownIds = new Set(
      missing.map((credit) => String(credit.playerId)),
    );
    const taken = new Set(
      Object.entries(draft)
        .filter(([role, id]) => role !== current.role && id && !unknownIds.has(String(id)))
        .map(([, id]) => String(id)),
    );
    return (
      <QuickFill
        entry={entry}
        credit={current}
        players={fullRoster}
        taken={taken}
        step={doneRoles.length + 1}
        total={missing.length}
        nextAsk={remaining[1] ? (ASK[remaining[1].role] ?? null) : null}
        error={error}
        onPick={(player) => commit(current, player)}
        onClear={() => commit(current, null)}
        onClose={onClose}
        onEditOthers={() => setShowFilled(true)}
      />
    );
  }

  const changed = (entry.credits || []).some((c) => (draft[c.role] || '') !== String(c.playerId));

  async function handleSave() {
    const removals = (entry.credits || [])
      .filter((c) => c.role === 'defender' && !draft[c.role])
      .map((c) => ({
        role: c.role,
        fromPlayerId: c.playerId,
        fromName: c.playerName,
        remove: true,
      }));
    const updates = (entry.credits || [])
      .filter((c) => draft[c.role] && draft[c.role] !== String(c.playerId))
      .map((c) => {
        const pool = rosterFor(c.role, entry, homePlayers, awayPlayers);
        const toPlayer = pool.find((p) => p.id === draft[c.role]) ?? {
          id: draft[c.role],
          name: '',
        };
        return {
          role: c.role,
          fromPlayerId: c.playerId,
          toPlayerId: Number(draft[c.role]),
          fromName: c.playerName,
          toPlayer,
        };
      });
    const changes = [...updates, ...removals];

    if (!changes.length) {
      onClose();
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSave(changes);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not update credit');
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="edit-credit-title"
        className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-lg max-h-[85dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="min-w-0">
            <h2 id="edit-credit-title" className="text-lg font-bold text-white">
              {focusMissing && missing.length ? 'Fill in players' : 'Edit credit'}
            </h2>
            <p className="text-sm text-slate-300 mt-1 leading-snug">{entry.description}</p>
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

        <div className="flex-1 overflow-y-auto px-5 pb-3 flex flex-col gap-4">
          {visible.map((credit) => {
            const takenIds = new Set(
              Object.entries(draft)
                .filter(([role]) => role !== credit.role)
                .map(([, id]) => id),
            );
            return (
              <CreditPicker
                key={credit.role}
                role={credit.role}
                credit={credit}
                players={rosterFor(credit.role, entry, homePlayers, awayPlayers)}
                selectedId={draft[credit.role]}
                takenIds={takenIds}
                accent={possessionColor(sideForRole(credit.role, entry.drivePossession))}
                disabled={saving}
                allowClear={credit.role === 'defender'}
                onSelect={(id) => setDraft((prev) => ({ ...prev, [credit.role]: id }))}
              />
            );
          })}
          {focusMissing && missing.length > 0 && filled.length > 0 && !showFilled && (
            <button
              type="button"
              onClick={() => setShowFilled(true)}
              className="min-h-11 text-sm font-semibold text-slate-300"
            >
              Change the other players
            </button>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <div className="flex gap-2 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-700">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !changed}
            className="flex-1 py-3 min-h-[44px] bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3 min-h-[44px] bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
