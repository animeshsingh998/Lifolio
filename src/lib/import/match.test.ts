import { describe, expect, it } from "vitest";
import { looksLike, rankCandidates } from "./match";
import type { LookupResult } from "@/lib/lookup/types";

const r = (id: string, title: string, year: number | null): LookupResult => ({
  externalId: id,
  title,
  thumbnailUrl: null,
  imageUrl: null,
  values: { release_year: year },
});

describe("rankCandidates", () => {
  const results = [r("1", "Dune", 2021), r("2", "Dune: Part Two", 2024), r("3", "Dune", 1984), r("4", "Dune", 2000), r("5", "x", null), r("6", "y", null)];
  it("keeps order without a year and caps at five", () => {
    expect(rankCandidates(results, null).map((x) => x.externalId)).toEqual(["1", "2", "3", "4", "5"]);
  });
  it("moves the year match to the front", () => {
    expect(rankCandidates(results, 1984).map((x) => x.externalId)).toEqual(["3", "1", "2", "4", "5"]);
    expect(rankCandidates(results, 2023).map((x) => x.externalId)[0]).toBe("2"); // ±1 tolerance
    expect(rankCandidates(results, 1950).map((x) => x.externalId)[0]).toBe("1"); // no match → unchanged
  });
});

describe("looksLike", () => {
  it("accepts equal, contained and mostly overlapping titles", () => {
    expect(looksLike("Arrival", "Arrival")).toBe(true);
    expect(looksLike("Dune", "Dune: Part Two")).toBe(true);
    expect(looksLike("the lord of the rings return of the king", "The Lord of the Rings: The Return of the King")).toBe(true);
    expect(looksLike("Léon", "Leon: The Professional")).toBe(true);
  });
  it("flags unrelated titles", () => {
    expect(looksLike("Arrival", "The Departed")).toBe(false);
    expect(looksLike("Heat", "Heathers")).toBe(false);
  });
});
