/**
 * In-memory twin of the `listEntries` database query, used by the public share page
 * (which receives a collection's entries in one call). Same URL contract, same semantics.
 */
import { PAGE_SIZE, SORT_SPECS, likePattern, type EntryFilters } from "./filters";
import type { TagCount } from "@/lib/queries/entries";
import type { Entry } from "@/types/domain";

function matchesSearch(e: Entry, q: string): boolean {
  const term = likePattern(q).slice(1, -1).toLowerCase();
  if (!term) return true;
  return e.title.toLowerCase().includes(term) || (e.notes ?? "").toLowerCase().includes(term) || e.tags.some((t) => t.toLowerCase() === term);
}

export function filterEntries(entries: Entry[], f: EntryFilters): Entry[] {
  return entries.filter(
    (e) =>
      matchesSearch(e, f.q) &&
      (f.statuses.length === 0 || (e.status !== null && f.statuses.includes(e.status))) &&
      (f.minRating === null || (e.rating !== null && e.rating >= f.minRating)) &&
      (!f.favorite || e.is_favorite) &&
      f.tags.every((t) => e.tags.includes(t)) &&
      Object.entries(f.attrs).every(([k, v]) => e.attributes[k] === v),
  );
}

type SortColumn = (typeof SORT_SPECS)[keyof typeof SORT_SPECS]["column"];

function key(e: Entry, column: SortColumn): string | number | null {
  return e[column];
}

/** Nulls last regardless of direction; ties broken by updated_at desc then id, like the SQL. */
export function sortEntries(entries: Entry[], sort: EntryFilters["sort"]): Entry[] {
  const { column, ascending } = SORT_SPECS[sort];
  const dir = ascending ? 1 : -1;
  return [...entries].sort((a, b) => {
    const ka = key(a, column);
    const kb = key(b, column);
    if (ka === null && kb !== null) return 1;
    if (kb === null && ka !== null) return -1;
    if (ka !== null && kb !== null && ka !== kb) return (ka < kb ? -1 : 1) * dir;
    if (column !== "updated_at" && a.updated_at !== b.updated_at) return a.updated_at < b.updated_at ? 1 : -1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export function pageEntries(entries: Entry[], page: number): { entries: Entry[]; total: number } {
  const from = (page - 1) * PAGE_SIZE;
  return { entries: entries.slice(from, from + PAGE_SIZE), total: entries.length };
}

export function applyFilters(entries: Entry[], f: EntryFilters) {
  return pageEntries(sortEntries(filterEntries(entries, f), f.sort), f.page);
}

/** Tag usage, most used first, same shape as the `collection_tag_counts` RPC. */
export function tagCounts(entries: Entry[]): TagCount[] {
  const counts = new Map<string, number>();
  for (const e of entries) for (const t of e.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, 200);
}
