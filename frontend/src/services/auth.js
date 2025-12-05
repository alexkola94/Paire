/**
 * Authentication Service
 * Handles all authentication operations using our custom backend API
 */

import { getBackendUrl } from '../utils/getBackendUrl';

// Token storage keys
const TOKEN_KEY = 'auth_token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const USER_KEY = 'user'

/**
 * Get stored auth token
 */
export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * Get stored refresh token
 */
export const getRefreshToken = () => {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

/**
 * Get stored user data
 */
export const getStoredUser = () => {
  const userJson = localStorage.getItem(USER_KEY)
  return userJson ? JSON.parse(userJson) : null
}

/**
 * Store authentication data
 */
const storeAuthData = (token, refreshToken, user) => {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

/**
 * Clear authentication data
 */
const clearAuthData = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

/**
 * Make authenticated API request
 */
const apiRequest = async (url, options = {}) => {
  const token = getToken()
  
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

      // Store authentication data (no 2FA required)
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
   */
  async signOut() {
    // For JWT tokens, logout is purely client-side
    // Just clear the tokens from localStorage
    clearAuthData()
    
    // Note: Navigation is handled by the calling component (Layout.jsx)
  },

  /**
   * Get the current session
   */
  async getSession() {
    const token = getToken()
    const user = getStoredUser()
    
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
      
      // Update stored user
      localStorage.setItem(USER_KEY, JSON.stringify(data))
      
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

