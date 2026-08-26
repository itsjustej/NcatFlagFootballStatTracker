import React from "react";

function JerseyInput({ value, onChange }) {
  return (
    <input
      type="number"
      min={0}
      max={99}
      value={value ?? ""}
      onChange={e => onChange(e.target.value === "" ? null : parseInt(e.target.value))}
      onClick={e => e.target.select()}
      onWheel={e => e.target.blur()}
      placeholder="#"
      className="w-12 text-center bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-white text-xs font-bold focus:outline-none focus:border-blue-400 tabular-nums"
    />
  );
}

function PlayerRosterRow({ player, jersey, onJerseyChange }) {
  return (
    <li className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-700/50 last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="text-xs font-black tabular-nums w-7 text-center shrink-0"
          style={{ color: jersey != null ? '#60a5fa' : '#475569' }}
        >
          {jersey != null ? `#${jersey}` : '—'}
        </span>
        <span className="text-slate-300 text-sm truncate">{player.name}</span>
      </div>
      <JerseyInput value={jersey} onChange={val => onJerseyChange(player.player_id, val)} />
    </li>
  );
}

function FieldPreview({ homeName, awayName, homeAttacksRight }) {
  const leftTeamKey  = homeAttacksRight ? 'away' : 'home';
  const rightTeamKey = homeAttacksRight ? 'home' : 'away';
  const leftName     = leftTeamKey === 'home' ? homeName : awayName;
  const rightName    = rightTeamKey === 'home' ? homeName : awayName;
  const leftColor    = leftTeamKey === 'home' ? 'rgba(0,75,135,0.75)' : 'rgba(201,168,76,0.75)';
  const rightColor   = rightTeamKey === 'home' ? 'rgba(0,75,135,0.75)' : 'rgba(201,168,76,0.75)';

  return (
    <div className="relative w-full h-14 rounded-lg overflow-hidden border border-slate-600">
      <div className="absolute inset-0 bg-[#14532d]" />
      <div
        className="absolute top-0 bottom-0 left-0 w-[12%] flex items-center justify-center"
        style={{ background: leftColor }}
      >
        <span className="text-[8px] font-black text-white/80 uppercase tracking-wider text-center px-0.5 leading-tight">
          {leftName || 'Left'}
        </span>
      </div>
      <div className="absolute inset-y-0 left-[12%] right-[12%] flex items-center justify-center">
        <span className="text-[9px] text-white/30 font-bold tracking-widest">40</span>
      </div>
      <div
        className="absolute top-0 bottom-0 right-0 w-[12%] flex items-center justify-center"
        style={{ background: rightColor }}
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
  jerseyMapA,   // { player_id: number }
  jerseyMapB,
  openingPossession,
  homeAttacksRight,
  onTeamASelect,
  onTeamBSelect,
  onJerseyChangeA,
  onJerseyChangeB,
  onOpeningPossessionChange,
  onHomeAttacksRightChange,
  onNext,
  isLoading = false,
}) {
  const allASet = teamA?.players.every(p => jerseyMapA[p.player_id] != null);
  const allBSet = teamB?.players.every(p => jerseyMapB[p.player_id] != null);
  const canStart = teamA && teamB && teamA.team_id !== teamB.team_id;

  return (
    <div className="space-y-10">
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
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">{teamA.name}</h3>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest">
                  {allASet ? '✓ All set' : 'Enter jersey #s'}
                </span>
              </div>
              <ul className="space-y-0">
                {teamA.players.map(p => (
                  <PlayerRosterRow
                    key={p.player_id}
                    player={p}
                    jersey={jerseyMapA[p.player_id] ?? null}
                    onJerseyChange={onJerseyChangeA}
                  />
                ))}
              </ul>
            </div>
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
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">{teamB.name}</h3>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest">
                  {allBSet ? '✓ All set' : 'Enter jersey #s'}
                </span>
              </div>
              <ul className="space-y-0">
                {teamB.players.map(p => (
                  <PlayerRosterRow
                    key={p.player_id}
                    player={p}
                    jersey={jerseyMapB[p.player_id] ?? null}
                    onJerseyChange={onJerseyChangeB}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>

      </div>

      {canStart && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-6">
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
                  onClick={() => onOpeningPossessionChange(value)}
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
              Field direction (team name marks the end zone they attack)
            </label>
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              {[
                { value: true,  label: 'Home attacks right', sub: `${teamA?.name ?? 'Home'} end zone on the right →` },
                { value: false, label: 'Home attacks left',  sub: `← ${teamA?.name ?? 'Home'} end zone on the left` },
              ].map(({ value, label, sub }) => (
                <button
                  key={String(value)}
                  type="button"
                  onClick={() => onHomeAttacksRightChange(value)}
                  className={`text-left px-4 py-3 rounded-lg border transition ${
                    homeAttacksRight === value
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
            />
          </div>
        </div>
      )}

      <div className="flex justify-center px-2">
        <button
          onClick={onNext}
          disabled={isLoading || !canStart}
          className="w-full sm:w-auto px-6 py-3 rounded-lg transition font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
        >
          {isLoading ? "Starting…" : "Start Game"}
        </button>
      </div>
    </div>
  );
}