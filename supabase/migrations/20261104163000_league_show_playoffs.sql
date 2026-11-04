alter table public."League"
  add column if not exists show_playoffs boolean not null default false;

drop policy if exists league_update on public."League";
create policy league_update on public."League"
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
