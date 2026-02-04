/**
 * Skyscanner flight search – via backend API (mobile).
 * Backend holds API key and runs create + poll.
 */

import { transportBookingService } from './api';

const CITY_TO_IATA = {
  athens: 'ATH', piraeus: 'ATH', thessaloniki: 'SKG', santorini: 'JTR', mykonos: 'JMK',
  london: 'LON', paris: 'PAR', rome: 'FCO', milan: 'MIL', newyork: 'NYC', berlin: 'BER',
  amsterdam: 'AMS', madrid: 'MAD', barcelona: 'BCN',
};
const slug = (s) => (s || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');

export const resolveToIata = (name) => {
  if (!name) return '';
  const t = String(name).trim().toUpperCase();
  if (t.length === 3) return t;
  const key = slug(name).split('-')[0];
  return CITY_TO_IATA[key] || '';
};

export const isSkyscannerEnabled = () => true;

export const searchFlights = async (params) => {
  if (!params?.outboundDate) return [];
  const flyFrom = params.originIata || params.flyFrom || '';
  const flyTo = params.destinationIata || params.flyTo || '';
  if (!flyFrom || !flyTo) return [];
  try {
    const list = await transportBookingService.searchFlights({
      flyFrom,
      flyTo,
      dateFrom: params.outboundDate,
      dateTo: params.outboundDate,
      returnFrom: params.returnDate || undefined,
      returnTo: params.returnDate || undefined,
      adults: params.adults ?? 1,
      provider: 'skyscanner',
    });
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error('Skyscanner (backend) searchFlights error:', err);
    throw err;
  }
};

export default { isSkyscannerEnabled, resolveToIata, searchFlights };
