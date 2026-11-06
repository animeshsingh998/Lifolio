"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { filtersHref, type EntryFilters } from "@/lib/entries/filters";

type EntriesPaginationProps = { filters: EntryFilters; total: number; pageSize: number; noun: string };

export function EntriesPagination({ filters, total, pageSize, noun }: EntriesPaginationProps) {
  const pathname = usePathname();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(filters.page, pages);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>
        {total === 0 ? `0 ${noun}s` : `${from}–${to} of ${total} ${total === 1 ? noun : `${noun}s`}`}
      </span>
      {pages > 1 ? (
        <span className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            nativeButton={false}
            render={<Link href={filtersHref(pathname, { ...filters, page: page - 1 })} aria-label="Previous page" />}
          >
            <ChevronLeft /> Prev
          </Button>
          <span className="px-2 tabular-nums">
            {page} / {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages}
            nativeButton={false}
            render={<Link href={filtersHref(pathname, { ...filters, page: page + 1 })} aria-label="Next page" />}
          >
            Next <ChevronRight />
          </Button>
        </span>
      ) : null}
    </div>
  );
}
