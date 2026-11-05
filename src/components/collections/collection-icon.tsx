"use client";

import { DynamicIcon, iconNames, type IconName } from "lucide-react/dynamic";
import { cn } from "@/lib/utils";

const known = new Set<string>(iconNames);

/** Renders a Lucide icon by its kebab-case name, falling back to a folder for unknown names. */
export function CollectionIcon({ name, className }: { name: string; className?: string }) {
  const icon = (known.has(name) ? name : "folder") as IconName;
  return <DynamicIcon name={icon} className={cn("size-4", className)} aria-hidden />;
}
