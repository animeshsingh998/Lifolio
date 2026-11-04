import { Skeleton } from "@/components/ui/skeleton";

/** Static shell shown while the authenticated layout streams in. */
export function AppShellSkeleton() {
  return (
    <div className="flex min-h-svh w-full">
      <aside className="hidden w-64 shrink-0 border-r bg-sidebar p-4 md:block">
        <Skeleton className="mb-8 h-8 w-32" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </aside>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
