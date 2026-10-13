import { ObjectId } from "mongodb";
import { getCollection } from "./client.js";

const COLLECTION = "readingList";

async function entries() {
  return getCollection(COLLECTION);
}

function sortOrder(sort) {
  if (sort === "title") {
    return { title: 1 };
  }
  if (sort === "oldest") {
    return { createdAt: 1 };
  }
  if (sort === "priority") {
    return { priorityRank: 1, createdAt: -1 };
  }
  return { createdAt: -1 };
}

export async function listEntries(userId, { status, sort }) {
  const filter = { userId };
  if (status) {
    filter.status = status;
  }

  const collection = await entries();
  return collection.find(filter).sort(sortOrder(sort)).toArray();
}

export async function countByStatus(userId) {
  const collection = await entries();
  const rows = await collection
    .aggregate([
      { $match: { userId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ])
    .toArray();

  const counts = { "to-read": 0, reading: 0, read: 0 };
  rows.forEach((row) => {
    if (row._id in counts) {
      counts[row._id] = row.count;
    }
  });
  return counts;
}

export async function findEntry(userId, id) {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const collection = await entries();
  return collection.findOne({ _id: new ObjectId(id), userId });
}

export async function insertEntry(userId, doc) {
  const collection = await entries();
  const now = new Date();
  const result = await collection.insertOne({
    ...doc,
    userId,
    createdAt: now,
    updatedAt: now,
  });
  return collection.findOne({ _id: result.insertedId });
}

export async function updateEntry(userId, id, patch) {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const collection = await entries();
  return collection.findOneAndUpdate(
    { _id: new ObjectId(id), userId },
    { $set: { ...patch, updatedAt: new Date() } },
    { returnDocument: "after" }
  );
}

export async function deleteEntry(userId, id) {
  if (!ObjectId.isValid(id)) {
    return 0;
  }
  const collection = await entries();
  const result = await collection.deleteOne({ _id: new ObjectId(id), userId });
  return result.deletedCount;
}
