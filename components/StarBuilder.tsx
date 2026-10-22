"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { buildStarStoryAction } from "@/app/dashboard/star/actions";
import { LoadingOverlay } from "@/components/LoadingScreen";
import {
  MAX_NOTES_CHARS,
  MAX_QUESTION_CHARS,
  MAX_ROLE_CHARS,
  MIN_NOTES_CHARS,
  STAR_QUESTION_PRESETS,
  validateStarInput,
} from "@/lib/star";

export type StarBuilderInitial = { question?: string; notes?: string; role?: string };

const FIELD =
  "w-full bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:outline-none rounded-xl p-4 text-body-md text-on-surface placeholder:text-on-surface-variant/40 transition-colors disabled:opacity-60";

export default function StarBuilder({ initial }: { initial?: StarBuilderInitial }) {
  const router = useRouter();
  const ids = useId();

  const [question, setQuestion] = useState(initial?.question ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notesLength = notes.trim().length;
  const notesShort = notesLength < MIN_NOTES_CHARS;

  async function build() {
    // Same checks as the server, for instant feedback.
    const checked = validateStarInput({ question, notes, role });
    if (!checked.ok) {
      setError(checked.error);
      return;
    }

    setError(null);
    setBusy(true);
    try {
      const result = await buildStarStoryAction(checked.value);
      if (!result.ok) {
        setError(result.error);
        setBusy(false);
        return;
      }
      router.push(`/dashboard/star/${result.storyId}`);
    } catch {
      // Network drop or timeout — don't leave the overlay stuck.
      setError("Could not reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(event) => {
        event.preventDefault();
        void build();
      }}
    >
      {busy && (
        <LoadingOverlay
          heading="Structuring your story"
          message="Turning your notes into Situation, Task, Action and Result. This takes up to a minute — keep this tab open."
          icon="auto_stories"
          status="Building"
        />
      )}

      <fieldset className="flex flex-col gap-3 min-w-0" disabled={busy}>
        <legend className="text-body-md font-bold text-on-surface mb-3">
          1. Pick the question
        </legend>
        <div className="flex flex-wrap gap-2">
          {STAR_QUESTION_PRESETS.map((preset) => {
            const selected = question.trim() === preset;
            return (
              <button
                key={preset}
                type="button"
                aria-pressed={selected}
                onClick={() => setQuestion(preset)}
                className={`text-left text-body-sm px-3 py-2 rounded-full border transition-colors max-w-full ${
                  selected
                    ? "border-primary bg-primary/15 text-on-surface"
                    : "border-outline-variant/60 text-on-surface-variant hover:border-primary/50"
                }`}
              >
                {preset}
              </button>
            );
          })}
        </div>
        <label htmlFor={`${ids}-question`} className="text-body-sm text-on-surface-variant mt-2">
          Or type your own question
        </label>
        <input
          id={`${ids}-question`}
          value={question}
          maxLength={MAX_QUESTION_CHARS}
          placeholder="Tell me about a time when…"
          onChange={(event) => setQuestion(event.target.value)}
          className={FIELD}
        />
      </fieldset>

      <div className="flex flex-col gap-3">
        <label htmlFor={`${ids}-notes`} className="text-body-md font-bold text-on-surface">
          2. Your rough notes
        </label>
        <p id={`${ids}-notes-hint`} className="text-body-sm text-on-surface-variant">
          What was going on, what you were responsible for, what you actually did, and how it
          ended. Bullet points are fine. Only what you write is used — nothing is made up.
        </p>
        <textarea
          id={`${ids}-notes`}
          aria-describedby={`${ids}-notes-hint ${ids}-notes-count`}
          value={notes}
          rows={10}
          disabled={busy}
          maxLength={MAX_NOTES_CHARS}
          placeholder="e.g. Our release was two weeks out when the payments vendor changed their API…"
          onChange={(event) => setNotes(event.target.value)}
          className={`${FIELD} resize-y`}
        />
        <p
          id={`${ids}-notes-count`}
          className={`text-body-sm self-end ${notesShort ? "text-on-surface-variant/60" : "text-on-surface-variant"}`}
        >
          {notesLength} / {MAX_NOTES_CHARS}
          {notesShort && ` — at least ${MIN_NOTES_CHARS}`}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <label htmlFor={`${ids}-role`} className="text-body-md font-bold text-on-surface">
          3. Target role <span className="font-normal text-on-surface-variant">(optional)</span>
        </label>
        <input
          id={`${ids}-role`}
          value={role}
          disabled={busy}
          maxLength={MAX_ROLE_CHARS}
          placeholder="e.g. Product Manager"
          onChange={(event) => setRole(event.target.value)}
          className={FIELD}
        />
      </div>

      {error && (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={busy || !question.trim() || notesShort}
          className="w-full sm:w-auto px-6 py-3 rounded-lg bg-primary text-on-primary font-semibold text-body-md hover:bg-primary-fixed disabled:opacity-60 transition-colors"
        >
          {busy ? "Building…" : "Build STAR story"}
        </button>
      </div>
    </form>
  );
}
