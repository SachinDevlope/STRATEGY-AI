import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import ResumeWizard from "@/components/ResumeWizard";
import { EMPTY_ANSWERS } from "@/lib/resume";
import { getDraft } from "@/lib/resume-store";
import { currentUserId } from "@/lib/session";

export const metadata: Metadata = {
  title: "Build your resume — Strategy-AI",
};

// The draft is per-user and changes as the user types; nothing here is cacheable.
export const dynamic = "force-dynamic";

export default async function NewResumePage() {
  const userId = await currentUserId();
  // middleware.ts already gates /dashboard, but the wizard needs a concrete id
  // to scope the draft, so bail rather than render with none.
  if (!userId) redirect("/login");

  // Resuming happens on the server: the saved step and answers are rendered
  // into the first paint, so a refresh mid-wizard is invisible to the user.
  const draft = await getDraft(userId);

  return (
    <>
      <Navbar />
      <main className="flex-grow pt-[104px]">
        <section className="px-margin-mobile md:px-margin-desktop max-w-3xl mx-auto py-12 md:py-16 flex flex-col gap-10">
          <div className="flex flex-col gap-3">
            <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">
              Build your resume
            </h1>
            <p className="text-body-md text-on-surface-variant">
              Eight questions. Answer them in your own words — rough notes are fine.
              Everything is saved as you go. Paste a job description at the end and the
              resume is tailored to it.
            </p>
          </div>

          <ResumeWizard
            initialAnswers={draft?.answers ?? EMPTY_ANSWERS}
            initialStep={draft?.step ?? 0}
            initialJobDescription={draft?.jobDescription ?? ""}
          />
        </section>
      </main>
      <Footer />
    </>
  );
}
