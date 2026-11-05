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

## Phase 2 — Collections & dynamic entries (proposed, awaiting approval)

Built in five steps; each one is usable and committed before the next starts.

### 2.1 Data layer (no UI)
- [ ] `0002_collections.sql`: `collections`, `collection_fields`, `entries`, `activity_log` + indexes, `owner_all` RLS, `set_updated_at` triggers, activity trigger on entries
- [ ] `src/types/database.ts` hand-written for now (5 tables); switch to `supabase gen types` once the CLI is set up
- [ ] `src/lib/fields/registry.ts` (text, textarea, number, date, select, url, checkbox; `image` registered but hidden until Phase 3)
- [ ] `src/lib/fields/schema.ts` — `buildEntrySchema(collection, fields)` Zod builder, used by both form and Server Action
- [ ] `src/lib/collections/templates.ts` — Movies, TV Shows, Books, Watches, Shoes; `slug.ts`
- [ ] Vitest for the pure logic above (schema builder, slug, templates validity)

### 2.2 Collections
- [ ] `/collections`: cards (icon, name, entry count), "New collection" dialog → pick template or blank, name
- [ ] Sidebar lists the user's collections
- [ ] `/collections/[slug]/settings`: name, description, icon (curated Lucide set), item noun, rating on/off, date label, default layout
- [ ] Status editor (add / rename / reorder / delete; kind planned|active|done|none; deleting clears that status on entries)
- [ ] Delete collection (confirm dialog, cascades)

### 2.3 Field editor (same settings page)
- [ ] Add field dialog: label, type, options (select choices; number min/max/step/unit), required, show in card
- [ ] Rename inline, reorder with up/down, delete (confirm; strips the key from all entries' `attributes`)
- [ ] Type change not allowed (delete + re-create), per ARCHITECTURE §4

### 2.4 Entries
- [ ] `/collections/[slug]`: grid / list toggle (persisted in `default_layout`), empty state
- [ ] `/collections/[slug]/new` and `/[entryId]/edit`: generated form — title, status, rating (5 half-stars), date, tags, notes, favourite, then custom fields via registry
- [ ] `/collections/[slug]/[entryId]`: detail view through `Display` components, edit / delete
- [ ] Server Actions `createEntry` / `updateEntry` / `deleteEntry` re-validate with the same Zod schema

### 2.5 Wrap-up
- [ ] Loading skeletons + error boundaries for collection routes, toasts on actions
- [ ] Docs updated, lint / tsc / build / tests green, deployed
- Done when: "Fragrances" is created from the UI with 5 custom fields and has entries, without touching code

Out of scope for Phase 2 (Phase 3): search / filter / sort, cover images and Storage, lookup.

## Phase 3 — Browsing, images & lookup
- [ ] Search, filters (status, tags, rating, select fields), sorting via URL params
- [ ] Storage bucket + policies; cover upload; image field type; signed URLs
- [ ] Lookup provider contract + registry; TMDB movies + TV
- [ ] Lookup picker UI (debounced search, results grid, loading/empty/error, attribution)
- [ ] Provider image download-and-store on save; manual image URL option

## Phase 4 — Dashboard, timeline, export
- [ ] Dashboard: stats per collection, recently added, in-progress, recent activity (from `activity_log`)
- [ ] Timeline by `occurred_on`
- [ ] JSON + CSV export (`/api/export`)
- [ ] Profile settings (display name)
- [ ] Google Books lookup provider

## Phase 5 — Later
Goals & milestones · generic image provider · more field types · tag management · image galleries · custom SMTP · PWA
