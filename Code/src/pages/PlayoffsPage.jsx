import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { BarChart3, Trophy, Users, X } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../auth/AuthContext";
import { useLeague } from "../context/LeagueContext";
import TeamStats from "../components/stats/TeamStats";
import PlayerStats from "../components/stats/PlayerStats";
import LeagueLeaders from "../components/stats/LeagueLeaders";
import { invalidateLeagueSeason, loadLeagueSeason } from "../utils/leagueSeason";
import {
  NEXT_SLOT,
  SEED_NUMBERS,
  advancingTeamId,
  buildBracket,
  emptySeeds,
  resultsFromRow,
  seedColumn,
  seedsFromRow,
  slotForSeed,
} from "../utils/bracket";

const STAT_TABS = [
  { id: "teams", label: "Teams", icon: BarChart3 },
  { id: "players", label: "Players", icon: Users },
  { id: "leaders", label: "Leaders", icon: Trophy },
];

/** Playoff stat boards stay wired up. The bracket is score-only until this is turned back on. */
const SHOW_PLAYOFF_STATS = false;

function matchLabel(match, canEdit) {
  const score = match.score;
  if (!score?.played) {
    return canEdit && match.home && match.away
      ? { text: "Score", tone: "ready" }
      : { text: "Waiting", tone: "wait" };
  }
  if (score.home === score.away) {
    return score.home === 0
      ? { text: "No advance", tone: "tie" }
      : { text: "Tied", tone: "tie" };
  }
  return { text: `${match.winner?.name || "Winner"} Wins`, tone: "win" };
}

function TeamRow({ side, score, won, dim, showScore, showSeed }) {
  return (
    <div className={`flex h-8 items-center gap-2 px-2.5 ${won ? "bg-amber-300/10" : ""}`}>
      {showSeed && (
        <span
          className={`grid h-5 w-5 shrink-0 place-items-center rounded-md text-[10px] font-bold tabular-nums ${
            side?.seed
              ? "bg-slate-800 text-slate-200 ring-1 ring-inset ring-slate-600"
              : "bg-slate-900 text-slate-600 ring-1 ring-inset ring-slate-800"
          }`}
        >
          {side?.seed || "–"}
        </span>
      )}
      <span
        className={`min-w-0 flex-1 truncate text-sm ${
          won ? "font-semibold text-white" : side ? (dim ? "text-slate-400" : "text-slate-100") : "text-slate-500"
        }`}
      >
        {side?.name || "TBD"}
      </span>
      <span className={`w-8 text-right text-sm font-bold tabular-nums ${won ? "text-amber-200" : "text-slate-300"}`}>
        {showScore ? score : ""}
      </span>
    </div>
  );
}

function ByeCard({ match, showSeed }) {
  return (
    <div className="flex h-[5.25rem] w-full flex-col overflow-hidden rounded-xl border border-amber-300/40 bg-slate-950 text-left">
      <TeamRow side={match.winner} won showSeed={showSeed} />
      <div className="flex h-5 items-center justify-center border-y border-slate-800 text-[10px] font-semibold leading-none text-amber-200">
        Bye
      </div>
      <div className="flex h-8 items-center px-2.5 text-sm text-slate-500">Skips ahead</div>
    </div>
  );
}

