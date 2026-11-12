# Lifolio — Architecture Proposal

Status: **Approved 2026-11-04** (see §8 for the resolved decisions).
Source brief: `../Lifolio_introduction.md`. Roadmap: `PLAN.md`. Current state: `PROGRESS.md`.

---

## 1. Architecture overview

One Next.js 16 application (App Router, TypeScript, `src/` directory) deployed on Vercel.
Supabase provides Postgres, Auth and Storage. There is no separate backend, no ORM,
no job queue, no cache layer.

```
Browser ──► Vercel (Next.js 16)
             ├─ proxy.ts            refreshes Supabase session cookie, redirects anon users
             ├─ Server Components   read data with a user-scoped Supabase client
             ├─ Server Actions      all writes (create/update/delete), validated with Zod
             ├─ Server Actions      metadata lookup → TMDB / Google Books (keys stay server-side)
             └─ Route Handlers      /auth/confirm (email links), /api/export, /api/cron/keepalive
                      │
                      ▼
          Supabase ── Postgres (RLS on every table) ── Auth ── Storage (private bucket)
```

Key rules:

- **The database is the security boundary.** Every query runs through the Supabase client
  with the *user's* JWT, so Row Level Security applies to everything, including Server
  Actions. The service-role key is not used anywhere in the app.
- **Reads in Server Components, writes in Server Actions.** Client components are used only
  where interactivity requires it (forms, dialogs, view toggles, search box).
- **No ORM.** Prisma/Drizzle would need a direct DB connection that bypasses RLS and adds a
  second schema definition. `supabase gen types` gives typed queries from the real schema.
- **Dependencies kept to:** `next`, `react`, `@supabase/supabase-js`, `@supabase/ssr`,
  `tailwindcss`, shadcn components (copied in, not a dependency), `lucide-react`, `zod`,
  `react-hook-form`, `next-themes`. Anything else needs a reason.

Stack versions as of today: Next.js 16 (uses `proxy.ts`, not `middleware.ts`; `params`
and `searchParams` are async), Tailwind CSS v4, shadcn CLI v4, `@supabase/ssr` 0.12.x.

---

## 2. Database schema

All user-owned tables carry a denormalised `user_id` so RLS policies never need joins.
Common fields that *every* collection has are real columns; collection-specific fields
live in one JSONB column. This is "JSONB for attributes, relational for structure".

