import { z } from "zod";

// Client-safe: no AI or DB imports here, so StarBuilder can share the limits.

export const STAR_QUESTION_PRESETS = [
  "Tell me about a time you handled a conflict with a colleague.",
  "Tell me about a time you failed.",
  "Tell me about a time you worked under a tight deadline.",
  "Tell me about a time you led without formal authority.",
  "Tell me about a time you disagreed with your manager.",
  "What is the achievement you are proudest of?",
  "Tell me about a time you had to learn something fast.",
  "Tell me about a time you made a mistake.",
] as const;

export const MIN_QUESTION_CHARS = 10;
export const MAX_QUESTION_CHARS = 300;
export const MIN_NOTES_CHARS = 80;
export const MAX_NOTES_CHARS = 6000;
export const MAX_ROLE_CHARS = 120;

export const MIN_SCORE = 1;
export const MAX_SCORE = 10;

// Same tolerant list as lib/analysis.ts: unwraps { text: "..." } objects.
function stringList(description: string) {
  return z
    .preprocess(
      (value) =>
        Array.isArray(value)
          ? value.map(unwrapString).filter((line) => line.length > 0)
          : value,
      z.array(z.string())
    )
    .describe(description);
}

function unwrapString(item: unknown): string {
  if (typeof item === "string") return item.trim();
  if (item && typeof item === "object") {
    const text = Object.values(item as Record<string, unknown>)
      .filter((value): value is string => typeof value === "string")
      .sort((a, b) => b.length - a.length)[0];
    return text?.trim() ?? "";
  }
  return "";
}

export const starStorySchema = z.object({
  title: z
    .string()
    .describe("A short label for this story, 3-8 words, e.g. 'Rescuing the Q3 billing migration'"),
  situation: z
    .string()
    .describe("Situation: 1-4 sentences, first person, past tense, only facts from the notes"),
  task: z
    .string()
    .describe("Task: 1-4 sentences on what the candidate was responsible for"),
  action: z
    .string()
    .describe("Action: 1-4 sentences on the specific steps the candidate personally took"),
  result: z
    .string()
    .describe(
      "Result: 1-4 sentences on the outcome. Only outcomes stated in the notes; " +
        "if none are given, say what is known and flag it in missingDetails"
    ),
  spokenAnswer: z
    .string()
    .describe(
      "A natural, conversational answer script the candidate could say aloud in " +
        "60-90 seconds (roughly 150-230 words), first person"
    ),
  score: z
    .number()
    .describe("How strong the story is as an interview answer, a whole number from 1 to 10"),
  feedback: stringList(
    "Specific, actionable feedback on this story. Each entry is one plain sentence."
  ),
  missingDetails: stringList(
    "Questions the candidate should answer to make the story stronger, e.g. " +
      "'What was the measurable outcome?'. Each entry is one question."
  ),
  followUpQuestions: stringList(
    "Follow-up questions an interviewer would likely probe with next."
  ),
});

export type StarStory = z.infer<typeof starStorySchema>;

export type StarInput = { question: string; notes: string; role?: string };

/** Trims and checks user input. Returns the cleaned input or a user-facing error. */
export function validateStarInput(
  input: Partial<StarInput>
): { ok: true; value: StarInput } | { ok: false; error: string } {
  const question = String(input.question ?? "").trim();
  const notes = String(input.notes ?? "").trim();
  const role = String(input.role ?? "").trim();

  if (question.length < MIN_QUESTION_CHARS) {
    return { ok: false, error: "Pick a question or type the one you want to practise." };
  }
  if (question.length > MAX_QUESTION_CHARS) {
    return { ok: false, error: `Keep the question under ${MAX_QUESTION_CHARS} characters.` };
  }
  if (notes.length < MIN_NOTES_CHARS) {
    return {
      ok: false,
      error: `Write at least ${MIN_NOTES_CHARS} characters of notes — what happened, what you did, and how it ended.`,
    };
  }
  if (notes.length > MAX_NOTES_CHARS) {
    return { ok: false, error: `Keep your notes under ${MAX_NOTES_CHARS} characters.` };
  }
  if (role.length > MAX_ROLE_CHARS) {
    return { ok: false, error: `Keep the role under ${MAX_ROLE_CHARS} characters.` };
  }

  return { ok: true, value: { question, notes, ...(role ? { role } : {}) } };
}

/** Rounds and clamps to 1-10; non-numbers fall back to the lowest score. */
export function clampScore(score: unknown): number {
  const value = typeof score === "number" ? score : Number(score);
  if (!Number.isFinite(value)) return MIN_SCORE;
  return Math.min(MAX_SCORE, Math.max(MIN_SCORE, Math.round(value)));
}

const MAX_LIST_ITEMS = 8;

function cleanList(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const text = item.trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= MAX_LIST_ITEMS) break;
  }
  return out;
}

/** Clamps the score, trims text, de-duplicates and caps the lists. */
export function normalizeStarStory(story: StarStory): StarStory {
  return {
    title: story.title.trim().slice(0, 120) || "Untitled story",
    situation: story.situation.trim(),
    task: story.task.trim(),
    action: story.action.trim(),
    result: story.result.trim(),
    spokenAnswer: story.spokenAnswer.trim(),
    score: clampScore(story.score),
    feedback: cleanList(story.feedback),
    missingDetails: cleanList(story.missingDetails),
    followUpQuestions: cleanList(story.followUpQuestions),
  };
}

export const STAR_SYSTEM_PROMPT = `You are an interview coach who turns a candidate's rough notes into a STAR answer (Situation, Task, Action, Result) for a behavioural interview question.

Rules:
- Use ONLY facts from the candidate's notes. Never invent numbers, percentages, names, companies, team sizes, dates, tools or outcomes.
- If a STAR part is thin or missing in the notes, write what is known (it may be short) and add a question to missingDetails asking for exactly what is missing.
- situation, task, action and result: 1-4 sentences each, first person ("I"), past tense. Action is about what the candidate personally did, not the team.
- spokenAnswer: a natural answer the candidate could say aloud in 60-90 seconds. Conversational, no headings, no bullet points, same facts only.
- score: a whole number from 1 to 10 for how strong this story is as an answer to the question. 8+ needs a clear personal contribution and a concrete, ideally measurable, result. Weak relevance to the question lowers the score.
- feedback: 2-5 specific points about this story (what works, what to cut, what to sharpen). No generic advice.
- missingDetails: 0-6 questions the candidate should answer to make the story stronger, e.g. "What was the measurable outcome?".
- followUpQuestions: 3-5 questions an interviewer would likely ask next about this story.
- Every list entry is a plain string, never an object.`;

/** User prompt for one story. */
export function buildStarPrompt(input: StarInput): string {
  return [
    `Interview question: ${input.question}`,
    input.role ? `Target role: ${input.role}` : "Target role: not specified",
    "",
    "Candidate's rough notes (the only source of facts):",
    '"""',
    input.notes,
    '"""',
  ].join("\n");
}
