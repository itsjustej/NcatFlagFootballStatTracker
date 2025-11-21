import React from "react";
import TeamCard from "./TeamCard";

export default function TeamList({
  teams,
  onEdit,
  onDelete,
  onAddPlayer,
  onRemovePlayer,
}) {
  if (teams.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-lg">
        No teams created yet. Create your first team to get started.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {teams.map((team) => (
        <TeamCard
          key={team.id}
          team={team}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddPlayer={onAddPlayer}
          onRemovePlayer={onRemovePlayer}
        />
      ))}
    </div>
  );
}
