import { CalendarPlus, Heart, Layers, Library } from "lucide-react";

type StatTilesProps = { totals: { entries: number; collections: number; added30d: number; favourites: number } };

const fmt = (n: number) => n.toLocaleString();

export function StatTiles({ totals }: StatTilesProps) {
  const tiles = [
    { label: "Entries", value: fmt(totals.entries), icon: Layers },
    { label: "Collections", value: fmt(totals.collections), icon: Library },
    { label: "Added in 30 days", value: fmt(totals.added30d), icon: CalendarPlus },
    { label: "Favourites", value: fmt(totals.favourites), icon: Heart },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="flex items-center gap-4 rounded-xl border bg-card p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <t.icon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-heading text-2xl font-bold tabular-nums">{t.value}</p>
            <p className="truncate text-xs text-muted-foreground">{t.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
