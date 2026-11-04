alter table public."Game"
  add column if not exists playoff boolean not null default false;
