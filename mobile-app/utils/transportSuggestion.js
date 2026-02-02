/**
 * Transport suggestion helper (mobile).
 * Distance-based suggestions; optional water/island detection via name keywords (no Mapbox).
 */

// Supported transport modes for multi-city legs
export const TRANSPORT_MODES = ['car', 'train', 'flight', 'bus', 'ferry', 'walking'];

// Distance thresholds in km
const WALKING_KM = 5;
const SHORT_KM = 80;
const REGIONAL_KM = 350;
const MEDIUM_KM = 500;
const WATER_FERRY_MAX_KM = 300;

// Island/water keywords for name-based water-leg detection (no Mapbox on mobile)
const ISLAND_KEYWORDS = [
  'island', 'isle', 'isla', 'insel', 'mykonos', 'santorini', 'paros', 'naxos',
  'rhodes', 'kos', 'corfu', 'zakynthos', 'crete', 'ibiza', 'mallorca', 'menorca',
  'sicily', 'sardinia', 'capri', 'corsica', 'cyprus', 'malta', 'madeira', 'azores',
  'hawaii', 'bali', 'phuket', 'maldives', 'mauritius', 'seychelles', 'fiji',
  'bahamas', 'jamaica', 'barbados', 'aruba',
];

/**
 * @param {{ name?: string } | null} city
 * @returns {boolean}
 */
function isIslandByKeyword(city) {
  if (!city || !city.name) return false;
  const name = String(city.name).toLowerCase();
  return ISLAND_KEYWORDS.some((k) => name.includes(k));
}

/**
 * Distance-based transport suggestions with optional water/island detection.
 * @param {{ distanceKm?: number, fromCity?: { name?: string }, toCity?: { name?: string }, routeAvailable?: boolean }} options
 * @returns {string[]} Ordered array of transport modes (most to least recommended)
 */
export function getTransportSuggestions({ distanceKm, fromCity, toCity, routeAvailable }) {
  const d = typeof distanceKm === 'number' && !Number.isNaN(distanceKm) ? distanceKm : null;
  const fromIsIsland = isIslandByKeyword(fromCity);
  const toIsIsland = isIslandByKeyword(toCity);
  const involvesIsland = fromIsIsland || toIsIsland;
  const isWaterCrossing = routeAvailable === false || (routeAvailable === undefined && involvesIsland);

  if (d == null) {
    if (isWaterCrossing) return ['ferry', 'flight', 'car', 'bus', 'train', 'walking'];
    return [...TRANSPORT_MODES];
  }

  if (isWaterCrossing) {
    if (d <= WATER_FERRY_MAX_KM) return ['ferry', 'flight', 'car', 'bus', 'train', 'walking'];
    return ['flight', 'ferry', 'train', 'bus', 'car', 'walking'];
  }

  if (d <= WALKING_KM) return ['walking', 'car', 'bus', 'train', 'ferry', 'flight'];
  if (d <= SHORT_KM) return ['car', 'train', 'bus', 'ferry', 'flight', 'walking'];
  if (d <= REGIONAL_KM) return ['train', 'bus', 'car', 'flight', 'ferry', 'walking'];
  if (d <= MEDIUM_KM) return ['train', 'flight', 'bus', 'car', 'ferry', 'walking'];
  return ['flight', 'train', 'bus', 'ferry', 'car', 'walking'];
}
