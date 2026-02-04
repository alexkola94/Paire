// Transport booking link generator
// Constructs deep-link URLs for external booking providers (flights, buses, ferries).
// Skyscanner: uses city slugs; if pre-fill fails for some cities, consider IATA/entity lookup later.
// FlixBus: uses city names in params; some regions may require city ID lookup for full pre-fill.

// Set to true to log inputs and generated URLs to the console (helps debug why links don't pre-fill). Set to false once fixed.
const TRANSPORT_LINKS_DEBUG = true

/**
 * Ferryhopper 3-letter port codes for booking results URL (route + date pre-filled).
 * Slug keys match slugify() output. When both origin and destination match, we use
 * /en/booking/results?itinerary=ORIGIN,DEST&dates=YYYYMMDD; otherwise fall back to route page.
 */
const FERRYHOPPER_PORT_CODES = {
  piraeus: 'PIR',
  athens: 'PIR',
  naxos: 'JNX',
  santorini: 'JTR',
  thira: 'JTR',
  mykonos: 'JMK',
  paros: 'PAS',
  ios: 'IOS',
  heraklion: 'HER',
  rafina: 'RAF',
  lavrio: 'LAV',
  milos: 'MLO',
  syros: 'JSY',
  tinos: 'JTY',
  crete: 'HER',
};

/**
 * Skyscanner expects 3-letter IATA-style codes for /transport/flights/ paths.
 * Map common city slugs to codes to avoid 404 (e.g. kallithea -> ath for Athens area).
 */
const SKYSCANNER_ORIGIN_CODES = {
  athens: 'ath',
  piraeus: 'ath',
  kallithea: 'ath',
  thessaloniki: 'skg',
  santorini: 'jtr',
  thira: 'jtr',
  mykonos: 'jmk',
  naxos: 'nax',
  paros: 'pas',
  london: 'lon',
  paris: 'par',
  rome: 'rom',
  milan: 'mil',
  napoli: 'nap',
  naples: 'nap',
  newyork: 'nyc',
  berlin: 'ber',
  amsterdam: 'ams',
  madrid: 'mad',
  barcelona: 'bcn',
};

/**
 * Kiwi.com expects "city-country" in the path for pre-fill (e.g. athens-greece, london-united-kingdom).
 * Map city slug (or first segment) to country slug. When unmapped, we use slug only (link opens, may not pre-fill).
 */
const KIWI_CITY_COUNTRY = {
  athens: 'greece',
  piraeus: 'greece',
  kallithea: 'greece',
  thessaloniki: 'greece',
  santorini: 'greece',
  thira: 'greece',
  mykonos: 'greece',
  naxos: 'greece',
  paros: 'greece',
  ios: 'greece',
  heraklion: 'greece',
  crete: 'greece',
  milos: 'greece',
  syros: 'greece',
  tinos: 'greece',
  rafina: 'greece',
  lavrio: 'greece',
  london: 'united-kingdom',
  paris: 'france',
  rome: 'italy',
  milan: 'italy',
  napoli: 'italy',
  naples: 'italy',
  berlin: 'germany',
  amsterdam: 'netherlands',
  madrid: 'spain',
  barcelona: 'spain',
  newyork: 'united-states',
};

/**
 * Slugify a city name for use in URLs
 * e.g. "New York" -> "new-york", "Thessaloniki" -> "thessaloniki"
 * @param {string} name
 * @returns {string}
 */
const slugify = (name) => {
  if (!name) return ''
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9\s-]/g, '')   // remove non-alphanumeric
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

/**
 * Format ISO date string to YYMMDD
 * @param {string} iso - "2025-07-15"
 * @returns {string} "250715"
 */
