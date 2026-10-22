import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import InterviewSetupForm, { type SavedJobOption } from "@/components/InterviewSetupForm";
import { listJobDescriptions } from "@/lib/analysis-store";
import { LEVEL_LABELS, TYPE_LABELS } from "@/lib/mock-interview";
import { listInterviews } from "@/lib/mock-interview-store";
import { currentUserId } from "@/lib/session";

export const metadata: Metadata = {
  title: "AI mock interview — Strategy-AI",
};

// Per-user data; never cache.
export const dynamic = "force-dynamic";

export default async function InterviewSetupPage() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");

  const [jobDescriptions, recent] = await Promise.all([
    listJobDescriptions(userId),
    listInterviews(userId, 8),
  ]);

  const options: SavedJobOption[] = jobDescriptions.map((jd) => ({
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
              AI mock interview
            </h1>
            <p className="text-body-md text-on-surface-variant">
              One question at a time, calibrated to your level. Answer by typing
              or out loud — the interviewer follows up when you are vague, then
              hands you a brutal, honest scorecard.
            </p>
          </div>

          <InterviewSetupForm savedJobDescriptions={options} />

          {recent.length > 0 && (
            <div className="flex flex-col gap-4 border-t border-outline-variant/40 pt-8">
              <h2 className="text-body-md font-bold text-on-surface">Recent interviews</h2>
              <ul className="flex flex-col gap-2">
                {recent.map((item) => {
                  const score = item.scorecard?.overallScore;
                  return (
                    <li key={item._id.toHexString()}>
                      <Link
                        href={`/dashboard/interview/${item._id.toHexString()}`}
                        className="flex items-center justify-between gap-4 rounded-lg border border-outline-variant/50 p-4 hover:border-primary/50 transition-colors"
                      >
                        <span className="flex flex-col gap-1 min-w-0">
                          <span className="text-body-sm text-on-surface truncate">
                            {item.setup.role}
                            {item.setup.company ? ` — ${item.setup.company}` : ""}
                          </span>
                          <span className="text-body-sm text-on-surface-variant/70 truncate">
                            {TYPE_LABELS[item.setup.type] ?? item.setup.type} ·{" "}
                            {(LEVEL_LABELS[item.setup.level] ?? item.setup.level).split(" (")[0]} ·{" "}
                            {item.createdAt.toLocaleDateString()}
                          </span>
                        </span>
                        {item.status === "completed" && typeof score === "number" ? (
                          <span className="text-body-md font-bold text-primary shrink-0">
                            {Math.round(score)}/100
                          </span>
                        ) : (
                          <span className="text-body-sm text-on-surface-variant shrink-0 flex items-center gap-1">
                            <span aria-hidden className="material-symbols-outlined text-[18px]">
                              play_circle
                            </span>
                            Resume
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
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
