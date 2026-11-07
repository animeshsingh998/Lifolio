/**
 * Field type registry — the pure (no React) half.
 * Each type knows how to validate a value, what its empty value is, and how to
 * render it as plain text. UI inputs live in `src/components/fields/registry.tsx`.
 */
import { z } from "zod";
import type { CollectionField, FieldOptions, FieldType } from "@/types/domain";

export type FieldTypeDefinition = {
  label: string;
  description: string;
  /** Zod schema for one value, honouring `required` and `options`. Output is the stored JSON value (null when empty). */
  schema: (field: Pick<CollectionField, "required" | "options" | "label">) => z.ZodType<unknown>;
  /** Default form value for a new entry. */
  empty: unknown;
  /** Compact text rendering for lists, cards and exports. */
  format: (value: unknown, options: FieldOptions) => string;
  /** Can the user pick this type in the field editor right now? */
  available: boolean;
  /** Which option keys the editor should show. */
  configurable: Array<keyof FieldOptions>;
};

const emptyToNull = (v: unknown) => (v === "" || v === undefined || (typeof v === "number" && Number.isNaN(v)) ? null : v);

function requiredCheck(required: boolean) {
  return (v: unknown) => !required || (v !== null && v !== false);
}

const requiredMessage = (label: string) => `${label} is required.`;

function textType(max: number, label: string, description: string): FieldTypeDefinition {
  return {
    label,
    description,
    available: true,
    configurable: ["placeholder"],
    empty: "",
    schema: (f) =>
      z.preprocess(
        (v) => (typeof v === "string" ? emptyToNull(v.trim()) : emptyToNull(v)),
        z.string().max(max, `${f.label} must be at most ${max} characters.`).nullable(),
      ).refine(requiredCheck(f.required), requiredMessage(f.label)),
    format: (v) => (typeof v === "string" ? v : ""),
  };
}

export const fieldDefinitions: Record<FieldType, FieldTypeDefinition> = {
  text: textType(500, "Text", "A short line of text"),
  textarea: textType(5000, "Long text", "Multiple paragraphs"),

  number: {
    label: "Number",
    description: "Year, price, size, pages…",
    available: true,
    configurable: ["min", "max", "step", "unit"],
    empty: "",
    schema: (f) => {
      let n = z.number(`${f.label} must be a number.`);
      if (typeof f.options.min === "number") n = n.min(f.options.min, `${f.label} must be at least ${f.options.min}.`);
      if (typeof f.options.max === "number") n = n.max(f.options.max, `${f.label} must be at most ${f.options.max}.`);
      return z
        .preprocess((v) => {
          const e = emptyToNull(v);
          return typeof e === "string" ? Number(e) : e;
        }, n.nullable())
        .refine(requiredCheck(f.required), requiredMessage(f.label));
    },
    // No digit grouping: years ("2003") and ids must not become "2,003"; decimals keep up to 2 places.
    format: (v, o) =>
      typeof v === "number" ? `${v.toLocaleString(undefined, { useGrouping: false, maximumFractionDigits: 2 })}${o.unit ? ` ${o.unit}` : ""}` : "",
  },

  date: {
    label: "Date",
    description: "A calendar date",
    available: true,
    configurable: [],
    empty: "",
    schema: (f) =>
      z
        .preprocess(emptyToNull, z.iso.date(`${f.label} must be a valid date.`).nullable())
        .refine(requiredCheck(f.required), requiredMessage(f.label)),
    format: (v) => (typeof v === "string" && v ? formatDate(v) : ""),
  },

  select: {
    label: "Dropdown",
    description: "Pick one of your own choices",
    available: true,
    configurable: ["choices"],
    empty: "",
    schema: (f) => {
      const choices = f.options.choices ?? [];
      return z
        .preprocess(
          emptyToNull,
          z.string().refine((v) => choices.includes(v), `Choose a valid ${f.label.toLowerCase()}.`).nullable(),
        )
        .refine(requiredCheck(f.required), requiredMessage(f.label));
    },
    format: (v) => (typeof v === "string" ? v : ""),
  },

  url: {
    label: "Link",
    description: "A web address",
    available: true,
    configurable: ["placeholder"],
    empty: "",
    schema: (f) =>
      z
        .preprocess(
          (v) => (typeof v === "string" ? emptyToNull(v.trim()) : emptyToNull(v)),
          z.url({ protocol: /^https?$/, error: `${f.label} must start with http:// or https://.` }).max(2000).nullable(),
        )
        .refine(requiredCheck(f.required), requiredMessage(f.label)),
    format: (v) => (typeof v === "string" ? v.replace(/^https?:\/\//, "").replace(/\/$/, "") : ""),
  },

  checkbox: {
    label: "Checkbox",
    description: "Yes or no",
    available: true,
    configurable: [],
    empty: false,
    schema: (f) =>
      z
        .preprocess((v) => v === true || v === "true" || v === "on", z.boolean())
        .refine(requiredCheck(f.required), `${f.label} must be checked.`),
    format: (v) => (v === true ? "Yes" : "No"),
  },

  image: {
    label: "Image",
    description: "An extra photo (available in Phase 3)",
    available: false,
    configurable: [],
    empty: "",
    schema: (f) =>
      z
        .preprocess(emptyToNull, z.string().max(500).nullable())
        .refine(requiredCheck(f.required), requiredMessage(f.label)),
    format: (v) => (typeof v === "string" && v ? "Image" : ""),
  },
};

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Field types the editor offers, in display order. */
export const availableFieldTypes = (Object.keys(fieldDefinitions) as FieldType[]).filter(
  (t) => fieldDefinitions[t].available,
);
