import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { connection } from "next/server";
import type { Database } from "@/types/database";

/**
 * Anonymous client for the public share pages: publishable key, no cookies, no session.
 * Everything it can read is limited to the `shared_collection` function and the
 * storage policy for shared covers.
 */
export async function createPublicClient() {
  await connection();
  return createSupabaseClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
