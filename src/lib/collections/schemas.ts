/** Zod schemas shared by the collection / field forms (client) and their Server Actions. */
import { z } from "zod";
import { COLLECTION_ICONS } from "./icons";
import { templates } from "./templates";
import { availableFieldTypes } from "@/lib/fields/definitions";
import { fieldOptionsSchema, statusOptionSchema } from "@/lib/queries/parse";
import { FIELD_TYPES } from "@/types/domain";

const name = z.string().trim().min(1, "Name is required.").max(60, "Name must be at most 60 characters.");

export const createCollectionSchema = z.object({
  name,
  template: z.enum(["blank", ...templates.map((t) => t.id)] as [string, ...string[]]),
});
export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;

export const statusOptionsFormSchema = z
  .array(statusOptionSchema)
  .min(1, "Add at least one status.")
  .max(20, "At most 20 statuses.")
  .refine((opts) => new Set(opts.map((o) => o.key)).size === opts.length, "Status keys must be unique.")
  .refine(
    (opts) => new Set(opts.map((o) => o.label.toLowerCase())).size === opts.length,
    "Status names must be unique.",
  );

export const collectionSettingsSchema = z.object({
  name,
  description: z.string().trim().max(300, "Description must be at most 300 characters."),
  icon: z.enum(COLLECTION_ICONS),
  item_noun: z.string().trim().min(1, "Item name is required.").max(30),
  show_rating: z.boolean(),
  date_enabled: z.boolean(),
  date_label: z.string().trim().max(40, "Date label must be at most 40 characters."),
  default_layout: z.enum(["grid", "list"]),
  status_options: statusOptionsFormSchema,
});
export type CollectionSettingsInput = z.input<typeof collectionSettingsSchema>;
export type CollectionSettingsOutput = z.output<typeof collectionSettingsSchema>;

export const fieldFormSchema = z
  .object({
    label: z.string().trim().min(1, "Label is required.").max(60, "Label must be at most 60 characters."),
    type: z.enum(FIELD_TYPES).refine((t) => availableFieldTypes.includes(t), "That field type is not available yet."),
    required: z.boolean(),
    show_in_card: z.boolean(),
    // Editor-friendly shapes; converted to FieldOptions in `toFieldOptions`.
    choices: z.string().max(2000),
    min: z.string().max(20),
    max: z.string().max(20),
    step: z.string().max(20),
    unit: z.string().trim().max(12, "Unit must be at most 12 characters."),
    placeholder: z.string().trim().max(80),
  })
  .superRefine((v, ctx) => {
    if (v.type === "select") {
      const choices = splitChoices(v.choices);
      if (choices.length < 1) ctx.addIssue({ code: "custom", path: ["choices"], message: "Add at least one choice." });
      if (choices.length > 50) ctx.addIssue({ code: "custom", path: ["choices"], message: "At most 50 choices." });
      if (new Set(choices.map((c) => c.toLowerCase())).size !== choices.length)
        ctx.addIssue({ code: "custom", path: ["choices"], message: "Choices must be unique." });
      if (choices.some((c) => c.length > 60))
        ctx.addIssue({ code: "custom", path: ["choices"], message: "Each choice must be at most 60 characters." });
    }
    if (v.type === "number") {
      for (const k of ["min", "max", "step"] as const) {
        if (v[k] !== "" && Number.isNaN(Number(v[k])))
          ctx.addIssue({ code: "custom", path: [k], message: "Must be a number." });
      }
      if (v.step !== "" && Number(v.step) <= 0) ctx.addIssue({ code: "custom", path: ["step"], message: "Step must be positive." });
      if (v.min !== "" && v.max !== "" && Number(v.min) > Number(v.max))
        ctx.addIssue({ code: "custom", path: ["max"], message: "Max must be at least min." });
    }
  });
export type FieldFormInput = z.input<typeof fieldFormSchema>;
export type FieldFormOutput = z.output<typeof fieldFormSchema>;

export function splitChoices(raw: string): string[] {
  return raw
    .split(/\r?\n|,/)
    .map((c) => c.trim())
    .filter(Boolean);
}

/** Editor form values → stored `options` JSON (validated against the storage schema). */
export function toFieldOptions(v: FieldFormOutput) {
  const num = (s: string) => (s === "" ? undefined : Number(s));
  const options =
    v.type === "select"
      ? { choices: splitChoices(v.choices) }
      : v.type === "number"
        ? { min: num(v.min), max: num(v.max), step: num(v.step), unit: v.unit || undefined }
        : v.type === "text" || v.type === "textarea" || v.type === "url"
          ? { placeholder: v.placeholder || undefined }
          : {};
  return fieldOptionsSchema.parse(JSON.parse(JSON.stringify(options))); // drop undefined keys
}
