import { transcribeAudio } from "@/lib/ai";
import { userMessage } from "@/lib/errors";
import { unauthorized } from "@/lib/http";
import { limitTranscription } from "@/lib/rate-limit";
import { currentUserId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Under Vercel's 4.5 MB request limit; a phrase is a few KB.
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

/** Turns one recorded phrase into text, so voice works in every browser. */
export async function POST(request: Request): Promise<Response> {
  const userId = await currentUserId();
  if (!userId) return unauthorized();

  try {
    await limitTranscription(userId);
  } catch (error) {
    return Response.json({ error: userMessage(error, "Too many requests.") }, { status: 429 });
  }

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return Response.json({ error: "No audio was recorded. Try again." }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return Response.json({ error: "That recording is too long." }, { status: 413 });
  }

  try {
    const text = await transcribeAudio(audio);
    return Response.json({ text });
  } catch (error) {
    // Groq's per-minute limit: rapid short phrases can hit it.
    if (typeof error === "object" && error !== null && "status" in error && error.status === 429) {
      return Response.json(
        { error: "Voice is going too fast for the transcriber — pause a moment, or type the rest." },
        { status: 429 }
      );
    }
    console.error("Transcription failed:", error);
    return Response.json(
      { error: "Part of your answer couldn't be transcribed. Keep going, or type it." },
      { status: 502 }
    );
  }
}
