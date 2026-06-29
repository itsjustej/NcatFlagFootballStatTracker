const PLAY_TYPES = [
  { t: 'pass',    label: 'Pass',    bg: '#004B87' },
  { t: 'rush',    label: 'Rush',    bg: '#16a34a' },
  { t: 'penalty', label: 'Penalty', bg: '#ea580c' },
  { t: 'punt',    label: 'Punt',    bg: '#64748b' },
];

export default function MobilePlayBar({ gs, onPlayType, visible }) {
  if (!visible || !gs?.selectedOffender) return null;
  if (gs.playPhase !== 'play-type' && gs.playPhase !== 'pass-receiver' && gs.playPhase !== 'pass-result') {
    return null;
  }
  if (gs.playPhase !== 'play-type') return null;
  if (!gs.newSpot) return null;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-slate-700 bg-slate-900/95 backdrop-blur px-3 py-3 pb-safe">
      <div className="grid grid-cols-4 gap-2">
        {PLAY_TYPES.map(({ t, label, bg }) => (
          <button
            key={t}
            type="button"
            onClick={() => onPlayType(t)}
            className="py-3 rounded-xl font-bold text-sm text-white transition-all duration-150 active:scale-95"
            style={{
              background:  gs.playType === t ? bg : 'rgba(255,255,255,0.08)',
              border:      `2px solid ${gs.playType === t ? bg : 'rgba(255,255,255,0.12)'}`,
              boxShadow:   gs.playType === t ? `0 4px 16px ${bg}55` : 'none',
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
