import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  fieldLength,
  fieldMarkerLabel,
  fieldMarkerYards,
} from '../../gameLogic';

function comparePlayers(a, b) {
  const parts = (name) => String(name).trim().toLowerCase().split(/\s+/).filter(Boolean);
  const ap = parts(a.name);
  const bp = parts(b.name);
  const byFirst = (ap[0] || "").localeCompare(bp[0] || "");
  if (byFirst !== 0) return byFirst;
  return ap.slice(1).join(" ").localeCompare(bp.slice(1).join(" "));
}

function JerseyInput({ value, onChange, onAdvance, duplicate, inputRef, playerName }) {
  return (
    <input
      ref={inputRef}
      inputMode="numeric"
      enterKeyHint="next"
      autoComplete="off"
      maxLength={2}
      value={value ?? ""}
      aria-label={`Jersey number for ${playerName}`}
      onFocus={(e) => e.target.select()}
      onClick={(e) => e.target.select()}
      onChange={(e) => {
        const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
        onChange(raw === "" ? null : Number(raw));
        if (raw.length === 2) requestAnimationFrame(onAdvance);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onAdvance();
        }
      }}
      placeholder="#"
      title={duplicate ? "Another player already has this number" : "Type two digits to move on. Press Enter after one digit."}
      className={`w-16 min-h-11 text-center bg-slate-700 border rounded-lg px-2 py-2 text-white text-lg font-bold focus:outline-none focus:border-blue-400 tabular-nums ${
        duplicate ? "border-amber-400" : "border-slate-600"
      }`}
    />
  );
}

function PlayerRosterRow({ player, jersey, duplicate, onJerseyChange, onAdvance, onFocus, inputRef }) {
  return (
    <li className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-700/50 last:border-0">
      <button
        type="button"
        onClick={onFocus}
        className="flex items-center gap-2 min-w-0 text-left flex-1"
      >
        <span
          className="text-sm font-black tabular-nums w-8 text-center shrink-0"
          style={{ color: jersey != null ? '#60a5fa' : '#475569' }}
        >
          {jersey != null ? `#${jersey}` : '—'}
        </span>
        <span className="text-slate-200 text-sm truncate">{player.name}</span>
      </button>
      <JerseyInput
        inputRef={inputRef}
        playerName={player.name}
        value={jersey}
        duplicate={duplicate}
        onChange={(val) => onJerseyChange(player.player_id, val)}
        onAdvance={onAdvance}
      />
    </li>
  );
}

function AddPlayerForm({ onAdd, onAdded }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const id = await onAdd(trimmed);
      if (id) {
        setName("");
        onAdded(id);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex gap-2 mt-3 pt-3 border-t border-slate-700">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Add a player"
        aria-label="New player name"
        className="flex-1 min-h-11 bg-slate-900 border border-slate-600 rounded-lg px-3 text-white text-sm focus:outline-none focus:border-blue-400"
      />
      <button
        type="submit"
        disabled={busy || !name.trim()}
        className="min-h-11 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-40"
      >
        {busy ? "Adding…" : "Add"}
      </button>
    </form>
  );
}

function TeamRoster({ team, jerseys, onJerseyChange, onAddPlayer }) {
  const inputs = useRef({});
  const refCallbacks = useRef({});
  const [focusId, setFocusId] = useState(null);
  const sorted = useMemo(
    () => [...team.players].sort(comparePlayers),
    [team.players],
  );

  const duplicateNumbers = useMemo(() => {
    const counts = {};
    for (const player of team.players) {
      const number = jerseys[player.player_id];
      if (number == null) continue;
      counts[number] = (counts[number] || 0) + 1;
    }
    return new Set(
      Object.entries(counts)
        .filter(([, count]) => count > 1)
        .map(([number]) => Number(number)),
    );
  }, [team.players, jerseys]);

  const filled = team.players.filter((player) => jerseys[player.player_id] != null).length;

  const refFor = (playerId) => {
    if (!refCallbacks.current[playerId]) {
      refCallbacks.current[playerId] = (el) => {
        if (el) inputs.current[playerId] = el;
        else delete inputs.current[playerId];
      };
    }
    return refCallbacks.current[playerId];
  };

  const focusPlayer = (playerId) => {
    const el = inputs.current[playerId];
    if (!el) return false;
    el.focus();
    el.select();
    el.scrollIntoView({ block: "nearest" });
    return true;
  };

  const advanceFrom = (playerId) => {
    const index = sorted.findIndex((player) => player.player_id === playerId);
    const next = sorted[index + 1];
    if (next) focusPlayer(next.player_id);
  };

  useEffect(() => {
    if (focusId == null) return;
    const el = inputs.current[focusId];
    if (!el) return;
    el.focus();
    el.select();
    el.scrollIntoView({ block: "nearest" });
    setFocusId(null);
  }, [focusId, sorted]);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-1 gap-3">
        <h3 className="text-white font-semibold truncate">{team.name}</h3>
        <span className="text-[10px] text-slate-500 uppercase tracking-widest shrink-0">
          {filled === team.players.length && team.players.length > 0
            ? "✓ All set"
            : `${filled}/${team.players.length} numbers`}
        </span>
      </div>
      <p className="text-[11px] text-slate-500 mb-2">
        Two digits moves to the next player. Enter does the same after one digit.
      </p>
      <ul>
        {sorted.map((player) => {
          const jersey = jerseys[player.player_id] ?? null;
          return (
            <PlayerRosterRow
              key={player.player_id}
              player={player}
              jersey={jersey}
              duplicate={jersey != null && duplicateNumbers.has(jersey)}
              onJerseyChange={onJerseyChange}
              onAdvance={() => advanceFrom(player.player_id)}
              onFocus={() => focusPlayer(player.player_id)}
              inputRef={refFor(player.player_id)}
            />
          );
        })}
      </ul>
      <AddPlayerForm
        onAdd={(name) => onAddPlayer(team.team_id, name)}
        onAdded={setFocusId}
      />
    </div>
  );
}

