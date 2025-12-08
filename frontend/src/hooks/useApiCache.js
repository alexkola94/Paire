import { useState, useEffect, useCallback, useRef } from 'react'
import { getCached, setCached, clearCachePattern } from '../utils/apiCache'

/**
 * Custom hook for API calls with caching and loading states
 * Reduces unnecessary re-renders and API calls
 * 
 * @param {Function} apiFunction - Async function that makes the API call
 * @param {Array} dependencies - Dependencies array (like useEffect)
 * @param {Object} options - Options { useCache: boolean, ttl: number, immediate: boolean }
 * @returns {Object} { data, loading, error, refetch }
 */
export const useApiCache = (apiFunction, dependencies = [], options = {}) => {
  const { useCache = true, ttl = 5 * 60 * 1000, immediate = true } = options
  
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState(null)
  const abortControllerRef = useRef(null)
  
  // Generate cache key from function name and dependencies
  const getCacheKey = () => {
    const depsString = JSON.stringify(dependencies)
    return `${apiFunction.name || 'api'}:${depsString}`
  }
  
  // Fetch data function
  const fetchData = useCallback(async (skipCache = false) => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController()
    
    // Check cache first (unless skipCache is true)
    if (useCache && !skipCache) {
      const cacheKey = getCacheKey()
      const cached = getCached(cacheKey)
      if (cached !== null) {
        setData(cached)
        setLoading(false)
        setError(null)
        return
      }
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const result = await apiFunction(...dependencies)
      
      // Cache the result
      if (useCache) {
        const cacheKey = getCacheKey()
        setCached(cacheKey, result, ttl)
      }
      
      setData(result)
      setError(null)
    } catch (err) {
      // Don't set error if request was aborted
      if (err.name !== 'AbortError') {
        setError(err)
        setData(null)
      }
    } finally {
      setLoading(false)
      abortControllerRef.current = null
    }
  }, [apiFunction, ...dependencies, useCache, ttl])
  
  // Refetch function (bypasses cache)
  const refetch = useCallback(() => {
    return fetchData(true)
  }, [fetchData])
  
  // Fetch on mount and when dependencies change
  useEffect(() => {
    if (immediate) {
      fetchData()
    }
    
    // Cleanup: abort request on unmount or dependency change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchData, immediate])
  
  return { data, loading, error, refetch }
}

/**
 * Hook for invalidating cache patterns
 * Useful when data is updated and cache needs to be cleared
 */
export const useCacheInvalidation = () => {
  const invalidate = useCallback((pattern) => {
    clearCachePattern(pattern)
  }, [])
  
  return { invalidate }
}

