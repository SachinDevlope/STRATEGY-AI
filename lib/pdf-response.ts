/**
 * Shared by the two routes that hand a private PDF back to the browser (the
 * generated resume and the uploaded original): both honour ?download=1 and
 * both must stay out of shared caches.
 */

/** Headers for a private PDF. `?download=1` saves the file instead of opening it. */
export function pdfHeaders(
  request: Request,
  fileName: string,
  extra?: Record<string, string>
): Record<string, string> {
  const disposition =
    new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline";

  return {
    "Content-Type": "application/pdf",
    // A quote in the name would end the header value early.
    "Content-Disposition": `${disposition}; filename="${fileName.replace(/"/g, "")}"`,
    // Private document — never let a shared cache hold a copy.
    "Cache-Control": "private, no-store",
    ...extra,
  };
}
