# Lifolio — Progress

Short log of what is done, what is in flight, and anything the owner must do by hand.
Newest first.

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
1. **Run `supabase/migrations/0002_collections.sql`** in the Supabase SQL editor, then go through `docs/TESTING.md`.
2. Install the Supabase CLI (see README) so future migrations can be pushed from the repo.
3. Vercel: import the GitHub repo, add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_ALLOW_SIGNUP`, `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET` (any long random string).
4. Supabase → Authentication → URL Configuration: add the Vercel URL's `/auth/confirm` to Redirect URLs.
5. Phase 3 later: TMDB API key.
