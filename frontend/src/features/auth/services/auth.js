/**
 * Authentication Service
 * Handles all authentication operations using our custom backend API
 * Uses sessionManager for per-tab session management
 *
 * SECURITY: Supports "Keep Me Logged In" with device fingerprinting
 * - Device fingerprint binds session to specific device
 * - Fingerprint mismatch on token refresh = session revoked (theft detection)
 */

import { getBackendUrl } from '../../../shared/utils/getBackendUrl'
import { sessionManager } from '../../../shared/services/sessionManager'
import { isTokenExpired } from '../../../shared/utils/tokenUtils'
import { getDeviceFingerprint, clearDeviceFingerprintCache } from '../../../shared/utils/deviceFingerprint'
import { fetchWithRetry } from '../../../shared/utils/retryFetch'

/**
 * Get stored auth token (from sessionStorage)
 */
export const getToken = () => {
  return sessionManager.getToken()
}

/**
 * Get stored refresh token (from sessionStorage)
 */
export const getRefreshToken = () => {
  return sessionManager.getRefreshToken()
}

/**
 * Get stored user data (from sessionStorage)
 */
export const getStoredUser = () => {
  return sessionManager.getCurrentUser()
}

/**
 * Update stored user data (optimistic update)
 * Useful for updating specific user properties without full re-auth
 * @param {Object} updates - Partial user object with properties to update
 */
export const updateStoredUser = (updates) => {
  return sessionManager.updateCurrentUser(updates)
}

/**
 * Store authentication data (per-tab session or persistent)
 * The storeSession method automatically broadcasts SESSION_CREATED
 * which will invalidate other tabs with the same user
 */
const storeAuthData = (token, refreshToken, user, rememberMe = false) => {
  sessionManager.storeSession(token, refreshToken, user, rememberMe)
}

/**
 * Clear authentication data (per-tab)
 */
const clearAuthData = () => {
  sessionManager.clearSession()
}

/**
 * Handle session expiration - clear session and notify app
 */
const handleSessionExpiration = () => {
  clearAuthData()
  window.dispatchEvent(new CustomEvent('session-invalidated', {
    detail: { reason: 'Session expired' }
  }))
}

/**
 * Make authenticated API request
 */
const apiRequest = async (url, options = {}) => {
  const token = getToken()

  if (token && isTokenExpired(token)) {
    console.warn('Token expired, clearing session')
    handleSessionExpiration()
    throw new Error('Session expired. Please log in again.') // i18n-ignore
  }

  let backendUrl = getBackendUrl()

  if (typeof window !== 'undefined' && window.location) {
    const currentHostname = window.location.hostname
    const currentProtocol = window.location.protocol

    if (currentHostname &&
      currentHostname !== 'localhost' &&
      currentHostname !== '127.0.0.1' &&
      backendUrl.includes('localhost')) {
      backendUrl = `${currentProtocol}//${currentHostname}:5038`
    }
  }

  backendUrl = backendUrl.replace(/\/+$/, '')
  const normalizedUrl = url.startsWith('/') ? url : `/${url}`
  const fullUrl = `${backendUrl}${normalizedUrl}`

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetchWithRetry(
      () => fetch(fullUrl, { ...options, headers })
    )

    if (response.status === 401) {
      console.warn(`[Auth] Received 401 from ${fullUrl} - clearing session`)
      handleSessionExpiration()
      const errorData = await response.text().catch(() => '')
      const errorMessage = errorData || 'Session expired. Please log in again.'
      throw new Error(errorMessage)
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))

      let errorMessage = `HTTP error! status: ${response.status}`

      if (errorData) {
        if (errorData.errors && typeof errorData.errors === 'object') {
          const allErrors = Object.values(errorData.errors).flat()
          if (allErrors.length > 0) {
            errorMessage = allErrors.join('. ')
          }
        } else if (errorData.error) {
          errorMessage = errorData.error
        } else if (errorData.message) {
          errorMessage = errorData.message
        } else if (errorData.detail) {
          errorMessage = errorData.detail
        } else if (errorData.title) {
          errorMessage = errorData.title
        }
      }

      console.error('API error response:', { status: response.status, error: errorData, parsedMessage: errorMessage })
      throw new Error(errorMessage)
    }

    const data = await response.json()
    return data
  } catch (error) {
    if (error.name === 'TypeError' || error.message?.includes('Failed to fetch')) {
      const detailedError = `Cannot connect to API at ${fullUrl}. Please check if the server is running and CORS is configured correctly.`
      console.error('Network error:', { error, url: fullUrl, message: detailedError })
      throw new Error(detailedError)
    }
    console.error('API request error:', { error, url: fullUrl })
    throw error
  }
}

