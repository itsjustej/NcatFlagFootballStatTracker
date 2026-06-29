import React, { useState, useEffect } from "react";
import { ConfirmDeleteDialog } from "../components/teams/ConfirmDeleteDialog";
import TeamList from "../components/teams/TeamList";
import { CreateTeamDialog } from "../components/teams/CreateTeamDialog";
import { EditTeamDialog } from "../components/teams/EditTeamDialog";
import { Plus } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useLeague } from "../context/LeagueContext";
import { useAuth } from "../auth/AuthContext";

export default function TeamsPage() {
  const { currentLeague } = useLeague();
  const { canDelete } = useAuth();
  const [teams, setTeams] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    if (!currentLeague) return;
    fetchTeams();
  }, [currentLeague]);

  const fetchTeams = async () => {
    const { data: teamsData, error: teamsError } = await supabase
      .from("Team")
      .select("*")
      .eq("league_id", currentLeague.league_id);

    if (teamsError) { console.error(teamsError); return; }

    const { data: playersData, error: playersError } = await supabase
      .from("Player")
      .select("*");

    if (playersError) { console.error(playersError); return; }

    const formatted = teamsData.map((t) => ({
      id: t.team_id,
      name: t.name,
      players: playersData
        .filter((p) => p.team_id === t.team_id)
        .map((p) => ({
          id: p.player_id,
          name: p.name,
        })),
    }));

    setTeams(formatted);
  };

  const handleCreate = async (name) => {
    const { data, error } = await supabase
      .from("Team")
      .insert([{ name, league_id: currentLeague.league_id }])
      .select()
      .single();

    if (error) { console.error(error); return; }

    setTeams([...teams, { id: data.team_id, name: data.name, players: [] }]);
    setShowCreate(false);
  };

  const handleUpdate = async (id, name) => {
    const { data, error } = await supabase
      .from("Team")
      .update({ name })
      .eq("team_id", id)
      .select()
      .single();

    if (error) { console.error(error); return; }

    setTeams(teams.map((t) =>
      t.id === id ? { ...t, name: data.name } : t
    ));
    setEditingTeam(null);
  };

  const handleDelete = async (id) => {
    if (!canDelete) return;
    const { data: playData } = await supabase
      .from("Play")
      .select("play_id")
      .or(`offense_team.eq.${id},defense_team.eq.${id}`);

    if (playData?.length > 0) {
      const playIds = playData.map((p) => p.play_id);
      await supabase.from("Participants").delete().in("play_id", playIds);
      await supabase.from("Play").delete().in("play_id", playIds);
    }

    await supabase.from("Game").delete().or(`home_team.eq.${id},away_team.eq.${id}`);
    await supabase.from("Player").delete().eq("team_id", id);
    await supabase.from("Team").delete().eq("team_id", id);

    setTeams(teams.filter((t) => t.id !== id));
    setConfirmDelete(null);
  };

  const handleAddPlayer = async (teamId, name) => {
    const { data, error } = await supabase
      .from("Player")
      .insert([{ name, team_id: teamId }])
      .select()
      .single();

    if (error) { console.error(error); return; }

    setTeams(teams.map((t) =>
      t.id === teamId
        ? { ...t, players: [...t.players, { id: data.player_id, name: data.name }] }
        : t
    ));
  };

  const handleRemovePlayer = async (teamId, playerId) => {
    if (!canDelete) return;
    const { data, error } = await supabase
      .from("Participants")
      .select("play_id")
      .eq("player_id", playerId)
      .limit(1);

    if (error) { console.error(error); return; }

    if (data.length > 0) {
      alert("This player has recorded stats. Delete the game(s) they appeared in before removing them.");
      return;
    }

    const { error: deleteError } = await supabase
      .from("Player")
      .delete()
      .eq("player_id", playerId);

    if (deleteError) { console.error(deleteError); return; }

    setTeams(teams.map((t) =>
      t.id === teamId
        ? { ...t, players: t.players.filter((p) => p.id !== playerId) }
        : t
    ));
  };

  const handleUpdatePlayer = async (teamId, playerId, name) => {
    const { data, error } = await supabase
      .from("Player")
      .update({ name })
      .eq("player_id", playerId)
      .select()
      .single();

    if (error) { console.error(error); return; }

    setTeams(teams.map((t) =>
      t.id === teamId
        ? { ...t, players: t.players.map((p) => p.id === playerId ? { ...p, name: data.name } : p) }
        : t
    ));
  };

  if (!currentLeague) return <div className="min-h-screen bg-slate-900 pt-24 px-6 text-white">Loading...</div>;

  return (
    <div className="min-h-[100dvh] bg-slate-900/95 text-white pt-4 sm:pt-6 px-4 sm:px-6 pb-8">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 sm:mb-10">
        <div>
          <h1 className="text-3xl sm:text-5xl font-bold">Manage Teams</h1>
          <p className="text-slate-400 mt-2 text-base sm:text-lg">
            {currentLeague.name} — Create teams, manage rosters, and configure players
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-3 bg-blue-700 hover:bg-blue-800 rounded-lg flex items-center justify-center gap-2 text-white font-semibold min-h-[44px] shrink-0"
        >
          <Plus className="w-5 h-5" />
          New Team
        </button>
      </div>

      <div className="max-w-6xl mx-auto">
        <TeamList
          teams={teams}
          canDelete={canDelete}
          onEdit={setEditingTeam}
          onRequestDelete={canDelete ? setConfirmDelete : undefined}
          onAddPlayer={handleAddPlayer}
          onRemovePlayer={handleRemovePlayer}
          onUpdatePlayer={handleUpdatePlayer}
        />
      </div>

      {confirmDelete && canDelete && (
        <ConfirmDeleteDialog
          onConfirm={() => handleDelete(confirmDelete)}
          onClose={() => setConfirmDelete(null)}
        />
      )}

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