```sql
-- 1. profiles: one row per auth user, created by trigger
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  avatar_path   text,
  theme         text not null default 'dark' check (theme in ('dark','light','system')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 2. collections: a user-defined "thing I track"
create table collections (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name            text not null,
  slug            text not null,                 -- url: /collections/movies
  description     text,
  icon            text not null default 'folder', -- lucide icon name
  item_noun       text not null default 'item',   -- "movie", "book" → used in UI copy
  default_layout  text not null default 'grid' check (default_layout in ('grid','list')),
  -- promoted-field configuration (see §2.1)
  status_options  jsonb not null default '[]',    -- [{key,label,kind}] kind ∈ planned|active|done|none
  date_label      text,                           -- "Watched on", "Purchased on"; null hides the field
  show_rating     boolean not null default true,
  lookup_provider text,                           -- 'tmdb_movie' | 'tmdb_tv' | 'google_books' | null (see §9)
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, slug)
);

-- 3. collection_fields: the custom field definitions of a collection
create table collection_fields (
  id             uuid primary key default gen_random_uuid(),
  collection_id  uuid not null references collections(id) on delete cascade,
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key            text not null,        -- immutable, e.g. "f_director"; JSONB key in entries.attributes
  label          text not null,        -- "Director" (renameable)
  type           text not null check (type in ('text','textarea','number','date','select','url','checkbox','image')),
  options        jsonb not null default '{}',  -- select: {choices:[...]}, number: {min,max,step,unit}
  required       boolean not null default false,
  show_in_card   boolean not null default false,
  lookup_key     text,                  -- which provider output fills this field, e.g. 'director' (see §9)
  sort_order     int not null default 0,
  unique (collection_id, key)
);

-- 4. entries: one row per movie / book / watch / shoe …
create table entries (
  id               uuid primary key default gen_random_uuid(),
  collection_id    uuid not null references collections(id) on delete cascade,
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title            text not null,
  status           text,                         -- one of collections.status_options[].key
  rating           smallint check (rating between 0 and 10),  -- shown as 5 stars with halves
  occurred_on      date,                         -- watched / finished / purchased date (timeline)
  notes            text,                         -- review / remarks
  cover_image_path text,                         -- storage path (uploads AND copied external images)
  image_source     text check (image_source in ('upload','url','provider')),
  external_provider text,                        -- 'tmdb_movie', 'google_books', … (null for manual)
  external_id      text,                         -- provider's own id, e.g. TMDB "27205"
  tags             text[] not null default '{}',
  is_favorite      boolean not null default false,
  attributes       jsonb not null default '{}',  -- { "f_director": "Denis Villeneuve", ... }
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on entries (user_id, collection_id, updated_at desc);
create index on entries (user_id, occurred_on desc);
create index on entries using gin (tags);
create index on entries using gin (title extensions.gin_trgm_ops);  -- 0004, ilike search
-- 0005: collection_stats() aggregates per collection for the dashboard (security invoker, RLS-scoped)
-- 0006: collection_shares (owner-only RLS) + shared_collection(token_hash) security definer = the only anonymous
--       read path (checks hash, expiry, revocation; strips user_id; caps entries); is_shared_cover() backs a
--       storage select policy so anonymous readers can sign covers of currently shared collections only.
-- add later only if needed: gin (attributes jsonb_path_ops), tsvector for search

-- 5. activity_log: feeds Dashboard "recent activity" and Timeline (Phase 4)
create table activity_log (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  collection_id  uuid references collections(id) on delete set null,
  entry_id       uuid references entries(id) on delete set null,
  action         text not null check (action in ('entry_created','entry_updated','status_changed','entry_deleted','collection_created')),
  summary        text not null,                  -- "Finished reading Dune"
  metadata       jsonb not null default '{}',
  created_at     timestamptz not null default now()
);
create index on activity_log (user_id, created_at desc);
```

Triggers: `set_updated_at()` on profiles/collections/entries; `handle_new_user()` inserts
a profile row on `auth.users` insert; a trigger on `entries` writes `activity_log` rows
(Phase 4). Storage: private bucket `entry-images`. Every cover (upload, pasted URL or provider image) is
re-encoded once on the server by `lib/images/process.ts` (sharp: EXIF auto-rotate, ≤ 1200 px long edge, WebP q80,
metadata stripped) and stored at `{user_id}/c/{uuid}.webp`; uploads happen before the entry exists, so the form
holds the path. Covers are then served as-is through hourly signed URLs — `images.unoptimized` is on, because
Vercel's optimiser is metered per transformation and a URL that changes every hour is a cache miss every hour.
Paths outside `{user_id}/c/` predate this; Settings offers a one-off re-encode (`relink_cover()` swaps the path
without an activity row or `updated_at` bump).

### 2.1 Why promote `status`, `rating`, `occurred_on`, `tags`, `cover_image_path`

Every example collection in the brief has these. Keeping them as real columns means:

- the Dashboard can count "wishlist items" or "completed this year" across *all* collections,
- the Timeline can order by `occurred_on` without parsing JSONB,
- filters and sorting on the most-used fields use normal indexes.

Each collection still customises them: it defines its own status list (Movies:
watchlist/watching/watched; Watches: wishlist/owned/sold), labels its date, and can hide
rating. The `kind` on each status option (`planned`/`active`/`done`/`none`) is the small
piece of metadata that lets cross-collection stats work without the app knowing what a
"movie" is.

### 2.2 Deliberate simplifications versus the brief

