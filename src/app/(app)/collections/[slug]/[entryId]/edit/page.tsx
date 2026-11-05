import { notFound } from "next/navigation";
import { EntryForm } from "@/components/entries/entry-form";
import { PageHeader } from "@/components/layout/page-header";
import { getCollectionBySlug, getCollectionFields } from "@/lib/queries/collections";
import { getEntry } from "@/lib/queries/entries";

type Props = { params: Promise<{ slug: string; entryId: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: Props) {
  const { slug, entryId } = await params;
  const collection = await getCollectionBySlug(slug);
  const entry = collection && UUID.test(entryId) ? await getEntry(collection.id, entryId) : null;
  return { title: entry ? `Edit ${entry.title}` : "Edit entry" };
}

export default async function EditEntryPage({ params }: Props) {
  const { slug, entryId } = await params;
  if (!UUID.test(entryId)) notFound();
  const collection = await getCollectionBySlug(slug);
  if (!collection) notFound();
  const [fields, entry] = await Promise.all([getCollectionFields(collection.id), getEntry(collection.id, entryId)]);
  if (!entry) notFound();

  return (
    <>
      <PageHeader title={`Edit ${collection.item_noun}`} description={entry.title} />
      <div className="max-w-2xl">
        <EntryForm collection={collection} fields={fields} entry={entry} />
      </div>
    </>
  );
}
