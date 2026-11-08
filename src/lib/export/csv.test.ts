import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";

describe("csv", () => {
  it("quotes, escapes and joins", () => {
    expect(csvCell('He said "hi", twice')).toBe('"He said ""hi"", twice"');
    expect(csvCell(["a", "b"])).toBe("a; b");
    expect(csvCell(true)).toBe("Yes");
    expect(csvCell(null)).toBe("");
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });
  it("defuses formulas and writes a BOM", () => {
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(toCsv(["Title", "Rating"], [["Dune", 4.5]])).toBe("﻿Title,Rating\r\nDune,4.5\r\n");
  });
});
