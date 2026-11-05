import { describe, expect, it } from "vitest";
import { buildEntrySchema, emptyCover, entryDefaults } from "./schema";
import { fieldDefinitions } from "./definitions";
import type { CollectionField } from "@/types/domain";

function field(partial: Partial<CollectionField> & Pick<CollectionField, "key" | "type">): CollectionField {
  return {
    id: partial.key,
    collection_id: "c1",
    user_id: "u1",
    label: partial.key,
    options: {},
    required: false,
    show_in_card: false,
    lookup_key: null,
    sort_order: 0,
    created_at: "",
    ...partial,
  };
}

const collection = {
  status_options: [
    { key: "watchlist", label: "Watchlist", kind: "planned" as const },
    { key: "watched", label: "Watched", kind: "done" as const },
  ],
  show_rating: true,
  date_label: "Watched on",
};

const fields: CollectionField[] = [
  field({ key: "f_director", type: "text", label: "Director" }),
  field({ key: "f_year", type: "number", label: "Year", options: { min: 1880, max: 2100 } }),
  field({ key: "f_platform", type: "select", label: "Platform", options: { choices: ["Cinema", "Netflix"] } }),
  field({ key: "f_site", type: "url", label: "Site" }),
  field({ key: "f_rewatch", type: "checkbox", label: "Rewatch" }),
  field({ key: "f_seen", type: "date", label: "Seen" }),
  field({ key: "f_brand", type: "text", label: "Brand", required: true }),
];

describe("buildEntrySchema", () => {
  const schema = buildEntrySchema(collection, fields);

  it("accepts a full, valid entry and normalises values", () => {
    const result = schema.safeParse({
      title: "  Inception ",
      status: "watched",
      rating: 9,
      occurred_on: "2024-05-01",
      notes: " great ",
      tags: ["Sci-Fi", "sci-fi", "Nolan"],
      is_favorite: true,
      cover: { ...emptyCover, source_url: "https://image.tmdb.org/t/p/w780/x.jpg", image_source: "provider", external_provider: "tmdb_movie", external_id: "27205" },
      attributes: {
        f_director: "Christopher Nolan",
        f_year: "2010",
        f_platform: "Cinema",
        f_site: "https://example.com/",
        f_rewatch: true,
        f_seen: "2024-05-01",
        f_brand: "x",
      },
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.title).toBe("Inception");
    expect(result.data.notes).toBe("great");
    expect(result.data.tags).toEqual(["sci-fi", "nolan"]);
    expect(result.data.attributes.f_year).toBe(2010);
    expect(result.data.cover.external_provider).toBe("tmdb_movie");
  });

  it("rejects a non-http image URL and unknown providers", () => {
    const base = { ...entryDefaults(fields), title: "Dune", attributes: { ...entryDefaults(fields).attributes, f_brand: "x" } };
    expect(schema.safeParse({ ...base, cover: { ...emptyCover, source_url: "ftp://x/y.jpg" } }).success).toBe(false);
    expect(schema.safeParse({ ...base, cover: { ...emptyCover, external_provider: "brave_images" } }).success).toBe(false);
    expect(schema.safeParse({ ...base, cover: { ...emptyCover, source_url: "" } }).success).toBe(true);
  });

  it("treats empty strings as null for optional custom fields", () => {
    const result = schema.safeParse({
      ...entryDefaults(fields),
      title: "Dune",
      attributes: { ...entryDefaults(fields).attributes, f_brand: "x" },
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.status).toBeNull();
    expect(result.data.rating).toBeNull();
    expect(result.data.occurred_on).toBeNull();
    expect(result.data.attributes.f_director).toBeNull();
    expect(result.data.attributes.f_year).toBeNull();
    expect(result.data.attributes.f_rewatch).toBe(false);
  });

  it("rejects a missing required custom field, an unknown status, and bad values", () => {
    const base = { ...entryDefaults(fields), title: "Dune" };
    const required = schema.safeParse(base);
    expect(required.success).toBe(false);
    if (!required.success) expect(required.error.issues[0]?.path).toEqual(["attributes", "f_brand"]);

    const ok = { ...base, attributes: { ...base.attributes, f_brand: "x" } };
    expect(schema.safeParse({ ...ok, status: "nope" }).success).toBe(false);
    expect(schema.safeParse({ ...ok, rating: 11 }).success).toBe(false);
    expect(schema.safeParse({ ...ok, title: "" }).success).toBe(false);
    expect(schema.safeParse({ ...ok, attributes: { ...ok.attributes, f_year: 1600 } }).success).toBe(false);
    expect(schema.safeParse({ ...ok, attributes: { ...ok.attributes, f_platform: "Hulu" } }).success).toBe(false);
    expect(schema.safeParse({ ...ok, attributes: { ...ok.attributes, f_site: "ftp://x" } }).success).toBe(false);
    expect(schema.safeParse({ ...ok, attributes: { ...ok.attributes, f_seen: "01/05/2024" } }).success).toBe(false);
  });

  it("drops rating and date when the collection hides them", () => {
    const hidden = buildEntrySchema({ ...collection, show_rating: false, date_label: null }, []);
    const result = hidden.safeParse({ ...entryDefaults([]), title: "x", rating: 7, occurred_on: "2024-01-01" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.rating).toBeNull();
    expect(result.data.occurred_on).toBeNull();
  });
});

describe("fieldDefinitions.format", () => {
  it("formats values for display", () => {
    expect(fieldDefinitions.number.format(42, { unit: "mm" })).toBe("42 mm");
    expect(fieldDefinitions.number.format(null, {})).toBe("");
    expect(fieldDefinitions.checkbox.format(true, {})).toBe("Yes");
    expect(fieldDefinitions.url.format("https://example.com/a/", {})).toBe("example.com/a");
    expect(fieldDefinitions.date.format("2024-05-01", {})).toBe("1 May 2024");
  });
});
