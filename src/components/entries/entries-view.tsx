"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, List, Plus, SearchX } from "lucide-react";
import { setCollectionLayout } from "@/actions/collections";
import { EntriesPagination } from "./entries-pagination";
import { EntryCard } from "./entry-card";
import { EntryFiltersBar } from "./entry-filters";
import { EntryRow } from "./entry-row";
import { CollectionIcon } from "@/components/collections/collection-icon";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { activeFilterCount, EMPTY_FILTERS, filtersHref, type EntryFilters } from "@/lib/entries/filters";
import type { EntryPage, TagCount } from "@/lib/queries/entries";
import { cn } from "@/lib/utils";
import type { Collection, CollectionField, Layout } from "@/types/domain";

type EntriesViewProps = {
  collection: Collection;
  fields: CollectionField[];
  page: EntryPage;
  tags: TagCount[];
  filters: EntryFilters;
  /** Public share view: no add button, no quick controls, layout choice not persisted. */
  readOnly?: boolean;
  /** Where entry links point; defaults to the collection page. */
  basePath?: string;
};

export function EntriesView({ collection, fields, page, tags, filters, readOnly = false, basePath }: EntriesViewProps) {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const [layout, setLayout] = useState<Layout>(collection.default_layout);
  // The page may be revived by Activity after the default changed in settings; follow the server value.
  const [seenDefault, setSeenDefault] = useState(collection.default_layout);
  if (seenDefault !== collection.default_layout) {
    setSeenDefault(collection.default_layout);
    setLayout(collection.default_layout);
  }

  function changeLayout(next: Layout) {
    setLayout(next);
    if (!readOnly) void setCollectionLayout(collection.id, next); // persist; failure just means the toggle resets next visit
  }

  const { entries, total } = page;
  const filtered = activeFilterCount(filters) > 0;

  if (total === 0 && !filtered && filters.page === 1) {
    return (
      <EmptyState
        icon={() => <CollectionIcon name={collection.icon} className="size-6" />}
        title={`No ${collection.item_noun}s yet`}
        description={readOnly ? "This collection has no entries." : `Add your first ${collection.item_noun} to start building this collection.`}
        action={
          readOnly ? null : (
            <Button nativeButton={false} render={<Link href={`/collections/${collection.slug}/new`} />}>
              <Plus /> Add {collection.item_noun}
            </Button>
          )
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <EntryFiltersBar collection={collection} fields={fields} tags={tags} filters={filters} onPendingChange={setPending} />
        </div>
        <ToggleGroup
          variant="outline"
          size="sm"
          value={[layout]}
          onValueChange={(v) => v[0] && changeLayout(v[0] as Layout)}
          aria-label="View"
          className="shrink-0 self-end sm:self-start"
        >
          <ToggleGroupItem value="grid" aria-label="Grid view">
            <LayoutGrid />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view">
            <List />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className={cn("flex flex-col gap-4 transition-opacity", pending && "opacity-60")}>
        <EntriesPagination filters={filters} total={total} pageSize={page.pageSize} noun={collection.item_noun} />

        {entries.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={filtered ? "Nothing matches these filters" : "Nothing on this page"}
            description={filtered ? "Try a different search or clear some filters." : "This page is past the end of the list."}
            action={
              <Button variant="outline" nativeButton={false} render={<Link href={filtersHref(pathname, { ...EMPTY_FILTERS, sort: filters.sort })} />}>
                {filtered ? "Clear filters" : "Back to first page"}
              </Button>
            }
          />
        ) : layout === "grid" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {entries.map((e) => (
              <EntryCard key={e.id} collection={collection} fields={fields} entry={e} basePath={basePath} readOnly={readOnly} />
            ))}
          </div>
        ) : (
          <div className="divide-y overflow-hidden rounded-xl border bg-card">
            {entries.map((e) => (
              <EntryRow key={e.id} collection={collection} fields={fields} entry={e} basePath={basePath} readOnly={readOnly} />
            ))}
          </div>
        )}

        {entries.length > 0 && total > page.pageSize ? (
          <EntriesPagination filters={filters} total={total} pageSize={page.pageSize} noun={collection.item_noun} />
        ) : null}
      </div>
    </div>
  );
}
