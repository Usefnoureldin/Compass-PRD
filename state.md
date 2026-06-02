# Project State

_Last updated: 2026-06-02_

## Overview

Compass is an internal product-ops tool used to track Hostbase product requirements, client requests, ideas, bugs, sprints, dev activity, and **features with PRD documents**. It started as a frontend-only Vite + React app with localStorage persistence. As of 2026-05-22 it is wired to a shared Supabase database so data survives across browsers and sessions. As of 2026-05-25 it has a Features module with markdown PRDs and `.md`/`.pdf` attachments stored in Supabase Storage. As of 2026-06-02 it is deployed on Vercel behind Google OAuth + an email allowlist, with RLS locked down, and feature cards can flow in via a CLI sync from sibling repos (`hostbase-product/features/*.md` → `compass.features`).

- **Repo**: `Usefnoureldin/Compass-PRD` (origin, private) — branch `main`. Upstream: `AlyLoutfy/Compass`.
- **Production URL**: https://compass-eight-taupe.vercel.app — Vercel project `compass` under team `youssefs-projects-94b1f3d5`. Git-connected to `Usefnoureldin/Compass-PRD`; pushes to `main` trigger an auto-deploy.
- **Stack**: Vite 7 · React 19 · TypeScript · Tailwind v4 · HeroUI · @hello-pangea/dnd · framer-motion · react-router-dom · @supabase/supabase-js · react-markdown · remark-gfm
- **Visual identity**: Hostbase brand palette + logomark (see [Branding](#branding))

## Scripts

| Command | Action |
| --- | --- |
| `npm run dev` | Local dev server at http://localhost:5173 |
| `npm run build` | `tsc && vite build` |
| `npm run preview` | Preview built site |
| `npm run lint` | ESLint |

> `npm install` currently needs `--legacy-peer-deps` because `lucide-react@0.344.0` declares peer React ≤18 while the rest of the app is on React 19. A `.npmrc` at the repo root sets `legacy-peer-deps=true` so Vercel builds inherit the same flag without extra config.

## Structure (key files)

```
src/
├── App.tsx
├── main.tsx
├── index.css                    # Theme CSS variables (Hostbase palette)
├── types.ts                     # Domain models (camelCase) — incl. Feature, FeatureAttachment
├── lib/
│   ├── supabase.ts              # Supabase client, schema='compass'
│   ├── excel.ts
│   └── utils.ts
├── services/
│   ├── storage.ts               # Supabase-backed fetchAll/saveAll + PRD bucket uploads
│   └── linear.ts                # Linear integration (separate; not Supabase)
├── context/
│   ├── AuthContext.tsx          # Supabase Auth — Google OAuth, session listener, signOut
│   ├── DataContext.tsx          # Loads via storage.fetchAll(), saves on every state change
│   │                              Exposes saveStatus / saveError / retrySave.
│   ├── LinearContext.tsx
│   └── ThemeContext.tsx
├── components/
│   ├── auth/
│   │   └── ProtectedRoute.tsx   # Wraps all in-app routes; redirects to /login when no session
│   ├── layout/
│   │   ├── AppLayout.tsx        # Sidebar (Features sits right after Dashboard); shows
│   │   │                          signed-in user + Sign-out button in the footer
│   │   ├── PageToolbar.tsx
│   │   └── SaveIndicator.tsx    # Bottom-right "Saving…/Saved/Error" pill
│   └── features/
│       ├── FeatureDetailModal.tsx # PRD editor + attachments side panel
│       └── MarkdownPreview.tsx   # react-markdown + remark-gfm + prose styling
├── data/dummyData.ts            # Not imported anywhere (legacy)
└── pages/
    ├── FeaturesPage.tsx         # Kanban by status + new-feature modal
    └── LoginPage.tsx            # "Sign in with Google" card on a glass panel
public/
└── brand/logos/                 # Hostbase brand SVGs (app-icon, full-logo, logomark, wordmark)
supabase/migrations/             # SQL change history (manual, not via Supabase CLI)
├── 20260525_features.sql                              # features + feature_attachments + compass-prds bucket
├── 20260602_features_external_id_and_status.sql      # external_id UNIQUE + widen status enum to 6 values
├── 20260602_auth_allowlist.sql                        # allowed_emails table + auth.users INSERT trigger
└── 20260602_tighten_rls.sql                           # compass_open → compass_authed on every table + bucket
reconciliation/
└── rollback_tighten_rls.sql     # Function-level kill switch — reopens compass_open in one shot
.githooks/                       # (in hostbase-product) pre-push runs `bun run sync-features`
DEPLOY.md                        # End-to-end auth + Vercel deploy walkthrough
.npmrc                           # legacy-peer-deps=true for Vercel + local
```

## Backend — Supabase

### Project

- **Name**: `hostbase-website` (shared with the marketing site)
- **Project ID / ref**: `bemxkvvrcmcczdronzbi`
- **URL**: `https://bemxkvvrcmcczdronzbi.supabase.co`
- **Region**: `eu-west-1`
- Compass tables live in a dedicated `compass` schema, isolated from `public` and `website_leads`.

### Env (`.env.local`, gitignored)

```
VITE_SUPABASE_URL=https://bemxkvvrcmcczdronzbi.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_…   # publishable key, safe in client bundle
SUPABASE_SERVICE_ROLE_KEY=eyJ…            # server-side only — used by external CLI sync,
                                          # NEVER shipped to the browser bundle
```

`.env.example` ships with the placeholders. On Vercel only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set — the service-role key lives only on Youssef's laptop where the sync CLI runs.

### `compass` schema — 14 tables

| Table | Purpose |
| --- | --- |
| `organizations` | Client orgs (Palm Hills, TMG View, …) with per-feature toggles (`features` jsonb) |
| `users` | Team members; role / status / blocker info. `email` is `unique`. |
| `ideas` | Internal + client ideas, status pipeline (pending/approved/rejected/needs_clarification) |
| `requirements` | Client-driven feature requests with `client_name` |
| `bugs` | Bug tracker with severity, platform, layer, repro fields, screenshots |
| `tickets` | Work items; status pipeline (backlog → in_sprint → … → shipped); FKs to users, sprints, ideas |
| `sprints` | Sprint windows with status (active/completed/planned) |
| `comments` | Polymorphic (parent_type + parent_id) for idea/requirement/bug/ticket comments |
| `notifications` | Per-user in-app notifications |
| `standup_reports` | Standup snapshots with attendees (jsonb) |
| `activity_events` | Audit log: status_change / task_start / task_done / blocker |
| `features` | **Features with PRDs** — title, description, status (drafting/planned/building/shipped/blocked/deferred), owner, org, sprint, `prd_markdown`, `order_index`, **`external_id` UNIQUE** (the upsert key for the external CLI sync) |
| `feature_attachments` | `.md` / `.pdf` files attached to a feature — `feature_id`, `file_name`, `file_path` (storage path), `file_type`, `file_size` |
| `allowed_emails` | Email allowlist for Google OAuth sign-up. `auth.users` BEFORE INSERT trigger reads this — non-allowlisted addresses are rejected before any session is created |

All tables use `uuid` PKs (`gen_random_uuid()`), `timestamptz` timestamps, snake_case columns. Mutating tables (ideas, requirements, bugs, tickets, features) have `updated_at` triggers via `compass.touch_updated_at()`. Indexes on status / order_index / sprint_id / parent / user_id where relevant.

### Storage — `compass-prds` bucket

- **Private** bucket (flipped from public on 2026-06-02), 20 MB per-file cap.
- Allowed MIME types: `text/markdown`, `text/plain`, `application/pdf`, `application/octet-stream` (octet-stream is the fallback browsers send for `.md` files).
- Object path convention: `${featureId}/${timestamp}-${sanitized_filename}`.
- Storage policies (`compass-prds authed read/insert/update/delete`) restrict every operation to `to authenticated`. Anonymous requests, including direct public-URL fetches, get 401.
- The app code today still uses `getPublicUrl()` for iframe/preview rendering — this works for logged-in users because the policies allow the read, even though the URL doesn't carry a token. Direct unauthenticated CDN fetches fail. If we later need cross-tenant or shareable links, switch to `createSignedUrl()`.

### Row Level Security

RLS is **enabled on every Compass table**. Since 2026-06-02 every table has a single permissive policy named `compass_authed`, gated on `auth.uid()`:

```sql
CREATE POLICY compass_authed ON compass.<table>
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
```

This means: the publishable anon key (which is in the browser bundle) **grants no read or write access without a Supabase Auth session**. Only signed-in users on the email allowlist can read or write data. The service-role key (server-side only) bypasses RLS entirely and is used by the external CLI sync.

Rollback for emergencies: `reconciliation/rollback_tighten_rls.sql` reopens `compass_open USING(true)` on every table + the storage bucket in a single transaction. Use only if Compass becomes unreachable post-deploy and you need to recover data fast.

### PostgREST schema exposure

The custom `compass` schema is exposed to the REST/PostgREST API via:

```sql
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, graphql_public, compass, website_leads';
NOTIFY pgrst, 'reload schema';
```

The `supabase-js` client is initialised with `db: { schema: 'compass' }` so `supabase.from('ideas')` resolves to `compass.ideas`.

## Frontend storage layer

`src/services/storage.ts` exposes:

- **`fetchAll(): Promise<CompassData>`** — parallel `select * from <table>` against all 13 tables in `compass`, then maps each row to the camelCase domain type. Returns `EMPTY` on any error.
- **`saveAll(data: CompassData): Promise<void>`** — for each entity collection, `upsert(items, { onConflict: 'id' })` then deletes orphan rows whose IDs are not in the new list. Three-phase: (1) parents (organizations, users, sprints, ideas) → (2) children that reference parents (requirements, bugs, tickets, notifications, standup_reports, features) → (3) `feature_attachments` last (depend on features). Errors propagate up so `DataContext` can surface them.
- **`uploadAttachment(featureId, file)`** — uploads to the `compass-prds` bucket at `${featureId}/${ts}-${name}`, validates `.md`/`.pdf` only, returns `{ filePath, fileType, fileSize, fileName }`.
- **`deleteAttachmentFile(filePath)`** — removes a single object from the bucket.
- **`getAttachmentUrl(filePath)`** — returns the public URL.
- **`downloadAttachmentText(filePath)`** — fetches a file and returns its text (used to load an existing `.md` attachment back into the PRD editor).

Per-table snake_case ↔ camelCase mappers live in the same file. Date fields cross the boundary as ISO strings on the wire, ms-since-epoch numbers in TS.

### Save status surfacing

`DataContext` writes to Supabase on every state mutation (no debounce). The `useEffect` wraps `storage.saveAll` in try/catch and exposes:

- `saveStatus: 'idle' | 'saving' | 'saved' | 'error'`
- `saveError: string | null`
- `retrySave()` — re-runs the last persist

`<SaveIndicator />` (mounted in `AppLayout`) renders a transient "Saving…" → "Saved" pill bottom-right, or a persistent destructive toast on error with a Retry button. **No silent failures.**

## Features module (added 2026-05-25, extended 2026-06-02)

- **`/features` page** — kanban grouped by status. Status enum widened on 2026-06-02 from 4 to 6: `drafting / planned / building / shipped / blocked / deferred`.
- **New feature modal** — title, short description, status, owner, org.
- **Feature detail modal** — inline metadata editing (title, status, owner) + PRD editor with Edit/Preview toggle (markdown rendered via `react-markdown` + `remark-gfm`, prose-styled) + attachments side panel.
- **`.md` upload behavior** — any `.md` uploaded (drop, picker, or "Load into editor" on an existing attachment) automatically populates the PRD editor and auto-switches to Preview. PDFs only attach.
- **PDF preview** — viewed inline via an iframe inside the modal, or opened in a new tab.
- **Intended workflow**: write the plan with Claude → drop the `.md` into the feature → PRD body autoloads → save.

## Authentication (added 2026-06-02)

- **Provider**: Google OAuth via Supabase Auth. Client ID + secret are configured in the Supabase dashboard (`Auth → Providers → Google`).
- **Email allowlist**: `compass.allowed_emails` table. The `compass.enforce_email_allowlist()` `SECURITY DEFINER` function runs on `auth.users` BEFORE INSERT and raises a `P0001` exception if `lower(new.email)` isn't in the table. So a non-allowlisted Google account can complete the Google flow but never gets a Supabase session — Supabase returns the rejection in the OAuth redirect's URL fragment, which `AuthContext` decodes and surfaces in `LoginPage` as `authError`.
- **Seed**: `youssef@suitespotegypt.com` (Founder).
- **Adding a teammate**: one INSERT.
  ```sql
  insert into compass.allowed_emails (email, notes)
  values ('newperson@hostbase.ai', 'Eng team');
  ```
- **Login UI**: `/login` is the only public route. Everything else is wrapped in `ProtectedRoute`, which redirects unauthenticated users to `/login`.
- **Sidebar identity**: `AppLayout` reads `useAuth().user` and shows `full_name` / `email` plus a Sign-out button (both in the desktop collapsed/expanded footer and the mobile menu).
- **Session storage**: standard Supabase Auth cookies (persistSession on by default for the browser client). Server-side scripts (the CLI) opt out via `auth: { persistSession: false }`.

## External CLI sync — hostbase-product → Compass (added 2026-06-02)

The Hostbase PMS repo (`/Users/usefnoureldin/Documents/claude-projects/hostbase-product`) authors per-phase PRDs as markdown files in `features/*.md` with YAML frontmatter, and pushes them into `compass.features` via a CLI:

- **CLI**: `hostbase-product/scripts/sync-to-compass.ts` (run with `bun run sync-features`). Walks `features/*.md`, parses frontmatter via `gray-matter`, upserts on `external_id`, uploads sibling attachments in a same-named subdirectory to the `compass-prds` bucket.
- **Credentials**: the CLI reads `Compass/.env.local` directly. It prefers `SUPABASE_SERVICE_ROLE_KEY` and falls back to `VITE_SUPABASE_ANON_KEY` (the fallback path now grants nothing post-RLS-tighten, so the service-role key is required in practice).
- **Pre-push hook**: `hostbase-product/.githooks/pre-push` runs `bun run sync-features` automatically before every `git push`. Activated by `git config core.hooksPath .githooks`. Bypass with `git push --no-verify` if Compass is unreachable.
- **Frontmatter contract** (full spec in `hostbase-product/features/README.md`):
  ```yaml
  external_id: hostbase-prod-phase-1.6  # REQUIRED — never rename after creation
  title: Phase 1.6 — RLS org isolation
  status: shipped                       # drafting | planned | building | shipped | blocked | deferred
  description: One-line blurb           # optional
  owner: youssef@suitespotegypt.com    # optional, looked up in compass.users
  org: Hostbase                         # optional, looked up in compass.organizations
  order_index: 8                        # optional
  ```
- **Backfill (2026-06-02)**: 17 productization phase cards (Phase 0.A → Phase 2) + 1 archive card (`hostbase-prod-plan-archive`, hosts the v3.3 plan PDF + notes after the old hand-typed umbrella feature was deleted and its attachments reassigned). Idempotent.
- **What the sync does NOT do**: bidirectional sync (Compass-side edits are overwritten on next sync), orphan deletion (if a markdown file is deleted, the Compass row remains until you delete it in the UI), comments/sprints/tickets (only `features` + `feature_attachments`).

## Deployment — Vercel (added 2026-06-02)

- **Vercel project**: `compass` under team `youssefs-projects-94b1f3d5`. Detected as Vite (`vite build` → `dist/`).
- **Production URL**: https://compass-eight-taupe.vercel.app (aliased to the canonical deployment URL).
- **Env vars on Vercel** (production scope): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. The service-role key is intentionally **not** on Vercel.
- **Git integration**: connected to `https://github.com/Usefnoureldin/Compass-PRD`. Pushes to `main` auto-deploy.
- **Build config**: no `vercel.json` — Vite preset's SPA fallback handles client routing. `.npmrc` provides `legacy-peer-deps=true` so Vercel's `npm install` matches the local workflow.
- **Auth allowlist**: Google OAuth client has `https://compass-eight-taupe.vercel.app` in Authorized JavaScript origins; Supabase URL Configuration has the same in Site URL + Redirect URLs (`/**`).
- **Full deploy walkthrough**: `DEPLOY.md` at the repo root — step-by-step Google OAuth setup, Supabase wiring, service-role key, Vercel link, env, deploy, and RLS tighten.

## Branding

Brand palette and logos come from `/Users/usefnoureldin/Documents/claude-projects/hostbase/public/brand/hostbase-brand-assets`. Per the guidelines:

| Token | Light | Dark | Hex |
| --- | --- | --- | --- |
| `--primary` | Primary Teal | Bright Teal | `#0097A7` / `#00BCD4` |
| `--background` | Off White | Dark Navy | `#F8FAFC` / `#1a1a2e` |
| `--foreground` | Charcoal | Off White | `#1E293B` / `#F8FAFC` |
| `--border` | Light Gray | Subtle navy | `#E2E8F0` / dark gray |
| `--accent` | Amber (use sparingly) | Same | `#F5A623` |

CSS variables live in `src/index.css` (`:root` and `.dark`). Tailwind v4 maps them to color utilities via `@theme`.

Sidebar logo and favicon load from `public/brand/logos/logomark/hostbase-logomark-full-color.svg` and `public/brand/logos/app-icon/hostbase-favicon.svg` respectively.

## Sibling schemas in the same Supabase project

- **`public`**: empty of Compass tables (still hosts Postgres defaults and extensions).
- **`website_leads`**: holds `demo_requests` for the hostbase.ai marketing site. Independent of Compass.

## Open items / TODO

1. ~~**Tighten RLS before onboarding clients.**~~ DONE 2026-06-02 — `compass_open` replaced with `compass_authed` on all 14 tables + the `compass-prds` storage bucket, bucket flipped to private. See [Row Level Security](#row-level-security).
2. **Comments do not round-trip.** `Idea`, `Requirement`, `Bug`, `Ticket` types carry a `comments?: Comment[]` field that is not synced to `compass.comments`. Comments stay in-memory until the storage layer is extended.
3. **Multi-device clobber risk.** `saveAll` upserts entire collections and deletes orphans. Two tabs editing simultaneously last-writer-wins. Fine solo, replace with per-entity granular writes when a second user shows up.
4. **`addTicket` is a no-op stub** (`DataContext.tsx`). Tickets currently arrive only via Linear; UI-side ticket creation needs an actual implementation now that the table exists.
5. **`tickets`/`sprints` legacy data** is loaded but the UI doesn't fully drive them.
6. **Title field debounces on every keystroke.** Inline-editing a feature title (or any other inline-edited field) triggers a `saveAll` per keystroke. Fine for solo use, but a debounce on rapid edits would cut Supabase round-trips.
7. **No localStorage→Supabase backfill.** Any pre-2026-05-22 data that lived in localStorage was not migrated and is effectively lost.
8. **Signed URLs for attachments** — `getPublicUrl()` works while RLS is gated on `authenticated`, but the URL still doesn't carry a token. Cleaner long-term is `createSignedUrl()` so attachment links can be safely shared / inspected outside the app session.
9. **External-sync orphan handling** — if a `features/*.md` file is deleted in hostbase-product, the matching Compass row remains. Consider a `--prune` flag that diffs `external_id`s and deletes Compass rows missing from the local repo.

## Recent commits (most recent first)

```
90160f9 feat(auth): Google OAuth + email allowlist + tightened RLS + Vercel deploy
cce46d0 style(features): show progress percentage in chip
e9167f7 feat(features): ticking a heading selects all descendants
6864ff7 feat(features): parse GFM tables as checklist items
f9e6bce migrate persistence from localStorage to Supabase
5ef032d rebrand to Hostbase colors and logomark
8c79dfb feat: Integrate Linear API for tickets and sprints management
5eac01d feat: Implement in-table editing for Ideas/Reqs and enhance Bug Tracker UI
```
