create table if not exists public."Bracket" (
  league_id bigint primary key references public."League"(league_id) on delete cascade,
  seed_1 bigint references public."Team"(team_id) on delete set null,
  seed_2 bigint references public."Team"(team_id) on delete set null,
  seed_3 bigint references public."Team"(team_id) on delete set null,
  seed_4 bigint references public."Team"(team_id) on delete set null,
  seed_5 bigint references public."Team"(team_id) on delete set null,
  seed_6 bigint references public."Team"(team_id) on delete set null,
  seed_7 bigint references public."Team"(team_id) on delete set null,
  seed_8 bigint references public."Team"(team_id) on delete set null
);

alter table public."Game"
  add column if not exists bracket_slot text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'game_bracket_slot_check'
  ) then
    alter table public."Game"
      add constraint game_bracket_slot_check
      check (
        bracket_slot is null
        or bracket_slot in ('qf1', 'qf2', 'qf3', 'qf4', 'sf1', 'sf2', 'final')
      );
  end if;
end $$;

create unique index if not exists game_league_bracket_slot_key
  on public."Game" (league_id, bracket_slot)
  where bracket_slot is not null;

alter table public."Bracket" enable row level security;

drop policy if exists bracket_read on public."Bracket";
create policy bracket_read on public."Bracket"
  for select to authenticated using (public.is_member());

drop policy if exists bracket_insert on public."Bracket";
create policy bracket_insert on public."Bracket"
  for insert to authenticated with check (public.is_admin());

drop policy if exists bracket_update on public."Bracket";
create policy bracket_update on public."Bracket"
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists bracket_delete on public."Bracket";
create policy bracket_delete on public."Bracket"
  for delete to authenticated using (public.is_admin());

revoke all on table public."Bracket" from anon;
grant select, insert, update, delete on table public."Bracket" to authenticated;
grant select, insert, update, delete on table public."Bracket" to service_role;
