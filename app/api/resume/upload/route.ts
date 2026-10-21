import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import {
  ACCEPTED_CONTENT_TYPES,
  MAX_UPLOAD_BYTES,
  uploadPrefix,
} from "@/lib/analysis";
import { unauthorized } from "@/lib/http";
import { currentUserId } from "@/lib/session";

// Gives the browser a short-lived token to upload straight to Blob,
// so large files never pass through this server.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const userId = await currentUserId();
  if (!userId) return unauthorized();

  // Fail early with a clear log; otherwise the SDK gives a vague error.
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error(
      "BLOB_READ_WRITE_TOKEN is not set. Connect a Vercel Blob store to this " +
        "project and run `vercel env pull` so uploads can be signed."
    );
    return Response.json({ error: "Blob storage is not configured." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as HandleUploadBody;

    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        // Security: users may only upload into their own folder.
        if (!pathname.startsWith(uploadPrefix(userId))) {
          throw new Error("Upload path is not yours to write to.");
        }
        return {
          allowedContentTypes: ACCEPTED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          // Same-named uploads must not overwrite each other.
          addRandomSuffix: true,
          tokenPayload: userId,
        };
      },
      // No onUploadCompleted: the analysis action saves the record instead.
    });

    return Response.json(result);
  } catch (error) {
    // Log it: the SDK hides this error from the browser.
    console.error("Resume upload token request failed:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 400 }
    );
  }
}
