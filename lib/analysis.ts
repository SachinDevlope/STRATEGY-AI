import { z } from "zod";

/**
 * The interview report the model must return for one resume against one job
 * description. This is the contract between the Groq call and the results page
 * — every field the page draws is declared here, and nothing else is trusted.
 *
 * Nothing is optional: a constrained decoder fills what it is asked for, and an
 * absent field would only push the "is this missing or empty?" question into
 * the UI.
 */
export const SEVERITIES = ["high", "medium", "low"] as const;
export type Severity = (typeof SEVERITIES)[number];

const questionSchema = z.object({
  question: z.string().describe("The question, phrased the way an interviewer would ask it"),
  intention: z.string().describe("What the interviewer is really testing by asking it"),
  answer: z
    .string()
    .describe("How to answer: the points to cover and the approach to take"),
});

/**
 * How many items each list is asked for. These are prompt and post-check
 * values, deliberately not `.min()` constraints on the schema below: Groq's
 * constrained decoder enforces the *shape* of a JSON schema, not its
 * `minItems`/`minimum` keywords, so a short list came back shaped correctly and
 * then failed Zod, failing the whole request with "invalid schema". Counts are
 * now asked for in the prompt and repaired in a second round instead.
 */
export const MIN_TECHNICAL_QUESTIONS = 6;
export const MIN_BEHAVIOURAL_QUESTIONS = 4;

/**
 * A list of plain strings, tolerant of the one way the model drifts from it:
 * wrapping each line in an object ({ fix: "..." }, { skill: "..." }). The text
 * is all the page draws, so an object is unwrapped rather than thrown away —
 * losing a whole report over the shape of a bullet is the worse trade.
 */
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
    // Whatever the model called the field, the longest string in the object is
    // the sentence; any siblings are labels like "section" or "priority".
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

/** Upload limits. Enforced on the client, in the Blob token, and on the server. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
/** Above this, the client uploads in parallel parts instead of one request. */
export const MULTIPART_THRESHOLD_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_CONTENT_TYPES = ["application/pdf"];

/** A PDF that parses to less than this is almost certainly a scan, not text. */
export const MIN_RESUME_CHARS = 300;
/**
 * Pasted text is held to a lower bar than a PDF: a self-description written in
 * the box is legitimately shorter than a resume, and there is no scan to catch.
 */
export const MIN_PASTED_RESUME_CHARS = 200;
export const MAX_RESUME_CHARS = 30_000;
export const MIN_JD_CHARS = 80;
export const MAX_JD_CHARS = 20_000;

/**
 * Blobs are namespaced per user, so a token issued for one session can never
 * be pointed at another user's prefix. The upload route re-checks this prefix
 * before it signs anything.
 */
export function uploadPrefix(userId: string) {
  return `resume-uploads/${userId}/`;
}

/** Keeps the original name recognisable in the blob store without trusting it. */
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
