/**
 * In-memory LRU cache for normalised AI medicine lookups.
 *
 * Deliberately NOT stored in MongoDB: this is disposable, per-process data and
 * Atlas has a 512 MB budget. A Map keeps insertion order, so re-inserting an
 * entry on read moves it to the "most recently used" end and the first key is
 * always the least recently used one.
 *
 * - max 200 entries
 * - 1 hour TTL per entry (checked lazily on read)
 * - cleared whenever the process restarts, which is fine for a demo
 */
const MAX_ENTRIES = 200;
const TTL_MS = 60 * 60 * 1000;

/** @type {Map<string, { value: object, expiresAt: number }>} */
const store = new Map();

/** Normalise a medicine name so " Dolo  650 " and "dolo 650" share a key. */
export function aiLookupCacheKey(medicineName) {
  return String(medicineName ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function getCachedMedicineInfo(key) {
  if (!key) return null;
  const entry = store.get(key);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }

  // Refresh recency: delete + set moves the key to the end of the Map.
  store.delete(key);
  store.set(key, entry);
  return entry.value;
}

export function setCachedMedicineInfo(key, value) {
  if (!key || !value) return;
  if (store.has(key)) store.delete(key);

  // Evict expired entries first, then the least recently used one.
  if (store.size >= MAX_ENTRIES) {
    const now = Date.now();
    for (const [storedKey, entry] of store) {
      if (entry.expiresAt <= now) store.delete(storedKey);
    }
  }
  while (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }

  store.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

export function clearAiLookupCache() {
  store.clear();
}

export function getAiLookupCacheStats() {
  return { size: store.size, maxEntries: MAX_ENTRIES, ttlMs: TTL_MS };
}
