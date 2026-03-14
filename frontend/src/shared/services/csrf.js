/**
 * CSRF (Cross-Site Request Forgery) token helper.
 * Fetches the anti-forgery token from the backend so state-changing requests can include it.
 * Uses credentials so the antiforgery cookie is set and sent on subsequent requests.
 */

import { getBackendUrl } from '../utils/getBackendUrl'

// In-memory cache so we don't fetch the token on every request
let cachedToken = null

/**
 * Get the CSRF token from the API. Uses credentials so the antiforgery cookie is set.
 * Caches the token in memory; call clearCsrfCache() to force a refresh (e.g. after 400 invalid token).
 * @returns {Promise<string>} The request token to send in X-CSRF-TOKEN header
 */
export async function getCsrfToken() {
  if (cachedToken) return cachedToken

  const baseUrl = getBackendUrl().replace(/\/+$/, '')
  const url = `${baseUrl}/api/antiforgery/token`

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' }
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `Failed to get CSRF token: ${response.status}`)
  }

  const data = await response.json()
  cachedToken = data?.token ?? data?.requestToken ?? null
  if (!cachedToken) throw new Error('CSRF token not in response') // i18n-ignore
  return cachedToken
}

/**
 * Clear the cached CSRF token so the next state-changing request will fetch a new one.
 * Call this when the API returns 400 (invalid/missing CSRF token) before retrying.
 */
export function clearCsrfCache() {
  cachedToken = null
}
