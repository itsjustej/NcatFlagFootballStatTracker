alter table public."Game"
  add column if not exists played_on date;

create policy game_update on public."Game"
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());
