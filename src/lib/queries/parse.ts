/**
 * Row → domain parsers. JSONB columns are validated leniently (bad data degrades
 * to defaults instead of crashing a page).
 */
import { z } from "zod";
import type { Tables } from "@/types/database";
import {
  FIELD_TYPES,
  STATUS_KINDS,
  type Collection,
  type CollectionField,
  type CollectionSummary,
  type Entry,
  type FieldOptions,
  type StatusOption,
} from "@/types/domain";

export const statusOptionSchema = z.object({
  key: z.string().min(1).max(30),
  label: z.string().min(1).max(40),
  kind: z.enum(STATUS_KINDS),
});

export const statusOptionsSchema = z.array(statusOptionSchema).max(20);

export const fieldOptionsSchema = z
  .object({
    choices: z.array(z.string().min(1).max(60)).max(50).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().positive().optional(),
    unit: z.string().max(12).optional(),
    placeholder: z.string().max(80).optional(),
  })
  .strict();

export function parseStatusOptions(raw: unknown): StatusOption[] {
  const r = statusOptionsSchema.safeParse(raw);
  return r.success ? r.data : [];
}

export function parseFieldOptions(raw: unknown): FieldOptions {
  const r = fieldOptionsSchema.safeParse(raw);
  return r.success ? r.data : {};
}

export function parseCollection(row: Tables<"collections">): Collection {
  return {
    ...row,
    status_options: parseStatusOptions(row.status_options),
    default_layout: row.default_layout === "list" ? "list" : "grid",
  };
}

export function parseCollectionSummary(row: Tables<"collections"> & { entries: { count: number }[] }): CollectionSummary {
  const { entries, ...rest } = row;
  return { ...parseCollection(rest), entry_count: entries[0]?.count ?? 0 };
}

export function parseField(row: Tables<"collection_fields">): CollectionField | null {
  const type = FIELD_TYPES.find((t) => t === row.type);
  if (!type) return null;
  return { ...row, type, options: parseFieldOptions(row.options) };
}

export function parseFields(rows: Tables<"collection_fields">[]): CollectionField[] {
  return rows.map(parseField).filter((f): f is CollectionField => f !== null);
}

export function parseEntry(row: Tables<"entries">): Entry {
  const attributes =
    row.attributes && typeof row.attributes === "object" && !Array.isArray(row.attributes)
      ? (row.attributes as Record<string, unknown>)
      : {};
  return { ...row, attributes };
}
