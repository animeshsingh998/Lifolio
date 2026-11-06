/** Pure matching helpers for the importer (unit-tested). */
import type { LookupResult } from "@/lib/lookup/types";

export const RESOLVE_BATCH = 10;
export const IMPORT_BATCH = 4;

export const normTitle = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function yearOf(r: LookupResult): number | null {
  const v = r.values.release_year ?? r.values.first_air_year ?? r.values.published_year;
  return typeof v === "number" ? v : null;
}

/** Keep the top five; an exact (±1) year match jumps to the front. */
export function rankCandidates(results: LookupResult[], year: number | null): LookupResult[] {
  const top = results.slice(0, 5);
  if (year === null) return top;
  const i = top.findIndex((r) => {
    const y = yearOf(r);
    return y !== null && Math.abs(y - year) <= 1;
  });
  if (i <= 0) return top;
  return [top[i], ...top.slice(0, i), ...top.slice(i + 1)];
}

/** Loose title similarity: equal, whole-word containment, or ≥ 60 % word overlap. */
export function looksLike(wanted: string, got: string): boolean {
  const a = normTitle(wanted);
  const b = normTitle(got);
  if (!a || !b) return false;
  if (a === b) return true;
  const wa = new Set(a.split(" "));
  const wb = b.split(" ");
  const wbSet = new Set(wb);
  // Whole-word containment ("dune" ⊂ "dune part two"), not substrings ("heat" vs "heathers").
  if ([...wa].every((w) => wbSet.has(w)) || wb.every((w) => wa.has(w))) return true;
  const overlap = wb.filter((w) => wa.has(w)).length;
  return overlap / Math.max(wa.size, wb.length) >= 0.6;
}
