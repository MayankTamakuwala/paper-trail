import { ObjectId } from "mongodb";
import { getCollection } from "./client.js";

const COLLECTION = "papers";

async function papers() {
  return getCollection(COLLECTION);
}

export async function searchPapers({ query, field, yearFrom, yearTo, limit, skip, sort }) {
  const filter = {};

  if (query) {
    const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(safe, "i");
    filter.$or = [{ title: pattern }, { authors: pattern }, { venue: pattern }];
  }

  if (field) {
    filter.fields = field;
  }

  if (yearFrom || yearTo) {
    filter.year = {};
    if (yearFrom) filter.year.$gte = yearFrom;
    if (yearTo) filter.year.$lte = yearTo;
  }

  const sortOptions = {
    citations: { citationCount: -1, _id: 1 },
    newest: { year: -1, _id: 1 },
    oldest: { year: 1, _id: 1 },
    "title-asc": { title: 1, _id: 1 },
    "title-desc": { title: -1, _id: 1 },
  };

  const sortOrder = sortOptions[sort] || sortOptions.citations;
  const collection = await papers();
  const [items, total] = await Promise.all([
    collection.find(filter).sort(sortOrder).skip(skip).limit(limit).toArray(),
    collection.countDocuments(filter),
  ]);

  return { items, total };
}

export async function findPaperById(id) {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const collection = await papers();
  return collection.findOne({ _id: new ObjectId(id) });
}

export async function insertPaper(doc) {
  const collection = await papers();
  const now = new Date();
  const result = await collection.insertOne({
    ...doc,
    source: "user",
    citationCount: 0,
    createdAt: now,
    updatedAt: now,
  });
  return collection.findOne({ _id: result.insertedId });
}

export async function updatePaper(id, patch) {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const collection = await papers();
  return collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...patch, updatedAt: new Date() } },
    { returnDocument: "after" }
  );
}

export async function deletePaper(id) {
  if (!ObjectId.isValid(id)) {
    return 0;
  }
  const collection = await papers();
  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount;
}

export async function listFields(limit = 20) {
  const collection = await papers();
  const rows = await collection
    .aggregate([
      { $unwind: "$fields" },
      { $group: { _id: "$fields", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ])
    .toArray();

  return rows.map((row) => ({ name: row._id, count: row.count }));
}

export async function countPapers() {
  const collection = await papers();
  return collection.countDocuments({});
}
