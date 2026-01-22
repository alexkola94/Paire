// Transport suggestion helper
// Keeps the logic simple and well-commented so it's easy to extend with real APIs later.

// Supported transport modes for multi-city legs
export const TRANSPORT_MODES = ['car', 'train', 'flight', 'bus', 'ferry', 'walking']

/**
 * Basic distance-based transport suggestions.
 * - Uses straight-line or routed distance in km (already computed in the wizard).
 * - Returns an ordered array of mode strings from most to least recommended.
 */
export const getTransportSuggestions = ({ distanceKm }) => {
  const d = typeof distanceKm === 'number' && !Number.isNaN(distanceKm) ? distanceKm : null

  // If we have no distance, fall back to a safe, generic ordering.
  if (d == null) {
    return ['train', 'car', 'bus', 'flight', 'ferry', 'walking']
  }

  // Short hops: inside a city or very close-by towns.
  if (d <= 5) {
    return ['walking', 'bus', 'car', 'train', 'ferry', 'flight']
  }

  // City-to-city but nearby (approx. daily-commute scale).
  if (d <= 80) {
    return ['car', 'train', 'bus', 'walking', 'ferry', 'flight']
  }

  // Regional trips (common train/bus use-case).
  if (d <= 350) {
    return ['train', 'car', 'bus', 'flight', 'ferry', 'walking']
  }

  // Medium distance where both train and flight are realistic.
  if (d <= 500) {
    return ['train', 'flight', 'bus', 'car', 'ferry', 'walking']
  }

  // Long-haul: flight is almost always the practical choice.
  return ['flight', 'train', 'bus', 'car', 'ferry', 'walking']
}

/**
 * Async hook for a future external transport API.
 * For now, we simply resolve to the heuristic suggestions so callers can
 * use a single async code path.
 */
export const getBestTransportModes = async ({ fromCity, toCity, distanceKm }) => {
  // Placeholder for future integration:
  // - Rail / coach search APIs
  // - Region-specific heuristics (e.g. high-speed rail corridors)
  // - User preferences (eco-friendly vs. fastest)

  // Keep it predictable today by returning the local heuristic.
  return getTransportSuggestions({ fromCity, toCity, distanceKm })
}

export default {
  TRANSPORT_MODES,
  getTransportSuggestions,
  getBestTransportModes
}

