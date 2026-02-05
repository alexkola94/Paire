/**
 * CSRF Token Service
 * Ported from frontend/src/services/csrf.js
 */

import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

let cachedToken = null;

/**
 * Get CSRF token from the API. Caches in memory.
 */
export async function getCsrfToken() {
  if (cachedToken) return cachedToken;

  const url = `${API_URL}/api/antiforgery/token`;

  const response = await axios.get(url, {
    headers: { Accept: 'application/json' },
    withCredentials: true,
  });

  cachedToken = response.data?.token ?? response.data?.requestToken ?? null;
  if (!cachedToken) throw new Error('CSRF token not in response') // i18n-ignore: dev;
  return cachedToken;
}

/**
 * Clear cached token so next request fetches a new one.
 */
export function clearCsrfCache() {
  cachedToken = null;
}
