/**
 * API Cache Utility
 * Provides request caching, debouncing, and deduplication for better performance
 * Reduces unnecessary API calls and improves app responsiveness
 */

// Cache storage - in-memory cache with TTL (Time To Live)
const cache = new Map()

// Default cache TTL: 5 minutes
const DEFAULT_TTL = 5 * 60 * 1000

// Pending requests map to prevent duplicate concurrent requests
const pendingRequests = new Map()

/**
 * Generate cache key from URL and options
 * @param {string} url - API endpoint URL
 * @param {Object} options - Request options
 * @returns {string} Cache key
 */
const getCacheKey = (url, options = {}) => {
  const method = options.method || 'GET'
  const body = options.body ? JSON.stringify(options.body) : ''
  return `${method}:${url}:${body}`
}

/**
 * Check if cache entry is still valid
 * @param {Object} cacheEntry - Cached entry with timestamp
 * @returns {boolean} True if cache is valid
 */
const isCacheValid = (cacheEntry) => {
  if (!cacheEntry) return false
  const now = Date.now()
  return (now - cacheEntry.timestamp) < cacheEntry.ttl
}

/**
 * Get cached response if available and valid
 * @param {string} key - Cache key
 * @returns {any|null} Cached data or null
 */
export const getCached = (key) => {
  const entry = cache.get(key)
  if (isCacheValid(entry)) {
    return entry.data
  }
  // Remove expired entry
  if (entry) {
    cache.delete(key)
  }
  return null
}

/**
 * Set cache entry
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time to live in milliseconds
 */
export const setCached = (key, data, ttl = DEFAULT_TTL) => {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  })
}

/**
 * Clear cache entry or entire cache
 * @param {string|null} key - Cache key to clear, or null to clear all
 */
export const clearCache = (key = null) => {
  if (key) {
    cache.delete(key)
  } else {
    cache.clear()
  }
}

/**
 * Clear cache entries matching a pattern
 * @param {string} pattern - Pattern to match (e.g., 'GET:/api/transactions')
 */
export const clearCachePattern = (pattern) => {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key)
    }
  }
}

/**
 * Wrapper for fetch with caching
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @param {Object} cacheOptions - Cache options { useCache: boolean, ttl: number }
 * @returns {Promise<any>} Response data
 */
export const cachedFetch = async (url, options = {}, cacheOptions = {}) => {
  const { useCache = true, ttl = DEFAULT_TTL } = cacheOptions
  const method = options.method || 'GET'
  
  // Only cache GET requests by default
  const shouldCache = useCache && method === 'GET'
  const cacheKey = getCacheKey(url, options)
  
  // Check cache first
  if (shouldCache) {
    const cached = getCached(cacheKey)
    if (cached !== null) {
      return cached
    }
  }
  
  // Check if request is already pending (deduplication)
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey)
  }
  
  // Make the request
  const requestPromise = fetch(url, options)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const contentType = response.headers.get('content-type')
      const data = contentType && contentType.includes('application/json')
        ? await response.json()
        : await response.text()
      
      // Cache successful GET responses
      if (shouldCache && response.ok) {
        setCached(cacheKey, data, ttl)
      }
      
      return data
    })
    .finally(() => {
      // Remove from pending requests
      pendingRequests.delete(cacheKey)
    })
  
  // Store pending request
  pendingRequests.set(cacheKey, requestPromise)
  
  return requestPromise
}

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function to limit function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit) => {
  let inThrottle
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

