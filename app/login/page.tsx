import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { currentUserId } from "@/lib/session";
import AuthShell from "@/components/AuthShell";
import CredentialsForm from "@/components/CredentialsForm";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import OrDivider from "@/components/OrDivider";
import { MIN_PASSWORD_LENGTH } from "@/lib/users";
import { loginWithPassword } from "./actions";

export const metadata: Metadata = {
  title: "Log In — Strategy-AI",
};

const ERRORS: Record<string, string> = {
  // Only hit when JS is off. Kept vague so it doesn't reveal which emails exist.
  CredentialsSignin:
    "Wrong email or password. If you signed up with Google, use the Google button.",
  OAuthAccountNotLinked:
    "That email is already linked to a different sign-in method.",
  AccessDenied: "Google sign-in was cancelled.",
  Configuration:
    "Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  // currentUserId() also rejects a password session that was revoked.
  if (await currentUserId()) redirect("/dashboard");

  const { error, callbackUrl } = await searchParams;
  const message = error ? (ERRORS[error] ?? "Sign-in failed. Try again.") : null;

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Log in to Strategy-AI"
      subtitle="Pick up right where you left off — your resumes, tailored versions, and interview scorecards are waiting."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="text-primary hover:underline">
            Create a free account
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* OAuth errors only; password errors show inside the form. */}
        {message ? (
          <p
            role="alert"
            className="text-body-sm text-error bg-error/10 border border-error/30 rounded-lg px-4 py-3"
          >
            {message}
          </p>
        ) : null}

        <CredentialsForm
          mode="login"
          action={loginWithPassword}
          callbackUrl={callbackUrl ?? "/dashboard"}
          minPasswordLength={MIN_PASSWORD_LENGTH}
        />

        <OrDivider />

        <GoogleSignInButton
          label="Log in with Google"
          callbackUrl={callbackUrl ?? "/dashboard"}
        />
      </div>
    </AuthShell>
  );
}
