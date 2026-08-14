import bcrypt from "bcryptjs";
import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@/lib/mongodb";

/**
 * A user document in "auth_users" — the same collection the MongoDB adapter
 * writes Google sign-ins into. Password accounts are stored there too, with a
 * `passwordHash` the adapter neither reads nor writes, so a single email can
 * end up with both a Google account link and a password.
 */
export type AppUser = {
  _id: ObjectId;
  name?: string | null;
  email: string;
  emailVerified?: Date | null;
  image?: string | null;
  /** Absent on accounts created through Google — those have no password to check. */
  passwordHash?: string;
};

export const MIN_PASSWORD_LENGTH = 8;

const BCRYPT_ROUNDS = 12;

let indexReady: Promise<unknown> | undefined;

async function users(): Promise<Collection<AppUser>> {
  const db = await getDb();
  const collection = db.collection<AppUser>("auth_users");
  // A unique email index is the only thing that makes signup safe against two
  // concurrent requests both passing the "does this email exist" check.
  indexReady ??= collection.createIndex({ email: 1 }, { unique: true }).catch(() => {
    // Pre-existing duplicates would make this fail forever if the rejected
    // promise stayed cached. Clear it so a later call retries, and fall through
    // — the explicit lookup in createUserWithPassword still catches the common
    // case, and the duplicate-key error below catches the race.
    indexReady = undefined;
  });
  await indexReady;
  return collection;
}

/** Emails are compared lowercase so "A@b.com" and "a@b.com" are one account. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getUserByEmail(email: string): Promise<AppUser | null> {
  return (await users()).findOne({ email: normalizeEmail(email) });
}

export class EmailTakenError extends Error {
  constructor() {
    super("An account with that email already exists.");
    this.name = "EmailTakenError";
  }
}

export async function createUserWithPassword(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AppUser> {
  const email = normalizeEmail(input.email);
  const collection = await users();

  const existing = await collection.findOne({ email });
  if (existing) throw new EmailTakenError();

  const doc: AppUser = {
    _id: new ObjectId(),
    name: input.name.trim() || null,
    email,
    // Nothing has verified this address yet; the adapter uses the same field
    // shape for Google users, so keep it present and null.
    emailVerified: null,
    image: null,
    passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
  };

  try {
    await collection.insertOne(doc);
  } catch (error) {
    // Two signups for the same email racing past the lookup above; the unique
    // index rejects the loser with code 11000.
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      throw new EmailTakenError();
    }
    throw error;
  }

  return doc;
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}
