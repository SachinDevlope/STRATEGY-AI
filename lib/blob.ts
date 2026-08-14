import { del, get, head, put } from "@vercel/blob";

/** @vercel/blob does not export its body type, so derive it from put(). */
type PutBody = Parameters<typeof put>[1];

/**
 * Generated PDFs are stored privately: the blob URL is not publicly readable,
 * so every download has to go back through a route handler that checks the
 * session first. Reads use get() with the store's read-write token.
 */
const ACCESS = "private" as const;

/** Namespaces blobs per user so one session can never read another's output. */
export function pdfPathname(userId: string, reportId: string) {
  return `reports/${userId}/${reportId}.pdf`;
}

export async function putPdf(pathname: string, body: PutBody) {
  return put(pathname, body, {
    access: ACCESS,
    contentType: "application/pdf",
    // Pathnames are derived from ids, so a re-generated report replaces the
    // old file instead of erroring.
    allowOverwrite: true,
  });
}

/** Metadata only (size, contentType, uploadedAt) — no body transfer. */
export async function headPdf(pathname: string) {
  return head(pathname);
}

export async function deletePdf(pathname: string) {
  return del(pathname);
}

/**
 * Uploaded resumes use the same private store as generated PDFs: the browser
 * writes them directly with a short-lived client token, and every read after
 * that goes through a route handler that checks the session first.
 */
export async function getUploadedPdfBytes(pathname: string): Promise<Uint8Array | null> {
  const result = await get(pathname, { access: ACCESS });
  if (!result || result.statusCode !== 200) return null;
  return new Uint8Array(await new Response(result.stream).arrayBuffer());
}

/** Streams a stored upload back. Caller is responsible for authorizing the read. */
export async function getUploadedPdf(pathname: string) {
  return get(pathname, { access: ACCESS });
}
