import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { BarChart3, Trophy, Users } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../auth/AuthContext";
import { useLeague } from "../context/LeagueContext";
import TeamStats from "../components/stats/TeamStats";
import PlayerStats from "../components/stats/PlayerStats";
import LeagueLeaders from "../components/stats/LeagueLeaders";
import { invalidateLeagueSeason, loadLeagueSeason } from "../utils/leagueSeason";
import {
  SEED_NUMBERS,
  buildBracket,
  emptySeeds,
  seedColumn,
  seedsFromRow,
  slotForSeed,
} from "../utils/bracket";

const STAT_TABS = [
  { id: "teams", label: "Teams", icon: BarChart3 },
  { id: "players", label: "Players", icon: Users },
  { id: "leaders", label: "Leaders", icon: Trophy },
];

function TeamRow({ side, score, won, dim, showScore }) {
  return (
    <div className={`flex h-10 items-center gap-2 px-2.5 ${won ? "bg-amber-300/10" : ""}`}>
      <span
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-md text-[10px] font-bold tabular-nums ${
          side?.seed
            ? "bg-slate-800 text-slate-200 ring-1 ring-inset ring-slate-600"
            : "bg-slate-900 text-slate-600 ring-1 ring-inset ring-slate-800"
        }`}
      >
        {side?.seed || "–"}
      </span>
      <span
        className={`min-w-0 flex-1 truncate text-sm ${
          won ? "font-semibold text-white" : side ? (dim ? "text-slate-400" : "text-slate-100") : "text-slate-500"
        }`}
      >
        {side?.name || "TBD"}
      </span>
      <span className={`w-6 text-right text-sm font-bold tabular-nums ${won ? "text-amber-200" : "text-slate-300"}`}>
        {showScore ? score : ""}
      </span>
    </div>
  );
}

function MatchCard({ match, canTrack, onOpen }) {
  const started = Boolean(match.game);
  const ready = Boolean(match.home && match.away);
  const canOpen = started || (canTrack && ready);
  const homeWon = match.winner && match.home && String(match.winner.team_id) === String(match.home.team_id);
  const awayWon = match.winner && match.away && String(match.winner.team_id) === String(match.away.team_id);
  const showScore = started && match.score?.played;
  const status = started ? (canTrack ? "Resume" : "View") : ready ? "Start" : "Waiting";
  const homeName = match.home?.name || "TBD";
  const awayName = match.away?.name || "TBD";

  return (
    <button
      type="button"
      disabled={!canOpen}
      onClick={() => onOpen(match)}
      aria-label={`${status}: ${homeName} versus ${awayName}`}
      className={`h-20 w-full overflow-hidden rounded-xl border text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 ${
        !canOpen
          ? "cursor-default border-slate-700 bg-slate-950"
          : started
            ? "border-slate-500 bg-slate-950 hover:border-blue-400"
            : "border-amber-400/50 bg-slate-950 hover:border-amber-300"
      }`}
    >
      <TeamRow side={match.home} score={match.score?.home} won={homeWon} dim={awayWon} showScore={showScore} />
      <div className="relative h-px bg-slate-700">
        <span
          className={`absolute left-9 top-1/2 -translate-y-1/2 rounded-full bg-slate-950 px-1.5 text-[10px] font-semibold leading-none ${
            started ? "text-blue-300" : ready ? "text-amber-200" : "text-slate-500"
          }`}
        >
          {status}
        </span>
      </div>
      <TeamRow side={match.away} score={match.score?.away} won={awayWon} dim={homeWon} showScore={showScore} />
    </button>
  );
}

function BracketLink({ hot }) {
  const stroke = hot ? "border-amber-300" : "border-slate-600";
  const bar = hot ? "bg-amber-300" : "bg-slate-600";
  return (
    <div className="absolute inset-0" aria-hidden>
      <div className={`absolute bottom-1/4 left-0 right-1/2 top-1/4 rounded-r-md border-y-2 border-r-2 ${stroke}`} />
      <div className={`absolute left-1/2 right-0 top-1/2 h-0.5 -translate-y-1/2 ${bar}`} />
    </div>
  );
}

function ChampionPlate({ champion }) {
  return (
    <div
      className={`flex h-24 w-full flex-col items-center justify-center rounded-2xl border px-3 text-center ${
        champion ? "border-amber-300 bg-slate-950" : "border-slate-700 bg-slate-950"
      }`}
    >
      <Trophy className={`h-5 w-5 ${champion ? "text-amber-300" : "text-slate-600"}`} aria-hidden />
      <p className="mt-1.5 max-w-full truncate text-sm font-semibold text-white">
        {champion?.name || "TBD"}
      </p>
      <p className="text-[11px] text-slate-400">
        {champion?.seed ? `Seed ${champion.seed}` : "Champion"}
      </p>
    </div>
  );
}

export default function PlayoffsPage() {
  const navigate = useNavigate();
  const { isAdmin, canTrackGames } = useAuth();
  const { currentLeague, startGame } = useLeague();
  const [teams, setTeams] = useState([]);
  const [seeds, setSeeds] = useState(emptySeeds);
  const [games, setGames] = useState([]);
  const [plays, setPlays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statTab, setStatTab] = useState("teams");
  const leagueId = currentLeague?.league_id;

  useEffect(() => {
    if (!leagueId) return undefined;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        invalidateLeagueSeason(leagueId);
        const [season, bracketResult] = await Promise.all([
          loadLeagueSeason(leagueId),
          supabase.from("Bracket").select("*").eq("league_id", leagueId).maybeSingle(),
        ]);
        if (cancelled) return;
        if (bracketResult.error) throw new Error(bracketResult.error.message);
        setTeams(season.teams || []);
        setSeeds(seedsFromRow(bracketResult.data));
        setGames((season.games || []).filter((game) => game.bracket_slot || game.playoff === true));
        const playoffIds = new Set(
          (season.games || [])
            .filter((game) => game.bracket_slot || game.playoff === true)
            .map((game) => game.game_id),
        );
        setPlays((season.plays || []).filter((play) => playoffIds.has(play.game_id)));
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load the bracket.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [leagueId]);

  const matches = useMemo(
    () => buildBracket({ seeds, teams, games, plays }),
    [seeds, teams, games, plays],
  );
  const startedSlots = useMemo(
    () => new Set(games.map((game) => game.bracket_slot).filter(Boolean)),
    [games],
  );
  const champion = matches.final?.winner || null;

  const saveSeed = async (seed, value) => {
    const next = { ...seeds, [seed]: value };
    const chosen = SEED_NUMBERS.map((n) => next[n]).filter(Boolean);
    if (new Set(chosen).size !== chosen.length) {
      setError("Each team can only hold one seed.");
      return;
    }
    setSeeds(next);
    setError("");
    const row = { league_id: leagueId };
    for (const n of SEED_NUMBERS) row[seedColumn(n)] = next[n] ? Number(next[n]) : null;
    const { error: saveError } = await supabase.from("Bracket").upsert(row, { onConflict: "league_id" });
    if (saveError) setError(saveError.message || "Could not save that seed.");
  };

  const openMatch = (match) => {
    if (match.game) {
      if (canTrackGames) {
        startGame(match.game.game_id);
        navigate("/game");
      } else {
        navigate(`/games/${match.game.game_id}`);
      }
      return;
    }
    if (!canTrackGames || !match.home || !match.away) return;
    const params = new URLSearchParams({
      slot: match.id,
      home: String(match.home.team_id),
      away: String(match.away.team_id),
    });
    navigate(`/start-game?${params.toString()}`);
  };

  if (!currentLeague) {
    return (
      <div className="bg-slate-900 pt-4 sm:pt-5 pb-8">
        <p className="max-w-6xl mx-auto px-4 text-slate-400 text-center animate-pulse">Loading...</p>
      </div>
    );
  }

  if (currentLeague.show_playoffs !== true) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="bg-slate-900 text-white pt-4 sm:pt-5 pb-8">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        <header>
          <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">Playoffs</h1>
          <p className="text-slate-400 text-sm sm:text-base">
            {currentLeague.name}. Games started here stay out of the regular-season stats and standings, and they count in power rankings.
          </p>
        </header>

        {error && (
          <div className="bg-red-600/20 border border-red-600 text-red-300 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <section className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
          <div className="px-4 py-4 border-b border-slate-700">
            <h2 className="text-xl font-bold text-white">Seeds</h2>
            <p className="text-sm text-slate-400 mt-1">
              {isAdmin
                ? "Place each team in a seed. Quarterfinals are 1 vs 8, 4 vs 5, 2 vs 7, and 3 vs 6."
                : "An admin sets the eight seeds. Stat keepers start each game from the bracket."}
            </p>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SEED_NUMBERS.map((seed) => {
              const locked = startedSlots.has(slotForSeed(seed));
              return (
                <label key={seed} className="flex flex-col gap-1 text-sm text-slate-300">
                  <span className="font-semibold">Seed {seed}</span>
                  {isAdmin ? (
                    <select
                      value={seeds[seed]}
                      disabled={locked || loading}
                      onChange={(e) => saveSeed(seed, e.target.value)}
                      className="min-h-11 bg-slate-900 border border-slate-600 rounded-lg px-3 text-white disabled:opacity-60"
                    >
                      <option value="">Empty</option>
                      {teams.map((team) => (
                        <option key={team.team_id} value={team.team_id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="min-h-11 flex items-center rounded-lg border border-slate-700 bg-slate-900/60 px-3 text-white">
                      {teams.find((team) => String(team.team_id) === String(seeds[seed]))?.name || "Empty"}
                    </p>
                  )}
                  {locked && (
                    <span className="text-[11px] text-slate-500">Quarterfinal already started</span>
                  )}
                </label>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-950/50 overflow-hidden">
          <div className="px-4 py-4 border-b border-slate-700">
            <h2 className="text-xl font-bold text-white">Bracket</h2>
          </div>
          {loading ? (
            <p className="px-4 py-8 text-slate-400 text-center animate-pulse">Loading bracket...</p>
          ) : (
            <div className="overflow-x-auto px-4 py-5">
              <div
                className="grid w-max items-center gap-x-0"
                style={{
                  gridTemplateColumns: "14rem 2.25rem 14rem 2.25rem 14rem 2.25rem 11rem",
                  gridTemplateRows: "auto repeat(8, 3.15rem)",
                }}
              >
                <p className="col-start-1 row-start-1 pb-3 text-sm font-semibold text-slate-300">Quarterfinals</p>
                <p className="col-start-3 row-start-1 pb-3 text-sm font-semibold text-slate-300">Semifinals</p>
                <p className="col-start-5 row-start-1 pb-3 text-sm font-semibold text-slate-300">Final</p>
                <p className="col-start-7 row-start-1 pb-3 text-sm font-semibold text-slate-300">Champion</p>

                <div className="col-start-1 row-start-2 row-span-2 self-center">
                  <MatchCard match={matches.qf1} canTrack={canTrackGames} onOpen={openMatch} />
                </div>
                <div className="relative col-start-2 row-start-2 row-span-4 self-stretch">
                  <BracketLink hot={Boolean(matches.sf1?.home && matches.sf1?.away)} />
                </div>
                <div className="col-start-1 row-start-4 row-span-2 self-center">
                  <MatchCard match={matches.qf2} canTrack={canTrackGames} onOpen={openMatch} />
                </div>
                <div className="col-start-3 row-start-2 row-span-4 self-center">
                  <MatchCard match={matches.sf1} canTrack={canTrackGames} onOpen={openMatch} />
                </div>

                <div className="col-start-1 row-start-6 row-span-2 self-center">
                  <MatchCard match={matches.qf3} canTrack={canTrackGames} onOpen={openMatch} />
                </div>
                <div className="relative col-start-2 row-start-6 row-span-4 self-stretch">
                  <BracketLink hot={Boolean(matches.sf2?.home && matches.sf2?.away)} />
                </div>
                <div className="col-start-1 row-start-8 row-span-2 self-center">
                  <MatchCard match={matches.qf4} canTrack={canTrackGames} onOpen={openMatch} />
                </div>
                <div className="col-start-3 row-start-6 row-span-4 self-center">
                  <MatchCard match={matches.sf2} canTrack={canTrackGames} onOpen={openMatch} />
                </div>

                <div className="relative col-start-4 row-start-2 row-span-8 self-stretch">
                  <BracketLink hot={Boolean(matches.final?.home && matches.final?.away)} />
                </div>
                <div className="col-start-5 row-start-2 row-span-8 self-center">
                  <MatchCard match={matches.final} canTrack={canTrackGames} onOpen={openMatch} />
                </div>
                <div className="relative col-start-6 row-start-2 row-span-8 self-stretch" aria-hidden>
                  <div className={`absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 ${champion ? "bg-amber-300" : "bg-slate-600"}`} />
                </div>
                <div className="col-start-7 row-start-2 row-span-8 self-center">
                  <ChampionPlate champion={champion} />
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Playoff stats</h2>
            <p className="text-sm text-slate-400 mt-1">These numbers come only from games started in this bracket.</p>
          </div>
          <div className="flex bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            {STAT_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = statTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 text-sm font-medium min-h-11 ${
                    active ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-700"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          {statTab === "teams" && <TeamStats phase="playoff" />}
          {statTab === "players" && <PlayerStats phase="playoff" />}
          {statTab === "leaders" && <LeagueLeaders phase="playoff" />}
        </section>
      </div>
    </div>
  );
}
