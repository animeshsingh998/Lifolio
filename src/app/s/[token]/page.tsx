import { Clock } from "lucide-react";
import { CollectionIcon } from "@/components/collections/collection-icon";
import { EntriesView } from "@/components/entries/entries-view";
import { PageHeader } from "@/components/layout/page-header";
import { ShareUnavailable } from "@/components/share/share-unavailable";
import { applyFilters, tagCounts } from "@/lib/entries/apply-filters";
import { PAGE_SIZE, parseEntryFilters, type SearchParamsInput } from "@/lib/entries/filters";
import { getSharedCollection } from "@/lib/queries/share";
import { timeLeft } from "@/lib/time";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<SearchParamsInput> };

export async function generateMetadata({ params }: Props) {
  const { token } = await params;
  const shared = await getSharedCollection(token);
  return { title: shared ? `${shared.collection.name} (shared)` : "Link unavailable" };
}

export default async function SharedCollectionPage({ params, searchParams }: Props) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const shared = await getSharedCollection(token);
  if (!shared) return <ShareUnavailable />;

  const { collection, fields, entries, share } = shared;
  const filters = parseEntryFilters(sp, collection, fields);
  const result = applyFilters(entries, filters);

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
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" suppressHydrationWarning>
            <Clock className="size-3.5" /> Link expires {timeLeft(share.expires_at)}
          </span>
        }
      />
      <EntriesView
        collection={collection}
        fields={fields}
        page={{ entries: result.entries, total: result.total, page: filters.page, pageSize: PAGE_SIZE }}
        tags={tagCounts(entries)}
        filters={filters}
        readOnly
        basePath={`/s/${token}`}
      />
    </>
  );
}
