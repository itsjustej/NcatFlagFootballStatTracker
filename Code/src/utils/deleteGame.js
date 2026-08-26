import { supabase } from "../supabaseClient";

export async function deleteGameById(gameId) {
  const { data: playData } = await supabase
    .from("Play")
    .select("play_id")
    .eq("game_id", gameId);

  if (playData?.length > 0) {
    const playIds = playData.map((p) => p.play_id);
    await supabase.from("Participants").delete().in("play_id", playIds);
    await supabase.from("Play").delete().in("play_id", playIds);
  }

  const { error: rosterError } = await supabase.from("Roster").delete().eq("game_id", gameId);
  if (rosterError) console.error("Could not clear roster rows:", rosterError);

  const { error } = await supabase.from("Game").delete().eq("game_id", gameId);
  if (error) throw error;
}
