import { z } from "zod";

// Shape of the AI interview report. All fields are required so the UI never
// has to guess "missing or empty?".
export const SEVERITIES = ["high", "medium", "low"] as const;
export type Severity = (typeof SEVERITIES)[number];

const questionSchema = z.object({
  question: z.string().describe("The question, phrased the way an interviewer would ask it"),
  intention: z.string().describe("What the interviewer is really testing by asking it"),
  answer: z
    .string()
    .describe("How to answer: the points to cover and the approach to take"),
});

// Minimum question counts. Not schema `.min()` rules: Groq ignores minItems, so
// short lists would fail Zod. We ask in the prompt and repair afterwards.
export const MIN_TECHNICAL_QUESTIONS = 6;
export const MIN_BEHAVIOURAL_QUESTIONS = 4;

// String list that also accepts { fix: "..." }-style objects from the model,
// unwrapping them instead of failing the whole report.
function stringList(description: string) {
  return z.preprocess(
    (value) =>
      Array.isArray(value)
        ? value.map(unwrapString).filter((line) => line.length > 0)
        : value,
    z.array(z.string())
  ).describe(description);
}

function unwrapString(item: unknown): string {
  if (typeof item === "string") return item.trim();
  if (item && typeof item === "object") {
    // The longest string is the sentence; shorter ones are labels.
    const text = Object.values(item as Record<string, unknown>)
      .filter((value): value is string => typeof value === "string")
      .sort((a, b) => b.length - a.length)[0];
    return text?.trim() ?? "";
  }
  return "";
}

export const analysisSchema = z.object({
  title: z.string().describe("The job title this report is for"),
  matchScore: z
    .number()
    .describe(
      "How well the candidate matches the job description, as a whole number " +
        "from 0 to 100 — never a fraction of 1. Score on evidence in the resume " +
        "only, never on assumed experience."
    ),
  verdict: z
    .string()
    .describe(
      "One sentence on whether this candidate clears a first screen for this " +
        "role, and the single biggest reason why or why not."
    ),
  matchedSkills: z
    .array(
      z.object({
        skill: z.string().describe("A requirement from the job description"),
        evidence: z
          .string()
          .describe("The line or role in the resume that backs it up"),
      })
    )
    .describe("Requirements the resume already demonstrates. Empty if none do."),
  skillGap: z
    .array(
      z.object({
        skill: z.string().describe("The skill the candidate is lacking"),
        severity: z
          .enum(SEVERITIES)
          .describe("How load-bearing this is for the role as written"),
        why: z
          .string()
          .describe("Why the role needs it and what the resume shows instead"),
      })
    )
    .describe("Every requirement with no support in the resume, worst first."),
  technicalQuestions: z
    .array(questionSchema)
    .describe(
      "6-8 technical questions this candidate would actually be asked, drawn " +
        "from their own resume and this job description."
    ),
  behavioralQuestions: z
    .array(questionSchema)
    .describe("4-6 behavioural questions anchored to the candidate's own history."),
  preparationPlan: z
    .array(
      z.object({
        day: z.number().describe("Day number, starting at 1"),
        focus: z.string().describe("What this day is for, in a few words"),
        skills: stringList(
          "The skills from skillGap this day closes, spelled exactly as they " +
            "appear there"
        ),
        tasks: stringList(
          "Concrete tasks doable in one day: what to build, read, practise or " +
            "rehearse. Never vague advice such as 'revise concepts'."
        ),
        outcome: z
          .string()
          .describe("What the candidate can demonstrate in the interview afterwards"),
      })
    )
    .describe("A day-wise plan derived from skillGap. Highest severity first."),
  resumeFixes: stringList(
    "Specific edits to the resume itself that would raise the score. Each entry " +
      "is one plain sentence, never an object."
  ),
});

export type Analysis = z.infer<typeof analysisSchema>;

// Enforced on the client, in the Blob token, and on the server.
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
// Above this, upload in parallel parts.
export const MULTIPART_THRESHOLD_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_CONTENT_TYPES = ["application/pdf"];

// Less text than this usually means a scanned PDF.
export const MIN_RESUME_CHARS = 300;
// Lower bar for pasted text: it can be shorter and can't be a scan.
export const MIN_PASTED_RESUME_CHARS = 200;
export const MAX_RESUME_CHARS = 30_000;
export const MIN_JD_CHARS = 80;
export const MAX_JD_CHARS = 20_000;

// Per-user blob folder, so one user's token can't touch another's files.
export function uploadPrefix(userId: string) {
  return `resume-uploads/${userId}/`;
}

// Sanitised file name; never trust the user's original.
export function safeFileName(name: string) {
  const base = name.replace(/\.pdf$/i, "").slice(0, 60);
  const slug = base.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug || "resume"}.pdf`;
}

export function validatePdfFile(file: { name: string; type: string; size: number }) {
  if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
    return "That is not a PDF. Export your resume as a PDF and try again.";
  }
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_UPLOAD_BYTES) {
    return `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${
      MAX_UPLOAD_BYTES / 1024 / 1024
    } MB.`;
  }
  return null;
}
