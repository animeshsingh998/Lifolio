import { describe, expect, it } from "vitest";
import { activeFilterCount, likePattern, parseEntryFilters, searchOrClause, toSearchParams } from "./filters";
import type { Collection, CollectionField } from "@/types/domain";

const collection = {
  show_rating: true,
  date_label: "Watched on",
  status_options: [
    { key: "watched", label: "Watched", kind: "done" },
    { key: "want", label: "Want to watch", kind: "planned" },
  ],
} as unknown as Collection;

const fields = [
  { key: "f_genre", type: "select", options: { choices: ["Drama", "Sci-fi"] } },
  { key: "f_dir", type: "text", options: {} },
] as unknown as CollectionField[];

describe("parseEntryFilters", () => {
  it("keeps only known statuses, choices and ratings", () => {
    const f = parseEntryFilters(
      { q: "  dune ", status: "watched,bogus", rating: "8", fav: "1", tag: ["sci-fi", "epic"], "f.f_genre": "Drama", "f.f_dir": "x", sort: "-title", page: "3" },
      collection,
      fields,
    );
    expect(f).toEqual({
      q: "dune",
      statuses: ["watched"],
      minRating: 8,
      favorite: true,
      tags: ["sci-fi", "epic"],
      attrs: { f_genre: "Drama" },
      sort: "-title",
      page: 3,
    });
  });
  it("falls back to defaults on junk", () => {
    const f = parseEntryFilters({ rating: "7", sort: "nope", page: "-2", "f.f_genre": "Comedy" }, collection, fields);
    expect(f.minRating).toBeNull();
    expect(f.sort).toBe("updated");
    expect(f.page).toBe(1);
    expect(f.attrs).toEqual({});
    expect(activeFilterCount(f)).toBe(0);
  });
  it("round-trips through the query string and omits defaults", () => {
    const f = parseEntryFilters({ q: "dune", status: "want", sort: "rating", page: "2" }, collection, fields);
    const qs = toSearchParams(f);
    expect(qs.toString()).toBe("q=dune&status=want&sort=rating&page=2");
    expect(parseEntryFilters(Object.fromEntries(qs), collection, fields)).toEqual(f);
    expect(toSearchParams(parseEntryFilters({}, collection, fields)).toString()).toBe("");
  });
});

describe("likePattern / searchOrClause", () => {
  it("strips characters that break PostgREST filters", () => {
    expect(likePattern(' the "matrix" (1999), 100% ')).toBe("%the matrix 1999 100%");
  });
  it("builds an or-clause over title, notes and tags", () => {
    expect(searchOrClause("dune")).toBe('title.ilike."%dune%",notes.ilike."%dune%",tags.cs.{"dune"}');
    expect(searchOrClause("  %() ")).toBeNull();
  });
});
