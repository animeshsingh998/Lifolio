import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Settings2 } from "lucide-react";
import { CollectionIcon } from "@/components/collections/collection-icon";
import { EntriesView } from "@/components/entries/entries-view";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getCollectionBySlug, getCollectionFields } from "@/lib/queries/collections";
import { listEntries } from "@/lib/queries/entries";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  return { title: collection?.name ?? "Collection" };
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  if (!collection) notFound();

  const [fields, entries] = await Promise.all([getCollectionFields(collection.id), listEntries(collection.id)]);

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
              <CollectionIcon name={collection.icon} className="size-5" />
            </span>
            {collection.name}
          </span>
        }
        description={collection.description ?? undefined}
        actions={
          <>
            <Button variant="outline" size="icon" aria-label="Collection settings" nativeButton={false} render={<Link href={`/collections/${slug}/settings`} />}>
              <Settings2 />
            </Button>
            <Button nativeButton={false} render={<Link href={`/collections/${slug}/new`} />}>
              <Plus /> Add {collection.item_noun}
            </Button>
          </>
        }
      />
      <EntriesView collection={collection} fields={fields} entries={entries} />
    </>
  );
}
