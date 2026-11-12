import "server-only";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { PROCESSED_FOLDER } from "@/lib/images/storage";
import { createClient } from "@/lib/supabase/server";

/** Covers stored before resize-at-upload existed (anything outside <user>/c/). */
export async function countUnprocessedCovers(): Promise<number> {
  await connection();
  const user = await requireUser();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("entries")
    .select("id", { count: "exact", head: true })
    .not("cover_image_path", "is", null)
    .not("cover_image_path", "like", `${user.id}/${PROCESSED_FOLDER}/%`);
  if (error) {
    console.error("[lifolio] count unprocessed covers:", error.message);
    return 0;
  }
  return count ?? 0;
}
