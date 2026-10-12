/**
 * In-memory analytics cache for CampusPulse.
 *
 * Requirements:
 * - Kept on globalThis so Next.js hot reloads preserve or properly manage state.
 * - Recomputed once per data change:
 *   ticket change, fast-forward, reset, settings change, or import.
 */

interface CacheStore {
  version: number;
  data: Map<string, unknown>;
}

const g = globalThis as unknown as { __cpAnalyticsCache?: CacheStore };

function getStore(): CacheStore {
  if (!g.__cpAnalyticsCache) {
    g.__cpAnalyticsCache = {
      version: 1,
      data: new Map<string, unknown>(),
    };
  }
  return g.__cpAnalyticsCache;
}

/**
 * Invalidate all cached analytics data.
 * Called on ticket changes, fast-forward, reset, settings update.
 */
export function invalidateCache(): void {
  const store = getStore();
  store.version++;
  store.data.clear();
}

/**
 * Retrieves a cached item or computes and stores it.
 */
export function getCachedOrCompute<T>(key: string, computeFn: () => T): T {
  const store = getStore();
  if (store.data.has(key)) {
    return store.data.get(key) as T;
  }
  const val = computeFn();
  store.data.set(key, val);
  return val;
}

/**
 * Retrieves the current cache version number.
 */
export function getCacheVersion(): number {
  return getStore().version;
}
