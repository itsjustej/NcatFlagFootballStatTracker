import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useLeague } from "../context/LeagueContext";
import { useAuth } from "../auth/AuthContext";
import { pointsForTeam } from "../utils/statsHelpers";
import { invalidateLeagueSeason } from "../utils/leagueSeason";

export default function GameHistoryPage() {
  const { currentLeague } = useLeague();
  const { canTrackGames } = useAuth();
  const [games, setGames] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forfeitOpen, setForfeitOpen] = useState(false);
  const leagueId = currentLeague?.league_id;

  useEffect(() => {
    if (!leagueId) return;
    let cancelled = false;

    const fetchGames = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("Game")
        .select(`
          game_id,
          forfeit,
          home_team:home_team ( team_id, name ),
          away_team:away_team ( team_id, name ),
          Play ( offense_team, defense_team, outcome, is_conversion, conv_points )
        `)
        .eq("league_id", leagueId);

      if (cancelled) return;
      if (error) { console.error(error); setLoading(false); return; }

      const formatted = data.map((g) => {
        const gamePlays = g.Play || [];
        const homePoints = pointsForTeam(gamePlays, g.home_team.team_id);
        const awayPoints = pointsForTeam(gamePlays, g.away_team.team_id);

        return {
          game_id:     g.game_id,
          forfeit:     g.forfeit === true,
          home_team:   g.home_team,
          away_team:   g.away_team,
          home_points: homePoints,
          away_points: awayPoints,
          home_won:    g.forfeit === true || homePoints > awayPoints,
          away_won:    g.forfeit !== true && awayPoints > homePoints,
        };
      });

      setGames(formatted.sort((a, b) => b.game_id - a.game_id));
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
    });
    if (error) throw new Error(error.message);
    invalidateLeagueSeason(leagueId);
    const { data, error: reloadError } = await supabase
      .from("Game")
      .select(`
        game_id,
        forfeit,
        home_team:home_team ( team_id, name ),
        away_team:away_team ( team_id, name ),
        Play ( offense_team, defense_team, outcome, is_conversion, conv_points )
      `)
      .eq("league_id", leagueId);
    if (reloadError) throw new Error(reloadError.message);
    const formatted = (data || []).map((g) => {
      const gamePlays = g.Play || [];
      const homePoints = pointsForTeam(gamePlays, g.home_team.team_id);
      const awayPoints = pointsForTeam(gamePlays, g.away_team.team_id);
      return {
        game_id: g.game_id,
        forfeit: g.forfeit === true,
        home_team: g.home_team,
        away_team: g.away_team,
        home_points: homePoints,
        away_points: awayPoints,
        home_won: g.forfeit === true || homePoints > awayPoints,
        away_won: g.forfeit !== true && awayPoints > homePoints,
      };
    });
    setGames(formatted.sort((a, b) => b.game_id - a.game_id));
  };

  const truncate = (str, n = 12) =>
    str?.length > n ? str.slice(0, n) + "…" : str;

  if (!currentLeague) {
    return (
      <div className="bg-slate-900 pt-4 sm:pt-5 px-6">
        <p className="text-slate-400 text-center animate-pulse">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 text-white pt-4 sm:pt-5 px-4 pb-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">Games</h1>
          <p className="text-slate-400 text-sm sm:text-base">
            {currentLeague.name}
          </p>
        </header>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-4 border-b border-slate-700">
            <p className="text-slate-400 text-sm">
              {loading ? "Loading games..." : `${games.length} game${games.length !== 1 ? "s" : ""} recorded`}
            </p>
            {canTrackGames && (
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setForfeitOpen(true)}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg border border-slate-600 text-white text-sm font-semibold min-h-[44px] hover:bg-slate-700 transition-colors"
                >
                  Forfeit
                </button>
                <Link
                  to="/start-game"
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center gap-2 text-white text-sm font-semibold min-h-[44px] shrink-0 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Start Game
                </Link>
              </div>
            )}
          </div>

          {loading && (
            <p className="px-4 py-8 text-slate-400 text-center animate-pulse">Loading game history...</p>
          )}

          {!loading && games.length === 0 && (
            <p className="px-4 py-8 text-slate-400 text-center">No games recorded yet.</p>
          )}

          {!loading && games.length > 0 && (
            <div className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {games.map((g) => (
                  <div
                    key={g.game_id}
                    className="bg-slate-900/50 border border-slate-700/80 rounded-lg overflow-hidden flex flex-col hover:border-slate-500 transition-colors"
                  >
                    <Link
                      to={`/games/${g.game_id}`}
                      className="p-4 flex flex-col gap-3 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    >
                      {g.forfeit && (
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Forfeit</p>
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`truncate flex-1 text-sm ${g.home_won ? "text-green-400 font-bold" : "text-white font-medium"}`}>
                          {truncate(g.home_team.name)}
                        </span>
                        <span className={`font-bold tabular-nums shrink-0 ${g.home_won ? "text-green-400 text-xl" : "text-white text-lg"}`}>
                          {g.forfeit ? "W" : g.home_points}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className={`truncate flex-1 text-sm ${g.away_won ? "text-green-400 font-bold" : "text-white font-medium"}`}>
                          {truncate(g.away_team.name)}
                        </span>
                        <span className={`font-bold tabular-nums shrink-0 ${g.away_won ? "text-green-400 text-xl" : "text-white text-lg"}`}>
                          {g.forfeit ? "L" : g.away_points}
                        </span>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
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
