import { createClient } from "@supabase/supabase-js";

/**
 * Hit once a day by Vercel Cron (see vercel.json) so the Supabase free-tier
 * project never pauses for inactivity. Vercel sends `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Anonymous client: RLS returns no rows, but the query still reaches Postgres.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  const { error } = await supabase.from("profiles").select("id", { head: true, count: "exact" });

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true, at: new Date().toISOString() });
}
