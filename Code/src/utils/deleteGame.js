import { supabase } from "../supabaseClient";
import { chunkIds, fetchAllRows } from "./leagueSeason";

export async function deleteGameById(gameId) {
  const plays = await fetchAllRows(() =>
    supabase.from("Play").select("play_id").eq("game_id", gameId).order("play_id")
  );
  const playIds = plays.map((play) => play.play_id);

  for (const slice of chunkIds(playIds)) {
    const { error: creditError } = await supabase.from("Participants").delete().in("play_id", slice);
    if (creditError) throw creditError;
    const { error: playError } = await supabase.from("Play").delete().in("play_id", slice);
    if (playError) throw playError;
  }

  const { error: rosterError } = await supabase.from("Roster").delete().eq("game_id", gameId);
  if (rosterError) console.error("Could not clear roster rows:", rosterError);

  const { error } = await supabase.from("Game").delete().eq("game_id", gameId);
  if (error) throw error;
}
