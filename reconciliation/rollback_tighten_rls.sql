-- Rollback for 20260602_tighten_rls.sql.
-- Reopens compass_open USING(true) on every compass table + the
-- compass-prds storage bucket. Use ONLY if Compass becomes unreachable
-- after deploy and you need to get back into the data fast.

do $$
declare
  tbl text;
  tables text[] := array[
    'activity_events',
    'allowed_emails',
    'bugs',
    'comments',
    'feature_attachments',
    'features',
    'ideas',
    'notifications',
    'organizations',
    'requirements',
    'sprints',
    'standup_reports',
    'tickets',
    'users'
  ];
begin
  foreach tbl in array tables loop
    execute format('drop policy if exists compass_authed on compass.%I', tbl);
    execute format('drop policy if exists compass_open on compass.%I', tbl);
    execute format(
      'create policy compass_open on compass.%I for all using (true) with check (true)',
      tbl
    );
  end loop;
end;
$$;

drop policy if exists "compass-prds authed read"   on storage.objects;
drop policy if exists "compass-prds authed insert" on storage.objects;
drop policy if exists "compass-prds authed update" on storage.objects;
drop policy if exists "compass-prds authed delete" on storage.objects;

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

update storage.buckets set public = true where id = 'compass-prds';
