/**
 * Google Books provider. Works without a key (low shared quota); set
 * GOOGLE_BOOKS_API_KEY for your own quota. Mapping functions are pure and unit-tested.
 */
import { fetchWithRetry } from "../fetch-retry";
import type { LookupProvider, LookupResult } from "../types";

const API = "https://www.googleapis.com/books/v1";

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

function httpsImage(url: string | undefined): string | null {
  if (!url) return null;
  return url.replace(/^http:\/\//, "https://").replace(/&edge=curl/g, "");
}

type ImageLinks = NonNullable<GoogleVolume["volumeInfo"]>["imageLinks"];

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

async function booksFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${API}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const key = process.env.GOOGLE_BOOKS_API_KEY?.trim();
  if (key) url.searchParams.set("key", key);
  const res = await fetchWithRetry(url, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`Google Books ${res.status}`);
  return (await res.json()) as T;
}

export const googleBooks: LookupProvider = {
  id: "google_books",
  label: "Google Books",
  attribution: "Book data and covers from Google Books.",
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
    const data = await booksFetch<{ items?: GoogleVolume[] }>("/volumes", {
      q: buildBooksQuery(query),
      maxResults: "10",
      printType: "books",
    });
    return (data.items ?? []).map(mapVolume);
  },
  async details(externalId) {
    if (!/^[\w-]{1,40}$/.test(externalId)) return null;
    const data = await booksFetch<GoogleVolume>(`/volumes/${externalId}`, {});
    return mapVolume(data);
  },
};
