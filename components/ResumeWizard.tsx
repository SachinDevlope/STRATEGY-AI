"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { generateResumeAction, saveDraftAction } from "@/app/dashboard/resume/new/actions";
import { QUESTIONS, missingRequired, type Answers, type QuestionId } from "@/lib/resume";

const LAST_STEP = QUESTIONS.length - 1;

type SaveState = "idle" | "saving" | "saved" | "error";

export default function ResumeWizard({
  initialAnswers,
  initialStep,
}: {
  initialAnswers: Answers;
  initialStep: number;
}) {
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [step, setStep] = useState(Math.min(Math.max(initialStep, 0), LAST_STEP));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [isGenerating, startGenerating] = useTransition();

  const question = QUESTIONS[step];
  const value = answers[question.id] ?? "";
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus on step change so the wizard is keyboard-only from start to finish.
  useEffect(() => {
    textareaRef.current?.focus();
  }, [step]);

  const persist = useCallback(async (next: Answers, nextStep: number) => {
    setSaveState("saving");
    const result = await saveDraftAction(next, nextStep);
    setSaveState(result.ok ? "saved" : "error");
  }, []);

  // Autosave on a pause in typing as well as on navigation — a tab closed
  // mid-answer should not lose the paragraph the user just wrote.
  useEffect(() => {
    if (resumeId) return;
    const timer = setTimeout(() => {
      void persist(answers, step);
    }, 1200);
    return () => clearTimeout(timer);
  }, [answers, step, resumeId, persist]);

  function update(id: QuestionId, text: string) {
    setAnswers((current) => ({ ...current, [id]: text }));
    setError(null);
  }

  function go(nextStep: number) {
    const clamped = Math.min(Math.max(nextStep, 0), LAST_STEP);
    setStep(clamped);
    void persist(answers, clamped);
  }

  function generate() {
    const missing = missingRequired(answers);
    if (missing.length) {
      const first = QUESTIONS.findIndex((q) => q.id === missing[0]);
      setError("A few answers are still empty — filling them in makes a far better resume.");
      setStep(first);
      return;
    }
    setError(null);
    startGenerating(async () => {
      const result = await generateResumeAction(answers);
      if (result.ok) setResumeId(result.resumeId);
      else setError(result.error);
    });
  }

  // Ctrl/Cmd+Enter advances, matching the "type, then move on" flow.
  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      if (step < LAST_STEP) go(step + 1);
      else generate();
    }
  }

  if (resumeId) return <Done resumeId={resumeId} />;

  return (
    <div className="flex flex-col gap-8">
      <Progress step={step} onJump={go} answers={answers} />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-label-caps text-primary uppercase">
            Question {step + 1} of {QUESTIONS.length}
          </span>
          <h2 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">
            {question.title}
          </h2>
          <p className="text-body-sm text-on-surface-variant">{question.hint}</p>
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          rows={question.rows}
          placeholder={question.placeholder}
          onChange={(event) => update(question.id, event.target.value)}
          onKeyDown={onKeyDown}
          className="w-full bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:outline-none rounded-xl p-4 text-body-md text-on-surface placeholder:text-on-surface-variant/40 resize-y transition-colors"
        />

        <div className="flex items-center justify-between gap-4 min-h-[20px]">
          <span className="text-body-sm text-on-surface-variant">
            {error ? (
              <span className="text-error">{error}</span>
            ) : (
              <SaveIndicator state={saveState} />
            )}
          </span>
          <span className="text-body-sm text-on-surface-variant/60 hidden md:inline">
            Ctrl + Enter to continue
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => go(step - 1)}
          disabled={step === 0 || isGenerating}
          className="px-5 py-3 rounded-lg border border-outline-variant/60 text-body-md text-on-surface hover:border-primary/60 disabled:opacity-30 disabled:hover:border-outline-variant/60 transition-colors"
        >
          Back
        </button>

        {step < LAST_STEP ? (
          <button
            type="button"
            onClick={() => go(step + 1)}
            className="px-6 py-3 rounded-lg bg-primary text-on-primary font-semibold text-body-md hover:bg-primary-fixed transition-colors"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={generate}
            disabled={isGenerating}
            className="px-6 py-3 rounded-lg bg-primary text-on-primary font-semibold text-body-md hover:bg-primary-fixed disabled:opacity-60 transition-colors"
          >
            {isGenerating ? "Writing your resume…" : "Generate resume"}
          </button>
        )}
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving") return <>Saving…</>;
  if (state === "saved") return <>Draft saved — you can close this and come back.</>;
  if (state === "error") return <span className="text-error">Could not save the draft.</span>;
  return null;
}

function Progress({
  step,
  answers,
  onJump,
}: {
  step: number;
  answers: Answers;
  onJump: (step: number) => void;
}) {
  return (
    <div className="flex gap-1.5" role="list">
      {QUESTIONS.map((question, index) => {
        const answered = Boolean(answers[question.id]?.trim());
        return (
          <button
            key={question.id}
            type="button"
            role="listitem"
            aria-label={`Step ${index + 1}: ${question.title}`}
            aria-current={index === step ? "step" : undefined}
            onClick={() => onJump(index)}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              index === step
                ? "bg-primary"
                : answered
                  ? "bg-primary/40"
                  : "bg-outline-variant/40"
            }`}
          />
        );
      })}
    </div>
  );
}

function Done({ resumeId }: { resumeId: string }) {
  return (
    <div className="flex flex-col gap-6 items-start">
      <div className="flex flex-col gap-2">
        <span className="text-label-caps text-primary uppercase">Ready</span>
        <h2 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">
          Your resume is built.
        </h2>
        <p className="text-body-md text-on-surface-variant">
          One A4 page, ATS-safe, no columns or graphics for a parser to choke on.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <a
          href={`/api/resume/${resumeId}/pdf`}
          target="_blank"
          rel="noreferrer"
          className="px-6 py-3 rounded-lg bg-primary text-on-primary font-semibold text-body-md hover:bg-primary-fixed transition-colors"
        >
          View PDF
        </a>
        <a
          href={`/api/resume/${resumeId}/pdf?download=1`}
          className="px-6 py-3 rounded-lg border border-outline-variant/60 text-body-md text-on-surface hover:border-primary/60 transition-colors"
        >
          Download
        </a>
        <Link
          href="/dashboard"
          className="px-6 py-3 rounded-lg text-body-md text-on-surface-variant hover:text-on-surface transition-colors"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
