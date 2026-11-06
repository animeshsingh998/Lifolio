/**
 * URL ⇄ filter state for browsing a collection. Pure and shared by the page
 * (parsing `searchParams`) and the filter bar (building the next URL).
 */
import type { Collection, CollectionField } from "@/types/domain";

export const PAGE_SIZE = 60;

export const SORT_VALUES = ["updated", "created", "-created", "title", "-title", "rating", "-rating", "date", "-date"] as const;
export type SortValue = (typeof SORT_VALUES)[number];
export const DEFAULT_SORT: SortValue = "updated";

type SortSpec = { column: "updated_at" | "created_at" | "title" | "rating" | "occurred_on"; ascending: boolean };
export const SORT_SPECS: Record<SortValue, SortSpec> = {
  updated: { column: "updated_at", ascending: false },
  created: { column: "created_at", ascending: false },
  "-created": { column: "created_at", ascending: true },
  title: { column: "title", ascending: true },
  "-title": { column: "title", ascending: false },
  rating: { column: "rating", ascending: false },
  "-rating": { column: "rating", ascending: true },
  date: { column: "occurred_on", ascending: false },
  "-date": { column: "occurred_on", ascending: true },
};

/** Sort choices that make sense for this collection, with human labels. */
export function sortOptions(collection: Pick<Collection, "show_rating" | "date_label">): { value: SortValue; label: string }[] {
  const options: { value: SortValue; label: string }[] = [
    { value: "updated", label: "Recently updated" },
    { value: "created", label: "Newest added" },
    { value: "-created", label: "Oldest added" },
    { value: "title", label: "Title A–Z" },
    { value: "-title", label: "Title Z–A" },
  ];
  if (collection.show_rating) options.push({ value: "rating", label: "Highest rated" }, { value: "-rating", label: "Lowest rated" });
  if (collection.date_label) {
    options.push({ value: "date", label: `${collection.date_label}: newest` }, { value: "-date", label: `${collection.date_label}: oldest` });
  }
  return options;
}

/** Minimum-rating choices (ratings are stored 0–10, shown as 5 stars). */
export const MIN_RATING_CHOICES = [
  { value: 10, label: "5 stars" },
  { value: 8, label: "4+ stars" },
  { value: 6, label: "3+ stars" },
  { value: 4, label: "2+ stars" },
  { value: 2, label: "1+ stars" },
] as const;

export type EntryFilters = {
  q: string;
  statuses: string[];
  minRating: number | null;
  favorite: boolean;
  tags: string[];
  /** select-field key → chosen value */
  attrs: Record<string, string>;
  sort: SortValue;
  page: number;
};

export type SearchParamsInput = Record<string, string | string[] | undefined>;

const ATTR_PREFIX = "f.";

function list(v: string | string[] | undefined): string[] {
  const raw = Array.isArray(v) ? v : v ? [v] : [];
  return [...new Set(raw.flatMap((s) => s.split(",")).map((s) => s.trim()).filter(Boolean))];
}

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/** Validate URL params against the collection: unknown statuses, tags and choices are dropped. */
export function parseEntryFilters(sp: SearchParamsInput, collection: Collection, fields: CollectionField[]): EntryFilters {
  const statusKeys = new Set(collection.status_options.map((s) => s.key));
  const ratingRaw = Number(first(sp.rating));
  const minRating = MIN_RATING_CHOICES.some((c) => c.value === ratingRaw) ? ratingRaw : null;
  const sortRaw = first(sp.sort);
  const sort = (SORT_VALUES as readonly string[]).includes(sortRaw) ? (sortRaw as SortValue) : DEFAULT_SORT;
  const pageRaw = Number.parseInt(first(sp.page), 10);

  const attrs: Record<string, string> = {};
  for (const f of fields) {
    if (f.type !== "select") continue;
    const v = first(sp[`${ATTR_PREFIX}${f.key}`]);
    if (v && (f.options.choices ?? []).includes(v)) attrs[f.key] = v;
  }

  return {
    q: first(sp.q).trim().slice(0, 100),
    statuses: list(sp.status).filter((s) => statusKeys.has(s)),
    minRating: collection.show_rating ? minRating : null,
    favorite: first(sp.fav) === "1",
    tags: list(sp.tag).slice(0, 10),
    attrs,
    sort,
    page: Number.isFinite(pageRaw) && pageRaw > 1 ? pageRaw : 1,
  };
}

/** Compact query string: defaults are omitted so the plain URL stays clean. */
export function toSearchParams(f: EntryFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.statuses.length) p.set("status", f.statuses.join(","));
  if (f.minRating !== null) p.set("rating", String(f.minRating));
  if (f.favorite) p.set("fav", "1");
  if (f.tags.length) p.set("tag", f.tags.join(","));
  for (const [k, v] of Object.entries(f.attrs)) p.set(`${ATTR_PREFIX}${k}`, v);
  if (f.sort !== DEFAULT_SORT) p.set("sort", f.sort);
  if (f.page > 1) p.set("page", String(f.page));
  return p;
}

export function filtersHref(pathname: string, f: EntryFilters): string {
  const qs = toSearchParams(f).toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** Number of narrowing filters in effect (sort and page do not count). */
export function activeFilterCount(f: EntryFilters): number {
  return (f.q ? 1 : 0) + f.statuses.length + (f.minRating !== null ? 1 : 0) + (f.favorite ? 1 : 0) + f.tags.length + Object.keys(f.attrs).length;
}

export const EMPTY_FILTERS: EntryFilters = { q: "", statuses: [], minRating: null, favorite: false, tags: [], attrs: {}, sort: DEFAULT_SORT, page: 1 };

/**
 * Turn free text into a safe `ilike` pattern for PostgREST filter strings:
 * reserved characters are removed and wildcards wrap the trimmed text.
 */
export function likePattern(q: string): string {
  const safe = q.replace(/[%"\\(),{}]/g, " ").replace(/\s+/g, " ").trim();
  return `%${safe}%`;
}

/** PostgREST `or=` clause matching title, notes or an exact tag; null when there is nothing to search. */
export function searchOrClause(q: string): string | null {
  const pattern = likePattern(q);
  const term = pattern.slice(1, -1);
  if (!term) return null;
  return `title.ilike."${pattern}",notes.ilike."${pattern}",tags.cs.{"${term}"}`;
}
