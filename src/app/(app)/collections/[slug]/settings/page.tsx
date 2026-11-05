import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CollectionSettingsForm } from "@/components/collections/collection-settings-form";
import { DeleteCollection } from "@/components/collections/delete-collection";
import { FieldEditor } from "@/components/collections/field-editor";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getCollectionBySlug, getCollectionFields, listCollections } from "@/lib/queries/collections";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  return { title: collection ? `${collection.name} settings` : "Settings" };
}

export default async function CollectionSettingsPage({ params }: Props) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  if (!collection) notFound();

  const [fields, summaries] = await Promise.all([getCollectionFields(collection.id), listCollections()]);
  const entryCount = summaries.find((c) => c.id === collection.id)?.entry_count ?? 0;

  return (
    <>
      <PageHeader
        title={`${collection.name} settings`}
        description="Fields, statuses and how this collection looks."
        actions={
          <Button variant="ghost" nativeButton={false} render={<Link href={`/collections/${slug}`} />}>
            <ArrowLeft /> Back to {collection.name}
          </Button>
        }
      />
      <div className="grid max-w-3xl gap-4">
        <FieldEditor collectionId={collection.id} fields={fields} />
        <CollectionSettingsForm collection={collection} />
        <DeleteCollection id={collection.id} name={collection.name} entryCount={entryCount} />
      </div>
    </>
  );
}
