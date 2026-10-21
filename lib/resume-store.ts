import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { Answers, Resume, Tailoring } from "@/lib/resume";

// In-progress wizard answers. One draft per user.
export type ResumeDraft = {
  _id: string;
  answers: Answers;
  /** Target job description, replaced each time the user targets a new role. */
  jobDescription?: string;
  step: number;
  updatedAt: Date;
};

// A generated resume. Never changed after saving.
export type StoredResume = {
  _id: ObjectId;
  userId: string;
  data: Resume;
  /** Only set when a job description was given. */
  tailoring?: Tailoring;
  createdAt: Date;
};

async function drafts(): Promise<Collection<ResumeDraft>> {
  const db = await getDb();
  return db.collection<ResumeDraft>("resume_drafts");
}

async function resumes(): Promise<Collection<StoredResume>> {
  const db = await getDb();
  return db.collection<StoredResume>("resumes");
}

export async function getDraft(userId: string): Promise<ResumeDraft | null> {
  return (await drafts()).findOne({ _id: userId });
}

// Replaces the whole draft each time; it's small, so no diffing needed.
export async function saveDraft(
  userId: string,
  answers: Answers,
  step: number,
  jobDescription = ""
) {
  await (
    await drafts()
  ).updateOne(
    { _id: userId },
    { $set: { answers, step, jobDescription, updatedAt: new Date() } },
    { upsert: true }
  );
}

export async function clearDraft(userId: string) {
  await (await drafts()).deleteOne({ _id: userId });
}

export async function insertResume(
  userId: string,
  data: Resume,
  tailoring?: Tailoring
): Promise<string> {
  const result = await (
    await resumes()
  ).insertOne({
    _id: new ObjectId(),
    userId,
    data,
    ...(tailoring ? { tailoring } : {}),
    createdAt: new Date(),
  });
  return result.insertedId.toHexString();
}

// Filter by userId too, so a guessed id can't return someone else's resume.
export async function getResume(userId: string, id: string): Promise<StoredResume | null> {
  if (!ObjectId.isValid(id)) return null;
  return (await resumes()).findOne({ _id: new ObjectId(id), userId });
}
