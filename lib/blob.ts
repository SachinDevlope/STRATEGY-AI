import { del, get, head } from "@vercel/blob";

// Private store: reads must go through a route that checks the session.
const ACCESS = "private" as const;

/** Metadata only (url, size, contentType) — no body. */
export async function headPdf(pathname: string) {
  return head(pathname);
}

export async function deletePdf(pathname: string) {
  return del(pathname);
}

/** Whole file as bytes, or null if missing. */
export async function getUploadedPdfBytes(pathname: string): Promise<Uint8Array | null> {
  const result = await get(pathname, { access: ACCESS });
  if (!result || result.statusCode !== 200) return null;
  return new Uint8Array(await new Response(result.stream).arrayBuffer());
}

/** Streams a stored upload. Caller must check the session first. */
export async function getUploadedPdf(pathname: string) {
  return get(pathname, { access: ACCESS });
}
