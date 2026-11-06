/**
 * Parses the JSON a user pastes into the import wizard. Pure and unit-tested.
 * Accepted shape: an array of objects (or { items: [...] }); only a title is required.
 */
export const MAX_IMPORT_ITEMS = 1000;

export type ImportItem = {
  /** Position in the pasted list; used as the stable row id through the wizard. */
  index: number;
  title: string;
  /** Normalised to the app's 0–10 scale. */
  rating: number | null;
  year: number | null;
  status: string | null;
  date: string | null;
  tags: string[];
  notes: string | null;
  /** Any other keys, matched later against the collection's custom fields by label or key. */
  extra: Record<string, unknown>;
};

export type RatingScale = 5 | 10;

export type ParseResult = {
  items: ImportItem[];
  errors: string[];
  /** Scale the ratings appear to use: 10 if any value exceeds 5, else 5. */
  detectedScale: RatingScale;
};

const TITLE_KEYS = ["title", "name"];
const RATING_KEYS = ["rating", "score", "stars"];
const YEAR_KEYS = ["year", "release_year", "released"];
const STATUS_KEYS = ["status"];
const DATE_KEYS = ["date", "watched_on", "watched", "finished_on", "finished", "read_on", "purchased_on", "occurred_on"];
const TAG_KEYS = ["tags", "tag", "labels"];
const NOTES_KEYS = ["notes", "note", "review", "comment", "comments"];

function pick(obj: Record<string, unknown>, keys: string[]): [string, unknown] | null {
  const lower = new Map(Object.keys(obj).map((k) => [k.toLowerCase().trim(), k]));
  for (const k of keys) {
    const original = lower.get(k);
    if (original !== undefined && obj[original] !== undefined && obj[original] !== null && obj[original] !== "") {
      return [original, obj[original]];
    }
  }
  return null;
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const m = v.trim().match(/^(\d+(?:[.,]\d+)?)(?:\s*\/\s*(5|10))?$/); // "4", "4.5", "8/10"
    if (!m) return null;
    const n = Number(m[1].replace(",", "."));
    if (m[2] === "10") return n / 2; // already out of 10 → express out of 5, scale detection sees ≤ 5
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toYear(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.trim().slice(0, 4)) : NaN;
  return Number.isInteger(n) && n >= 1800 && n <= 2100 ? n : null;
}

function toIsoDate(v: unknown): string | null {
  if (typeof v !== "string" && !(v instanceof Date) && typeof v !== "number") return null;
  const s = v instanceof Date ? v.toISOString() : String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function toTags(v: unknown): string[] {
  const list = Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : [];
  return Array.from(new Set(list.map((t) => String(t).trim().toLowerCase()).filter(Boolean))).slice(0, 30);
}

export function parseImportJson(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { items: [], errors: ["That is not valid JSON. Expected an array like [{ \"title\": \"Arrival\", \"rating\": 4 }]."], detectedScale: 5 };
  }
  if (data && typeof data === "object" && !Array.isArray(data) && Array.isArray((data as { items?: unknown }).items)) {
    data = (data as { items: unknown[] }).items;
  }
  if (!Array.isArray(data)) return { items: [], errors: ["Expected a JSON array of objects."], detectedScale: 5 };
  if (data.length === 0) return { items: [], errors: ["The list is empty."], detectedScale: 5 };

  const errors: string[] = [];
  if (data.length > MAX_IMPORT_ITEMS) errors.push(`Only the first ${MAX_IMPORT_ITEMS} items are used (${data.length} given).`);

  const items: ImportItem[] = [];
  const rawRatings: number[] = [];
  data.slice(0, MAX_IMPORT_ITEMS).forEach((row, i) => {
    if (typeof row === "string") row = { title: row }; // allow a plain list of titles
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      errors.push(`Item ${i + 1}: not an object.`);
      return;
    }
    const obj = row as Record<string, unknown>;
    const title = pick(obj, TITLE_KEYS);
    const titleText = title ? String(title[1]).trim() : "";
    if (!titleText) {
      errors.push(`Item ${i + 1}: missing title.`);
      return;
    }
    const used = new Set<string>();
    const take = (keys: string[]) => {
      const hit = pick(obj, keys);
      if (hit) used.add(hit[0]);
      return hit?.[1];
    };
    used.add(title![0]);
    const rating = toNumber(take(RATING_KEYS));
    if (rating !== null) rawRatings.push(rating);
    const item: ImportItem = {
      index: i,
      title: titleText.slice(0, 200),
      rating, // scaled in applyRatingScale()
      year: toYear(take(YEAR_KEYS)),
      status: (() => {
        const s = take(STATUS_KEYS);
        return typeof s === "string" && s.trim() ? s.trim() : null;
      })(),
      date: toIsoDate(take(DATE_KEYS)),
      tags: toTags(take(TAG_KEYS)),
      notes: (() => {
        const n = take(NOTES_KEYS);
        return typeof n === "string" && n.trim() ? n.trim().slice(0, 10000) : null;
      })(),
      extra: Object.fromEntries(Object.entries(obj).filter(([k]) => !used.has(k))),
    };
    items.push(item);
  });

  const detectedScale: RatingScale = rawRatings.some((r) => r > 5) ? 10 : 5;
  return { items, errors, detectedScale };
}

/** Convert parsed ratings (still in the user's scale) to 0–10 integers. */
export function applyRatingScale(items: ImportItem[], scale: RatingScale): ImportItem[] {
  return items.map((it) => {
    if (it.rating === null) return it;
    const r = scale === 5 ? it.rating * 2 : it.rating;
    return { ...it, rating: Math.max(0, Math.min(10, Math.round(r))) };
  });
}
