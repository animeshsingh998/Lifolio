/**
 * Metadata & image lookup contract (ARCHITECTURE §9). Providers are server-only;
 * the UI only ever sees LookupResult objects returned by Server Actions.
 */
import type { FieldType } from "@/types/domain";

/** `brave_images` is reserved for a generic image-search provider (decided 2026-11-06: not now). */
export const LOOKUP_PROVIDER_IDS = ["tmdb_movie", "tmdb_tv", "google_books"] as const;
export type LookupProviderId = (typeof LOOKUP_PROVIDER_IDS)[number];

export function isLookupProviderId(value: unknown): value is LookupProviderId {
  return typeof value === "string" && (LOOKUP_PROVIDER_IDS as readonly string[]).includes(value);
}

/** Choices for the collection settings dropdown (client-safe). */
export const LOOKUP_PROVIDER_CHOICES: { id: LookupProviderId; label: string }[] = [
  { id: "tmdb_movie", label: "TMDB — movies" },
  { id: "tmdb_tv", label: "TMDB — TV shows" },
  { id: "google_books", label: "Google Books" },
];

export type LookupOutput = { label: string; type: FieldType };

export type LookupResult = {
  externalId: string;
  title: string;
  /** "2010 · Christopher Nolan" */
  subtitle?: string;
  /** Small image for the results list. */
  thumbnailUrl: string | null;
  /** Larger image to download and store when the user saves. */
  imageUrl: string | null;
  /** Keyed by the provider's output keys; bound to fields through `collection_fields.lookup_key`. */
  values: Record<string, unknown>;
};

export interface LookupProvider {
  id: LookupProviderId;
  label: string;
  /** Shown in the picker and on the settings page, as the provider's terms require. */
  attribution: string;
  outputs: Record<string, LookupOutput>;
  /** False when the API key is missing; the UI then hides the search button. */
  isConfigured(): boolean;
  search(query: string): Promise<LookupResult[]>;
  /** Optional richer fetch when a result is chosen (credits, page counts, bigger images). */
  details?(externalId: string): Promise<LookupResult | null>;
}

/** What the picker needs to know about a collection's provider; safe to send to the client. */
export type LookupProviderInfo = {
  id: LookupProviderId;
  label: string;
  attribution: string;
  configured: boolean;
};
