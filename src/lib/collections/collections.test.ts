import { describe, expect, it } from "vitest";
import { newFieldKey, slugify, statusKey, uniqueSlug } from "./slug";
import { templates } from "./templates";
import { COLLECTION_ICONS } from "./icons";
import { FIELD_TYPES, STATUS_KINDS } from "@/types/domain";
import { fieldDefinitions } from "@/lib/fields/definitions";

describe("slugify / uniqueSlug", () => {
  it("produces url-safe slugs", () => {
    expect(slugify("TV Shows!")).toBe("tv-shows");
    expect(slugify("  Café   Crème ")).toBe("cafe-creme");
    expect(slugify("***")).toBe("collection");
    expect(slugify("a".repeat(80))).toHaveLength(50);
  });

  it("appends a counter on collision", () => {
    expect(uniqueSlug("Books", [])).toBe("books");
    expect(uniqueSlug("Books", ["books"])).toBe("books-2");
    expect(uniqueSlug("Books", ["books", "books-2"])).toBe("books-3");
  });

  it("derives status and field keys", () => {
    expect(statusKey("To read")).toBe("to_read");
    expect(statusKey("Déjà vu!")).toBe("deja_vu");
    expect(newFieldKey(() => 0)).toBe("f_aaaaaa");
    expect(newFieldKey()).toMatch(/^f_[a-z0-9]{6}$/);
  });
});

describe("templates", () => {
  it("are internally consistent", () => {
    const ids = new Set<string>();
    for (const t of templates) {
      expect(ids.has(t.id)).toBe(false);
      ids.add(t.id);
      expect(COLLECTION_ICONS).toContain(t.icon);
      expect(t.statusOptions.length).toBeGreaterThan(0);

      const statusKeys = t.statusOptions.map((s) => s.key);
      expect(new Set(statusKeys).size).toBe(statusKeys.length);
      for (const s of t.statusOptions) expect(STATUS_KINDS).toContain(s.kind);

      const fieldKeys = t.fields.map((f) => f.key);
      expect(new Set(fieldKeys).size).toBe(fieldKeys.length);
      for (const f of t.fields) {
        expect(f.key).toMatch(/^f_[a-z0-9_]{1,40}$/);
        expect(FIELD_TYPES).toContain(f.type);
        expect(fieldDefinitions[f.type].available).toBe(true);
        if (f.type === "select") expect(f.options?.choices?.length).toBeGreaterThan(1);
      }
    }
    expect(templates.map((t) => t.name)).toEqual(["Movies", "TV Shows", "Books", "Watches", "Shoes"]);
  });
});
