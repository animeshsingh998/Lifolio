# Lifolio — Plan

Phased roadmap. Each phase ends with a working deploy on Vercel. Details in `ARCHITECTURE.md`.

## Phase 1 — Foundation
- [x] Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui (dark theme default)
- [x] Supabase project connected (`@supabase/ssr` browser/server/proxy clients)
- [x] Auth: sign-up (env-gated), login, logout, forgot/reset password, `/auth/confirm`
- [x] Protected `(app)` route group with sidebar shell; placeholder Dashboard, Collections, Settings
- [x] `/api/cron/keepalive` + `vercel.json` daily cron
- [ ] GitHub repo + Vercel deploy with env vars

## Phase 2 — Collections & dynamic entries
- [ ] Migrations: profiles, collections, collection_fields, entries (+ RLS, triggers)
- [ ] Collections CRUD (name, icon, description, statuses, date label)
- [ ] Field editor (add / rename / reorder / delete custom fields)
- [ ] Field type registry + Zod schema builder
- [ ] Templates: Movies, TV Shows, Books, Watches, Shoes
- [ ] Entry create / edit / delete / detail; grid and list views

## Phase 3 — Browsing, images & lookup
- [ ] Search, filters (status, tags, rating, select fields), sorting via URL params
- [ ] Storage bucket + policies; cover upload; image field type; signed URLs
- [ ] Lookup provider contract + registry; TMDB movies + TV
- [ ] Lookup picker UI (debounced search, results grid, loading/empty/error, attribution)
- [ ] Provider image download-and-store on save; manual image URL option

## Phase 4 — Dashboard, timeline, export
- [ ] activity_log table + trigger
- [ ] Dashboard: stats per collection, recently added, in-progress, recent activity
- [ ] Timeline by `occurred_on`
- [ ] JSON + CSV export (`/api/export`)
- [ ] Light theme toggle, profile settings
- [ ] Google Books lookup provider

## Phase 5 — Later
Goals & milestones · generic image provider · more field types · tag management · image galleries · custom SMTP · PWA
