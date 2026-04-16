const store = new Map();

export function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function set(key, value, ttlMs) {
  store.set(key, { value, expires: Date.now() + ttlMs });
}

// Periodically evict stale entries so the Map doesn't grow unboundedly.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.expires) store.delete(key);
  }
}, 5 * 60 * 1000);