/**
 * Authentication service
 */
export const authService = {
  async signIn(email, password, rememberMe = false) {
    try {
      let deviceFingerprint = null
      try {
        deviceFingerprint = await getDeviceFingerprint()
      } catch (error) {
        console.warn('Failed to generate device fingerprint:', error)
      }

      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          rememberMe,
          deviceFingerprint
        })
      })

      if (data.requiresTwoFactor) {
        return { ...data, rememberMe, deviceFingerprint }
      }

      storeAuthData(data.token, data.refreshToken, data.user, rememberMe)
      return data
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  },

  async signUp(email, password, displayName = '', emailNotificationsEnabled = false) {
    return this.register({
      email,
      password,
      confirmPassword: password,
      displayName,
      emailNotificationsEnabled
    })
  },

  async register(userData) {
    try {
      const data = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      })
      return data
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  },

  async signInWithGoogle(idToken) {
    try {
      const data = await apiRequest('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({ idToken })
      })
      storeAuthData(data.token, data.refreshToken, data.user, true)
      return data
    } catch (error) {
      console.error('Sign in with Google error:', error)
      throw error
    }
  },

  async signOut() {
    try {
      const token = getToken()
      if (token) {
        try {
          await apiRequest('/api/auth/logout', {
            method: 'POST'
          })
        } catch (error) {
          console.warn('Backend logout failed, continuing with client-side logout:', error)
        }
      }
    } catch (error) {
      console.warn('Error during logout:', error)
    } finally {
      clearAuthData()
      clearDeviceFingerprintCache()
    }
  },

  async getSession() {
    if (!sessionManager.hasSession()) {
      return null
    }

    const token = getToken()
    const user = getStoredUser()

    if (token && isTokenExpired(token)) {
      console.warn('Token expired in getSession, clearing session')
      handleSessionExpiration()
      return null
    }

    if (token && user) {
      return { token, user }
    }

    return null
  },

  async getUser(forceRefresh = false) {
    try {
      if (!forceRefresh) {
        const storedUser = getStoredUser()
        if (storedUser) {
          return storedUser
        }
      }

      const data = await apiRequest('/api/auth/me')

      const token = getToken()
      const refreshToken = getRefreshToken()
      if (token && refreshToken) {
        storeAuthData(token, refreshToken, data)
      }

      return data
    } catch (error) {
      console.error('Get user error:', error)
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        clearAuthData()
      }
      throw error
    }
  },

  async resetPassword(email) {
    try {
      const data = await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      })
      return data
    } catch (error) {
      console.error('Reset password error:', error)
      throw error
    }
  },

  async confirmResetPassword(token, email, newPassword) {
    try {
      const data = await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token,
          email,
          newPassword,
          confirmPassword: newPassword
        })
      })
      return data
    } catch (error) {
      console.error('Confirm reset password error:', error)
      throw error
    }
  },

  async updatePassword(currentPassword, newPassword) {
    try {
      const data = await apiRequest('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword: newPassword
        })
      })
      return data
    } catch (error) {
      console.error('Update password error:', error)
      throw error
    }
  },

  async confirmEmail(userId, token) {
    try {
      const data = await apiRequest('/api/auth/confirm-email', {
        method: 'POST',
        body: JSON.stringify({ userId, token })
      })
      return data
    } catch (error) {
      console.error('Confirm email error:', error)
      throw error
    }
  },

  async resendConfirmation(email) {
    try {
      const data = await apiRequest('/api/auth/resend-confirmation', {
        method: 'POST',
        body: JSON.stringify({ email })
      })
      return data
    } catch (error) {
      console.error('Resend confirmation error:', error)
      throw error
    }
  },

  isAuthenticated() {
    return !!getToken()
  },

  getCurrentUser() {
    return getStoredUser()
  },

  getToken() {
    return sessionManager.getToken()
  }
}
