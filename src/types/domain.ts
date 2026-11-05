/**
 * App-level types. Rows from the database are parsed into these (JSONB columns
 * get real shapes) by `src/lib/queries/*` before they reach components.
 */
import type { Tables } from "./database";

export const FIELD_TYPES = ["text", "textarea", "number", "date", "select", "url", "checkbox", "image"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const STATUS_KINDS = ["planned", "active", "done", "none"] as const;
export type StatusKind = (typeof STATUS_KINDS)[number];

export type StatusOption = {
  key: string; // immutable, e.g. "watched"
  label: string; // "Watched"
  kind: StatusKind; // lets the dashboard count across collections
};

export type FieldOptions = {
  /** select */
  choices?: string[];
  /** number */
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  /** text / textarea */
  placeholder?: string;
};

export type Layout = "grid" | "list";

export type Collection = Omit<Tables<"collections">, "status_options" | "default_layout"> & {
  status_options: StatusOption[];
  default_layout: Layout;
};

export type CollectionField = Omit<Tables<"collection_fields">, "type" | "options"> & {
  type: FieldType;
  options: FieldOptions;
};

export type Entry = Omit<Tables<"entries">, "attributes"> & {
  attributes: Record<string, unknown>;
  /** Short-lived signed URL for cover_image_path, resolved by the queries layer. */
  cover_url: string | null;
};

export type ActivityLog = Tables<"activity_log">;

/** Collection row with its entry count, as shown on /collections and in the sidebar. */
export type CollectionSummary = Collection & { entry_count: number };
