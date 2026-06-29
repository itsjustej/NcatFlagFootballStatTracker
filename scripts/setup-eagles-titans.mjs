import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ofuczcccbvffeetkacoz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mdWN6Y2NjYnZmZmVldGthY296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNTM5OTAsImV4cCI6MjA5MzkyOTk5MH0.iYb7Fu5-tyeeagZEzALZgE0n20Z7RKzfpXjuH01VC8c',
);

const EAGLES = {
  name: 'Eagles',
  players: [
    [1, 'Saanvi Kadiyala'],
    [2, 'Audrey Jensen'],
    [3, 'Keljen McCants'],
    [4, 'McLain Smith'],
    [5, 'Alana Calhoun'],
    [6, 'Gabby Michel'],
    [7, 'Kendal Mones'],
    [8, 'Caroline Marshall'],
    [9, 'Braelyn Swanick'],
    [10, 'Elle Redmond'],
    [11, 'Kaitlyn Davis'],
    [12, 'Kaitlyn Weis'],
    [13, 'Lyla Allen'],
    [14, 'Emrie Van Gelder'],
    [15, 'Ava Thompson'],
    [16, 'Klara Van Aarde'],
    [17, 'Jessie De Groodt'],
    [18, 'Kellee McCants'],
    [19, 'Maggie Jaeggi'],
    [20, 'Alliyah Holmes'],
    [21, 'Kylie Parsons'],
    [22, 'Carson McElroy'],
    [23, 'Kirby Uher'],
    [24, 'Mimi Nwozo'],
    [25, 'Amelia White'],
    [26, 'Haley Carpenter'],
    [27, 'Avery Huard'],
    [28, 'Julianna Suarez'],
    [29, 'Miller Harcourt'],
  ],
};

const TITANS = {
  name: 'Titans',
  players: [
    [1, 'Alex Bilson'],
    [3, 'Chelsea Lewis'],
    [4, 'Charlotte Davis'],
    [5, 'Hannah Daley'],
    [6, 'Maggie Sullivan'],
    [7, 'Amelia Comeaux'],
    [8, 'Avery Fifer'],
    [10, 'Sydney Riepe'],
    [11, 'Libby Vola'],
    [12, 'Allie Nevle'],
    [13, 'Presley Carter'],
    [14, 'Addison Wickremesekera'],
    [15, 'Morgan Daley'],
    [16, 'Abigail White'],
    [17, 'Isabella Feliberty'],
    [18, 'Naomi Ritzmann'],
    [21, 'Caitlyn Ymbras'],
    [22, 'Catherine Darr'],
    [23, 'Adalyn Kramer'],
    [24, 'McKenna Brown'],
    [25, 'Addy Wilson'],
    [26, 'Claire Landry'],
    [27, 'Addie Spak'],
  ],
};

async function ensureLeague() {
  const leagueName = 'NCAT Flag Football League';
  const { data: existing } = await supabase
    .from('League')
    .select('*')
    .eq('name', leagueName)
    .maybeSingle();

  if (existing) return existing.league_id;

  const { data, error } = await supabase
    .from('League')
    .insert([{ name: leagueName }])
    .select()
    .single();

  if (error) throw new Error(`League insert failed: ${error.message}`);
  return data.league_id;
}

async function ensureTeam(leagueId, teamDef) {
  const { data: existingInLeague } = await supabase
    .from('Team')
    .select('team_id, name')
    .eq('league_id', leagueId)
    .eq('name', teamDef.name)
    .maybeSingle();

  if (existingInLeague) {
    console.log(`Team "${teamDef.name}" already exists in league (id ${existingInLeague.team_id})`);
    return existingInLeague.team_id;
  }

  const { data: nameConflict } = await supabase
    .from('Team')
    .select('team_id, league_id')
    .eq('name', teamDef.name)
    .maybeSingle();

  if (nameConflict) {
    throw new Error(
      `Team name "${teamDef.name}" already used in league ${nameConflict.league_id}. Rename or delete first.`,
    );
  }

  const { data, error } = await supabase
    .from('Team')
    .insert([{ name: teamDef.name, league_id: leagueId }])
    .select()
    .single();

  if (error) throw new Error(`Team insert failed: ${error.message}`);
  console.log(`Created team "${teamDef.name}" (id ${data.team_id})`);
  return data.team_id;
}

async function ensurePlayers(teamId, players) {
  const { data: existing } = await supabase
    .from('Player')
    .select('player_id, name')
    .eq('team_id', teamId);

  const byName = new Map((existing || []).map((p) => [p.name, p.player_id]));
  const result = [];

  for (const [jersey, name] of players) {
    let playerId = byName.get(name);
    if (!playerId) {
      const { data, error } = await supabase
        .from('Player')
        .insert([{ name, team_id: teamId }])
        .select()
        .single();
      if (error) throw new Error(`Player insert failed (${name}): ${error.message}`);
      playerId = data.player_id;
      console.log(`  Added player #${jersey} ${name} (id ${playerId})`);
    }
    result.push({ player_id: playerId, jersey, name });
  }

  return result;
}

async function startGame(leagueId, homeTeamId, awayTeamId, rosterEntries) {
  const { data: gameRow, error: gameError } = await supabase
    .from('Game')
    .insert([{
      league_id: leagueId,
      home_team: homeTeamId,
      away_team: awayTeamId,
      opening_possession: 'home',
      home_attacks_right: true,
    }])
    .select()
    .single();

  if (gameError) throw new Error(`Game insert failed: ${gameError.message}`);

  const rosterRows = rosterEntries.map(({ player_id, jersey }) => ({
    game_id: gameRow.game_id,
    player_id,
    jersey,
  }));

  const { error: rosterError } = await supabase.from('Roster').insert(rosterRows);
  if (rosterError) throw new Error(`Roster insert failed: ${rosterError.message}`);

  return gameRow.game_id;
}

async function main() {
  console.log('Fetching existing leagues…');
  const { data: leagues } = await supabase.from('League').select('*').order('league_id');
  console.log('Leagues:', leagues?.map((l) => `${l.league_id}: ${l.name}`).join(', ') || 'none');

  const leagueId = await ensureLeague();
  console.log(`Using league_id ${leagueId}`);

  const eaglesId = await ensureTeam(leagueId, EAGLES);
  const titansId = await ensureTeam(leagueId, TITANS);

  console.log('\nEagles roster:');
  const eaglesRoster = await ensurePlayers(eaglesId, EAGLES.players);
  console.log('\nTitans roster:');
  const titansRoster = await ensurePlayers(titansId, TITANS.players);

  const gameId = await startGame(leagueId, eaglesId, titansId, [...eaglesRoster, ...titansRoster]);

  console.log('\n✓ Done');
  console.log(`  League ID:  ${leagueId}`);
  console.log(`  Eagles ID:  ${eaglesId} (${eaglesRoster.length} players)`);
  console.log(`  Titans ID:  ${titansId} (${titansRoster.length} players)`);
  console.log(`  Game ID:    ${gameId} (Eagles home vs Titans away)`);
  console.log(`\nSwitch to league "${leagueName}" in Settings if needed, then open game ${gameId}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
