import { Suspense } from "react";
import { cookies } from "next/headers";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppShellSkeleton } from "@/components/layout/app-shell-skeleton";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { requireUser } from "@/lib/auth";
import { listCollections } from "@/lib/queries/collections";
import type { CollectionSummary } from "@/types/domain";

async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const cookieStore = await cookies();
  const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false";

  // The sidebar must never take the whole app down (e.g. before migrations are applied);
  // pages surface the real error through their own error boundaries.
  let collections: CollectionSummary[] = [];
  try {
    collections = await listCollections();
  } catch (error) {
    console.error("[lifolio] sidebar collections:", error);
  }

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <AppSidebar user={user} collections={collections} />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 md:hidden">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-medium">Lifolio</span>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-8">{children}</div>
      </SidebarInset>
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
