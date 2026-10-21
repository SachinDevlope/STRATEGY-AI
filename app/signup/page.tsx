import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { currentUserId } from "@/lib/session";
import AuthShell from "@/components/AuthShell";
import CredentialsForm from "@/components/CredentialsForm";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import OrDivider from "@/components/OrDivider";
import { MIN_PASSWORD_LENGTH } from "@/lib/users";
import { signUpWithPassword } from "./actions";

export const metadata: Metadata = {
  title: "Sign Up — Strategy-AI",
};

export default async function SignupPage() {
  // currentUserId() also rejects a password session that was revoked.
  if (await currentUserId()) redirect("/dashboard");

  return (
    <AuthShell
      eyebrow="Free forever"
      title="Create your Strategy-AI account"
      subtitle="Build an ATS-ready resume in 2 minutes and run your first live AI mock interview today."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <CredentialsForm
          mode="signup"
          action={signUpWithPassword}
          minPasswordLength={MIN_PASSWORD_LENGTH}
        />

        <OrDivider />

        <GoogleSignInButton label="Sign up with Google" />
      </div>
    </AuthShell>
  );
}
