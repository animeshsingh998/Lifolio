import { logout } from "@/actions/auth";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/settings/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <>
      <PageHeader title="Settings" description="Your account and preferences." />

      <div className="grid max-w-2xl gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>You are signed in as {user.email ?? "an unknown email"}.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={logout}>
              <Button type="submit" variant="outline">
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
      </div>
    </>
  );
}