function MatchCard({ match, canEdit, showSeed, onOpen }) {
  if (match.bye) return <ByeCard match={match} showSeed={showSeed} />;
  const ready = Boolean(match.home && match.away);
  const interactive = canEdit && ready && !match.vacated;
  const homeWon = match.winner && match.home && String(match.winner.team_id) === String(match.home.team_id);
  const awayWon = match.winner && match.away && String(match.winner.team_id) === String(match.away.team_id);
  const showScore = Boolean(match.score?.played);
  const label = matchLabel(match, canEdit);
  const homeName = match.home?.name || "TBD";
  const awayName = match.away?.name || "TBD";
  const Tag = interactive ? "button" : "div";
  const labelTone = label.tone === "win"
    ? "text-amber-200"
    : label.tone === "tie"
      ? "text-slate-300"
      : label.tone === "ready"
        ? "text-amber-200"
        : "text-slate-500";

  return (
    <Tag
      type={interactive ? "button" : undefined}
      onClick={interactive ? () => onOpen(match) : undefined}
      aria-label={interactive ? `${label.text}: ${homeName} versus ${awayName}` : undefined}
      className={`flex h-[5.25rem] w-full flex-col overflow-hidden rounded-xl border text-left ${
        !interactive
          ? "border-slate-700 bg-slate-950"
          : showScore
            ? "border-slate-500 bg-slate-950 hover:border-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
            : "border-amber-400/50 bg-slate-950 hover:border-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
      }`}
    >
      <TeamRow side={match.home} score={match.score?.home} won={homeWon} dim={awayWon} showScore={showScore} showSeed={showSeed} />
      <div className={`flex h-5 min-w-0 items-center justify-center border-y border-slate-800 px-2 text-[10px] font-semibold leading-none ${labelTone}`}>
        <span className="truncate">{label.text}</span>
      </div>
      <TeamRow side={match.away} score={match.score?.away} won={awayWon} dim={homeWon} showScore={showScore} showSeed={showSeed} />
    </Tag>
  );
}

