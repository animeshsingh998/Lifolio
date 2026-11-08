import Link from "next/link";
import { Heart, Star } from "lucide-react";
import { CollectionIcon } from "@/components/collections/collection-icon";
import type { CollectionStats } from "@/lib/queries/dashboard";
import { formatRating } from "@/lib/rating";
import type { CollectionSummary, StatusKind } from "@/types/domain";

type CollectionStatCardProps = { collection: CollectionSummary; stats: CollectionStats | undefined };

/** Same hues as StatusBadge so the bar reads as the statuses. */
const KIND_BAR: Record<StatusKind, string> = {
  planned: "bg-sky-500/70",
  active: "bg-amber-500/80",
  done: "bg-emerald-500/80",
  none: "bg-muted-foreground/30",
};
const KIND_ORDER: StatusKind[] = ["done", "active", "planned", "none"];

export function CollectionStatCard({ collection, stats }: CollectionStatCardProps) {
  const total = stats?.total ?? 0;
  const noun = total === 1 ? collection.item_noun : `${collection.item_noun}s`;

  // Collapse per-status counts into per-kind segments; unknown or empty statuses count as "none".
  const byKind: Record<StatusKind, number> = { planned: 0, active: 0, done: 0, none: 0 };
  const kindOf = new Map(collection.status_options.map((s) => [s.key, s.kind]));
  for (const [key, n] of Object.entries(stats?.statusCounts ?? {})) byKind[kindOf.get(key) ?? "none"] += n;
  const segments = KIND_ORDER.filter((k) => byKind[k] > 0);
  const legend = KIND_ORDER.filter((k) => k !== "none" && byKind[k] > 0).map((k) => ({
    kind: k,
    n: byKind[k],
    label: collection.status_options.filter((s) => s.kind === k).map((s) => s.label).join(" / "),
  }));

  return (
    <Link
      href={`/collections/${collection.slug}`}
      className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <CollectionIcon name={collection.icon} className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium">{collection.name}</h3>
          <p className="text-xs text-muted-foreground">
            {total.toLocaleString()} {noun}
            {stats && stats.added30d > 0 ? <span className="text-primary"> · +{stats.added30d} this month</span> : null}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          {collection.show_rating && stats?.avgRating != null ? (
            <span className="inline-flex items-center gap-1" title={`Average ${formatRating(stats.avgRating)}`}>
              <Star className="size-3.5 fill-amber-500 text-amber-500" /> {(stats.avgRating / 2).toFixed(1)}
            </span>
          ) : null}
          {stats && stats.favourites > 0 ? (
            <span className="inline-flex items-center gap-1" title="Favourites">
              <Heart className="size-3.5 fill-rose-500 text-rose-500" /> {stats.favourites}
            </span>
          ) : null}
        </div>
      </div>

      {total > 0 && segments.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
            {segments.map((k) => (
              <span key={k} className={KIND_BAR[k]} style={{ width: `${(byKind[k] / total) * 100}%` }} />
            ))}
          </div>
          {legend.length > 0 ? (
            <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
              {legend.map((l) => (
                <span key={l.kind} className="inline-flex items-center gap-1">
                  <span className={`size-1.5 rounded-full ${KIND_BAR[l.kind]}`} />
                  {l.n} {l.label.toLowerCase()}
                </span>
              ))}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Nothing here yet</p>
      )}
    </Link>
  );
}
