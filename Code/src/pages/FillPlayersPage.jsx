import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PlayByPlay from '../components/game/PlayByPlay';
import EditPlayCredit from '../components/game/EditPlayCredit';
import { fetchGameData, fetchPlayBundle, mergeLivePlay, removeLivePlay } from './GameViewPage';
import { updatePlayCredit, removePlayCredit, playNeedsPlayers, ROLE_LABELS, swapCreditName, stripDefenderFromDescription } from '../utils/playCredit';
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
  const [recentIds, setRecentIds] = useState([]);
  const loadedRef = useRef(false);
  const dataRef = useRef(null);
  const inflightRef = useRef(new Map());

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

  const pullPlay = useCallback((playId) => {
    const previous = inflightRef.current.get(playId) || Promise.resolve();
    const job = previous
      .catch(() => {})
      .then(() => fetchPlayBundle(playId))
      .then((row) => {
        setData((current) => {
          if (!current) return current;
          const next = mergeLivePlay(current, row);
          if (!next) {
            queueMicrotask(() => reload());
            return current;
          }
          return next;
        });
      })
      .catch(() => reload());
    inflightRef.current.set(playId, job);
    job.finally(() => {
      if (inflightRef.current.get(playId) === job) inflightRef.current.delete(playId);
    });
  }, [reload]);

  const onLive = useCallback((event) => {
    if (!event || event.kind === 'reload' || !event.playId) {
      reload();
      return;
    }
    if (event.kind === 'delete') {
      setData((current) => {
        if (!current) return current;
        const next = removeLivePlay(current, event.playId);
        if (!next) {
          queueMicrotask(() => reload());
          return current;
        }
        return next;
      });
      return;
    }
    pullPlay(event.playId);
  }, [pullPlay, reload]);

  const connected = useLivePlays(gameId, onLive);
  dataRef.current = data;

  const remember = useCallback((playerId) => {
    const key = String(playerId);
    setRecentIds((prev) => [key, ...prev.filter((id) => id !== key)].slice(0, 8));
  }, []);

  const handleFinished = useCallback((entry) => {
    const log = dataRef.current?.log || [];
    const next = [...log].reverse().filter(playNeedsPlayers).find((item) => item.playId !== entry.playId);
    setEditing(next ?? null);
  }, []);

  const handleEditCredit = useCallback(async (entry, changes) => {
    await Promise.all(changes.map((change) => (
      change.remove
        ? removePlayCredit({
            playId: entry.playId,
            role: change.role,
            playerId: change.fromPlayerId,
          })
        : updatePlayCredit({
            playId: entry.playId,
            role: change.role,
            fromPlayerId: change.fromPlayerId,
            toPlayerId: change.toPlayerId,
          })
    )));

    setData((current) => {
      if (!current) return current;
      let description = entry.description;
      let credits = (entry.credits || []).map((credit) => ({ ...credit }));
      for (const change of changes) {
        if (change.remove) {
          description = stripDefenderFromDescription(description, change.fromName);
          credits = credits.filter((credit) => credit.role !== change.role);
          continue;
        }
        description = swapCreditName(description, change.role, change.fromName, change.toPlayer.name);
        credits = credits.map((credit) => (
          credit.role === change.role
            ? { ...credit, playerId: change.toPlayerId, playerName: change.toPlayer.name }
            : credit
        ));
      }
      return {
        ...current,
        log: current.log.map((item) => (
          item.playId === entry.playId ? { ...item, description, credits } : item
        )),
      };
    });
  }, []);

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
    <div className="flex h-[100dvh] max-w-[100vw] flex-col overflow-hidden bg-slate-900 text-white">
      <header className="shrink-0 flex items-center gap-2 px-3 min-h-14 py-2 border-b border-slate-800 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Link
          to={`/games/${gameId}`}
          className="min-h-11 inline-flex items-center text-sm font-bold text-slate-300"
        >
          ←
        </Link>
        <div className="flex-1 min-w-0 text-center">
          <p className="text-sm font-black truncate">
            <span style={{ color: TEAM_COLORS.home.muted }}>{homeName}</span>
            {' '}{finalHome}–{finalAway}{' '}
            <span style={{ color: TEAM_COLORS.away.muted }}>{awayName}</span>
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${connected ? 'bg-emerald-400' : 'bg-amber-300'}`} />
            {connected ? 'Live' : 'Connecting'}
            {view === 'queue' && queue.length ? ` · ${queue.length} to fill` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setView(view === 'queue' ? 'all' : 'queue')}
          className="min-h-11 text-xs font-bold text-slate-200"
        >
          {view === 'queue' ? 'All plays' : 'To fill'}
        </button>
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
          onFinished={handleFinished}
          onRemember={remember}
          recentIds={recentIds}
          focusMissing
        />
      )}
    </div>
  );
}
