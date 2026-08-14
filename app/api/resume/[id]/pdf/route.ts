import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { putPdf, pdfPathname } from "@/lib/blob";
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
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  // getResume() filters on userId, so a valid id belonging to someone else is
  // indistinguishable from one that does not exist.
  const stored = await getResume(userId, id);
  if (!stored) return new Response("Not found", { status: 404 });

  const buffer = await renderToBuffer(resumeDocument(stored.data));

  // Mirror the file into private Blob storage so a re-download does not depend
  // on the renderer, and so the PDF outlives this request. A failure here is
  // not worth failing the download over.
  try {
    await putPdf(pdfPathname(userId, id), buffer);
  } catch (error) {
    console.error("Failed to persist resume PDF to Blob:", error);
  }

  const disposition = new URL(request.url).searchParams.get("download") === "1"
    ? "attachment"
    : "inline";

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${fileName(stored.data.contact.fullName)}"`,
      "Content-Length": String(buffer.byteLength),
      // Private document — never let a shared cache hold a copy.
      "Cache-Control": "private, no-store",
    },
  });
}
