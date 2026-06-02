-- Tighten Compass RLS: replace the solo-phase `compass_open USING(true)`
-- policies on all 14 compass tables + the compass-prds storage bucket with
-- authenticated-only policies.
--
-- AFTER this migration:
--   - Anon (publishable) key: read-only access to NOTHING.
--   - Authenticated session (Supabase Auth, gated by the email allowlist):
--     full read/write.
--   - service_role key: full access (bypasses RLS).
--
-- This is the migration that locks down the public Vercel deploy.
-- Run it ONLY after:
--   1. Google OAuth is wired in Supabase + working in the browser.
--   2. CHANNEX_WEBHOOK_SECRET style: scripts/sync-to-compass.ts has the
--      SUPABASE_SERVICE_ROLE_KEY set in Compass/.env.local and the
--      sync verified working.
--
-- Rollback: see reconciliation/rollback_tighten_rls.sql in this repo.

-- ---------------------------------------------------------------------------
-- 14 compass tables
-- ---------------------------------------------------------------------------

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
    execute format('drop policy if exists compass_open on compass.%I', tbl);
    execute format('drop policy if exists compass_authed on compass.%I', tbl);
    execute format(
      'create policy compass_authed on compass.%I for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null)',
      tbl
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- compass-prds storage bucket
-- ---------------------------------------------------------------------------

drop policy if exists "compass-prds open read"   on storage.objects;
drop policy if exists "compass-prds open insert" on storage.objects;
drop policy if exists "compass-prds open update" on storage.objects;
drop policy if exists "compass-prds open delete" on storage.objects;

drop policy if exists "compass-prds authed read"   on storage.objects;
drop policy if exists "compass-prds authed insert" on storage.objects;
drop policy if exists "compass-prds authed update" on storage.objects;
drop policy if exists "compass-prds authed delete" on storage.objects;

create policy "compass-prds authed read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'compass-prds');

create policy "compass-prds authed insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'compass-prds');

create policy "compass-prds authed update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'compass-prds')
  with check (bucket_id = 'compass-prds');

create policy "compass-prds authed delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'compass-prds');

-- Make the bucket private (not just policy-gated) so direct CDN URLs
-- without a signed token also stop working. App code that needs public
-- URLs must switch to signed URLs.
update storage.buckets set public = false where id = 'compass-prds';
