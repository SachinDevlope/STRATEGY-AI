import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import ResumeAnalyzer, { type JobDescriptionOption } from "@/components/ResumeAnalyzer";
import { listAnalyses, listJobDescriptions } from "@/lib/analysis-store";
import { currentUserId } from "@/lib/session";

export const metadata: Metadata = {
  title: "Analyse your resume — Strategy-AI",
};

// Per-user data; never cache.
export const dynamic = "force-dynamic";

export default async function AnalyzeResumePage() {
  const userId = await currentUserId();
  // Middleware guards this too, but we need the id for the upload path.
  if (!userId) redirect("/login");

  const [jobDescriptions, recent] = await Promise.all([
    listJobDescriptions(userId),
    listAnalyses(userId, 5),
  ]);

  const options: JobDescriptionOption[] = jobDescriptions.map((jd) => ({
    id: jd._id.toHexString(),
    title: jd.title,
    ...(jd.company ? { company: jd.company } : {}),
    preview: preview(jd.text),
  }));

  return (
    <>
      <main className="flex-grow pt-[104px]">
        <section className="px-margin-mobile md:px-margin-desktop max-w-3xl mx-auto py-12 md:py-16 flex flex-col gap-10">
          <div className="flex flex-col gap-3">
            <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">
              Analyse your resume
            </h1>
            <p className="text-body-md text-on-surface-variant">
              Upload the PDF you actually send out — or just describe yourself —
              pick the job you are chasing, and get a match score, the gaps, the
              questions you will be asked, and a plan to close them.
            </p>
          </div>

          <ResumeAnalyzer userId={userId} savedJobDescriptions={options} />

          {recent.length > 0 && (
            <div className="flex flex-col gap-4 border-t border-outline-variant/40 pt-8">
              <h2 className="text-body-md font-bold text-on-surface">Recent analyses</h2>
              <ul className="flex flex-col gap-2">
                {recent.map((item) => (
                  <li key={item._id.toHexString()}>
                    <Link
                      href={`/dashboard/resume/analyze/${item._id.toHexString()}`}
                      className="flex items-center justify-between gap-4 rounded-lg border border-outline-variant/50 p-4 hover:border-primary/50 transition-colors"
                    >
                      <span className="flex flex-col gap-1 min-w-0">
                        <span className="text-body-sm text-on-surface truncate">
                          {item.jobTitle}
                        </span>
                        <span className="text-body-sm text-on-surface-variant/70 truncate">
                          {item.fileName ?? "Pasted description"} ·{" "}
                          {item.createdAt.toLocaleDateString()}
                        </span>
                      </span>
                      <span className="text-body-md font-bold text-primary shrink-0">
                        {Math.round(item.data.matchScore)}%
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

// First readable line of a JD, with markdown symbols stripped.
function preview(text: string): string {
  return text
    .replace(/[#*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}