| Brief says | Proposal | Why |
|---|---|---|
| Tags table | `entries.tags text[]` with GIN index | No join table, no tag-management UI needed. Can be normalised later if tags need colours or counts. |
| Images table | `cover_image_path` column + `image` field type storing a path in `attributes` | Covers "one cover + a few extra photos". A gallery table is a Phase-4+ addition if wanted. |
| Entry custom attributes (table) | Single `attributes` JSONB column | An EAV table is the "generic database engine" the brief warns against. |
| Collection templates in DB | TypeScript constants in `src/lib/collections/templates.ts` | Templates are code: versioned with the app, no RLS needed, instantiated on "New collection → from template". |

---

## 3. Authentication and security design

Implementation follows Supabase's current App Router guide (`@supabase/ssr`).

**Three client factories** in `src/lib/supabase/`:

- `client.ts` — `createBrowserClient` for client components.
- `server.ts` — `createServerClient` reading `cookies()` for Server Components, Server
  Actions and Route Handlers.
- `proxy.ts` — `updateSession()` used by the root `proxy.ts`: calls
  `supabase.auth.getClaims()` to refresh an expiring token, writes refreshed cookies to
  both request and response, and redirects anonymous users from `/(app)` routes to `/login`.

**Defense in depth:** the proxy redirect is a convenience, not the security. Every
`(app)` layout also calls `getClaims()` and redirects if missing, and RLS makes any leak
return zero rows anyway.

**Pages and flows**

| Route | Purpose |
|---|---|
| `/login`, `/signup` | email + password forms (Server Actions) |
| `/forgot-password` | `resetPasswordForEmail(email, { redirectTo: '/auth/confirm?next=/reset-password' })` |
| `/reset-password` | `updateUser({ password })` after the link lands |
| `/auth/confirm` (route handler) | exchanges `token_hash`/`code` from email links, then redirects to `next` |
| `/logout` (Server Action) | `signOut()` + redirect |

Sessions persist via Supabase cookies and refresh tokens; the user stays logged in until
they log out or the refresh token expires.

**RLS policy, identical on every table** (shown for `entries`):

```sql
alter table entries enable row level security;
create policy "owner_all" on entries
  for all to authenticated
  using  (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
```

`user_id default auth.uid()` means the app never sends `user_id` from the client, so it
cannot be spoofed. Storage gets the equivalent policy: first folder of the object path must
equal `auth.uid()`.

**Secrets:** only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
reach the browser; both are designed to be public because RLS protects the data. No
service-role key is stored in Vercel at all until a feature genuinely needs it.

**Input validation:** every Server Action parses its input with Zod before touching the
database; for entries the schema is generated from the collection's field definitions
(see §4), so the same rules apply client- and server-side.

---

## 4. Dynamic collections — how it works

The whole feature rests on one idea: **a field type registry in TypeScript**.

```ts
// src/lib/fields/registry.ts
export const fieldTypes = {
  text:     { zod: (f) => z.string().max(500), Input: TextInput, Display: TextDisplay, sortable: true, filterable: false },
  textarea: { ... },
  number:   { zod: (f) => z.coerce.number().min(f.options.min ?? -Infinity), Input: NumberInput, ..., sortable: true, filterable: true },
  date:     { ... },
  select:   { zod: (f) => z.enum(f.options.choices), Input: SelectInput, ..., filterable: true },
  url:      { zod: () => z.string().url(), ... },
  checkbox: { zod: () => z.boolean(), ..., filterable: true },
  image:    { zod: () => z.string() /* storage path */, Input: ImageUpload, Display: ImageDisplay },
} satisfies Record<FieldType, FieldTypeDef>;
```

Everything else is derived from the registry plus the rows in `collection_fields`:

- **Form generation:** `buildEntrySchema(fields)` returns a Zod object (`title`, `status`,
  `rating`, `occurred_on`, `tags`, plus one key per custom field). `EntryForm` renders the
  promoted fields, then maps over `fields` and picks `fieldTypes[f.type].Input`. The
  Server Action re-runs the same builder before writing.
