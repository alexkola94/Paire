/**
 * City name → IATA airport code mapping for Amadeus API.
 * Codes derived from SKYSCANNER_ORIGIN_CODES in transportLinks.js (uppercased).
 * Amadeus requires uppercase 3-letter IATA codes for origin/destination.
 */

const IATA_CODES = {
  athens: 'ATH',
  piraeus: 'ATH',
  kallithea: 'ATH',
  thessaloniki: 'SKG',
  santorini: 'JTR',
  thira: 'JTR',
  mykonos: 'JMK',
  naxos: 'JNX',
  paros: 'PAS',
  london: 'LHR',
  paris: 'CDG',
  rome: 'FCO',
  milan: 'MXP',
  napoli: 'NAP',
  naples: 'NAP',
  newyork: 'JFK',
  berlin: 'BER',
  amsterdam: 'AMS',
  madrid: 'MAD',
  barcelona: 'BCN',
  heraklion: 'HER',
  crete: 'HER',
};

/**
 * Resolve a city name to an IATA airport code.
 * Tries exact match on slug, then first segment before hyphen.
 * Falls back to first 3 characters uppercased.
 * @param {string} cityName
 * @returns {string} 3-letter IATA code (uppercased)
 */
export function resolveIATA(cityName) {
  if (!cityName) return '';
  const slug = cityName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  const firstSegment = slug.split('-')[0] || slug;

  return (
    IATA_CODES[slug] ||
    IATA_CODES[firstSegment] ||
    firstSegment.slice(0, 3).toUpperCase()
  );
}
