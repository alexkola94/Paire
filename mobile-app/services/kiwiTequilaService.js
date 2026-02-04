/**
 * Kiwi Tequila flight search – via backend API (mobile).
 * Backend holds API key; no EXPO_PUBLIC_KIWI_* env needed on mobile.
 */

import { transportBookingService } from './api';

export const isKiwiTequilaEnabled = () => true;

export const searchLocations = async () => [];
export const resolveToCode = async (name) => (name && name.trim().length === 3 ? name.trim().toUpperCase() : '');

export const searchFlights = async (params) => {
  if (!params?.flyFrom || !params?.flyTo || !params?.dateFrom) return [];
  try {
    const list = await transportBookingService.searchFlights({
      flyFrom: params.flyFrom,
      flyTo: params.flyTo,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo || undefined,
      returnFrom: params.returnFrom,
      returnTo: params.returnTo,
      adults: params.adults ?? 1,
      provider: 'kiwi',
    });
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error('Kiwi (backend) searchFlights error:', err);
    throw err;
  }
};

export default { isKiwiTequilaEnabled, searchLocations, resolveToCode, searchFlights };
