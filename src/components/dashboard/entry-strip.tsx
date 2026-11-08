import { EntryCard } from "@/components/entries/entry-card";
import type { CollectionField, CollectionSummary, Entry } from "@/types/domain";

type EntryStripProps = {
  title: string;
  description?: string;
  entries: Entry[];
  collections: CollectionSummary[];
  fieldsByCollection: Map<string, CollectionField[]>;
  empty: React.ReactNode;
};

/** A titled row of up to eight cover tiles pulled from any collection. */
export function EntryStrip({ title, description, entries, collections, fieldsByCollection, empty }: EntryStripProps) {
  const byId = new Map(collections.map((c) => [c.id, c]));
  const items = entries.flatMap((e) => {
    const collection = byId.get(e.collection_id);
    return collection ? [{ entry: e, collection }] : [];
  });

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div>
        <h2 className="font-heading text-lg font-semibold">{title}</h2>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">{empty}</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {items.map(({ entry, collection }) => (
            <EntryCard key={entry.id} collection={collection} fields={fieldsByCollection.get(collection.id) ?? []} entry={entry} />
          ))}
        </div>
      )}
    </section>
  );
}
