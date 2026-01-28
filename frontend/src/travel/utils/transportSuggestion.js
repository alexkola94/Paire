// Transport suggestion helper
// Uses distance-based logic with water/sea crossing detection via Mapbox route availability.

import { getRouteDirections, calculateDistance } from '../services/discoveryService'

// Supported transport modes for multi-city legs
export const TRANSPORT_MODES = ['car', 'train', 'flight', 'bus', 'ferry', 'walking']

// Distance thresholds in kilometers
const THRESHOLDS = {
  WALKING: 5,        // Up to 5km: walking is practical
  SHORT: 80,         // Up to 80km: car/train for daily commute range
  REGIONAL: 350,     // Up to 350km: regional train/bus
  MEDIUM: 500,       // Up to 500km: train or flight both viable
  LONG_HAUL: 500     // Above 500km: flight is most practical
}

// Water crossing distance threshold for ferry vs flight
const WATER_FERRY_MAX = 300 // km - ferries practical up to ~300km over water

// Island detection keywords (fallback when route API unavailable)
// Comprehensive list including Greek islands and other popular destinations
const ISLAND_KEYWORDS = [
  // Generic terms
  'island', 'isle', 'isla', 'isola', 'insel', 'νησί',
  // Greek Islands (Cyclades)
  'mykonos', 'santorini', 'paros', 'naxos', 'ios', 'milos', 'tinos', 'syros',
  'andros', 'sifnos', 'serifos', 'folegandros', 'sikinos', 'amorgos', 'kea',
  'kythnos', 'antiparos', 'koufonisia', 'donousa', 'schinoussa', 'iraklia',
  // Greek Islands (Dodecanese)
  'rhodes', 'kos', 'patmos', 'leros', 'kalymnos', 'karpathos', 'symi', 'tilos',
  'nisyros', 'astypalaia', 'kasos', 'lipsi', 'agathonisi', 'chalki',
  // Greek Islands (Ionian)
  'corfu', 'zakynthos', 'zante', 'kefalonia', 'lefkada', 'paxos', 'ithaca',
  // Greek Islands (Saronic)
  'aegina', 'poros', 'hydra', 'spetses', 'salamina', 'agistri',
  // Greek Islands (Sporades)
  'skiathos', 'skopelos', 'alonissos', 'skyros',
  // Greek Islands (North Aegean)
  'lesbos', 'chios', 'samos', 'ikaria', 'limnos', 'thassos', 'samothrace',
  // Greek Islands (Large)
  'crete', 'evia', 'euboea',
  // Spanish Islands
  'ibiza', 'mallorca', 'majorca', 'menorca', 'formentera', 'tenerife',
  'gran canaria', 'lanzarote', 'fuerteventura', 'la palma', 'la gomera',
  // Italian Islands
  'sicily', 'sardinia', 'capri', 'ischia', 'elba', 'lampedusa', 'pantelleria',
  // French Islands
  'corsica', 'reunion', 'martinique', 'guadeloupe',
  // UK Islands
  'jersey', 'guernsey', 'isle of wight', 'isle of man', 'anglesey',
  // Portuguese Islands
  'madeira', 'azores', 'porto santo',
  // Other Mediterranean
  'cyprus', 'malta', 'gozo',
  // Asia & Pacific
  'hawaii', 'oahu', 'maui', 'bali', 'phuket', 'koh samui', 'langkawi',
  'boracay', 'palawan', 'maldives', 'mauritius', 'seychelles', 'fiji',
  // Caribbean
  'bahamas', 'jamaica', 'barbados', 'aruba', 'curacao', 'st lucia',
  'antigua', 'bermuda', 'cayman'
]

/**
 * Check if a city name suggests it's an island (keyword-based fallback)
 * @param {Object} city - City object with name property
 * @returns {boolean}
 */
const isIslandByKeyword = (city) => {
  if (!city || !city.name) return false
  const name = city.name.toLowerCase()
  return ISLAND_KEYWORDS.some(k => name.includes(k))
}

/**
 * Distance-based transport suggestions with water crossing detection.
 * 
 * @param {Object} options - Configuration options
 * @param {number} options.distanceKm - Straight-line or routed distance in km
 * @param {Object} options.fromCity - Origin city object { name, latitude, longitude }
 * @param {Object} options.toCity - Destination city object { name, latitude, longitude }
 * @param {boolean} options.routeAvailable - Whether a land route exists (from Mapbox API)
 *                                           undefined = unknown, true = land route exists, false = water crossing
 * @returns {string[]} Ordered array of transport modes from most to least recommended
 */
