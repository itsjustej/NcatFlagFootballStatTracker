import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeague } from '../context/LeagueContext';
import { savePlay } from '../context/useSavePlay';
import { resumeGame } from '../context/useResumeGame';
import {
  firstDownYard,
  crossedFirstDown,
  isTouchdown,
  isSafety,
  kickoffYard,
  yardsGained,
  attacksIncreasing,
  secondHalfPossession,
  distanceToFirst,
} from '../gameLogic';
import HalftimeConfirmDialog from '../components/game/HalftimeConfirmDialog';
import PlayStepBar, { getPlayStepIndex } from '../components/game/PlayStepBar';
import UndoToast from '../components/game/UndoToast';
import MobilePlayBar from '../components/game/MobilePlayBar';
import FieldSpot    from '../components/game/FieldSpot';
import PreSnap      from '../components/game/PreSnap';
import PlayControls from '../components/game/PlayControls';
import Scoreboard   from '../components/game/Scoreboard';
import PlayByPlay   from '../components/game/PlayByPlay';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _playId = 0;
function makeId() { return `p${++_playId}`; }

function addPlay(log, entry) {
  return [...log, { ...entry, id: makeId(), playNumber: log.length + 1 }];
}

function afterPossessionFlip(s, newYard, newPossession) {
  const fdTarget = firstDownYard(newYard, newPossession, s.homeAttacksRight);
  const distance = attacksIncreasing(newPossession, s.homeAttacksRight)
    ? fdTarget - newYard
    : newYard - fdTarget;
  return {
    possession: newPossession, yardLine: newYard, down: 1, distance, fdTarget,
    newSpot: null, playType: null,
    selectedOffender: null, selectedDefender: null, selectedReceiver: null,
    playPhase: 'idle', driveId: s.driveId + 1,
  };
}

/** Enter post-TD conversion — clear play loop selections so QB isn't locked in. */
function enterConversionPhase(s, updates) {
  return {
    ...s,
    ...updates,
    newSpot: null,
    playType: null,
    selectedOffender: null,
    selectedDefender: null,
    selectedReceiver: null,
    playPhase: 'conversion',
  };
}

function afterNormalPlay(s, newYard, firstDownCrossed, newDown) {
  if (firstDownCrossed) {
    const fdTarget = firstDownYard(newYard, s.possession, s.homeAttacksRight);
    const distance = attacksIncreasing(s.possession, s.homeAttacksRight)
      ? fdTarget - newYard
      : newYard - fdTarget;
    return { yardLine: newYard, down: 1, distance, fdTarget, newSpot: null, playType: null, selectedOffender: null, selectedDefender: null, selectedReceiver: null, playPhase: 'idle' };
  }
  if (newDown > 4) {
    const newPoss = s.possession === 'home' ? 'away' : 'home';
    return afterPossessionFlip(s, newYard, newPoss);
  }
  const fdTarget = s.fdTarget ?? firstDownYard(s.yardLine, s.possession, s.homeAttacksRight);
  const distance = attacksIncreasing(s.possession, s.homeAttacksRight)
    ? fdTarget - newYard
    : newYard - fdTarget;
  return { yardLine: newYard, down: newDown, distance, fdTarget, newSpot: null, playType: null, selectedOffender: null, selectedDefender: null, selectedReceiver: null, playPhase: 'idle' };
}

function baseEntry(s) {
  return {
    half: s.half, down: s.down, distance: s.distance,
    yardLine: s.yardLine, clock: s.clock,
    driveId: s.driveId, drivePossession: s.possession,
  };
}

function parseClock(clock) {
  const [m, sec] = clock.split(':').map(Number);
  return (m || 0) * 60 + (sec || 0);
}

