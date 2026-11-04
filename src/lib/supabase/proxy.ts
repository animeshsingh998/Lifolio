import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Routes reachable without a session. Everything else requires one. */
const PUBLIC_PREFIXES = ["/login", "/signup", "/forgot-password", "/auth"];
/** Routes that should bounce an already signed-in user to the app. */
const AUTH_ONLY_PREFIXES = ["/login", "/signup", "/forgot-password"];

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Refreshes the Supabase session cookie on every request and performs the
 * optimistic auth redirect. This is a convenience layer only: RLS and the
 * per-layout `requireUser()` check remain the real security boundary.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and getClaims():
  // getClaims() is what refreshes an expiring token.
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims);
  const { pathname } = request.nextUrl;

  if (!isSignedIn && !startsWithAny(pathname, PUBLIC_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (isSignedIn && (pathname === "/" || startsWithAny(pathname, AUTH_ONLY_PREFIXES))) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Must return supabaseResponse as-is so refreshed cookies reach the browser.
  return supabaseResponse;
}
