import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import StarBuilder, { type StarBuilderInitial } from "@/components/StarBuilder";
import { currentUserId } from "@/lib/session";
import { getStarStory, listStarStories } from "@/lib/star-store";

export const metadata: Metadata = {
  title: "STAR Story Builder — Strategy-AI",
};

// Per-user data; never cache.
export const dynamic = "force-dynamic";

export default async function StarBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const userId = await currentUserId();
  if (!userId) redirect("/login");

  const { from } = await searchParams;
  const fromId = typeof from === "string" ? from : undefined;

  const [stories, source] = await Promise.all([
    listStarStories(userId, 20),
    // Scoped to userId, so a foreign id just leaves the form empty.
    fromId ? getStarStory(userId, fromId) : Promise.resolve(null),
  ]);

  const initial: StarBuilderInitial | undefined = source
    ? { question: source.question, notes: source.notes, ...(source.role ? { role: source.role } : {}) }
    : undefined;

  return (
    <main className="flex-grow pt-[104px]">
      <section className="px-margin-mobile md:px-margin-desktop max-w-3xl mx-auto py-12 md:py-16 flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary-container/30 bg-primary-container/10 text-primary-fixed font-label-caps text-label-caps uppercase w-fit">
            <span aria-hidden="true" className="material-symbols-outlined text-[14px]">bolt</span>
            Behavioural interviews
          </div>
          <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">
            STAR Story Builder
          </h1>
          <p className="text-body-md text-on-surface-variant">
            STAR Story Builder helps you structure compelling answers using the Situation,
            Task, Action, Result framework. Be prepared for any &quot;Tell me about a time
            when...&quot; question.
          </p>
          {source && (
            <p className="text-body-sm text-primary-container">
              Prefilled from &ldquo;{source.data.title}&rdquo; — add the missing details and
              build again.
            </p>
          )}
        </div>

        {/* Keyed so switching ?from= resets the form state. */}
        <StarBuilder key={fromId ?? "new"} initial={initial} />

        {stories.length > 0 && (
          <div className="flex flex-col gap-4 border-t border-outline-variant/40 pt-8">
            <h2 className="text-body-md font-bold text-on-surface">Your stories</h2>
            <ul className="flex flex-col gap-2">
              {stories.map((story) => (
                <li key={story._id.toHexString()}>
                  <Link
                    href={`/dashboard/star/${story._id.toHexString()}`}
                    className="flex items-center justify-between gap-4 rounded-lg border border-outline-variant/50 p-4 hover:border-primary/50 transition-colors"
                  >
                    <span className="flex flex-col gap-1 min-w-0">
                      <span className="text-body-sm text-on-surface truncate">
                        {story.data.title}
                      </span>
                      <span className="text-body-sm text-on-surface-variant/70 truncate">
                        {story.question} · {story.createdAt.toLocaleDateString()}
                      </span>
                    </span>
                    <span className="text-body-md font-bold text-primary shrink-0">
                      {story.data.score}/10
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}
