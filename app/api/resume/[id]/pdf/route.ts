import { renderToBuffer } from "@react-pdf/renderer";
import { notFound, unauthorized } from "@/lib/http";
import { pdfHeaders } from "@/lib/pdf-response";
import { currentUserId } from "@/lib/session";
import { resumeDocument } from "@/lib/pdf/ResumeDocument";
import { getResume } from "@/lib/resume-store";

// PDF rendering needs Node.js; every response is per user.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fileName(fullName: string) {
  const slug = fullName.trim().replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug || "resume"}-resume.pdf`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  // Scoped by userId: someone else's id reads as not found.
  const stored = await getResume(userId, id);
  if (!stored) return notFound();

  // Rendered on demand; resumes are small and this keeps the PDF in sync with the template.
  const buffer = await renderToBuffer(resumeDocument(stored.data));

  return new Response(new Uint8Array(buffer), {
    headers: pdfHeaders(request, fileName(stored.data.contact.fullName), {
      "Content-Length": String(buffer.byteLength),
    }),
  });
}
