create index if not exists play_game_id_idx on public."Play" (game_id, play_id);

create or replace function public.log_live_play(
  p_game_id bigint,
  p_offense_team bigint,
  p_defense_team bigint,
  p_play_type text,
  p_outcome text,
  p_first_half boolean,
  p_overtime boolean,
  p_is_conversion boolean,
  p_conv_points smallint,
  p_home_good_play boolean,
  p_penalty_team_id bigint,
  p_yard_line bigint,
  p_new_yard_line bigint,
  p_down integer,
  p_distance bigint,
  p_participants jsonb
) returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_id bigint;
begin
  insert into public."Play" (
    game_id, offense_team, defense_team, play_type, outcome,
    first_half, overtime, is_conversion, conv_points, home_good_play,
    penalty_team_id, yard_line, new_yard_line, down, distance
  ) values (
    p_game_id, p_offense_team, p_defense_team, p_play_type, p_outcome,
    p_first_half, p_overtime, p_is_conversion, p_conv_points, p_home_good_play,
    p_penalty_team_id, p_yard_line, p_new_yard_line, p_down, p_distance
  )
  returning play_id into new_id;

  if p_participants is not null and jsonb_typeof(p_participants) = 'array' and jsonb_array_length(p_participants) > 0 then
    insert into public."Participants" (play_id, player_id, role)
    select new_id, (item->>'player_id')::bigint, item->>'role'
    from jsonb_array_elements(p_participants) as item;
  end if;

  return new_id;
end;
$$;

grant execute on function public.log_live_play(
  bigint, bigint, bigint, text, text, boolean, boolean, boolean, smallint, boolean, bigint, bigint, bigint, integer, bigint, jsonb
) to anon, authenticated, service_role;
