import { MongoClient, type Db } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error('Missing environment variable "MONGODB_URI".');
}

const uri = process.env.MONGODB_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // In development the module is reloaded on every edit, which would open a new
  // connection each time. Cache the promise on the global object so the pool is
  // reused across hot reloads.
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

/**
 * Returns the database named in MONGODB_URI (currently "Gen-Ai").
 * Use this for application collections; Auth.js manages its own via the adapter.
 */
export async function getDb(): Promise<Db> {
  const connected = await clientPromise;
  return connected.db();
}
