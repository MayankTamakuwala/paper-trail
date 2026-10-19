const STRUCTURAL_CHARS = /[[\]{}"<>]/;

const STATUSES = ["to-read", "reading", "read"];
const PRIORITIES = ["high", "medium", "low"];
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
    this.status = 400;
  }
}

function text(value, label, { required = false, max = 300 } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) {
      throw new ValidationError(label + " is required");
    }
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ValidationError(label + " must be text");
  }

  const trimmed = value.trim();

  if (required && trimmed.length === 0) {
    throw new ValidationError(label + " is required");
  }

  if (trimmed.length > max) {
    throw new ValidationError(label + " must be " + max + " characters or fewer");
  }

  return trimmed;
}

function year(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1500 || parsed > 2100) {
    throw new ValidationError("Year must be a whole number between 1500 and 2100");
  }

  return parsed;
}

function oneOf(value, allowed, label, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new ValidationError(label + " must be one of " + allowed.join(", "));
  }

  return value;
}

function stringList(value, label, { max, maxLength }) {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    throw new ValidationError(
      label + " must be a list of names or a comma separated line"
    );
  }

  const raw = Array.isArray(value) ? value : String(value).split(",");
  const seen = new Set();
  const cleaned = [];

  raw.forEach((item) => {
    if (typeof item !== "string" && typeof item !== "number") {
      throw new ValidationError(
        label + " must be a list of names or a comma separated line"
      );
    }

    const trimmed = String(item).trim();

    if (trimmed.length === 0) {
      return;
    }

    if (trimmed.length > maxLength) {
      throw new ValidationError(
        "Each entry in " + label + " must be " + maxLength + " characters or fewer"
      );
    }

    if (STRUCTURAL_CHARS.test(trimmed)) {
      throw new ValidationError(
        label +
          " must be plain text separated by commas, without brackets, braces or quotes"
      );
    }

    const key = trimmed.toLowerCase();

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    cleaned.push(trimmed);
  });

  if (cleaned.length > max) {
    throw new ValidationError(label + " cannot have more than " + max + " entries");
  }

  return cleaned;
}

export function validateEntry(body, { partial = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError("Request body must be an object");
  }

  const entry = {};
  const required = !partial;

  const title = text(body.title, "Title", { required, max: 300 });
  if (title !== undefined) {
    entry.title = title;
  }

  if (!partial || body.authors !== undefined) {
    entry.authors = stringList(body.authors, "Authors", { max: 50, maxLength: 120 });
  }

  const venue = text(body.venue, "Venue", { max: 200 });
  if (venue !== undefined) {
    entry.venue = venue;
  }

  const note = text(body.note, "Note", { max: 2000 });
  if (note !== undefined) {
    entry.note = note;
  }

  const published = year(body.year);
  if (published !== undefined) {
    entry.year = published;
  }

  if (!partial || body.status !== undefined) {
    entry.status = oneOf(body.status, STATUSES, "Status", "to-read");
  }

  if (!partial || body.priority !== undefined) {
    entry.priority = oneOf(body.priority, PRIORITIES, "Priority", "medium");
    entry.priorityRank = PRIORITY_RANK[entry.priority];
  }

  if (!partial || body.tags !== undefined) {
    entry.tags = stringList(body.tags, "Tags", { max: 10, maxLength: 30 }).map((tag) =>
      tag.toLowerCase()
    );
  }

  if (partial && Object.keys(entry).length === 0) {
    throw new ValidationError("No valid fields to update");
  }

  return entry;
}

export function validatePaper(body, { partial = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError("Request body must be an object");
  }

  const paper = {};
  const required = !partial;

  const title = text(body.title, "Title", { required, max: 300 });
  if (title !== undefined) {
    paper.title = title;
  }

  const venue = text(body.venue, "Venue", { max: 200 });
  if (venue !== undefined) {
    paper.venue = venue;
  }

  const doi = text(body.doi, "DOI", { max: 120 });
  if (doi !== undefined) {
    paper.doi = doi;
  }

  const abstract = text(body.abstract, "Abstract", { max: 4000 });
  if (abstract !== undefined) {
    paper.abstract = abstract;
  }

  const published = year(body.year);
  if (published !== undefined) {
    paper.year = published;
  }

  if (body.authors !== undefined) {
    paper.authors = stringList(body.authors, "Authors", { max: 50, maxLength: 120 });
  }

  if (body.fields !== undefined) {
    paper.fields = stringList(body.fields, "Fields", { max: 10, maxLength: 80 });
  }

  if (partial && Object.keys(paper).length === 0) {
    throw new ValidationError("No valid fields to update");
  }

  return paper;
}

export function boundedInt(value, fallback, max) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, max);
}
