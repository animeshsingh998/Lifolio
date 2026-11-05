"use server";

import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { getProvider } from "@/lib/lookup/registry";
import type { LookupResult } from "@/lib/lookup/types";

const query = z.string().trim().min(2, "Type at least 2 characters.").max(120);
const id = z.string().trim().min(1).max(100);

export async function searchLookup(providerId: string, rawQuery: string): Promise<ActionResult<LookupResult[]>> {
  await requireUser();
  const provider = getProvider(providerId);
  if (!provider) return fail("Unknown lookup provider.");
  if (!provider.isConfigured()) return fail(`${provider.label} is not configured on this server.`);
  const q = query.safeParse(rawQuery);
  if (!q.success) return fail(q.error.issues[0]?.message ?? "Invalid search.");

  try {
    return ok(await provider.search(q.data));
  } catch (error) {
    console.error(`[lifolio] lookup search (${provider.id}):`, error);
    return fail(`${provider.label} search failed. Try again in a moment.`);
  }
}

export async function lookupDetails(providerId: string, externalId: string): Promise<ActionResult<LookupResult | null>> {
  await requireUser();
  const provider = getProvider(providerId);
  if (!provider) return fail("Unknown lookup provider.");
  if (!provider.details) return ok(null);
  const parsed = id.safeParse(externalId);
  if (!parsed.success) return fail("Invalid id.");

  try {
    return ok(await provider.details(parsed.data));
  } catch (error) {
    console.error(`[lifolio] lookup details (${provider.id}):`, error);
    return fail(`Could not load details from ${provider.label}.`);
  }
}
