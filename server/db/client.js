import { MongoClient } from "mongodb";

const DB_NAME = process.env.MONGODB_DB || "paper_trail";

const cache = globalThis.__paperTrailMongo || { client: null, promise: null };
globalThis.__paperTrailMongo = cache;

export async function getDb() {
  if (cache.client) {
    return cache.client.db(DB_NAME);
  }

  if (!cache.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI is not set");
    }
    cache.promise = new MongoClient(uri, { maxPoolSize: 10 }).connect();
  }

  try {
    cache.client = await cache.promise;
  } catch (error) {
    // Let the next request retry
    cache.promise = null;
    throw error;
  }

  return cache.client.db(DB_NAME);
}

export async function getCollection(name) {
  const db = await getDb();
  return db.collection(name);
}
