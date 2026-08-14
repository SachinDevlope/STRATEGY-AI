import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { Analysis } from "@/lib/analysis";

/**
 * A job description the user has pasted. Kept as its own collection so the same
 * JD can be reused across uploads without pasting it again, and so a stored
 * analysis keeps pointing at the exact text it was scored against.
 */
export type StoredJobDescription = {
  _id: ObjectId;
  userId: string;
  title: string;
  company?: string;
  text: string;
  createdAt: Date;
};

/** One resume scored against one job description. Immutable once written. */
export type StoredAnalysis = {
  _id: ObjectId;
  userId: string;
  /**
   * Where the candidate text came from. A pasted self-description has no blob
   * behind it, so the four upload fields below are absent for "text".
   */
  source: "pdf" | "text";
  /** Blob URL of the upload. Private — not fetchable without a session. */
  resumeUrl?: string;
  /** Blob pathname, which is what reads and deletes are addressed by. */
  resumePathname?: string;
  fileName?: string;
  fileSize?: number;
  jobDescriptionId: ObjectId;
  jobTitle: string;
  data: Analysis;
  createdAt: Date;
};

async function jobDescriptions(): Promise<Collection<StoredJobDescription>> {
  const db = await getDb();
  return db.collection<StoredJobDescription>("job_descriptions");
}

async function analyses(): Promise<Collection<StoredAnalysis>> {
  const db = await getDb();
  return db.collection<StoredAnalysis>("resume_analyses");
}

export async function listJobDescriptions(
  userId: string,
  limit = 20
): Promise<StoredJobDescription[]> {
  return (await jobDescriptions())
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

/** Scoped by userId, so another account's id reads as "not found". */
export async function getJobDescription(
  userId: string,
  id: string
): Promise<StoredJobDescription | null> {
  if (!ObjectId.isValid(id)) return null;
  return (await jobDescriptions()).findOne({ _id: new ObjectId(id), userId });
}

export async function insertJobDescription(
  userId: string,
  input: { title: string; company?: string; text: string }
): Promise<StoredJobDescription> {
  const doc: StoredJobDescription = {
    _id: new ObjectId(),
    userId,
    title: input.title,
    ...(input.company ? { company: input.company } : {}),
    text: input.text,
    createdAt: new Date(),
  };
  await (await jobDescriptions()).insertOne(doc);
  return doc;
}

export async function insertAnalysis(
  input: Omit<StoredAnalysis, "_id" | "createdAt">
): Promise<string> {
  const _id = new ObjectId();
  await (await analyses()).insertOne({ ...input, _id, createdAt: new Date() });
  return _id.toHexString();
}

export async function getAnalysis(
  userId: string,
  id: string
): Promise<StoredAnalysis | null> {
  if (!ObjectId.isValid(id)) return null;
  return (await analyses()).findOne({ _id: new ObjectId(id), userId });
}

export async function listAnalyses(userId: string, limit = 10): Promise<StoredAnalysis[]> {
  return (await analyses())
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}
