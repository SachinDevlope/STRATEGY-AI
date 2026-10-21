import { MongoClient, type Db } from "mongodb";

const options = {};

const globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

// Connects on first call, so `next build` works without MONGODB_URI.
// Cached on `global` so dev hot reloads reuse one connection.
export function getClientPromise(): Promise<MongoClient> {
  if (!globalWithMongo._mongoClientPromise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('Missing environment variable "MONGODB_URI".');
    }
    // Drop a failed connection from the cache so the next call retries.
    const pending = new MongoClient(uri, options).connect();
    pending.catch(() => {
      if (globalWithMongo._mongoClientPromise === pending) {
        globalWithMongo._mongoClientPromise = undefined;
      }
    });
    globalWithMongo._mongoClientPromise = pending;
  }
  return globalWithMongo._mongoClientPromise;
}

/** The database named in MONGODB_URI. Auth.js manages its own collections. */
export async function getDb(): Promise<Db> {
  const connected = await getClientPromise();
  return connected.db();
}
