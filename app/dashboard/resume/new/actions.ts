"use server";

import { auth } from "@/auth";
import { generateStructured } from "@/lib/ai";
import { QUESTIONS, missingRequired, resumeSchema, type Answers } from "@/lib/resume";
import { clearDraft, insertResume, saveDraft } from "@/lib/resume-store";

async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Not signed in.");
  return id;
}

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

export type SaveResult = { ok: true; savedAt: number } | { ok: false; error: string };

/** Called on every step change so a refresh or a closed tab loses nothing. */
export async function saveDraftAction(
  answers: Answers,
  step: number
): Promise<SaveResult> {
  try {
    const userId = await requireUserId();
    await saveDraft(userId, sanitize(answers), Math.max(0, Math.min(step, QUESTIONS.length - 1)));
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

function buildPrompt(answers: Answers): string {
  const sections = QUESTIONS.filter((q) => answers[q.id]).map(
    (q) => `## ${q.title}\n${answers[q.id]}`
  );
  return `Write a one-page resume from these answers.\n\n${sections.join("\n\n")}`;
}

export type GenerateResult = { ok: true; resumeId: string } | { ok: false; error: string };

/**
 * Turns the wizard answers into a validated resume and stores it. The draft is
 * cleared only after the insert succeeds, so a failed generation leaves the
 * user's answers intact.
 */
export async function generateResumeAction(input: Answers): Promise<GenerateResult> {
  try {
    const userId = await requireUserId();
    const answers = sanitize(input);

    const missing = missingRequired(answers);
    if (missing.length) {
      const titles = QUESTIONS.filter((q) => missing.includes(q.id)).map((q) => q.title);
      return { ok: false, error: `Still need: ${titles.join(", ")}` };
    }

    const resume = await generateStructured(resumeSchema, {
      system: SYSTEM_PROMPT,
      prompt: buildPrompt(answers),
    });

    const resumeId = await insertResume(userId, resume);
    await clearDraft(userId);
    return { ok: true, resumeId };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not generate the resume.",
    };
  }
}
