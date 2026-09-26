import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { useLeague } from '../../context/LeagueContext';
import { possessionColor, TEAM_COLORS } from '../../constants/teamColors';
import CurrentPlayPreview from './CurrentPlayPreview';
import EditPlayCredit from './EditPlayCredit';

function buildDrives(log, currentHalf) {
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

    drives.push({
      driveId,
      half:            first.half,
      possession:      first.drivePossession,
      plays,
      totalYards,
      result,
      endHomeScore:    last.homeScore,
      endAwayScore:    last.awayScore,
    });
  });

  const latestHalf = Math.max(
    currentHalf ?? 1,
    ...drives.map((d) => d.half ?? 1),
  );
  for (const drive of drives) {
    if (drive.result === 'In Progress' && drive.half < latestHalf) {
      drive.result = 'End of Half';
    }
  }

  return drives.sort((a, b) => b.driveId - a.driveId);
}

function downStr(down, dist) {
  const sfx = ['', 'st', 'nd', 'rd', 'th'];
  return `${down}${sfx[Math.min(down, 4)] ?? 'th'} & ${dist}`;
}

function resultColor(result) {
  if (result.includes('no good')) return '#f97316';
  if (result.startsWith('Touchdown')) return '#16a34a';
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

function canEditPlay(entry) {
  return Boolean(entry?.playId && entry.credits?.length);
}

function DriveRow({ drive, homeName, awayName, defaultOpen, scrollRef, onEditCredit }) {
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
                </div>
              </div>
              {onEditCredit && canEditPlay(entry) && (
                <button
                  type="button"
                  aria-label="Edit who is credited"
                  onClick={() => onEditCredit(entry)}
                  className="shrink-0 self-start min-w-11 min-h-11 -mr-2 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-700/70"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const PERIODS = [
  { id: 1, label: '1st' },
  { id: 2, label: '2nd' },
  { id: 3, label: 'OT' },
];

export default function PlayByPlay({
  log,
  homeName,
  awayName,
  gs,
  latestDriveId,
  homePlayers = [],
  awayPlayers = [],
  onEditCredit,
}) {
  const navigate    = useNavigate();
  const { clearGame } = useLeague();
  const drives      = buildDrives(log, gs?.half);
  const byPeriod    = {
    1: drives.filter((d) => d.half === 1),
    2: drives.filter((d) => d.half === 2),
    3: drives.filter((d) => d.half === 3),
  };
  const available   = PERIODS.filter((period) => byPeriod[period.id].length > 0);
  const latestPeriod = available.length ? available[available.length - 1].id : 1;
  const [period, setPeriod] = useState(gs?.half && byPeriod[gs.half]?.length ? gs.half : latestPeriod);
  const [editingId, setEditingId] = useState(null);
  const scrollRef   = useRef(null);
  const listRef     = useRef(null);
  const editing     = editingId ? log.find((entry) => entry.id === editingId) : null;

  useEffect(() => {
    if (gs?.half && byPeriod[gs.half]?.length) setPeriod(gs.half);
  }, [gs?.half]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [period]);

  useEffect(() => {
    if (latestDriveId && scrollRef.current && listRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [latestDriveId, log.length, period]);

  const visible = byPeriod[period] ?? [];

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
        <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
          Play by Play
        </span>
        {gs && (
          <button
            type="button"
            onClick={() => { navigate('/'); clearGame(); }}
            className="text-[10px] font-bold text-slate-400 hover:text-white border border-slate-600 hover:border-slate-400 px-2 py-1 rounded transition-colors"
          >
            Save & Exit
          </button>
        )}
      </div>

      {gs && <CurrentPlayPreview gs={gs} homeName={homeName} awayName={awayName} />}

      {available.length > 1 && (
        <div className="flex gap-1.5 px-3 py-2 border-b border-slate-700 shrink-0">
          {available.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPeriod(item.id)}
              className={`flex-1 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wide transition-colors ${
                period === item.id
                  ? 'bg-slate-600 text-white'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-slate-700/60'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      <div ref={listRef} className="flex-1 overflow-y-auto min-h-0">
        {log.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center px-4">
            <p className="text-slate-500 text-sm font-medium">No plays yet</p>
            <p className="text-slate-600 text-xs">Select a player and log your first play</p>
          </div>
        ) : visible.length === 0 ? (
          <p className="text-[11px] text-slate-600 px-4 py-3">No drives yet</p>
        ) : (
          visible.map((d) => (
            <DriveRow
              key={d.driveId}
              drive={d}
              homeName={homeName}
              awayName={awayName}
              defaultOpen={d.driveId === latestDriveId}
              scrollRef={scrollRef}
              onEditCredit={onEditCredit ? (entry) => setEditingId(entry.id) : null}
            />
          ))
        )}
      </div>

      {editing && onEditCredit && (
        <EditPlayCredit
          key={editing.id}
          entry={editing}
          homePlayers={homePlayers}
          awayPlayers={awayPlayers}
          onClose={() => setEditingId(null)}
          onSave={(changes) => onEditCredit(editing, changes)}
        />
      )}
    </div>
  );
}
