import { z } from "zod";

/**
 * The structured resume the model must return. This is the contract between
 * generateObject() and the PDF renderer — every field the template draws is
 * declared here, and nothing else is trusted.
 *
 * Dates are free-text strings ("Jan 2023", "Present") rather than real dates:
 * resumes print them verbatim and users rarely supply a parseable format.
 */
export const resumeSchema = z.object({
  contact: z.object({
    fullName: z.string(),
    email: z.string(),
    phone: z.string().optional(),
    location: z.string().optional(),
    links: z
      .array(
        z.object({
          label: z.string().describe('Short name, e.g. "LinkedIn", "GitHub"'),
          url: z.string(),
        })
      )
      .describe("Portfolio, LinkedIn, GitHub. Omit anything not supplied."),
  }),
  headline: z
    .string()
    .describe('Target role as a title, e.g. "Backend Engineer — Distributed Systems"'),
  summary: z
    .string()
    .describe("2-3 sentences. No first person, no filler adjectives."),
  experience: z.array(
    z.object({
      company: z.string(),
      role: z.string(),
      location: z.string().optional(),
      startDate: z.string(),
      endDate: z.string().describe('"Present" if this is the current job'),
      bullets: z
        .array(z.string())
        .describe(
          "3-5 bullets. Each starts with a past-tense verb and carries a " +
            "concrete number where the user supplied one. Never invent metrics."
        ),
    })
  ),
  education: z.array(
    z.object({
      institution: z.string(),
      degree: z.string(),
      field: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      detail: z.string().optional().describe("GPA, honours, or coursework"),
    })
  ),
  skills: z
    .array(
      z.object({
        category: z.string().describe('e.g. "Languages", "Cloud & Infra"'),
        items: z.array(z.string()),
      })
    )
    .describe("3-5 categories. ATS parsers read these as plain keywords."),
  projects: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        link: z.string().optional(),
      })
    )
    .describe("Empty array if the user mentioned none."),
  certifications: z.array(z.string()).describe("Empty array if none."),
});

export type Resume = z.infer<typeof resumeSchema>;

/**
 * The eight wizard questions, in order. `id` is the answer key persisted in the
 * draft, so renaming one orphans existing drafts — add a new id instead.
 */
export const QUESTIONS = [
  {
    id: "contact",
    title: "Who are you?",
    hint: "Name, email, phone, city, and any links (LinkedIn, GitHub, portfolio).",
    placeholder:
      "Aditi Sharma\naditi@example.com · +91 98765 43210 · Bengaluru\nlinkedin.com/in/aditisharma · github.com/aditisharma",
    rows: 5,
  },
  {
    id: "target",
    title: "What role are you targeting?",
    hint: "The title you want next, plus the kind of company. Drives the whole document.",
    placeholder: "Senior Backend Engineer at a product startup, ideally fintech or infra.",
    rows: 3,
  },
  {
    id: "experience",
    title: "Where have you worked?",
    hint: "One job per line: company, title, dates, and what you owned. Newest first.",
    placeholder:
      "Razorpay — Backend Engineer, Jun 2022–Present. Owned the payouts service.\nZoho — SDE Intern, Jan 2022–May 2022. Internal admin tooling.",
    rows: 7,
  },
  {
    id: "impact",
    title: "What did you actually move?",
    hint: "Numbers beat adjectives — latency, revenue, users, cost, team size. Anything you remember.",
    placeholder:
      "Cut p99 payout latency 820ms → 210ms.\nMigrated 40M rows with zero downtime.\nMentored 3 interns, 2 converted to full-time.",
    rows: 6,
  },
  {
    id: "education",
    title: "What did you study?",
    hint: "Institution, degree, years. Add GPA or honours only if they help you.",
    placeholder: "NIT Trichy — B.Tech Computer Science, 2018–2022. CGPA 8.7.",
    rows: 4,
  },
  {
    id: "skills",
    title: "What do you work with?",
    hint: "Languages, frameworks, databases, cloud, tools. Dump everything — grouping happens for you.",
    placeholder:
      "Go, TypeScript, Python, PostgreSQL, Redis, Kafka, Docker, Kubernetes, AWS, Terraform, Grafana",
    rows: 4,
  },
  {
    id: "projects",
    title: "Any projects or certifications?",
    hint: "Side projects, open source, published work, certificates. Skip if none.",
    placeholder:
      "ratelimit-go — token bucket library, 900 stars on GitHub.\nAWS Certified Solutions Architect, 2024.",
    rows: 5,
  },
  {
    id: "extras",
    title: "Anything else the resume should carry?",
    hint: "Awards, publications, languages, volunteering, visa status, career gaps you want framed.",
    placeholder:
      "Speaker at IndiaFOSS 2024.\nSix-month gap in 2023 — full-time caregiving, now resolved.",
    rows: 5,
  },
] as const;

export type QuestionId = (typeof QUESTIONS)[number]["id"];

/** Wizard answers keyed by question id. Every step is free text. */
export type Answers = Partial<Record<QuestionId, string>>;

export const EMPTY_ANSWERS: Answers = {};

/**
 * Only the target role and work history are load-bearing; the model can produce
 * a usable document without the optional sections.
 */
export const REQUIRED_QUESTIONS: QuestionId[] = ["contact", "target", "experience"];

export function missingRequired(answers: Answers): QuestionId[] {
  return REQUIRED_QUESTIONS.filter((id) => !answers[id]?.trim());
}
