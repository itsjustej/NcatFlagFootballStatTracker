import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { possessionColor } from '../../constants/teamColors';
import { playerFirstName } from '../../utils/playerName';
import { isOffenseRole, ROLE_LABELS } from '../../utils/playCredit';

function sideForRole(role, drivePossession) {
  const offenseSide = drivePossession === 'away' ? 'away' : 'home';
  if (isOffenseRole(role)) return offenseSide;
  return offenseSide === 'home' ? 'away' : 'home';
}

function rosterFor(role, entry, homePlayers, awayPlayers) {
  const side = sideForRole(role, entry.drivePossession);
  return side === 'home' ? homePlayers : awayPlayers;
}

function CreditPicker({ role, credit, players, selectedId, takenIds, accent, disabled, onSelect }) {
  const pool = useMemo(() => {
    const list = players ?? [];
    if (credit && !list.some((p) => p.id === String(credit.playerId))) {
      return [
        { id: String(credit.playerId), name: credit.playerName, number: null },
        ...list,
      ];
    }
    return list;
  }, [players, credit]);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>
        {ROLE_LABELS[role] ?? role}
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {pool.map((player) => {
          const selected = player.id === selectedId;
          const taken = takenIds.has(player.id) && !selected;
          return (
            <button
              key={player.id}
              type="button"
              disabled={disabled || taken}
              aria-pressed={selected}
              onClick={() => onSelect(player.id)}
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

export default function EditPlayCredit({ entry, homePlayers, awayPlayers, onSave, onClose }) {
  const [draft, setDraft] = useState(() =>
    Object.fromEntries((entry.credits || []).map((c) => [c.role, String(c.playerId)])),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const changed = (entry.credits || []).some((c) => draft[c.role] !== String(c.playerId));

  async function handleSave() {
    const changes = (entry.credits || [])
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
            <h2 id="edit-credit-title" className="text-lg font-bold text-white">Edit credit</h2>
            <p className="text-sm text-slate-300 mt-1 leading-snug">{entry.description}</p>
            <p className="text-[11px] text-slate-500 mt-2">
              Changes who the play is credited to. The result and yardage stay the same.
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

        <div className="flex-1 overflow-y-auto px-5 pb-3 flex flex-col gap-4">
          {(entry.credits || []).map((credit) => {
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
                onSelect={(id) => setDraft((prev) => ({ ...prev, [credit.role]: id }))}
              />
            );
          })}
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-slate-700">
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
