"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { generateResumeAction, saveDraftAction } from "@/app/dashboard/resume/new/actions";
import { LoadingOverlay } from "@/components/LoadingScreen";
import {
  MAX_JOB_DESCRIPTION,
  QUESTIONS,
  missingRequired,
  type Answers,
  type QuestionId,
  type Tailoring,
} from "@/lib/resume";

const LAST_STEP = QUESTIONS.length - 1;

type SaveState = "idle" | "saving" | "saved" | "error";

type Finished = { resumeId: string; tailoring: Tailoring | null };

// Resume at the saved step, but never past an unanswered required question —
// clicking through empty steps shouldn't land the user on the last one.
function resumeStep(answers: Answers, savedStep: number): number {
  const saved = Math.min(Math.max(savedStep, 0), LAST_STEP);
  const missing = missingRequired(answers)[0];
  if (!missing) return saved;
  return Math.min(saved, QUESTIONS.findIndex((q) => q.id === missing));
}

export default function ResumeWizard({
  initialAnswers,
  initialStep,
  initialJobDescription,
}: {
  initialAnswers: Answers;
  initialStep: number;
  initialJobDescription: string;
}) {
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [jobDescription, setJobDescription] = useState(initialJobDescription);
  const [step, setStep] = useState(() => resumeStep(initialAnswers, initialStep));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState<Finished | null>(null);
  const [isGenerating, startGenerating] = useTransition();

  const question = QUESTIONS[step];
  const value = answers[question.id] ?? "";
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tailored = Boolean(jobDescription.trim());
  // Only autosave after the user actually edits something.
  const dirtyRef = useRef(false);

  // Focus on step change so the wizard is keyboard-only from start to finish.
  useEffect(() => {
    textareaRef.current?.focus();
  }, [step]);

  const persist = useCallback(async (next: Answers, nextStep: number, jd: string) => {
    setSaveState("saving");
    const result = await saveDraftAction(next, nextStep, jd);
    setSaveState(result.ok ? "saved" : "error");
  }, []);

  // Autosave after a pause in typing, so a closed tab loses nothing.
  useEffect(() => {
    if (finished || !dirtyRef.current) return;
    const timer = setTimeout(() => {
      dirtyRef.current = false;
      void persist(answers, step, jobDescription);
    }, 1200);
    return () => clearTimeout(timer);
    // `step` left out on purpose: go() already saves on step change.
  }, [answers, jobDescription, finished, persist]); // eslint-disable-line react-hooks/exhaustive-deps

  function update(id: QuestionId, text: string) {
    dirtyRef.current = true;
    setAnswers((current) => ({ ...current, [id]: text }));
    setError(null);
  }

  function updateJobDescription(text: string) {
    dirtyRef.current = true;
    setJobDescription(text);
  }

  function go(nextStep: number) {
    const clamped = Math.min(Math.max(nextStep, 0), LAST_STEP);
    setStep(clamped);
    // Saving here covers pending edits too.
    dirtyRef.current = false;
    void persist(answers, clamped, jobDescription);
  }

  function generate() {
    if (isGenerating) return;
    const missing = missingRequired(answers);
    if (missing.length) {
      const first = QUESTIONS.findIndex((q) => q.id === missing[0]);
      setError("A few answers are still empty — filling them in makes a far better resume.");
      setStep(first);
      return;
    }
    setError(null);
    startGenerating(async () => {
      try {
        const result = await generateResumeAction(answers, jobDescription);
        if (result.ok) setFinished({ resumeId: result.resumeId, tailoring: result.tailoring });
        else setError(result.error);
      } catch {
        setError("Could not reach the server. Check your connection and try again.");
      }
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

  if (finished) return <Done resumeId={finished.resumeId} tailoring={finished.tailoring} />;

  return (
    <div className="flex flex-col gap-8">
      {isGenerating && (
        <LoadingOverlay
          node="Builder Node"
          icon="draft"
          heading={tailored ? "Tailoring your resume" : "Writing your resume"}
          message={
            tailored
              ? "Matching your answers against the job description and rewriting to its vocabulary. This takes up to a minute — keep this tab open."
              : "Turning your answers into an ATS-friendly resume. This takes up to a minute — keep this tab open."
          }
          status={tailored ? "Tailoring" : "Generating"}
          meta={[
            { label: "Version", value: "8.0.29-AI" },
            { label: "Region", value: "Global AI Hub" },
            { label: "Type", value: "Document Engine" },
            {
              label: "Target",
              value: tailored ? "Job description" : "General",
              highlight: true,
            },
          ]}
        />
      )}

      <Progress step={step} onJump={go} answers={answers} />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-label-caps text-primary uppercase">
            Question {step + 1} of {QUESTIONS.length}
          </span>
          <h2 id="wizard-question" className="text-headline-lg-mobile md:text-headline-lg text-on-surface">
            {question.title}
          </h2>
          <p className="text-body-sm text-on-surface-variant">{question.hint}</p>
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          rows={question.rows}
          disabled={isGenerating}
          aria-labelledby="wizard-question"
          placeholder={question.placeholder}
          onChange={(event) => update(question.id, event.target.value)}
          onKeyDown={onKeyDown}
          className="w-full bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:outline-none rounded-xl p-4 text-body-md text-on-surface placeholder:text-on-surface-variant/40 resize-y transition-colors"
        />

        <div className="flex items-center justify-between gap-4 min-h-[20px]">
          <span role="status" aria-live="polite" className="text-body-sm text-on-surface-variant">
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

      {/* JD sits on the last step: it shapes how all earlier answers are written. */}
      {step === LAST_STEP && (
        <JobDescriptionPanel
          value={jobDescription}
          onChange={updateJobDescription}
          disabled={isGenerating}
        />
      )}

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
            {isGenerating
              ? tailored
                ? "Tailoring your resume…"
                : "Writing your resume…"
              : tailored
                ? "Generate tailored resume"
                : "Generate resume"}
          </button>
        )}
      </div>
    </div>
  );
}

function JobDescriptionPanel({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(Boolean(value.trim()));
  const characters = value.length;

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/[0.04] p-4 md:p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span aria-hidden className="material-symbols-outlined text-primary text-[20px] leading-none mt-0.5">
            auto_fix_high
          </span>
          <div className="flex flex-col gap-1">
            <h3 className="text-body-md font-semibold text-on-surface">Tailor this to a job (optional)</h3>
            <p className="text-body-sm text-on-surface-variant">
              Paste the job description and the resume is rewritten in its vocabulary, with the
              most relevant work first. You also get the keyword read — matched and missing.
            </p>
          </div>
        </div>

        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 px-4 py-2 rounded-lg border border-primary/40 text-body-sm text-primary hover:bg-primary/10 transition-colors"
          >
            Paste JD
          </button>
        )}
      </div>

      {open && (
        <>
          <textarea
            value={value}
            rows={8}
            disabled={disabled}
            maxLength={MAX_JOB_DESCRIPTION}
            aria-label="Job description"
            placeholder={
              "Paste the full job posting — title, responsibilities, requirements.\nThe more of it you paste, the better the keyword match."
            }
            onChange={(event) => onChange(event.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:outline-none rounded-xl p-4 text-body-sm text-on-surface placeholder:text-on-surface-variant/40 resize-y transition-colors disabled:opacity-60"
          />
          <div className="flex items-center justify-between gap-4">
            <span className="text-body-sm text-on-surface-variant/60">
              Nothing is invented — a requirement your answers do not support is reported as a
              gap, never written into the resume.
            </span>
            <span className="text-body-sm text-on-surface-variant/60 shrink-0 tabular-nums">
              {characters.toLocaleString()} / {MAX_JOB_DESCRIPTION.toLocaleString()}
            </span>
          </div>
        </>
      )}
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
    <ol className="flex gap-1.5" aria-label="Questions">
      {QUESTIONS.map((question, index) => {
        const answered = Boolean(answers[question.id]?.trim());
        return (
          <li key={question.id} className="flex-1">
            {/* Tall hit area, thin visible bar. */}
            <button
              type="button"
              aria-label={`Step ${index + 1}: ${question.title}`}
              aria-current={index === step ? "step" : undefined}
              onClick={() => onJump(index)}
              className="w-full py-2 group"
            >
              <span
                className={`block h-1.5 rounded-full transition-colors ${
                  index === step
                    ? "bg-primary"
                    : answered
                      ? "bg-primary/40 group-hover:bg-primary/60"
                      : "bg-outline-variant/40 group-hover:bg-outline-variant/70"
                }`}
              />
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function Done({ resumeId, tailoring }: { resumeId: string; tailoring: Tailoring | null }) {
  return (
    <div className="flex flex-col gap-6 items-start">
      <div className="flex flex-col gap-2">
        <span className="text-label-caps text-primary uppercase">Ready</span>
        <h2 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">
          {tailoring ? "Your tailored resume is built." : "Your resume is built."}
        </h2>
        <p className="text-body-md text-on-surface-variant">
          {tailoring
            ? "One A4 page, ATS-safe, written against the job description you pasted."
            : "One A4 page, ATS-safe, no columns or graphics for a parser to choke on."}
        </p>
      </div>

      {tailoring && <KeywordReport tailoring={tailoring} />}

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

function KeywordReport({ tailoring }: { tailoring: Tailoring }) {
  const total = tailoring.matched.length + tailoring.missing.length;
  // No keywords: skip the panel instead of showing "0 of 0".
  if (!total) return null;

  const percent = Math.round((tailoring.matched.length / total) * 100);

  return (
    <div className="w-full rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-5 flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-body-md font-semibold text-on-surface">Keyword match</h3>
        <span className="text-body-md font-semibold text-primary tabular-nums">
          {percent}%
          <span className="text-body-sm text-on-surface-variant/60">
            {" "}
            ({tailoring.matched.length} of {total})
          </span>
        </span>
      </div>

      <div className="h-1.5 rounded-full bg-outline-variant/40 overflow-hidden">
        <div className="h-full bg-primary rounded-full" style={{ width: `${percent}%` }} />
      </div>

      {tailoring.matched.length > 0 && (
        <KeywordList
          title="Covered in your resume"
          items={tailoring.matched}
          className="border-primary/30 text-primary bg-primary/10"
        />
      )}

      {tailoring.missing.length > 0 && (
        <KeywordList
          title="Not backed by your answers"
          hint="Left out on purpose. Add real experience for any of these and rebuild — do not claim them."
          items={tailoring.missing}
          className="border-outline-variant/60 text-on-surface-variant"
        />
      )}
    </div>
  );
}

function KeywordList({
  title,
  hint,
  items,
  className,
}: {
  title: string;
  hint?: string;
  items: string[];
  className: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-label-caps text-on-surface-variant uppercase">{title}</span>
      {hint && <p className="text-body-sm text-on-surface-variant/60">{hint}</p>}
      <ul className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <li
            key={`${i}-${item}`}
            className={`px-3 py-1 rounded-full border text-body-sm ${className}`}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
