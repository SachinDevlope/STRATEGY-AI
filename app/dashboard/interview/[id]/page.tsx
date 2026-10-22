import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import MockInterview from "@/components/MockInterview";
import { LEVEL_LABELS, TYPE_LABELS, type Scorecard } from "@/lib/mock-interview";
import { getInterview, type StoredInterview } from "@/lib/mock-interview-store";
import { currentUserId } from "@/lib/session";

export const metadata: Metadata = {
  title: "Mock interview — Strategy-AI",
};

export const dynamic = "force-dynamic";

// Circumference of the r=54 score ring.
const RING_LENGTH = 339.292;

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await currentUserId();
  if (!userId) redirect("/login");

  const { id } = await params;
  // Scoped to userId, so another user's id just 404s.
  const interview = await getInterview(userId, id);
  if (!interview) notFound();

  if (interview.status === "completed" && interview.scorecard) {
    return <ScorecardView interview={interview} scorecard={interview.scorecard} />;
  }

  return (
    <>
      <main className="flex-grow pt-[104px]">
        <section className="px-margin-mobile md:px-margin-desktop max-w-3xl mx-auto py-12 md:py-16">
          <MockInterview
            interviewId={id}
            role={
              interview.setup.company
                ? `${interview.setup.role} — ${interview.setup.company}`
                : interview.setup.role
            }
            questionCount={interview.setup.questionCount}
            initialMessages={interview.messages.map((m) => ({
              role: m.role,
              content: m.content,
              ...(m.kind ? { kind: m.kind } : {}),
            }))}
          />
        </section>
      </main>
    </>
  );
}

