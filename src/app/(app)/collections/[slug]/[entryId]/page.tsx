import { notFound } from "next/navigation";
import { EntryActions } from "@/components/entries/entry-actions";
import { EntryDetail } from "@/components/entries/entry-detail";
import { getCollectionBySlug, getCollectionFields } from "@/lib/queries/collections";
import { getEntry } from "@/lib/queries/entries";

type Props = { params: Promise<{ slug: string; entryId: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load(params: Props["params"]) {
  const { slug, entryId } = await params;
  if (!UUID.test(entryId)) return null;
  const collection = await getCollectionBySlug(slug);
  if (!collection) return null;
  const [fields, entry] = await Promise.all([getCollectionFields(collection.id), getEntry(collection.id, entryId)]);
  if (!entry) return null;
  return { collection, fields, entry };
}

export async function generateMetadata({ params }: Props) {
  const data = await load(params);
  return { title: data?.entry.title ?? "Entry" };
}

export default async function EntryPage({ params }: Props) {
  const data = await load(params);
  if (!data) notFound();
  const { collection, fields, entry } = data;

  return (
    <EntryDetail
      collection={collection}
      fields={fields}
      entry={entry}
      backHref={`/collections/${collection.slug}`}
      actions={<EntryActions entryId={entry.id} title={entry.title} isFavorite={entry.is_favorite} collectionSlug={collection.slug} />}
    />
  );
}
