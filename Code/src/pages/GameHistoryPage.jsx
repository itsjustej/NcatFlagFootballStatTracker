import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useLeague } from "../context/LeagueContext";
import { useAuth } from "../auth/AuthContext";
import { pointsForTeam } from "../utils/statsHelpers";
import { invalidateLeagueSeason } from "../utils/leagueSeason";
import { formatGameDate, todayDateInput } from "../utils/gameDate";

function formatGame(g) {
  const gamePlays = g.Play || [];
  const homePoints = pointsForTeam(gamePlays, g.home_team.team_id);
  const awayPoints = pointsForTeam(gamePlays, g.away_team.team_id);
  return {
    game_id: g.game_id,
    played_on: g.played_on || null,
    forfeit: g.forfeit === true,
    home_team: g.home_team,
    away_team: g.away_team,
    home_points: homePoints,
    away_points: awayPoints,
    home_won: g.forfeit === true || homePoints > awayPoints,
    away_won: g.forfeit !== true && awayPoints > homePoints,
  };
}

const GAME_COLUMNS = `
  game_id,
  played_on,
  forfeit,
  home_team:home_team ( team_id, name ),
  away_team:away_team ( team_id, name ),
  Play ( offense_team, defense_team, outcome, is_conversion, conv_points )
`;

