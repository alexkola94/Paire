/**
 * Token Utilities
 * Helper functions for JWT token management and expiration checking
 */

/**
 * Decode JWT token without verification (client-side only)
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded token payload or null if invalid
 */
export const decodeToken = (token) => {
  if (!token) {
    return null
  }

  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    // Decode the payload (second part)
    const payload = parts[1]
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return decoded
  } catch (error) {
    console.error('Error decoding token:', error)
    return null
  }
}

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} True if token is expired or invalid
 */
export const isTokenExpired = (token) => {
  const decoded = decodeToken(token)
  if (!decoded || !decoded.exp) {
    return true
  }

  // exp is in seconds, Date.now() is in milliseconds
  const expirationTime = decoded.exp * 1000
  const currentTime = Date.now()

  // Consider token expired if it expires within the next 5 seconds (buffer)
  return currentTime >= (expirationTime - 5000)
}

/**
 * Get token expiration time
 * @param {string} token - JWT token
 * @returns {Date|null} Expiration date or null if invalid
 */
export const getTokenExpiration = (token) => {
  const decoded = decodeToken(token)
  if (!decoded || !decoded.exp) {
    return null
  }

  return new Date(decoded.exp * 1000)
}

/**
 * Get time until token expires (in milliseconds)
 * @param {string} token - JWT token
 * @returns {number|null} Milliseconds until expiration or null if invalid/expired
 */
export const getTimeUntilExpiration = (token) => {
  const decoded = decodeToken(token)
  if (!decoded || !decoded.exp) {
    return null
  }

  const expirationTime = decoded.exp * 1000
  const currentTime = Date.now()
  const timeUntilExpiration = expirationTime - currentTime

  return timeUntilExpiration > 0 ? timeUntilExpiration : null
}

