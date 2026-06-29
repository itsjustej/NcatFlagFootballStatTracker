import { yardLabel as fieldYardLabel } from '../../gameLogic';
import { possessionColor } from '../../constants/teamColors';

function downStr(down, dist) {
  const sfx = ['', 'st', 'nd', 'rd', 'th'];
  return `${down}${sfx[down] ?? 'th'} & ${dist}`;
}

export default function CurrentPlayPreview({ gs, homeName, awayName }) {
  if (!gs) return null;

  const teamName = gs.possession === 'home' ? homeName : awayName;
  const color    = possessionColor(gs.possession);
  const carrier  = gs.selectedOffender?.name?.split(' ')[0];
  const defender = gs.selectedDefender?.name?.split(' ')[0];

  let phase = 'Select ball carrier';
  if (gs.selectedOffender && gs.newSpot == null) phase = 'Tap field to spot ball';
  else if (gs.playPhase === 'play-type' && !gs.playType) phase = 'Choose play type';
  else if (gs.playPhase === 'pass-receiver') phase = 'Select receiver or INC/INT';
  else if (gs.playPhase === 'pass-result') phase = 'Confirm pass result';
  else if (gs.playPhase === 'advance-down') phase = 'Penalty — advance down?';
  else if (gs.playPhase === 'conversion') phase = 'Conversion attempt';
  else if (gs.selectedOffender && gs.playType) phase = `${gs.playType} in progress`;

  return (
    <div className="mx-3 mt-3 mb-1 rounded-lg border border-slate-600/60 bg-slate-900/60 p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Live
        </span>
      </div>
      <p className="text-[12px] font-bold text-white leading-snug">{phase}</p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1.5 text-[10px] text-slate-400">
        <span style={{ color }}>{teamName}</span>
        <span>·</span>
        <span>{downStr(gs.down, gs.distance)}</span>
        <span>·</span>
        <span>{fieldYardLabel(gs.yardLine, gs.possession, gs.homeAttacksRight ?? true)}</span>
        {carrier && (
          <>
            <span>·</span>
            <span className="text-slate-300">{carrier}</span>
          </>
        )}
        {defender && (
          <>
            <span>·</span>
            <span className="text-slate-500">vs {defender}</span>
          </>
        )}
      </div>
    </div>
  );
}
