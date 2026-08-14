"use server";

import {
  MAX_JD_CHARS,
  MAX_RESUME_CHARS,
  MAX_UPLOAD_BYTES,
  MIN_JD_CHARS,
  MIN_PASTED_RESUME_CHARS,
  MIN_RESUME_CHARS,
  uploadPrefix,
} from "@/lib/analysis";
import {
  getJobDescription,
  insertAnalysis,
  insertJobDescription,
  type StoredJobDescription,
} from "@/lib/analysis-store";
import { deletePdf, getUploadedPdfBytes, headPdf } from "@/lib/blob";
import { generateInterviewReport } from "@/lib/interview-report";
import { extractPdfText } from "@/lib/pdf/extract";
import { requireUserId } from "@/lib/session";

/** The job description half of a request, shared by both analysis routes. */
export type JobInput = {
  /** Reuse a job description already saved by this user. */
  jobDescriptionId?: string;
  /** Or supply a new one, which is saved so it can be reused later. */
  jobTitle?: string;
  jobCompany?: string;
  jobText?: string;
};

/** What the client sends once the browser's direct Blob upload has finished. */
export type AnalyzeInput = JobInput & {
  /** Blob pathname returned by upload(). Authoritative — the URL is not. */
  pathname: string;
  url: string;
  fileName: string;
};

/** What the client sends when the candidate typed their own description instead. */
export type AnalyzeTextInput = JobInput & {
  /** Resume text or a self-description, pasted into the box. */
  resumeText: string;
};

export type AnalyzeResult =
  | { ok: true; analysisId: string }
  | { ok: false; error: string };

/**
 * Resolves the job description the analysis runs against: either one the user
 * already saved, or a newly pasted one, which is persisted first so the stored
 * analysis always points at the exact text it was scored against.
 */
async function resolveJobDescription(
  userId: string,
  input: JobInput
): Promise<StoredJobDescription> {
  if (input.jobDescriptionId) {
    const existing = await getJobDescription(userId, input.jobDescriptionId);
    if (!existing) throw new Error("That job description no longer exists.");
    return existing;
  }

  const text = input.jobText?.trim() ?? "";
  if (text.length < MIN_JD_CHARS) {
    throw new Error("Paste the full job description — a line or two is not enough to score against.");
  }

  // Saved descriptions are picked from a list later, so an unnamed one is
  // unusable. Rejected rather than defaulted to a placeholder title.
  const title = input.jobTitle?.trim().slice(0, 120);
  if (!title) {
    throw new Error("Name the role — that is how you will recognise this description later.");
  }

  return insertJobDescription(userId, {
    title,
    company: input.jobCompany?.trim().slice(0, 120) || undefined,
    text: text.slice(0, MAX_JD_CHARS),
  });
}

/**
 * Runs after the browser has uploaded the PDF straight to Blob storage. Reads
 * the file back, extracts its text, scores it against the job description, and
 * stores the blob URL alongside the analysis.
 *
 * Every failure path deletes the orphaned upload, so a resume that could not be
 * analysed does not sit in the store with nothing pointing at it.
 */
export async function analyzeUploadAction(input: AnalyzeInput): Promise<AnalyzeResult> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: "Your session expired. Sign in again to continue." };
  }

  // The client controls this string, so it is re-checked here rather than
  // trusted because the token check already passed.
  if (!input.pathname?.startsWith(uploadPrefix(userId))) {
    return { ok: false, error: "That upload does not belong to this account." };
  }

  try {
    const jd = await resolveJobDescription(userId, input);

    // head() confirms the blob really landed and is the size and type the token
    // allowed — the client's own report of either is not evidence.
    const meta = await headPdf(input.pathname);
    if (meta.size > MAX_UPLOAD_BYTES) {
      throw new Error("That file is larger than the 10 MB limit.");
    }
    if (meta.contentType !== "application/pdf") {
      throw new Error("Only PDF resumes can be analysed.");
    }

    const bytes = await getUploadedPdfBytes(input.pathname);
    if (!bytes) throw new Error("The uploaded file could not be read back.");

    const resumeText = await extractPdfText(bytes);
    if (resumeText.length < MIN_RESUME_CHARS) {
      throw new Error(
        "No readable text in that PDF. It looks like a scan or an image — " +
          "export the resume from your editor as a text PDF and upload again."
      );
    }

    const analysis = await generateInterviewReport({
      resumeText,
      jobTitle: jd.title,
      ...(jd.company ? { jobCompany: jd.company } : {}),
      jobText: jd.text,
    });

    const analysisId = await insertAnalysis({
      userId,
      source: "pdf",
      resumeUrl: input.url,
      resumePathname: input.pathname,
      fileName: input.fileName.slice(0, 200),
      fileSize: meta.size,
      jobDescriptionId: jd._id,
      jobTitle: jd.title,
      data: analysis,
    });

    return { ok: true, analysisId };
  } catch (error) {
    await discardUpload(input.pathname);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not analyse that resume.",
    };
  }
}

/**
 * The same analysis without a file: the candidate typed a resume or a plain
 * self-description into the box. Nothing is uploaded, so there is nothing to
 * clean up on failure.
 */
export async function analyzeTextAction(
  input: AnalyzeTextInput
): Promise<AnalyzeResult> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: "Your session expired. Sign in again to continue." };
  }

  try {
    const resumeText = input.resumeText?.trim() ?? "";
    if (resumeText.length < MIN_PASTED_RESUME_CHARS) {
      throw new Error(
        "Write a bit more about yourself — roles, tools, and what you have " +
          "actually built. A couple of lines cannot be scored."
      );
    }

    const jd = await resolveJobDescription(userId, input);

    const analysis = await generateInterviewReport({
      resumeText: resumeText.slice(0, MAX_RESUME_CHARS),
      jobTitle: jd.title,
      ...(jd.company ? { jobCompany: jd.company } : {}),
      jobText: jd.text,
    });

    const analysisId = await insertAnalysis({
      userId,
      source: "text",
      jobDescriptionId: jd._id,
      jobTitle: jd.title,
      data: analysis,
    });

    return { ok: true, analysisId };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Could not analyse that description.",
    };
  }
}

/** Best-effort cleanup — a failed delete must not mask the original error. */
async function discardUpload(pathname: string) {
  try {
    await deletePdf(pathname);
  } catch (error) {
    console.error("Failed to delete orphaned resume upload:", error);
  }
}
