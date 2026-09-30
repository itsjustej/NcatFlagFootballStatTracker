import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PlayByPlay from '../components/game/PlayByPlay';
import EditPlayCredit from '../components/game/EditPlayCredit';
import { fetchGameData } from './GameViewPage';
import { updatePlayCredit, playNeedsPlayers, ROLE_LABELS } from '../utils/playCredit';
import { isUnknownPlayer } from '../utils/playerName';
import { useLivePlays } from '../utils/liveGame';
import { possessionColor, TEAM_COLORS } from '../constants/teamColors';

const HALF_LABEL = { 1: '1st', 2: '2nd', 3: 'OT' };

function downStr(down, dist) {
  const sfx = ['', 'st', 'nd', 'rd', 'th'];
  return `${down}${sfx[Math.min(down, 4)] ?? 'th'} & ${dist}`;
}

function missingCredits(entry) {
  return (entry.credits || []).filter((credit) => isUnknownPlayer(credit.playerName));
}

function PlayCard({ entry, homeName, awayName, onFill }) {
  const side = entry.drivePossession === 'away' ? 'away' : 'home';
  const teamName = side === 'home' ? homeName : awayName;
  const accent = possessionColor(side);
  const missing = missingCredits(entry);

  return (
    <button
      type="button"
      onClick={() => onFill(entry)}
      className="w-full text-left rounded-2xl border border-slate-700 bg-slate-800/80 active:bg-slate-700/80 px-4 py-3.5 min-h-[88px]"
    >
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <span className="text-[11px] font-black uppercase tracking-wider truncate" style={{ color: accent }}>
          {teamName}
        </span>
        <span className="text-[11px] font-semibold text-slate-400 shrink-0">
          {HALF_LABEL[entry.half] ?? ''}
          {entry.down ? ` · ${downStr(entry.down, entry.distance)}` : ''}
        </span>
      </div>
      <p className="text-[15px] leading-snug font-medium text-white">{entry.description}</p>
      {missing.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {missing.map((credit) => (
            <span
              key={credit.role}
              className="text-[11px] font-bold uppercase tracking-wide text-amber-200 bg-amber-500/15 border border-amber-500/30 rounded-full px-2 py-0.5"
            >
              {ROLE_LABELS[credit.role] ?? credit.role}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

export default function FillPlayersPage() {
  const { id } = useParams();
  const gameId = Number(id);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('queue');
  const [editing, setEditing] = useState(null);
  const loadedRef = useRef(false);

  const reload = useCallback(async () => {
    try {
      const fresh = await fetchGameData(gameId);
      loadedRef.current = true;
      setData(fresh);
      setError('');
    } catch (err) {
      console.error(err);
      if (!loadedRef.current) setError(err.message ?? 'Failed to load game');
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    loadedRef.current = false;
    setLoading(true);
    reload();
  }, [reload]);

  const connected = useLivePlays(gameId, reload);

  const handleEditCredit = useCallback(async (entry, changes) => {
    for (const change of changes) {
      await updatePlayCredit({
        playId: entry.playId,
        role: change.role,
        fromPlayerId: change.fromPlayerId,
        toPlayerId: change.toPlayerId,
      });
    }
    await reload();
  }, [reload]);

  if (loading && !data) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-slate-900 text-slate-400 text-sm">
        Loading game…
      </div>
    );
  }

  if ((error && !data) || !data) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-slate-900 text-red-400 text-sm px-6 text-center">
        {error || 'Game not found'}
      </div>
    );
  }

  const { homeName, awayName, log, finalHome, finalAway, homeRoster, awayRoster } = data;
  const queue = [...log].reverse().filter(playNeedsPlayers);
  const newest = log[log.length - 1];

  return (
    <div className="flex h-[100dvh] flex-col bg-slate-900 text-white">
      <header className="shrink-0 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 border-b border-slate-800">
        <div className="flex items-center justify-between gap-3 mb-3">
          <Link
            to={`/games/${gameId}`}
            className="min-h-11 inline-flex items-center text-sm font-semibold text-slate-300"
          >
            ← Back
          </Link>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-300">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-amber-300'}`} />
            {connected ? 'Live' : 'Connecting'}
          </span>
        </div>

        <div className="md:flex md:items-end md:justify-between md:gap-8">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 md:max-w-sm md:flex-1">
          <p className="text-sm font-bold truncate" style={{ color: TEAM_COLORS.home.muted }}>{homeName}</p>
          <p className="text-3xl font-black tabular-nums leading-none text-right">{finalHome}</p>
          <p className="text-sm font-bold truncate" style={{ color: TEAM_COLORS.away.muted }}>{awayName}</p>
          <p className="text-3xl font-black tabular-nums leading-none text-right">{finalAway}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4 md:mt-0 md:w-80 md:shrink-0">
          <button
            type="button"
            onClick={() => setView('queue')}
            className={`min-h-11 rounded-xl text-sm font-bold transition-colors ${
              view === 'queue' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'
            }`}
          >
            To fill{queue.length ? ` · ${queue.length}` : ''}
          </button>
          <button
            type="button"
            onClick={() => setView('all')}
            className={`min-h-11 rounded-xl text-sm font-bold transition-colors ${
              view === 'all' ? 'bg-slate-200 text-slate-950' : 'bg-slate-800 text-slate-300'
            }`}
          >
            All plays
          </button>
        </div>
        </div>
      </header>

      {view === 'queue' ? (
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {queue.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6 gap-2">
              <p className="text-base font-semibold text-white">
                {log.length ? 'You’re caught up' : 'Waiting for the first play'}
              </p>
              <p className="text-sm text-slate-400 max-w-xs">
                {log.length
                  ? 'New plays show up here as soon as they’re logged. Leave this screen open.'
                  : 'Leave this screen open. Plays will appear on their own.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {queue.map((entry) => (
                <PlayCard
                  key={entry.id}
                  entry={entry}
                  homeName={homeName}
                  awayName={awayName}
                  onFill={setEditing}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-0 bg-slate-800">
          <PlayByPlay
            log={log}
            homeName={homeName}
            awayName={awayName}
            latestDriveId={newest?.driveId ?? null}
            homePlayers={homeRoster}
            awayPlayers={awayRoster}
            onEditCredit={handleEditCredit}
            emphasizeIncomplete
            columns={2}
            showHeader={false}
            emptyDetail="Plays show up here as they are logged. Leave this screen open."
          />
        </div>
      )}

      {editing && (
        <EditPlayCredit
          key={editing.id}
          entry={editing}
          homePlayers={homeRoster}
          awayPlayers={awayRoster}
          onClose={() => setEditing(null)}
          onSave={(changes) => handleEditCredit(editing, changes)}
          focusMissing
        />
      )}
    </div>
  );
}
