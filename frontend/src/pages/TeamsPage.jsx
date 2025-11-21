import React, { useState, useEffect } from "react";
import TeamList from "../components/teams/TeamList";
import { CreateTeamDialog } from "../components/teams/CreateTeamDialog";
import { EditTeamDialog } from "../components/teams/EditTeamDialog";
import { Plus } from "lucide-react";

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);

  // ✅ Get teams + players from backend
  useEffect(() => {
    fetch("http://localhost:5000/api/teams")
      .then((res) => res.json())
      .then((raw) => {
        const formatted = raw.map((t) => ({
          id: t.TeamID,
          name: t.TeamName,
          color: t.TeamColor,
          players: t.Players.map((p) => ({
            id: p.PlayerID,
            name: p.PlayerName,
            jerseyNumber: null
          }))
        }));

        setTeams(formatted);
      })
      .catch((err) => console.error("Error loading teams:", err));
  }, []);

  // Create team (local only for now)
  const handleCreate = async (name, color) => {
  const res = await fetch("http://localhost:5000/api/teams", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      TeamName: name,
      TeamColor: color
    }),
  });

  const newTeam = await res.json();

  setTeams([...teams, {
    id: newTeam.TeamID,
    name: newTeam.TeamName,
    color: newTeam.TeamColor,
    players: []
  }]);

  setShowCreate(false);
};


  const handleUpdate = async (id, name, color) => {
  const res = await fetch(`http://localhost:5000/api/teams/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      TeamName: name,
      TeamColor: color
    })
  });

  const updated = await res.json();

  setTeams(teams.map(t =>
    t.id === id
      ? { ...t, name: updated.TeamName, color: updated.TeamColor }
      : t
  ));

  setEditingTeam(null);
};


  const handleDelete = async (id) => {
  await fetch(`http://localhost:5000/api/teams/${id}`, {
    method: "DELETE"
  });

  setTeams(teams.filter((t) => t.id !== id));
};


  const handleAddPlayer = async (teamId, name, jersey) => {
  const res = await fetch("http://localhost:5000/api/players", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      PlayerName: name,
      TeamID: teamId
    }),
  });

  const newPlayer = await res.json();

  setTeams(teams.map(t =>
    t.id === teamId
      ? {
          ...t,
          players: [
            ...t.players,
            {
              id: newPlayer.PlayerID,
              name: newPlayer.PlayerName,
              jerseyNumber: jersey || null
            }
          ]
        }
      : t
  ));
};


  const handleRemovePlayer = async (teamId, playerId) => {
  await fetch(`http://localhost:5000/api/players/${playerId}`, {
    method: "DELETE"
  });

  setTeams(teams.map(t =>
    t.id === teamId
      ? { ...t, players: t.players.filter(p => p.id !== playerId) }
      : t
  ));
};


  return (
    <div className="min-h-screen bg-slate-900/95 text-white pt-24 px-6">
      <div className="max-w-6xl mx-auto flex items-center justify-between mb-10">
        <div>
          <h1 className="text-5xl font-bold">Manage Teams</h1>
          <p className="text-slate-400 mt-2 text-lg">
            Create teams, manage rosters, and configure players
          </p>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg flex items-center gap-2 text-white font-semibold"
        >
          <Plus className="w-5 h-5" />
          New Team
        </button>
      </div>

      <div className="max-w-6xl mx-auto">
        <TeamList
          teams={teams}
          onEdit={setEditingTeam}
          onDelete={handleDelete}
          onAddPlayer={handleAddPlayer}
          onRemovePlayer={handleRemovePlayer}
        />
      </div>

      {showCreate && (
        <CreateTeamDialog
          onCreate={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}

      {editingTeam && (
        <EditTeamDialog
          team={editingTeam}
          onUpdate={handleUpdate}
          onClose={() => setEditingTeam(null)}
        />
      )}
    </div>
  );
}
