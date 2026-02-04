// Transport booking link generator
// Constructs deep-link URLs for external booking providers (flights, buses, ferries).
// Skyscanner: uses city slugs; if pre-fill fails for some cities, consider IATA/entity lookup later.
// FlixBus: uses city names in params; some regions may require city ID lookup for full pre-fill.

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
  if (!destination) return []

  const originSlug = slugify(origin)
  const destSlug = slugify(destination)
  const isoDate = normalizeDateToYYYYMMDD(startDate) || ''
  const isoEndDate = normalizeDateToYYYYMMDD(endDate) || ''

  switch (type) {
    case 'flight': {
      const links = []

      // Skyscanner: flights-from/ORIGIN/OUT_YYMMDD/RET_YYMMDD/?adultsv2=1&rtn=1|0
      const skyscannerOrigin = originSlug || 'anywhere'
      const outYYMMDD = formatDateYYMMDD(isoDate) || formatDateYYMMDD(isoEndDate)
      const retYYMMDD = formatDateYYMMDD(isoEndDate) || outYYMMDD
      const hasReturn = Boolean(isoEndDate)
      const skyscannerUrl = outYYMMDD
        ? `https://www.skyscanner.com/transport/flights-from/${skyscannerOrigin}/${outYYMMDD}/${retYYMMDD}/?adultsv2=1&cabinclass=economy&rtn=${hasReturn ? 1 : 0}&ref=home&preferdirects=false&outboundaltsenabled=false&inboundaltsenabled=false`
        : `https://www.skyscanner.com/transport/flights-from/${skyscannerOrigin}/?adultsv2=1&cabinclass=economy&rtn=0`
      links.push({ provider: 'skyscanner', label: 'Skyscanner', url: skyscannerUrl })

      // Kiwi.com: tiles/ORIGIN/DEST/DATES/no-return/ (-- for empty, date or start_end)
      const kiwiOrigin = originSlug || '--'
      const kiwiDest = destSlug || '--'
      const kiwiDates = isoDate && isoEndDate
        ? `${isoDate}_${isoEndDate}`
        : isoDate || ''
      const kiwiUrl = kiwiDates
        ? `https://www.kiwi.com/en/search/tiles/${kiwiOrigin}/${kiwiDest}/${kiwiDates}/no-return/`
        : `https://www.kiwi.com/en/search/tiles/${kiwiOrigin}/${kiwiDest}/no-return/`
      links.push({ provider: 'kiwi', label: 'Kiwi.com', url: kiwiUrl })

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
        ferryhopperUrl = originSlug
          ? `https://www.ferryhopper.com/en/ferry-routes/direct/${originSlug}-${destSlug}`
          : `https://www.ferryhopper.com/en/ferry-routes/direct/${destSlug}`
        const routeParams = []
        if (isoDate) routeParams.push(`date=${isoDate}`)
        routeParams.push('pax=1')
        ferryhopperUrl += `?${routeParams.join('&')}`
      }
      links.push({ provider: 'ferryhopper', label: 'Ferryhopper', url: ferryhopperUrl })

      // Direct Ferries: routes page; append outd, retd, psgr=1 when we have dates (if page supports them).
      const dfOrigin = originSlug ? originSlug.replace(/-/g, '_') : ''
      const dfDest = destSlug.replace(/-/g, '_')
      let dfUrl = dfOrigin
        ? `https://www.directferries.com/routes/${dfOrigin}_${dfDest}.htm`
        : `https://www.directferries.com/routes/${dfDest}.htm`
      const dfParams = []
      if (isoDate) dfParams.push(`outd=${isoDate}`)
      if (isoEndDate) dfParams.push(`retd=${isoEndDate}`)
      dfParams.push('psgr=1')
      dfUrl += `?${dfParams.join('&')}`
      links.push({ provider: 'directferries', label: 'Direct Ferries', url: dfUrl })

      return links
    }

    default:
      return []
  }
}

export default { generateTransportLink }
