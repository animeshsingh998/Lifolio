"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, Layers, LayoutDashboard, Library, Plus, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { CollectionIcon } from "@/components/collections/collection-icon";
import { QuickAddButton } from "@/components/collections/quick-add-dialog";
import { SidebarSearchButton } from "@/components/search/search-dialog";
import { UserMenu } from "@/components/layout/user-menu";
import type { CurrentUser } from "@/lib/auth";
import { SITE_NAME } from "@/lib/site";
import type { CollectionSummary } from "@/types/domain";

const NAV = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Collections", href: "/collections", icon: Library, exact: true },
  { title: "Timeline", href: "/timeline", icon: Clock, badge: "Soon" },
  { title: "Settings", href: "/settings", icon: Settings },
] as const;

type AppSidebarProps = { user: CurrentUser; collections: CollectionSummary[] };

export function AppSidebar({ user, collections }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Layers className="size-4" />
              </span>
              <span className="font-heading text-base font-bold tracking-[0.08em] uppercase">{SITE_NAME}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <QuickAddButton collections={collections} />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarSearchButton />
              </SidebarMenuItem>
              {NAV.map((item) => {
                const active =
                  "exact" in item && item.exact
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton isActive={active} tooltip={item.title} render={<Link href={item.href} />}>
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                    {"badge" in item ? <SidebarMenuBadge>{item.badge}</SidebarMenuBadge> : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {collections.length > 0 ? (
          <SidebarGroup>
            <SidebarGroupLabel>Your collections</SidebarGroupLabel>
            <SidebarGroupAction title="New collection" render={<Link href="/collections" />}>
              <Plus />
              <span className="sr-only">New collection</span>
            </SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu>
                {collections.map((c) => {
                  const href = `/collections/${c.slug}`;
                  const active = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <SidebarMenuItem key={c.id}>
                      <SidebarMenuButton isActive={active} tooltip={c.name} render={<Link href={href} />}>
                        <CollectionIcon name={c.icon} />
                        <span className="truncate">{c.name}</span>
                      </SidebarMenuButton>
                      {c.entry_count > 0 ? <SidebarMenuBadge>{c.entry_count}</SidebarMenuBadge> : null}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      <SidebarFooter>
        <UserMenu user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
