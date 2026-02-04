/**
 * TripGo (SkedGo) bus/multimodal search – via backend API.
 * Backend holds API key and geocodes place names when needed.
 * Env no longer needed on frontend.
 */

import { transportBookingService } from '../../services/api'

/** @deprecated Use transportBookingService.getProviders() and check .tripGo; kept for backward compat. */
export const isTripGoEnabled = () => true

/**
 * Geocode place name – not used when searching via backend; backend geocodes.
 * Kept for legacy; returns null (caller should use searchRoutesByPlaces which goes to backend).
 */
export const geocodePlace = async () => null

/**
 * Search routes by coordinates – via backend. Prefer searchRoutesByPlaces when you have place names.
 * @param {{ fromLat: number, fromLon: number, toLat: number, toLon: number, departAfter?: number }} params
 */
export const searchRoutes = async (params) => {
  if (
    typeof params?.fromLat !== 'number' || typeof params?.fromLon !== 'number' ||
    typeof params?.toLat !== 'number' || typeof params?.toLon !== 'number'
  ) return []
  try {
    const list = await transportBookingService.searchRoutes({
      fromLat: params.fromLat,
      fromLon: params.fromLon,
      toLat: params.toLat,
      toLon: params.toLon,
      departAfter: params.departAfter
    })
    return Array.isArray(list) ? list : []
  } catch (err) {
    console.error('TripGo (backend) searchRoutes error:', err)
    throw err
  }
}

/**
 * Search routes by place names. Backend geocodes and calls TripGo.
 * @param {{ fromPlace: string, toPlace: string, departAfter?: number }} params
 */
export const searchRoutesByPlaces = async (params) => {
  if (!params?.fromPlace || !params?.toPlace) return []
  try {
    const list = await transportBookingService.searchRoutes({
      fromPlace: params.fromPlace.trim(),
      toPlace: params.toPlace.trim(),
      departAfter: params.departAfter
    })
    return Array.isArray(list) ? list : []
  } catch (err) {
    console.error('TripGo (backend) searchRoutesByPlaces error:', err)
    throw err
  }
}

export default {
  isTripGoEnabled,
  geocodePlace,
  searchRoutes,
  searchRoutesByPlaces
}
