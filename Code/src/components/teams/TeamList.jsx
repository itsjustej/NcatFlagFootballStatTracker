import React from "react";
import TeamCard from "./TeamCard";

export default function TeamList({
  teams,
  canDelete = false,
  onEdit,
  onRequestDelete,
  onAddPlayer,
  onRemovePlayer,
  onUpdatePlayer,
}) {
  if (teams.length === 0) {
    return (
      <p className="text-slate-400 text-center py-8">
        No teams created yet. Create your first team to get started.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {teams.map((team) => (
        <TeamCard
          key={team.id}
          team={team}
          canDelete={canDelete}
          onEdit={onEdit}
          onRequestDelete={onRequestDelete}
          onAddPlayer={onAddPlayer}
          onRemovePlayer={onRemovePlayer}
          onUpdatePlayer={onUpdatePlayer}
        />
      ))}
    </div>
  );
} 