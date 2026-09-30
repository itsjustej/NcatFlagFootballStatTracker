-- Credit edits have to reach the other device without a refresh.
alter table public."Participants" replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'Participants'
  ) then
    execute 'alter publication supabase_realtime add table public."Participants"';
  end if;
end $$;
