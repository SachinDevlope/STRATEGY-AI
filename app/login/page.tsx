import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import AuthShell from "@/components/AuthShell";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export const metadata: Metadata = {
  title: "Log In — Strategy-AI",
};

const ERRORS: Record<string, string> = {
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
  const session = await auth();
  if (session?.user) redirect("/dashboard");

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
        {message ? (
          <p
            role="alert"
            className="text-body-sm text-error bg-error/10 border border-error/30 rounded-lg px-4 py-3"
          >
            {message}
          </p>
        ) : null}

        <GoogleSignInButton
          label="Log in with Google"
          callbackUrl={callbackUrl ?? "/dashboard"}
        />

        <p className="text-body-sm text-on-surface-variant text-center">
          Google is the only sign-in method right now — no password to forget.
        </p>
      </div>
    </AuthShell>
  );
}
