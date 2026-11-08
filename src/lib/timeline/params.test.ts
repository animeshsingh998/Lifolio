import { describe, expect, it } from "vitest";
import { monthLabel, parseTimelineFilters, timelineHref } from "./params";

describe("timeline params", () => {
  it("parses and round-trips", () => {
    const f = parseTimelineFilters({ c: "movies,books,nope", year: "2024", page: "3" }, ["movies", "books", "watches"]);
    expect(f).toEqual({ collections: ["movies", "books"], year: 2024, page: 3 });
    expect(timelineHref("/timeline", f)).toBe("/timeline?c=movies%2Cbooks&year=2024&page=3");
    expect(timelineHref("/timeline", parseTimelineFilters({ year: "abc", page: "0" }, []))).toBe("/timeline");
  });
  it("labels months in UTC", () => {
    expect(monthLabel("2026-11-30")).toBe("November 2026");
    expect(monthLabel("2024-01-01")).toBe("January 2024");
  });
});
