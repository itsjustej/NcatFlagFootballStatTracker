import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { creditsFromParticipants, stripDefenderFromDescription, swapCreditName } from './playCredit';

function sameCredits(left, right) {
  const a = left || [];
  const b = right || [];
  if (a.length !== b.length) return false;
  return a.every((credit) =>
    b.some((other) => other.role === credit.role && Number(other.playerId) === Number(credit.playerId)),
  );
}

function creditsFromRows(rows) {
  return creditsFromParticipants(
    (rows || []).map((row) => ({
      role: row.role,
      player_id: row.player_id,
      player_name: row.player?.name ?? '',
    })),
  );
}

/** Apply a fresher set of credits onto a live log entry, including its sentence. */
export function mergeRemoteCredits(entry, rows) {
  const next = creditsFromRows(rows);
  if (sameCredits(entry.credits, next)) return entry;

  let description = entry.description;
  for (const prev of entry.credits || []) {
    const still = next.find((credit) => credit.role === prev.role);
    if (!still) {
      if (prev.role === 'defender') {
        description = stripDefenderFromDescription(description, prev.playerName);
      }
      continue;
    }
    if (Number(still.playerId) === Number(prev.playerId)) continue;
    description = swapCreditName(description, still.role, prev.playerName, still.playerName);
  }
  return { ...entry, description, credits: next };
}

async function fetchParticipantRows(playIds) {
  const { data, error } = await supabase
    .from('Participants')
    .select('play_id, role, player_id, player:Player(name)')
    .in('play_id', playIds);
  if (error) throw error;
  return data || [];
}

function groupByPlay(rows) {
  const byPlay = {};
  for (const row of rows) {
    const id = Number(row.play_id);
    if (!byPlay[id]) byPlay[id] = [];
    byPlay[id].push(row);
  }
  return byPlay;
}

function applyRows(setGs, playIds, rows) {
  const wanted = new Set(playIds.map(Number));
  const byPlay = groupByPlay(rows);
  setGs((current) => {
    if (!current?.log) return current;
    let changed = false;
    const log = current.log.map((entry) => {
      const playId = Number(entry.playId);
      if (!wanted.has(playId)) return entry;
      const next = mergeRemoteCredits(entry, byPlay[playId] || []);
      if (next !== entry) changed = true;
      return next;
    });
    return changed ? { ...current, log } : current;
  });
}

/**
 * Keep the tracker's play-by-play names in step with credit edits made on
 * another device. Does not move the ball, the down, or the score.
 */
export function useRemoteCreditSync(gameId, log, setGs) {
  const setGsRef = useRef(setGs);
  setGsRef.current = setGs;
  const playIdsRef = useRef(new Set());
  playIdsRef.current = new Set((log || []).map((entry) => Number(entry.playId)).filter((id) => id));
  const knownIds = useRef(new Set());
  const pendingIds = useRef(new Set());
  const seededFor = useRef(null);

  useEffect(() => {
    if (!gameId) {
      seededFor.current = null;
      return undefined;
    }
    if (seededFor.current !== gameId) {
      seededFor.current = gameId;
      knownIds.current = new Set(playIdsRef.current);
      pendingIds.current = new Set();
      return undefined;
    }
    const fresh = [...playIdsRef.current].filter(
      (id) => !knownIds.current.has(id) && !pendingIds.current.has(id),
    );
    if (!fresh.length) return undefined;

    fresh.forEach((id) => pendingIds.current.add(id));
    let cancelled = false;
    fetchParticipantRows(fresh)
      .then((rows) => {
        if (cancelled) return;
        fresh.forEach((id) => {
          pendingIds.current.delete(id);
          knownIds.current.add(id);
        });
        applyRows(setGsRef.current, fresh, rows);
      })
      .catch(() => {
        fresh.forEach((id) => pendingIds.current.delete(id));
      });

    return () => {
      cancelled = true;
      fresh.forEach((id) => pendingIds.current.delete(id));
    };
  }, [gameId, log]);

  useEffect(() => {
    if (!gameId) return undefined;

    let timer = null;
    const pending = new Set();
    let cancelled = false;

    async function flush() {
      const ids = [...pending].filter((id) => playIdsRef.current.has(id));
      pending.clear();
      if (!ids.length || cancelled) return;
      try {
        const rows = await fetchParticipantRows(ids);
        if (cancelled) return;
        applyRows(setGsRef.current, ids, rows);
      } catch {
        /* the next credit change tries again */
      }
    }

    function schedule(payload) {
      const playId = Number(payload.new?.play_id ?? payload.old?.play_id);
      if (!playId || !playIdsRef.current.has(playId)) return;
      pending.add(playId);
      window.clearTimeout(timer);
      timer = window.setTimeout(flush, 200);
    }

    const channel = supabase
      .channel(`tracker-credits-${gameId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Participants' }, schedule)
      .subscribe();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [gameId]);
}

/**
 * Tell the fill screen about one play as soon as it is saved.
 * A new play is delivered immediately. Credit edits for a play already on
 * screen are grouped for a few milliseconds so one play is fetched once.
 */
export function useLivePlays(gameId, onChange) {
  const [connected, setConnected] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!gameId) return undefined;

    const waiting = new Map();

    function deliver(event) {
      onChangeRef.current(event);
    }

    function soon(playId) {
      if (waiting.has(playId)) return;
      waiting.set(playId, window.setTimeout(() => {
        waiting.delete(playId);
        deliver({ kind: 'play', playId });
      }, 40));
    }

    function onPlay(payload) {
      const playId = Number(payload.new?.play_id ?? payload.old?.play_id);
      if (!playId) {
        deliver({ kind: 'reload' });
        return;
      }
      if (payload.eventType === 'DELETE') {
        window.clearTimeout(waiting.get(playId));
        waiting.delete(playId);
        deliver({ kind: 'delete', playId });
        return;
      }
      window.clearTimeout(waiting.get(playId));
      waiting.delete(playId);
      deliver({ kind: 'play', playId });
    }

    function onCredit(payload) {
      const playId = Number(payload.new?.play_id ?? payload.old?.play_id);
      if (!playId) return;
      soon(playId);
    }

    const channel = supabase
      .channel(`fill-players-${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Play', filter: `game_id=eq.${Number(gameId)}` },
        onPlay,
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Participants' }, onCredit)
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    return () => {
      waiting.forEach((timer) => window.clearTimeout(timer));
      waiting.clear();
      setConnected(false);
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return connected;
}
