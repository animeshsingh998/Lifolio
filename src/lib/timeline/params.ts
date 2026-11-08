/** URL ⇄ state for the timeline (pure). `c` = collection slugs, `year`, `page`. */
import type { SearchParamsInput } from "@/lib/entries/filters";

export const TIMELINE_PAGE_SIZE = 60;

export type TimelineFilters = { collections: string[]; year: number | null; page: number };

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export function parseTimelineFilters(sp: SearchParamsInput, knownSlugs: string[]): TimelineFilters {
  const raw = Array.isArray(sp.c) ? sp.c : sp.c ? [sp.c] : [];
  const wanted = new Set(raw.flatMap((s) => s.split(",")).map((s) => s.trim()));
  const year = Number.parseInt(first(sp.year), 10);
  const page = Number.parseInt(first(sp.page), 10);
  return {
    collections: knownSlugs.filter((s) => wanted.has(s)),
    year: Number.isInteger(year) && year >= 1900 && year <= 2200 ? year : null,
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

export function timelineHref(pathname: string, f: TimelineFilters): string {
  const p = new URLSearchParams();
  if (f.collections.length) p.set("c", f.collections.join(","));
  if (f.year !== null) p.set("year", String(f.year));
  if (f.page > 1) p.set("page", String(f.page));
  const qs = p.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** "2026-11" → "November 2026" (UTC so the label never shifts across time zones). */
export function monthLabel(isoDate: string): string {
  const [y, m] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}
