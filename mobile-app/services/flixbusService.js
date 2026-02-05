/**
 * FlixBus search via RapidAPI for bus route offers.
 * Two-step process: resolve station IDs by city name, then search trips.
 * Returns normalized offer arrays; silently returns [] on any error.
 *
 * Env var: EXPO_PUBLIC_RAPIDAPI_KEY
 */

import axios from 'axios';

const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY || '';
const BASE_URL = 'https://flixbus2.p.rapidapi.com';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 8000,
  headers: {
    'X-RapidAPI-Key': RAPIDAPI_KEY,
    'X-RapidAPI-Host': 'flixbus2.p.rapidapi.com',
  },
});

/**
 * Search FlixBus stations by city name.
 * @param {string} cityName
 * @returns {Promise<string|null>} station ID or null
 */
async function findStationId(cityName) {
  try {
    const res = await client.get('/getStations', {
      params: { query: cityName },
    });
    const stations = res.data || [];
    if (stations.length === 0) return null;
    // Prefer the first station result
    return stations[0].id || stations[0].station_id || null;
  } catch {
    return null;
  }
}

/**
 * Format minutes into "Xh Ym" string.
 */
function formatMinutes(mins) {
  if (!mins && mins !== 0) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const parts = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  return parts.join(' ') || '0m';
}

/**
 * Search for bus routes between two cities.
 * @param {string} originCity - City name
 * @param {string} destCity - City name
 * @param {string} date - YYYY-MM-DD departure date
 * @returns {Promise<Array<{ provider: string, operator: string, price: string, currency: string, duration: string, departureTime: string, arrivalTime: string, bookingUrl: string }>>}
 */
export async function searchBusRoutes(originCity, destCity, date) {
  if (!RAPIDAPI_KEY) return [];
  if (!originCity || !destCity || !date) return [];

  try {
    const [originId, destId] = await Promise.all([
      findStationId(originCity),
      findStationId(destCity),
    ]);

    if (!originId || !destId) return [];

    const res = await client.get('/getTimetable', {
      params: {
        station_id: originId,
        date,
      },
    });

    const trips = res.data || [];
    // Filter trips heading to our destination station
    const matching = trips.filter((trip) => {
      const destStationId = String(trip.to_station_id || trip.arrival_station_id || '');
      return destStationId === String(destId);
    });

    return matching.slice(0, 5).map((trip) => {
      const durationMins = trip.duration?.minutes || trip.duration_minutes || 0;
      const price = trip.price?.total || trip.price?.amount || trip.price || '';
      const currency = trip.price?.currency || trip.currency || 'EUR';

      return {
        provider: 'FlixBus',
        operator: trip.operator || trip.line_name || 'FlixBus',
        price: String(price),
        currency,
        duration: formatMinutes(durationMins),
        departureTime: trip.departure?.date_time || trip.departure_time || '',
        arrivalTime: trip.arrival?.date_time || trip.arrival_time || '',
        bookingUrl: `https://shop.flixbus.com/search?departureCity=${encodeURIComponent(originCity)}&arrivalCity=${encodeURIComponent(destCity)}&rideDate=${date}`,
      };
    });
  } catch {
    return [];
  }
}
