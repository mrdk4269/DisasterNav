import { config } from '../config/index.js';

// In-memory simple TTL cache
const cacheStore = new Map();

/**
 * Retrieve cached data by key if within TTL.
 * @param {string} key 
 * @param {number} [ttlMs] 
 * @returns {any|null}
 */
export function getCached(key, ttlMs = config.CACHE_TTL_MS) {
  const item = cacheStore.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > ttlMs) {
    cacheStore.delete(key);
    return null;
  }
  return item.data;
}

/**
 * Store data in cache with timestamp.
 * @param {string} key 
 * @param {any} data 
 */
export function setCached(key, data) {
  cacheStore.set(key, { data, timestamp: Date.now() });
}

/**
 * Clear all cached items (useful for testing or cache invalidation).
 */
export function clearCache() {
  cacheStore.clear();
}
