# Project State

_Last updated: 2026-05-22_

## Overview

Compass is an internal product-ops tool used to track Hostbase product requirements, client requests, ideas, bugs, sprints, and dev activity. It started as a frontend-only Vite + React app with localStorage persistence. As of 2026-05-22 it is wired to a shared Supabase database so data survives across browsers and sessions.

- **Repo**: `AlyLoutfy/Compass` (origin) — branch `main`
- **Stack**: Vite 7 · React 19 · TypeScript · Tailwind v4 · HeroUI · @hello-pangea/dnd · framer-motion · react-router-dom · @supabase/supabase-js
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
├── types.ts                     # Domain models (camelCase)
├── lib/
│   ├── supabase.ts              # Supabase client, schema='compass'
│   ├── excel.ts
│   └── utils.ts
├── services/
│   ├── storage.ts               # Supabase-backed fetchAll/saveAll (row ↔ domain mappers)
│   └── linear.ts                # Linear integration (separate; not Supabase)
├── context/
│   ├── DataContext.tsx          # Loads via storage.fetchAll(), saves on every state change
│   ├── LinearContext.tsx
│   └── ThemeContext.tsx
├── components/
│   └── layout/AppLayout.tsx     # Sidebar with Hostbase logomark
├── data/dummyData.ts            # Not imported anywhere (legacy)
└── pages/
public/
└── brand/logos/                 # Hostbase brand SVGs (app-icon, full-logo, logomark, wordmark)
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

### `compass` schema — 11 tables

| Table | Purpose |
| --- | --- |
| `organizations` | Client orgs (Palm Hills, TMG View, …) with per-feature toggles (`features` jsonb) |
| `users` | Team members; role / status / blocker info |
| `ideas` | Internal + client ideas, status pipeline (pending/approved/rejected/needs_clarification) |
| `requirements` | Client-driven feature requests with `client_name` |
| `bugs` | Bug tracker with severity, platform, layer, repro fields, screenshots |
| `tickets` | Work items; status pipeline (backlog → in_sprint → … → shipped); FKs to users, sprints, ideas |
| `sprints` | Sprint windows with status (active/completed/planned) |
| `comments` | Polymorphic (parent_type + parent_id) for idea/requirement/bug/ticket comments |
| `notifications` | Per-user in-app notifications |
| `standup_reports` | Standup snapshots with attendees (jsonb) |
| `activity_events` | Audit log: status_change / task_start / task_done / blocker |

All tables use `uuid` PKs (`gen_random_uuid()`), `timestamptz` timestamps, snake_case columns. Mutating tables (ideas, requirements, bugs, tickets) have `updated_at` triggers. Indexes on status / order_index / sprint_id / parent / user_id where relevant.

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

`src/services/storage.ts` exposes two async methods consumed by `DataContext`:

- **`fetchAll(): Promise<CompassData>`** — parallel `select * from <table>` against all 11 tables in `compass`, then maps each row to the camelCase domain type (`rowToIdea`, `rowToRequirement`, etc.). Returns `EMPTY` on any error.
- **`saveAll(data: CompassData): Promise<void>`** — for each entity collection, `upsert(items, { onConflict: 'id' })` then deletes orphan rows whose IDs are not in the new list. Two-phase: parents (organizations, users, sprints, ideas) commit before children (requirements, bugs, tickets, notifications, standup_reports) so FK references resolve.

Per-table snake_case ↔ camelCase mappers live in the same file. Date fields cross the boundary as ISO strings on the wire, ms-since-epoch numbers in TS.

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

1. **Tighten RLS before onboarding clients.** Today's `compass_open` policies allow anyone with the publishable key to do anything. Replace with policies keyed on `auth.uid()` once Supabase Auth is wired.
2. **Comments do not round-trip.** `Idea`, `Requirement`, `Bug`, `Ticket` types carry a `comments?: Comment[]` field that is not synced to `compass.comments`. Comments stay in-memory until the storage layer is extended.
3. **Multi-device clobber risk.** `saveAll` upserts entire collections and deletes orphans. Two tabs editing simultaneously last-writer-wins. Fine solo, replace with per-entity granular writes when a second user shows up.
4. **`addTicket` is a no-op stub** (`DataContext.tsx:328`). Tickets currently arrive only via Linear; UI-side ticket creation needs an actual implementation now that the table exists.
5. **`tickets`/`sprints` legacy data** is loaded but the UI doesn't fully drive them.

## Recent commits (most recent first)

```
f9e6bce migrate persistence from localStorage to Supabase
5ef032d rebrand to Hostbase colors and logomark
8c79dfb feat: Integrate Linear API for tickets and sprints management
5eac01d feat: Implement in-table editing for Ideas/Reqs and enhance Bug Tracker UI
```
