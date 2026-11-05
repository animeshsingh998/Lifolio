import Link from "next/link";
import { CollectionIcon } from "./collection-icon";
import type { CollectionSummary } from "@/types/domain";

export function CollectionCard({ collection }: { collection: CollectionSummary }) {
  const noun = collection.entry_count === 1 ? collection.item_noun : `${collection.item_noun}s`;
  return (
    <Link
      href={`/collections/${collection.slug}`}
      className="group flex flex-col gap-4 rounded-xl border bg-card p-5 text-card-foreground transition-colors hover:border-foreground/20 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
          <CollectionIcon name={collection.icon} className="size-5" />
        </span>
        <span className="text-sm tabular-nums text-muted-foreground">
          {collection.entry_count} {noun}
        </span>
      </div>
      <div className="min-w-0">
        <h3 className="truncate font-medium">{collection.name}</h3>
        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
          {collection.description || `Your ${collection.item_noun} collection.`}
        </p>
      </div>
    </Link>
  );
}
