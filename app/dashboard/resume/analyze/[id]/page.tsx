import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { getAnalysis, getJobDescription } from "@/lib/analysis-store";
import type { Analysis, Severity } from "@/lib/analysis";
import { currentUserId } from "@/lib/session";

export const metadata: Metadata = {
  title: "Resume analysis — Strategy-AI",
};

export const dynamic = "force-dynamic";

/** Circumference of the r=54 ring the score arc is drawn on. */
const RING_LENGTH = 339.292;

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await currentUserId();
  if (!userId) redirect("/login");

  const { id } = await params;
  // getAnalysis() filters on userId, so someone else's id is indistinguishable
  // from one that does not exist.
  const stored = await getAnalysis(userId, id);
  if (!stored) notFound();

  // The company name lives on the job description, not on the analysis.
  const job = await getJobDescription(userId, stored.jobDescriptionId.toHexString());

  const report = stored.data;
  const score = Math.round(Math.max(0, Math.min(100, report.matchScore)));
  const analysedOn = stored.createdAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <>
      <Navbar />
      <main className="flex-grow pt-[104px] pb-24 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full flex flex-col gap-8 relative z-10">
        {/* Ambient cyan bloom behind the report. */}
        <div
          aria-hidden
          className="fixed inset-0 pointer-events-none z-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 0%, rgba(0, 240, 255, 0.1) 0%, transparent 70%)",
          }}
        />

        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-2 border-b border-outline-variant/30 pb-8 relative">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-primary-container">
                analytics
              </span>
              <h2 className="font-label-caps text-label-caps text-primary-container uppercase">
                Analysis complete
              </h2>
            </div>
            <h1 className="font-display text-headline-lg-mobile md:text-headline-xl text-on-surface leading-tight mb-2">
              {report.title || stored.jobTitle}
            </h1>
            <p className="text-on-surface-variant font-data-tabular text-data-tabular">
              {job?.company ? `Target role at ${job.company} • ` : "Target role • "}
              Analysed on {analysedOn}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {/* A pasted description has no blob behind it, so there is
                nothing to open. */}
            {stored.resumePathname && (
              <a
                href={`/api/resume/analysis/${id}/file`}
                target="_blank"
                rel="noreferrer"
                className="border border-outline-variant text-on-surface-variant px-4 py-2 rounded font-label-caps text-label-caps uppercase hover:border-primary-container hover:text-primary-container transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">description</span>
                Open resume
              </a>
            )}
            <Link
              href="/dashboard/resume/analyze"
              className="border border-outline-variant text-on-surface-variant px-4 py-2 rounded font-label-caps text-label-caps uppercase hover:border-primary-container hover:text-primary-container transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Analyse another
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter relative">
          {/* Match score ------------------------------------------------ */}
          <div className="md:col-span-4 glass-panel rounded-xl p-6 cyber-glow flex flex-col items-center justify-center relative overflow-hidden">
            <div
              aria-hidden
              className="absolute inset-0 bg-primary-container/5 mix-blend-overlay"
            />
            <h3 className="font-label-caps text-label-caps uppercase text-on-surface-variant w-full text-left mb-6">
              Match score
            </h3>
            <ScoreRing score={score} />
            <p className="text-center text-on-surface-variant text-body-sm mt-6 px-2">
              {report.verdict}
            </p>
          </div>

          {/* Keyword gap ----------------------------------------------- */}
          <div className="md:col-span-8 glass-panel rounded-xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                Keyword gap analysis
              </h3>
              <span className="material-symbols-outlined text-outline">troubleshoot</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-grow">
              <div>
                <h4 className="font-data-tabular text-data-tabular text-on-surface mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-tertiary-fixed-dim">
                    check_circle
                  </span>
                  Verified skills
                </h4>
                {report.matchedSkills.length ? (
                  <ul className="flex flex-col gap-2">
                    {report.matchedSkills.map((item) => (
                      <li
                        key={item.skill}
                        className="px-3 py-2 bg-surface-container border border-surface-container-highest rounded flex flex-col gap-0.5"
                      >
                        <span className="font-data-tabular text-[13px] text-on-surface">
                          {item.skill}
                        </span>
                        <span className="text-[12px] leading-4 text-on-surface-variant/80">
                          {item.evidence}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-body-sm text-on-surface-variant">
                    Nothing in the resume maps cleanly onto this job description yet.
                  </p>
                )}
              </div>

              <div>
                <h4 className="font-data-tabular text-data-tabular text-error mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">warning</span>
                  Missing keywords
                </h4>
                {report.skillGap.length ? (
                  <ul className="flex flex-col gap-3">
                    {report.skillGap.map((gap) => (
                      <li key={gap.skill}>
                        <GapRow severity={gap.severity} skill={gap.skill} why={gap.why} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-body-sm text-on-surface-variant">
                    No gaps found against this job description.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Interview prep -------------------------------------------- */}
          <div className="md:col-span-12 glass-panel rounded-xl p-6 mt-4">
            <div className="flex items-center gap-3 mb-6 border-b border-outline-variant/30 pb-4">
              <span className="material-symbols-outlined text-primary-container">
                smart_toy
              </span>
              <h3 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface">
                AI generated interview prep
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col gap-4">
                <h4 className="font-label-caps text-label-caps uppercase text-primary-container">
                  Technical / gap focused
                </h4>
                <QuestionList questions={report.technicalQuestions} accent="primary" />
              </div>
              <div className="flex flex-col gap-4">
                <h4 className="font-label-caps text-label-caps uppercase text-secondary-fixed">
                  Behavioural / cultural
                </h4>
                <QuestionList
                  questions={report.behavioralQuestions}
                  accent="secondary"
                />
              </div>
            </div>
          </div>

          {/* Action plan ------------------------------------------------ */}
          <div className="md:col-span-12 glass-panel rounded-xl p-6 mt-4 border-l-4 border-primary-container">
            <h3 className="font-label-caps text-label-caps uppercase text-on-surface-variant mb-6">
              Action plan
            </h3>
            <ol className="flex flex-col gap-4">
              {report.preparationPlan.map((day, index) => (
                <li
                  key={day.day}
                  className="flex items-start gap-4 p-4 bg-surface-container-lowest border border-outline-variant/30 rounded"
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-data-tabular text-[12px] shrink-0 mt-0.5 ${
                      index === 0
                        ? "bg-primary-container/20 text-primary-container"
                        : "bg-surface-bright text-on-surface-variant"
                    }`}
                  >
                    {day.day}
                  </span>
                  <div className="flex flex-col gap-2">
                    <h4 className="font-data-tabular text-[15px] text-on-surface">
                      {day.focus}
                    </h4>
                    {day.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {day.skills.map((skill) => (
                          <span
                            key={skill}
                            className="font-label-caps text-[10px] uppercase text-primary-container bg-primary-container/10 px-2 py-1 rounded"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                    <ul className="flex flex-col gap-1.5 list-disc pl-4">
                      {day.tasks.map((task) => (
                        <li key={task} className="text-on-surface-variant text-body-sm">
                          {task}
                        </li>
                      ))}
                    </ul>
                    <p className="text-body-sm text-on-surface">
                      <span className="text-primary-container">By the end: </span>
                      {day.outcome}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Resume fixes ----------------------------------------------- */}
          {report.resumeFixes.length > 0 && (
            <div className="md:col-span-12 glass-panel rounded-xl p-6 mt-4">
              <div className="flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined text-primary-container">
                  edit_document
                </span>
                <h3 className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                  Fix these on the resume itself
                </h3>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {report.resumeFixes.map((fix) => (
                  <li
                    key={fix}
                    className="flex items-start gap-3 p-3 bg-surface-container-low border border-outline-variant/30 rounded text-body-sm text-on-surface-variant"
                  >
                    <span className="material-symbols-outlined text-[16px] text-tertiary-fixed-dim mt-0.5">
                      arrow_right_alt
                    </span>
                    {fix}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function ScoreRing({ score }: { score: number }) {
  const offset = RING_LENGTH - (RING_LENGTH * score) / 100;
  // Same three bands the copy under the ring reads from.
  const band = score >= 75 ? "High match" : score >= 50 ? "Partial match" : "Low match";

  return (
    <div
      className="relative w-48 h-48 flex items-center justify-center"
      role="img"
      aria-label={`${score}% match — ${band}`}
    >
      <svg className="w-full h-full" viewBox="0 0 120 120" aria-hidden>
        <circle
          className="text-surface-container-high stroke-current"
          cx="60"
          cy="60"
          r="54"
          fill="transparent"
          strokeWidth="8"
        />
        <circle
          className="text-primary-container stroke-current progress-ring__circle"
          cx="60"
          cy="60"
          r="54"
          fill="transparent"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={RING_LENGTH}
          // The keyframe animates to this value, so it is passed as a
          // custom property rather than set directly.
          style={
            {
              "--ring-offset": String(offset),
              strokeDashoffset: offset,
            } as React.CSSProperties
          }
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="font-display text-[48px] font-bold text-primary-container leading-none">
          {score}
          <span className="text-[24px]">%</span>
        </span>
        <span className="font-label-caps text-label-caps uppercase text-on-surface-variant mt-1">
          {band}
        </span>
      </div>
    </div>
  );
}

function GapRow({
  severity,
  skill,
  why,
}: {
  severity: Severity;
  skill: string;
  why: string;
}) {
  // Only a high-severity gap is worth an alarm colour; colouring all three
  // would leave nothing standing out.
  const high = severity === "high";
  return (
    <div
      className={`flex flex-col gap-1 p-2 rounded border ${
        high
          ? "bg-error-container/10 border-error/20"
          : "bg-surface-container border-surface-container-highest"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`font-data-tabular text-[13px] ${
            high ? "text-error" : "text-on-surface-variant"
          }`}
        >
          {skill}
        </span>
        <span
          className={`font-label-caps text-[10px] uppercase px-2 py-0.5 rounded shrink-0 ${
            high ? "bg-error/20 text-error" : "bg-surface-bright text-on-surface-variant"
          }`}
        >
          {severity === "high" ? "High priority" : severity}
        </span>
      </div>
      <p className="text-[12px] leading-4 text-on-surface-variant/80">{why}</p>
    </div>
  );
}

function QuestionList({
  questions,
  accent,
}: {
  questions: Analysis["technicalQuestions"];
  accent: "primary" | "secondary";
}) {
  const bar = accent === "primary" ? "bg-primary-container" : "bg-secondary-fixed";
  const label = accent === "primary" ? "text-primary-container" : "text-secondary-fixed";
  return (
    <ol className="flex flex-col gap-4">
      {questions.map((item) => (
        <li
          key={item.question}
          className="group border border-outline-variant/30 bg-surface-container-low hover:bg-surface-container transition-colors rounded-lg p-4 relative overflow-hidden"
        >
          <div
            aria-hidden
            className={`absolute left-0 top-0 bottom-0 w-1 opacity-0 group-hover:opacity-100 transition-opacity ${bar}`}
          />
          <p className="text-[15px] leading-6 text-on-surface mb-2">
            &ldquo;{item.question}&rdquo;
          </p>
          <p className="text-body-sm text-on-surface-variant mb-3">
            <span className={`font-label-caps text-[10px] uppercase ${label}`}>
              What they test:{" "}
            </span>
            {item.intention}
          </p>
          <p className="text-body-sm text-on-surface-variant/80 border-t border-outline-variant/30 pt-3">
            <span className={`font-label-caps text-[10px] uppercase ${label}`}>
              How to answer:{" "}
            </span>
            {item.answer}
          </p>
        </li>
      ))}
    </ol>
  );
}
