import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { QuickEdit, QuickRating, QuickStatus } from "./quick-controls";
import { Stars } from "./star-rating";
import { StatusBadge } from "./status-badge";
import { CollectionIcon } from "@/components/collections/collection-icon";
import { FieldDisplay } from "@/components/fields/registry";
import { formatDate } from "@/lib/fields/definitions";
import type { Collection, CollectionField, Entry } from "@/types/domain";

type EntryCardProps = {
  collection: Collection;
  fields: CollectionField[];
  entry: Entry;
  /** Where entry links point; defaults to the collection page. Public share pages pass `/s/<token>`. */
  basePath?: string;
  /** No quick controls, no edit shortcut (public share view). */
  readOnly?: boolean;
};

/**
 * Grid tile. The whole card is a link (an overlay anchor behind the content) so the status chip and
 * rating stars can be real controls on top of it without nesting interactive elements.
 */
export function EntryCard({ collection, fields, entry, basePath = `/collections/${collection.slug}`, readOnly = false }: EntryCardProps) {
  const cardFields = fields.filter((f) => f.show_in_card);
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground transition-colors hover:border-foreground/20 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring">
      <Link href={`${basePath}/${entry.id}`} aria-label={entry.title} className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none" />

      <div className="pointer-events-none relative flex aspect-[3/4] items-center justify-center bg-gradient-to-br from-muted to-muted/40">
        {entry.cover_url ? (
          <Image
            src={entry.cover_url}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <CollectionIcon name={collection.icon} className="size-8 text-muted-foreground/50" />
        )}
        {entry.is_favorite ? (
          <Heart className="absolute top-2 right-2 size-4 fill-rose-500 text-rose-500" aria-label="Favourite" />
        ) : null}
        {readOnly ? (
          entry.status ? <StatusBadge options={collection.status_options} status={entry.status} className="absolute bottom-2 left-2" /> : null
        ) : (
          <>
            <span className="pointer-events-auto absolute bottom-2 left-2 z-10">
              <QuickStatus entryId={entry.id} status={entry.status} options={collection.status_options} />
            </span>
            <span className="pointer-events-auto absolute top-2 left-2 z-10">
              <QuickEdit href={`${basePath}/${entry.id}/edit`} />
            </span>
          </>
        )}
      </div>

      <div className="pointer-events-none relative flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm leading-snug font-medium">{entry.title}</h3>
        {cardFields.length > 0 ? (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {cardFields
              .map((f) => <FieldDisplay key={f.key} field={f} value={entry.attributes[f.key]} />)
              .filter(Boolean)
              .reduce<React.ReactNode[]>((acc, el, i) => (i === 0 ? [el] : [...acc, " · ", el]), [])}
          </p>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          {collection.show_rating && !readOnly ? (
            <QuickRating entryId={entry.id} rating={entry.rating} starClassName="size-3.5" className="pointer-events-auto z-10" />
          ) : collection.show_rating && entry.rating !== null ? (
            <Stars value={entry.rating} starClassName="size-3.5" />
          ) : (
            <span />
          )}
          {entry.occurred_on && collection.date_label ? (
            <span className="text-xs text-muted-foreground">{formatDate(entry.occurred_on)}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
