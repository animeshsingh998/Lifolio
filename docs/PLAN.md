# Lifolio — Plan

Phased roadmap. Each phase ends with a working deploy on Vercel. Details in `ARCHITECTURE.md`.

## Phase 1 — Foundation ✅ (verified 2026-11-05)
- [x] Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui (dark theme default)
- [x] Supabase project connected (`@supabase/ssr` browser/server/proxy clients)
- [x] Auth: sign-up (env-gated), login, logout, forgot/reset password, `/auth/confirm`
- [x] Protected `(app)` route group with sidebar shell; placeholder Dashboard, Collections, Settings
- [x] `/api/cron/keepalive` + `vercel.json` daily cron
- [x] GitHub repo pushed
- [ ] Vercel project + env vars (`CRON_SECRET`, Supabase URL/key, `NEXT_PUBLIC_SITE_URL`) — can happen any time

## Phase 2 — Collections & dynamic entries (code complete 2026-11-05, awaiting owner test)

Approved with: activity log now, react-hook-form + Zod, Vitest, dnd-kit drag-and-drop.

### 2.1 Data layer (no UI)
- [x] `0002_collections.sql`: `collections`, `collection_fields`, `entries`, `activity_log` + indexes, `owner_all` RLS, `set_updated_at` triggers, activity trigger on entries
- [x] `src/types/database.ts` hand-written for now (5 tables); switch to `supabase gen types` once the CLI is set up
- [x] `src/lib/fields/registry.ts` (text, textarea, number, date, select, url, checkbox; `image` registered but hidden until Phase 3)
- [x] `src/lib/fields/schema.ts` — `buildEntrySchema(collection, fields)` Zod builder, used by both form and Server Action
- [x] `src/lib/collections/templates.ts` — Movies, TV Shows, Books, Watches, Shoes; `slug.ts`
- [x] Vitest for the pure logic above (schema builder, slug, templates validity)

### 2.2 Collections
- [x] `/collections`: cards (icon, name, entry count), "New collection" dialog → pick template or blank, name
- [x] Sidebar lists the user's collections
- [x] `/collections/[slug]/settings`: name, description, icon (curated Lucide set), item noun, rating on/off, date label, default layout
- [x] Status editor (add / rename / drag-reorder / delete; kind planned|active|done|none; deleting clears that status on entries)
- [x] Delete collection (confirm dialog, cascades)

