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
import { UserError, userMessage } from "@/lib/errors";
import { generateInterviewReport } from "@/lib/interview-report";
import { extractPdfText } from "@/lib/pdf/extract";
import { limitAi } from "@/lib/rate-limit";
import { requireUserId } from "@/lib/session";

/** Job description part of a request: a saved id, or new text to save. */
export type JobInput = {
  jobDescriptionId?: string;
  jobTitle?: string;
  jobCompany?: string;
  jobText?: string;
};

/** Sent after the browser finishes its direct Blob upload. */
export type AnalyzeInput = JobInput & {
  /** Blob pathname from upload(). */
  pathname: string;
  fileName: string;
};

/** Sent when the user typed their resume instead of uploading. */
export type AnalyzeTextInput = JobInput & {
  resumeText: string;
};

export type AnalyzeResult =
  | { ok: true; analysisId: string }
  | { ok: false; error: string };

/** Loads a saved JD, or validates and saves a new one. */
async function resolveJobDescription(
  userId: string,
  input: JobInput
): Promise<StoredJobDescription> {
  if (input.jobDescriptionId) {
    const existing = await getJobDescription(userId, input.jobDescriptionId);
    if (!existing) throw new UserError("That job description no longer exists.");
    return existing;
  }

  const text = input.jobText?.trim() ?? "";
  if (text.length < MIN_JD_CHARS) {
    throw new UserError("Paste the full job description — a line or two is not enough to score against.");
  }

  // Saved JDs are picked by name later, so a title is required.
  const title = input.jobTitle?.trim().slice(0, 120);
  if (!title) {
    throw new UserError("Name the role — that is how you will recognise this description later.");
  }

  return insertJobDescription(userId, {
    title,
    company: input.jobCompany?.trim().slice(0, 120) || undefined,
    text: text.slice(0, MAX_JD_CHARS),
  });
}

/**
 * Scores an uploaded PDF against a job description.
 * On any failure the upload is deleted so no orphan blobs are left.
 */
export async function analyzeUploadAction(input: AnalyzeInput): Promise<AnalyzeResult> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (error) {
    return { ok: false, error: userMessage(error, "Sign in again to continue.") };
  }

  // Client-controlled, so re-check ownership here.
  if (!input.pathname?.startsWith(uploadPrefix(userId))) {
    return { ok: false, error: "That upload does not belong to this account." };
  }

  try {
    await limitAi(userId);
    const jd = await resolveJobDescription(userId, input);

    // Trust the stored blob's size and type, not the client.
    const meta = await headPdf(input.pathname);
    if (meta.size > MAX_UPLOAD_BYTES) {
      throw new UserError("That file is larger than the 10 MB limit.");
    }
    if (meta.contentType !== "application/pdf") {
      throw new UserError("Only PDF resumes can be analysed.");
    }

    const bytes = await getUploadedPdfBytes(input.pathname);
    if (!bytes) throw new UserError("The uploaded file could not be read back.");

    const resumeText = await extractPdfText(bytes);
    if (resumeText.length < MIN_RESUME_CHARS) {
      throw new UserError(
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
      resumeUrl: meta.url,
      resumePathname: input.pathname,
      fileName: String(input.fileName ?? "").slice(0, 200),
      fileSize: meta.size,
      jobDescriptionId: jd._id,
      jobTitle: jd.title,
      data: analysis,
    });

    return { ok: true, analysisId };
  } catch (error) {
    await discardUpload(input.pathname);
    return { ok: false, error: userMessage(error, "Could not analyse that resume. Try again.") };
  }
}

/** Same analysis from typed text. Nothing to clean up on failure. */
export async function analyzeTextAction(
  input: AnalyzeTextInput
): Promise<AnalyzeResult> {
  try {
    const userId = await requireUserId();

    const resumeText = input.resumeText?.trim() ?? "";
    if (resumeText.length < MIN_PASTED_RESUME_CHARS) {
      throw new UserError(
        "Write a bit more about yourself — roles, tools, and what you have " +
          "actually built. A couple of lines cannot be scored."
      );
    }

    await limitAi(userId);
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
    return { ok: false, error: userMessage(error, "Could not analyse that description. Try again.") };
  }
}

/** Best effort — a failed delete must not hide the original error. */
async function discardUpload(pathname: string) {
  try {
    await deletePdf(pathname);
  } catch (error) {
    console.error("Failed to delete orphaned resume upload:", error);
  }
}
