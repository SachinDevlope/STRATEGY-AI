import { describe, expect, it } from "vitest";
import { UserError } from "@/lib/errors";
import {
  allowedNextKinds,
  coerceTurn,
  FALLBACK_CLOSING,
  groupExchanges,
  normalizeScorecard,
  parseSetup,
  type InterviewMessage,
  type Scorecard,
  type TurnKind,
} from "@/lib/mock-interview";

type Msg = Pick<InterviewMessage, "role" | "content" | "kind">;
const q = (content = "q"): Msg => ({ role: "interviewer", content, kind: "question" });
const f = (content = "f"): Msg => ({ role: "interviewer", content, kind: "follow_up" });
const a = (content = "a"): Msg => ({ role: "candidate", content });

describe("allowedNextKinds", () => {
  it("starts with a question", () => {
    expect(allowedNextKinds([], 3)).toEqual(["question"]);
  });

  it("allows one follow-up per main question", () => {
    expect(allowedNextKinds([q(), a()], 3)).toEqual(["question", "follow_up"]);
    expect(allowedNextKinds([q(), a(), f(), a()], 3)).toEqual(["question"]);
  });

  it("forces the closing once the question limit is reached", () => {
    const transcript = [q(), a(), q(), a(), q(), a()];
    expect(allowedNextKinds(transcript, 3)).toEqual(["follow_up", "closing"]);
    expect(allowedNextKinds([...transcript, f(), a()], 3)).toEqual(["closing"]);
  });

  it("allows nothing after the closing", () => {
    expect(allowedNextKinds([q(), a(), { role: "interviewer", content: "bye", kind: "closing" }], 3)).toEqual([]);
  });
});

describe("coerceTurn", () => {
  const turn = (kind: TurnKind) => ({ message: "text", kind });

  it("keeps an allowed kind", () => {
    expect(coerceTurn(turn("follow_up"), ["question", "follow_up"])).toEqual(turn("follow_up"));
  });

  it("turns a second follow-up into the next question", () => {
    expect(coerceTurn(turn("follow_up"), ["question"])).toEqual(turn("question"));
  });

  it("asks for a retry when the model closes early", () => {
    expect(coerceTurn(turn("closing"), ["question", "follow_up"])).toBeNull();
  });

  it("replaces an extra question with the closing line", () => {
    expect(coerceTurn(turn("question"), ["closing"])).toEqual({
      message: FALLBACK_CLOSING,
      kind: "closing",
    });
    expect(coerceTurn(turn("question"), ["follow_up", "closing"])?.kind).toBe("closing");
  });
});

describe("groupExchanges", () => {
  it("groups follow-ups with their question and drops unanswered ones", () => {
    const exchanges = groupExchanges([q("Q1"), a("A1"), f("F1"), a("A1b"), q("Q2"), a("A2"), q("Q3")]);
    expect(exchanges).toEqual([
      { question: "Q1", followUp: "F1", answers: ["A1", "A1b"] },
      { question: "Q2", answers: ["A2"] },
    ]);
  });
});

describe("normalizeScorecard", () => {
  const item = { question: "made up", answerSummary: "s", score: 7, feedback: "f", strongerAnswer: "x" };
  const card: Scorecard = {
    overallScore: 140.4,
    verdict: " ok ",
    questions: [
      { ...item, score: 0 },
      { ...item, score: 11.6 },
      { ...item, score: Number.NaN },
    ],
    strengths: [],
    improvements: ["i"],
  };

  it("clamps scores and pins question text to the real transcript", () => {
    const normalized = normalizeScorecard(card, [
      { question: "Q1", answers: ["a"] },
      { question: "Q2", answers: ["a"] },
    ]);
    expect(normalized.overallScore).toBe(100);
    expect(normalized.verdict).toBe("ok");
    expect(normalized.questions.map((x) => [x.question, x.score])).toEqual([
      ["Q1", 1],
      ["Q2", 10],
    ]);
  });

  it("floors a negative overall score at 0", () => {
    expect(normalizeScorecard({ ...card, overallScore: -5 }, []).overallScore).toBe(0);
  });
});

describe("parseSetup", () => {
  const base = { role: " Backend Engineer ", level: "mid", type: "technical" };

  it("trims, defaults and clamps the question count", () => {
    expect(parseSetup(base)).toEqual({
      role: "Backend Engineer",
      level: "mid",
      type: "technical",
      questionCount: 5,
    });
    expect(parseSetup({ ...base, questionCount: 20 }).questionCount).toBe(8);
    expect(parseSetup({ ...base, questionCount: 1 }).questionCount).toBe(3);
  });

  it("rejects missing role and unknown enums", () => {
    expect(() => parseSetup({ ...base, role: "  " })).toThrow(UserError);
    expect(() => parseSetup({ ...base, level: "principal" })).toThrow(UserError);
    expect(() => parseSetup({ ...base, type: "trivia" })).toThrow(UserError);
  });

  it("rejects an oversized job description", () => {
    expect(() => parseSetup({ ...base, jobDescription: "x".repeat(12001) })).toThrow(UserError);
  });
});
