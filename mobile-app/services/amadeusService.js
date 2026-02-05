/**
 * Amadeus Self-Service API client for flight offers search.
 * Uses the free-tier test environment (test.api.amadeus.com).
 * Returns normalized offer arrays; silently returns [] on any error.
 *
 * Env vars: EXPO_PUBLIC_AMADEUS_API_KEY, EXPO_PUBLIC_AMADEUS_API_SECRET
 */

import axios from 'axios';
import { resolveIATA } from '../utils/iataCodeMap';

const API_KEY = process.env.EXPO_PUBLIC_AMADEUS_API_KEY || '';
const API_SECRET = process.env.EXPO_PUBLIC_AMADEUS_API_SECRET || '';
const BASE_URL = 'https://test.api.amadeus.com';

// Module-level token cache
let _accessToken = '';
let _tokenExpiry = 0;

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 7000,
});

/**
 * Obtain or reuse an OAuth2 access token (client_credentials grant).
 * @returns {Promise<string>} access token or '' on failure
 */
async function getAccessToken() {
  if (_accessToken && Date.now() < _tokenExpiry) return _accessToken;

  try {
    const res = await client.post(
      '/v1/security/oauth2/token',
      `grant_type=client_credentials&client_id=${encodeURIComponent(API_KEY)}&client_secret=${encodeURIComponent(API_SECRET)}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    _accessToken = res.data.access_token || '';
    // Expire 60s early to avoid edge-case failures
    _tokenExpiry = Date.now() + (res.data.expires_in - 60) * 1000;
    return _accessToken;
  } catch {
    _accessToken = '';
    _tokenExpiry = 0;
    return '';
  }
}

/**
 * Format a duration string like "PT2H30M" to "2h 30m".
 */
function formatDuration(iso) {
  if (!iso) return '';
  const h = iso.match(/(\d+)H/);
  const m = iso.match(/(\d+)M/);
  const parts = [];
  if (h) parts.push(`${h[1]}h`);
  if (m) parts.push(`${m[1]}m`);
  return parts.join(' ') || iso;
}

/**
 * Search for one-way flight offers.
 * @param {string} originCity - City name (resolved to IATA code)
 * @param {string} destCity - City name (resolved to IATA code)
 * @param {string} date - YYYY-MM-DD departure date
 * @returns {Promise<Array<{ provider: string, airline: string, price: string, currency: string, duration: string, stops: number, departureTime: string, arrivalTime: string, bookingUrl: string }>>}
 */
export async function searchFlights(originCity, destCity, date) {
  if (!API_KEY || !API_SECRET) return [];

  const originCode = resolveIATA(originCity);
  const destCode = resolveIATA(destCity);
  if (!originCode || !destCode || !date) return [];

  try {
    const token = await getAccessToken();
    if (!token) return [];

    const res = await client.get('/v2/shopping/flight-offers', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        originLocationCode: originCode,
        destinationLocationCode: destCode,
        departureDate: date,
        adults: 1,
        nonStop: false,
        currencyCode: 'EUR',
        max: 5,
      },
    });

    const offers = res.data?.data || [];
    return offers.map((offer) => {
      const firstItinerary = offer.itineraries?.[0];
      const segments = firstItinerary?.segments || [];
      const firstSeg = segments[0];
      const lastSeg = segments[segments.length - 1];
      const carrierCode = firstSeg?.carrierCode || '';
      const carrierName =
        res.data?.dictionaries?.carriers?.[carrierCode] || carrierCode;

      return {
        provider: 'Amadeus',
        airline: carrierName,
        price: offer.price?.total || '',
        currency: offer.price?.currency || 'EUR',
        duration: formatDuration(firstItinerary?.duration),
        stops: Math.max(0, segments.length - 1),
        departureTime: firstSeg?.departure?.at || '',
        arrivalTime: lastSeg?.arrival?.at || '',
        bookingUrl: `https://www.google.com/travel/flights?q=flights+from+${encodeURIComponent(originCity)}+to+${encodeURIComponent(destCity)}+on+${date}`,
      };
    });
  } catch {
    return [];
  }
}
