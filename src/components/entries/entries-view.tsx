"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGrid, List, Plus } from "lucide-react";
import { setCollectionLayout } from "@/actions/collections";
import { EntryCard } from "./entry-card";
import { EntryRow } from "./entry-row";
import { CollectionIcon } from "@/components/collections/collection-icon";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Collection, CollectionField, Entry, Layout } from "@/types/domain";

type EntriesViewProps = { collection: Collection; fields: CollectionField[]; entries: Entry[] };

export function EntriesView({ collection, fields, entries }: EntriesViewProps) {
  const [layout, setLayout] = useState<Layout>(collection.default_layout);

  function changeLayout(next: Layout) {
    setLayout(next);
    void setCollectionLayout(collection.id, next); // persist; failure just means the toggle resets next visit
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={() => <CollectionIcon name={collection.icon} className="size-6" />}
        title={`No ${collection.item_noun}s yet`}
        description={`Add your first ${collection.item_noun} to start building this collection.`}
        action={
          <Button nativeButton={false} render={<Link href={`/collections/${collection.slug}/new`} />}>
            <Plus /> Add {collection.item_noun}
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {entries.length} {entries.length === 1 ? collection.item_noun : `${collection.item_noun}s`}
        </p>
        <ToggleGroup
          variant="outline"
          size="sm"
          value={[layout]}
          onValueChange={(v) => v[0] && changeLayout(v[0] as Layout)}
          aria-label="View"
        >
          <ToggleGroupItem value="grid" aria-label="Grid view">
            <LayoutGrid />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view">
            <List />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {layout === "grid" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {entries.map((e) => (
            <EntryCard key={e.id} collection={collection} fields={fields} entry={e} />
          ))}
        </div>
      ) : (
        <div className="divide-y overflow-hidden rounded-xl border bg-card">
          {entries.map((e) => (
            <EntryRow key={e.id} collection={collection} fields={fields} entry={e} />
          ))}
        </div>
      )}
    </div>
  );
}
