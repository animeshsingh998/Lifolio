import Link from "next/link";
import { login } from "@/actions/auth";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";
import { ALLOW_SIGNUP } from "@/lib/site";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      description="Log in to your Lifolio."
      footer={
        ALLOW_SIGNUP ? (
          <span>
            No account yet?{" "}
            <Link href="/signup" className="text-foreground underline-offset-4 hover:underline">
              Sign up
            </Link>
          </span>
        ) : null
      }
    >
      <AuthForm
        action={login}
        submitLabel="Log in"
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          {
            name: "password",
            label: "Password",
            type: "password",
            autoComplete: "current-password",
            labelAside: (
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            ),
          },
        ]}
      />
    </AuthCard>
  );
}
