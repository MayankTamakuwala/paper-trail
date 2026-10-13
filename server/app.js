import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import papersRouter from "./routes/papers.js";
import readingListRouter from "./routes/readingList.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(currentDir, "..", "public");

const app = express();

app.use(express.json({ limit: "100kb" }));
app.use(express.static(publicDir, { extensions: ["html"] }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/papers", papersRouter);
app.use("/api/reading-list", readingListRouter);

app.use("/api", (req, res) => {
  res.status(404).json({ error: "Unknown endpoint" });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const status = error.status || 500;

  if (status === 500) {
    console.error(error);
  }

  res.status(status).json({
    error: status === 500 ? "Something went wrong on the server" : error.message,
  });
});

export default app;
