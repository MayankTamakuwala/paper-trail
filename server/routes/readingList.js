import express from "express";
import {
  listEntries,
  countByStatus,
  findEntry,
  insertEntry,
  updateEntry,
  deleteEntry,
} from "../db/readingList.js";
import { validateEntry, ValidationError } from "../validate.js";

const STATUSES = ["to-read", "reading", "read"];

const router = express.Router();

router.use((req, res, next) => {
  const userId = req.get("x-user-id");

  if (!userId || userId.length < 8 || userId.length > 64) {
    res.status(401).json({ error: "Missing or invalid x-user-id header" });
    return;
  }

  req.userId = userId;
  next();
});

router.get("/", async (req, res) => {
  const status = STATUSES.includes(req.query.status) ? req.query.status : undefined;
  const sort = typeof req.query.sort === "string" ? req.query.sort : undefined;

  const [items, counts] = await Promise.all([
    listEntries(req.userId, { status, sort }),
    countByStatus(req.userId),
  ]);

  res.json({ items, counts });
});

router.get("/:id", async (req, res) => {
  const entry = await findEntry(req.userId, req.params.id);

  if (!entry) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  res.json(entry);
});

router.post("/", async (req, res) => {
  const entry = validateEntry(req.body);
  const created = await insertEntry(req.userId, entry);
  res.status(201).json(created);
});

router.put("/:id", async (req, res) => {
  const patch = validateEntry(req.body, { partial: true });
  const updated = await updateEntry(req.userId, req.params.id, patch);

  if (!updated) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const removed = await deleteEntry(req.userId, req.params.id);

  if (removed === 0) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  res.status(204).end();
});

router.use((error, req, res, next) => {
  if (error instanceof ValidationError) {
    res.status(400).json({ error: error.message });
    return;
  }

  next(error);
});

export default router;
