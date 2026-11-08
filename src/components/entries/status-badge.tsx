import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StatusKind, StatusOption } from "@/types/domain";

const KIND_CLASSES: Record<StatusKind, string> = {
  planned: "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-300",
  active: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300",
  done: "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  none: "border-transparent bg-muted text-muted-foreground",
};

/** On top of a cover image the tinted 15 % fill vanishes against light posters; use an opaque card backdrop instead. */
const KIND_ON_IMAGE: Record<StatusKind, string> = {
  planned: "border-sky-500/30 bg-background/90 text-sky-700 shadow-sm backdrop-blur-sm dark:text-sky-300",
  active: "border-amber-500/30 bg-background/90 text-amber-700 shadow-sm backdrop-blur-sm dark:text-amber-300",
  done: "border-emerald-500/30 bg-background/90 text-emerald-700 shadow-sm backdrop-blur-sm dark:text-emerald-300",
  none: "border-border bg-background/90 text-muted-foreground shadow-sm backdrop-blur-sm",
};

export function statusChipClasses(kind: StatusKind, onImage = false): string {
  return onImage ? KIND_ON_IMAGE[kind] : KIND_CLASSES[kind];
}

export function statusOf(options: StatusOption[], key: string | null): StatusOption | null {
  if (!key) return null;
  return options.find((o) => o.key === key) ?? { key, label: key, kind: "none" };
}

type StatusBadgeProps = { options: StatusOption[]; status: string | null; className?: string; onImage?: boolean };

export function StatusBadge({ options, status, className, onImage }: StatusBadgeProps) {
  const option = statusOf(options, status);
  if (!option) return null;
  return (
    <Badge variant="outline" className={cn(statusChipClasses(option.kind, onImage), className)}>
      {option.label}
    </Badge>
  );
}