export default function GameHistoryPage() {
  const { currentLeague } = useLeague();
  const { canTrackGames } = useAuth();
  const [games, setGames] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forfeitOpen, setForfeitOpen] = useState(false);
  const [teamFilter, setTeamFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [dateError, setDateError] = useState("");
  const leagueId = currentLeague?.league_id;

  useEffect(() => {
    if (!leagueId) return;
    let cancelled = false;

    const fetchGames = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("Game")
        .select(GAME_COLUMNS)
        .eq("league_id", leagueId);

      if (cancelled) return;
      if (error) { console.error(error); setLoading(false); return; }

      setGames((data || []).map(formatGame).sort((a, b) => b.game_id - a.game_id));
      setTeamFilter("");
      setDateFilter("");
      setLoading(false);
    };

    const fetchTeams = async () => {
      const { data, error } = await supabase
        .from("Team")
        .select("team_id, name")
        .eq("league_id", leagueId)
        .order("name");
      if (!cancelled && !error) setTeams(data || []);
    };

    fetchGames();
    fetchTeams();
    return () => { cancelled = true; };
  }, [leagueId]);

  const awardForfeit = async (winnerId, loserId) => {
    const { error } = await supabase.from("Game").insert({
      league_id: leagueId,
      home_team: Number(winnerId),
      away_team: Number(loserId),
      forfeit: true,
      played_on: todayDateInput(),
    });
    if (error) throw new Error(error.message);
    invalidateLeagueSeason(leagueId);
    const { data, error: reloadError } = await supabase
      .from("Game")
      .select(GAME_COLUMNS)
      .eq("league_id", leagueId);
    if (reloadError) throw new Error(reloadError.message);
    setGames((data || []).map(formatGame).sort((a, b) => b.game_id - a.game_id));
  };

  const setGameDate = async (gameId, playedOn) => {
    setDateError("");
    const nextDate = playedOn || null;
    const { data, error } = await supabase
      .from("Game")
      .update({ played_on: nextDate })
      .eq("game_id", gameId)
      .select("game_id");
    if (error || !data?.length) {
      setDateError(error?.message || "Could not save that date.");
      return;
    }
    setGames((prev) => prev.map((game) => (
      game.game_id === gameId ? { ...game, played_on: nextDate } : game
    )));
  };

  const truncate = (str, n = 12) =>
    str?.length > n ? str.slice(0, n) + "…" : str;

  const dateOptions = [...new Set(games.map((game) => game.played_on).filter(Boolean))]
    .sort((a, b) => b.localeCompare(a));

  const visibleGames = games.filter((game) => {
    const matchesTeam = !teamFilter
      || String(game.home_team.team_id) === teamFilter
      || String(game.away_team.team_id) === teamFilter;
    const matchesDate = !dateFilter || game.played_on === dateFilter;
    return matchesTeam && matchesDate;
  });

  const emptyFilterMessage = teamFilter && dateFilter
    ? "That team has no games on that date."
    : teamFilter
      ? "That team has no games yet."
      : "No games on that date.";

  const gamesByDate = new Map();
  for (const game of visibleGames) {
    const key = game.played_on || "";
    const list = gamesByDate.get(key);
    if (list) list.push(game);
    else gamesByDate.set(key, [game]);
  }
  const dateKeys = [...gamesByDate.keys()].sort((a, b) => {
    if (!a) return 1;
    if (!b) return -1;
    return b.localeCompare(a);
  });

  if (!currentLeague) {
    return (
      <div className="bg-slate-900 pt-4 sm:pt-5 pb-8">
        <p className="max-w-6xl mx-auto px-4 text-slate-400 text-center animate-pulse">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 text-white pt-4 sm:pt-5 pb-8">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        <header>
          <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">Games</h1>
          <p className="text-slate-400 text-sm sm:text-base">
            {currentLeague.name}
          </p>
        </header>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
          <div className="flex flex-col gap-3 px-4 py-4 border-b border-slate-700 sm:flex-row sm:items-center">
            {canTrackGames && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForfeitOpen(true)}
                  className="px-4 py-2.5 rounded-lg border border-slate-600 text-white text-sm font-semibold min-h-[44px] hover:bg-slate-700 transition-colors"
                >
                  Forfeit
                </button>
                <Link
                  to="/start-game"
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center gap-2 text-white text-sm font-semibold min-h-[44px] shrink-0 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Start Game
                </Link>
              </div>
            )}
            <div className="flex flex-col gap-3 w-full sm:ml-auto sm:w-auto sm:flex-row sm:items-center">
              <label className="flex items-center gap-3 text-sm text-slate-300 w-full sm:w-auto">
                <span className="shrink-0">Date</span>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="min-h-11 w-full sm:w-52 bg-slate-900 border border-slate-600 rounded-lg px-3 text-white"
                >
                  <option value="">All dates</option>
                  {dateOptions.map((date) => (
                    <option key={date} value={date}>{formatGameDate(date)}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-3 text-sm text-slate-300 w-full sm:w-auto">
                <span className="shrink-0">Team</span>
                <select
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                  className="min-h-11 w-full sm:w-48 bg-slate-900 border border-slate-600 rounded-lg px-3 text-white"
                >
                  <option value="">All teams</option>
                  {teams.map((team) => (
                    <option key={team.team_id} value={team.team_id}>{team.name}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {dateError && (
            <p className="px-4 pt-3 text-sm text-red-300">{dateError}</p>
          )}

          {loading && (
            <p className="px-4 py-8 text-slate-400 text-center animate-pulse">Loading game history...</p>
          )}

          {!loading && games.length === 0 && (
            <p className="px-4 py-8 text-slate-400 text-center">No games recorded yet.</p>
          )}

          {!loading && games.length > 0 && visibleGames.length === 0 && (
            <p className="px-4 py-8 text-slate-400 text-center">{emptyFilterMessage}</p>
          )}

          {!loading && visibleGames.length > 0 && (
            <div className="p-4 space-y-6">
              {dateKeys.map((dateKey) => (
                <section key={dateKey || "none"}>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-300 mb-3">
                    {formatGameDate(dateKey)}
                  </h2>
                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    {gamesByDate.get(dateKey).map((g) => (
                      <div
                        key={g.game_id}
                        className="bg-slate-900/50 border border-slate-700/80 rounded-lg overflow-hidden flex flex-col h-full hover:border-slate-500 transition-colors"
                      >
                        {canTrackGames && (
                          <EditDateButton game={g} onChange={setGameDate} />
                        )}
                        <Link
                          to={`/games/${g.game_id}`}
                          className="p-2 sm:p-4 flex flex-col h-full hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        >
                          <div className="flex items-center justify-between gap-1 sm:gap-2 h-7">
                            <span className={`truncate flex-1 text-xs sm:text-sm ${g.home_won ? "text-green-400 font-bold" : "text-white font-medium"}`}>
                              {truncate(g.home_team.name)}
                            </span>
                            <span className={`w-6 sm:w-8 text-right font-bold tabular-nums shrink-0 text-base sm:text-xl leading-none ${g.home_won ? "text-green-400" : "text-white"}`}>
                              {g.forfeit ? "W" : g.home_points}
                            </span>
                          </div>

                          <p className="h-4 my-1.5 text-center text-[10px] font-black uppercase tracking-widest text-slate-500 leading-4">
                            {g.forfeit ? "Forfeit" : "\u00a0"}
                          </p>

                          <div className="flex items-center justify-between gap-1 sm:gap-2 h-7">
                            <span className={`truncate flex-1 text-xs sm:text-sm ${g.away_won ? "text-green-400 font-bold" : "text-white font-medium"}`}>
                              {truncate(g.away_team.name)}
                            </span>
                            <span className={`w-6 sm:w-8 text-right font-bold tabular-nums shrink-0 text-base sm:text-xl leading-none ${g.away_won ? "text-green-400" : "text-white"}`}>
                              {g.forfeit ? "L" : g.away_points}
                            </span>
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
      {forfeitOpen && (
        <ForfeitDialog
          teams={teams}
          onClose={() => setForfeitOpen(false)}
          onAward={awardForfeit}
        />
      )}
    </div>
  );
}

function EditDateButton({ game, onChange }) {
  const inputRef = useRef(null);

  const openPicker = () => {
    const input = inputRef.current;
    if (!input || typeof input.showPicker !== "function") {
      input?.focus();
      return;
    }
    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  };

  return (
    <div className="relative mx-2 mt-2">
      <button
        type="button"
        onClick={openPicker}
        className="flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-600 text-[11px] font-semibold text-slate-300 hover:bg-slate-800"
      >
        Edit date
      </button>
      <input
        ref={inputRef}
        type="date"
        value={game.played_on || ""}
        onChange={(e) => onChange(game.game_id, e.target.value)}
        aria-label={`Change the date for ${game.home_team.name} versus ${game.away_team.name}`}
        tabIndex={-1}
        className="absolute left-0 top-0 h-px w-px opacity-0"
      />
    </div>
  );
}

function ForfeitDialog({ teams, onClose, onAward }) {
  const [winnerId, setWinnerId] = useState("");
  const [loserId, setLoserId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!winnerId || !loserId || winnerId === loserId || saving) return;
    setSaving(true);
    setError("");
    try {
      await onAward(winnerId, loserId);
      onClose();
    } catch (err) {
      setError(err.message || "Could not record that forfeit.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md p-5 flex flex-col gap-4"
      >
        <div>
          <h2 className="text-lg font-bold text-white">Award a forfeit</h2>
          <p className="text-sm text-slate-400 mt-1">
            The winner gets a win and the other team gets a loss. Games played, averages, and power rankings stay the same.
          </p>
        </div>
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Winner
          <select
            value={winnerId}
            onChange={(e) => setWinnerId(e.target.value)}
            className="min-h-11 bg-slate-900 border border-slate-600 rounded-lg px-3 text-white"
          >
            <option value="">Choose a team</option>
            {teams.map((team) => (
              <option key={team.team_id} value={team.team_id}>{team.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Loss
          <select
            value={loserId}
            onChange={(e) => setLoserId(e.target.value)}
            className="min-h-11 bg-slate-900 border border-slate-600 rounded-lg px-3 text-white"
          >
            <option value="">Choose a team</option>
            {teams.filter((team) => String(team.team_id) !== String(winnerId)).map((team) => (
              <option key={team.team_id} value={team.team_id}>{team.name}</option>
            ))}
          </select>
        </label>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 px-4 rounded-lg text-slate-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!winnerId || !loserId || winnerId === loserId || saving}
            className="min-h-11 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-40"
          >
            {saving ? "Saving…" : "Award win"}
          </button>
        </div>
      </form>
    </div>
  );
}
