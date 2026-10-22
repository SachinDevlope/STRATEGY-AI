import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CopyAnswerButton, DeleteStoryButton } from "@/components/StarStoryActions";
import { STAR_STEPS } from "@/lib/content";
import { currentUserId } from "@/lib/session";
import { MAX_SCORE } from "@/lib/star";
import { getStarStory } from "@/lib/star-store";

export const metadata: Metadata = {
  title: "STAR story — Strategy-AI",
};

export const dynamic = "force-dynamic";

// Same tones as the landing page STAR section; Result gets the tertiary tone.
const CIRCLE_TONE = [
  "bg-primary-container text-on-primary-container",
  "bg-primary-container/70 text-on-primary-container",
  "bg-primary-container/45 text-on-primary-container",
  "bg-tertiary text-on-tertiary",
];

const OUTLINE_LINK =
  "border border-outline-variant text-on-surface-variant px-4 py-2 rounded font-label-caps text-label-caps uppercase hover:border-primary-container hover:text-primary-container transition-colors flex items-center gap-2";

export default async function StarStoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await currentUserId();
  if (!userId) redirect("/login");

  const { id } = await params;
  // Scoped to userId, so another user's id just 404s.
  const stored = await getStarStory(userId, id);
  if (!stored) notFound();

  const story = stored.data;
  const parts = [story.situation, story.task, story.action, story.result];
  const band = story.score >= 8 ? "Strong" : story.score >= 5 ? "Solid, needs detail" : "Needs work";
  const builtOn = stored.createdAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <main className="flex-grow pt-[104px] pb-24 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full flex flex-col gap-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-outline-variant/30 pb-8">
        <div className="min-w-0 max-w-full">
          <div className="flex items-center gap-3 mb-2">
            <span aria-hidden="true" className="material-symbols-outlined text-primary-container">
              auto_stories
            </span>
            <p className="font-label-caps text-label-caps text-primary-container uppercase">
              STAR story
            </p>
          </div>
          <h1 className="font-display text-headline-lg-mobile md:text-headline-xl text-on-surface leading-tight mb-2 break-words">
            {story.title}
          </h1>
          <p className="text-on-surface-variant text-body-md break-words">
            &ldquo;{stored.question}&rdquo;
          </p>
          <p className="text-on-surface-variant/70 font-data-tabular text-data-tabular mt-1 break-words">
            {stored.role ? `${stored.role} • ` : ""}Built on {builtOn}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <Link href={`/dashboard/star?from=${id}`} className={OUTLINE_LINK}>
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">edit_note</span>
            Rebuild with more details
          </Link>
          <Link href="/dashboard/star" className={OUTLINE_LINK}>
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">add</span>
            New story
          </Link>
          <DeleteStoryButton storyId={id} />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        {/* Score */}
        <div className="md:col-span-4 glass-panel rounded-xl p-6 flex flex-col items-center justify-center gap-2">
          <h2 className="font-label-caps text-label-caps uppercase text-on-surface-variant w-full text-left mb-4">
            Story strength
          </h2>
          <p
            className="font-display text-[56px] font-bold text-primary-container leading-none"
            aria-label={`${story.score} out of ${MAX_SCORE} — ${band}`}
          >
            {story.score}
            <span className="text-[24px] text-on-surface-variant">/{MAX_SCORE}</span>
          </p>
          <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">{band}</p>
        </div>

        {/* STAR parts */}
        <ol className="md:col-span-8 glass-panel rounded-xl p-6 flex flex-col gap-2">
          {STAR_STEPS.map((step, i) => (
            <li key={step.letter}>
              {i > 0 && <div aria-hidden className="w-0.5 h-4 bg-outline-variant/50 ml-5 mb-2" />}
              <div className="flex items-start gap-4">
                <div
                  aria-hidden
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl shrink-0 ${CIRCLE_TONE[i]}`}
                >
                  {step.letter}
                </div>
                <div className="min-w-0">
                  <h3 className="text-body-md font-bold text-on-surface">{step.title}</h3>
                  <p className="text-body-sm text-on-surface-variant break-words">
                    {parts[i] || "Not covered in your notes yet."}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        {/* Spoken answer */}
        <div className="md:col-span-12 glass-panel rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                Your spoken answer
              </h2>
              <p className="text-body-sm text-on-surface-variant/70">About 60–90 seconds out loud.</p>
            </div>
            <CopyAnswerButton text={story.spokenAnswer} />
          </div>
          <p className="text-body-md text-on-surface whitespace-pre-line break-words">
            {story.spokenAnswer}
          </p>
        </div>

        <ListCard
          className="md:col-span-4"
          icon="rate_review"
          title="Feedback"
          items={story.feedback}
          empty="No feedback for this story."
        />
        <ListCard
          className="md:col-span-4"
          icon="help"
          title="Make it stronger"
          items={story.missingDetails}
          empty="Nothing obvious is missing."
          footer={
            story.missingDetails.length > 0 ? (
              <Link
                href={`/dashboard/star?from=${id}`}
                className="text-body-sm text-primary-container hover:underline"
              >
                Answer these and rebuild →
              </Link>
            ) : null
          }
        />
        <ListCard
          className="md:col-span-4"
          icon="forum"
          title="Likely follow-ups"
          items={story.followUpQuestions}
          empty="No follow-up questions were generated."
        />
      </div>
    </main>
  );
}

function ListCard({
  className,
  icon,
  title,
  items,
  empty,
  footer,
}: {
  className: string;
  icon: string;
  title: string;
  items: string[];
  empty: string;
  footer?: React.ReactNode;
}) {
  return (
    <section className={`${className} glass-panel rounded-xl p-6 flex flex-col gap-4`}>
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="material-symbols-outlined text-primary-container">
          {icon}
        </span>
        <h2 className="font-label-caps text-label-caps uppercase text-on-surface-variant">{title}</h2>
      </div>
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
      {footer}
    </section>
  );
}
