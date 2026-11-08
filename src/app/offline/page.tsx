import { Layers, WifiOff } from "lucide-react";
import { SITE_NAME } from "@/lib/site";

export const metadata = { title: "Offline", robots: { index: false } };

/** Static fallback the service worker serves when a page cannot be fetched. */
export default function OfflinePage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="flex items-center gap-2 font-heading text-lg font-bold tracking-[0.08em] uppercase">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Layers className="size-4" />
        </span>
        {SITE_NAME}
      </span>
      <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <WifiOff className="size-6" />
      </span>
      <div className="flex flex-col gap-1">
        <h1 className="text-base font-medium">You are offline</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          This page is not available without a connection. Pages you opened recently may still work; try again once you are back online.
        </p>
      </div>
      <a href="/dashboard" className="text-sm text-primary underline-offset-4 hover:underline">
        Try again
      </a>
    </main>
  );
}
