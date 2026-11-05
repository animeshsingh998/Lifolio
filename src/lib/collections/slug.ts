/** URL slug from a collection name: "TV Shows!" → "tv-shows". */
export function slugify(name: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");
  return base || "collection";
}

/** First slug not already in `taken`: "books", "books-2", "books-3", … */
export function uniqueSlug(name: string, taken: Iterable<string>): string {
  const base = slugify(name);
  const set = new Set(taken);
  if (!set.has(base)) return base;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}-${i}`;
    if (!set.has(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** Status key from a label: "To read" → "to_read". */
export function statusKey(label: string): string {
  const key = label
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
  return key || "status";
}

const FIELD_KEY_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** Immutable JSONB key for a new custom field, e.g. "f_k3x9qz". */
export function newFieldKey(random: () => number = Math.random): string {
  let id = "";
  for (let i = 0; i < 6; i++) id += FIELD_KEY_ALPHABET[Math.floor(random() * FIELD_KEY_ALPHABET.length)];
  return `f_${id}`;
}
