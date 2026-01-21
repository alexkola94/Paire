// Travel Advisory Service
// ------------------------
// Simple, well‑commented wrapper around the backend advisory endpoint.
// - Uses IndexedDB apiCache via travelDb helpers for a 24h TTL.
// - Keeps logic small and readable so it is easy to debug.

import { getCached, setCached } from './travelDb'
import { geocodingService } from './travelApi'
import { getToken } from '../../services/auth'
import { getBackendUrl as getBackendApiUrl } from '../../utils/getBackendUrl'

const ADVISORY_TTL = 24 * 60 * 60 * 1000 // 24 hours in ms

/**
 * Normalize a country code to upper‑case ISO style.
 * Accepts 2‑letter or 3‑letter codes and trims whitespace.
 */
const normalizeCountryCode = (code) => {
  if (!code) return null
  return String(code).trim().toUpperCase()
}

/**
 * Build a stable cache key for a single country advisory.
 */
const getAdvisoryCacheKey = (countryCode) =>
  `travel-advisory-${normalizeCountryCode(countryCode)}`

/**
 * Call backend advisory endpoint for a single country.
 * This keeps the fetch isolated so we can reuse it easily.
 * Includes authentication headers to match backend requirements.
 */
const fetchAdvisoryFromBackend = async (countryCode) => {
  const normalized = normalizeCountryCode(countryCode)
  if (!normalized) return null

  try {
    // Get authentication token
    const token = getToken()
    
    // Construct full backend URL
    let backendApiUrl = getBackendApiUrl()
    
    // Handle IP address scenarios (same pattern as travelApi.js)
    if (typeof window !== 'undefined' && window.location) {
      const currentHostname = window.location.hostname
      const currentProtocol = window.location.protocol

      if (currentHostname &&
        currentHostname !== 'localhost' &&
        currentHostname !== '127.0.0.1' &&
        backendApiUrl.includes('localhost')) {
        backendApiUrl = `${currentProtocol}//${currentHostname}:5038`
      }
    }

    backendApiUrl = backendApiUrl.replace(/\/+$/, '')
    const url = `${backendApiUrl}/api/travel/advisory/${encodeURIComponent(normalized)}`

    // Prepare headers with authentication
    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      redirect: 'follow' // Explicitly follow redirects (default, but being explicit)
    })

    if (!response.ok) {
      // Log more details for debugging
      console.error('Travel advisory backend error:', {
        status: response.status,
        statusText: response.statusText,
        url: url,
        redirected: response.redirected
      })
      return null
    }

    const data = await response.json()

    // Expect the backend to already normalise the shape.
    if (!data || data.hasData === false) {
      return null
    }

    // Defensive helpers so we never blow up the card UI if the backend shape changes.
    const toStringArray = (value) => {
      if (!Array.isArray(value)) return []
      return value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
    }

    // Start from the backend DTO so any new fields added server‑side
    // automatically flow through to the frontend.
    const base = { ...data }

    return {
      ...base,
      countryCode: data.countryCode || normalized,
      countryName: data.countryName || normalized,
      score: typeof data.score === 'number' ? data.score : null,
      level: data.level || 'unknown',
      message: data.message || '',
      updated: data.updated || null,
      sourcesActive: typeof data.sourcesActive === 'number' ? data.sourcesActive : 0,
      // Rich highlight sections used by TravelAdvisoryCard's "More details" modal.
      climateHighlights: toStringArray(data.climateHighlights),
      entryExitHighlights: toStringArray(data.entryExitHighlights),
      healthHighlights: toStringArray(data.healthHighlights),
      safetyHighlights: toStringArray(data.safetyHighlights)
    }
  } catch (error) {
    console.error('Error fetching travel advisory:', error)
    return null
  }
}

/**
 * Get advisory for a single country code with caching.
 * - First tries IndexedDB cache.
 * - Falls back to backend proxy.
 */
export const getAdvisory = async (countryCode) => {
  const normalized = normalizeCountryCode(countryCode)
  if (!normalized) return null

  const cacheKey = getAdvisoryCacheKey(normalized)

  // Try cache first
  const cached = await getCached(cacheKey)
  if (cached) {
    return cached
  }

  // No cache – call backend
  const advisory = await fetchAdvisoryFromBackend(normalized)

  if (advisory) {
    await setCached(cacheKey, advisory, ADVISORY_TTL)
  }

  return advisory
}

/**
 * Get advisories for a list of countries.
 * Keeps the implementation intentionally simple:
 * - Deduplicates country codes.
 * - Looks up cache per code, then fetches the remaining in parallel.
 */
export const getAdvisories = async (countryCodes = []) => {
  if (!Array.isArray(countryCodes) || countryCodes.length === 0) return []

  const uniqueCodes = Array.from(
    new Set(
      countryCodes
        .map(normalizeCountryCode)
        .filter(Boolean)
    )
  )

  const results = []
  const toFetch = []

  // First pass: try cache
  for (const code of uniqueCodes) {
    const cacheKey = getAdvisoryCacheKey(code)
    // eslint-disable-next-line no-await-in-loop
    const cached = await getCached(cacheKey)
    if (cached) {
      results.push(cached)
    } else {
      toFetch.push(code)
    }
  }

  // Second pass: fetch missing advisories in parallel
  if (toFetch.length > 0) {
    const fetchTasks = toFetch.map(code => fetchAdvisoryFromBackend(code))
    const fetched = await Promise.all(fetchTasks)

    for (let i = 0; i < toFetch.length; i++) {
      const advisory = fetched[i]
      const code = toFetch[i]

      if (advisory) {
        results.push(advisory)
        const cacheKey = getAdvisoryCacheKey(code)
        // Fire and forget – no need to block UI on cache write.
        setCached(cacheKey, advisory, ADVISORY_TTL).catch(err => {
          console.error('Error caching advisory:', err)
        })
      }
    }
  }

  return results
}

/**
 * Helper: try to infer a country advisory from a trip object.
 * Logic is intentionally small and direct so it is easy to reason about.
 */
export const getAdvisoryForTrip = async (trip) => {
  if (!trip) return null

  // Prefer explicit country if the trip already has one.
  if (trip.country) {
    return getAdvisory(trip.country)
  }

  // Fallback: if we only have a destination name but also coordinates,
  // we can re‑use the backend geocoding to resolve a country.
  if (trip.latitude != null && trip.longitude != null) {
    try {
      const results = await geocodingService.search?.(
        trip.destination || '',
        1
      )

      const first = Array.isArray(results) ? results[0] : null
      if (first?.country) {
        return getAdvisory(first.country)
      }
    } catch (error) {
      console.error('Error resolving country for trip advisory:', error)
    }
  }

  return null
}

export default {
  getAdvisory,
  getAdvisories,
  getAdvisoryForTrip
}

