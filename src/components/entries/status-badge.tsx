import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StatusKind, StatusOption } from "@/types/domain";

const KIND_CLASSES: Record<StatusKind, string> = {
  planned: "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-300",
  active: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300",
  done: "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  none: "border-transparent bg-muted text-muted-foreground",
};

export function statusOf(options: StatusOption[], key: string | null): StatusOption | null {
  if (!key) return null;
  return options.find((o) => o.key === key) ?? { key, label: key, kind: "none" };
}

export function StatusBadge({ options, status, className }: { options: StatusOption[]; status: string | null; className?: string }) {
  const option = statusOf(options, status);
  if (!option) return null;
  return (
    <Badge variant="outline" className={cn(KIND_CLASSES[option.kind], className)}>
      {option.label}
    </Badge>
  );
}
