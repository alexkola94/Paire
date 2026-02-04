/**
 * Skyscanner flight search – via backend API.
 * Backend holds API key and runs create + poll.
 * Env no longer needed on frontend.
 */

import { transportBookingService } from '../../services/api'

/** @deprecated Use transportBookingService.getProviders() and check .skyscanner; kept for backward compat. */
export const isSkyscannerEnabled = () => true

/** City/place name to IATA for client-side hints only; backend does real resolution. */
export const resolveToIata = (name) => {
  if (!name) return ''
  const t = String(name).trim().toUpperCase()
  if (t.length === 3) return t
  const slug = (s) => (s || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-')
  const key = slug(name).split('-')[0]
  const map = {
    athens: 'ATH', piraeus: 'ATH', thessaloniki: 'SKG', santorini: 'JTR', mykonos: 'JMK',
    london: 'LON', paris: 'PAR', rome: 'FCO', milan: 'MIL', newyork: 'NYC', berlin: 'BER',
    amsterdam: 'AMS', madrid: 'MAD', barcelona: 'BCN'
  }
  return map[key] || ''
}

/**
 * Search flights via backend (Skyscanner). Backend runs create + poll and returns normalized results.
 * @param {{ originIata?: string, destinationIata?: string, outboundDate: string, returnDate?: string, adults?: number }} params
 *   - For backend we send flyFrom/flyTo (city or IATA); originIata/destinationIata kept for compat but backend can resolve.
 * @returns {Promise<Array<{ id, price, currency, durationMinutes, bookUrl, provider }>>}
 */
export const searchFlights = async (params) => {
  if (!params?.outboundDate) return []
  const flyFrom = params.originIata || params.flyFrom || ''
  const flyTo = params.destinationIata || params.flyTo || ''
  if (!flyFrom || !flyTo) return []
  try {
    const list = await transportBookingService.searchFlights({
      flyFrom,
      flyTo,
      dateFrom: params.outboundDate,
      dateTo: params.outboundDate,
      returnFrom: params.returnDate || undefined,
      returnTo: params.returnDate || undefined,
      adults: params.adults ?? 1,
      provider: 'skyscanner'
    })
    return Array.isArray(list) ? list : []
  } catch (err) {
    console.error('Skyscanner (backend) searchFlights error:', err)
    throw err
  }
}

export default {
  isSkyscannerEnabled,
  resolveToIata,
  searchFlights
}