function FieldPreview({ homeName, awayName, homeAttacksRight, hasFortyYard }) {
  const leftTeamKey  = homeAttacksRight ? 'away' : 'home';
  const rightTeamKey = homeAttacksRight ? 'home' : 'away';
  const leftName     = leftTeamKey === 'home' ? homeName : awayName;
  const rightName    = rightTeamKey === 'home' ? homeName : awayName;
  const leftColor    = leftTeamKey === 'home' ? 'rgba(0,75,135,0.75)' : 'rgba(201,168,76,0.75)';
  const rightColor   = rightTeamKey === 'home' ? 'rgba(0,75,135,0.75)' : 'rgba(201,168,76,0.75)';
  const ezPct = 12;
  const fieldPct = 100 - ezPct * 2;
  const length = fieldLength(hasFortyYard);
  const markerYards = fieldMarkerYards(hasFortyYard);

  return (
    <div className="relative w-full h-20 sm:h-14 rounded-lg overflow-hidden border border-slate-600">
      <div className="absolute inset-0 bg-[#14532d]" />
      <div
        className="absolute top-0 bottom-0 left-0 flex items-center justify-center"
        style={{ width: `${ezPct}%`, background: leftColor }}
      >
        <span className="text-[8px] font-black text-white/80 uppercase tracking-wider text-center px-0.5 leading-tight">
          {leftName || 'Left'}
        </span>
      </div>
      {markerYards.map((y) => {
        const left = ezPct + (y / length) * fieldPct;
        return (
          <div key={y} className="absolute top-0 bottom-0" style={{ left: `${left}%` }}>
            <div className="absolute top-0 bottom-0 border-l border-white/25" />
            <span className="absolute text-[9px] text-white/40 font-bold tracking-widest" style={{ top: 4, left: 3 }}>
              {fieldMarkerLabel(y, hasFortyYard)}
            </span>
          </div>
        );
      })}
      <div
        className="absolute top-0 bottom-0 right-0 flex items-center justify-center"
        style={{ width: `${ezPct}%`, background: rightColor }}
      >
        <span className="text-[8px] font-black text-white/80 uppercase tracking-wider text-center px-0.5 leading-tight">
          {rightName || 'Right'}
        </span>
      </div>
    </div>
  );
}

