/**
 * In-memory cache for transport API search results.
 * Keeps results for 10 minutes to avoid redundant API calls
 * when navigating back and forth in the wizard.
 */

const TTL_MS = 10 * 60 * 1000; // 10 minutes

/** @type {Map<string, { data: any[], expiresAt: number }>} */
const cache = new Map();

/**
 * Build a cache key from search parameters.
 * @param {'flight'|'bus'} mode
 * @param {string} from
 * @param {string} to
 * @param {string} date - YYYY-MM-DD
 * @returns {string}
 */
export function buildCacheKey(mode, from, to, date) {
  return `${mode}|${(from || '').toLowerCase()}|${(to || '').toLowerCase()}|${date || ''}`;
}

/**
 * Get cached results if they exist and haven't expired.
 * @param {string} key
 * @returns {any[]|null}
 */
export function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

/**
 * Store results in the cache.
 * @param {string} key
 * @param {any[]} data
 */
export function setCached(key, data) {
  cache.set(key, { data, expiresAt: Date.now() + TTL_MS });
}

/**
 * Clear all cached results (e.g. on session end).
 */
export function clearCache() {
  cache.clear();
}
