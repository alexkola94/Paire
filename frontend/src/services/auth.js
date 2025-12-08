/**
 * Authentication Service
 * Handles all authentication operations using our custom backend API
 * Uses sessionManager for per-tab session management
 */

import { getBackendUrl } from '../utils/getBackendUrl';
import { sessionManager } from './sessionManager';
import { isTokenExpired } from '../utils/tokenUtils';

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
 * Store authentication data (per-tab session)
 * The storeSession method automatically broadcasts SESSION_CREATED
 * which will invalidate other tabs with the same user
 */
const storeAuthData = (token, refreshToken, user) => {
  sessionManager.storeSession(token, refreshToken, user)
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
  // Dispatch event to notify App.jsx
  window.dispatchEvent(new CustomEvent('session-invalidated', {
    detail: { reason: 'Session expired' }
  }))
}

/**
 * Make authenticated API request
 */
const apiRequest = async (url, options = {}) => {
  const token = getToken()
  
  // Check if token is expired before making request
  if (token && isTokenExpired(token)) {
    console.warn('Token expired, clearing session')
    handleSessionExpiration()
    throw new Error('Session expired. Please log in again.')
  }
  
  let backendUrl = getBackendUrl()
  
  // CRITICAL SAFETY CHECK: If we're on an IP but got localhost, FORCE use the IP
  if (typeof window !== 'undefined' && window.location) {
    const currentHostname = window.location.hostname
    const currentProtocol = window.location.protocol
    
    // If we're accessing via IP but got localhost, something is very wrong
    if (currentHostname && 
        currentHostname !== 'localhost' && 
        currentHostname !== '127.0.0.1' &&
        backendUrl.includes('localhost')) {
      // FORCE use the IP - override whatever getBackendUrl() returned
      backendUrl = `${currentProtocol}//${currentHostname}:5038`
    }
  }
  
  const fullUrl = `${backendUrl}${url}`
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers
    })

    // Handle 401 Unauthorized - session expired or invalid
    if (response.status === 401) {
      console.warn('Received 401 Unauthorized, clearing session')
      handleSessionExpiration()
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error || 'Session expired. Please log in again.'
      throw new Error(errorMessage)
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error || `HTTP error! status: ${response.status}`
      throw new Error(errorMessage)
    }

    const data = await response.json()
    return data
  } catch (error) {
    // Network errors (CORS, connection refused, etc.)
    if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
      throw new Error(`Cannot connect to API at ${fullUrl}. Please check if the server is running and CORS is configured correctly.`)
    }
    throw error
  }
}

/**
 * Authentication service
 */
export const authService = {
  /**
   * Sign in with email and password
   * Returns auth data if successful, or 2FA requirement if enabled
   */
  async signIn(email, password) {
    try {
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      })

      // Check if 2FA is required
      if (data.requiresTwoFactor) {
        // Don't store auth data yet - wait for 2FA verification
        return data
      }

      // Store authentication data (no 2FA required) - per-tab session
      storeAuthData(data.token, data.refreshToken, data.user)

      return data
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  },

  /**
   * Sign up with email and password
   */
  async signUp(email, password, displayName = '') {
    try {
      const data = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ 
          email, 
          password,
          confirmPassword: password,
          displayName 
        })
      })

      return data
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    }
  },

  /**
   * Sign out the current user
   * Revokes the session on the backend and clears local session
   */
  async signOut() {
    try {
      // Call backend logout endpoint to revoke session
      const token = getToken()
      if (token) {
        try {
          await apiRequest('/api/auth/logout', {
            method: 'POST'
          })
        } catch (error) {
          // Continue with client-side logout even if backend call fails
          console.warn('Backend logout failed, continuing with client-side logout:', error)
        }
      }
    } catch (error) {
      // Continue with client-side logout even if there's an error
      console.warn('Error during logout:', error)
    } finally {
      // Always clear local session data
      clearAuthData()
    }
    
    // Note: Navigation is handled by the calling component (Layout.jsx)
  },

  /**
   * Get the current session (from sessionStorage - per-tab)
   * Returns null if no session exists or token is expired (new tabs require login)
   */
  async getSession() {
    // Check if session exists in this tab
    if (!sessionManager.hasSession()) {
      return null
    }

    const token = getToken()
    const user = getStoredUser()
    
    // Check if token is expired
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

  /**
   * Get the current user
   * @param {boolean} forceRefresh - If true, always fetch from API instead of using cache
   */
  async getUser(forceRefresh = false) {
    try {
      // If not forcing refresh, check local storage first
      if (!forceRefresh) {
        const storedUser = getStoredUser()
        if (storedUser) {
          return storedUser
        }
      }

      // Fetch from API
      const data = await apiRequest('/api/auth/me')
      
      // Update stored user in session
      const token = getToken()
      const refreshToken = getRefreshToken()
      if (token && refreshToken) {
        storeAuthData(token, refreshToken, data)
      }
      
      return data
    } catch (error) {
      console.error('Get user error:', error)
      // If unauthorized, clear auth data
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        clearAuthData()
      }
      throw error
    }
  },

  /**
   * Reset password
   */
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

  /**
   * Confirm password reset with token
   */
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

  /**
   * Update user password
   */
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

  /**
   * Confirm email with token
   */
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

  /**
   * Resend confirmation email
   */
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

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!getToken()
  }
}

