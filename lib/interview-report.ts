import { generateStructuredRaw, type Message } from "@/lib/ai";
import {
  analysisSchema,
  MIN_BEHAVIOURAL_QUESTIONS,
  MIN_TECHNICAL_QUESTIONS,
  SEVERITIES,
  type Analysis,
} from "@/lib/analysis";

/** One try plus one repair round — more just adds wait time. */
const MAX_PLAN_ATTEMPTS = 2;

const SEVERITY_ORDER: Record<string, number> = Object.fromEntries(
  SEVERITIES.map((severity, index) => [severity, index])
);

const normalizeSkill = (skill: string) => String(skill ?? "").trim().toLowerCase();

/** Skill gaps that no plan day covers. */
export function findUncoveredSkills(report: Analysis): string[] {
  const planned = new Set(
    report.preparationPlan.flatMap((day) => day.skills.map(normalizeSkill))
  );
  return report.skillGap
    .filter((gap) => !planned.has(normalizeSkill(gap.skill)))
    .map((gap) => gap.skill);
}

/** What the report is missing; sent back to the model to fix. */
export function findShortfalls(report: Analysis): string[] {
  const problems: string[] = [];

  if (report.technicalQuestions.length < MIN_TECHNICAL_QUESTIONS) {
    problems.push(
      `technicalQuestions has ${report.technicalQuestions.length} entries, it needs at least ${MIN_TECHNICAL_QUESTIONS}`
    );
  }
  if (report.behavioralQuestions.length < MIN_BEHAVIOURAL_QUESTIONS) {
    problems.push(
      `behavioralQuestions has ${report.behavioralQuestions.length} entries, it needs at least ${MIN_BEHAVIOURAL_QUESTIONS}`
    );
  }
  if (!report.preparationPlan.length) {
    problems.push("preparationPlan is empty, it needs at least one day");
  }
  if (report.preparationPlan.some((day) => !day.tasks.length)) {
    problems.push("every preparationPlan day needs at least one task");
  }
  if (!report.resumeFixes.length) {
    problems.push("resumeFixes is empty, it needs at least one concrete edit");
  }

  const uncovered = findUncoveredSkills(report);
  if (uncovered.length) {
    problems.push(
      `the preparation plan does not cover these skill gaps: ${uncovered.join(", ")}`
    );
  }

  return problems;
}

/**
 * Cleans the plan: keeps only real gap skills, sorts days by worst severity,
 * renumbers days 1..n, and clamps matchScore to 0-100.
 */
export function normalizePreparationPlan(report: Analysis): Analysis {
  const severityBySkill = new Map(
    report.skillGap.map((gap) => [normalizeSkill(gap.skill), gap.severity])
  );

  const worstSeverityRank = (day: Analysis["preparationPlan"][number]) => {
    const ranks = day.skills
      .map((skill) => SEVERITY_ORDER[severityBySkill.get(normalizeSkill(skill)) ?? ""])
      .filter((rank) => rank !== undefined);
    // Days with no known gap go last.
    return ranks.length ? Math.min(...ranks) : SEVERITIES.length;
  };

  const matchScore = Math.max(0, Math.min(100, Math.round(report.matchScore)));

  const preparationPlan = [...report.preparationPlan]
    .map((day) => ({
      ...day,
      // Days left with no valid skill keep their tasks.
      skills: day.skills.filter((skill) => severityBySkill.has(normalizeSkill(skill))),
    }))
    .sort(
      (a, b) => worstSeverityRank(a) - worstSeverityRank(b) || (a.day || 0) - (b.day || 0)
    )
    .map((day, index) => ({ ...day, day: index + 1 }));

  return { ...report, matchScore, preparationPlan };
}

const SYSTEM_PROMPT = `You are an experienced technical recruiter and interview coach.

Analyse ONLY the candidate information provided.

STRICT RULES:
1. Never invent a company, technology, project, certification, achievement, or year of experience.
2. Every technical question must come from the candidate information or the job description.
3. Every behavioural answer must use only the candidate information provided.
4. Only the sections present below exist. Never assume a missing section.
5. Where there is not enough information to answer, write: "Candidate should prepare an example for this."
6. Plain ASCII. No markdown, no emoji.
7. Be direct about weaknesses. A flattering report is a useless one.

PREPARATION PLAN RULES:
8. Build skillGap first, then derive preparationPlan from it. The plan exists only to close those gaps.
9. Every skill in skillGap must appear in the "skills" array of at least one day, spelled exactly as in skillGap.
10. Never put a skill in a day's "skills" array unless that exact skill is in skillGap.
11. Schedule by severity: all "high" gaps before "medium", all "medium" before "low".
12. One day covers at most 2 skills. A "high" severity gap gets its own day, and may span 2 consecutive days if it is broad.
13. Days are numbered from 1 with no gaps and no repeats.
14. Every task must be concrete and doable in one day: what to build, read, practise, or rehearse. Never vague advice such as "study more".
15. Prefer tasks that produce something the candidate can talk about in the interview.
16. If skillGap is empty, return a short plan whose days rehearse the technical and behavioural questions, with "skills" listing topics from the job description.

OUTPUT RULES:
17. Return every field of the schema, including "resumeFixes" as the last one. A report without it is rejected.
18. "resumeFixes" holds 3-6 plain sentences, each a specific edit to the resume itself — a bullet to rewrite, a metric to add, a section to cut. Never an object, never advice about learning a skill.`;

function buildPrompt(input: {
  resumeText: string;
  jobTitle: string;
  jobCompany?: string;
  jobText: string;
}) {
  const role = input.jobCompany
    ? `${input.jobTitle} at ${input.jobCompany}`
    : input.jobTitle;
  return [
    `Resume:\n${input.resumeText.trim()}`,
    "",
    `Job Description (${role}):\n${input.jobText.trim()}`,
  ].join("\n");
}

/**
 * Resume text + job description -> validated interview report.
 * If the first reply has gaps, the model is asked once to fix them.
 */
export async function generateInterviewReport(input: {
  resumeText: string;
  jobTitle: string;
  jobCompany?: string;
  jobText: string;
}): Promise<Analysis> {
  if (!input.resumeText.trim()) throw new Error("A resume is required.");

  const messages: Message[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: buildPrompt(input) },
  ];

  let report: Analysis | null = null;

  for (let attempt = 1; attempt <= MAX_PLAN_ATTEMPTS; attempt++) {
    let result: Awaited<ReturnType<typeof generateStructuredRaw<Analysis>>>;
    try {
      result = await generateStructuredRaw(analysisSchema, {
        messages,
        schemaName: "interview_report",
      });
    } catch (error) {
      // A failed repair round must not throw away the report we already have.
      if (!report) throw error;
      console.warn("Repair round failed; keeping the first report.", error);
      break;
    }
    const { object, content } = result;

    report = object;
    const problems = findShortfalls(report);
    if (!problems.length) break;

    if (attempt === MAX_PLAN_ATTEMPTS) {
      // A thin report beats no report.
      console.warn(`Interview report still incomplete: ${problems.join("; ")}`);
      break;
    }

    messages.push({ role: "assistant", content });
    messages.push({
      role: "user",
      content:
        `That report is incomplete: ${problems.join("; ")}. Regenerate the full JSON ` +
        "with those fixed. Keep skillGap unchanged, keep every skill in a day's " +
        '"skills" array spelled exactly as in skillGap, and keep the days ordered ' +
        "high severity first.",
    });
  }

  return normalizePreparationPlan(report!);
}
