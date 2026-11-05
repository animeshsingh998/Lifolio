import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { cookies } from "next/headers";
import { connection } from "next/server";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Always create a new one per request; never store it in a module-level variable.
 */
export async function createClient() {
  // Session handling reads the clock (token expiry via Date.now()), which Cache Components
  // treats as request-time I/O. connection() excludes everything below from prerendering.
  await connection();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, which cannot write cookies.
            // Safe to ignore because proxy.ts refreshes sessions.
          }
        },
      },
    },
  );
}
