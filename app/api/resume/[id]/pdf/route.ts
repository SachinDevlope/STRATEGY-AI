import { renderToBuffer } from "@react-pdf/renderer";
import { putPdf, pdfPathname } from "@/lib/blob";
import { notFound, unauthorized } from "@/lib/http";
import { pdfHeaders } from "@/lib/pdf-response";
import { currentUserId } from "@/lib/session";
import { resumeDocument } from "@/lib/pdf/ResumeDocument";
import { getResume } from "@/lib/resume-store";

// The PDF renderer needs Node.js APIs, and every response is user-specific.
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
  // getResume() filters on userId, so a valid id belonging to someone else is
  // indistinguishable from one that does not exist.
  const stored = await getResume(userId, id);
  if (!stored) return notFound();

  const buffer = await renderToBuffer(resumeDocument(stored.data));

  // Mirror the file into private Blob storage so a re-download does not depend
  // on the renderer, and so the PDF outlives this request. A failure here is
  // not worth failing the download over.
  try {
    await putPdf(pdfPathname(userId, id), buffer);
  } catch (error) {
    console.error("Failed to persist resume PDF to Blob:", error);
  }

  return new Response(new Uint8Array(buffer), {
    headers: pdfHeaders(request, fileName(stored.data.contact.fullName), {
      "Content-Length": String(buffer.byteLength),
    }),
  });
}
