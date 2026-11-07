import Link from "next/link";
import { notFound } from "next/navigation";
import { FileJson, Plus, Settings2 } from "lucide-react";
import { CollectionIcon } from "@/components/collections/collection-icon";
import { ShareDialog } from "@/components/collections/share-dialog";
import { EntriesView } from "@/components/entries/entries-view";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { parseEntryFilters, type SearchParamsInput } from "@/lib/entries/filters";
import { getCollectionBySlug, getCollectionFields } from "@/lib/queries/collections";
import { listCollectionTags, listEntries } from "@/lib/queries/entries";
import { listShareLinks } from "@/lib/queries/share";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParamsInput> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  return { title: collection?.name ?? "Collection" };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const collection = await getCollectionBySlug(slug);
  if (!collection) notFound();

  const fields = await getCollectionFields(collection.id);
  const filters = parseEntryFilters(sp, collection, fields);
  const [page, tags, shareLinks] = await Promise.all([
    listEntries(collection.id, filters),
    listCollectionTags(collection.id),
    listShareLinks(collection.id),
  ]);

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
            <ShareDialog collectionId={collection.id} collectionName={collection.name} links={shareLinks} />
            <Button variant="outline" size="icon" aria-label="Import from JSON" title="Import from JSON" nativeButton={false} render={<Link href={`/collections/${slug}/import`} />}>
              <FileJson />
            </Button>
            <Button variant="outline" size="icon" aria-label="Collection settings" nativeButton={false} render={<Link href={`/collections/${slug}/settings`} />}>
              <Settings2 />
            </Button>
            <Button nativeButton={false} render={<Link href={`/collections/${slug}/new`} />}>
              <Plus /> Add {collection.item_noun}
            </Button>
          </>
        }
      />
      <EntriesView collection={collection} fields={fields} page={page} tags={tags} filters={filters} />
    </>
  );
}
