-- Email allowlist for Compass Google OAuth sign-up.
-- A user who completes Google sign-in but whose email is not in
-- compass.allowed_emails is rejected at INSERT time on auth.users,
-- BEFORE any Compass session is established.

create table if not exists compass.allowed_emails (
  email      text primary key,
  added_at   timestamptz not null default now(),
  notes      text
);

-- Solo-phase RLS — open during this phase, tightened in the next
-- migration alongside all other compass tables.
alter table compass.allowed_emails enable row level security;

drop policy if exists compass_open on compass.allowed_emails;
create policy compass_open on compass.allowed_emails
  for all using (true) with check (true);

insert into compass.allowed_emails (email, notes)
values ('youssef@suitespotegypt.com', 'Founder')
on conflict (email) do nothing;

-- Trigger function. SECURITY DEFINER so it can read compass.allowed_emails
-- regardless of who triggered the auth.users insert (Supabase Auth service).
create or replace function compass.enforce_email_allowlist()
returns trigger
language plpgsql
security definer
set search_path = compass, public
as $$
begin
  if not exists (
    select 1
    from compass.allowed_emails
    where lower(email) = lower(new.email)
  ) then
    raise exception 'Email % is not on the Compass allowlist', new.email
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_compass_email_allowlist on auth.users;
create trigger enforce_compass_email_allowlist
  before insert on auth.users
  for each row
  execute function compass.enforce_email_allowlist();
