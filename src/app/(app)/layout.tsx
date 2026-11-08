import { Suspense } from "react";
import { cookies } from "next/headers";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppShellSkeleton } from "@/components/layout/app-shell-skeleton";
import { SiteFooter } from "@/components/layout/site-footer";
import { SearchDialogProvider, SearchIconButton } from "@/components/search/search-dialog";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { requireUser } from "@/lib/auth";
import { listCollections } from "@/lib/queries/collections";
import { getProfile } from "@/lib/queries/profile";
import type { CollectionSummary } from "@/types/domain";

async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const cookieStore = await cookies();
  const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false";

  // The sidebar must never take the whole app down (e.g. before migrations are applied);
  // pages surface the real error through their own error boundaries.
  let collections: CollectionSummary[] = [];
  let displayName: string | null = null;
  try {
    [collections, displayName] = await Promise.all([listCollections(), getProfile().then((p) => p?.display_name ?? null)]);
  } catch (error) {
    console.error("[lifolio] sidebar data:", error);
  }

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <SearchDialogProvider collections={collections}>
        <AppSidebar user={user} displayName={displayName} collections={collections} />
        <SidebarInset>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 md:hidden">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <span className="text-sm font-medium">Lifolio</span>
            <SearchIconButton className="ml-auto" />
          </header>
          <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-clip p-4 md:p-8">{children}</div>
          <SiteFooter className="px-4 pb-4 md:px-8" />
        </SidebarInset>
      </SearchDialogProvider>
    </SidebarProvider>
  );
}

// Reading cookies is request-time work; the Suspense boundary lets Next.js
// prerender a static shell and stream the authenticated UI into it.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
