import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listAnalyses } from "@/lib/analysis-store";
import { listInterviews } from "@/lib/mock-interview-store";
import { listResumes } from "@/lib/resume-store";
import { currentUserId } from "@/lib/session";
import { listStarStories } from "@/lib/star-store";

export const metadata: Metadata = {
  title: "Dashboard — Strategy-AI",
};

// Per-user data; never cache.
export const dynamic = "force-dynamic";

const TOOLS = [
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
    body: "Answer by voice or text, get follow-ups and a scorecard on your answers.",
    href: "/dashboard/interview",
  },
  {
    icon: "auto_awesome",
    title: "Build a STAR story",
    body: "Turn rough notes into a structured answer for behavioural questions.",
    href: "/dashboard/star",
  },
];

type RecentItem = { key: string; href: string; title: string; meta: string; badge?: string; download?: string };

export default async function DashboardPage() {
  // Middleware only checks the JWT; this also catches a revoked password session.
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  const [resumes, analyses, interviews, stories] = await Promise.all([
    listResumes(userId, 5),
    listAnalyses(userId, 5),
    listInterviews(userId, 5),
    listStarStories(userId, 5),
  ]);

  const sections: { title: string; empty: string; items: RecentItem[] }[] = [
    {
      title: "Your resumes",
      empty: "No resumes yet.",
      items: resumes.map((r) => ({
        key: r._id.toHexString(),
        href: `/api/resume/${r._id.toHexString()}/pdf`,
        download: `/api/resume/${r._id.toHexString()}/pdf?download=1`,
        title: r.data.headline || r.data.contact.fullName,
        meta: `${r.tailoring ? "Tailored" : "General"} · ${date(r.createdAt)}`,
      })),
    },
    {
      title: "Resume analyses",
      empty: "No analyses yet.",
      items: analyses.map((a) => ({
        key: a._id.toHexString(),
        href: `/dashboard/resume/analyze/${a._id.toHexString()}`,
        title: a.jobTitle,
        meta: date(a.createdAt),
        badge: `${Math.round(a.data.matchScore)}%`,
      })),
    },
    {
      title: "Mock interviews",
      empty: "No interviews yet.",
      items: interviews.map((i) => ({
        key: i._id.toHexString(),
        href: `/dashboard/interview/${i._id.toHexString()}`,
        title: i.setup.company ? `${i.setup.role} — ${i.setup.company}` : i.setup.role,
        meta: `${i.status === "completed" ? "Completed" : "In progress"} · ${date(i.createdAt)}`,
        ...(i.status === "completed" && i.scorecard
          ? { badge: `${Math.round(i.scorecard.overallScore)}` }
          : {}),
      })),
    },
    {
      title: "STAR stories",
      empty: "No stories yet.",
      items: stories.map((s) => ({
        key: s._id.toHexString(),
        href: `/dashboard/star/${s._id.toHexString()}`,
        title: s.data.title,
        meta: date(s.createdAt),
        badge: `${s.data.score}/10`,
      })),
    },
  ];

  return (
    <>
      <main className="flex-grow pt-[104px]">
        <section className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto py-12 md:py-20 flex flex-col gap-12">
          <div className="flex flex-col gap-3">
            <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">
              Welcome, {firstName}.
            </h1>
            <p className="text-body-md text-on-surface-variant">
              Signed in as <span className="break-all">{session?.user?.email}</span>. Pick where to start.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TOOLS.map((tool) => (
              <Link
                key={tool.title}
                href={tool.href}
                className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl p-6 flex flex-col gap-4 hover:border-primary/50 transition-colors"
              >
                <div className="w-11 h-11 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                  <span aria-hidden className="material-symbols-outlined">{tool.icon}</span>
                </div>
                <h2 className="text-body-md font-bold text-on-surface">{tool.title}</h2>
                <p className="text-body-sm text-on-surface-variant">{tool.body}</p>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sections.map((section) => (
              <div
                key={section.title}
                className="rounded-xl border border-outline-variant/50 p-5 flex flex-col gap-3 min-w-0"
              >
                <h2 className="text-body-md font-bold text-on-surface">{section.title}</h2>
                {section.items.length ? (
                  <ul className="flex flex-col gap-2">
                    {section.items.map((item) => (
                      <li key={item.key} className="flex items-center gap-2 min-w-0">
                        <Link
                          href={item.href}
                          {...(item.download ? { target: "_blank", rel: "noreferrer" } : {})}
                          className="flex-1 min-w-0 flex items-center justify-between gap-3 rounded-lg border border-outline-variant/40 px-4 py-3 hover:border-primary/50 transition-colors"
                        >
                          <span className="flex flex-col min-w-0">
                            <span className="text-body-sm text-on-surface truncate">{item.title}</span>
                            <span className="text-body-sm text-on-surface-variant/70 truncate">{item.meta}</span>
                          </span>
                          {item.badge && (
                            <span className="text-body-md font-bold text-primary shrink-0">{item.badge}</span>
                          )}
                        </Link>
                        {item.download && (
                          <a
                            href={item.download}
                            aria-label={`Download ${item.title}`}
                            className="shrink-0 w-11 h-11 flex items-center justify-center rounded-lg border border-outline-variant/40 text-on-surface-variant hover:border-primary/50 hover:text-primary transition-colors"
                          >
                            <span aria-hidden className="material-symbols-outlined text-[20px]">download</span>
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-body-sm text-on-surface-variant/70">{section.empty}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function date(value: Date) {
  return value.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
