alter table public."Game"
  add column if not exists forfeit boolean not null default false;
