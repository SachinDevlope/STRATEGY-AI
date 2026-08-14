import { getAnalysis } from "@/lib/analysis-store";
import { getUploadedPdf } from "@/lib/blob";
import { notFound, unauthorized } from "@/lib/http";
import { pdfHeaders } from "@/lib/pdf-response";
import { currentUserId } from "@/lib/session";

// Uploads are stored privately, so the blob URL alone opens nothing. Every read
// comes back through here, where the session is checked first.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const stored = await getAnalysis(userId, id);
  // A pasted-text analysis has no stored file, so there is nothing to serve.
  if (!stored?.resumePathname) return notFound();

  const result = await getUploadedPdf(stored.resumePathname);
  if (!result || result.statusCode !== 200) return notFound();

  // Streamed straight through — the file is never buffered in the function.
  return new Response(result.stream, {
    headers: pdfHeaders(request, stored.fileName ?? "resume.pdf"),
  });
}
