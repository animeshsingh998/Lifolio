import { Download, FileJson, FileSpreadsheet } from "lucide-react";
import { logout } from "@/actions/auth";
import { CollectionIcon } from "@/components/collections/collection-icon";
import { PageHeader } from "@/components/layout/page-header";
import { OptimiseCoversButton } from "@/components/settings/optimise-covers";
import { DisplayNameForm, PasswordForm } from "@/components/settings/profile-form";
import { ThemeToggle } from "@/components/settings/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { listCollections } from "@/lib/queries/collections";
import { countUnprocessedCovers } from "@/lib/queries/covers";
import { getProfile } from "@/lib/queries/profile";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const [profile, collections, unprocessedCovers] = await Promise.all([getProfile(), listCollections(), countUnprocessedCovers()]);
  const since = profile ? new Date(profile.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null;

  return (
    <>
      <PageHeader title="Settings" description="Your profile, account, appearance and data." />

      <div className="grid max-w-2xl gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Shown in the sidebar and on the dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <DisplayNameForm initialName={profile?.display_name ?? ""} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              Signed in as {user.email ?? "an unknown email"}
              {since ? ` · member since ${since}` : ""}.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <PasswordForm />
            <form action={logout}>
              <Button type="submit" variant="ghost" className="text-muted-foreground">
                Log out
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Dark is the default. Light mode is available if you prefer it.</CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeToggle />
          </CardContent>
        </Card>

        {unprocessedCovers > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Cover images</CardTitle>
              <CardDescription>
                New covers are resized to web size when they are added. {unprocessedCovers === 1 ? "One older cover is" : `${unprocessedCovers} older covers are`} still
                stored at full size; converting them makes pages lighter, and the originals are removed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OptimiseCoversButton initialRemaining={unprocessedCovers} />
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Data export</CardTitle>
            <CardDescription>Your data is yours. Download everything as JSON, or one collection as a spreadsheet.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button variant="outline" nativeButton={false} render={<a href="/api/export?format=json" download />} className="self-start">
              <FileJson /> Download everything (JSON)
            </Button>
            {collections.length > 0 ? (
              <ul className="divide-y rounded-lg border">
                {collections.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <CollectionIcon name={c.icon} className="size-4 text-muted-foreground" />
                      <span className="truncate">{c.name}</span>
                      <span className="text-xs text-muted-foreground">{c.entry_count}</span>
                    </span>
                    <Button variant="ghost" size="sm" nativeButton={false} render={<a href={`/api/export?format=csv&collection=${c.id}`} download />}>
                      <FileSpreadsheet /> CSV
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Download className="size-4" /> Per-collection CSV downloads appear here once you have collections.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
