import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import AuthShell from "@/components/AuthShell";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export const metadata: Metadata = {
  title: "Sign Up — Strategy-AI",
};

export default async function SignupPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

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
        <GoogleSignInButton label="Sign up with Google" />
        <p className="text-body-sm text-on-surface-variant text-center">
          No credit card. No password. One click and you&apos;re in.
        </p>
      </div>
    </AuthShell>
  );
}