- **Page generation:** one route `/collections/[slug]` fetches the collection, its fields and
  its entries. `EntryCard` (grid) and `EntryRow` (list) show title, cover, status, rating
  and the fields flagged `show_in_card`. `/collections/[slug]/[entryId]` shows all fields
  through `fieldTypes[f.type].Display`.
- **Search / filter / sort:** URL search params (`?q=&status=&rating=&fav=&tag=&f.<key>=&sort=&page=`)
  are parsed and validated against the collection by `src/lib/entries/filters.ts` (pure, shared
  by the page and the filter bar) and drive the server query in `listEntries`. Search is
  `title ilike` / `notes ilike` / exact tag (`or=` clause, backed by a `pg_trgm` index);
  status / rating / favourite are plain column filters; tags use array containment and
  select-field filters use JSONB containment (`attributes @> {"f_genre":"Drama"}`).
  Sorting is on promoted columns only (updated, created, title, rating, date); pages are 60
  rows via `.range()` with an exact count. Global search reuses the same `or=` clause across
  all collections (RLS scopes it) for the Ctrl K palette and `/search`.
- **Templates:** `templates.ts` holds Movies, TV Shows, Books, Watches, Shoes as plain
  objects (name, icon, status options, date label, field list). "New collection" offers
  "Start from template" or "Blank"; either way it just inserts into `collections` and
  `collection_fields`. Nothing in the app is special-cased per template.

**Field lifecycle rules** (these are what keep JSONB from rotting):

- `key` is generated once (`f_` + short id) and never changes; renaming edits `label` only.
- Deleting a field runs `update entries set attributes = attributes - 'f_xxx'` for that collection.
- Changing a field's type is not allowed in v1 (delete and re-create instead). Allowing
  text→textarea style "safe" conversions can come later.
- Missing keys in `attributes` are treated as empty; the UI never assumes a key exists.

---

## 5. Folder structure

```
lifolio/
├─ proxy.ts                         # session refresh + auth redirect (Next 16 convention)
├─ next.config.ts                   # images.unoptimized (covers are pre-sized), 9 MB action body limit
├─ supabase/
│  ├─ config.toml
│  └─ migrations/                   # 0001_init.sql, 0002_rls.sql, 0003_storage.sql …
├─ docs/
│  └─ ARCHITECTURE.md
└─ src/
   ├─ app/
   │  ├─ (auth)/                    # centred, no sidebar
   │  │  ├─ login/  signup/  forgot-password/  reset-password/
   │  │  └─ layout.tsx
   │  ├─ (app)/                     # sidebar shell, requires session
   │  │  ├─ layout.tsx
   │  │  ├─ dashboard/page.tsx
   │  │  ├─ collections/
   │  │  │  ├─ page.tsx             # all collections (cards) + "New collection"
   │  │  │  └─ [slug]/
   │  │  │     ├─ page.tsx          # grid/list, search, filters
   │  │  │     ├─ settings/page.tsx # edit collection + fields
   │  │  │     ├─ new/page.tsx
   │  │  │     └─ [entryId]/page.tsx   (+ edit/)
   │  │  ├─ timeline/page.tsx       # Phase 4
   │  │  └─ settings/page.tsx
   │  ├─ auth/confirm/route.ts      # email link handler
   │  ├─ api/export/route.ts        # Phase 4
   │  ├─ layout.tsx  globals.css
   ├─ components/
   │  ├─ ui/                        # shadcn (generated)
   │  ├─ layout/                    # Sidebar, TopBar, PageHeader, EmptyState
   │  ├─ collections/               # CollectionCard, CollectionForm, FieldEditor
   │  ├─ entries/                   # EntryCard, EntryRow, EntryForm, EntryFilters, StarRating
   │  └─ fields/                    # one Input + Display per field type
   ├─ lib/
   │  ├─ supabase/  client.ts  server.ts  proxy.ts
   │  ├─ fields/    registry.ts  schema.ts        # Zod builder
   │  ├─ collections/ templates.ts  slug.ts
   │  ├─ queries/   collections.ts  entries.ts  dashboard.ts   # server-only reads
   │  └─ utils.ts
   ├─ actions/      auth.ts  collections.ts  fields.ts  entries.ts  images.ts
   └─ types/        database.ts (generated)  domain.ts
```

