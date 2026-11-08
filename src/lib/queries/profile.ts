import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Profile = Pick<Tables<"profiles">, "id" | "display_name" | "avatar_path" | "created_at">;

/** The signed-in user's profile row (created by a trigger at sign-up). Null only if that trigger never ran. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("id, display_name, avatar_path, created_at").maybeSingle();
  if (error) {
    console.error("[lifolio] profile:", error.message);
    return null;
  }
  return data;
});