const formatDateYYMMDD = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const yy = String(d.getFullYear()).slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}${mm}${dd}`
}

/**
 * Format ISO date string to DD.MM.YYYY
 * @param {string} iso
 * @returns {string} "15.07.2025"
 */
const formatDateDDMMYYYY = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

/**
 * Normalize a date value to YYYY-MM-DD for provider URLs.
 * Handles full ISO strings, date-only strings, and Date-parsable values.
 * @param {string|undefined|null} value
 * @returns {string} YYYY-MM-DD or ''
 */
const normalizeDateToYYYYMMDD = (value) => {
  if (value == null || value === '') return ''
  const s = String(value).trim()
  if (!s) return ''
  if (s.includes('T')) return s.split('T')[0]
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * Generate transport booking links for a given type and route data.
 *
 * @param {'flight'|'bus'|'ferry'} type - Transport type
 * @param {{ origin?: string, destination: string, startDate?: string, endDate?: string }} data
 * @returns {Array<{ provider: string, label: string, url: string }>}
 */
export const generateTransportLink = (type, data) => {
  const { origin, destination, startDate, endDate } = data || {}
  if (TRANSPORT_LINKS_DEBUG) {
    console.log('[transportLinks] generateTransportLink called', { type, origin, destination, startDate, endDate, rawData: data })
  }
  if (!destination) {
    if (TRANSPORT_LINKS_DEBUG) console.warn('[transportLinks] No destination – returning empty links')
    return []
  }

  const originSlug = slugify(origin)
  const destSlug = slugify(destination)
  const isoDate = normalizeDateToYYYYMMDD(startDate) || ''
  const isoEndDate = normalizeDateToYYYYMMDD(endDate) || ''
  if (TRANSPORT_LINKS_DEBUG) {
    console.log('[transportLinks] normalized', { originSlug, destSlug, isoDate, isoEndDate })
  }

  switch (type) {
    case 'flight': {
      const links = []
      const originKey = originSlug.split('-')[0] || originSlug
      const destKey = destSlug.split('-')[0] || destSlug

      // Skyscanner: use IATA-style code or "anywhere" when no code (avoids 404 for cities without airport)
      const skyscannerOrigin = SKYSCANNER_ORIGIN_CODES[originKey] || SKYSCANNER_ORIGIN_CODES[originSlug] || 'anywhere'
      const skyscannerDest = SKYSCANNER_ORIGIN_CODES[destKey] || SKYSCANNER_ORIGIN_CODES[destSlug] || 'anywhere'
      const outYYMMDD = formatDateYYMMDD(isoDate) || formatDateYYMMDD(isoEndDate)
      const retYYMMDD = formatDateYYMMDD(isoEndDate) || outYYMMDD
      const hasReturn = Boolean(isoEndDate)
      if (TRANSPORT_LINKS_DEBUG) {
        console.log('[transportLinks] flight resolved', {
          originKey,
          destKey,
          skyscannerOrigin,
          skyscannerDest,
          outYYMMDD,
          retYYMMDD,
        })
      }
      const skyscannerUrl = outYYMMDD
        ? `https://www.skyscanner.com/transport/flights/${skyscannerOrigin}/${skyscannerDest}/${outYYMMDD}/${retYYMMDD}/?adultsv2=1&cabinclass=economy&rtn=${hasReturn ? 1 : 0}`
        : `https://www.skyscanner.com/transport/flights/${skyscannerOrigin}/${skyscannerDest}/?adultsv2=1&cabinclass=economy&rtn=0`
      links.push({ provider: 'skyscanner', label: 'Skyscanner', url: skyscannerUrl })

      // Kiwi.com: path uses "city-country" for pre-fill; when unmapped use slug only (link opens, may not pre-fill)
      const kiwiOriginPart = KIWI_CITY_COUNTRY[originKey] ? `${originSlug}-${KIWI_CITY_COUNTRY[originKey]}` : (originSlug || 'anywhere')
      const kiwiDestPart = KIWI_CITY_COUNTRY[destKey] ? `${destSlug}-${KIWI_CITY_COUNTRY[destKey]}` : (destSlug || 'anywhere')
      const kiwiDate = isoDate || isoEndDate || ''
      if (TRANSPORT_LINKS_DEBUG) {
        console.log('[transportLinks] flight kiwi', { kiwiOriginPart, kiwiDestPart, kiwiDate })
      }
      const kiwiUrl = kiwiDate
        ? `https://www.kiwi.com/en/search/results/${kiwiOriginPart}/${kiwiDestPart}/${kiwiDate}/no-return/`
        : `https://www.kiwi.com/en/search/results/${kiwiOriginPart}/${kiwiDestPart}/no-return/`
      links.push({ provider: 'kiwi', label: 'Kiwi.com', url: kiwiUrl })

      if (TRANSPORT_LINKS_DEBUG) {
        links.forEach((l) => console.log('[transportLinks] flight', l.provider, l.url))
      }
      return links
    }

    case 'bus': {
      const links = []

      // FlixBus
      const flixOrigin = origin || ''
      const flixDate = formatDateDDMMYYYY(isoDate)
      let flixUrl = `https://shop.flixbus.com/search?arrivalCity=${encodeURIComponent(destination)}`
      if (flixOrigin) flixUrl += `&departureCity=${encodeURIComponent(flixOrigin)}`
      if (flixDate) flixUrl += `&rideDate=${flixDate}`
      links.push({ provider: 'flixbus', label: 'FlixBus', url: flixUrl })

      // Omio
      const omioOrigin = originSlug || ''
      const omioUrl = omioOrigin && isoDate
        ? `https://www.omio.com/search/${omioOrigin}/${destSlug}/${isoDate}/`
        : omioOrigin
          ? `https://www.omio.com/search/${omioOrigin}/${destSlug}/`
          : `https://www.omio.com/search-frontend/results?arrivalName=${encodeURIComponent(destination)}`
      links.push({ provider: 'omio', label: 'Omio', url: omioUrl })

      if (TRANSPORT_LINKS_DEBUG) {
        links.forEach((l) => console.log('[transportLinks] bus', l.provider, l.url?.length, l.url))
      }
      return links
    }

    case 'ferry': {
      const links = []

      // Ferryhopper: return itinerary O,D,D,O and dates date1,date2 when endDate present; else one-way. Default pax=1.
      const originKey = originSlug.split('-')[0] || originSlug
      const destKey = destSlug.split('-')[0] || destSlug
      const originCode = FERRYHOPPER_PORT_CODES[originKey] || FERRYHOPPER_PORT_CODES[originSlug]
      const destCode = FERRYHOPPER_PORT_CODES[destKey] || FERRYHOPPER_PORT_CODES[destSlug]
      const hasPortCodes = originSlug && destSlug && originCode && destCode
      const startYYYYMMDD = isoDate ? isoDate.replace(/-/g, '') : ''
      const endYYYYMMDD = isoEndDate ? isoEndDate.replace(/-/g, '') : ''
      const hasReturnDates = hasPortCodes && startYYYYMMDD && endYYYYMMDD

      let ferryhopperUrl
      if (hasPortCodes && startYYYYMMDD) {
        if (hasReturnDates) {
          ferryhopperUrl = `https://www.ferryhopper.com/en/booking/results?itinerary=${originCode},${destCode},${destCode},${originCode}&dates=${startYYYYMMDD},${endYYYYMMDD}&pax=1`
        } else {
          ferryhopperUrl = `https://www.ferryhopper.com/en/booking/results?itinerary=${originCode},${destCode}&dates=${startYYYYMMDD}&pax=1`
        }
      } else {
        // No port codes: link to Ferryhopper homepage to avoid 404 on invalid /ferry-routes/direct/slug paths
        ferryhopperUrl = 'https://www.ferryhopper.com/en/?pax=1'
      }
      links.push({ provider: 'ferryhopper', label: 'Ferryhopper', url: ferryhopperUrl })

      // Direct Ferries: /routes/slug.htm often 404s for our slugs; use homepage so user can search
      const dfUrl = 'https://www.directferries.com/'
      links.push({ provider: 'directferries', label: 'Direct Ferries', url: dfUrl })

      if (TRANSPORT_LINKS_DEBUG) {
        console.log('[transportLinks] ferry resolved', {
          originKey,
          destKey,
          originCode: originCode || '(no code – homepage fallback)',
          destCode: destCode || '(no code – homepage fallback)',
          hasPortCodes,
          startYYYYMMDD,
          endYYYYMMDD,
        })
        links.forEach((l) => console.log('[transportLinks] ferry', l.provider, l.url))
      }
      return links
    }

    default:
      return []
  }
}

export default { generateTransportLink }