Separation: `queries/` and `actions/` are the only files that talk to Supabase.
Components receive plain typed data. The field registry is the only place that knows
what a field type can do.

---

## 6. Development roadmap (revised)

The brief's Phase 2 ("core collection system") followed by Phase 3 ("make it dynamic")
would mean building entries twice. Dynamic fields are the core system, so they are built
first and the four initial collections become templates that exercise it.

| Phase | Deliverable | Done when |
|---|---|---|
| **1. Foundation** | Next 16 + Tailwind v4 + shadcn, Supabase project, auth pages, proxy, app shell (sidebar, dark theme), deployed to Vercel | You can sign up, log in, stay logged in, reset password, and see an empty dashboard on the live URL |
| **2. Collections & dynamic entries** | Migrations + RLS, collections CRUD, field editor, field registry, templates (Movies, TV, Books, Watches, Shoes), entry create/edit/delete/detail, grid + list views | You create "Fragrances" from the UI with 5 custom fields and add entries without touching code |
| **3. Browsing, images & lookup** | Search, filters (status/tags/rating/custom select), sorting, cover image upload to Storage with signed URLs, image field type, favourites; lookup architecture (§9) with TMDB movies + TV as first providers | Typing "Inception" shows posters to pick from and fills the form; 200 entries browse well on desktop and phone |
| **4. Dashboard, timeline, export, books lookup** | Activity log trigger, dashboard stats + recent items, timeline by `occurred_on`, JSON/CSV export, light theme toggle, profile settings, Google Books provider | Dashboard and timeline populate from real data; export downloads everything |
| **5. Later** | Goals & milestones, generic image provider for other collections, extra field types, tag management, image galleries, custom SMTP, PWA | As wanted |

Each phase ends with a Vercel deploy and a short checklist run before the next starts.

---

## 7. Critique: weak points in the brief and recommended changes

1. **Phase ordering (biggest).** Build dynamic collections from the start (see §6).
2. **Open sign-up on a public URL.** Anyone who finds the URL can create an account and
   consume your free-tier quota. Keep the sign-up page, but add an `ALLOW_SIGNUP` env flag
   (default off in production) or disable new sign-ups in Supabase once your account exists.
3. **Supabase free tier pauses after 7 days without activity.** For a personal site used a
   few times a week this is the most likely "it's broken" moment. Options: a Vercel cron
   that pings a keep-alive route daily, or accept the one-click restore. Decide early.
