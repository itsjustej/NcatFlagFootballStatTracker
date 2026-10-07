-- The website used to hide buttons by role. These rules are the same limits
-- inside the database. The role comes from the signed-in account, not the browser.

create or replace function public.app_role()
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
$$;

create or replace function public.is_member()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select public.app_role() in ('admin', 'worker', 'social')
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select public.app_role() in ('admin', 'worker')
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select public.app_role() = 'admin'
$$;

revoke all on function public.app_role() from public, anon;
revoke all on function public.is_member() from public, anon;
revoke all on function public.is_staff() from public, anon;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.app_role() to authenticated;
grant execute on function public.is_member() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_admin() to authenticated;

revoke all on table
  public."League",
  public."Team",
  public."Game",
  public."Player",
  public."Play",
  public."Participants",
  public."Roster"
from anon;

revoke execute on function public.log_live_play(
  bigint, bigint, bigint, text, text, boolean, boolean, boolean, smallint, boolean, bigint, bigint, bigint, integer, bigint, jsonb
) from anon;

alter table public."League" enable row level security;
alter table public."Team" enable row level security;
alter table public."Game" enable row level security;
alter table public."Player" enable row level security;
alter table public."Play" enable row level security;
alter table public."Participants" enable row level security;
alter table public."Roster" enable row level security;

create policy league_read on public."League"
  for select to authenticated using (public.is_member());
create policy league_insert on public."League"
  for insert to authenticated with check (public.is_staff());
create policy league_delete on public."League"
  for delete to authenticated using (public.is_admin());

create policy team_read on public."Team"
  for select to authenticated using (public.is_member());
create policy team_insert on public."Team"
  for insert to authenticated with check (public.is_staff());
create policy team_update on public."Team"
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy team_delete on public."Team"
  for delete to authenticated using (public.is_admin());

create policy game_read on public."Game"
  for select to authenticated using (public.is_member());
create policy game_insert on public."Game"
  for insert to authenticated with check (public.is_staff());
create policy game_delete on public."Game"
  for delete to authenticated using (public.is_admin());

create policy player_read on public."Player"
  for select to authenticated using (public.is_member());
create policy player_insert on public."Player"
  for insert to authenticated with check (public.is_staff());
create policy player_update on public."Player"
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy player_delete on public."Player"
  for delete to authenticated using (public.is_admin());

create policy play_read on public."Play"
  for select to authenticated using (public.is_member());
create policy play_insert on public."Play"
  for insert to authenticated with check (public.is_staff());
create policy play_delete on public."Play"
  for delete to authenticated using (public.is_staff());

create policy participants_read on public."Participants"
  for select to authenticated using (public.is_member());
create policy participants_insert on public."Participants"
  for insert to authenticated with check (public.is_staff());
create policy participants_update on public."Participants"
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy participants_delete on public."Participants"
  for delete to authenticated using (public.is_staff());

create policy roster_read on public."Roster"
  for select to authenticated using (public.is_member());
create policy roster_insert on public."Roster"
  for insert to authenticated with check (public.is_staff());
create policy roster_update on public."Roster"
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy roster_delete on public."Roster"
  for delete to authenticated using (public.is_admin());
