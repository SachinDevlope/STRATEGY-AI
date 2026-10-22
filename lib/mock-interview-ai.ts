import { z } from "zod";
import { generateStructured } from "@/lib/ai";
import { UserError } from "@/lib/errors";
import {
  allowedNextKinds,
  cleanTurnText,
  coerceTurn,
  countMainQuestions,
  groupExchanges,
  normalizeScorecard,
  scorecardSchema,
  TURN_KINDS,
  type Exchange,
  type ExperienceLevel,
  type InterviewMessage,
  type InterviewSetup,
  type InterviewType,
  type Scorecard,
  type TurnKind,
} from "@/lib/mock-interview";

// Server only: prompts and Groq calls. Shared rules and schemas live in lib/mock-interview.ts.

const turnSchema = z.object({
  message: z
    .string()
    .describe("Exactly what the interviewer says out loud next. Plain text, no markdown."),
  kind: z
    .enum(TURN_KINDS)
    .describe(
      '"question" for a new main question, "follow_up" to probe the last answer, "closing" to end the interview'
    ),
});

const LEVEL_GUIDANCE: Record<ExperienceLevel, string> = {
  fresher:
    "a fresher with no full-time experience. Ask about fundamentals, coursework, internships and personal projects. Never expect production ownership.",
  junior:
    "a junior with 1-2 years of experience. Ask about hands-on implementation, debugging, and learning on the job.",
  mid: "a mid-level engineer or professional with 3-5 years of experience. Ask about owning features end to end, trade-offs, and working across teams.",
  senior:
    "a senior with 6+ years of experience. Ask about system design, technical leadership, ambiguity, mentoring, and business impact.",
};

const TYPE_GUIDANCE: Record<InterviewType, string> = {
  technical: "All main questions are technical: concepts, problem solving, and design relevant to the role.",
  behavioural:
    "All main questions are behavioural: past situations, conflict, ownership, failure, teamwork. Expect STAR-style answers.",
  mixed: "Alternate between technical and behavioural main questions, starting with a technical one.",
};

const TURN_SYSTEM_PROMPT = `You are a sharp, fair interviewer running a live spoken mock interview.

RULES:
1. Say ONE thing per turn: one question, one follow-up, or the closing. Never stack several questions.
2. Keep it short and spoken: at most 2-3 sentences, the way a person talks across a table. No lists.
3. Calibrate every question to the candidate's level and the role. Use the job description when one is given.
4. Ask at most ONE follow-up per main question, and only when the last answer was vague, generic, or missing specifics (numbers, their own role, the outcome). A solid answer gets the next main question instead.
5. A follow-up must point at what was missing from that specific answer.
6. Never answer for the candidate, never hint at the ideal answer, never give feedback or a score during the interview.
7. If the candidate says they don't know, accept it briefly and move on.
8. When told to close, give one brief, neutral closing line thanking them. Do not ask anything else.
9. Never repeat a question already asked.
10. Plain ASCII. No markdown, no emoji, no speaker labels.`;

function describeSetup(setup: InterviewSetup): string {
  const role = setup.company ? `${setup.role} at ${setup.company}` : setup.role;
  return [
    `Role: ${role}`,
    `Candidate level: ${LEVEL_GUIDANCE[setup.level]}`,
    `Interview type: ${TYPE_GUIDANCE[setup.type]}`,
    `Main questions in total: ${setup.questionCount}`,
    setup.jobDescription ? `\nJob description:\n${setup.jobDescription}` : "",
  ].join("\n");
}

export function renderTranscript(messages: Pick<InterviewMessage, "role" | "content" | "kind">[]): string {
  if (!messages.length) return "(The interview has not started yet.)";
  return messages
    .map((m) =>
      m.role === "interviewer"
        ? `INTERVIEWER (${m.kind ?? "question"}): ${m.content}`
        : `CANDIDATE: ${m.content}`
    )
    .join("\n\n");
}

// Keyed by allowedNextKinds() output.
const KIND_INSTRUCTIONS: Record<string, string> = {
  question: 'ask the next main question (kind "question") - the last one already had its follow-up',
  "question,follow_up":
    'ask the next main question (kind "question"), or ONE follow-up on the last answer if it was vague (kind "follow_up")',
  "follow_up,closing":
    'ONE follow-up on the last answer if it was vague (kind "follow_up"), otherwise close the interview (kind "closing")',
  closing: 'close the interview now (kind "closing")',
};

