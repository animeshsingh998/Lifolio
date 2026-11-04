import Link from "next/link";
import { Layers } from "lucide-react";
import { SITE_NAME } from "@/lib/site";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2 text-lg font-semibold tracking-tight">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Layers className="size-4" />
        </span>
        {SITE_NAME}
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
