import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { Analysis } from "@/lib/analysis";

// Saved separately so a JD can be reused without pasting it again.
export type StoredJobDescription = {
  _id: ObjectId;
  userId: string;
  title: string;
  company?: string;
  text: string;
  createdAt: Date;
};

// One resume scored against one JD. Never changed after saving.
export type StoredAnalysis = {
  _id: ObjectId;
  userId: string;
  /** "text" has no upload, so the file fields below are empty. */
  source: "pdf" | "text";
  /** Private blob URL. */
  resumeUrl?: string;
  /** Used to read and delete the blob. */
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

// Filter by userId so other users' ids read as "not found".
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
