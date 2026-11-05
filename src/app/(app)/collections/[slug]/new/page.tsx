import { notFound } from "next/navigation";
import { EntryForm } from "@/components/entries/entry-form";
import { PageHeader } from "@/components/layout/page-header";
import { getCollectionBySlug, getCollectionFields } from "@/lib/queries/collections";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  return { title: collection ? `New ${collection.item_noun}` : "New entry" };
}

export default async function NewEntryPage({ params }: Props) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  if (!collection) notFound();
  const fields = await getCollectionFields(collection.id);

  return (
    <>
      <PageHeader title={`New ${collection.item_noun}`} description={`Add to ${collection.name}.`} />
      <div className="max-w-2xl">
        <EntryForm collection={collection} fields={fields} />
      </div>
    </>
  );
}
