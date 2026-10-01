const ACTIONS = [
  { t: 'incomplete', label: 'Incomplete', bg: '#dc2626' },
  { t: 'pass', label: 'Pass', bg: '#004B87' },
  { t: 'rush', label: 'Rush', bg: '#16a34a' },
  { t: 'interception', label: 'INT', bg: '#ea580c' },
  { t: 'punt', label: 'Punt', bg: '#475569' },
  { t: 'penalty', label: 'Penalty', bg: '#c2410c' },
];

export default function CoopPlayBar({ gs, homeName, awayName, onPlay, onAdvanceDown }) {
  if (gs.playPhase === 'conversion') return null;

  if (gs.playPhase === 'advance-down') {
    const penaltyTeam = gs.penaltyTeam ?? gs.possession;
    const defenseWasFlagged = penaltyTeam !== gs.possession;
    const penaltyTeamName = penaltyTeam === 'home' ? homeName : awayName;
    const question = defenseWasFlagged ? 'Auto first down?' : 'Loss of down?';
    const yesLabel = defenseWasFlagged ? 'Auto 1st Down' : 'Loss of Down';
    const noLabel = defenseWasFlagged ? 'Just Yardage' : 'Replay Down';

    return (
      <div className="rounded-xl border border-orange-500/30 bg-orange-900/20 p-3 flex flex-col gap-2">
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Penalty on {penaltyTeamName}
          </p>
          <p className="text-sm font-bold text-white">{question}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onAdvanceDown(true)}
            className="min-h-12 rounded-xl font-bold text-sm text-white bg-[#004B87] active:scale-95"
          >
            {yesLabel}
          </button>
          <button
            type="button"
            onClick={() => onAdvanceDown(false)}
            className="min-h-12 rounded-xl font-bold text-sm text-slate-200 bg-slate-700 active:scale-95"
          >
            {noLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {ACTIONS.map(({ t, label, bg }) => (
        <button
          key={t}
          type="button"
          onClick={() => onPlay(t)}
          className="min-h-12 rounded-xl font-bold text-[13px] leading-tight text-white active:scale-95 px-1"
          style={{ background: bg }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
