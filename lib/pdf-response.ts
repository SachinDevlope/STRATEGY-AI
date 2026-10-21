/** Headers for a private PDF. `?download=1` downloads instead of opening inline. */
export function pdfHeaders(
  request: Request,
  fileName: string,
  extra?: Record<string, string>
): Record<string, string> {
  const disposition =
    new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline";

  // Header values must be ASCII, so send an ASCII fallback plus the real
  // name UTF-8 encoded (RFC 6266). A raw "–" or "简历" would throw.
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "") || "resume.pdf";
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );

  return {
    "Content-Type": "application/pdf",
    "Content-Disposition": `${disposition}; filename="${ascii}"; filename*=UTF-8''${encoded}`,
    // Private document — no shared caching.
    "Cache-Control": "private, no-store",
    ...extra,
  };
}
