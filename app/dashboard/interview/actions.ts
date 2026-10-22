"use server";

import { getJobDescription } from "@/lib/analysis-store";
import { UserError, userMessage } from "@/lib/errors";
import {
  allowedNextKinds,
  countAnswers,
  countMainQuestions,
  MAX_ANSWER_CHARS,
  parseSetup,
  type InterviewMessage,
  type TurnKind,
} from "@/lib/mock-interview";
import { generateInterviewerTurn, generateScorecard } from "@/lib/mock-interview-ai";
import {
  appendTurn,
  completeInterview,
  createInterview,
  getInterview,
} from "@/lib/mock-interview-store";
import { limitAi, limitInterview } from "@/lib/rate-limit";
import { requireUserId } from "@/lib/session";

export type InterviewSetupInput = {
  role: string;
  company?: string;
  /** Pasted text. Ignored when a saved description is picked. */
  jobDescription?: string;
  /** A saved job description from the resume analyser. */
  jobDescriptionId?: string;
  level: string;
  type: string;
  questionCount?: number;
};

export type StartInterviewResult =
  | { ok: true; interviewId: string }
  | { ok: false; error: string };

export type AnswerInterviewResult =
  | { ok: true; message: { content: string; kind: TurnKind }; done: boolean }
  | { ok: false; error: string };

export type FinishInterviewResult = { ok: true } | { ok: false; error: string };

export async function startInterviewAction(
  input: InterviewSetupInput
): Promise<StartInterviewResult> {
  try {
    const userId = await requireUserId();

    // The saved text is loaded here, never trusted from the client.
    let jobDescription = input.jobDescription;
    let role = input.role;
    let company = input.company;
    if (input.jobDescriptionId) {
      const saved = await getJobDescription(userId, input.jobDescriptionId);
      if (!saved) throw new UserError("That job description no longer exists.");
      jobDescription = saved.text;
      role = role?.trim() || saved.title;
      company = company?.trim() || saved.company;
    }

    const setup = parseSetup({ ...input, role, company, jobDescription });
    await limitInterview(userId);

    const first = await generateInterviewerTurn(setup, []);
    const interviewId = await createInterview(userId, setup, {
      role: "interviewer",
      content: first.message,
      kind: first.kind,
      at: new Date(),
    });
    return { ok: true, interviewId };
  } catch (error) {
    return { ok: false, error: userMessage(error, "Could not start the interview. Try again.") };
  }
}

export async function answerInterviewAction(
  interviewId: string,
  answer: string
): Promise<AnswerInterviewResult> {
  try {
    const userId = await requireUserId();

    const content = typeof answer === "string" ? answer.trim() : "";
    if (!content) throw new UserError("Type or say an answer first.");
    if (content.length > MAX_ANSWER_CHARS) {
      throw new UserError(
        `Keep answers under ${MAX_ANSWER_CHARS.toLocaleString("en-US")} characters — a real interviewer would have stopped you by now.`
      );
    }

    const interview = await getInterview(userId, interviewId);
    if (!interview) throw new UserError("That interview no longer exists.");
    if (interview.status !== "active") throw new UserError("This interview has already finished.");

    const last = interview.messages[interview.messages.length - 1];
    if (last?.role !== "interviewer") {
      throw new UserError("Your last answer is still being processed. Reload the page.");
    }
    if (last.kind === "closing") {
      throw new UserError("The interview is over — get your scorecard.");
    }

    await limitInterview(userId);

    const candidate: InterviewMessage = { role: "candidate", content, at: new Date() };
    const transcript = [...interview.messages, candidate];
    if (!allowedNextKinds(transcript, interview.setup.questionCount).length) {
      throw new UserError("The interview is over — get your scorecard.");
    }

    // Saved together after the reply exists, so a failed reply can just be resent.
    const next = await generateInterviewerTurn(interview.setup, transcript);
    const reply: InterviewMessage = {
      role: "interviewer",
      content: next.message,
      kind: next.kind,
      at: new Date(),
    };

    const saved = await appendTurn(
      userId,
      interviewId,
      interview.messages.length,
      [candidate, reply],
      countMainQuestions([...transcript, reply])
    );
    if (!saved) {
      throw new UserError("This interview changed in another tab. Reload the page to continue.");
    }

    return {
      ok: true,
      message: { content: reply.content, kind: next.kind },
      done: next.kind === "closing",
    };
  } catch (error) {
    return { ok: false, error: userMessage(error, "Could not send that answer. Try again.") };
  }
}

export async function finishInterviewAction(
  interviewId: string
): Promise<FinishInterviewResult> {
  try {
    const userId = await requireUserId();

    const interview = await getInterview(userId, interviewId);
    if (!interview) throw new UserError("That interview no longer exists.");
    // Already scored (e.g. a second tab): nothing to do.
    if (interview.status === "completed") return { ok: true };

    if (!countAnswers(interview.messages)) {
      throw new UserError("Answer at least one question before asking for a scorecard.");
    }

    await limitAi(userId);
    const scorecard = await generateScorecard(interview.setup, interview.messages);
    await completeInterview(userId, interviewId, scorecard);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: userMessage(error, "Could not score this interview. Try again.") };
  }
}
