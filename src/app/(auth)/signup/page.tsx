import Link from "next/link";
import { signup } from "@/actions/auth";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";
import { Button } from "@/components/ui/button";
import { ALLOW_SIGNUP } from "@/lib/site";

export const metadata = { title: "Sign up" };

export default function SignupPage() {
  if (!ALLOW_SIGNUP) {
    return (
      <AuthCard title="Sign-up is closed" description="New accounts are not being accepted right now.">
        <Button variant="outline" className="w-full" render={<Link href="/login" />}>
          Back to login
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create your Lifolio"
      description="One place for everything you own, watch, read and want."
      footer={
        <span>
          Already have an account?{" "}
          <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
            Log in
          </Link>
        </span>
      }
    >
      <AuthForm
        action={signup}
        submitLabel="Sign up"
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
        ]}
      />
    </AuthCard>
  );
}
