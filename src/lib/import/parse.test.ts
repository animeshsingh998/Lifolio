import { describe, expect, it } from "vitest";
import { applyRatingScale, parseImportJson } from "./parse";

describe("parseImportJson", () => {
  it("accepts the documented shape and aliases", () => {
    const r = parseImportJson(
      JSON.stringify([
        { title: "Arrival", rating: 4 },
        { Name: "Dune", Rating: "4.5", year: "2021", status: "watched", date: "2024-03-01", tags: "sci-fi, Epic", notes: "Rewatch.", Director: "Villeneuve" },
        "Heat",
      ]),
    );
    expect(r.errors).toEqual([]);
    expect(r.detectedScale).toBe(5);
    expect(r.items).toHaveLength(3);
    expect(r.items[1]).toMatchObject({ index: 1, title: "Dune", rating: 4.5, year: 2021, status: "watched", date: "2024-03-01", tags: ["sci-fi", "epic"], notes: "Rewatch." });
    expect(r.items[1].extra).toEqual({ Director: "Villeneuve" });
    expect(r.items[2]).toMatchObject({ title: "Heat", rating: null });
  });

  it("reports bad rows but keeps the good ones", () => {
    const r = parseImportJson(JSON.stringify([{ rating: 3 }, 42, { title: "  " }, { title: "Ok" }]));
    expect(r.items.map((i) => i.title)).toEqual(["Ok"]);
    expect(r.errors).toHaveLength(3);
  });

  it("rejects non-JSON and non-arrays", () => {
    expect(parseImportJson("not json").errors[0]).toMatch(/valid JSON/);
    expect(parseImportJson('{"a":1}').errors[0]).toMatch(/array/);
    expect(parseImportJson('{"items":[{"title":"x"}]}').items).toHaveLength(1);
  });

  it("detects a 10-point scale and converts ratings to 0–10", () => {
    const five = parseImportJson(JSON.stringify([{ title: "a", rating: 4.5 }, { title: "b", rating: 5 }]));
    expect(five.detectedScale).toBe(5);
    expect(applyRatingScale(five.items, 5).map((i) => i.rating)).toEqual([9, 10]);

    const ten = parseImportJson(JSON.stringify([{ title: "a", rating: 7 }, { title: "b", rating: "8/10" }]));
    expect(ten.items.map((i) => i.rating)).toEqual([7, 4]); // "8/10" is normalised to the 5 scale while parsing
    expect(ten.detectedScale).toBe(10);
    expect(applyRatingScale(ten.items, 10).map((i) => i.rating)).toEqual([7, 4]);
  });

  it("parses loose dates and ignores bad years", () => {
    const r = parseImportJson(JSON.stringify([{ title: "a", watched: "2023-07-04T10:00:00Z", year: 1500 }]));
    expect(r.items[0].date).toBe("2023-07-04");
    expect(r.items[0].year).toBeNull();
  });
});
