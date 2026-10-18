import { MongoClient } from "mongodb";

const TARGET = Number(process.env.SEED_TARGET) || 1200;
const PER_PAGE = 200;
const MAX_RESULTS = 10000;
const CONTACT = process.env.OPENALEX_CONTACT || "";

const FILTER = [
  "type:article",
  "has_abstract:true",
  "from_publication_date:2015-01-01",
  "primary_topic.field.id:fields/17",
].join(",");

function rebuildAbstract(inverted) {
  if (!inverted) {
    return "";
  }

  const slots = [];

  Object.entries(inverted).forEach(([word, positions]) => {
    positions.forEach((position) => {
      slots[position] = word;
    });
  });

  return slots.join(" ").replace(/\s+/g, " ").trim().slice(0, 1500);
}

function collectFields(work) {
  const fields = [];
  const topic = work.primary_topic || {};

  if (topic.field && topic.field.display_name) {
    fields.push(topic.field.display_name);
  }

  if (topic.subfield && topic.subfield.display_name) {
    fields.push(topic.subfield.display_name);
  }

  (work.topics || []).slice(0, 2).forEach((entry) => {
    if (entry.display_name) {
      fields.push(entry.display_name);
    }
  });

  return Array.from(new Set(fields)).slice(0, 5);
}

function toPaper(work) {
  const location = work.primary_location || {};
  const source = location.source || {};

  return {
    openAlexId: work.id,
    title: String(work.title || "").slice(0, 300),
    authors: (work.authorships || [])
      .map((entry) => (entry.author && entry.author.display_name) || "")
      .filter(Boolean)
      .slice(0, 12),
    year: work.publication_year || null,
    venue: String(source.display_name || "").slice(0, 200),
    doi: work.doi || "",
    citationCount: work.cited_by_count || 0,
    fields: collectFields(work),
    abstract: rebuildAbstract(work.abstract_inverted_index),
    source: "openalex",
  };
}

function buildUrl(page) {
  const params = new URLSearchParams({
    filter: FILTER,
    "per-page": String(PER_PAGE),
    page: String(page),
    sort: "cited_by_count:desc",
  });

  if (CONTACT) {
    params.set("mailto", CONTACT);
  }

  return "https://api.openalex.org/works?" + params.toString();
}

async function fetchPapers() {
  const collected = [];
  const seen = new Set();
  const lastPage = Math.floor(MAX_RESULTS / PER_PAGE);
  let page = 1;

  while (collected.length < TARGET && page <= lastPage) {
    const response = await fetch(buildUrl(page));

    if (!response.ok) {
      throw new Error("OpenAlex request failed with status " + response.status);
    }

    const payload = await response.json();
    const results = payload.results || [];

    if (results.length === 0) {
      break;
    }

    results.forEach((work) => {
      const paper = toPaper(work);

      if (!paper.title || !paper.abstract || seen.has(paper.openAlexId)) {
        return;
      }

      seen.add(paper.openAlexId);
      collected.push(paper);
    });

    console.log("fetched " + collected.length + " of " + TARGET);
    page += 1;
  }

  return collected.slice(0, TARGET);
}

async function main() {
  if (TARGET > MAX_RESULTS) {
    throw new Error("SEED_TARGET cannot exceed " + MAX_RESULTS + " without an API key");
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }

  console.log("Fetching papers from OpenAlex...");
  const papers = await fetchPapers();

  if (papers.length < 1000) {
    throw new Error(
      "Only collected " + papers.length + " papers, expected at least 1000"
    );
  }

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db(process.env.MONGODB_DB || "paper_trail");
    const collection = db.collection("papers");

    const removed = await collection.deleteMany({ source: "openalex" });
    console.log("Removed " + removed.deletedCount + " previously seeded papers");

    const now = new Date();
    const inserted = await collection.insertMany(
      papers.map((paper) => ({ ...paper, createdAt: now, updatedAt: now })),
      { ordered: false }
    );

    await collection.createIndex({ title: 1 });
    await collection.createIndex({ fields: 1 });
    await collection.createIndex({ year: 1 });
    await collection.createIndex({ citationCount: -1 });
    await collection.createIndex({ openAlexId: 1 }, { unique: true, sparse: true });
    await db.collection("readingList").createIndex({ userId: 1, createdAt: -1 });

    const total = await collection.countDocuments({});
    console.log("Inserted " + inserted.insertedCount + " papers");
    console.log("Collection now holds " + total + " documents");
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
