/**
 * Token Utilities
 * Ported from frontend/src/utils/tokenUtils.js
 * Uses atob for JWT payload decode (available in RN/Expo; fallback for older envs).
 */

function base64Decode(str) {
  if (typeof atob !== 'undefined') return atob(str);
  // Fallback: Buffer is available in Metro/RN
  if (typeof global !== 'undefined' && global.Buffer) {
    return global.Buffer.from(str, 'base64').toString('utf-8');
  }
  throw new Error('No base64 decode available') // i18n-ignore: dev;
}

/**
 * Decode JWT token without verification (client-side only)
 */
export const decodeToken = (token) => {
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    // Handle URL-safe base64
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(base64Decode(padded));
    return decoded;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;

  const expirationTime = decoded.exp * 1000;
  return Date.now() >= expirationTime - 5000;
};

/**
 * Get token expiration time
 */
export const getTokenExpiration = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return null;
  return new Date(decoded.exp * 1000);
};

/**
 * Get time until token expires (ms)
 */
export const getTimeUntilExpiration = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return null;
  const remaining = decoded.exp * 1000 - Date.now();
  return remaining > 0 ? remaining : null;
};
