import React, { useEffect, useState } from "react";
import { useLeague } from "../../context/LeagueContext";
import { loadLeagueSeason } from "../../utils/leagueSeason";
import {
  computeLeagueStandings,
  computePowerRankings,
  computeOffenseRankings,
  computeDefenseRankings,
} from "../../utils/standingsHelpers";

const RANK_STYLES = {
  1: "bg-yellow-400 text-yellow-950",
  2: "bg-slate-300 text-slate-800",
  3: "bg-amber-700 text-amber-50",
};

function RankBadge({ rank }) {
  return (
    <div className={`flex w-6 h-6 text-[11px] sm:w-7 sm:h-7 sm:text-xs rounded-full items-center justify-center font-black tabular-nums shrink-0 ${RANK_STYLES[rank] || "text-white"}`}>
      {rank}
    </div>
  );
}

function RankingBoard({ title, rows, valueFor }) {
  return (
    <section className="min-w-0">
      <h3 className="px-1 pb-2 text-xs sm:text-sm font-bold uppercase tracking-wide text-white">{title}</h3>
      <div className="bg-slate-900/50 border border-slate-700/80 rounded-lg overflow-hidden">
        {rows.length === 0 ? (
          <p className="text-slate-500 text-sm px-3 py-3">No games played yet</p>
        ) : (
          <ol className="bg-slate-900/90">
            {rows.map((team) => (
              <li key={team.team_id} className="px-2 py-2 border-b border-slate-800/80 last:border-b-0">
                <div className="flex items-center gap-1.5">
                  <RankBadge rank={team.rank} />
                  <p className="min-w-0 flex-1 text-[13px] font-semibold text-slate-50 leading-tight truncate">{team.name}</p>
                  <span className="text-sm font-bold text-white tabular-nums shrink-0">{valueFor(team)}</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

const scoreText = (team) => (Number.isFinite(team.score) ? team.score.toFixed(1) : "—");

export default function Rankings() {
  const { currentLeague } = useLeague();
  const [boards, setBoards] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentLeague) {
      setBoards(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    loadLeagueSeason(currentLeague.league_id)
      .then(({ teams, games, plays }) => {
        if (cancelled) return;
        setBoards({
          standings: computeLeagueStandings(teams, games, plays),
          power: computePowerRankings(teams, games, plays),
          offense: computeOffenseRankings(teams, games, plays),
          defense: computeDefenseRankings(teams, games, plays),
        });
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setBoards(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentLeague]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
        <div className="px-4 py-4 border-b border-slate-700">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Rankings</h2>
        </div>
        <p className="px-4 py-8 text-slate-400 text-center animate-pulse">Loading rankings...</p>
      </div>
    );
  }

  const standings = boards?.standings || [];
  const power = boards?.power || [];
  const offense = boards?.offense || [];
  const defense = boards?.defense || [];

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
      <div className="px-4 py-4 border-b border-slate-700">
        <h2 className="text-xl sm:text-2xl font-bold text-white">Rankings</h2>
      </div>
      <div className="p-2 sm:p-4 grid grid-cols-1 lg:grid-cols-4 gap-3">
        <RankingBoard title="Standings" rows={standings} valueFor={(team) => team.record} />
        <RankingBoard title="Power" rows={power} valueFor={(team) => team.power.toFixed(1)} />
        <RankingBoard title="Offense" rows={offense} valueFor={scoreText} />
        <RankingBoard title="Defense" rows={defense} valueFor={scoreText} />
      </div>
    </div>
  );
}
