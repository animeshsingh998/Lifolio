/**
 * Builds the Zod schema for an entry of a given collection from its field
 * definitions. Used by the client form (react-hook-form resolver) and re-run
 * by the Server Action, so both sides enforce identical rules.
 */
import { z } from "zod";
import { fieldDefinitions } from "./definitions";
import type { Collection, CollectionField } from "@/types/domain";

export const MAX_TAGS = 30;
export const MAX_TAG_LENGTH = 40;

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

export function buildEntrySchema(
  collection: Pick<Collection, "status_options" | "show_rating" | "date_label">,
  fields: CollectionField[],
) {
  const statusKeys = collection.status_options.map((s) => s.key);

  const attributeShape: Record<string, z.ZodType<unknown>> = {};
  for (const field of fields) {
    attributeShape[field.key] = fieldDefinitions[field.type].schema(field);
  }

  return z.object({
    title: z.string().trim().min(1, "Title is required.").max(200, "Title must be at most 200 characters."),
    status: z.preprocess(
      emptyToNull,
      z
        .string()
        .refine((s) => statusKeys.includes(s), "Choose a valid status.")
        .nullable(),
    ),
    rating: z.preprocess(
      emptyToNull,
      collection.show_rating ? z.number().int().min(0).max(10).nullable() : z.null().catch(null),
    ),
    occurred_on: z.preprocess(
      emptyToNull,
      collection.date_label ? z.iso.date("Enter a valid date.").nullable() : z.null().catch(null),
    ),
    notes: z.preprocess(
      (v) => (typeof v === "string" ? v.trim() : ""),
      z.string().max(10000, "Notes must be at most 10,000 characters."),
    ),
    tags: z
      .array(z.string().trim().min(1).max(MAX_TAG_LENGTH, `Tags must be at most ${MAX_TAG_LENGTH} characters.`))
      .max(MAX_TAGS, `At most ${MAX_TAGS} tags.`)
      .transform((tags) => Array.from(new Set(tags.map((t) => t.toLowerCase())))),
    is_favorite: z.boolean(),
    attributes: z.object(attributeShape),
  });
}

export type EntrySchema = ReturnType<typeof buildEntrySchema>;
export type EntryFormInput = z.input<EntrySchema>;
export type EntryFormOutput = z.output<EntrySchema>;

/** Form default values for a new or existing entry. */
export function entryDefaults(
  fields: CollectionField[],
  entry?: {
    title: string;
    status: string | null;
    rating: number | null;
    occurred_on: string | null;
    notes: string | null;
    tags: string[];
    is_favorite: boolean;
    attributes: Record<string, unknown>;
  },
): EntryFormInput {
  const attributes: Record<string, unknown> = {};
  for (const f of fields) {
    const existing = entry?.attributes[f.key];
    attributes[f.key] = existing === undefined || existing === null ? fieldDefinitions[f.type].empty : existing;
  }
  return {
    title: entry?.title ?? "",
    status: entry?.status ?? "",
    rating: entry?.rating ?? null,
    occurred_on: entry?.occurred_on ?? "",
    notes: entry?.notes ?? "",
    tags: entry?.tags ?? [],
    is_favorite: entry?.is_favorite ?? false,
    attributes,
  };
}
