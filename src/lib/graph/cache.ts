// Simple in-memory TTL cache for reference/master data that changes rarely.
// On Azure App Service the Node process is long-lived, so entries persist
// across requests — turning repeated SharePoint/Graph calls into one call
// per TTL window. In-flight de-duplication prevents a thundering herd when
// several requests miss the cache at once.

type Entry<T> = { value: Promise<T>; expiresAt: number };

const store = new Map<string, Entry<unknown>>();

/**
 * Return the cached value for `key`, or run `fetcher` to populate it.
 * Concurrent callers during a miss share the same in-flight promise.
 * A rejected fetch is not cached (so the next call retries).
 */
export async function cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const value = fetcher();
  store.set(key, { value, expiresAt: Date.now() + ttlMs });

  try {
    return await value;
  } catch (err) {
    // Don't cache failures — drop the entry so the next call retries.
    if (store.get(key)?.value === value) store.delete(key);
    throw err;
  }
}

/** Drop a single cache entry (e.g. after a write that changes the data). */
export function invalidate(key: string): void {
  store.delete(key);
}

/** Drop all cache entries. */
export function invalidateAll(): void {
  store.clear();
}
