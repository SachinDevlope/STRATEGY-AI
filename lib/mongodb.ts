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
    globalWithMongo._mongoClientPromise = new MongoClient(uri, options).connect();
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
