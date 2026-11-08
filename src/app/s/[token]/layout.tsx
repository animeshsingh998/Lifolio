import Link from "next/link";
import { Layers } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { Badge } from "@/components/ui/badge";
import { SITE_NAME } from "@/lib/site";

export const metadata = { robots: { index: false, follow: false } };

/** Minimal public shell: no sidebar, no session. Everything under /s is read-only. */
export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Layers className="size-4" />
          </span>
          <span className="font-heading text-sm font-bold tracking-[0.08em] uppercase">{SITE_NAME}</span>
        </Link>
        <Badge variant="secondary" className="text-[11px]">
          Shared view
        </Badge>
      </header>
      <main className="mx-auto flex w-full min-w-0 max-w-7xl flex-1 flex-col gap-6 overflow-x-clip p-4 md:p-8">{children}</main>
      <SiteFooter className="px-4 pb-4 md:px-8" />
    </div>
  );
}
