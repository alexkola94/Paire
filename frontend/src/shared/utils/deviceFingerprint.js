/**
 * Device Fingerprint Utility
 * 
 * Generates a consistent SHA-256 hash of browser/device characteristics
 * for session binding and enhanced security.
 * 
 * This fingerprint is used to:
 * 1. Bind refresh tokens to specific devices
 * 2. Detect potential token theft (fingerprint mismatch = session revoked)
 * 3. Enhance "Keep Me Logged In" security
 * 
 * Characteristics collected (non-invasive):
 * - User Agent
 * - Screen resolution
 * - Timezone
 * - Language
 * - Platform
 * - Color depth
 * - Available cores (hardware concurrency)
 * - Device memory (if available)
 * 
 * Note: This is NOT meant for tracking users across sites.
 * It's purely for security - binding sessions to devices.
 */

/**
 * Collects browser/device characteristics for fingerprinting
 * @returns {Object} Device characteristics object
 */
const collectDeviceCharacteristics = () => {
  const characteristics = {
    // Browser information
    userAgent: navigator.userAgent || '',
    language: navigator.language || navigator.userLanguage || '',
    languages: (navigator.languages || []).join(','),
    platform: navigator.platform || '',
    
    // Screen information
    screenWidth: window.screen?.width || 0,
    screenHeight: window.screen?.height || 0,
    colorDepth: window.screen?.colorDepth || 0,
    pixelRatio: window.devicePixelRatio || 1,
    
    // Timezone
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    timezoneOffset: new Date().getTimezoneOffset(),
    
    // Hardware hints (if available)
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: navigator.deviceMemory || 0,
    
    // Touch support
    touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    
    // WebGL renderer (provides GPU info without being too invasive)
    webglRenderer: getWebGLRenderer(),
  };

  return characteristics;
};

/**
 * Gets WebGL renderer information (GPU hint)
 * @returns {string} WebGL renderer string or empty
 */
const getWebGLRenderer = () => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
      }
    }
  } catch (e) {
    // WebGL not available or blocked
  }
  return '';
};

/**
 * Converts a string to SHA-256 hash using Web Crypto API
 * @param {string} message - String to hash
 * @returns {Promise<string>} SHA-256 hash as lowercase hex string
 */
const sha256 = async (message) => {
  // Encode message as UTF-8
  const msgBuffer = new TextEncoder().encode(message);
  
  // Hash the message
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  
  // Convert ArrayBuffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
};

/**
 * Generates a device fingerprint hash
 * 
 * @returns {Promise<string>} SHA-256 hash (64 characters) of device characteristics
 * 
 * @example
 * const fingerprint = await generateDeviceFingerprint();
 * // Returns: "a3f5b2c8d1e4f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1"
 */
export const generateDeviceFingerprint = async () => {
  try {
    const characteristics = collectDeviceCharacteristics();
    
    // Create a stable string from characteristics (sorted keys for consistency)
    const sortedKeys = Object.keys(characteristics).sort();
    const fingerprintData = sortedKeys
      .map(key => `${key}:${characteristics[key]}`)
      .join('|');
    
    // Generate SHA-256 hash
    const fingerprint = await sha256(fingerprintData);
    
    return fingerprint;
  } catch (error) {
    console.error('Error generating device fingerprint:', error);
    // Return a fallback fingerprint based on basic info
    const fallback = `${navigator.userAgent}|${navigator.language}|${window.screen?.width}x${window.screen?.height}`;
    return sha256(fallback);
  }
};

/**
 * Gets cached device fingerprint or generates a new one
 * Caches in sessionStorage to avoid regenerating on every request
 * 
 * @returns {Promise<string>} Device fingerprint hash
 */
export const getDeviceFingerprint = async () => {
  const cacheKey = 'device_fingerprint';
  
  // Check sessionStorage cache first
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Generate new fingerprint
  const fingerprint = await generateDeviceFingerprint();
  
  // Cache in sessionStorage (clears when tab closes)
  sessionStorage.setItem(cacheKey, fingerprint);
  
  return fingerprint;
};

/**
 * Clears cached device fingerprint
 * Call this when user logs out or when fingerprint needs refresh
 */
export const clearDeviceFingerprintCache = () => {
  sessionStorage.removeItem('device_fingerprint');
};

export default {
  generateDeviceFingerprint,
  getDeviceFingerprint,
  clearDeviceFingerprintCache,
};