function ScoreDialog({ match, homeScore, awayScore, saving, onHomeScore, onAwayScore, onSave, onClear, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <form
        className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-800 p-5 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-white">{match.round}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-300">
          Enter both scores. The winner moves on. Use 0–0 if neither team should advance.
        </p>
        <div className="space-y-3">
          <label className="block text-sm text-slate-300">
            <span className="mb-1 block font-semibold text-white">{match.home?.name}</span>
            <input
              inputMode="numeric"
              autoFocus
              value={homeScore}
              onChange={(event) => onHomeScore(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 text-white"
            />
          </label>
          <label className="block text-sm text-slate-300">
            <span className="mb-1 block font-semibold text-white">{match.away?.name}</span>
            <input
              inputMode="numeric"
              value={awayScore}
              onChange={(event) => onAwayScore(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 text-white"
            />
          </label>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="min-h-11 flex-1 rounded-lg bg-blue-600 py-3 text-white hover:bg-blue-500 disabled:opacity-50"
          >
            Save score
          </button>
          {match.entered && (
            <button
              type="button"
              disabled={saving}
              onClick={onClear}
              className="min-h-11 rounded-lg bg-slate-700 px-4 py-3 text-white hover:bg-slate-600 disabled:opacity-50"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg bg-slate-700 px-4 py-3 text-white hover:bg-slate-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
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

function ChampionPlate({ champion, showSeed }) {
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
        {showSeed && champion?.seed ? `Seed ${champion.seed}` : "Champion"}
      </p>
    </div>
  );
}

function SeedsDialog({ seeds, teams, loading, scoredSlots, onChange, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-white">Seeds</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-300">
          Place each team in a seed. Quarterfinals are 1 vs 8, 4 vs 5, 2 vs 7, and 3 vs 6.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SEED_NUMBERS.map((seed) => {
            const locked = scoredSlots.has(slotForSeed(seed));
            return (
              <label key={seed} className="flex flex-col gap-1 text-sm text-slate-300">
                <span className="font-semibold">Seed {seed}</span>
                <select
                  value={seeds[seed]}
                  disabled={locked || loading}
                  onChange={(event) => onChange(seed, event.target.value)}
                  className="min-h-11 rounded-lg border border-slate-600 bg-slate-900 px-3 text-white disabled:opacity-60"
                >
                  <option value="">Empty</option>
                  {teams.map((team) => (
                    <option key={team.team_id} value={team.team_id}>
                      {team.name}
                    </option>
                  ))}
                </select>
                {locked && (
                  <span className="text-[11px] text-slate-500">This matchup is already scored</span>
                )}
              </label>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 min-h-11 w-full rounded-lg bg-blue-600 py-3 text-white hover:bg-blue-500"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function wholeScore(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  if (!/^\d+$/.test(value.trim())) return null;
  return Number(value.trim());
}

export default function PlayoffsPage() {
  const { isAdmin } = useAuth();
  const { currentLeague } = useLeague();
  const [teams, setTeams] = useState([]);
  const [seeds, setSeeds] = useState(emptySeeds);
  const [results, setResults] = useState({});
  const [games, setGames] = useState([]);
  const [plays, setPlays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingScore, setSavingScore] = useState(false);
  const [error, setError] = useState("");
  const [statTab, setStatTab] = useState("teams");
  const [scoring, setScoring] = useState(null);
  const [seedsOpen, setSeedsOpen] = useState(false);
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
        setResults(resultsFromRow(bracketResult.data));
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
    () => buildBracket({ seeds, teams, games, plays, results }),
    [seeds, teams, games, plays, results],
  );
  const scoredSlots = useMemo(() => {
    const slots = new Set(games.map((game) => game.bracket_slot).filter(Boolean));
    for (const slot of Object.keys(results)) slots.add(slot);
    return slots;
  }, [games, results]);
  const champion = matches.final?.winner || null;
  const scoringMatch = scoring ? matches[scoring.slot] : null;

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

  const persistResults = async (next) => {
    const { data, error: saveError } = await supabase
      .from("Bracket")
      .upsert({ league_id: leagueId, results: next }, { onConflict: "league_id" })
      .select("results")
      .single();
    if (saveError) return saveError.message || "Could not save that score.";
    setResults(resultsFromRow(data));
    return "";
  };

  const openScore = (match) => {
    setError("");
    setScoring({
      slot: match.id,
      homeScore: match.score?.played ? String(match.score.home) : "",
      awayScore: match.score?.played ? String(match.score.away) : "",
    });
  };

  const saveScore = async () => {
    if (!scoringMatch?.home || !scoringMatch?.away) return;
    const homeScore = wholeScore(scoring.homeScore);
    const awayScore = wholeScore(scoring.awayScore);
    if (homeScore == null || awayScore == null) {
      setError("Enter a whole number for both teams. Use 0–0 if neither team should advance.");
      return;
    }
    const nextSlot = NEXT_SLOT[scoringMatch.id];
    const previousAdvance = advancingTeamId(results[scoringMatch.id]);
    const nextAdvance = homeScore === awayScore
      ? null
      : homeScore > awayScore ? scoringMatch.home.team_id : scoringMatch.away.team_id;
    if (nextSlot && results[nextSlot] && String(previousAdvance ?? "") !== String(nextAdvance ?? "")) {
      setError("Clear the next game before changing who advances.");
      return;
    }
    setSavingScore(true);
    setError("");
    const next = {
      ...results,
      [scoringMatch.id]: {
        home: scoringMatch.home.team_id,
        away: scoringMatch.away.team_id,
        homeScore,
        awayScore,
      },
    };
    const message = await persistResults(next);
    setSavingScore(false);
    if (message) {
      setError(message);
      return;
    }
    setScoring(null);
  };

  const clearScore = async () => {
    if (!scoringMatch) return;
    const nextSlot = NEXT_SLOT[scoringMatch.id];
    if (nextSlot && results[nextSlot]) {
      setError("Clear the next game before clearing this one.");
      return;
    }
    setSavingScore(true);
    setError("");
    const next = { ...results };
    delete next[scoringMatch.id];
    const message = await persistResults(next);
    setSavingScore(false);
    if (message) {
      setError(message);
      return;
    }
    setScoring(null);
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
            {isAdmin
              ? `${currentLeague.name}. Enter each score on the bracket. The winner moves on. A 0–0 means neither team advances, and the team that would have played them skips ahead.`
              : `${currentLeague.name}. The winner moves on. A team with no opponent skips ahead.`}
          </p>
        </header>

        {error && (
          <div className="bg-red-600/20 border border-red-600 text-red-300 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <section className="rounded-xl border border-slate-700 bg-slate-950/50 overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-700 px-4 py-4">
            <h2 className="text-xl font-bold text-white">Bracket</h2>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setSeedsOpen(true)}
                className="min-h-11 rounded-lg border border-slate-600 px-3 text-sm font-semibold text-slate-200 hover:border-slate-400 hover:text-white"
              >
                {SEED_NUMBERS.every((seed) => seeds[seed]) ? "Edit seeds" : "Set seeds"}
              </button>
            )}
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
                  <MatchCard match={matches.qf1} canEdit={isAdmin} showSeed={isAdmin} onOpen={openScore} />
                </div>
                <div className="relative col-start-2 row-start-2 row-span-4 self-stretch">
                  <BracketLink hot={Boolean(matches.sf1?.winner || (matches.sf1?.home && matches.sf1?.away))} />
                </div>
                <div className="col-start-1 row-start-4 row-span-2 self-center">
                  <MatchCard match={matches.qf2} canEdit={isAdmin} showSeed={isAdmin} onOpen={openScore} />
                </div>
                <div className="col-start-3 row-start-2 row-span-4 self-center">
                  <MatchCard match={matches.sf1} canEdit={isAdmin} showSeed={isAdmin} onOpen={openScore} />
                </div>

                <div className="col-start-1 row-start-6 row-span-2 self-center">
                  <MatchCard match={matches.qf3} canEdit={isAdmin} showSeed={isAdmin} onOpen={openScore} />
                </div>
                <div className="relative col-start-2 row-start-6 row-span-4 self-stretch">
                  <BracketLink hot={Boolean(matches.sf2?.winner || (matches.sf2?.home && matches.sf2?.away))} />
                </div>
                <div className="col-start-1 row-start-8 row-span-2 self-center">
                  <MatchCard match={matches.qf4} canEdit={isAdmin} showSeed={isAdmin} onOpen={openScore} />
                </div>
                <div className="col-start-3 row-start-6 row-span-4 self-center">
                  <MatchCard match={matches.sf2} canEdit={isAdmin} showSeed={isAdmin} onOpen={openScore} />
                </div>

                <div className="relative col-start-4 row-start-2 row-span-8 self-stretch">
                  <BracketLink hot={Boolean(matches.final?.winner || (matches.final?.home && matches.final?.away))} />
                </div>
                <div className="col-start-5 row-start-2 row-span-8 self-center">
                  <MatchCard match={matches.final} canEdit={isAdmin} showSeed={isAdmin} onOpen={openScore} />
                </div>
                <div className="relative col-start-6 row-start-2 row-span-8 self-stretch" aria-hidden>
                  <div className={`absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 ${champion ? "bg-amber-300" : "bg-slate-600"}`} />
                </div>
                <div className="col-start-7 row-start-2 row-span-8 self-center">
                  <ChampionPlate champion={champion} showSeed={isAdmin} />
                </div>
              </div>
            </div>
          )}
        </section>

        {SHOW_PLAYOFF_STATS && (
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
        )}

        {isAdmin && seedsOpen && (
          <SeedsDialog
            seeds={seeds}
            teams={teams}
            loading={loading}
            scoredSlots={scoredSlots}
            onChange={saveSeed}
            onClose={() => setSeedsOpen(false)}
          />
        )}

        {scoringMatch && (
          <ScoreDialog
            match={scoringMatch}
            homeScore={scoring.homeScore}
            awayScore={scoring.awayScore}
            saving={savingScore}
            onHomeScore={(value) => setScoring((current) => ({ ...current, homeScore: value }))}
            onAwayScore={(value) => setScoring((current) => ({ ...current, awayScore: value }))}
            onSave={saveScore}
            onClear={clearScore}
            onClose={() => setScoring(null)}
          />
        )}
      </div>
    </div>
  );
}