function TeamPickGrid({ teams, selectedId, disabledId, onSelect, accent = "blue" }) {
  const selectedCls = accent === "gold"
    ? "border-[#C9A84C] bg-[#C9A84C]/15 text-white"
    : "border-blue-500 bg-blue-600/20 text-white";

  return (
    <div className="grid grid-cols-2 gap-2 mb-4">
      {teams.map((team) => {
        const selected = selectedId === team.team_id;
        const taken = disabledId === team.team_id;
        return (
          <button
            key={team.team_id}
            type="button"
            disabled={taken}
            onClick={() => onSelect(selected ? null : team)}
            className={`text-left px-3 py-3 rounded-lg border min-h-[44px] transition ${
              taken
                ? "border-slate-800 bg-slate-900/40 text-slate-600 cursor-not-allowed"
                : selected
                  ? selectedCls
                  : "border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-400"
            }`}
          >
            <span className="block font-semibold truncate">{team.name}</span>
            <span className={`block text-xs mt-0.5 ${selected ? "text-white/70" : "text-slate-500"}`}>
              {team.players.length} player{team.players.length !== 1 ? "s" : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function TeamSelector({
  teams,
  teamA,
  teamB,
  jerseys,
  openingPossession,
  homeAttacksRight,
  hasFortyYard,
  onTeamASelect,
  onTeamBSelect,
  onJerseyChange,
  onAddPlayer,
  onOpeningPossessionChange,
  onHomeAttacksRightChange,
  onHasFortyYardChange,
  onNext,
  isLoading = false,
}) {
  const canStart = teamA && teamB && teamA.team_id !== teamB.team_id;
  const receivingIsAway = openingPossession === 'away';
  const receivingName = receivingIsAway
    ? (teamB?.name ?? 'Away')
    : (teamA?.name ?? 'Home');
  const receivingAttacksRight = receivingIsAway ? !homeAttacksRight : homeAttacksRight;

  return (
    <div className="space-y-8 sm:space-y-10 pb-4">
      <div className="grid md:grid-cols-2 gap-6 md:gap-12">

        {/* HOME TEAM */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Home Team</h2>
          <TeamPickGrid
            teams={teams}
            selectedId={teamA?.team_id}
            disabledId={teamB?.team_id}
            onSelect={onTeamASelect}
            accent="blue"
          />

          {teamA && (
            <TeamRoster
              team={teamA}
              jerseys={jerseys}
              onJerseyChange={onJerseyChange}
              onAddPlayer={onAddPlayer}
            />
          )}
        </div>

        {/* AWAY TEAM */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Away Team</h2>
          <TeamPickGrid
            teams={teams}
            selectedId={teamB?.team_id}
            disabledId={teamA?.team_id}
            onSelect={onTeamBSelect}
            accent="gold"
          />

          {teamB && (
            <TeamRoster
              team={teamB}
              jerseys={jerseys}
              onJerseyChange={onJerseyChange}
              onAddPlayer={onAddPlayer}
            />
          )}
        </div>

      </div>

      {canStart && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 sm:p-6 space-y-6">
          <h2 className="text-xl font-bold text-white">Kickoff & Field Direction</h2>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-3">
              Who receives the opening kickoff?
            </label>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { value: 'home', label: teamA?.name ?? 'Home', sub: 'Home team gets ball first' },
                { value: 'away', label: teamB?.name ?? 'Away', sub: 'Away team gets ball first' },
              ].map(({ value, label, sub }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    if (value === openingPossession) return;
                    onOpeningPossessionChange(value);
                    onHomeAttacksRightChange(!homeAttacksRight);
                  }}
                  className={`text-left px-4 py-3 rounded-lg border transition ${
                    openingPossession === value
                      ? 'border-blue-500 bg-blue-600/20 text-white'
                      : 'border-slate-600 bg-slate-900/50 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <span className="block font-semibold">{label}</span>
                  <span className="block text-xs text-slate-400 mt-0.5">{sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-3">
              Which way is {receivingName} going?
            </label>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { attacksRight: true,  label: `${receivingName} going right`, sub: `${receivingName} end zone on the right →` },
                { attacksRight: false, label: `${receivingName} going left`,  sub: `← ${receivingName} end zone on the left` },
              ].map(({ attacksRight, label, sub }) => (
                <button
                  key={String(attacksRight)}
                  type="button"
                  onClick={() => onHomeAttacksRightChange(receivingIsAway ? !attacksRight : attacksRight)}
                  className={`text-left px-4 py-3 rounded-lg border transition ${
                    receivingAttacksRight === attacksRight
                      ? 'border-blue-500 bg-blue-600/20 text-white'
                      : 'border-slate-600 bg-slate-900/50 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <span className="block font-semibold">{label}</span>
                  <span className="block text-xs text-slate-400 mt-0.5">{sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-3">
              Field markings
            </label>
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              {[
                { value: true,  label: '20s and 40', sub: '80-yard field — first downs at both 20s, the 40, and the goal lines' },
                { value: false, label: '20s only',   sub: '60-yard field — first downs at the 20s and goal lines (midfield is the 30)' },
              ].map(({ value, label, sub }) => (
                <button
                  key={String(value)}
                  type="button"
                  onClick={() => onHasFortyYardChange(value)}
                  className={`text-left px-4 py-3 rounded-lg border transition ${
                    hasFortyYard === value
                      ? 'border-blue-500 bg-blue-600/20 text-white'
                      : 'border-slate-600 bg-slate-900/50 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <span className="block font-semibold">{label}</span>
                  <span className="block text-xs text-slate-400 mt-0.5">{sub}</span>
                </button>
              ))}
            </div>
            <FieldPreview
              homeName={teamA?.name}
              awayName={teamB?.name}
              homeAttacksRight={homeAttacksRight}
              hasFortyYard={hasFortyYard}
            />
          </div>
        </div>
      )}

      <div className="flex justify-center px-2">
        <button
          onClick={onNext}
          disabled={isLoading || !canStart}
          className="w-full sm:w-auto px-6 py-3 rounded-lg transition font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed min-h-12"
        >
          {isLoading ? "Starting…" : "Start Game"}
        </button>
      </div>
    </div>
  );
}