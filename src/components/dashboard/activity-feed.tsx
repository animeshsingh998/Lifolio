import Link from "next/link";
import { ArrowRightLeft, FolderMinus, FolderPlus, Pencil, Plus, Trash2 } from "lucide-react";
import { timeAgo } from "@/lib/time";
import type { ActivityLog, CollectionSummary } from "@/types/domain";

type ActivityFeedProps = { activity: ActivityLog[]; collections: CollectionSummary[] };

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  entry_created: Plus,
  entry_updated: Pencil,
  status_changed: ArrowRightLeft,
  entry_deleted: Trash2,
  collection_created: FolderPlus,
  collection_deleted: FolderMinus,
};

export function ActivityFeed({ activity, collections }: ActivityFeedProps) {
  const byId = new Map(collections.map((c) => [c.id, c]));

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <h2 className="font-heading text-lg font-semibold">Recent activity</h2>
      {activity.length === 0 ? (
        <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          Changes to your entries and collections will show up here.
        </div>
      ) : (
        <ol className="min-w-0 divide-y rounded-xl border bg-card">
          {activity.map((a) => {
            const Icon = ICONS[a.action] ?? Pencil;
            const collection = a.collection_id ? byId.get(a.collection_id) : undefined;
            const href = collection && a.entry_id ? `/collections/${collection.slug}/${a.entry_id}` : null;
            const content = (
              <>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{a.summary}</span>
                <time dateTime={a.created_at} className="shrink-0 text-xs text-muted-foreground" suppressHydrationWarning>
                  {timeAgo(a.created_at)}
                </time>
              </>
            );
            return (
              <li key={a.id}>
                {href ? (
                  <Link href={href} className="flex min-w-0 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50">
                    {content}
                  </Link>
                ) : (
                  <div className="flex min-w-0 items-center gap-3 px-4 py-2.5 text-muted-foreground">{content}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
