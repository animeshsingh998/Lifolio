# Lifolio — Progress

Short log of what is done, what is in flight, and anything the owner must do by hand.
Newest first.

## 2026-11-05
- Owner wired up Supabase locally; sign-up and login work.
- Fixed two dev-overlay errors on /dashboard: Base UI `Button` rendering a `Link` needs `nativeButton={false}`; Supabase session checks call `Date.now()`, which Cache Components flags during runtime prerender, so `createClient()` now awaits `connection()` first.

## 2026-11-04 — Phase 1 code complete (not yet deployed)
- Next.js 16.4.5 (App Router, `src/`, Cache Components on) + Tailwind v4 + shadcn/ui v4 (Base UI, nova preset, dark default).
- Supabase SSR clients (`src/lib/supabase/{client,server,proxy}.ts`), `src/proxy.ts` session refresh + redirects.
- Auth: login, sign-up (gated by `NEXT_PUBLIC_ALLOW_SIGNUP`), forgot/reset password, `/auth/confirm`, `/auth/error`, logout.
- App shell: collapsible sidebar, user menu, placeholder Dashboard / Collections / Timeline / Settings (theme toggle).
- `/api/cron/keepalive` + `vercel.json` daily cron. First migration `supabase/migrations/0001_profiles.sql`.
- `npm run lint`, `tsc --noEmit` and `npm run build` all pass.
- Architecture approved; brief §11 (image & metadata lookup) folded into `ARCHITECTURE.md` §9.
- Local toolchain: Node switched to 24.19.0 via nvm-windows. `gh`, `vercel`, `supabase` CLIs are not installed.

## Owner to-do (blocks end-to-end testing and deploy)
1. Create a Supabase project; run `supabase/migrations/0001_profiles.sql` in the SQL editor.
2. Supabase → Authentication → URL Configuration: add `http://localhost:3000/auth/confirm` (and later the Vercel URL) to Redirect URLs.
3. `cp .env.example .env.local`, fill in URL + publishable key, then `npm run dev` and test sign-up → confirm email → dashboard.
4. Create a GitHub repo, push, import into Vercel, add env vars (`CRON_SECRET` = any long random string).
5. Phase 3 later: TMDB API key.
