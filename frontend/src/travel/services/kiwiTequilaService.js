/**
 * Kiwi Tequila flight search – via backend API.
 * Backend holds API key and calls api.tequila.kiwi.com.
 * Env no longer needed on frontend.
 */

import { transportBookingService } from '../../services/api'

/** @deprecated Use transportBookingService.getProviders() and check .kiwi; kept for backward compat. */
export const isKiwiTequilaEnabled = () => true

/**
 * Search locations (cities, airports) – not used when searching via backend; backend resolves names.
 * Kept for any legacy typeahead; returns empty from frontend.
 */
export const searchLocations = async () => []

/** @deprecated Backend resolves; no-op on frontend. */
export const resolveToCode = async (name) => (name && name.trim().length === 3 ? name.trim().toUpperCase() : '')

/**
 * Search flights via backend (Kiwi Tequila). Backend resolves origin/destination and calls Kiwi.
 * @param {{ flyFrom: string, flyTo: string, dateFrom: string, dateTo?: string, returnFrom?: string, returnTo?: string, adults?: number }} params
 * @returns {Promise<Array<{ id, price, currency, duration, durationMinutes, segments, bookUrl, airline, provider }>>}
 */
export const searchFlights = async (params) => {
  if (!params?.flyFrom || !params?.flyTo || !params?.dateFrom) return []
  try {
    const list = await transportBookingService.searchFlights({
      flyFrom: params.flyFrom,
      flyTo: params.flyTo,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo || undefined,
      returnFrom: params.returnFrom,
      returnTo: params.returnTo,
      adults: params.adults ?? 1,
      provider: 'kiwi'
    })
    return Array.isArray(list) ? list : []
  } catch (err) {
    console.error('Kiwi (backend) searchFlights error:', err)
    throw err
  }
}

export default {
  isKiwiTequilaEnabled,
  searchLocations,
  resolveToCode,
  searchFlights
}
