import { resetPassword } from "@/actions/auth";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = { title: "Choose a new password" };

// Reached from the email link via /auth/confirm, which has already created a session.
// proxy.ts treats this route as protected, so an unauthenticated visitor is sent to /login.
export default function ResetPasswordPage() {
  return (
    <AuthCard title="Choose a new password" description="Use at least 8 characters.">
      <AuthForm
        action={resetPassword}
        submitLabel="Update password"
        fields={[
          { name: "password", label: "New password", type: "password", autoComplete: "new-password" },
          { name: "confirm", label: "Confirm password", type: "password", autoComplete: "new-password" },
        ]}
      />
    </AuthCard>
  );
}
