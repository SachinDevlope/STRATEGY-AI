"use server";

import { revalidatePath } from "next/cache";
import { generateStructured } from "@/lib/ai";
import { UserError, userMessage } from "@/lib/errors";
import { limitAi } from "@/lib/rate-limit";
import { requireUserId } from "@/lib/session";
import {
  buildStarPrompt,
  normalizeStarStory,
  STAR_SYSTEM_PROMPT,
  starStorySchema,
  validateStarInput,
  type StarInput,
} from "@/lib/star";
import { deleteStarStory, insertStarStory } from "@/lib/star-store";

export type BuildStarResult = { ok: true; storyId: string } | { ok: false; error: string };
export type DeleteStarResult = { ok: true } | { ok: false; error: string };

export async function buildStarStoryAction(input: StarInput): Promise<BuildStarResult> {
  try {
    const userId = await requireUserId();

    const checked = validateStarInput(input ?? {});
    if (!checked.ok) throw new UserError(checked.error);

    await limitAi(userId);

    const story = normalizeStarStory(
      await generateStructured(starStorySchema, {
        system: STAR_SYSTEM_PROMPT,
        prompt: buildStarPrompt(checked.value),
        schemaName: "star_story",
      })
    );

    const storyId = await insertStarStory(userId, { ...checked.value, data: story });
    revalidatePath("/dashboard/star");
    return { ok: true, storyId };
  } catch (error) {
    return { ok: false, error: userMessage(error, "Could not build that story. Try again.") };
  }
}

export async function deleteStarStoryAction(storyId: string): Promise<DeleteStarResult> {
  try {
    const userId = await requireUserId();
    const deleted = await deleteStarStory(userId, String(storyId ?? ""));
    if (!deleted) throw new UserError("That story no longer exists.");
    revalidatePath("/dashboard/star");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: userMessage(error, "Could not delete that story. Try again.") };
  }
}