### 2.3 Field editor (same settings page)
- [x] Add field dialog: label, type, options (select choices; number min/max/step/unit), required, show in card
- [x] Edit dialog, drag-to-reorder (dnd-kit), delete (confirm; strips the key from all entries' `attributes`)
- [x] Type change not allowed (delete + re-create), per ARCHITECTURE §4

### 2.4 Entries
- [x] `/collections/[slug]`: grid / list toggle (persisted in `default_layout`), empty state
- [x] `/collections/[slug]/new` and `/[entryId]/edit`: generated form — title, status, rating (5 half-stars), date, tags, notes, favourite, then custom fields via registry
- [x] `/collections/[slug]/[entryId]`: detail view through `Display` components, edit / delete
- [x] Server Actions `createEntry` / `updateEntry` / `deleteEntry` re-validate with the same Zod schema

### 2.5 Wrap-up
- [x] Loading skeletons + error boundaries for collection routes, toasts on actions
- [x] Docs updated, lint / tsc / build / tests green
- [ ] Owner: run `0002_collections.sql`, walk through `TESTING.md`, deploy
- Done when: "Fragrances" is created from the UI with 5 custom fields and has entries, without touching code

Out of scope for Phase 2 (Phase 3): search / filter / sort, cover images and Storage, lookup.

## Phase 3 — Images, lookup & browsing — DONE 2026-11-06 (owner verified)

### 3.1 Images & lookup (done)
- [x] `0003_storage.sql`: private bucket `entry-images` (8 MB, image/* only), owner-folder policies; pushed via CLI
- [x] Lookup contract + registry (`src/lib/lookup`); providers: TMDB movies, TMDB TV, Books (Google Books with key, Open Library fallback / default); mapping unit tests
- [x] Server Actions `searchLookup` / `lookupDetails` (keys server-side, 24 h fetch cache)
- [x] Picker dialog: debounced search, thumbnails, loading / empty / error states, attribution; pick fills title, cover and bound fields
- [x] Cover control on the entry form: provider image, pasted URL (downloaded on save), file upload; remove
- [x] Signed URLs on read; covers on cards, rows and the detail page; images removed with their entry / collection
- [x] Collection settings: choose a lookup provider (so blank collections can use one)
- [x] Owner: tested
- Deferred: generic image search for watches / shoes etc. — **Brave Image Search** (`brave_images`, env `BRAVE_SEARCH_API_KEY`); decided 2026-11-06 to add later if needed. Google's image API is closed to new customers. Until then: upload or paste a URL.
- Deferred: `image` custom field type (extra photos) and server-side resize/WebP conversion.

### 3.2 Bulk import from JSON (done)
- Input: JSON array of `{ title | name, rating?, year?, status?, date?, tags?, notes?, <custom field label>? }`; ratings out of 5 (auto-detect, overridable)
- Phase A "resolve": chunked provider search → review table (match, year, thumbnail, weak-match flag, duplicates, unmatched); rows can be unticked or switched to another result
- Phase B "import": browser sends approved rows 5 at a time → details + cover + insert; progress, retry failures
- Defaults per collection: status (Movies/TV → Watched, Books → Finished); option to create unmatched titles without metadata
- Collections without a provider: plain bulk insert
- [x] parser + tests · [x] `resolveImportBatch` / `importEntryBatch` actions · [x] `/collections/[slug]/import` wizard (paste → review → progress → summary, retry failed)

### 3.3 Browsing (done)
- [x] Per-collection filter bar: search (title / notes / tag), status, minimum rating, select fields, tags (with counts), favourites, sort — all URL params (`src/lib/entries/filters.ts`, unit-tested)
- [x] Pagination, 60 per page (`?page=`), with "nothing on this page / clear filters" states
- [x] Global search: Ctrl/⌘ K palette (collections + entries, debounced Server Action) and `/search?q=` results page grouped by collection
- [x] `0004_search.sql`: `pg_trgm` index on `entries.title`, `collection_tag_counts()` RPC; applied remotely
- [x] Owner: tested (fixed: palette needed an explicit cmdk `Command` root)
- Later if needed: number-field sorting, "checked" filter for checkbox fields, saved views

## Phase 4 — Dashboard, timeline, export

### 4.1 Dashboard (approved and built 2026-11-06, awaiting owner test)
Brief §5: collection statistics, recently added, recent activity, quick access, items currently tracked. Calm, no charts in v1.
- Top row — four stat tiles: entries total, collections, added in the last 30 days, favourites
- "Currently tracking" — entries whose status has kind `active` (Watching, Reading, …) across collections, newest first, up to 8 cover tiles
- "Recently added" — last 8 entries across collections as cover tiles (reuses `EntryCard`)
- "Collections" — one compact card per collection: icon, name, count, slim planned/active/done bar, average rating, favourites; links to the collection (quick access)
- "Recent activity" — last 15 `activity_log` rows: action icon, summary, relative time, link to the entry when it still exists
- Data: migration `0005_dashboard.sql` adds `collection_stats()` (security invoker, one row per collection: total, counts per status, avg rating, favourites, added_30d); other sections are plain selects with signed cover URLs
- Files: `src/lib/queries/dashboard.ts`, `src/lib/time.ts` (relative time, tested), `src/components/dashboard/{stat-tiles,collection-stat-card,entry-strip,activity-feed}.tsx`, `dashboard/page.tsx` + `loading.tsx`; `database.ts` function type
- Empty states: no collections → current empty state; collections but no entries → tiles at 0 with a nudge to add or import
- [x] migration `0005_dashboard.sql` applied · [x] queries · [x] components · [x] page + loading · [ ] Owner: test per `TESTING.md` Phase 4.1

### 4.x Public share links (approved and built 2026-11-07, awaiting owner test)
Owner: a Share button on a collection page → pick validity (1 h, 6 h, 1 d, 7 d) → link anyone can open without login; read-only, with filters and sorting.
- DB `0006_shares.sql`: table `collection_shares (id, collection_id, user_id, token_hash, expires_at, revoked_at, created_at)`, owner-only RLS; security-definer RPC `shared_collection(p_token)` that checks hash + expiry + not revoked and returns the collection, its fields and its entries (capped) as JSON — the only anonymous read path; storage policy letting anon sign URLs only for covers of currently shared collections (no service-role key needed)
- Server: `createShareLink` / `revokeShareLink` actions (24 random bytes, base64url; only the SHA-256 is stored), `listShareLinks`; `applyFilters(entries, filters)` pure helper (tests) so the public page reuses the same URL filter contract, in TypeScript
- Routes: `/s/[token]` (own minimal layout: name, "shared from Lifolio", expires in …), grid/list + filter bar + sort + pagination, `/s/[token]/[entryId]` read-only detail; expired/revoked → friendly page; proxy allows `/s/*` unauthenticated
- UI: Share dialog on the collection page (duration choice → link + copy button; list of active links with expiry and Revoke); cards/rows/entries view get a `readOnly` mode (no quick controls, no edit, links stay inside `/s/…`)
- [x] migration `0006_shares.sql` applied · [x] actions + queries · [x] share dialog · [x] `/s/[token]` + detail + unavailable page · [x] read-only card/row/view · [ ] Owner: test per `TESTING.md`

### 4.2 Later in Phase 4
- [ ] Timeline by `occurred_on` (month groups, reuses the filter bar idea)
- [ ] JSON + CSV export (`/api/export`)
- [ ] Profile settings (display name)

## Phase 5 — Later
Goals & milestones · generic image provider · more field types · tag management · image galleries · custom SMTP

### PWA (built 2026-11-08)
- `src/app/manifest.ts` (standalone, start at /dashboard), icons in `public/icons` + `src/app/apple-icon.png` generated from the Layers mark
- `public/sw.js`: cache-first for hashed build assets, network-first for pages with last-copy / `/offline` fallback; shared pages are never cached; registered in production only (`PwaRegister`)
- Proxy lets `sw.js`, the manifest, icons and `/offline` through unauthenticated
