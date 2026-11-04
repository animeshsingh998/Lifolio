import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed px-6 py-16 text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="size-6" />
      </span>
      <h2 className="text-base font-medium">{title}</h2>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
