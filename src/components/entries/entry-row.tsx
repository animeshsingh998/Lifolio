import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { Stars } from "./star-rating";
import { FieldDisplay } from "@/components/fields/registry";
import { formatDate } from "@/lib/fields/definitions";
import type { Collection, CollectionField, Entry } from "@/types/domain";

type EntryRowProps = { collection: Collection; fields: CollectionField[]; entry: Entry };

export function EntryRow({ collection, fields, entry }: EntryRowProps) {
  const cardFields = fields.filter((f) => f.show_in_card).slice(0, 3);
  return (
    <Link
      href={`/collections/${collection.slug}/${entry.id}`}
      className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:grid-cols-[minmax(0,2fr)_repeat(var(--cols),minmax(0,1fr))_auto_auto]"
      style={{ "--cols": cardFields.length } as React.CSSProperties}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="relative size-9 shrink-0 overflow-hidden rounded-md bg-muted">
          {entry.cover_url ? <Image src={entry.cover_url} alt="" fill sizes="36px" className="object-cover" /> : null}
        </span>
        <span className="truncate text-sm font-medium">{entry.title}</span>
        {entry.is_favorite ? <Heart className="size-3.5 shrink-0 fill-rose-500 text-rose-500" aria-label="Favourite" /> : null}
      </span>
      <span className="row-start-2 flex items-center gap-3 text-xs text-muted-foreground sm:hidden">
        {cardFields.map((f) => (
          <FieldDisplay key={f.key} field={f} value={entry.attributes[f.key]} />
        ))}
      </span>
      {cardFields.map((f) => (
        <span key={f.key} className="hidden truncate text-sm text-muted-foreground sm:block">
          <FieldDisplay field={f} value={entry.attributes[f.key]} />
        </span>
      ))}
      <span className="hidden sm:block">
        {entry.rating !== null && collection.show_rating ? <Stars value={entry.rating} starClassName="size-3.5" /> : null}
      </span>
      <span className="flex items-center justify-end gap-3">
        {entry.occurred_on && collection.date_label ? (
          <span className="hidden text-xs text-muted-foreground md:block">{formatDate(entry.occurred_on)}</span>
        ) : null}
        <StatusBadge options={collection.status_options} status={entry.status} />
      </span>
    </Link>
  );
}
