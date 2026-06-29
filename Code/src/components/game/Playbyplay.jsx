import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeague } from '../../context/LeagueContext';
import { possessionColor, TEAM_COLORS } from '../../constants/teamColors';
import CurrentPlayPreview from './CurrentPlayPreview';

function parseSecs(clock) {
  const [m, s] = clock.split(':').map(Number);
  return (m || 0) * 60 + (s || 0);
}

function formatTop(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function buildDrives(log) {
  const map = new Map();
  for (const entry of log) {
    const existing = map.get(entry.driveId) ?? [];
    existing.push(entry);
    map.set(entry.driveId, existing);
  }

  const drives = [];
  map.forEach((plays, driveId) => {
    const first      = plays[0];
    const last       = plays[plays.length - 1];
    const totalYards = plays.reduce((sum, p) => sum + Math.max(0, p.yardsGained), 0);
    const terminal   = [...plays].reverse().find((p) => p.driveResult);
    const result     = terminal?.driveResult ?? 'In Progress';

    let timeOfPossession = null;
    if (plays.length > 0 && first.clock && last.clock) {
      const elapsed = parseSecs(first.clock) - parseSecs(last.clock);
      if (elapsed > 0) timeOfPossession = formatTop(elapsed);
    }

    drives.push({
      driveId,
      half:            first.half,
      possession:      first.drivePossession,
      plays,
      totalYards,
      result,
      endHomeScore:    last.homeScore,
      endAwayScore:    last.awayScore,
      timeOfPossession,
    });
  });

  return drives.sort((a, b) => b.driveId - a.driveId);
}

function downStr(down, dist) {
  const sfx = ['', 'st', 'nd', 'rd', 'th'];
  return `${down}${sfx[Math.min(down, 4)] ?? 'th'} & ${dist}`;
}

function resultColor(result) {
  if (result.startsWith('Touchdown, ') && result.endsWith('good')) return '#16a34a';
  if (result.startsWith('Touchdown, no good'))                      return '#f97316';
  const map = {
    Touchdown:           '#16a34a',
    'Pick 6':            '#16a34a',
    Interception:        '#ef4444',
    'Turnover on Downs': '#ef4444',
    Safety:              '#f97316',
    Punt:                '#94a3b8',
    'Punt Return TD':    '#16a34a',
    'End of Half':       '#64748b',
    'In Progress':       '#3b82f6',
  };
  return map[result] ?? '#94a3b8';
}

function DriveRow({ drive, homeName, awayName, defaultOpen, scrollRef }) {
  const [open, setOpen]  = useState(defaultOpen);
  const teamName         = drive.possession === 'home' ? homeName : awayName;
  const teamColor        = possessionColor(drive.possession);
  const playCount        = drive.plays.length;

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  return (
    <div className="border-b border-slate-700/60" ref={defaultOpen ? scrollRef : null}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/30 transition-colors text-left"
      >
        <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: teamColor, minHeight: 36 }} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-white">{drive.result}</span>
            <span
              className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ background: `${teamColor}22`, color: teamColor }}
            >
              {teamName}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {playCount} play{playCount !== 1 ? 's' : ''}, {drive.totalYards} yd{drive.totalYards !== 1 ? 's' : ''}
            {drive.timeOfPossession && (
              <span className="text-slate-500 ml-1.5">· {drive.timeOfPossession}</span>
            )}
          </p>
        </div>

        <div className="text-right shrink-0 mr-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] font-black tabular-nums" style={{ color: TEAM_COLORS.home.muted }}>
              {drive.endHomeScore}
            </span>
            <span className="text-slate-600 text-[11px]">–</span>
            <span className="text-[13px] font-black tabular-nums" style={{ color: TEAM_COLORS.away.muted }}>
              {drive.endAwayScore}
            </span>
          </div>
        </div>

        <svg
          className="shrink-0 transition-transform duration-200 text-slate-500"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="bg-slate-900/40">
          {drive.plays.map((entry) => (
            <div
              key={entry.id}
              className="flex gap-3 px-4 py-3 border-t border-slate-800/60 hover:bg-slate-800/20 transition-colors"
            >
              <div className="w-0.5 self-stretch rounded-full shrink-0 mt-0.5" style={{ background: teamColor, minHeight: 20 }} />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-slate-200 leading-snug">{entry.description}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="text-[10px] text-slate-500">{downStr(entry.down, entry.distance)}</span>
                  {entry.yardsGained !== 0 && (
                    <>
                      <span className="text-slate-700">·</span>
                      <span className={`text-[10px] font-bold tabular-nums ${entry.yardsGained > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                        {entry.yardsGained > 0 ? '+' : ''}{entry.yardsGained} yds
                      </span>
                    </>
                  )}
                  {entry.clock && (
                    <>
                      <span className="text-slate-700">·</span>
                      <span className="text-[10px] text-slate-500 tabular-nums font-mono">{entry.clock}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlayByPlay({ log, homeName, awayName, gs, latestDriveId }) {
  const navigate    = useNavigate();
  const { clearGame } = useLeague();
  const drives      = buildDrives(log);
  const half1       = drives.filter((d) => d.half === 1);
  const half2       = drives.filter((d) => d.half === 2);
  const scrollRef   = useRef(null);
  const listRef     = useRef(null);

  useEffect(() => {
    if (latestDriveId && scrollRef.current && listRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [latestDriveId, log.length]);

  const renderHalf = (halfDrives, label) => (
    <div>
      <div className="sticky top-0 z-10 px-4 py-2 bg-slate-800 border-b border-slate-700">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      </div>
      {halfDrives.length === 0 ? (
        <p className="text-[11px] text-slate-600 px-4 py-3">No drives yet</p>
      ) : (
        halfDrives.map((d) => (
          <DriveRow
            key={d.driveId}
            drive={d}
            homeName={homeName}
            awayName={awayName}
            defaultOpen={d.driveId === latestDriveId}
            scrollRef={scrollRef}
          />
        ))
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
        <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
          Play by Play
        </span>
        <button
          type="button"
          onClick={() => { navigate('/'); clearGame(); }}
          className="text-[10px] font-bold text-slate-400 hover:text-white border border-slate-600 hover:border-slate-400 px-2 py-1 rounded transition-colors"
        >
          Save & Exit
        </button>
      </div>

      {gs && <CurrentPlayPreview gs={gs} homeName={homeName} awayName={awayName} />}

      <div ref={listRef} className="flex-1 overflow-y-auto min-h-0">
        {log.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center px-4">
            <p className="text-slate-500 text-sm font-medium">No plays yet</p>
            <p className="text-slate-600 text-xs">Select a player and log your first play</p>
          </div>
        ) : (
          <>
            {half2.length > 0 && renderHalf(half2, '2nd Half')}
            {half1.length > 0 && renderHalf(half1, '1st Half')}
          </>
        )}
      </div>
    </div>
  );
}