function ScorecardView({
  interview,
  scorecard,
}: {
  interview: StoredInterview;
  scorecard: Scorecard;
}) {
  const { setup } = interview;
  const score = Math.round(Math.max(0, Math.min(100, scorecard.overallScore)));
  const takenOn = interview.createdAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <>
      <main className="flex-grow pt-[104px] pb-24 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full flex flex-col gap-8 relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-outline-variant/30 pb-8">
          <div className="min-w-0 max-w-full">
            <div className="flex items-center gap-3 mb-2">
              <span aria-hidden="true" className="material-symbols-outlined text-primary-container">
                grading
              </span>
              <p className="font-label-caps text-label-caps text-primary-container uppercase">
                Interview scorecard
              </p>
            </div>
            <h1 className="font-display text-headline-lg-mobile md:text-headline-xl text-on-surface leading-tight mb-2 break-words">
              {setup.role}
            </h1>
            <p className="text-on-surface-variant font-data-tabular text-data-tabular break-words">
              {setup.company ? `${setup.company} • ` : ""}
              {TYPE_LABELS[setup.type]} • {LEVEL_LABELS[setup.level].split(" (")[0]} • {takenOn}
            </p>
          </div>
          <Link
            href="/dashboard/interview"
            className="bg-primary text-on-primary px-5 py-3 rounded-lg font-semibold text-body-md hover:bg-primary-fixed transition-colors flex items-center gap-2"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              add
            </span>
            Start another interview
          </Link>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
          <div className="md:col-span-4 glass-panel rounded-xl p-6 flex flex-col items-center justify-center">
            <h2 className="font-label-caps text-label-caps uppercase text-on-surface-variant w-full text-left mb-6">
              Overall score
            </h2>
            <ScoreRing score={score} />
            <p className="text-center text-on-surface-variant text-body-sm mt-6 px-2">
              {scorecard.verdict}
            </p>
          </div>

          <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-gutter">
            <ListCard
              title="What worked"
              icon="check_circle"
              iconClass="text-tertiary-fixed-dim"
              items={scorecard.strengths}
              empty="Nothing stood out yet — the answers need more substance."
            />
            <ListCard
              title="Fix before the real thing"
              icon="warning"
              iconClass="text-error"
              items={scorecard.improvements}
              empty="No improvements listed."
            />
          </div>

          <div className="md:col-span-12 flex flex-col gap-4 mt-4">
            <h2 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface">
              Question by question
            </h2>
            {scorecard.questions.length ? (
              <ol className="flex flex-col gap-4">
                {scorecard.questions.map((item, index) => (
                  <li
                    key={`${index}-${item.question}`}
                    className="glass-panel rounded-xl p-5 md:p-6 flex flex-col gap-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-[15px] leading-6 text-on-surface min-w-0 break-words">
                        <span className="font-label-caps text-label-caps uppercase text-primary-container block mb-1">
                          Question {index + 1}
                        </span>
                        &ldquo;{item.question}&rdquo;
                      </p>
                      <span
                        className={`shrink-0 font-display text-[28px] font-bold leading-none ${scoreColour(item.score)}`}
                        aria-label={`Score ${item.score} out of 10`}
                      >
                        {item.score}
                        <span className="text-[14px] text-on-surface-variant">/10</span>
                      </span>
                    </div>
                    <Detail label="What you said" text={item.answerSummary} />
                    <Detail label="Feedback" text={item.feedback} />
                    <div className="rounded-lg bg-surface-container-lowest border border-outline-variant/30 p-4">
                      <Detail label="A stronger answer" text={item.strongerAnswer} />
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-body-sm text-on-surface-variant">
                No per-question breakdown was generated for this interview.
              </p>
            )}
          </div>

          <details className="md:col-span-12 glass-panel rounded-xl p-5 md:p-6 mt-4 group">
            <summary className="cursor-pointer font-label-caps text-label-caps uppercase text-on-surface-variant flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] group-open:rotate-90 transition-transform">
                chevron_right
              </span>
              Full transcript
            </summary>
            <ol className="flex flex-col gap-3 mt-4">
              {interview.messages.map((m, index) => (
                <li key={index} className="text-body-sm">
                  <span
                    className={`font-label-caps text-[10px] uppercase ${
                      m.role === "interviewer" ? "text-primary-container" : "text-on-surface-variant"
                    }`}
                  >
                    {m.role === "interviewer" ? "Interviewer" : "You"}
                  </span>
                  <p className="text-on-surface whitespace-pre-wrap break-words">{m.content}</p>
                </li>
              ))}
            </ol>
          </details>
        </div>
      </main>
    </>
  );
}

function scoreColour(score: number): string {
  if (score >= 8) return "text-primary-container";
  if (score >= 5) return "text-on-surface";
  return "text-error";
}

function Detail({ label, text }: { label: string; text: string }) {
  return (
    <p className="text-body-sm text-on-surface-variant break-words">
      <span className="font-label-caps text-[10px] uppercase text-primary-container block mb-1">
        {label}
      </span>
      {text}
    </p>
  );
}

function ListCard({
  title,
  icon,
  iconClass,
  items,
  empty,
}: {
  title: string;
  icon: string;
  iconClass: string;
  items: string[];
  empty: string;
}) {
  return (
    <div className="glass-panel rounded-xl p-6 flex flex-col gap-4">
      <h2 className="font-label-caps text-label-caps uppercase text-on-surface-variant flex items-center gap-2">
        <span aria-hidden="true" className={`material-symbols-outlined text-[18px] ${iconClass}`}>
          {icon}
        </span>
        {title}
      </h2>
      {items.length ? (
        <ul className="flex flex-col gap-2">
          {items.map((item, i) => (
            <li
              key={`${i}-${item}`}
              className="p-3 bg-surface-container-low border border-outline-variant/30 rounded text-body-sm text-on-surface-variant break-words"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-body-sm text-on-surface-variant">{empty}</p>
      )}
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const offset = RING_LENGTH - (RING_LENGTH * score) / 100;
  const band = score >= 75 ? "Strong" : score >= 50 ? "Borderline" : "Not ready";

  return (
    <div
      className="relative w-48 h-48 flex items-center justify-center"
      role="img"
      aria-label={`${score} out of 100 — ${band}`}
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
          // Passed as a CSS variable because the keyframe animates to it.
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
        </span>
        <span className="font-label-caps text-label-caps uppercase text-on-surface-variant mt-1">
          {band}
        </span>
      </div>
    </div>
  );
}
