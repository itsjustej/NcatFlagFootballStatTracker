import {
  attacksIncreasing,
  teamAttackingToward,
  yardLabel as fieldYardLabel,
  yardsGained,
} from '../../gameLogic';
import { possessionColor, TEAM_COLORS } from '../../constants/teamColors';

const END_ZONE_PCT = 10;
const FIELD_PCT = 80;

function yardToPct(yard) {
  return END_ZONE_PCT + (yard / 80) * FIELD_PCT;
}

function pctToYard(pct) {
  const adjusted = (pct - END_ZONE_PCT) / FIELD_PCT;
  return Math.max(-9, Math.min(89, Math.round(adjusted * 80)));
}

export default function FieldSpot({
  yardLine,
  distance,
  possession,
  homeAttacksRight = true,
  newSpot,
  onSpot,
  homeName,
  awayName,
  pulse = false,
  disabled = false,
}) {
  const leftTeamKey  = teamAttackingToward('left', homeAttacksRight);
  const rightTeamKey = teamAttackingToward('right', homeAttacksRight);
  const leftName     = leftTeamKey === 'home' ? homeName : awayName;
  const rightName    = rightTeamKey === 'home' ? homeName : awayName;
  const leftColor    = leftTeamKey === 'home' ? TEAM_COLORS.home.bg : TEAM_COLORS.away.bg;
  const rightColor   = rightTeamKey === 'home' ? TEAM_COLORS.home.bg : TEAM_COLORS.away.bg;
  const increasing   = attacksIncreasing(possession, homeAttacksRight);
  const firstDown    = increasing ? yardLine + distance : yardLine - distance;

  function handleClick(e) {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    onSpot(pctToYard(pct));
  }

  const scrimmPct    = yardToPct(yardLine);
  const firstDownPct = yardToPct(firstDown);
  const spotPct      = newSpot !== null ? yardToPct(newSpot) : null;
  const spotColor    = possessionColor(possession);
  const spotDelta    = newSpot !== null ? yardsGained(yardLine, newSpot, possession, homeAttacksRight) : 0;

  const chainLeft  = Math.min(scrimmPct, firstDownPct);
  const chainWidth = Math.abs(firstDownPct - scrimmPct);

  return (
    <div className="select-none">
      <div
        className={`relative w-full cursor-crosshair overflow-hidden rounded-xl shadow-lg shadow-black/30 border border-green-900/40 ${
          pulse ? 'field-pulse' : ''
        }`}
        style={{ height: '8.5rem' }}
        onClick={handleClick}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-green-700 via-green-800 to-green-900" />

        {[0, 2, 4, 6].map((i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 bg-white/[0.05]"
            style={{
              left:  `${END_ZONE_PCT + (i * 10 / 80) * FIELD_PCT}%`,
              width: `${(10 / 80) * FIELD_PCT}%`,
            }}
          />
        ))}

        {/* First-down chain zone */}
        {chainWidth > 0.5 && (
          <div
            className="absolute top-0 bottom-0 z-[5] pointer-events-none"
            style={{
              left:       `${chainLeft}%`,
              width:      `${chainWidth}%`,
              background: 'rgba(250, 204, 21, 0.08)',
            }}
          />
        )}

        <div
          className="absolute top-0 bottom-0 left-0 flex items-center justify-center overflow-hidden"
          style={{ width: `${END_ZONE_PCT}%`, background: leftColor }}
        >
          <span
            className="text-[9px] font-black tracking-[0.2em] text-white/85 uppercase px-0.5 text-center leading-tight"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            {leftName}
          </span>
        </div>

        <div
          className="absolute top-0 bottom-0 right-0 flex items-center justify-center overflow-hidden"
          style={{ width: `${END_ZONE_PCT}%`, background: rightColor }}
        >
          <span
            className="text-[9px] font-black tracking-[0.2em] text-white/85 uppercase px-0.5 text-center leading-tight"
            style={{ writingMode: 'vertical-rl' }}
          >
            {rightName}
          </span>
        </div>

        {[20, 40, 60].map((y) => {
          const pct   = yardToPct(y);
          const label = y === 40 ? '40' : '20';
          return (
            <div key={y} className="absolute top-0 bottom-0" style={{ left: `${pct}%` }}>
              <div className="absolute top-0 bottom-0 border-l border-white/25" />
              <span className="absolute text-[9px] font-bold text-white/50" style={{ top: 4, left: 3 }}>
                {label}
              </span>
            </div>
          );
        })}

        <div
          className="absolute top-0 bottom-0 border-l-2 border-white/35"
          style={{ left: `${yardToPct(40)}%` }}
        />

        <div
          className="absolute top-0 bottom-0 border-l-2 border-dashed border-yellow-400 z-10"
          style={{ left: `${firstDownPct}%` }}
        />

        <div
          className="absolute top-0 bottom-0 border-l-[3px] border-blue-400 z-10"
          style={{ left: `${scrimmPct}%`, boxShadow: '1px 0 8px rgba(96,165,250,0.4)' }}
        />

        {/* Ball at scrimmage */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 pointer-events-none transition-all duration-200"
          style={{ left: `${scrimmPct}%` }}
        >
          <div
            className="w-5 h-3.5 rounded-full border-2 border-white/90 shadow-md flex items-center justify-center"
            style={{ background: spotColor, transform: 'rotate(-25deg)' }}
          >
            <span className="text-[6px] font-black text-white/90 leading-none">🏈</span>
          </div>
        </div>

        {/* New spot marker */}
        {spotPct !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-30 pointer-events-none transition-all duration-150"
            style={{ left: `${spotPct}%` }}
          >
            <div
              className="w-4 h-4 rounded-full border-2 border-white ring-2 ring-yellow-400/60 shadow-lg"
              style={{ background: spotColor }}
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-2 px-0.5">
        <span className="text-[10px] text-slate-500 font-medium">{leftName}</span>
        {newSpot !== null ? (
          <span className="text-[11px] font-semibold text-white">
            {fieldYardLabel(newSpot, possession, homeAttacksRight)}
            <span className={`font-normal ml-1 ${spotDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              ({spotDelta > 0 ? '+' : ''}{spotDelta} yds)
            </span>
          </span>
        ) : (
          <span className="text-[11px] text-slate-400">
            {fieldYardLabel(yardLine, possession, homeAttacksRight)}
            <span className="text-blue-400/80 ml-1 font-medium">— tap to spot</span>
          </span>
        )}
        <span className="text-[10px] text-slate-500 font-medium">{rightName}</span>
      </div>

      <div className="flex items-center gap-4 mt-1.5 px-0.5">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-blue-400 rounded" />
          <span className="text-[10px] text-slate-500">Scrimmage</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 border-t-2 border-dashed border-yellow-400" />
          <span className="text-[10px] text-slate-500">1st Down</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full border border-white/30" style={{ background: spotColor }} />
          <span className="text-[10px] text-slate-500">
            {possession === 'home' ? homeName : awayName} ball
          </span>
        </div>
      </div>
    </div>
  );
}
