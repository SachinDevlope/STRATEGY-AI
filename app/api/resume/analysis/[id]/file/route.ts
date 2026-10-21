import { getAnalysis } from "@/lib/analysis-store";
import { getUploadedPdf } from "@/lib/blob";
import { notFound, unauthorized } from "@/lib/http";
import { pdfHeaders } from "@/lib/pdf-response";
import { currentUserId } from "@/lib/session";

// Uploads are private, so files are served through here after a session check.
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
  // Pasted-text analyses have no file.
  if (!stored?.resumePathname) return notFound();

  const result = await getUploadedPdf(stored.resumePathname);
  if (!result || result.statusCode !== 200) return notFound();

  // Stream it; don't buffer in memory.
  return new Response(result.stream, {
    headers: pdfHeaders(request, stored.fileName ?? "resume.pdf"),
  });
}
