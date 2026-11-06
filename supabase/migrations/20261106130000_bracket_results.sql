alter table public."Bracket"
  add column if not exists results jsonb not null default '{}'::jsonb;