function formatClock(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── GamePage ─────────────────────────────────────────────────────────────────

export default function GamePage() {
  const navigate = useNavigate();

  const {
    currentGameId, game, homePlayers, awayPlayers,
    initialGameState, gameLoading, gameError, exitingRef,
    updateJersey,
  } = useLeague();

  const [gs, setGs]                     = useState(null);
  const [history, setHistory]           = useState([]);
  const [convPts, setConvPts]           = useState(null);
  const [convStep, setConvStep]         = useState('outcome'); // outcome | points | passer | receiver
  const [convOutcome, setConvOutcome]   = useState(null);     // 'good' | 'nogood'
  const [convPasser, setConvPasser]     = useState(null);
  const [clockRunning, setClockRunning] = useState(false);
  const [halftimeConfirm, setHalftimeConfirm] = useState(false);
  const [undoToast, setUndoToast]             = useState(null);
  const [scoreFlash, setScoreFlash]           = useState(null);
  const [latestDriveId, setLatestDriveId]       = useState(null);
  const [pulseStep, setPulseStep]             = useState(null);
  const intervalRef                           = useRef(null);
  const toastTimerRef                         = useRef(null);
  const prevStepRef                           = useRef(0);

  useEffect(() => {
    if (!initialGameState || gs) return;
    resumeGame(
      initialGameState.gameId,
      initialGameState.homeTeamId,
      initialGameState.awayTeamId,
      initialGameState.homeAttacksRight,
    )
      .then(resumed => setGs(resumed ?? initialGameState))
      .catch(() => setGs(initialGameState));
  }, [initialGameState]);

  useEffect(() => {
    if (!gameLoading && !currentGameId && !exitingRef.current) navigate('/start-game');
  }, [currentGameId, gameLoading, navigate, exitingRef]);

  const homeName = game?.homeName ?? '';
  const awayName = game?.awayName ?? '';

  const resetConvState = useCallback(() => {
    setConvStep('outcome');
    setConvPts(null);
    setConvOutcome(null);
    setConvPasser(null);
  }, []);

  // ── setGsWithHistory ───────────────────────────────────────────────────────
  // Reads _playType, _outcome, _passer, _receiver, _rusher, _defender from
  // the log entry — all captured before state clearing in each handler.

  const setGsWithHistory = useCallback((updater) => {
    setGs((prev) => {
      const next = updater(prev);
      if (next.playPhase === 'conversion' && prev.playPhase !== 'conversion') {
        setConvStep('outcome');
        setConvPts(null);
        setConvOutcome(null);
        setConvPasser(null);
      }
      if (next.log.length > prev.log.length) {
        const newEntry   = next.log[next.log.length - 1];
        const historyEntry = { state: prev, playId: null };
        setHistory(h => [...h, historyEntry]);

        if (newEntry.homeScore > prev.homeScore) setScoreFlash('home');
        else if (newEntry.awayScore > prev.awayScore) setScoreFlash('away');
        else setScoreFlash(null);
        setTimeout(() => setScoreFlash(null), 700);

        setUndoToast(newEntry.description ?? 'Play logged');
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setUndoToast(null), 4500);

        setLatestDriveId(newEntry.driveId ?? prev.driveId);

        savePlay(prev, newEntry, {
          passer:        newEntry._passer   ?? null,
          receiver:      newEntry._receiver ?? null,
          defender:      newEntry._defender ?? null,
          rusher:        newEntry._rusher   ?? null,
          penaltyTeamId: prev.penaltyTeam === 'home'
            ? String(prev.homeTeamId)
            : prev.penaltyTeam === 'away'
              ? String(prev.awayTeamId)
              : null,
        }).then(play => {
          if (play?.play_id) {
            setHistory(h => {
              const updated = [...h];
              updated[updated.length - 1] = { ...updated[updated.length - 1], playId: play.play_id };
              return updated;
            });
          }
        });
      }
      return next;
    });
  }, []);

  const handleUndo = useCallback(() => {
    setUndoToast(null);
    resetConvState();
    setHistory((h) => {
      if (h.length === 0) return h;
      const last = h[h.length - 1];
      setGs(last.state ?? last);
      if (last.playId) {
        import('../supabaseClient').then(({ supabase }) => {
          supabase.from('Participants').delete().eq('play_id', last.playId)
            .then(() => supabase.from('Play').delete().eq('play_id', last.playId));
        });
      }
      return h.slice(0, -1);
    });
    setClockRunning(false);
  }, [resetConvState]);

  // ── Clock ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (clockRunning) {
      intervalRef.current = setInterval(() => {
        setGs((s) => {
          const secs = parseClock(s.clock);
          if (secs <= 0) { setClockRunning(false); return { ...s, clock: '0:00' }; }
          return { ...s, clock: formatClock(secs - 1) };
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [clockRunning]);

  const handleClockToggle = useCallback(() => setClockRunning(r => !r), []);
  const handleClockSet    = useCallback((clock) => setGs(s => ({ ...s, clock })), []);

  const handleHalfChange = useCallback((half) => {
    setGs((s) => {
      const openingHar = s.openingHomeAttacksRight ?? s.homeAttacksRight;

      if (half === 2 && s.half === 1) {
        const secondHalfPoss = secondHalfPossession(s.openingPossession ?? initialGameState?.openingPossession ?? 'home');
        const flippedDirection = !openingHar;
        const yardLine = kickoffYard(secondHalfPoss, flippedDirection);
        return {
          ...s,
          half: 2,
          clock: '20:00',
          openingHomeAttacksRight: openingHar,
          homeAttacksRight: flippedDirection,
          possession: secondHalfPoss,
          yardLine,
          distance: attacksIncreasing(secondHalfPoss, flippedDirection)
            ? firstDownYard(yardLine, secondHalfPoss, flippedDirection) - yardLine
            : yardLine - firstDownYard(yardLine, secondHalfPoss, flippedDirection),
          down: 1,
          fdTarget: firstDownYard(yardLine, secondHalfPoss, flippedDirection),
          newSpot: null,
          playType: null,
          selectedOffender: null,
          selectedDefender: null,
          selectedReceiver: null,
          playPhase: 'idle',
          driveId: s.driveId + 1,
        };
      }

      if (half === 1 && s.half === 2) {
        const openingPoss = s.openingPossession ?? initialGameState?.openingPossession ?? 'home';
        const yardLine = kickoffYard(openingPoss, openingHar);
        return {
          ...s,
          half: 1,
          clock: '20:00',
          homeAttacksRight: openingHar,
          possession: openingPoss,
          yardLine,
          distance: distanceToFirst(yardLine, openingPoss, openingHar),
          down: 1,
          fdTarget: firstDownYard(yardLine, openingPoss, openingHar),
          newSpot: null,
          playType: null,
          selectedOffender: null,
          selectedDefender: null,
          selectedReceiver: null,
          playPhase: 'idle',
        };
      }

      return { ...s, half, clock: '20:00' };
    });
    setClockRunning(false);
  }, [initialGameState]);

  const handleHalfChangeRequest = useCallback((half) => {
    if (half === 2 && gs?.half === 1) {
      setHalftimeConfirm(true);
      return;
    }
    handleHalfChange(half);
  }, [gs?.half, handleHalfChange]);

  useEffect(() => {
    if (!gs) return;
    const step = getPlayStepIndex(gs, convStep);
    if (step !== prevStepRef.current) {
      prevStepRef.current = step;
      setPulseStep(step);
      const t = setTimeout(() => setPulseStep(null), 2200);
      return () => clearTimeout(t);
    }
  }, [gs?.selectedOffender, gs?.newSpot, gs?.playPhase, gs?.playType, gs?.selectedDefender, convStep]);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  const activeStep = gs ? getPlayStepIndex(gs, convStep) : 0;

  const offensePlayers = gs?.possession === 'home' ? homePlayers : awayPlayers;
  const defensePlayers = gs?.possession === 'home' ? awayPlayers : homePlayers;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSpot = useCallback((yard) => {
    setGs(s => (s.playPhase === 'conversion' ? s : { ...s, newSpot: yard }));
  }, []);

  const handleSelectOffender = useCallback((p) => {
    setGs(s => {
      if (s.playPhase === 'conversion') return s;
      return {
        ...s,
        selectedOffender: s.selectedOffender?.id === p.id ? null : p,
        playPhase:        s.selectedOffender?.id === p.id ? 'idle' : 'play-type',
        playType: null, selectedReceiver: null,
      };
    });
  }, []);

  const handleSelectDefender = useCallback((p) => {
    setGs(s => ({ ...s, selectedDefender: s.selectedDefender?.id === p.id ? null : p }));
  }, []);

  const handlePlayType = useCallback((t) => {
    setGsWithHistory((s) => {
      const spot      = s.newSpot ?? s.yardLine;
      const offFirst  = s.selectedOffender?.name?.split(' ')[0] ?? 'Runner';
      const defFirst  = s.selectedDefender?.name?.split(' ')[0];
      const tackleStr = defFirst ? ` (tackled by ${defFirst})` : '';
      const _rusher   = t === 'rush' ? (s.selectedOffender ?? null) : null;
      const _defender = s.selectedDefender ?? null;

      if (t === 'rush') {
        if (isSafety(spot, s.possession, s.homeAttacksRight)) {
          const newPoss     = s.possession === 'home' ? 'away' : 'home';
          const newHome     = s.possession === 'away' ? s.homeScore + 2 : s.homeScore;
          const newAway     = s.possession === 'home' ? s.awayScore + 2 : s.awayScore;
          const newYard     = kickoffYard(newPoss, s.homeAttacksRight);
          const yds         = yardsGained(s.yardLine, spot, s.possession, s.homeAttacksRight);
          const entry = { ...baseEntry(s), description: `${offFirst} rushed for a safety`, yardsGained: yds, homeScore: newHome, awayScore: newAway, driveResult: 'Safety', _playType: 'rush', _outcome: 'safety', _rusher, _defender };
          return { ...s, homeScore: newHome, awayScore: newAway, ...afterPossessionFlip(s, newYard, newPoss), log: addPlay(s.log, entry) };
        }
        if (isTouchdown(spot, s.possession, s.homeAttacksRight)) {
          const newHome     = s.possession === 'home' ? s.homeScore + 6 : s.homeScore;
          const newAway     = s.possession === 'away' ? s.awayScore + 6 : s.awayScore;
          const yds         = yardsGained(s.yardLine, spot, s.possession, s.homeAttacksRight);
          const entry = { ...baseEntry(s), description: `${offFirst} rushed for a touchdown`, yardsGained: yds, homeScore: newHome, awayScore: newAway, driveResult: 'Touchdown', _playType: 'rush', _outcome: 'td', _rusher, _defender };
          return enterConversionPhase(s, {
            homeScore: newHome,
            awayScore: newAway,
            yardLine: spot,
            log: addPlay(s.log, entry),
          });
        }
        const yds         = yardsGained(s.yardLine, spot, s.possession, s.homeAttacksRight);
        const fd          = crossedFirstDown(s.yardLine, spot, s.possession, s.homeAttacksRight);
        const newDown     = fd ? 1 : s.down + 1;
        const driveResult = newDown > 4 ? 'Turnover on Downs' : undefined;
        const _outcome    = newDown > 4 ? 'turnover_on_downs' : 'complete';
        const entry = { ...baseEntry(s), description: `${offFirst} rushed for ${yds} yard${yds !== 1 ? 's' : ''}${fd ? ' for a first down' : ''}${tackleStr}`, yardsGained: yds, homeScore: s.homeScore, awayScore: s.awayScore, driveResult, _playType: 'rush', _outcome, _rusher, _defender };
        return { ...s, ...afterNormalPlay(s, spot, fd, newDown), log: addPlay(s.log, entry) };
      }

      if (t === 'pass') return { ...s, playType: t, playPhase: 'pass-receiver' };

      if (t === 'penalty') {
        const ballMovedForward = yardsGained(s.yardLine, spot, s.possession, s.homeAttacksRight) > 0;
        const penaltyTeam = ballMovedForward ? (s.possession === 'home' ? 'away' : 'home') : s.possession;
        return { ...s, playType: t, penaltyTeam, playPhase: 'advance-down' };
      }

      if (t === 'punt') {
        const spot          = s.newSpot ?? s.yardLine;
        const receivingPoss = s.possession === 'home' ? 'away' : 'home';
        const receivingName = receivingPoss === 'home' ? homeName : awayName;
        const puntingName   = s.possession === 'home' ? homeName : awayName;

        if (isTouchdown(spot, receivingPoss, s.homeAttacksRight)) {
          const newHome = receivingPoss === 'home' ? s.homeScore + 6 : s.homeScore;
          const newAway = receivingPoss === 'away' ? s.awayScore + 6 : s.awayScore;
          const entry   = {
            ...baseEntry(s),
            description: `${receivingName} returns punt for a touchdown`,
            yardsGained: 0,
            homeScore: newHome,
            awayScore: newAway,
            driveResult: 'Punt Return TD',
            _playType: 'punt',
            _outcome: 'punt_return_td',
          };
          return enterConversionPhase(s, {
            possession: receivingPoss,
            homeScore: newHome,
            awayScore: newAway,
            yardLine: spot,
            log: addPlay(s.log, entry),
          });
        }

        const entry = {
          ...baseEntry(s),
          description: `${puntingName} punts`,
          yardsGained: 0,
          homeScore: s.homeScore,
          awayScore: s.awayScore,
          driveResult: 'Punt',
          _playType: 'punt',
          _outcome: 'punt',
        };
        return { ...s, ...afterPossessionFlip(s, spot, receivingPoss), log: addPlay(s.log, entry) };
      }

      return s;
    });
  }, [homeName, awayName]);

  const handlePassReceiver = useCallback((p) => {
    setGs(s => ({ ...s, selectedReceiver: p, playPhase: 'pass-result' }));
  }, []);

  // ── Pass helpers ───────────────────────────────────────────────────────────

  function buildPassEntry(s, spot, offFirst, recFirst, yds, tackleStr, _passer, _receiver, _defender) {
    if (isSafety(spot, s.possession, s.homeAttacksRight)) {
      const newPoss = s.possession === 'home' ? 'away' : 'home';
      const newHome = s.possession === 'away' ? s.homeScore + 2 : s.homeScore;
      const newAway = s.possession === 'home' ? s.awayScore + 2 : s.awayScore;
      const newYard = kickoffYard(newPoss, s.homeAttacksRight);
      const entry = { ...baseEntry(s), description: `${offFirst} passes to ${recFirst} for a safety`, yardsGained: yds, homeScore: newHome, awayScore: newAway, driveResult: 'Safety', _playType: 'pass', _outcome: 'safety', _passer, _receiver, _defender };
      return { type: 'safety', entry, newHome, newAway, newPoss, newYard };
    }
    if (isTouchdown(spot, s.possession, s.homeAttacksRight)) {
      const newHome = s.possession === 'home' ? s.homeScore + 6 : s.homeScore;
      const newAway = s.possession === 'away' ? s.awayScore + 6 : s.awayScore;
      const entry = { ...baseEntry(s), description: `${offFirst} passes to ${recFirst} for a touchdown`, yardsGained: yds, homeScore: newHome, awayScore: newAway, driveResult: 'Touchdown', _playType: 'pass', _outcome: 'td', _passer, _receiver, _defender };
      return { type: 'td', entry, newHome, newAway };
    }
    const fd          = crossedFirstDown(s.yardLine, spot, s.possession, s.homeAttacksRight);
    const newDown     = fd ? 1 : s.down + 1;
    const driveResult = newDown > 4 ? 'Turnover on Downs' : undefined;
    const _outcome    = newDown > 4 ? 'turnover_on_downs' : 'complete';
    const entry = { ...baseEntry(s), description: `${offFirst} passes to ${recFirst} for ${yds} yard${yds !== 1 ? 's' : ''}${fd ? ' for a first down' : ''}${tackleStr}`, yardsGained: yds, homeScore: s.homeScore, awayScore: s.awayScore, driveResult, _playType: 'pass', _outcome, _passer, _receiver, _defender };
    return { type: 'normal', entry, fd, newDown };
  }

  const handlePassComplete = useCallback(() => {
    setGsWithHistory((s) => {
      const spot        = s.newSpot ?? s.yardLine;
      const offFirst    = s.selectedOffender?.name?.split(' ')[0] ?? 'QB';
      const recFirst    = s.selectedReceiver?.name?.split(' ')[0] ?? 'Receiver';
      const defFirst    = s.selectedDefender?.name?.split(' ')[0];
      const yds         = yardsGained(s.yardLine, spot, s.possession, s.homeAttacksRight);
      const tackleStr   = defFirst ? ` (tackled by ${defFirst})` : '';
      const _passer     = s.selectedOffender ?? null;
      const _receiver   = s.selectedReceiver ?? null;
      const _defender   = s.selectedDefender ?? null;
      const result      = buildPassEntry(s, spot, offFirst, recFirst, yds, tackleStr, _passer, _receiver, _defender);

      if (result.type === 'safety') {
        return { ...s, homeScore: result.newHome, awayScore: result.newAway, ...afterPossessionFlip(s, result.newYard, result.newPoss), log: addPlay(s.log, result.entry) };
      }
      if (result.type === 'td') {
        return enterConversionPhase(s, {
          homeScore: result.newHome,
          awayScore: result.newAway,
          yardLine: spot,
          log: addPlay(s.log, result.entry),
        });
      }
      return { ...s, ...afterNormalPlay(s, spot, result.fd, result.newDown), log: addPlay(s.log, result.entry) };
    });
  }, []);

  const handlePassReceiverComplete = useCallback((p) => {
    setGsWithHistory((s) => {
      const spot        = s.newSpot ?? s.yardLine;
      const offFirst    = s.selectedOffender?.name?.split(' ')[0] ?? 'QB';
      const recFirst    = p.name.split(' ')[0];
      const defFirst    = s.selectedDefender?.name?.split(' ')[0];
      const yds         = yardsGained(s.yardLine, spot, s.possession, s.homeAttacksRight);
      const tackleStr   = defFirst ? ` (tackled by ${defFirst})` : '';
      const _passer     = s.selectedOffender ?? null;
      const _receiver   = p;
      const _defender   = s.selectedDefender ?? null;
      const result      = buildPassEntry(s, spot, offFirst, recFirst, yds, tackleStr, _passer, _receiver, _defender);

      if (result.type === 'safety') {
        return { ...s, homeScore: result.newHome, awayScore: result.newAway, ...afterPossessionFlip(s, result.newYard, result.newPoss), log: addPlay(s.log, result.entry) };
      }
      if (result.type === 'td') {
        return enterConversionPhase(s, {
          homeScore: result.newHome,
          awayScore: result.newAway,
          yardLine: spot,
          log: addPlay(s.log, result.entry),
        });
      }
      return { ...s, selectedReceiver: p, ...afterNormalPlay(s, spot, result.fd, result.newDown), log: addPlay(s.log, result.entry) };
    });
  }, []);

  const handlePassIncomplete = useCallback(() => {
    setGsWithHistory((s) => {
      const offFirst  = s.selectedOffender?.name?.split(' ')[0] ?? 'QB';
      const _passer   = s.selectedOffender ?? null;
      const _defender = s.selectedDefender ?? null;
      const newDown   = s.down + 1;
      const driveResult = newDown > 4 ? 'Turnover on Downs' : undefined;
      const _outcome    = newDown > 4 ? 'turnover_on_downs' : 'incomplete';
      const entry = { ...baseEntry(s), description: `${offFirst} throws incompletion`, yardsGained: 0, homeScore: s.homeScore, awayScore: s.awayScore, driveResult, _playType: 'pass', _outcome, _passer, _defender };
      if (newDown > 4) {
        const newPoss = s.possession === 'home' ? 'away' : 'home';
        return { ...s, ...afterPossessionFlip(s, s.yardLine, newPoss), log: addPlay(s.log, entry) };
      }
      const fd       = s.fdTarget ?? firstDownYard(s.yardLine, s.possession, s.homeAttacksRight);
      const distance = attacksIncreasing(s.possession, s.homeAttacksRight)
        ? fd - s.yardLine
        : s.yardLine - fd;
      return { ...s, down: newDown, distance, newSpot: null, playType: null, selectedOffender: null, selectedDefender: null, selectedReceiver: null, playPhase: 'idle', log: addPlay(s.log, entry) };
    });
  }, []);

  const handlePassInterception = useCallback(() => {
    setGsWithHistory((s) => {
      const spot      = s.newSpot ?? s.yardLine;
      const newPoss   = s.possession === 'home' ? 'away' : 'home';
      const offFirst  = s.selectedOffender?.name?.split(' ')[0] ?? 'QB';
      const defFirst  = s.selectedDefender?.name?.split(' ')[0] ?? 'Defender';
      const _passer   = s.selectedOffender ?? null;
      const _defender = s.selectedDefender ?? null;
      const isPick6   = isTouchdown(spot, newPoss, s.homeAttacksRight);

      if (isPick6) {
        const newHome = newPoss === 'home' ? s.homeScore + 6 : s.homeScore;
        const newAway = newPoss === 'away' ? s.awayScore + 6 : s.awayScore;
        const entry = { ...baseEntry(s), description: `${offFirst} throws interception to ${defFirst} for a touchdown`, yardsGained: 0, homeScore: newHome, awayScore: newAway, driveResult: 'Pick 6', _playType: 'pass', _outcome: 'pick_6', _passer, _defender };
        return enterConversionPhase(s, {
          homeScore: newHome,
          awayScore: newAway,
          yardLine: spot,
          possession: newPoss,
          log: addPlay(s.log, entry),
        });
      }
      const entry = { ...baseEntry(s), description: `${offFirst} throws interception to ${defFirst}`, yardsGained: 0, homeScore: s.homeScore, awayScore: s.awayScore, driveResult: 'Interception', _playType: 'pass', _outcome: 'interception', _passer, _defender };
      return { ...s, ...afterPossessionFlip(s, spot, newPoss), log: addPlay(s.log, entry) };
    });
  }, []);

  const handlePenaltyTeam = useCallback((team) => {
    setGs(s => ({ ...s, penaltyTeam: team, playPhase: 'advance-down' }));
  }, []);

  const handleAdvanceDown = useCallback((advanceDown) => {
    setGsWithHistory((s) => {
      const spot              = s.newSpot ?? s.yardLine;
      const penaltyTeam       = s.penaltyTeam ?? s.possession;
      const penaltyTeamName   = penaltyTeam === 'home' ? homeName : awayName;
      const yds               = yardsGained(s.yardLine, spot, s.possession, s.homeAttacksRight);
      const defenseWasFlagged = penaltyTeam !== s.possession;

      let newDown, autoFirstDown = false;
      if (defenseWasFlagged) { autoFirstDown = advanceDown; newDown = autoFirstDown ? 1 : s.down; }
      else { newDown = advanceDown ? s.down + 1 : s.down; }

      const driveResult = newDown > 4 ? 'Turnover on Downs' : undefined;
      const _outcome    = newDown > 4 ? 'turnover_on_downs' : 'complete';
      const suffix = defenseWasFlagged
        ? advanceDown ? ' (auto first down)' : ''
        : advanceDown ? ' (loss of down)' : ' (replay down)';
      const entry = { ...baseEntry(s), description: `Penalty on ${penaltyTeamName}${suffix}`, yardsGained: yds, homeScore: s.homeScore, awayScore: s.awayScore, driveResult, _playType: 'penalty', _outcome };
      const reset = { penaltyTeam: null, newSpot: null, playType: null, selectedOffender: null, selectedDefender: null, playPhase: 'idle' };

      if (newDown > 4) {
        const newPoss = s.possession === 'home' ? 'away' : 'home';
        return { ...s, ...afterPossessionFlip(s, spot, newPoss), log: addPlay(s.log, entry) };
      }
      if (autoFirstDown) {
        const fdTarget = firstDownYard(spot, s.possession, s.homeAttacksRight);
        const distance = attacksIncreasing(s.possession, s.homeAttacksRight)
          ? fdTarget - spot
          : spot - fdTarget;
        return { ...s, ...reset, yardLine: spot, down: 1, distance, fdTarget, log: addPlay(s.log, entry) };
      }
      const fd        = s.fdTarget ?? firstDownYard(s.yardLine, s.possession, s.homeAttacksRight);
      const crossedFD = crossedFirstDown(s.yardLine, spot, s.possession, s.homeAttacksRight);
      if (crossedFD) {
        const fdTarget = firstDownYard(spot, s.possession, s.homeAttacksRight);
        const distance = attacksIncreasing(s.possession, s.homeAttacksRight)
          ? fdTarget - spot
          : spot - fdTarget;
        return { ...s, ...reset, yardLine: spot, down: 1, distance, fdTarget, log: addPlay(s.log, entry) };
      }
      const distance = attacksIncreasing(s.possession, s.homeAttacksRight)
        ? fd - spot
        : spot - fd;
      return { ...s, ...reset, yardLine: spot, down: newDown, distance, fdTarget: fd, log: addPlay(s.log, entry) };
    });
  }, [homeName, awayName]);

  const handleConversionResult = useCallback((result) => {
    setConvOutcome(result);
    setConvStep('points');
  }, []);

  const handleConversionPoint = useCallback((pts) => {
    if (convOutcome === 'nogood') {
      setGsWithHistory((s) => {
        const driveResult = `Touchdown, ${pts} pt no good`;
        const entry = {
          ...baseEntry(s),
          description: `${pts}-point conversion — no good`,
          yardsGained: 0,
          homeScore: s.homeScore,
          awayScore: s.awayScore,
          driveResult,
          _playType: 'conversion',
          _outcome: 'incomplete',
          _isConversion: true,
          _convPoints: pts,
        };
        const newPoss = s.possession === 'home' ? 'away' : 'home';
        return {
          ...s,
          ...afterPossessionFlip(s, kickoffYard(newPoss, s.homeAttacksRight), newPoss),
          log: addPlay(s.log, entry),
        };
      });
      resetConvState();
    } else {
      setConvPts(pts);
      setConvStep('passer');
    }
  }, [convOutcome, resetConvState]);

  const handleConversionPasser = useCallback((p) => {
    setConvPasser(p);
    setConvStep('receiver');
  }, []);

  const handleConversionReceiver = useCallback((p) => {
    setGsWithHistory((s) => {
      const pts       = convPts ?? 1;
      const passFirst = convPasser?.name?.split(' ')[0] ?? 'QB';
      const recFirst  = p.name.split(' ')[0];
      const _passer   = convPasser;
      const _receiver = p;
      const newHome   = s.possession === 'home' ? s.homeScore + pts : s.homeScore;
      const newAway   = s.possession === 'away' ? s.awayScore + pts : s.awayScore;
      const entry = {
        ...baseEntry(s),
        description: `${passFirst} passes to ${recFirst} for ${pts}-point conversion`,
        yardsGained: 0,
        homeScore: newHome,
        awayScore: newAway,
        driveResult: `Touchdown, ${pts} pt good`,
        _playType: 'conversion',
        _outcome: 'complete',
        _isConversion: true,
        _convPoints: pts,
        _passer,
        _receiver,
      };
      const newPoss = s.possession === 'home' ? 'away' : 'home';
      return {
        ...s,
        homeScore: newHome,
        awayScore: newAway,
        ...afterPossessionFlip(s, kickoffYard(newPoss, s.homeAttacksRight), newPoss),
        log: addPlay(s.log, entry),
      };
    });
    resetConvState();
  }, [convPts, convPasser, resetConvState]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (gameLoading) return <div className="flex h-screen items-center justify-center bg-slate-900 text-white text-sm">Loading game...</div>;
  if (gameError)   return <div className="flex h-screen items-center justify-center bg-slate-900 text-red-400 text-sm">{gameError}</div>;
  if (!gs)         return null;

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] overflow-hidden bg-slate-900 text-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {halftimeConfirm && (
        <HalftimeConfirmDialog
          homeName={homeName}
          awayName={awayName}
          openingPossession={gs.openingPossession ?? initialGameState?.openingPossession ?? 'home'}
          onConfirm={() => {
            handleHalfChange(2);
            setHalftimeConfirm(false);
          }}
          onCancel={() => setHalftimeConfirm(false)}
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col relative">
        {/* Sticky field + step bar */}
        <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shrink-0">
          <PlayStepBar gs={gs} convStep={convStep} pulseStep={pulseStep} />
          <div className="px-4 py-3">
            <FieldSpot
              yardLine={gs.yardLine}
              distance={gs.distance}
              possession={gs.possession}
              homeAttacksRight={gs.homeAttacksRight ?? true}
              newSpot={gs.newSpot}
              onSpot={handleSpot}
              homeName={homeName}
              awayName={awayName}
              pulse={activeStep === 1 && pulseStep === 1}
              disabled={gs.playPhase === 'conversion'}
            />
          </div>
        </div>

        {/* Scrollable play loop */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 flex flex-col gap-4 pb-28 md:pb-4">
            {gs.playPhase !== 'conversion' && (
              <PreSnap
                possession={gs.possession}
                offensePlayers={offensePlayers}
                defensePlayers={defensePlayers}
                selectedOffender={gs.selectedOffender}
                selectedDefender={gs.selectedDefender}
                onSelectOffender={handleSelectOffender}
                onSelectDefender={handleSelectDefender}
                homeName={homeName}
                awayName={awayName}
                onJerseyUpdate={updateJersey}
                pulse={activeStep === 0 && pulseStep === 0}
              />
            )}
            {(gs.selectedOffender || gs.playPhase === 'conversion') && (
              <PlayControls
                gs={gs}
                convStep={convStep}
                convPts={convPts}
                convPasser={convPasser}
                offensePlayers={offensePlayers}
                onPlayType={handlePlayType}
                onPassReceiver={handlePassReceiver}
                onPassReceiverComplete={handlePassReceiverComplete}
                onPassComplete={handlePassComplete}
                onPassIncomplete={handlePassIncomplete}
                onPassInterception={handlePassInterception}
                onPenaltyTeam={handlePenaltyTeam}
                onAdvanceDown={handleAdvanceDown}
                onConversionResult={handleConversionResult}
                onConversionPoint={handleConversionPoint}
                onConversionPasser={handleConversionPasser}
                onConversionReceiver={handleConversionReceiver}
                homeName={homeName}
                awayName={awayName}
                pulse={activeStep === 2 && pulseStep === 2}
              />
            )}
          </div>
        </div>

        <MobilePlayBar gs={gs} onPlayType={handlePlayType} visible={!!gs.selectedOffender} />

        <UndoToast
          message={undoToast}
          onUndo={() => { handleUndo(); setUndoToast(null); }}
          onDismiss={() => setUndoToast(null)}
        />
      </div>

      <div className="w-full md:w-80 md:shrink-0 border-t md:border-t-0 md:border-l border-slate-700 bg-slate-800 flex flex-col min-h-[220px] max-h-[38vh] md:max-h-none md:h-full overflow-hidden">
        <Scoreboard
          gs={gs}
          clockRunning={clockRunning}
          canUndo={history.length > 0}
          onClockToggle={handleClockToggle}
          onClockSet={handleClockSet}
          onHalfChange={handleHalfChangeRequest}
          onUndo={handleUndo}
          homeName={homeName}
          awayName={awayName}
          scoreFlash={scoreFlash}
        />
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <PlayByPlay
            log={gs.log}
            homeName={homeName}
            awayName={awayName}
            gs={gs}
            latestDriveId={latestDriveId}
          />
        </div>
      </div>
    </div>
  );
}