function nextStepInstruction(allowed: TurnKind[], asked: number, total: number): string {
  const instruction =
    asked === 0
      ? `This is the start. Greet the candidate in one short sentence, then ask main question 1 of ${total} (kind "question").`
      : `Main questions asked so far: ${asked} of ${total}. Your next turn must ${KIND_INSTRUCTIONS[allowed.join(",")] ?? `be one of: ${allowed.join(", ")}`}.`;
  return `${instruction} Allowed kinds: ${allowed.join(", ")}.`;
}

/**
 * Next interviewer message for a transcript. The model picks the wording and
 * kind; the counts are enforced here, not trusted to the model.
 */
export async function generateInterviewerTurn(
  setup: InterviewSetup,
  messages: Pick<InterviewMessage, "role" | "content" | "kind">[]
): Promise<{ message: string; kind: TurnKind }> {
  const allowed = allowedNextKinds(messages, setup.questionCount);
  if (!allowed.length) throw new UserError("This interview is already over.");

  const asked = countMainQuestions(messages);
  let correction = "";

  // Second try only when the model closes early or says nothing.
  for (let attempt = 1; attempt <= 2; attempt++) {
    const turn = await generateStructured(turnSchema, {
      system: TURN_SYSTEM_PROMPT,
      schemaName: "interviewer_turn",
      prompt: [
        describeSetup(setup),
        "",
        `Transcript so far:\n${renderTranscript(messages)}`,
        "",
        nextStepInstruction(allowed, asked, setup.questionCount) + correction,
      ].join("\n"),
    });

    const coerced = coerceTurn({ message: cleanTurnText(turn.message), kind: turn.kind }, allowed);
    if (coerced && coerced.message) return coerced;
    correction =
      " Your last reply was not allowed: do not close the interview yet, and do not leave the message empty.";
  }

  throw new Error("The model would not produce a valid interviewer turn.");
}


const SCORECARD_SYSTEM_PROMPT = `You are a demanding interview coach scoring a mock interview transcript.

RULES:
1. Judge ONLY what the candidate actually said. Never invent experience, numbers, projects, or claims.
2. Be brutally honest. A flattering scorecard is useless. Vague, generic, or rambling answers score low.
3. Calibrate to the candidate's level: a fresher is not expected to have led teams; a senior is.
4. Score each exchange 1-10: 1-3 poor, 4-5 weak, 6-7 decent, 8-9 strong, 10 exceptional.
5. overallScore (0-100) reflects all exchanges together. If the interview ended early, score only what was answered and say so in the verdict.
6. Feedback must be specific to the answer: name what was missing (structure, metrics, their own role, trade-offs, outcome).
7. Return exactly one "questions" entry per numbered exchange, in the same order.
8. Plain ASCII. No markdown, no emoji.`;

function renderExchanges(exchanges: Exchange[]): string {
  return exchanges
    .map((exchange, index) =>
      [
        `Exchange ${index + 1}`,
        `Question: ${exchange.question}`,
        `Answer: ${exchange.answers[0]}`,
        ...(exchange.followUp ? [`Follow-up: ${exchange.followUp}`] : []),
        ...exchange.answers.slice(1).map((answer) => `Answer to follow-up: ${answer}`),
      ].join("\n")
    )
    .join("\n\n");
}

/** Transcript -> clamped scorecard. Needs at least one answered question. */
export async function generateScorecard(
  setup: InterviewSetup,
  messages: Pick<InterviewMessage, "role" | "content" | "kind">[]
): Promise<Scorecard> {
  const exchanges = groupExchanges(messages);
  if (!exchanges.length) throw new UserError("Answer at least one question before asking for a scorecard.");

  const planned = setup.questionCount;
  const card = await generateStructured(scorecardSchema, {
    system: SCORECARD_SYSTEM_PROMPT,
    schemaName: "interview_scorecard",
    prompt: [
      describeSetup(setup),
      "",
      exchanges.length < planned
        ? `The candidate ended early: ${exchanges.length} of ${planned} main questions answered.`
        : `All ${planned} main questions were answered.`,
      "",
      renderExchanges(exchanges),
    ].join("\n"),
  });

  return normalizeScorecard(card, exchanges);
}
