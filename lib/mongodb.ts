import { MongoClient, type Db } from "mongodb";

const options = {};

const globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

/**
 * Connects lazily. The URI is read on first call, not at import time, so
 * importing this module during `next build` (page-data collection) does not
 * require MONGODB_URI to be present in the build environment.
 *
 * In development the module is reloaded on every edit, which would open a new
 * connection each time, so the promise is cached on the global object and the
 * pool is reused across hot reloads.
 */
export function getClientPromise(): Promise<MongoClient> {
  if (!globalWithMongo._mongoClientPromise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('Missing environment variable "MONGODB_URI".');
    }
    // A rejected promise left in the cache would fail every later request for
    // the lifetime of the instance, so drop it and let the next call retry.
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

export default getClientPromise;

/**
 * Returns the database named in MONGODB_URI (currently "Gen-Ai").
 * Use this for application collections; Auth.js manages its own via the adapter.
 */
export async function getDb(): Promise<Db> {
  const connected = await getClientPromise();
  return connected.db();
}
