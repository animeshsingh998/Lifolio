/**
 * Hand-written Supabase schema types for the tables in supabase/migrations.
 * Mirrors the shape `supabase gen types typescript` produces, so it can be
 * replaced by the generated file once the CLI is set up. Keep in sync with SQL.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_path: string | null;
  theme: string;
  created_at: string;
  updated_at: string;
};

type CollectionRow = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  item_noun: string;
  default_layout: string;
  status_options: Json;
  date_label: string | null;
  show_rating: boolean;
  lookup_provider: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type CollectionFieldRow = {
  id: string;
  collection_id: string;
  user_id: string;
  key: string;
  label: string;
  type: string;
  options: Json;
  required: boolean;
  show_in_card: boolean;
  lookup_key: string | null;
  sort_order: number;
  created_at: string;
};

type EntryRow = {
  id: string;
  collection_id: string;
  user_id: string;
  title: string;
  status: string | null;
  rating: number | null;
  occurred_on: string | null;
  notes: string | null;
  cover_image_path: string | null;
  image_source: string | null;
  external_provider: string | null;
  external_id: string | null;
  tags: string[];
  is_favorite: boolean;
  attributes: Json;
  created_at: string;
  updated_at: string;
};

type ActivityLogRow = {
  id: number;
  user_id: string;
  collection_id: string | null;
  entry_id: string | null;
  action: string;
  summary: string;
  metadata: Json;
  created_at: string;
};

/** Insert type: generated/defaulted columns become optional. */
type InsertOf<Row, Defaulted extends keyof Row> = Omit<Row, Defaulted> & Partial<Pick<Row, Defaulted>>;

export type Database = {
  __InternalSupabase: { PostgrestVersion: "13" };
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: InsertOf<ProfileRow, "display_name" | "avatar_path" | "theme" | "created_at" | "updated_at">;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      collections: {
        Row: CollectionRow;
        Insert: InsertOf<
          CollectionRow,
          | "id"
          | "user_id"
          | "description"
          | "icon"
          | "item_noun"
          | "default_layout"
          | "status_options"
          | "date_label"
          | "show_rating"
          | "lookup_provider"
          | "sort_order"
          | "created_at"
          | "updated_at"
        >;
        Update: Partial<CollectionRow>;
        Relationships: [];
      };
      collection_fields: {
        Row: CollectionFieldRow;
        Insert: InsertOf<
          CollectionFieldRow,
          "id" | "user_id" | "options" | "required" | "show_in_card" | "lookup_key" | "sort_order" | "created_at"
        >;
        Update: Partial<CollectionFieldRow>;
        Relationships: [
          {
            foreignKeyName: "collection_fields_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "collections";
            referencedColumns: ["id"];
          },
        ];
      };
      entries: {
        Row: EntryRow;
        Insert: InsertOf<
          EntryRow,
          | "id"
          | "user_id"
          | "status"
          | "rating"
          | "occurred_on"
          | "notes"
          | "cover_image_path"
          | "image_source"
          | "external_provider"
          | "external_id"
          | "tags"
          | "is_favorite"
          | "attributes"
          | "created_at"
          | "updated_at"
        >;
        Update: Partial<EntryRow>;
        Relationships: [
          {
            foreignKeyName: "entries_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "collections";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_log: {
        Row: ActivityLogRow;
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "activity_log_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "collections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_log_entry_id_fkey";
            columns: ["entry_id"];
            isOneToOne: false;
            referencedRelation: "entries";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      remove_entry_attribute: {
        Args: { p_collection_id: string; p_key: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
