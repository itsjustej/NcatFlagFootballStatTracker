-- Deleting a season removes its teams. Plays and roster rows have to follow,
-- or the offense-team and player links block the delete.

alter table public."Play" drop constraint "Play_offense_team_fkey";
alter table public."Play"
  add constraint "Play_offense_team_fkey"
  foreign key (offense_team) references public."Team"(team_id)
  on update cascade on delete cascade;

alter table public."Roster" drop constraint "game_roster_player_id_fkey";
alter table public."Roster"
  add constraint "game_roster_player_id_fkey"
  foreign key (player_id) references public."Player"(player_id)
  on update cascade on delete cascade;
