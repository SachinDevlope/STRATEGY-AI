"use server";

import { generateStructured } from "@/lib/ai";
import {
  MAX_JOB_DESCRIPTION,
  QUESTIONS,
  missingRequired,
  resumeSchema,
  tailoredResumeSchema,
  type Answers,
  type Tailoring,
} from "@/lib/resume";
import { clearDraft, insertResume, saveDraft } from "@/lib/resume-store";
import { requireUserId } from "@/lib/session";

/**
 * Answers arrive as free text from the client, so they are re-read against the
 * known question ids rather than trusted wholesale — an unknown key never
 * reaches the database or the prompt.
 */
function sanitize(input: Answers): Answers {
  const clean: Answers = {};
  for (const { id } of QUESTIONS) {
    const value = input[id];
    if (typeof value === "string" && value.trim()) clean[id] = value.slice(0, 8000);
  }
  return clean;
}

function sanitizeJobDescription(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim().slice(0, MAX_JOB_DESCRIPTION);
}

export type SaveResult = { ok: true; savedAt: number } | { ok: false; error: string };

/** Called on every step change so a refresh or a closed tab loses nothing. */
export async function saveDraftAction(
  answers: Answers,
  step: number,
  jobDescription?: string
): Promise<SaveResult> {
  try {
    const userId = await requireUserId();
    await saveDraft(
      userId,
      sanitize(answers),
      Math.max(0, Math.min(step, QUESTIONS.length - 1)),
      sanitizeJobDescription(jobDescription)
    );
    return { ok: true, savedAt: Date.now() };
  } catch (error) {
    // A failed autosave must not break the wizard — the client keeps its own
    // state and retries on the next step.
    return { ok: false, error: error instanceof Error ? error.message : "Save failed." };
  }
}

const SYSTEM_PROMPT = `You are a resume writer for the Indian and global tech job market.

Rules:
- Use only facts the candidate supplied. Never invent employers, dates, metrics, or degrees.
- If a metric is missing, write the bullet without one rather than estimating.
- Bullets: past-tense verb first, one line each, no pronouns, no "responsible for".
- Keep the total content to one A4 page: at most 4 roles, at most 5 bullets per role.
- Plain ASCII output. No markdown, no emoji, no decorative characters — ATS parsers drop them.
- Rewrite loose notes into professional phrasing, but keep the candidate's own scope and seniority.`;

/**
 * Appended when a job description is supplied. The hard line is between
 * *wording* and *facts*: the JD may dictate which of the candidate's real work
 * leads and what it is called, and may never add work the candidate did not do.
 * A resume that clears the ATS on invented keywords fails the interview instead.
 */
const TAILORING_PROMPT = `${SYSTEM_PROMPT}

Tailoring rules — a specific job description is supplied:
- Mirror the job description's own vocabulary when it names the same thing the candidate did. If the JD says "distributed systems" and the candidate wrote "microservices at scale", use the JD's term.
- Order everything by relevance to this job: the most relevant role's bullets first, the most relevant skill categories first.
- Drop or shorten the candidate's experience that this job does not care about. Cutting is how the page stays one page.
- The headline and summary must read as an answer to this specific job posting.
- Never add a skill, tool, or responsibility that the candidate's answers do not support, no matter how central it is to the job description. A keyword with no backing work goes in "missing", not in the resume.
- matched: JD keywords the candidate's answers genuinely support and that now appear in the resume.
- missing: JD keywords the answers do not support. Be honest here — this list is shown to the candidate as gaps to close, not written into the document.`;

function buildPrompt(answers: Answers, jobDescription: string): string {
  const sections = QUESTIONS.filter((q) => answers[q.id]).map(
    (q) => `## ${q.title}\n${answers[q.id]}`
  );
  const body = `${sections.join("\n\n")}`;

  if (!jobDescription) return `Write a one-page resume from these answers.\n\n${body}`;

  return [
    "Write a one-page resume from these answers, tailored to the job description below.",
    `# Candidate answers\n\n${body}`,
    `# Job description\n\n${jobDescription}`,
  ].join("\n\n");
}

export type GenerateResult =
  | { ok: true; resumeId: string; tailoring: Tailoring | null }
  | { ok: false; error: string };

/**
 * Turns the wizard answers into a validated resume and stores it. The draft is
 * cleared only after the insert succeeds, so a failed generation leaves the
 * user's answers intact.
 *
 * With a job description, one call produces both the resume and the keyword
 * read, so the two cannot disagree about what was actually matched.
 */
export async function generateResumeAction(
  input: Answers,
  jobDescriptionInput?: string
): Promise<GenerateResult> {
  try {
    const userId = await requireUserId();
    const answers = sanitize(input);
    const jobDescription = sanitizeJobDescription(jobDescriptionInput);

    const missing = missingRequired(answers);
    if (missing.length) {
      const titles = QUESTIONS.filter((q) => missing.includes(q.id)).map((q) => q.title);
      return { ok: false, error: `Still need: ${titles.join(", ")}` };
    }

    if (!jobDescription) {
      const resume = await generateStructured(resumeSchema, {
        system: SYSTEM_PROMPT,
        prompt: buildPrompt(answers, ""),
      });
      const resumeId = await insertResume(userId, resume);
      await clearDraft(userId);
      return { ok: true, resumeId, tailoring: null };
    }

    const { resume, tailoring } = await generateStructured(tailoredResumeSchema, {
      system: TAILORING_PROMPT,
      prompt: buildPrompt(answers, jobDescription),
      schemaName: "tailored_resume",
    });

    const resumeId = await insertResume(userId, resume, tailoring);
    await clearDraft(userId);
    return { ok: true, resumeId, tailoring };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not generate the resume.",
    };
  }
}
