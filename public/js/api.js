import { getUserId } from "./user.js";

const BASE = "/api";

async function request(path, options = {}) {
  const config = { ...options, headers: { "x-user-id": getUserId() } };

  if (options.body !== undefined) {
    config.headers["content-type"] = "application/json";
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(BASE + path, config);

  if (response.status === 204) {
    return null;
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload && payload.error ? payload.error : "Request failed");
  }

  return payload;
}

function toQuery(params) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value !== undefined && value !== null) {
      query.set(key, value);
    }
  });

  const serialized = query.toString();
  return serialized ? "?" + serialized : "";
}

export function getEntries(params = {}) {
  return request("/reading-list" + toQuery(params));
}

export function createEntry(entry) {
  return request("/reading-list", { method: "POST", body: entry });
}

export function updateEntry(id, patch) {
  return request("/reading-list/" + id, { method: "PUT", body: patch });
}

export function deleteEntry(id) {
  return request("/reading-list/" + id, { method: "DELETE" });
}
