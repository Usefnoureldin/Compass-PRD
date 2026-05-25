-- Features + PRD attachments for Compass
-- Run against the hostbase-website Supabase project (compass schema).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists compass.features (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text default '',
  status          text not null default 'drafting'
                    check (status in ('drafting','planned','building','shipped')),
  owner_id        uuid references compass.users(id) on delete set null,
  org_id          uuid references compass.organizations(id) on delete set null,
  sprint_id       uuid references compass.sprints(id) on delete set null,
  prd_markdown    text default '',
  order_index     integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists features_status_idx       on compass.features(status);
create index if not exists features_order_idx        on compass.features(order_index);
create index if not exists features_org_idx          on compass.features(org_id);
create index if not exists features_owner_idx        on compass.features(owner_id);
create index if not exists features_sprint_idx       on compass.features(sprint_id);

create table if not exists compass.feature_attachments (
  id              uuid primary key default gen_random_uuid(),
  feature_id      uuid not null references compass.features(id) on delete cascade,
  file_name       text not null,
  file_path       text not null,                 -- storage path within compass-prds bucket
  file_type       text not null
                    check (file_type in ('md','pdf')),
  file_size       integer not null default 0,
  uploaded_at     timestamptz not null default now()
);

create index if not exists feature_attachments_feature_idx on compass.feature_attachments(feature_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger (reuse pattern from existing tables)
-- ---------------------------------------------------------------------------

create or replace function compass.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists features_touch_updated_at on compass.features;
create trigger features_touch_updated_at
  before update on compass.features
  for each row execute function compass.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — match the existing `compass_open` pattern (solo phase)
-- ---------------------------------------------------------------------------

alter table compass.features            enable row level security;
alter table compass.feature_attachments enable row level security;

drop policy if exists compass_open on compass.features;
create policy compass_open on compass.features
  for all using (true) with check (true);

drop policy if exists compass_open on compass.feature_attachments;
create policy compass_open on compass.feature_attachments
  for all using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Storage bucket for PRD attachments
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'compass-prds',
  'compass-prds',
  true,
  20 * 1024 * 1024,                              -- 20 MB max per file
  array['text/markdown','text/plain','application/pdf']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage RLS — wide open to match compass_open (tighten with auth later).
drop policy if exists "compass-prds open read"   on storage.objects;
drop policy if exists "compass-prds open insert" on storage.objects;
drop policy if exists "compass-prds open update" on storage.objects;
drop policy if exists "compass-prds open delete" on storage.objects;

create policy "compass-prds open read"
  on storage.objects for select
  using (bucket_id = 'compass-prds');

create policy "compass-prds open insert"
  on storage.objects for insert
  with check (bucket_id = 'compass-prds');

create policy "compass-prds open update"
  on storage.objects for update
  using (bucket_id = 'compass-prds')
  with check (bucket_id = 'compass-prds');

create policy "compass-prds open delete"
  on storage.objects for delete
  using (bucket_id = 'compass-prds');
