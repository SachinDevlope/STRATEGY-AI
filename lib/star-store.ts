import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { StarStory } from "@/lib/star";

export type StoredStarStory = {
  _id: ObjectId;
  userId: string;
  question: string;
  notes: string;
  role?: string;
  data: StarStory;
  createdAt: Date;
};

async function stories(): Promise<Collection<StoredStarStory>> {
  const db = await getDb();
  return db.collection<StoredStarStory>("star_stories");
}

export async function insertStarStory(
  userId: string,
  input: { question: string; notes: string; role?: string; data: StarStory }
): Promise<string> {
  const _id = new ObjectId();
  await (await stories()).insertOne({
    _id,
    userId,
    question: input.question,
    notes: input.notes,
    ...(input.role ? { role: input.role } : {}),
    data: input.data,
    createdAt: new Date(),
  });
  return _id.toHexString();
}

// Filter by userId so other users' ids read as "not found".
export async function getStarStory(
  userId: string,
  id: string
): Promise<StoredStarStory | null> {
  if (!ObjectId.isValid(id)) return null;
  return (await stories()).findOne({ _id: new ObjectId(id), userId });
}

export async function listStarStories(
  userId: string,
  limit = 20
): Promise<StoredStarStory[]> {
  return (await stories())
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

/** True if a story was deleted. */
export async function deleteStarStory(userId: string, id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const result = await (await stories()).deleteOne({ _id: new ObjectId(id), userId });
  return result.deletedCount === 1;
}
