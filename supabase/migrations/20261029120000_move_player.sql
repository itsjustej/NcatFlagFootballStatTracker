-- Move a player to another team in the same league.
-- Passing p_replace_id combines that roster spot into the player who is moving:
-- their plays and jerseys follow the mover, and the duplicate row is removed.
-- Team totals stay on the plays, which still name the team that was on the field.

create or replace function public.move_player(
  p_player_id bigint,
  p_team_id bigint,
  p_replace_id bigint default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  mover public."Player"%rowtype;
  replaced public."Player"%rowtype;
  dest public."Team"%rowtype;
  credit record;
  spot record;
begin
  if not public.is_staff() then
    raise exception 'Not allowed to move players';
  end if;

  select * into mover from public."Player" where player_id = p_player_id;
  if not found then
    raise exception 'Player not found';
  end if;

  select * into dest from public."Team" where team_id = p_team_id;
  if not found then
    raise exception 'Team not found';
  end if;

  if (select league_id from public."Team" where team_id = mover.team_id) is distinct from dest.league_id then
    raise exception 'That team is in a different league';
  end if;

  if p_replace_id is null then
    if mover.team_id = p_team_id then
      raise exception 'That player is already on this team';
    end if;
  else
    if p_replace_id = p_player_id then
      raise exception 'Pick a different player to replace';
    end if;

    select * into replaced from public."Player" where player_id = p_replace_id;
    if not found then
      raise exception 'Player to replace was not found';
    end if;
    if replaced.team_id <> p_team_id then
      raise exception 'The player to replace is not on that team';
    end if;

    for credit in
      select play_id from public."Participants" where player_id = p_replace_id
    loop
      if exists (
        select 1 from public."Participants"
        where play_id = credit.play_id and player_id = p_player_id
      ) then
        delete from public."Participants"
        where play_id = credit.play_id and player_id = p_replace_id;
      else
        update public."Participants"
        set player_id = p_player_id
        where play_id = credit.play_id and player_id = p_replace_id;
      end if;
    end loop;

    for spot in
      select game_id, jersey from public."Roster" where player_id = p_replace_id
    loop
      if exists (
        select 1 from public."Roster"
        where game_id = spot.game_id and player_id = p_player_id
      ) then
        update public."Roster"
        set jersey = spot.jersey
        where game_id = spot.game_id
          and player_id = p_player_id
          and jersey is null
          and spot.jersey is not null;
        delete from public."Roster"
        where game_id = spot.game_id and player_id = p_replace_id;
      else
        update public."Roster"
        set player_id = p_player_id
        where game_id = spot.game_id and player_id = p_replace_id;
      end if;
    end loop;

    delete from public."Player" where player_id = p_replace_id;
  end if;

  update public."Player"
  set team_id = p_team_id
  where player_id = p_player_id;
end;
$$;

revoke all on function public.move_player(bigint, bigint, bigint) from public, anon;
grant execute on function public.move_player(bigint, bigint, bigint) to authenticated;
