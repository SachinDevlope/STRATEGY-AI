import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { auth } from "@/auth";

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
    title: "Tailor to a JD",
    body: "Paste a job description and rewrite your bullets to match.",
  },
  {
    icon: "mic",
    title: "Run a mock interview",
    body: "Practice out loud and get a scorecard on your answers.",
  },
];

export default async function DashboardPage() {
  // middleware.ts already gates this route; auth() gives us the user.
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <>
      <Navbar />
      <main className="flex-grow pt-[104px]">
        <section className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto py-12 md:py-20 flex flex-col gap-10">
          <div className="flex flex-col gap-3">
            <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">
              Welcome, {firstName}.
            </h1>
            <p className="text-body-md text-on-surface-variant">
              Signed in as {session?.user?.email}. Pick where to start.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {NEXT_STEPS.map((step) => {
              const className =
                "bg-surface-container-lowest border border-outline-variant/50 rounded-xl p-6 flex flex-col gap-4 hover:border-primary/50 transition-colors";
              const body = (
                <>
                  <div className="w-11 h-11 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">{step.icon}</span>
                  </div>
                  <h2 className="text-body-md font-bold text-on-surface">
                    {step.title}
                  </h2>
                  <p className="text-body-sm text-on-surface-variant">
                    {step.body}
                  </p>
                </>
              );
              // Cards without an href are features that are not built yet.
              return "href" in step && step.href ? (
                <Link key={step.title} href={step.href} className={className}>
                  {body}
                </Link>
              ) : (
                <div key={step.title} className={className}>
                  {body}
                </div>
              );
            })}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
