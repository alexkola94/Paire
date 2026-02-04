/**
 * TripGo (SkedGo) bus/multimodal search – via backend API (mobile).
 * Backend holds API key and geocodes place names.
 */

import { transportBookingService } from './api';

export const isTripGoEnabled = () => true;
export const geocodePlace = async () => null;

export const searchRoutes = async (params) => {
  if (
    typeof params?.fromLat !== 'number' || typeof params?.fromLon !== 'number' ||
    typeof params?.toLat !== 'number' || typeof params?.toLon !== 'number'
  ) return [];
  try {
    const list = await transportBookingService.searchRoutes({
      fromLat: params.fromLat,
      fromLon: params.fromLon,
      toLat: params.toLat,
      toLon: params.toLon,
      departAfter: params.departAfter,
    });
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error('TripGo (backend) searchRoutes error:', err);
    throw err;
  }
};

export const searchRoutesByPlaces = async (params) => {
  if (!params?.fromPlace || !params?.toPlace) return [];
  try {
    const list = await transportBookingService.searchRoutes({
      fromPlace: params.fromPlace.trim(),
      toPlace: params.toPlace.trim(),
      departAfter: params.departAfter,
    });
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error('TripGo (backend) searchRoutesByPlaces error:', err);
    throw err;
  }
};

export default { isTripGoEnabled, geocodePlace, searchRoutes, searchRoutesByPlaces };
