import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { Answers, Resume, Tailoring } from "@/lib/resume";

/**
 * The in-progress wizard. One draft per user — starting a new resume overwrites
 * the previous answers, which is why generated resumes are stored separately.
 */
export type ResumeDraft = {
  _id: string;
  answers: Answers;
  /**
   * The job description the resume is being aimed at. Kept beside the answers
   * rather than inside them: it is not something the user knows about
   * themselves, and it is replaced wholesale each time they target a new role.
   */
  jobDescription?: string;
  step: number;
  updatedAt: Date;
};

/** A generated, schema-validated resume. Immutable once written. */
export type StoredResume = {
  _id: ObjectId;
  userId: string;
  data: Resume;
  /** Present only when the resume was generated against a job description. */
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

/**
 * Upserts the whole answer set on every step change. The payload is a handful
 * of text fields, so a full replace is cheaper than diffing and removes any
 * chance of the client and server disagreeing about which step is current.
 */
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

/**
 * Scoped by userId as well as id, so a guessed ObjectId from another account
 * returns null rather than someone else's resume.
 */
export async function getResume(userId: string, id: string): Promise<StoredResume | null> {
  if (!ObjectId.isValid(id)) return null;
  return (await resumes()).findOne({ _id: new ObjectId(id), userId });
}
