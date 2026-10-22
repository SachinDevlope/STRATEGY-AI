"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { startInterviewAction } from "@/app/dashboard/interview/actions";
import { LoadingOverlay } from "@/components/LoadingScreen";
import {
  DEFAULT_QUESTIONS,
  EXPERIENCE_LEVELS,
  INTERVIEW_TYPES,
  LEVEL_LABELS,
  MAX_INTERVIEW_JD_CHARS,
  MAX_QUESTIONS,
  MIN_QUESTIONS,
  TYPE_LABELS,
  type ExperienceLevel,
  type InterviewType,
} from "@/lib/mock-interview";

export type SavedJobOption = {
  id: string;
  title: string;
  company?: string;
  preview: string;
};

const QUESTION_COUNTS = Array.from(
  { length: MAX_QUESTIONS - MIN_QUESTIONS + 1 },
  (_, i) => MIN_QUESTIONS + i
);

const inputClass =
  "w-full bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:outline-none rounded-xl p-4 text-body-md text-on-surface placeholder:text-on-surface-variant/40 transition-colors";

export default function InterviewSetupForm({
  savedJobDescriptions,
}: {
  savedJobDescriptions: SavedJobOption[];
}) {
  const router = useRouter();

  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [level, setLevel] = useState<ExperienceLevel>("junior");
  const [type, setType] = useState<InterviewType>("mixed");
  const [questionCount, setQuestionCount] = useState(DEFAULT_QUESTIONS);
  const [pickingSaved, setPickingSaved] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [jobText, setJobText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickSaved(jd: SavedJobOption) {
    setSavedId(jd.id);
    // Saves retyping, but never overwrites what the user already wrote.
    if (!role.trim()) setRole(jd.title);
    if (!company.trim() && jd.company) setCompany(jd.company);
  }

  async function start(event: React.FormEvent) {
    event.preventDefault();
    if (!role.trim()) {
      setError("Name the role you are interviewing for.");
      return;
    }
    if (jobText.length > MAX_INTERVIEW_JD_CHARS) {
      setError("That job description is too long — trim it to the role and requirements.");
      return;
    }

    setError(null);
    setBusy(true);
    try {
      const result = await startInterviewAction({
        role,
        company,
        level,
        type,
        questionCount,
        ...(pickingSaved && savedId ? { jobDescriptionId: savedId } : { jobDescription: jobText }),
      });
      if (!result.ok) {
        setError(result.error);
        setBusy(false);
        return;
      }
      router.push(`/dashboard/interview/${result.interviewId}`);
    } catch {
      // Network drop or timeout — don't leave the overlay stuck.
      setError("Could not reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={start} className="flex flex-col gap-8" noValidate>
      {busy && (
        <LoadingOverlay
          heading="Your interviewer is getting ready"
          message="Reading the role and preparing the first question."
          icon="record_voice_over"
          status="Preparing"
          steps={[
            { label: "Reading the role and your level", state: "done" },
            { label: "Writing the first question", state: "active" },
          ]}
          meta={[]}
        />
      )}

      <div className="flex flex-col gap-3">
        <span className="text-label-caps text-primary uppercase">Step 1</span>
        <h2 className="text-body-md font-bold text-on-surface">The role</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={role}
            disabled={busy}
            required
            maxLength={120}
            aria-label="Role title"
            placeholder="Role title — e.g. Frontend Engineer"
            onChange={(event) => setRole(event.target.value)}
            className={inputClass}
          />
          <input
            value={company}
            disabled={busy}
            maxLength={120}
            aria-label="Company (optional)"
            placeholder="Company (optional)"
            onChange={(event) => setCompany(event.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <fieldset className="flex flex-col gap-3" disabled={busy}>
        <legend className="text-body-md font-bold text-on-surface mb-3">Your experience level</legend>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {EXPERIENCE_LEVELS.map((value) => (
            <Choice
              key={value}
              name="level"
              checked={level === value}
              onChange={() => setLevel(value)}
              label={LEVEL_LABELS[value]}
            />
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <fieldset className="flex flex-col gap-3" disabled={busy}>
          <legend className="text-body-md font-bold text-on-surface mb-3">Interview type</legend>
          <div className="grid grid-cols-3 gap-2">
            {INTERVIEW_TYPES.map((value) => (
              <Choice
                key={value}
                name="type"
                checked={type === value}
                onChange={() => setType(value)}
                label={TYPE_LABELS[value]}
              />
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-3">
          <label htmlFor="question-count" className="text-body-md font-bold text-on-surface">
            Main questions
          </label>
          <select
            id="question-count"
            value={questionCount}
            disabled={busy}
            onChange={(event) => setQuestionCount(Number(event.target.value))}
            className={inputClass}
          >
            {QUESTION_COUNTS.map((count) => (
              <option key={count} value={count}>
                {count} questions{count === DEFAULT_QUESTIONS ? " (recommended)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-label-caps text-primary uppercase">Step 2 — optional</span>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-body-md font-bold text-on-surface">
            {pickingSaved ? "Use a saved job description" : "Paste the job description"}
          </h2>
          {savedJobDescriptions.length > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const next = !pickingSaved;
                setPickingSaved(next);
                if (next) pickSaved(savedJobDescriptions[0]);
                else setSavedId(null);
                setError(null);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-outline-variant/60 text-body-sm text-on-surface-variant hover:text-on-surface hover:border-primary/60 disabled:opacity-40 transition-colors"
            >
              <span aria-hidden className="material-symbols-outlined text-[18px]">
                {pickingSaved ? "edit_note" : "history"}
              </span>
              {pickingSaved ? "Paste one instead" : `Saved (${savedJobDescriptions.length})`}
            </button>
          )}
        </div>

        {pickingSaved ? (
          <div
            role="radiogroup"
            aria-label="Saved job descriptions"
            className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1"
          >
            {savedJobDescriptions.map((jd) => {
              const selected = savedId === jd.id;
              return (
                <button
                  key={jd.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={busy}
                  onClick={() => pickSaved(jd)}
                  className={`text-left rounded-xl border p-4 flex items-start gap-3 transition-colors disabled:opacity-40 ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-outline-variant/60 hover:border-primary/40"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`material-symbols-outlined text-[20px] mt-0.5 shrink-0 ${
                      selected ? "text-primary" : "text-on-surface-variant/40"
                    }`}
                  >
                    {selected ? "radio_button_checked" : "radio_button_unchecked"}
                  </span>
                  <span className="flex flex-col gap-1 min-w-0">
                    <span className="text-body-md text-on-surface break-words">
                      {jd.title}
                      {jd.company && (
                        <span className="text-on-surface-variant"> — {jd.company}</span>
                      )}
                    </span>
                    <span className="text-body-sm text-on-surface-variant/60 line-clamp-2">
                      {jd.preview}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <textarea
              value={jobText}
              rows={8}
              disabled={busy}
              aria-label="Job description (optional)"
              placeholder="Paste the job description and the questions get specific to it. Leave empty for a general interview for the role."
              onChange={(event) => setJobText(event.target.value)}
              className={`${inputClass} resize-y`}
            />
            <p
              className={`text-body-sm self-end ${
                jobText.length > MAX_INTERVIEW_JD_CHARS ? "text-error" : "text-on-surface-variant/60"
              }`}
            >
              {jobText.length.toLocaleString("en-US")} / {MAX_INTERVIEW_JD_CHARS.toLocaleString("en-US")}
            </p>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-4">
        <p className="text-body-sm text-on-surface-variant/60 hidden md:block">
          Answer by typing or out loud. You get a scorecard at the end.
        </p>
        <button
          type="submit"
          disabled={busy || !role.trim()}
          className="w-full md:w-auto px-6 py-3 rounded-lg bg-primary text-on-primary font-semibold text-body-md hover:bg-primary-fixed disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
        >
          <span aria-hidden className="material-symbols-outlined text-[20px]">
            record_voice_over
          </span>
          {busy ? "Starting…" : "Start interview"}
        </button>
      </div>
    </form>
  );
}

function Choice({
  name,
  checked,
  onChange,
  label,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label
      className={`cursor-pointer rounded-xl border px-3 py-3 text-body-sm text-center transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
        checked
          ? "border-primary text-primary bg-primary/5"
          : "border-outline-variant/60 text-on-surface-variant hover:text-on-surface"
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
      {label}
    </label>
  );
}
