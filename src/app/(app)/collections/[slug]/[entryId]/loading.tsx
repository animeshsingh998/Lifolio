import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-8 w-72" />
      <div className="grid max-w-4xl gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="aspect-[4/3] w-full rounded-xl" />
      </div>
    </div>
  );
}
