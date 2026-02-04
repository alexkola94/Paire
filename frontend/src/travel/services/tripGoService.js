/**
 * TripGo (SkedGo) API – multimodal routing (bus, transit, etc.).
 * Free tier: https://tripgo.3scale.net/signup
 * Env: VITE_TRIPGO_API_KEY. Uses VITE_MAPBOX_TOKEN for city name -> coordinates when needed.
 */

const TRIPGO_BASE = 'https://api.tripgo.com/v1'
const API_KEY = import.meta.env.VITE_TRIPGO_API_KEY || ''
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''

export const isTripGoEnabled = () => Boolean(API_KEY)

/**
 * Forward geocode a place name to lat/lon using Mapbox (so we can call TripGo with coords).
 * @param {string} placeName - e.g. "Athens", "Thessaloniki"
 * @returns {Promise<{ lat: number, lon: number } | null>}
 */
export const geocodePlace = async (placeName) => {
  if (!MAPBOX_TOKEN || !placeName || !String(placeName).trim()) return null
  try {
    const query = encodeURIComponent(String(placeName).trim())
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?types=place,locality,region&limit=1&access_token=${MAPBOX_TOKEN}`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const feature = data.features?.[0]
    if (!feature?.center || feature.center.length < 2) return null
    return { lon: feature.center[0], lat: feature.center[1] }
  } catch (err) {
    console.error('TripGo geocodePlace error:', err)
    return null
  }
}

/**
 * Search routes between two points. TripGo expects coordinates.
 * @param {{ fromLat: number, fromLon: number, toLat: number, toLon: number, departAfter?: number }} params
 *   - departAfter: Unix timestamp (seconds). Defaults to now.
 * @returns {Promise<Array<{ id: string, price?: number, currency?: string, duration: { total: number }, durationMinutes: number, segments: Array, bookUrl?: string, provider: string }>>}
 */
export const searchRoutes = async (params) => {
  if (!API_KEY) {
    console.warn('TripGo API key not set. Set VITE_TRIPGO_API_KEY in .env')
    return []
  }

  const {
    fromLat,
    fromLon,
    toLat,
    toLon,
    departAfter = Math.floor(Date.now() / 1000)
  } = params || {}

  if (
    typeof fromLat !== 'number' || typeof fromLon !== 'number' ||
    typeof toLat !== 'number' || typeof toLon !== 'number'
  ) {
    return []
  }

  const query = new URLSearchParams({
    from: `(${fromLat},${fromLon})`,
    to: `(${toLat},${toLon})`,
    departAfter: String(departAfter),
    v: '11',
    locale: 'en'
  })
  // Include public transit and shared modes; adjust if you want car-only etc.
  query.set('modes', 'pt_pub,me_car,wa_wal')

  try {
    const res = await fetch(`${TRIPGO_BASE}/routing.json?${query}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-TripGo-Key': API_KEY
      }
    })
    if (!res.ok) throw new Error(`TripGo routing: ${res.status}`)
    const data = await res.json()

    const trips = data.trips || data.Trips || []
    const list = Array.isArray(trips) ? trips : Object.values(trips)

    return list.slice(0, 15).map((trip, idx) => {
      const segs = trip.segments || trip.Segments || []
      let totalMinutes = 0
      try {
        segs.forEach((s) => {
          const d = s.duration || s.Duration
          if (typeof d === 'number') totalMinutes += d
          else if (d?.minutes != null) totalMinutes += d.minutes
        })
      } catch (_) {}
      const booking = trip.booking || trip.Booking
      const bookUrl = booking?.url || booking?.URL || booking?.link || ''
      return {
        id: trip.id || trip.ID || `tg-${idx}-${totalMinutes}`,
        price: trip.fare?.amount != null ? Number(trip.fare.amount) : undefined,
        currency: trip.fare?.currency || 'EUR',
        duration: { total: totalMinutes },
        durationMinutes: totalMinutes,
        segments: segs,
        bookUrl: bookUrl || undefined,
        provider: 'tripgo',
        modes: segs.map((s) => s.mode || s.Mode || 'pt').join(', ')
      }
    })
  } catch (err) {
    console.error('TripGo searchRoutes error:', err)
    throw err
  }
}

/**
 * Search routes by place names. Geocodes origin and destination then calls searchRoutes.
 * @param {{ fromPlace: string, toPlace: string, departAfter?: number }} params
 */
export const searchRoutesByPlaces = async (params) => {
  const { fromPlace, toPlace, departAfter } = params || {}
  if (!fromPlace || !toPlace) return []

  const fromCoords = await geocodePlace(fromPlace)
  const toCoords = await geocodePlace(toPlace)
  if (!fromCoords || !toCoords) return []

  return searchRoutes({
    fromLat: fromCoords.lat,
    fromLon: fromCoords.lon,
    toLat: toCoords.lat,
    toLon: toCoords.lon,
    departAfter
  })
}

export default {
  isTripGoEnabled,
  geocodePlace,
  searchRoutes,
  searchRoutesByPlaces
}
