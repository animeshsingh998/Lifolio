import { googleBooks } from "./providers/google-books";
import { tmdbMovie, tmdbTv } from "./providers/tmdb";
import { isLookupProviderId, type LookupProvider, type LookupProviderId, type LookupProviderInfo } from "./types";

/**
 * The only place that knows which providers exist. Adding one = a file in
 * ./providers plus a line here (and its id in LOOKUP_PROVIDER_IDS).
 * Reserved for later: `brave_images` (generic image search for watches, shoes, …).
 */
const providers: Record<LookupProviderId, LookupProvider> = {
  tmdb_movie: tmdbMovie,
  tmdb_tv: tmdbTv,
  google_books: googleBooks,
};

export function getProvider(id: string | null | undefined): LookupProvider | null {
  return isLookupProviderId(id) ? providers[id] : null;
}

/** Client-safe description of a collection's provider (no functions, no secrets). */
export function providerInfo(id: string | null | undefined): LookupProviderInfo | null {
  const p = getProvider(id);
  return p ? { id: p.id, label: p.label, attribution: p.attribution, configured: p.isConfigured() } : null;
}

export { LOOKUP_PROVIDER_CHOICES } from "./types";
