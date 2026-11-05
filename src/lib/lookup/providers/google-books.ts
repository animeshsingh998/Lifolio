/**
 * Books provider: Google Books when GOOGLE_BOOKS_API_KEY is set (best covers and
 * descriptions), Open Library otherwise and whenever Google throttles (HTTP 429 is
 * common for unkeyed requests). Both map to the same output keys, so field bindings
 * do not care which source answered. Mapping functions are pure and unit-tested.
 */
import { fetchWithRetry } from "../fetch-retry";
import type { LookupProvider, LookupResult } from "../types";

const GOOGLE_API = "https://www.googleapis.com/books/v1";
const OL_API = "https://openlibrary.org";
const OL_COVERS = "https://covers.openlibrary.org/b/id";
const OL_PREFIX = "ol:";

// ---- Google Books -----------------------------------------------------------

export type GoogleVolume = {
  id: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    categories?: string[];
    industryIdentifiers?: { type: string; identifier: string }[];
    imageLinks?: Partial<Record<"smallThumbnail" | "thumbnail" | "small" | "medium" | "large" | "extraLarge", string>>;
  };
};

type ImageLinks = NonNullable<GoogleVolume["volumeInfo"]>["imageLinks"];

function httpsImage(url: string | undefined): string | null {
  if (!url) return null;
  return url.replace(/^http:\/\//, "https://").replace(/&edge=curl/g, "");
}

export function largestImage(links: ImageLinks) {
  if (!links) return null;
  return httpsImage(links.extraLarge ?? links.large ?? links.medium ?? links.small ?? links.thumbnail ?? links.smallThumbnail);
}

export function mapVolume(v: GoogleVolume): LookupResult {
  const info = v.volumeInfo ?? {};
  const isbn13 = info.industryIdentifiers?.find((i) => i.type === "ISBN_13")?.identifier;
  const isbn10 = info.industryIdentifiers?.find((i) => i.type === "ISBN_10")?.identifier;
  const publishedYear = info.publishedDate && /^\d{4}/.test(info.publishedDate) ? Number(info.publishedDate.slice(0, 4)) : null;
  return {
    externalId: v.id,
    title: info.title ?? "Untitled",
    subtitle: [info.authors?.join(", "), publishedYear].filter(Boolean).join(" · ") || undefined,
    thumbnailUrl: httpsImage(info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail),
    imageUrl: largestImage(info.imageLinks),
    values: {
      authors: info.authors?.join(", ") ?? null,
      page_count: info.pageCount ?? null,
      categories: info.categories?.join(", ") ?? null,
      published_year: publishedYear,
      isbn: isbn13 ?? isbn10 ?? null,
      publisher: info.publisher ?? null,
      description: info.description ?? null,
      subtitle: info.subtitle ?? null,
    },
  };
}

/** "978-0441013593" style input → isbn: query, anything else → free text. */
export function buildBooksQuery(query: string): string {
  const compact = query.replace(/[-\s]/g, "");
  if (/^(97[89])?\d{9}[\dXx]$/.test(compact)) return `isbn:${compact}`;
  return query;
}

function googleKey() {
  return process.env.GOOGLE_BOOKS_API_KEY?.trim() ?? "";
}

async function googleFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${GOOGLE_API}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const key = googleKey();
  if (key) url.searchParams.set("key", key);
  const res = await fetchWithRetry(url, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`Google Books ${res.status}`);
  return (await res.json()) as T;
}

// ---- Open Library -----------------------------------------------------------

export type OpenLibraryDoc = {
  key: string; // "/works/OL20806514W"
  title: string;
  subtitle?: string;
  author_name?: string[];
  first_publish_year?: number;
  number_of_pages_median?: number;
  isbn?: string[];
  cover_i?: number;
  subject?: string[];
  publisher?: string[];
};

export function mapOpenLibraryDoc(d: OpenLibraryDoc): LookupResult {
  const isbn = d.isbn?.find((i) => i.length === 13) ?? d.isbn?.[0] ?? null;
  return {
    externalId: `${OL_PREFIX}${d.key.replace(/^\/works\//, "")}`,
    title: d.title,
    subtitle: [d.author_name?.slice(0, 2).join(", "), d.first_publish_year].filter(Boolean).join(" · ") || undefined,
    thumbnailUrl: d.cover_i ? `${OL_COVERS}/${d.cover_i}-M.jpg` : null,
    imageUrl: d.cover_i ? `${OL_COVERS}/${d.cover_i}-L.jpg` : null,
    values: {
      authors: d.author_name?.join(", ") ?? null,
      page_count: d.number_of_pages_median ?? null,
      categories: d.subject?.slice(0, 3).join(", ") ?? null,
      published_year: d.first_publish_year ?? null,
      isbn,
      publisher: d.publisher?.[0] ?? null,
      description: null,
      subtitle: d.subtitle ?? null,
    },
  };
}

async function openLibrarySearch(query: string): Promise<LookupResult[]> {
  const url = new URL(`${OL_API}/search.json`);
  const compact = query.replace(/[-\s]/g, "");
  if (/^(97[89])?\d{9}[\dXx]$/.test(compact)) url.searchParams.set("isbn", compact);
  else url.searchParams.set("q", query);
  url.searchParams.set("limit", "10");
  url.searchParams.set(
    "fields",
    "key,title,subtitle,author_name,first_publish_year,number_of_pages_median,isbn,cover_i,subject,publisher",
  );
  const res = await fetchWithRetry(url, {
    headers: { "user-agent": "Lifolio/1.0 (personal archive)" },
    next: { revalidate: 86400 },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Open Library ${res.status}`);
  const data = (await res.json()) as { docs?: OpenLibraryDoc[] };
  return (data.docs ?? []).filter((d) => d.title).map(mapOpenLibraryDoc);
}

// ---- Provider ---------------------------------------------------------------

export const googleBooks: LookupProvider = {
  id: "google_books",
  label: "Books",
  attribution: "Book data and covers from Google Books and Open Library.",
  outputs: {
    authors: { label: "Authors", type: "text" },
    page_count: { label: "Pages", type: "number" },
    categories: { label: "Categories", type: "text" },
    published_year: { label: "Published", type: "number" },
    isbn: { label: "ISBN", type: "text" },
    publisher: { label: "Publisher", type: "text" },
    description: { label: "Description", type: "textarea" },
    subtitle: { label: "Subtitle", type: "text" },
  },
  isConfigured: () => true,
  async search(query) {
    if (googleKey()) {
      try {
        const data = await googleFetch<{ items?: GoogleVolume[] }>("/volumes", {
          q: buildBooksQuery(query),
          maxResults: "10",
          printType: "books",
        });
        return (data.items ?? []).map(mapVolume);
      } catch (error) {
        console.warn("[lifolio] Google Books failed, falling back to Open Library:", error instanceof Error ? error.message : error);
      }
    }
    return openLibrarySearch(query);
  },
  async details(externalId) {
    if (externalId.startsWith(OL_PREFIX)) return null; // the search result already carries everything we map
    if (!/^[\w-]{1,40}$/.test(externalId)) return null;
    try {
      return mapVolume(await googleFetch<GoogleVolume>(`/volumes/${externalId}`, {}));
    } catch {
      return null; // keep the search result's data
    }
  },
};
