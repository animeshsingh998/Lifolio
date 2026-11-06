import type { CollectionField } from "@/types/domain";

/** Coerce a loosely-typed value (provider output, import JSON) into what a field accepts; null when it does not fit. */
export function coerceForField(field: CollectionField, raw: unknown): unknown {
  if (raw === null || raw === undefined || raw === "") return null;
  switch (field.type) {
    case "number": {
      const n = typeof raw === "number" ? raw : Number(String(raw).replace(/,/g, ""));
      return Number.isFinite(n) ? n : null;
    }
    case "checkbox":
      return raw === true || raw === "true" || raw === "yes" || raw === 1;
    case "select": {
      const s = String(raw);
      const match = field.options.choices?.find((c) => c.toLowerCase() === s.toLowerCase());
      return match ?? null;
    }
    case "date":
      return typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
    case "image":
      return null;
    default:
      return String(Array.isArray(raw) ? raw.join(", ") : raw).slice(0, field.type === "textarea" ? 5000 : 500);
  }
}
