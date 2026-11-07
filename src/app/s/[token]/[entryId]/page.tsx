import { notFound } from "next/navigation";
import { EntryDetail } from "@/components/entries/entry-detail";
import { ShareUnavailable } from "@/components/share/share-unavailable";
import { getSharedCollection } from "@/lib/queries/share";

type Props = { params: Promise<{ token: string; entryId: string }> };

export async function generateMetadata({ params }: Props) {
  const { token, entryId } = await params;
  const shared = await getSharedCollection(token);
  const entry = shared?.entries.find((e) => e.id === entryId);
  return { title: entry ? `${entry.title} (shared)` : "Link unavailable" };
}

export default async function SharedEntryPage({ params }: Props) {
  const { token, entryId } = await params;
  const shared = await getSharedCollection(token);
  if (!shared) return <ShareUnavailable />;
  const entry = shared.entries.find((e) => e.id === entryId);
  if (!entry) notFound();

  return <EntryDetail collection={shared.collection} fields={shared.fields} entry={entry} backHref={`/s/${token}`} />;
}
