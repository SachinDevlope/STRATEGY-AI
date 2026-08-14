import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import {
  ACCEPTED_CONTENT_TYPES,
  MAX_UPLOAD_BYTES,
  uploadPrefix,
} from "@/lib/analysis";
import { unauthorized } from "@/lib/http";
import { currentUserId } from "@/lib/session";

// Issues a short-lived, tightly scoped Blob token so the browser can PUT the
// file straight to Blob storage. The bytes never pass through this function,
// which is what keeps large resumes off the request-body path.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const userId = await currentUserId();
  if (!userId) return unauthorized();

  // Without a store token the SDK throws deep inside handleUpload and the
  // browser only ever sees "Failed to retrieve the client token". Fail here
  // instead, where the reason can be logged.
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
        // The pathname the client asks for is what the token authorizes, so it
        // is checked against this session's own prefix. Without this, a signed-in
        // user could request a token for someone else's namespace.
        if (!pathname.startsWith(uploadPrefix(userId))) {
          throw new Error("Upload path is not yours to write to.");
        }
        return {
          allowedContentTypes: ACCEPTED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          // Two uploads of "resume.pdf" must not clobber each other — a stored
          // analysis keeps pointing at the exact file it was run against.
          addRandomSuffix: true,
          // The pathname is already user-scoped; carrying the id through means
          // any later callback work does not have to re-parse it.
          tokenPayload: userId,
        };
      },
      // No onUploadCompleted: the analysis action is what persists the record,
      // and it needs the user's chosen job description, which the callback has
      // no way to know. A callback here would only duplicate that write.
    });

    return Response.json(result);
  } catch (error) {
    // handleUpload throws on an invalid body, a bad store token, or the prefix
    // check above. The SDK does not surface this body to the browser, so the
    // reason is logged here — otherwise it is lost entirely.
    console.error("Resume upload token request failed:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 400 }
    );
  }
}
