/**
 * Get the backend API URL dynamically based on the current hostname
 * This allows the app to work when accessed via IP address from mobile devices
 * IMPORTANT: This is called on each request to ensure it uses the current window location
 * 
 * @returns {string} The backend API URL
 */
/**
 * Normalize URL by removing trailing slashes
 */
const normalizeUrl = (url) => {
  if (!url) return url;
  return url.toString().trim().replace(/\/+$/, '');
};

export const getBackendUrl = () => {
  // Use environment variable if set
  if (import.meta.env.VITE_BACKEND_API_URL) {
    // Remove trailing slash to avoid double slashes when concatenating URLs
    return normalizeUrl(import.meta.env.VITE_BACKEND_API_URL);
  }

  // CRITICAL: Force check window.location at call time, not module load time
  if (typeof window === 'undefined' || !window.location) {
    // Use HTTP for local development (backend runs on HTTP profile)
    return 'http://localhost:5038';
  }

  // Get fresh values from window.location
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  // Check if hostname is an IP address (contains dots and numbers, not localhost)
  const isIPAddress = hostname &&
    hostname !== 'localhost' &&
    hostname !== '127.0.0.1' &&
    /^\d+\.\d+\.\d+\.\d+$/.test(hostname);

  if (isIPAddress) {
    // Construct URL with IP - use same protocol as frontend
    const scheme = protocol === 'https:' ? 'https:' : 'http:';
    return `${scheme}//${hostname}:5038`;
  }

  // Production domain check - Use Render backend
  if (hostname && (hostname === 'www.thepaire.org' || hostname === 'thepaire.org')) {
    return 'https://paire-api.onrender.com';
  }

  // Check if it's a domain name (not localhost)
  if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.includes('localhost')) {
    return `${protocol}//${hostname}:5038`;
  }

  // Default to localhost ONLY if we're actually on localhost
  // Use HTTP for local development (matches launchSettings http profile)
  const defaultUrl = 'http://localhost:5038';

  // SAFETY CHECK: If we're on an IP but returning localhost, something is very wrong
  if (hostname && /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    // Force return IP-based URL
    const scheme = protocol === 'https:' ? 'https:' : 'http:';
    return `${scheme}//${hostname}:5038`;
  }

  return defaultUrl;
};

