# Project State

_Last updated: 2026-05-25_

## Overview

Compass is an internal product-ops tool used to track Hostbase product requirements, client requests, ideas, bugs, sprints, dev activity, and **features with PRD documents**. It started as a frontend-only Vite + React app with localStorage persistence. As of 2026-05-22 it is wired to a shared Supabase database so data survives across browsers and sessions. As of 2026-05-25 it has a Features module with markdown PRDs and `.md`/`.pdf` attachments stored in Supabase Storage.

- **Repo**: `Usefnoureldin/Compass-PRD` (origin, private) — branch `main`. Upstream: `AlyLoutfy/Compass`.
- **Stack**: Vite 7 · React 19 · TypeScript · Tailwind v4 · HeroUI · @hello-pangea/dnd · framer-motion · react-router-dom · @supabase/supabase-js · react-markdown · remark-gfm
- **Visual identity**: Hostbase brand palette + logomark (see [Branding](#branding))

## Scripts

| Command | Action |
| --- | --- |
| `npm run dev` | Local dev server at http://localhost:5173 |
| `npm run build` | `tsc && vite build` |
| `npm run preview` | Preview built site |
| `npm run lint` | ESLint |

> `npm install` currently needs `--legacy-peer-deps` because `lucide-react@0.344.0` declares peer React ≤18 while the rest of the app is on React 19.

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
│   ├── DataContext.tsx          # Loads via storage.fetchAll(), saves on every state change
│   │                              Exposes saveStatus / saveError / retrySave.
│   ├── LinearContext.tsx
│   └── ThemeContext.tsx
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx        # Sidebar (Features sits right after Dashboard)
│   │   ├── PageToolbar.tsx
│   │   └── SaveIndicator.tsx    # Bottom-right "Saving…/Saved/Error" pill
│   └── features/
│       ├── FeatureDetailModal.tsx # PRD editor + attachments side panel
│       └── MarkdownPreview.tsx   # react-markdown + remark-gfm + prose styling
├── data/dummyData.ts            # Not imported anywhere (legacy)
└── pages/
    └── FeaturesPage.tsx         # Kanban by status + new-feature modal
public/
└── brand/logos/                 # Hostbase brand SVGs (app-icon, full-logo, logomark, wordmark)
supabase/migrations/             # SQL change history (manual, not via Supabase CLI)
└── 20260525_features.sql        # features + feature_attachments + compass-prds bucket
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
VITE_SUPABASE_ANON_KEY=sb_publishable_…  # publishable key, safe in client
```

`.env.example` ships with the placeholders.

### `compass` schema — 13 tables

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
| `features` | **Features with PRDs** — title, description, status (drafting/planned/building/shipped), owner, org, sprint, `prd_markdown`, `order_index` |
| `feature_attachments` | `.md` / `.pdf` files attached to a feature — `feature_id`, `file_name`, `file_path` (storage path), `file_type`, `file_size` |

All tables use `uuid` PKs (`gen_random_uuid()`), `timestamptz` timestamps, snake_case columns. Mutating tables (ideas, requirements, bugs, tickets, features) have `updated_at` triggers via `compass.touch_updated_at()`. Indexes on status / order_index / sprint_id / parent / user_id where relevant.

### Storage — `compass-prds` bucket

- Public bucket, 20 MB per-file cap.
- Allowed MIME types: `text/markdown`, `text/plain`, `application/pdf`, `application/octet-stream` (octet-stream is the fallback browsers send for `.md` files).
- Object path convention: `${featureId}/${timestamp}-${sanitized_filename}`.
- RLS policies on `storage.objects` mirror the open `compass_open` pattern — wide open while solo, tighten before clients log in.
- Public URLs are used directly (no signed URLs) for download/view; iframes embed PDFs inline.

### Row Level Security

RLS is **enabled on every Compass table**. Each table has a single permissive policy named `compass_open`:

```sql
CREATE POLICY compass_open ON compass.<table>
  FOR ALL USING (true) WITH CHECK (true);
```

**This is intentional for the solo phase only.** Anyone with the publishable key can read and write everything. Tighten before any client logs in (see [Open items](#open-items-todo)).

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

## Features module (added 2026-05-25)

- **`/features` page** — kanban grouped by status (Drafting PRD / Planned / Building / Shipped).
- **New feature modal** — title, short description, status, owner, org.
- **Feature detail modal** — inline metadata editing (title, status, owner) + PRD editor with Edit/Preview toggle (markdown rendered via `react-markdown` + `remark-gfm`, prose-styled) + attachments side panel.
- **`.md` upload behavior** — any `.md` uploaded (drop, picker, or "Load into editor" on an existing attachment) automatically populates the PRD editor and auto-switches to Preview. PDFs only attach.
- **PDF preview** — viewed inline via an iframe inside the modal, or opened in a new tab.
- **Intended workflow**: write the plan with Claude → drop the `.md` into the feature → PRD body autoloads → save.

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

1. **Tighten RLS before onboarding clients.** Today's `compass_open` policies (on every compass table _and_ the `compass-prds` storage bucket) allow anyone with the publishable key to do anything. Replace with policies keyed on `auth.uid()` once Supabase Auth is wired.
2. **Comments do not round-trip.** `Idea`, `Requirement`, `Bug`, `Ticket` types carry a `comments?: Comment[]` field that is not synced to `compass.comments`. Comments stay in-memory until the storage layer is extended.
3. **Multi-device clobber risk.** `saveAll` upserts entire collections and deletes orphans. Two tabs editing simultaneously last-writer-wins. Fine solo, replace with per-entity granular writes when a second user shows up.
4. **`addTicket` is a no-op stub** (`DataContext.tsx`). Tickets currently arrive only via Linear; UI-side ticket creation needs an actual implementation now that the table exists.
5. **`tickets`/`sprints` legacy data** is loaded but the UI doesn't fully drive them.
6. **Title field debounces on every keystroke.** Inline-editing a feature title (or any other inline-edited field) triggers a `saveAll` per keystroke. Fine for solo use, but a debounce on rapid edits would cut Supabase round-trips.
7. **No localStorage→Supabase backfill.** Any pre-2026-05-22 data that lived in localStorage was not migrated and is effectively lost.

## Recent commits (most recent first)

```
f9e6bce migrate persistence from localStorage to Supabase
5ef032d rebrand to Hostbase colors and logomark
8c79dfb feat: Integrate Linear API for tickets and sprints management
5eac01d feat: Implement in-table editing for Ideas/Reqs and enhance Bug Tracker UI
```

> Features module + save indicator (2026-05-25) is still uncommitted as of this writing.
