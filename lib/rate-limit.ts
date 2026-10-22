import { headers } from "next/headers";
import { getDb } from "@/lib/mongodb";
import { UserError } from "@/lib/errors";

type Bucket = { _id: string; count: number; expiresAt: Date };

let indexReady: Promise<unknown> | undefined;

async function buckets() {
  const collection = (await getDb()).collection<Bucket>("rate_limits");
  // TTL index: MongoDB deletes expired windows on its own.
  indexReady ??= collection
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
    .catch(() => (indexReady = undefined));
  await indexReady;
  return collection;
}

/** Throws a UserError if `key` is used over `limit` times per window. */
export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const window = Math.floor(Date.now() / 1000 / windowSeconds);
  const bucket = await (await buckets()).findOneAndUpdate(
    { _id: `${key}:${window}` },
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt: new Date((window + 1) * windowSeconds * 1000) },
    },
    { upsert: true, returnDocument: "after" }
  );
  if (bucket && bucket.count > limit) {
    throw new UserError("Too many attempts. Wait a few minutes and try again.");
  }
}

/** Caller IP as reported by the proxy (Vercel sets x-forwarded-for). */
export async function clientIp(): Promise<string> {
  const forwarded = (await headers()).get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

/** Shared budget for every AI generation a user triggers. */
export function limitAi(userId: string) {
  return rateLimit(`ai:${userId}`, 20, 60 * 60);
}

/** Live voice sends one short request per spoken phrase, so it gets the largest budget. */
export function limitTranscription(userId: string) {
  return rateLimit(`transcribe:${userId}`, 600, 60 * 60);
}

/** Interview chat turns are small and frequent, so they get their own bigger budget. */
export function limitInterview(userId: string) {
  return rateLimit(`interview:${userId}`, 120, 60 * 60);
}
