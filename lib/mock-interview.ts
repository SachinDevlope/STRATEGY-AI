import { z } from "zod";
import { UserError } from "@/lib/errors";

export const EXPERIENCE_LEVELS = ["fresher", "junior", "mid", "senior"] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const INTERVIEW_TYPES = ["technical", "behavioural", "mixed"] as const;
export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export const TURN_KINDS = ["question", "follow_up", "closing"] as const;
export type TurnKind = (typeof TURN_KINDS)[number];

export const MIN_QUESTIONS = 3;
export const MAX_QUESTIONS = 8;
export const DEFAULT_QUESTIONS = 5;
export const MAX_ROLE_CHARS = 120;
export const MAX_INTERVIEW_JD_CHARS = 12000;
export const MAX_ANSWER_CHARS = 4000;
const MAX_TURN_CHARS = 600;

export const LEVEL_LABELS: Record<ExperienceLevel, string> = {
  fresher: "Fresher (no full-time experience)",
  junior: "Junior (1-2 years)",
  mid: "Mid-level (3-5 years)",
  senior: "Senior (6+ years)",
};

export const TYPE_LABELS: Record<InterviewType, string> = {
  technical: "Technical",
  behavioural: "Behavioural",
  mixed: "Mixed",
};

export type InterviewSetup = {
  role: string;
  company?: string;
  jobDescription?: string;
  level: ExperienceLevel;
  type: InterviewType;
  questionCount: number;
};

export type InterviewMessage = {
  role: "interviewer" | "candidate";
  content: string;
  /** Interviewer messages only. */
  kind?: TurnKind;
  at: Date;
};

