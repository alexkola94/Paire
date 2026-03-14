/**
 * API Client - Base authenticated request helper
 * Used by feature services for backend API calls.
 * Handles JWT auth, CSRF, session expiration, and URL normalization.
 */

import { getToken, getStoredUser } from '../../features/auth/services/auth'
import { isTokenExpired } from '../utils/tokenUtils'
import { sessionManager } from './sessionManager'
import { getCsrfToken, clearCsrfCache } from './csrf'
import { fetchWithRetry } from '../utils/retryFetch'
import { getBackendUrl as getBackendApiUrl } from '../utils/getBackendUrl'

/**
 * Get current authenticated user
 * @returns {Object|null} User object or null if not authenticated
 */
export const getCurrentUser = () => {
  const token = getToken()
  const user = getStoredUser()

  if (!token || !user) {
    throw new Error('User not authenticated') // i18n-ignore
  }

  return user
}

/**
 * Handle session expiration - clear session and notify app
 */
export const handleSessionExpiration = () => {
  sessionManager.clearSession()
  window.dispatchEvent(new CustomEvent('session-invalidated', {
    detail: { reason: 'Session expired' }
  }))
}

/**
 * Make authenticated API request to backend
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} Response data
 */
export const apiRequest = async (url, options = {}) => {
  const token = getToken()

  if (token && isTokenExpired(token)) {
    console.warn('Token expired, clearing session')
    handleSessionExpiration()
    throw new Error('Session expired. Please log in again.') // i18n-ignore
  }

  let backendApiUrl = getBackendApiUrl()

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
  const normalizedUrl = url.startsWith('/') ? url : `/${url}`
  const fullUrl = `${backendApiUrl}${normalizedUrl}`

  const headers = { ...options.headers }

  if (options.body && !headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const method = (options.method || 'GET').toUpperCase()
  const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
  if (stateChangingMethods.includes(method)) {
    try {
      const csrfToken = await getCsrfToken()
      if (csrfToken) headers['X-CSRF-TOKEN'] = csrfToken
    } catch (e) {
      console.warn('Could not get CSRF token:', e.message)
    }
  }

  try {
    const response = await fetchWithRetry(
      () => fetch(fullUrl, {
        ...options,
        headers,
        credentials: 'include'
      })
    )

    if (response.status === 400) {
      const cloned = response.clone()
      try {
        const body = await cloned.json()
        if (body?.error?.toLowerCase?.().includes('csrf')) clearCsrfCache()
      } catch (_) { /* ignore */ }
    }

    if (response.status === 401) {
      console.warn('Received 401 Unauthorized, clearing session')
      handleSessionExpiration()
      const errorData = await response.text().catch(() => '')
      const errorMessage = errorData || 'Session expired. Please log in again.'
      throw new Error(errorMessage)
    }

    if (options.method === 'DELETE' && response.status === 204) {
      return
    }

    if (!response.ok) {
      const errorData = await response.text().catch(() => '')
      const errorMessage = errorData || `HTTP error! status: ${response.status}`
      throw new Error(errorMessage)
    }

    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return await response.json()
    }

    return await response.text()
  } catch (error) {
    if (error.name === 'TypeError' || error.message?.includes('Failed to fetch')) {
      throw new Error(`Cannot connect to API at ${fullUrl}. Please check if the server is running and CORS is configured correctly.`)
    }
    throw error
  }
}
