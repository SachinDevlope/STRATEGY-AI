import { extractText, getDocumentProxy } from "unpdf";
import { MAX_RESUME_CHARS } from "@/lib/analysis";

// Gets text from a resume PDF. Scanned PDFs have no text and come back empty.
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return normalize(text);
}

// Collapse extra spaces and blank lines to keep the prompt small.
function normalize(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_RESUME_CHARS);
}