/** Validates untrusted setup input. Throws a UserError naming the first problem. */
export function parseSetup(input: {
  role?: unknown;
  company?: unknown;
  jobDescription?: unknown;
  level?: unknown;
  type?: unknown;
  questionCount?: unknown;
}): InterviewSetup {
  const role = text(input.role).slice(0, MAX_ROLE_CHARS);
  if (!role) throw new UserError("Name the role you are interviewing for.");

  const level = EXPERIENCE_LEVELS.find((value) => value === input.level);
  if (!level) throw new UserError("Pick your experience level.");

  const type = INTERVIEW_TYPES.find((value) => value === input.type);
  if (!type) throw new UserError("Pick an interview type.");

  const jobDescription = text(input.jobDescription);
  if (jobDescription.length > MAX_INTERVIEW_JD_CHARS) {
    throw new UserError(
      `That job description is too long — keep it under ${MAX_INTERVIEW_JD_CHARS.toLocaleString("en-US")} characters.`
    );
  }

  const company = text(input.company).slice(0, MAX_ROLE_CHARS);
  const count = Number(input.questionCount ?? DEFAULT_QUESTIONS);

  return {
    role,
    ...(company ? { company } : {}),
    ...(jobDescription ? { jobDescription } : {}),
    level,
    type,
    questionCount: Number.isFinite(count)
      ? Math.min(MAX_QUESTIONS, Math.max(MIN_QUESTIONS, Math.round(count)))
      : DEFAULT_QUESTIONS,
  };
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

// ---------------------------------------------------------------------------
// Turn rules
// ---------------------------------------------------------------------------

export function countMainQuestions(messages: Pick<InterviewMessage, "role" | "kind">[]): number {
  return messages.filter((m) => m.role === "interviewer" && m.kind === "question").length;
}

export function countAnswers(messages: Pick<InterviewMessage, "role">[]): number {
  return messages.filter((m) => m.role === "candidate").length;
}

/** Kinds the next interviewer message may have, given the transcript so far. */
export function allowedNextKinds(
  messages: Pick<InterviewMessage, "role" | "kind">[],
  questionCount: number
): TurnKind[] {
  const lastInterviewer = [...messages].reverse().find((m) => m.role === "interviewer");
  if (!lastInterviewer) return ["question"];
  if (lastInterviewer.kind === "closing") return [];

  const outOfQuestions = countMainQuestions(messages) >= questionCount;
  // One follow-up per main question, so a follow-up can't follow a follow-up.
  const canFollowUp = lastInterviewer.kind === "question";

  if (outOfQuestions) return canFollowUp ? ["follow_up", "closing"] : ["closing"];
  return canFollowUp ? ["question", "follow_up"] : ["question"];
}

export const FALLBACK_CLOSING =
  "That's all the questions I have. Thanks for your time - let's look at how you did.";

/**
 * Forces a model turn into the allowed kinds. Returns null when the model
 * tried to end the interview early, so the caller can ask again.
 */
export function coerceTurn(
  turn: { message: string; kind: TurnKind },
  allowed: TurnKind[]
): { message: string; kind: TurnKind } | null {
  if (allowed.includes(turn.kind)) return turn;
  if (allowed.length === 1 && allowed[0] === "closing") {
    return { message: FALLBACK_CLOSING, kind: "closing" };
  }
  if (turn.kind === "closing") return null;
  // A question or a second follow-up: either way it's a new question now.
  if (allowed.includes("question")) return { message: turn.message, kind: "question" };
  // Only follow-up or closing left; a "new question" here would overrun the count.
  return { message: FALLBACK_CLOSING, kind: "closing" };
}

/** Plain, single-paragraph text the UI and speech synthesis can both use. */
export function cleanTurnText(message: string): string {
  return message
    .replace(/[*_#`>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TURN_CHARS);
}

// ---------------------------------------------------------------------------
// Scorecard
// ---------------------------------------------------------------------------

/** One main question with its follow-up and the candidate's answers. */
export type Exchange = {
  question: string;
  followUp?: string;
  answers: string[];
};

/** Groups the transcript by main question. Unanswered questions are dropped. */
export function groupExchanges(messages: Pick<InterviewMessage, "role" | "content" | "kind">[]): Exchange[] {
  const exchanges: Exchange[] = [];
  for (const m of messages) {
    const current = exchanges[exchanges.length - 1];
    if (m.role === "interviewer") {
      if (m.kind === "question") exchanges.push({ question: m.content, answers: [] });
      else if (m.kind === "follow_up" && current) current.followUp = m.content;
    } else if (current) {
      current.answers.push(m.content);
    }
  }
  return exchanges.filter((exchange) => exchange.answers.length > 0);
}

// Same tolerance as lib/analysis.ts: unwrap { text: "..." } items instead of failing.
function stringList(description: string) {
  return z
    .preprocess(
      (value) =>
        Array.isArray(value) ? value.map(unwrapString).filter((line) => line.length > 0) : value,
      z.array(z.string())
    )
    .describe(description);
}

function unwrapString(item: unknown): string {
  if (typeof item === "string") return item.trim();
  if (item && typeof item === "object") {
    const longest = Object.values(item as Record<string, unknown>)
      .filter((value): value is string => typeof value === "string")
      .sort((a, b) => b.length - a.length)[0];
    return longest?.trim() ?? "";
  }
  return "";
}

export const scorecardSchema = z.object({
  overallScore: z
    .number()
    .describe("Overall interview performance as a whole number from 0 to 100. Be strict."),
  verdict: z
    .string()
    .describe("One blunt sentence: would this interview get them to the next round, and why."),
  questions: z
    .array(
      z.object({
        question: z.string().describe("The main question, as asked"),
        answerSummary: z
          .string()
          .describe("One or two sentences on what the candidate actually said. Nothing they did not say."),
        score: z.number().describe("Whole number from 1 to 10"),
        feedback: z.string().describe("What was weak or missing, specifically. Two or three sentences."),
        strongerAnswer: z
          .string()
          .describe(
            "How a strong answer would go, built only from what the candidate said plus the structure and specifics it lacked. Never invent their experience; mark placeholders like [your metric]."
          ),
      })
    )
    .describe("One entry per numbered exchange, in the same order"),
  strengths: stringList("2-4 things the candidate genuinely did well, with evidence from their answers. Empty if none."),
  improvements: stringList("3-5 concrete, prioritised things to fix before the real interview."),
});

export type Scorecard = z.infer<typeof scorecardSchema>;

/** Clamps scores, pins question text to what was really asked, drops extras. */
export function normalizeScorecard(card: Scorecard, exchanges: Exchange[]): Scorecard {
  const clamp = (value: number, min: number, max: number) =>
    Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : min;

  return {
    overallScore: clamp(card.overallScore, 0, 100),
    verdict: card.verdict.trim(),
    questions: card.questions.slice(0, exchanges.length).map((item, index) => ({
      ...item,
      question: exchanges[index]?.question ?? item.question,
      score: clamp(item.score, 1, 10),
    })),
    strengths: card.strengths.slice(0, 6),
    improvements: card.improvements.slice(0, 8),
  };
}
