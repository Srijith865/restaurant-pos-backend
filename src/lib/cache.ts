interface CacheEntry {
  data: any;
  timestamp: number;
}

const cacheStore: Record<string, CacheEntry> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in ms

export function getCached<T>(key: string): T | null {
  const entry = cacheStore[key];
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data as T;
  }
  return null;
}

export function setCache(key: string, data: any): void {
  cacheStore[key] = { data, timestamp: Date.now() };
}
