import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { InterviewMessage, InterviewSetup, Scorecard } from "@/lib/mock-interview";

export type InterviewStatus = "active" | "completed";

// One mock interview. Messages grow turn by turn; the scorecard is set once at the end.
export type StoredInterview = {
  _id: ObjectId;
  userId: string;
  setup: InterviewSetup;
  messages: InterviewMessage[];
  mainQuestionsAsked: number;
  status: InterviewStatus;
  scorecard?: Scorecard;
  createdAt: Date;
  updatedAt: Date;
};

/** Just enough for a list row. */
export type InterviewSummary = {
  _id: ObjectId;
  setup: Pick<InterviewSetup, "role" | "company" | "level" | "type" | "questionCount">;
  status: InterviewStatus;
  scorecard?: Pick<Scorecard, "overallScore">;
  createdAt: Date;
};

// Not "interviewreports" — that collection belongs to an older app.
async function interviews(): Promise<Collection<StoredInterview>> {
  const db = await getDb();
  return db.collection<StoredInterview>("mock_interviews");
}

export async function createInterview(
  userId: string,
  setup: InterviewSetup,
  firstMessage: InterviewMessage
): Promise<string> {
  const now = new Date();
  const _id = new ObjectId();
  await (await interviews()).insertOne({
    _id,
    userId,
    setup,
    messages: [firstMessage],
    mainQuestionsAsked: firstMessage.kind === "question" ? 1 : 0,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
  return _id.toHexString();
}

// Filter by userId so other users' ids read as "not found".
export async function getInterview(
  userId: string,
  id: string
): Promise<StoredInterview | null> {
  if (!ObjectId.isValid(id)) return null;
  return (await interviews()).findOne({ _id: new ObjectId(id), userId });
}

export async function listInterviews(userId: string, limit = 10): Promise<InterviewSummary[]> {
  return (await interviews())
    .find({ userId })
    .project<InterviewSummary>({
      "setup.role": 1,
      "setup.company": 1,
      "setup.level": 1,
      "setup.type": 1,
      "setup.questionCount": 1,
      status: 1,
      "scorecard.overallScore": 1,
      createdAt: 1,
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

/**
 * Appends an answer and the reply to it. Only applies if the transcript still
 * has `expectedLength` messages, so a double submit can't add a turn twice.
 */
export async function appendTurn(
  userId: string,
  id: string,
  expectedLength: number,
  turn: InterviewMessage[],
  mainQuestionsAsked: number
): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const result = await (await interviews()).updateOne(
    {
      _id: new ObjectId(id),
      userId,
      status: "active",
      messages: { $size: expectedLength },
    },
    {
      $push: { messages: { $each: turn } },
      $set: { mainQuestionsAsked, updatedAt: new Date() },
    }
  );
  return result.modifiedCount === 1;
}

export async function completeInterview(
  userId: string,
  id: string,
  scorecard: Scorecard
): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const result = await (await interviews()).updateOne(
    { _id: new ObjectId(id), userId, status: "active" },
    { $set: { status: "completed", scorecard, updatedAt: new Date() } }
  );
  return result.modifiedCount === 1;
}
