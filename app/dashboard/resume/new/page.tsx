import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ResumeWizard from "@/components/ResumeWizard";
import { EMPTY_ANSWERS } from "@/lib/resume";
import { getDraft } from "@/lib/resume-store";
import { currentUserId } from "@/lib/session";

export const metadata: Metadata = {
  title: "Build your resume — Strategy-AI",
};

// Per-user draft; never cache.
export const dynamic = "force-dynamic";

export default async function NewResumePage() {
  const userId = await currentUserId();
  // Middleware guards this too, but we need the id to load the draft.
  if (!userId) redirect("/login");

  // Load the draft on the server so a refresh resumes where the user left off.
  const draft = await getDraft(userId);

  return (
    <>
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
    </>
  );
}