export const getTransportSuggestions = ({ distanceKm, fromCity, toCity, routeAvailable }) => {
  const d = typeof distanceKm === 'number' && !Number.isNaN(distanceKm) ? distanceKm : null

  // Determine if water crossing is involved
  // Priority: 1) API-based detection, 2) Island keyword detection
  const fromIsIsland = isIslandByKeyword(fromCity)
  const toIsIsland = isIslandByKeyword(toCity)
  const involvesIslandByKeyword = fromIsIsland || toIsIsland

  // Water crossing detection:
  // - routeAvailable === false means Mapbox couldn't find a land route (water crossing)
  // - If routeAvailable is undefined, fall back to island keyword detection
  const isWaterCrossing = routeAvailable === false || (routeAvailable === undefined && involvesIslandByKeyword)

  // If we have no distance, fall back to a safe, generic ordering
  if (d == null) {
    if (isWaterCrossing) {
      return ['ferry', 'flight', 'car', 'bus', 'train', 'walking']
    }
    return ['train', 'car', 'bus', 'flight', 'ferry', 'walking']
  }

  // === WATER CROSSING LOGIC ===
  // When a water crossing is detected (no land route available)
  if (isWaterCrossing) {
    // Short water crossings (e.g., channel crossings, nearby islands): Ferry preferred
    if (d <= WATER_FERRY_MAX) {
      return ['ferry', 'flight', 'car', 'bus', 'train', 'walking']
    }
    // Long water crossings: Flight is more practical
    return ['flight', 'ferry', 'train', 'bus', 'car', 'walking']
  }

  // === STANDARD LAND ROUTE LOGIC ===

  // Short hops: walking distance within a city or very close towns
  if (d <= THRESHOLDS.WALKING) {
    return ['walking', 'bus', 'car', 'train', 'ferry', 'flight']
  }

  // City-to-city but nearby (daily commute range)
  if (d <= THRESHOLDS.SHORT) {
    return ['car', 'train', 'bus', 'walking', 'ferry', 'flight']
  }

  // Regional trips: Train/bus sweet spot
  if (d <= THRESHOLDS.REGIONAL) {
    return ['train', 'car', 'bus', 'flight', 'ferry', 'walking']
  }

  // Medium distance: Both train and flight are viable options
  if (d <= THRESHOLDS.MEDIUM) {
    return ['train', 'flight', 'bus', 'car', 'ferry', 'walking']
  }

  // Long-haul: Flight is almost always the practical choice
  return ['flight', 'train', 'bus', 'car', 'ferry', 'walking']
}

/**
 * Async transport mode resolver that uses Mapbox Directions API
 * to detect water crossings and suggest appropriate transport modes.
 * 
 * This function:
 * 1. Calculates distance if not provided
 * 2. Checks if a land route exists via Mapbox Directions API
 * 3. Returns transport suggestions based on distance + water crossing detection
 * 
 * @param {Object} options - Configuration options
 * @param {Object} options.fromCity - Origin city { latitude, longitude, name }
 * @param {Object} options.toCity - Destination city { latitude, longitude, name }
 * @param {number} [options.distanceKm] - Optional pre-calculated distance in km
 * @returns {Promise<string[]>} Ordered array of transport modes
 */
export const getBestTransportModes = async ({ fromCity, toCity, distanceKm }) => {
  // Validate input coordinates
  const hasValidCoords = fromCity?.latitude && fromCity?.longitude &&
                          toCity?.latitude && toCity?.longitude

  if (!hasValidCoords) {
    // No valid coordinates - fall back to basic heuristic without route check
    return getTransportSuggestions({ fromCity, toCity, distanceKm, routeAvailable: undefined })
  }

  // Calculate distance if not provided
  let distance = distanceKm
  if (distance == null || Number.isNaN(distance)) {
    distance = calculateDistance(
      fromCity.latitude, fromCity.longitude,
      toCity.latitude, toCity.longitude
    )
  }

  // Try to get route directions from Mapbox to detect water crossings
  let routeAvailable = undefined
  let routeIncludesFerry = false

  try {
    const routeResult = await getRouteDirections(
      fromCity.latitude, fromCity.longitude,
      toCity.latitude, toCity.longitude,
      'driving'
    )

    // Determine if a valid land route exists:
    // - usedFallback: true means Mapbox couldn't find a route (no land connection)
    // - geometry: null/empty means no route geometry available
    // - includesFerry: true means the route requires a ferry (water crossing)
    if (routeResult) {
      const hasValidRoute = !routeResult.usedFallback && 
                            routeResult.geometry && 
                            routeResult.geometry.coordinates?.length > 1

      // Check if route includes ferry segments (indicates water crossing)
      routeIncludesFerry = routeResult.includesFerry === true

      // A route that requires a ferry is NOT a pure land route
      // Set routeAvailable to false to trigger water crossing logic
      routeAvailable = hasValidRoute && !routeIncludesFerry

      // If Mapbox returned a valid route, use its distance (more accurate than Haversine)
      if (hasValidRoute && routeResult.distanceKm != null) {
        distance = routeResult.distanceKm
      }
    }
  } catch (error) {
    // If route API fails, continue with distance-only heuristic
    console.warn('Route directions unavailable, using distance-only heuristic:', error.message)
    routeAvailable = undefined
  }

  // Return suggestions based on distance and water crossing detection
  // If route includes ferry, force water crossing logic by setting routeAvailable to false
  return getTransportSuggestions({
    fromCity,
    toCity,
    distanceKm: distance,
    routeAvailable: routeIncludesFerry ? false : routeAvailable
  })
}

export default {
  TRANSPORT_MODES,
  getTransportSuggestions,
  getBestTransportModes
}
