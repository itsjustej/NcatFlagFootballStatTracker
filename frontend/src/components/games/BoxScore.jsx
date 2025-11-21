import React from "react";

function BoxScore({ teamA, teamB }) {
  const renderTeamTable = (team) => (
    <div key={team.name} className="mb-8">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span
          className="w-4 h-4 rounded"
          style={{ backgroundColor: team.color }}
        ></span>
        {team.name}
      </h3>

      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-700 bg-slate-900">
            <tr>
              <th className="px-6 py-3 text-left text-slate-300 font-semibold">
                Player
              </th>
              <th className="px-4 py-3 text-right text-slate-300 font-semibold">
                PTS
              </th>
              <th className="px-4 py-3 text-right text-slate-300 font-semibold">
                REB
              </th>
              <th className="px-4 py-3 text-right text-slate-300 font-semibold">
                AST
              </th>
              <th className="px-4 py-3 text-right text-slate-300 font-semibold">
                STL
              </th>
              <th className="px-4 py-3 text-right text-slate-300 font-semibold">
                BLK
              </th>
              <th className="px-6 py-3 text-right text-slate-300 font-semibold">
                FOULS
              </th>
            </tr>
          </thead>

          <tbody>
            {team.players.map((player) => (
              <tr
                key={player.number}
                className="border-b border-slate-700 hover:bg-slate-700/50 transition"
              >
                <td className="px-6 py-4">
                  <div>
                    <p className="font-semibold text-white">{player.name}</p>
                    <p className="text-xs text-slate-400">#{player.number}</p>
                  </div>
                </td>
                <td className="px-4 py-4 text-right font-semibold text-white">
                  {player.points}
                </td>
                <td className="px-4 py-4 text-right font-semibold text-white">
                  {player.rebounds}
                </td>
                <td className="px-4 py-4 text-right font-semibold text-white">
                  {player.assists}
                </td>
                <td className="px-4 py-4 text-right font-semibold text-white">
                  {player.steals}
                </td>
                <td className="px-4 py-4 text-right font-semibold text-white">
                  {player.blocks}
                </td>
                <td className="px-6 py-4 text-right text-slate-400">
                  {player.fouls}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div>
      {renderTeamTable(teamA)}
      {renderTeamTable(teamB)}
    </div>
  );
}

export default BoxScore;
