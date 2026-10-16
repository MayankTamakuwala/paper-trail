const STORAGE_KEY = "paper-trail-user";

let cachedId = null;

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return "u-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getUserId() {
  if (cachedId) {
    return cachedId;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (stored) {
      cachedId = stored;
      return cachedId;
    }

    cachedId = createId();
    window.localStorage.setItem(STORAGE_KEY, cachedId);
    return cachedId;
  } catch {
    cachedId = createId();
    return cachedId;
  }
}
