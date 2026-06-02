# Compass — Auth + Vercel deploy

End-to-end sequence to take Compass from local-dev to a public Vercel URL
with Google OAuth + an email allowlist. Each step is small and reversible.

## State assumed at the start

- Compass dev server runs locally at `localhost:5173`.
- The auth UI is built (`AuthContext`, `LoginPage`, `ProtectedRoute`) but
  Google OAuth provider is not configured yet — so login will fail until
  step 1 is done.
- `compass.allowed_emails` is seeded with `youssef@suitespotegypt.com`.
- The trigger `enforce_compass_email_allowlist` is live on `auth.users`.
- RLS is still `compass_open USING(true)` — safe to test login without
  the data layer fighting you.

---

## 1. Google Cloud Console — create OAuth client

1. Open https://console.cloud.google.com/apis/credentials
2. Pick (or create) any project — name doesn't matter.
3. **Configure OAuth consent screen** (if not done before):
   - User type: **External**
   - App name: `Compass`
   - User support email + developer email: your email
   - Save and continue through the scope screens (no special scopes needed)
4. **Create OAuth client ID:**
   - Application type: **Web application**
   - Name: `Compass`
   - **Authorized JavaScript origins:**
     - `http://localhost:5173`
     - (Add the Vercel URL after step 6.)
   - **Authorized redirect URIs:**
     - `https://bemxkvvrcmcczdronzbi.supabase.co/auth/v1/callback`
     - (Same callback URL for prod — Supabase is the one that handles
       the callback, not your app. The Vercel URL goes in
       JavaScript origins only.)
5. Click **Create**. Copy the **Client ID** and **Client secret**.

## 2. Paste into Supabase

1. Open https://supabase.com/dashboard/project/bemxkvvrcmcczdronzbi/auth/providers
2. Find **Google**, toggle **Enable Sign in with Google**.
3. Paste the Client ID and Client secret.
4. Leave **Skip nonce check** off.
5. **Save**.

Still on the auth page, open **URL Configuration**:
- **Site URL:** `http://localhost:5173`
- **Redirect URLs (additional):** add `http://localhost:5173/**`
- Save. (The Vercel URLs get added after step 6.)

## 3. Test login locally

1. `cd Compass && npm run dev` if it's not already running.
2. Open `http://localhost:5173` — should redirect to `/login`.
3. Click **Sign in with Google**, complete the Google flow.
4. Should land on `/` (Dashboard).
5. The sidebar footer shows your name + email and a Sign out button.
6. Sign out → should redirect back to `/login`.

If anything fails, the most common cause is a redirect URL mismatch
between Google + Supabase. Re-check step 1's "Authorized redirect URIs"
contains the **Supabase** callback (not your app's URL).

## 4. Confirm allowlist works

In Supabase SQL editor (Compass project):
```sql
insert into compass.allowed_emails (email, notes)
values ('someone-not-on-the-list@example.com', 'test')
on conflict do nothing;

-- Try signing in with a different Google account NOT on the list.
-- It should fail with "Email ... is not on the Compass allowlist".

-- Then clean up:
delete from compass.allowed_emails where email = 'someone-not-on-the-list@example.com';
```

## 5. Add the service-role key for the sync CLI

The CLI currently uses the publishable anon key. Once we tighten RLS
(step 7), the anon key will lose write access. Swap to the service-role
key first.

1. Open https://supabase.com/dashboard/project/bemxkvvrcmcczdronzbi/settings/api
2. Copy the **service_role** key (the long JWT under the section
   labelled "Project API keys").
3. Open `/Users/usefnoureldin/Documents/claude-projects/Compass/.env.local`
   and add the line:
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```
4. Verify:
   ```
   cd /Users/usefnoureldin/Documents/claude-projects/hostbase-product
   bun run sync-features
   ```
   The log line `[sync-features] Using publishable anon key...` should
   **NOT** appear. Sync should print 17/17 ✓.

## 6. Deploy to Vercel

1. `cd /Users/usefnoureldin/Documents/claude-projects/Compass`
2. `vercel link` — pick or create a Vercel project named `compass`.
3. Set env vars:
   ```
   vercel env add VITE_SUPABASE_URL production
   # paste https://bemxkvvrcmcczdronzbi.supabase.co

   vercel env add VITE_SUPABASE_ANON_KEY production
   # paste the publishable key (the short sb_publishable_... one)
   ```
   (Do **NOT** add `SUPABASE_SERVICE_ROLE_KEY` to Vercel — it's
   server-side only and the browser bundle would expose it.)
4. `vercel --prod` — wait for build, get the URL (something like
   `compass-xyz.vercel.app`).

## 7. Allowlist the Vercel URL in Google + Supabase

Both sides need to know about the new URL or OAuth will silently
redirect back without a session.

**Google Cloud Console** (https://console.cloud.google.com/apis/credentials)
- Edit the Compass OAuth client.
- Add to **Authorized JavaScript origins**: `https://compass-xyz.vercel.app`
- Save.

**Supabase URL Configuration** (the same auth → URL Configuration page)
- Update **Site URL** to the Vercel URL.
- Add to **Redirect URLs**: `https://compass-xyz.vercel.app/**`
- Save.

Test: open the Vercel URL → click Sign in with Google → confirm landing
on Dashboard.

## 8. Tighten RLS

Now the public URL has working auth and the CLI uses the service-role
key. Time to lock down the data layer.

```
# Apply via Supabase MCP or the SQL editor:
# File: Compass/supabase/migrations/20260602_tighten_rls.sql
```

Verify:
- Open the Vercel URL again. Should still load (you're still
  authenticated).
- In a private window, open the Vercel URL → redirect to `/login` → DO
  NOT sign in → manually inspect the Supabase REST API in DevTools
  network panel. All `select` requests should 401.
- `bun run sync-features` should still print 17/17 ✓.

If anything is broken, run the rollback:
```
# File: Compass/reconciliation/rollback_tighten_rls.sql
```
This reverts to the open policies in one shot. Investigate, fix, re-tighten.

## 9. Adding teammates later

Just one INSERT — that's the whole flow:
```sql
insert into compass.allowed_emails (email, notes)
values ('newperson@hostbase.ai', 'Eng team');
```
They click Sign in with Google on the Vercel URL, authenticate with
their Google account, and they're in. No code change.

## Done

- Compass lives at the Vercel URL.
- Auth: Google OAuth, gated by `compass.allowed_emails`.
- Data: RLS-locked to authenticated users.
- Sync from hostbase-product still works via service-role key.
- Anon key remains in the browser bundle but grants nothing.
