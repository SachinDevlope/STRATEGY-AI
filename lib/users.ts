import bcrypt from "bcryptjs";
import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@/lib/mongodb";

// User in "auth_users", shared with the Auth.js adapter.
export type AppUser = {
  _id: ObjectId;
  name?: string | null;
  email: string;
  emailVerified?: Date | null;
  image?: string | null;
  /** Missing on Google-only accounts. */
  passwordHash?: string;
};

export const MIN_PASSWORD_LENGTH = 8;

const BCRYPT_ROUNDS = 12;

let indexReady: Promise<unknown> | undefined;

async function users(): Promise<Collection<AppUser>> {
  const db = await getDb();
  const collection = db.collection<AppUser>("auth_users");
  // Unique email stops two racing signups for one address.
  indexReady ??= collection.createIndex({ email: 1 }, { unique: true }).catch(() => {
    // Old duplicates can block the index; retry next time instead of caching the failure.
    indexReady = undefined;
  });
  await indexReady;
  return collection;
}

/** Lowercase + trim, so "A@b.com" and "a@b.com" are one account. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getUserByEmail(email: string): Promise<AppUser | null> {
  return (await users()).findOne({ email: normalizeEmail(email) });
}

export async function getUserById(id: string): Promise<AppUser | null> {
  if (!ObjectId.isValid(id)) return null;
  return (await users()).findOne({ _id: new ObjectId(id) });
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
    // Not verified until the owner signs in with Google.
    emailVerified: null,
    image: null,
    passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
  };

  try {
    await collection.insertOne(doc);
  } catch (error) {
    // 11000 = duplicate key: a parallel signup won the race.
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      throw new EmailTakenError();
    }
    throw error;
  }

  return doc;
}

// On Google link: drop any pre-verification password (it may be someone
// else's) and mark the email verified.
export async function claimAccountWithGoogle(userId: string) {
  if (!ObjectId.isValid(userId)) return;
  await (await users()).updateOne(
    { _id: new ObjectId(userId), emailVerified: null },
    { $unset: { passwordHash: "" }, $set: { emailVerified: new Date() } }
  );
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}
