import { describe, expect, it } from "vitest";
import { applyFilters, filterEntries, sortEntries, tagCounts } from "./apply-filters";
import { EMPTY_FILTERS } from "./filters";
import type { Entry } from "@/types/domain";

const e = (o: Partial<Entry> & { id: string }): Entry =>
  ({
    title: o.id,
    status: null,
    rating: null,
    occurred_on: null,
    notes: null,
    tags: [],
    is_favorite: false,
    attributes: {},
    updated_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    ...o,
  }) as Entry;

const entries = [
  e({ id: "a", title: "Arrival", status: "watched", rating: 9, tags: ["sci-fi"], attributes: { f_genre: "Sci-fi" }, updated_at: "2026-01-03T00:00:00Z" }),
  e({ id: "b", title: "Heat", status: "want", rating: null, notes: "Pacino and De Niro", is_favorite: true, updated_at: "2026-01-02T00:00:00Z" }),
  e({ id: "c", title: "Dune", status: "watched", rating: 7, tags: ["sci-fi", "epic"], attributes: { f_genre: "Sci-fi" }, updated_at: "2026-01-01T00:00:00Z" }),
];

describe("filterEntries", () => {
  it("matches title, notes and exact tags", () => {
    expect(filterEntries(entries, { ...EMPTY_FILTERS, q: "niro" }).map((x) => x.id)).toEqual(["b"]);
    expect(filterEntries(entries, { ...EMPTY_FILTERS, q: "epic" }).map((x) => x.id)).toEqual(["c"]);
    expect(filterEntries(entries, { ...EMPTY_FILTERS, q: "  %  " })).toHaveLength(3);
  });
  it("ANDs the narrowing filters", () => {
    const f = { ...EMPTY_FILTERS, statuses: ["watched"], minRating: 8, tags: ["sci-fi"], attrs: { f_genre: "Sci-fi" } };
    expect(filterEntries(entries, f).map((x) => x.id)).toEqual(["a"]);
    expect(filterEntries(entries, { ...EMPTY_FILTERS, favorite: true }).map((x) => x.id)).toEqual(["b"]);
  });
});

describe("sortEntries", () => {
  it("puts nulls last in both directions and breaks ties by updated_at desc", () => {
    expect(sortEntries(entries, "rating").map((x) => x.id)).toEqual(["a", "c", "b"]);
    expect(sortEntries(entries, "-rating").map((x) => x.id)).toEqual(["c", "a", "b"]);
    expect(sortEntries(entries, "title").map((x) => x.id)).toEqual(["a", "c", "b"]);
    expect(sortEntries(entries, "updated").map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
});

describe("applyFilters / tagCounts", () => {
  it("pages and counts", () => {
    const r = applyFilters(entries, { ...EMPTY_FILTERS, page: 2 });
    expect(r.total).toBe(3);
    expect(r.entries).toEqual([]);
    expect(tagCounts(entries)).toEqual([
      { tag: "sci-fi", count: 2 },
      { tag: "epic", count: 1 },
    ]);
  });
});
