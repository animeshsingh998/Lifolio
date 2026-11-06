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

## Phase 3 — Images, lookup & browsing (reordered 2026-11-06: images first)

### 3.1 Images & lookup (code complete 2026-11-06, awaiting owner test)
- [x] `0003_storage.sql`: private bucket `entry-images` (8 MB, image/* only), owner-folder policies; pushed via CLI
- [x] Lookup contract + registry (`src/lib/lookup`); providers: TMDB movies, TMDB TV, Books (Google Books with key, Open Library fallback / default); mapping unit tests
- [x] Server Actions `searchLookup` / `lookupDetails` (keys server-side, 24 h fetch cache)
- [x] Picker dialog: debounced search, thumbnails, loading / empty / error states, attribution; pick fills title, cover and bound fields
- [x] Cover control on the entry form: provider image, pasted URL (downloaded on save), file upload; remove
- [x] Signed URLs on read; covers on cards, rows and the detail page; images removed with their entry / collection
- [x] Collection settings: choose a lookup provider (so blank collections can use one)
- [ ] Owner: test per `TESTING.md` Phase 3
- Deferred: generic image search for watches / shoes etc. — **Brave Image Search** (`brave_images`, env `BRAVE_SEARCH_API_KEY`); decided 2026-11-06 to add later if needed. Google's image API is closed to new customers. Until then: upload or paste a URL.
- Deferred: `image` custom field type (extra photos) and server-side resize/WebP conversion.

### 3.2 Bulk import from JSON (approved 2026-11-06, next up)
- Input: JSON array of `{ title | name, rating?, year?, status?, date?, tags?, notes?, <custom field label>? }`; ratings out of 5 (auto-detect, overridable)
- Phase A "resolve": chunked provider search → review table (match, year, thumbnail, weak-match flag, duplicates, unmatched); rows can be unticked or switched to another result
- Phase B "import": browser sends approved rows 5 at a time → details + cover + insert; progress, retry failures
- Defaults per collection: status (Movies/TV → Watched, Books → Finished); option to create unmatched titles without metadata
- Collections without a provider: plain bulk insert
- [ ] parser + tests · [ ] `resolveImport` / `importEntries` actions · [ ] `/collections/[slug]/import` page

### 3.3 Browsing
- [ ] Search, filters (status, tags, rating, select fields), sorting via URL params
- [ ] Pagination past 500 entries

## Phase 4 — Dashboard, timeline, export
- [ ] Dashboard: stats per collection, recently added, in-progress, recent activity (from `activity_log`)
- [ ] Timeline by `occurred_on`
- [ ] JSON + CSV export (`/api/export`)
- [ ] Profile settings (display name)
- [ ] Google Books lookup provider

## Phase 5 — Later
Goals & milestones · generic image provider · more field types · tag management · image galleries · custom SMTP · PWA
