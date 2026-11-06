# Lifolio — Progress

Short log of what is done, what is in flight, and anything the owner must do by hand.
Newest first.

## 2026-11-06 — Phase 4.1 dashboard (code complete, not yet tested by owner)
- `/dashboard`: stat tiles, "Currently tracking" (statuses of kind active), "Recently added", per-collection stat cards with a status bar, recent activity feed from `activity_log`.
- Migration `0005_dashboard.sql` (`collection_stats()` RPC) applied remotely. `src/lib/time.ts` relative time helper (tested).

## 2026-11-06 — Phase 3 done (owner verified 3.1–3.3)
- Fixed: Ctrl K palette crashed (`reading subscribe`) because the Base UI `CommandDialog` does not wrap children in a cmdk `Command` root; the palette now does.
- Phase 4.1 dashboard proposed in `PLAN.md`, awaiting a go.

## 2026-11-06 — Phase 3.3 browsing & global search
- Owner confirmed Phase 3.2 import and the form-reset fix work.
- Collection pages: filter bar (search, status, rating, select fields, tags, favourites) + sort + pagination, all in the URL so views are shareable and survive back/forward. `listEntries` now takes parsed filters and returns `{ entries, total }`.
- Global search: Ctrl/⌘ K palette anywhere in the app (sidebar "Search" item, icon in the mobile header) backed by the `quickSearch` Server Action; `/search?q=` shows full results grouped by collection.
- Migration `0004_search.sql` (trigram index on titles, `collection_tag_counts` RPC) applied with `npx supabase db push --remote --yes`.
- Added shadcn `command` (cmdk) and `input-group`.

## 2026-11-06 — Phase 3.1 images & lookup (code complete, not yet tested by owner)
- Fixed: the "new entry" form reopened pre-filled. Cache Components keeps the last 3 routes mounted (React Activity), so the form is now re-seeded from server data on every reveal and after a successful create.
- Bulk JSON import (PLAN 3.2) built: `/collections/[slug]/import`. Chunked resolve (10) and import (4) driven by the browser; year-aware match ranking; duplicate and weak-match flags; extra JSON keys fill custom fields by label.
- Migration `0003_storage.sql` applied to the remote project with `npx supabase db push --remote --yes`.
- Providers: TMDB movies/TV (v3 key or v4 token), Books = Google Books when `GOOGLE_BOOKS_API_KEY` is set, else Open Library (Google returns 429 for unkeyed requests from the owner's network). Brave Image Search reserved, not built.
- Entry form: "Find" button + cover control (search / upload / URL / remove). Server downloads remote images into the bucket on save; signed URLs (1 h) on read.
- Config: `next.config.ts` image hosts; `.env.example` gained `TMDB_API_KEY`, `GOOGLE_BOOKS_API_KEY`.
- Observed: TMDB connections from the owner's network are intermittently reset (`ECONNRESET`). The picker shows a retry message; on Vercel this will not occur.

## 2026-11-06 — Theme refresh
- New look inspired by the TIGERS agency site: near-black surfaces, one signal-red accent (`oklch(0.665 0.225 30)`), warm off-white light mode, Manrope body + Space Grotesk headings, pill buttons, uppercase sidebar labels. Tokens only in `globals.css`; no logic changed.
- Supabase CLI linked (CLI 3.0 uses `--remote`, not `--linked`); both migrations marked applied, so future migrations go through `npx supabase db push`.
- Fixed: entry detail page called a client-only `formatRating`; moved to `src/lib/rating.ts`.

## 2026-11-05 — Phase 2 code complete (not yet tested by owner)
- Migration `0002_collections.sql`: collections, collection_fields, entries, activity_log (+ RLS, triggers, `remove_entry_attribute` RPC).
- Field registry (`src/lib/fields`), Zod entry-schema builder shared by form and Server Actions, 5 templates, slug helpers; Vitest (9 tests).
- Collections: list + new-collection dialog, sidebar list, settings (general, built-in fields, drag-sortable statuses), field editor (add/edit/drag-reorder/delete), delete.
- Entries: generated form (react-hook-form), grid/list views, detail, edit, delete, favourite.
- Added deps: vitest, @dnd-kit/*, @types/node 24; shadcn switch, alert-dialog, popover, toggle-group, tabs.
- Hand-written `src/types/database.ts` until the Supabase CLI is set up.

## 2026-11-05
- Owner verified Phase 1 end to end (sign-up, login, logout, dashboard, settings, theme toggle). Code pushed to GitHub.
- Phase 2 plan approved: activity log now, react-hook-form, vitest, drag-and-drop library.
- Fixed three dev-overlay errors: Base UI `Button` rendering a `Link` needs `nativeButton={false}`; `DropdownMenuLabel` must sit inside `DropdownMenuGroup`; Supabase session checks call `Date.now()`, which Cache Components flags during runtime prerender, so `createClient()` now awaits `connection()` first.

## 2026-11-04 — Phase 1 code complete
- Next.js 16.4.5 (App Router, `src/`, Cache Components on) + Tailwind v4 + shadcn/ui v4 (Base UI, nova preset, dark default).
- Supabase SSR clients (`src/lib/supabase/{client,server,proxy}.ts`), `src/proxy.ts` session refresh + redirects.
- Auth: login, sign-up (gated by `NEXT_PUBLIC_ALLOW_SIGNUP`), forgot/reset password, `/auth/confirm`, `/auth/error`, logout.
- App shell: collapsible sidebar, user menu, placeholder Dashboard / Collections / Timeline / Settings (theme toggle).
- `/api/cron/keepalive` + `vercel.json` daily cron. First migration `supabase/migrations/0001_profiles.sql`.
- Architecture approved; brief §11 (image & metadata lookup) folded into `ARCHITECTURE.md` §9.
- Local toolchain: Node 24.19.0 via nvm-windows. `gh`, `vercel`, `supabase` CLIs are not installed.

## Owner to-do
1. Test the dashboard per `docs/TESTING.md` Phase 4.1.
2. Vercel: import the GitHub repo, add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_ALLOW_SIGNUP`, `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET` (any long random string).
3. Supabase → Authentication → URL Configuration: add the Vercel URL's `/auth/confirm` to Redirect URLs.
4. Add `TMDB_API_KEY` (and optionally `GOOGLE_BOOKS_API_KEY`) to the Vercel project too.
