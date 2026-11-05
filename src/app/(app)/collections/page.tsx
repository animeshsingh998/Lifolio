import { FolderPlus } from "lucide-react";
import { CollectionCard } from "@/components/collections/collection-card";
import { NewCollectionDialog } from "@/components/collections/new-collection-dialog";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { listCollections } from "@/lib/queries/collections";

export const metadata = { title: "Collections" };

export default async function CollectionsPage() {
  const collections = await listCollections();

  return (
    <>
      <PageHeader
        title="Collections"
        description="Everything you track, grouped the way you like."
        actions={collections.length > 0 ? <NewCollectionDialog /> : null}
      />
      {collections.length === 0 ? (
        <EmptyState
          icon={FolderPlus}
          title="No collections yet"
          description="Start with Movies, Books or Watches, or build your own from a blank collection."
          action={<NewCollectionDialog trigger={<Button>Create your first collection</Button>} />}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <CollectionCard key={c.id} collection={c} />
          ))}
        </div>
      )}
    </>
  );
}
