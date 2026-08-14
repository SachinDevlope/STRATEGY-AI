import { extractText, getDocumentProxy } from "unpdf";
import { MAX_RESUME_CHARS } from "@/lib/analysis";

/**
 * Pulls plain text out of an uploaded resume PDF.
 *
 * unpdf ships a serverless build of PDF.js, so this runs on a Vercel Function
 * without a worker file or a native binary. Text-layer only: a scanned resume
 * has no text layer and comes back empty, which the caller turns into a
 * "export a real PDF" message rather than sending an empty prompt to the model.
 */
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return normalize(text);
}

/**
 * PDF text arrives with per-item spacing artefacts: stray double spaces, a
 * line break per visual line, and long runs of blank lines between sections.
 * Collapsing them keeps the prompt small without losing structure.
 */
function normalize(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_RESUME_CHARS);
}
