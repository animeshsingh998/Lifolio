/**
 * Starter collections. Templates are code, not data: creating one just inserts a
 * `collections` row and its `collection_fields`. Nothing else in the app knows
 * what a "movie" is — a template is only a convenient first set of fields.
 */
import type { FieldOptions, FieldType, StatusOption } from "@/types/domain";

export type TemplateField = {
  key: string; // stable "f_…" key so lookup bindings survive
  label: string;
  type: FieldType;
  options?: FieldOptions;
  required?: boolean;
  showInCard?: boolean;
  lookupKey?: string;
};

export type CollectionTemplate = {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name (kebab-case)
  itemNoun: string;
  statusOptions: StatusOption[];
  dateLabel: string | null;
  showRating: boolean;
  lookupProvider: "tmdb_movie" | "tmdb_tv" | "google_books" | null;
  fields: TemplateField[];
};

const platformChoices = ["Cinema", "Netflix", "Prime Video", "Disney+", "Apple TV+", "Blu-ray / DVD", "Other"];

export const templates: CollectionTemplate[] = [
  {
    id: "movies",
    name: "Movies",
    description: "Watchlist, ratings and where you watched.",
    icon: "clapperboard",
    itemNoun: "movie",
    statusOptions: [
      { key: "watchlist", label: "Watchlist", kind: "planned" },
      { key: "watched", label: "Watched", kind: "done" },
      { key: "dropped", label: "Dropped", kind: "none" },
    ],
    dateLabel: "Watched on",
    showRating: true,
    lookupProvider: "tmdb_movie",
    fields: [
      { key: "f_director", label: "Director", type: "text", showInCard: true, lookupKey: "director" },
      { key: "f_year", label: "Release year", type: "number", options: { min: 1880, max: 2100, step: 1 }, showInCard: true, lookupKey: "release_year" },
      { key: "f_genre", label: "Genre", type: "text", lookupKey: "genres" },
      { key: "f_runtime", label: "Runtime", type: "number", options: { min: 0, step: 1, unit: "min" }, lookupKey: "runtime" },
      { key: "f_platform", label: "Watched on", type: "select", options: { choices: platformChoices } },
      { key: "f_rewatch", label: "Would rewatch", type: "checkbox" },
    ],
  },
  {
    id: "tv_shows",
    name: "TV Shows",
    description: "Series you are following, finished or plan to start.",
    icon: "tv",
    itemNoun: "show",
    statusOptions: [
      { key: "watchlist", label: "Watchlist", kind: "planned" },
      { key: "watching", label: "Watching", kind: "active" },
      { key: "watched", label: "Finished", kind: "done" },
      { key: "dropped", label: "Dropped", kind: "none" },
    ],
    dateLabel: "Finished on",
    showRating: true,
    lookupProvider: "tmdb_tv",
    fields: [
      { key: "f_creator", label: "Created by", type: "text", lookupKey: "creator" },
      { key: "f_year", label: "First aired", type: "number", options: { min: 1920, max: 2100, step: 1 }, showInCard: true, lookupKey: "first_air_year" },
      { key: "f_seasons", label: "Seasons", type: "number", options: { min: 0, step: 1 }, showInCard: true, lookupKey: "seasons" },
      { key: "f_season_at", label: "Current season", type: "number", options: { min: 0, step: 1 } },
      { key: "f_genre", label: "Genre", type: "text", lookupKey: "genres" },
      { key: "f_platform", label: "Watching on", type: "select", options: { choices: platformChoices.filter((c) => c !== "Cinema") } },
    ],
  },
  {
    id: "books",
    name: "Books",
    description: "Reading list, progress and finished books.",
    icon: "book-open",
    itemNoun: "book",
    statusOptions: [
      { key: "to_read", label: "To read", kind: "planned" },
      { key: "reading", label: "Reading", kind: "active" },
      { key: "finished", label: "Finished", kind: "done" },
      { key: "abandoned", label: "Abandoned", kind: "none" },
    ],
    dateLabel: "Finished on",
    showRating: true,
    lookupProvider: "google_books",
    fields: [
      { key: "f_author", label: "Author", type: "text", showInCard: true, lookupKey: "authors" },
      { key: "f_pages", label: "Pages", type: "number", options: { min: 1, step: 1 }, lookupKey: "page_count" },
      { key: "f_page_at", label: "Current page", type: "number", options: { min: 0, step: 1 } },
      { key: "f_format", label: "Format", type: "select", options: { choices: ["Paperback", "Hardcover", "E-book", "Audiobook"] }, showInCard: true },
      { key: "f_genre", label: "Genre", type: "text", lookupKey: "categories" },
      { key: "f_published", label: "Published", type: "number", options: { min: 0, max: 2100, step: 1 }, lookupKey: "published_year" },
      { key: "f_isbn", label: "ISBN", type: "text", lookupKey: "isbn" },
    ],
  },
  {
    id: "watches",
    name: "Watches",
    description: "Your collection, wishlist and what you let go.",
    icon: "watch",
    itemNoun: "watch",
    statusOptions: [
      { key: "wishlist", label: "Wishlist", kind: "planned" },
      { key: "owned", label: "Owned", kind: "active" },
      { key: "sold", label: "Sold", kind: "none" },
    ],
    dateLabel: "Purchased on",
    showRating: true,
    lookupProvider: null,
    fields: [
      { key: "f_brand", label: "Brand", type: "text", required: true, showInCard: true },
      { key: "f_reference", label: "Model / reference", type: "text", showInCard: true },
      { key: "f_movement", label: "Movement", type: "select", options: { choices: ["Automatic", "Manual", "Quartz", "Solar", "Spring Drive"] } },
      { key: "f_case_size", label: "Case size", type: "number", options: { min: 20, max: 60, step: 0.5, unit: "mm" } },
      { key: "f_price", label: "Price paid", type: "number", options: { min: 0, step: 0.01 } },
      { key: "f_seller", label: "Purchased from", type: "text" },
      { key: "f_box_papers", label: "Box & papers", type: "checkbox" },
    ],
  },
  {
    id: "shoes",
    name: "Shoes",
    description: "Pairs you own, want, or have moved on from.",
    icon: "footprints",
    itemNoun: "pair",
    statusOptions: [
      { key: "wishlist", label: "Wishlist", kind: "planned" },
      { key: "owned", label: "Owned", kind: "active" },
      { key: "sold", label: "Sold", kind: "none" },
    ],
    dateLabel: "Purchased on",
    showRating: true,
    lookupProvider: null,
    fields: [
      { key: "f_brand", label: "Brand", type: "text", required: true, showInCard: true },
      { key: "f_model", label: "Model", type: "text", showInCard: true },
      { key: "f_colourway", label: "Colourway", type: "text" },
      { key: "f_size", label: "Size", type: "number", options: { min: 0, max: 60, step: 0.5 } },
      { key: "f_price", label: "Price paid", type: "number", options: { min: 0, step: 0.01 } },
      { key: "f_condition", label: "Condition", type: "select", options: { choices: ["Deadstock", "Like new", "Worn", "Beaten"] } },
      { key: "f_seller", label: "Purchased from", type: "text" },
    ],
  },
];

export function getTemplate(id: string): CollectionTemplate | undefined {
  return templates.find((t) => t.id === id);
}

/** Sensible defaults for a blank collection. */
export const blankStatusOptions: StatusOption[] = [
  { key: "wishlist", label: "Wishlist", kind: "planned" },
  { key: "owned", label: "Owned", kind: "active" },
];
