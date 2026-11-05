# Lifolio

A personal life dashboard and digital archive: collections of things you own, watch, read and want,
with custom fields you define yourself.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Supabase (Postgres, Auth, Storage) · Vercel.

## Local setup

1. Node 24 (`nvm use 24.19.0`) and `npm install`.
2. Create a Supabase project. In the SQL editor run `supabase/migrations/*.sql` in order.
3. Supabase → Authentication → URL Configuration: set Site URL to your app URL and add
   `http://localhost:3000/auth/confirm` and `https://<your-domain>/auth/confirm` to Redirect URLs.
4. `cp .env.example .env.local` and fill in the values.
5. `npm run dev` → http://localhost:3000

## Scripts

`npm run dev` · `npm run build` · `npm run lint` · `npm test` (Vitest, pure logic only)

## Supabase CLI (optional, recommended)

Lets migrations be applied from the repo instead of pasting SQL.

```bash
npm i -D supabase                 # CLI as a dev dependency, run via npx
npx supabase login                # opens the browser once
npx supabase link --project-ref <ref>   # <ref> = the id in your project URL; asks for the DB password
npx supabase migration repair --remote --status applied 0001 0002   # if you already ran those by hand
npx supabase db push              # applies any new files in supabase/migrations
npx supabase gen types typescript --remote > src/types/database.ts
```

## Deploy

Push to GitHub, import the repo in Vercel, add the same env vars (plus a random `CRON_SECRET`).
`vercel.json` schedules a daily ping to `/api/cron/keepalive` so the free Supabase project stays awake.

## Docs

- `docs/ARCHITECTURE.md` — design decisions, schema, security, dynamic collections, lookup providers
- `docs/PLAN.md` — phased roadmap
- `docs/PROGRESS.md` — what is done and what the owner still needs to do
