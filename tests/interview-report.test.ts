import { describe, expect, it } from "vitest";
import type { Analysis } from "@/lib/analysis";
import {
  findShortfalls,
  findUncoveredSkills,
  normalizePreparationPlan,
} from "@/lib/interview-report";

const question = { question: "q", intention: "i", answer: "a" };

function report(overrides: Partial<Analysis> = {}): Analysis {
  return {
    title: "Backend Engineer",
    matchScore: 70,
    verdict: "ok",
    matchedSkills: [],
    skillGap: [
      { skill: "Kafka", severity: "low", why: "" },
      { skill: "Go", severity: "high", why: "" },
    ],
    technicalQuestions: Array(6).fill(question),
    behavioralQuestions: Array(4).fill(question),
    preparationPlan: [
      { day: 1, focus: "", skills: ["kafka"], tasks: ["t"], outcome: "" },
      { day: 2, focus: "", skills: ["Go", "Rust"], tasks: ["t"], outcome: "" },
    ],
    resumeFixes: ["fix"],
    ...overrides,
  };
}

describe("findUncoveredSkills", () => {
  it("matches case-insensitively", () => {
    expect(findUncoveredSkills(report())).toEqual([]);
  });

  it("lists gaps no day covers", () => {
    const r = report({ preparationPlan: [] });
    expect(findUncoveredSkills(r)).toEqual(["Kafka", "Go"]);
  });
});

describe("findShortfalls", () => {
  it("is empty for a complete report", () => {
    expect(findShortfalls(report())).toEqual([]);
  });

  it("names short lists and empty fixes", () => {
    const problems = findShortfalls(
      report({ technicalQuestions: [question], resumeFixes: [] })
    );
    expect(problems.some((p) => p.startsWith("technicalQuestions"))).toBe(true);
    expect(problems.some((p) => p.startsWith("resumeFixes"))).toBe(true);
  });
});

describe("normalizePreparationPlan", () => {
  it("sorts by severity, drops unknown skills, renumbers days", () => {
    const { preparationPlan } = normalizePreparationPlan(report());
    expect(preparationPlan.map((d) => d.day)).toEqual([1, 2]);
    expect(preparationPlan[0].skills).toEqual(["Go"]);
    expect(preparationPlan[1].skills).toEqual(["kafka"]);
  });

  it("clamps matchScore to 0-100", () => {
    expect(normalizePreparationPlan(report({ matchScore: 1200 })).matchScore).toBe(100);
    expect(normalizePreparationPlan(report({ matchScore: -5 })).matchScore).toBe(0);
  });
});
