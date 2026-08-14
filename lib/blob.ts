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

/** Streams a stored PDF back. Caller is responsible for authorizing the read. */
export async function getPdf(pathname: string) {
  return get(pathname, { access: ACCESS });
}

/** Metadata only (size, contentType, uploadedAt) — no body transfer. */
export async function headPdf(pathname: string) {
  return head(pathname);
}

export async function deletePdf(pathname: string) {
  return del(pathname);
}
