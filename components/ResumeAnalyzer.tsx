"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  analyzeTextAction,
  analyzeUploadAction,
} from "@/app/dashboard/resume/analyze/actions";
import { LoadingOverlay } from "@/components/LoadingScreen";
import {
  MAX_UPLOAD_BYTES,
  MIN_JD_CHARS,
  MIN_PASTED_RESUME_CHARS,
  MULTIPART_THRESHOLD_BYTES,
  safeFileName,
  uploadPrefix,
  validatePdfFile,
} from "@/lib/analysis";

export type JobDescriptionOption = {
  id: string;
  title: string;
  company?: string;
  preview: string;
};

const NEW_JD = "new";

type Phase = "idle" | "uploading" | "analyzing";
// Resume source: uploaded PDF or pasted text.
type Source = "pdf" | "text";

export default function ResumeAnalyzer({
  userId,
  savedJobDescriptions,
}: {
  userId: string;
  savedJobDescriptions: JobDescriptionOption[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [source, setSource] = useState<Source>("pdf");
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  // Default to a new JD, the common case.
  const [jdChoice, setJdChoice] = useState<string>(NEW_JD);
  const [pickingSaved, setPickingSaved] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [jobCompany, setJobCompany] = useState("");
  const [jobText, setJobText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const busy = phase !== "idle";
  const usingNewJd = jdChoice === NEW_JD;
  const usingText = source === "text";
  const ready = usingText ? resumeText.trim().length > 0 : file !== null;

  function pick(next: File | null | undefined) {
    if (!next) return;
    const problem = validatePdfFile(next);
    if (problem) {
      setError(problem);
      setFile(null);
      return;
    }
    setError(null);
    setFile(next);
  }

  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (busy) return;
    pick(event.dataTransfer.files?.[0]);
  }

  // Same checks as the server, for instant feedback.
  function firstProblem(): string | null {
    if (usingText) {
      if (resumeText.trim().length < MIN_PASTED_RESUME_CHARS) {
        return (
          "Write a bit more about yourself — roles, tools, and what you have " +
          "actually built. A couple of lines cannot be scored."
        );
      }
    } else if (!file) {
      return "Choose a PDF resume first.";
    }
    if (usingNewJd) {
      // Needed so the saved JD can be found later.
      if (!jobTitle.trim()) {
        return "Name the role — that is how you will recognise this description later.";
      }
      if (jobText.trim().length < MIN_JD_CHARS) {
        return "Paste the full job description — a line or two is not enough to score against.";
      }
    }
    return null;
  }

  // Job fields, shared by both sources.
  function jobFields() {
    return usingNewJd
      ? { jobTitle, jobCompany, jobText }
      : { jobDescriptionId: jdChoice };
  }

  async function run() {
    const problem = firstProblem();
    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    setProgress(0);

    if (usingText) {
      setPhase("analyzing");
      try {
        const result = await analyzeTextAction({ resumeText, ...jobFields() });
        if (!result.ok) {
          setError(result.error);
          setPhase("idle");
          return;
        }
        router.push(`/dashboard/resume/analyze/${result.analysisId}`);
      } catch {
        // Network drop or timeout — don't leave the overlay stuck.
        setError("Could not reach the server. Check your connection and try again.");
        setPhase("idle");
      }
      return;
    }

    if (!file) return;
    setPhase("uploading");

    try {
      // Upload straight to Blob so big files skip our server.
      // Large files go in parallel parts that retry on their own.
      const blob = await upload(
        `${uploadPrefix(userId)}${safeFileName(file.name)}`,
        file,
        {
          access: "private",
          handleUploadUrl: "/api/resume/upload",
          contentType: "application/pdf",
          multipart: file.size > MULTIPART_THRESHOLD_BYTES,
          onUploadProgress: ({ percentage }) => setProgress(percentage),
        }
      );

      setPhase("analyzing");

      const result = await analyzeUploadAction({
        pathname: blob.pathname,
        fileName: file.name,
        ...jobFields(),
      });

      if (!result.ok) {
        setError(result.error);
        setPhase("idle");
        return;
      }

      router.push(`/dashboard/resume/analyze/${result.analysisId}`);
    } catch (uploadError) {
      setError(uploadMessage(uploadError));
      setPhase("idle");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {busy && (
        <LoadingOverlay
          heading={
            phase === "uploading"
              ? "Uploading your resume"
              : "Your analysis is being prepared"
          }
          message={
            phase === "uploading"
              ? "Sending the PDF straight to private storage. Keep this tab open."
              : usingText
                ? "Scoring what you wrote against the job description. This takes up to a minute — keep this tab open."
                : "Reading the PDF and scoring it against the job description. This takes up to a minute — keep this tab open."
          }
          icon={phase === "uploading" ? "cloud_upload" : "neurology"}
          status={phase === "uploading" ? "Uploading" : "Analysing"}
          // Only the upload has real progress; the AI step just sweeps.
          {...(phase === "uploading" ? { progress } : {})}
          steps={
            usingText
              ? [
                  { label: "Reading what you wrote", state: "done" },
                  {
                    label: "Scoring it against the job description",
                    state: "active",
                  },
                ]
              : [
                  {
                    label: "Uploading the PDF",
                    state: phase === "uploading" ? "active" : "done",
                  },
                  {
                    label: "Reading the text out of it",
                    state: phase === "uploading" ? "waiting" : "done",
                  },
                  {
                    label: "Scoring it against the job description",
                    state: phase === "uploading" ? "waiting" : "active",
                  },
                ]
          }
          meta={[
            { label: "Version", value: "8.0.29-AI" },
            { label: "Region", value: "Global AI Hub" },
            { label: "Type", value: "Neural Processing" },
            {
              label: usingText ? "Source" : "File",
              value: usingText ? "Pasted description" : (file?.name ?? "—"),
              highlight: true,
            },
          ]}
        />
      )}

      <div className="flex flex-col gap-3">
        <span className="text-label-caps text-primary uppercase">Step 1</span>
        <h2 className="text-body-md font-bold text-on-surface">
          {usingText ? "Describe yourself" : "Upload your resume"}
        </h2>

        <div className="flex gap-2" role="group" aria-label="Resume source">
          {(
            [
              ["pdf", "Upload a PDF"],
              ["text", "Paste text instead"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={source === value}
              disabled={busy}
              onClick={() => {
                setSource(value);
                setError(null);
              }}
              className={`px-4 py-2 rounded-lg text-body-sm border transition-colors disabled:opacity-40 ${
                source === value
                  ? "border-primary text-primary bg-primary/5"
                  : "border-outline-variant/60 text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {usingText ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={resumeText}
              rows={12}
              disabled={busy}
              aria-label="Resume text"
              placeholder="Paste your resume, or write about yourself: roles and how long, the tools you use, what you have built, education, anything you are proud of."
              onChange={(event) => setResumeText(event.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:outline-none rounded-xl p-4 text-body-md text-on-surface placeholder:text-on-surface-variant/40 resize-y transition-colors"
            />
            <p className="text-body-sm text-on-surface-variant/60">
              The report is only as specific as what you write here — vague input
              scores vaguely.
            </p>
          </div>
        ) : (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            if (!busy) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`rounded-xl border border-dashed p-8 flex flex-col items-center gap-3 text-center transition-colors ${
            dragging ? "border-primary bg-primary/5" : "border-outline-variant/60"
          } ${busy ? "opacity-60" : ""}`}
        >
          <span aria-hidden className="material-symbols-outlined text-primary">upload_file</span>
          <p className="text-body-md text-on-surface break-all max-w-full">
            {file ? file.name : "Drop your PDF here"}
          </p>
          <p className="text-body-sm text-on-surface-variant">
            {file
              ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
              : `PDF only, up to ${MAX_UPLOAD_BYTES / 1024 / 1024} MB. Text PDFs only — a scan has nothing to read.`}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="px-5 py-2.5 rounded-lg border border-outline-variant/60 text-body-sm text-on-surface hover:border-primary/60 disabled:opacity-40 transition-colors"
          >
            {file ? "Choose a different file" : "Browse files"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(event) => {
              pick(event.target.files?.[0]);
              // Reset so picking the same file again still fires onChange.
              event.target.value = "";
            }}
          />
        </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-label-caps text-primary uppercase">Step 2</span>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-body-md font-bold text-on-surface">
            {pickingSaved ? "Reuse a saved job description" : "Paste the job description"}
          </h2>

          {savedJobDescriptions.length > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const next = !pickingSaved;
                setPickingSaved(next);
                setJdChoice(next ? savedJobDescriptions[0].id : NEW_JD);
                setError(null);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-outline-variant/60 text-body-sm text-on-surface-variant hover:text-on-surface hover:border-primary/60 disabled:opacity-40 transition-colors"
            >
              <span aria-hidden className="material-symbols-outlined text-[18px]">
                {pickingSaved ? "edit_note" : "history"}
              </span>
              {pickingSaved
                ? "Paste a new one"
                : `Recent (${savedJobDescriptions.length})`}
            </button>
          )}
        </div>

        {/* A list, not a <select>, so each JD's preview line is visible. */}
        {pickingSaved && (
          <div
            role="radiogroup"
            aria-label="Saved job descriptions"
            className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1"
          >
            {savedJobDescriptions.map((jd) => {
              const selected = jdChoice === jd.id;
              return (
                <button
                  key={jd.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={busy}
                  onClick={() => setJdChoice(jd.id)}
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
                    <span className="text-body-md text-on-surface">
                      {jd.title}
                      {jd.company && (
                        <span className="text-on-surface-variant">
                          {" "}
                          — {jd.company}
                        </span>
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
        )}

        {usingNewJd && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={jobTitle}
                disabled={busy}
                aria-label="Role title"
                placeholder="Role title — e.g. Senior Backend Engineer"
                onChange={(event) => setJobTitle(event.target.value)}
                className="bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:outline-none rounded-xl p-4 text-body-md text-on-surface placeholder:text-on-surface-variant/40 transition-colors"
              />
              <input
                value={jobCompany}
                disabled={busy}
                aria-label="Company"
                placeholder="Company (optional)"
                onChange={(event) => setJobCompany(event.target.value)}
                className="bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:outline-none rounded-xl p-4 text-body-md text-on-surface placeholder:text-on-surface-variant/40 transition-colors"
              />
            </div>
            <textarea
              value={jobText}
              rows={10}
              disabled={busy}
              aria-label="Job description"
              placeholder="Paste the full job description — responsibilities, requirements, the lot."
              onChange={(event) => setJobText(event.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:outline-none rounded-xl p-4 text-body-md text-on-surface placeholder:text-on-surface-variant/40 resize-y transition-colors"
            />
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
          {usingText
            ? "Nothing is uploaded — only the text you wrote is scored."
            : "Your file is stored privately — only you can open it."}
        </p>
        <button
          type="button"
          onClick={run}
          disabled={busy || !ready}
          className="px-6 py-3 rounded-lg bg-primary text-on-primary font-semibold text-body-md hover:bg-primary-fixed disabled:opacity-60 transition-colors"
        >
          {phase === "uploading"
            ? "Uploading…"
            : phase === "analyzing"
              ? "Analysing…"
              : "Analyse resume"}
        </button>
      </div>
    </div>
  );
}

// The SDK hides the real error, so map it to a helpful message.
function uploadMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/client token/i.test(message)) {
    return (
      "Could not start the upload. Your session may have expired — reload and " +
      "sign in again. If it keeps happening, resume storage is not configured " +
      "on this deployment."
    );
  }
  return message || "The upload failed. Check your connection and try again.";
}
