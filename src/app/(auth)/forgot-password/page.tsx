import Link from "next/link";
import { forgotPassword } from "@/actions/auth";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      description="We'll email you a link to choose a new one."
      footer={
        <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
          Back to login
        </Link>
      }
    >
      <AuthForm
        action={forgotPassword}
        submitLabel="Send reset link"
        fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]}
      />
    </AuthCard>
  );
}
