import { describe, expect, it } from "vitest";
import {
  buildStarPrompt,
  clampScore,
  MIN_NOTES_CHARS,
  normalizeStarStory,
  starStorySchema,
  validateStarInput,
  type StarStory,
} from "@/lib/star";

const notes = "x".repeat(MIN_NOTES_CHARS);

function story(overrides: Partial<StarStory> = {}): StarStory {
  return {
    title: " Billing migration ",
    situation: "s",
    task: "t",
    action: "a",
    result: "r",
    spokenAnswer: "answer",
    score: 7,
    feedback: ["Good", "good ", "Cut the intro"],
    missingDetails: [],
    followUpQuestions: ["Why?"],
    ...overrides,
  };
}

describe("clampScore", () => {
  it("rounds and clamps to 1-10", () => {
    expect(clampScore(7.4)).toBe(7);
    expect(clampScore(0)).toBe(1);
    expect(clampScore(-3)).toBe(1);
    expect(clampScore(42)).toBe(10);
    expect(clampScore("8")).toBe(8);
  });

  it("falls back to 1 for non-numbers", () => {
    expect(clampScore(NaN)).toBe(1);
    expect(clampScore("high")).toBe(1);
    expect(clampScore(undefined)).toBe(1);
  });
});

describe("normalizeStarStory", () => {
  it("clamps the score, trims, and de-duplicates lists", () => {
    const result = normalizeStarStory(story({ score: 12 }));
    expect(result.score).toBe(10);
    expect(result.title).toBe("Billing migration");
    expect(result.feedback).toEqual(["Good", "Cut the intro"]);
  });

  it("caps long lists and names an untitled story", () => {
    const result = normalizeStarStory(
      story({ title: "  ", followUpQuestions: Array.from({ length: 20 }, (_, i) => `q${i}`) })
    );
    expect(result.title).toBe("Untitled story");
    expect(result.followUpQuestions).toHaveLength(8);
  });
});

describe("starStorySchema", () => {
  it("unwraps object list entries from the model", () => {
    const parsed = starStorySchema.parse({
      ...story(),
      missingDetails: [{ question: "What was the measurable outcome?" }, ""],
    });
    expect(parsed.missingDetails).toEqual(["What was the measurable outcome?"]);
  });
});

describe("validateStarInput", () => {
  it("rejects short notes and a missing question", () => {
    expect(validateStarInput({ question: "", notes }).ok).toBe(false);
    expect(validateStarInput({ question: "Tell me about a failure", notes: "short" }).ok).toBe(
      false
    );
  });

  it("trims input and drops an empty role", () => {
    const result = validateStarInput({ question: "  Tell me about a failure ", notes, role: " " });
    expect(result).toEqual({ ok: true, value: { question: "Tell me about a failure", notes } });
  });
});

describe("buildStarPrompt", () => {
  it("includes the question, role and notes", () => {
    const prompt = buildStarPrompt({ question: "Q?", notes: "my notes", role: "PM" });
    expect(prompt).toContain("Q?");
    expect(prompt).toContain("Target role: PM");
    expect(prompt).toContain("my notes");
  });
});
