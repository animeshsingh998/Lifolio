import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Link expired" };

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">This link is invalid or has expired</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Email links only work once and for a limited time. Request a new one and try again.
      </p>
      <div className="flex gap-2">
        <Button nativeButton={false} render={<Link href="/login" />}>Back to login</Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/forgot-password" />}>
          Reset password
        </Button>
      </div>
    </main>
  );
}
