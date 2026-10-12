-- Public sign-up cannot set app_metadata.role, so a role-less insert is a public account.
create or replace function public.reject_public_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.raw_app_meta_data->>'role', '') not in ('admin', 'worker', 'social') then
    raise exception 'Signups are closed';
  end if;
  return new;
end;
$$;

revoke all on function public.reject_public_signup() from public, anon, authenticated;

drop trigger if exists reject_public_signup on auth.users;

create trigger reject_public_signup
  before insert on auth.users
  for each row
  execute function public.reject_public_signup();
