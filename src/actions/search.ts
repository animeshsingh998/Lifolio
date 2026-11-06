"use server";

import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { searchEntries } from "@/lib/queries/search";
import type { StatusOption } from "@/types/domain";

/** Lean row for the ⌘K palette. */
export type QuickHit = {
  id: string;
  title: string;
  status: string | null;
  rating: number | null;
  cover_url: string | null;
  collection: { slug: string; name: string; icon: string; show_rating: boolean; status_options: StatusOption[] };
};

const QUICK_LIMIT = 12;

export async function quickSearch(input: unknown): Promise<ActionResult<QuickHit[]>> {
  await requireUser();
  const parsed = z.string().trim().min(1).max(100).safeParse(input);
  if (!parsed.success) return ok([]);
  try {
    const hits = await searchEntries(parsed.data, QUICK_LIMIT);
    return ok(
      hits.map(({ entry, collection }) => ({
        id: entry.id,
        title: entry.title,
        status: entry.status,
        rating: entry.rating,
        cover_url: entry.cover_url,
        collection: {
          slug: collection.slug,
          name: collection.name,
          icon: collection.icon,
          show_rating: collection.show_rating,
          status_options: collection.status_options,
        },
      })),
    );
  } catch (e) {
    console.error("[lifolio] quickSearch:", e);
    return fail("Search failed. Try again.");
  }
}
