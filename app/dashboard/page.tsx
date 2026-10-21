import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { currentUserId } from "@/lib/session";

export const metadata: Metadata = {
  title: "Dashboard — Strategy-AI",
};

const NEXT_STEPS = [
  {
    icon: "description",
    title: "Build your resume",
    body: "Answer 8 quick questions and get an ATS-ready A4 PDF.",
    href: "/dashboard/resume/new",
  },
  {
    icon: "adjust",
    title: "Analyse against a JD",
    body: "Upload your PDF, paste a job description, get a match score and a prep plan.",
    href: "/dashboard/resume/analyze",
  },
  {
    icon: "mic",
    title: "Run a mock interview",
    body: "Practice out loud and get a scorecard on your answers.",
  },
];

export default async function DashboardPage() {
  // Middleware only checks the JWT; this also catches a revoked password session.
  if (!(await currentUserId())) redirect("/login");
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <>
      <main className="flex-grow pt-[104px]">
        <section className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto py-12 md:py-20 flex flex-col gap-10">
          <div className="flex flex-col gap-3">
            <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">
              Welcome, {firstName}.
            </h1>
            <p className="text-body-md text-on-surface-variant">
              Signed in as <span className="break-all">{session?.user?.email}</span>. Pick where to start.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {NEXT_STEPS.map((step) => {
              const live = "href" in step && Boolean(step.href);
              const className = `bg-surface-container-lowest border border-outline-variant/50 rounded-xl p-6 flex flex-col gap-4 transition-colors ${
                live ? "hover:border-primary/50" : "opacity-60"
              }`;
              const body = (
                <>
                  <div className="w-11 h-11 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                    <span aria-hidden className="material-symbols-outlined">{step.icon}</span>
                  </div>
                  <h2 className="text-body-md font-bold text-on-surface flex items-center gap-2 flex-wrap">
                    {step.title}
                    {!live && (
                      <span className="text-label-caps uppercase text-on-surface-variant border border-outline-variant/60 rounded px-2 py-0.5">
                        Coming soon
                      </span>
                    )}
                  </h2>
                  <p className="text-body-sm text-on-surface-variant">
                    {step.body}
                  </p>
                </>
              );
              // No href = not built yet.
              return live && "href" in step && step.href ? (
                <Link key={step.title} href={step.href} className={className}>
                  {body}
                </Link>
              ) : (
                <div key={step.title} className={className} aria-disabled="true">
                  {body}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