4. **Supabase's built-in email sender is rate-limited and only delivers to project team
   members.** Fine for you; any other real user needs custom SMTP (e.g. Resend's free tier).
5. **"Movies & TV Shows" as one collection** mixes two shapes (TV needs seasons/episodes).
   Recommend two templates. Easy to merge later via a "Type" field if preferred.
6. **Tags / Images / Attributes as separate tables** — simplified as in §2.2.
7. **Status as a plain custom field** would make the Dashboard and Wishlist impossible to
   build generically. Promoted column with per-collection options (§2.1) solves this.
8. **"Download associated images" in export** means zipping from Storage inside a
   serverless function with a 10-second default timeout. v1 export should be JSON + CSV
   with image paths and a list of signed URLs; a zip can come later or run client-side.
9. **Rating scale.** Movies often use 1–10, books 1–5. Proposal: store 0–10, display as five
   stars with halves everywhere. Uniform UI, no per-collection configuration.
10. **Reading progress** stays a pair of number fields (pages, current page) in v1. A
    progress bar is a small later enhancement, not a schema feature.

Nothing in the brief is architecturally wrong; the points above are where the plan would
either cause rework or surprise you after launch.

---

## 8. Decisions (resolved 2026-11-04)

| Topic | Decision |
|---|---|
| Schema | Approved as in §2 |
| Sign-up | Gated by `NEXT_PUBLIC_ALLOW_SIGNUP` env flag, **initially `true`** |
| Supabase pause | Vercel cron hits `/api/cron/keepalive` daily (Hobby plan allows daily crons); route is protected by `CRON_SECRET` and runs a trivial `select 1`-style query |
| Movies / TV | Two separate templates (`tmdb_movie`, `tmdb_tv` providers) |
| Rating | Stored 0–10, shown as five half-stars everywhere |
| Docs | Concise docs live in `/docs`: `ARCHITECTURE.md`, `PLAN.md`, `PROGRESS.md` |

---

## 9. Image & metadata lookup (brief §11)

Goal: type a name, pick the right match, get poster/cover + metadata filled in, then edit and save.

### 9.1 Provider contract

```ts
// src/lib/lookup/types.ts
export interface LookupProvider {
  id: 'tmdb_movie' | 'tmdb_tv' | 'google_books' | ...;
  label: string;                                   // "TMDB (Movies)"
  attribution?: string;                            // shown in UI as the provider's terms require
  outputs: Record<string, { label: string; type: FieldType }>;   // what this provider can fill
  search(query: string): Promise<LookupResult[]>;  // server-only
  details?(externalId: string): Promise<LookupResult>;           // optional richer fetch on select
}
export interface LookupResult {
  externalId: string;
  title: string;
  subtitle?: string;        // "2010 · Christopher Nolan"
  imageUrl?: string;        // provider-hosted image
  values: Record<string, unknown>;   // keyed by provider output key: { release_year: 2010, director: "…" }
}
```

Providers live in `src/lib/lookup/providers/*.ts` and are registered in one map. The
core collection code never imports a specific provider, so adding one later touches only
that folder.

### 9.2 Binding providers to collections

- `collections.lookup_provider` says which provider a collection uses (templates preset
  it; a blank collection can pick one in settings, or none).
- `collection_fields.lookup_key` binds a custom field to one of the provider's `outputs`
  (e.g. field "Director" ← `director`). Promoted columns bind implicitly: `title`,
  `cover image`, and a provider may also output `occurred_on`-style dates if sensible.
- On select, the client receives the chosen `LookupResult`, maps `values` through the
  bindings into form state, and the user edits before saving. Nothing is written
  automatically.

### 9.3 Server side

- `searchLookup(providerId, query)` is a Server Action. API keys (`TMDB_API_KEY`,
  `GOOGLE_BOOKS_API_KEY`) are plain env vars, never `NEXT_PUBLIC_`.
- Caching: provider fetches use `fetch(url, { next: { revalidate: 86400 } })`, so repeated
  queries hit Vercel's data cache for a day. The client debounces input (400 ms) and
  requires ≥ 2 characters.
- Images: when the user saves an entry with a provider image, the Server Action downloads
  it once and stores it in the private Storage bucket (`image_source = 'provider'`,
  `external_provider`, `external_id` recorded). One display path for all images, no
  hotlink breakage, and images come along in exports. Attribution text (e.g. "This product
  uses the TMDB API but is not endorsed or certified by TMDB") is shown in the lookup UI and
  on the Settings page.
- A manual "Image URL" option does the same download-and-store, and file upload remains the
  fallback. No scraping, no AI-generated stand-ins.

### 9.4 Order of implementation

1. Phase 3: contract + registry, TMDB movies and TV, lookup picker UI with loading/empty/error states.
2. Phase 4: Google Books (ISBN and title search).
3. Later: a generic image provider for watches/shoes. Decision 2026-11-06: Google's Custom Search
   API is closed to new customers; **Brave Image Search** (official API, image endpoint, monthly free
   credit, card required) is the candidate, reserved as provider id `brave_images`. Not built yet;
   upload and paste-a-URL cover the gap.
