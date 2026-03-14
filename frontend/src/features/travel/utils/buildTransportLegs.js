/**
 * Build transport legs for multi-city trips (home → first, city-to-city, last → home).
 * Single source of truth for leg shape; mobile can mirror this contract or share via a module.
 *
 * @typedef {Object} Leg
 * @property {string} from - Origin city name
 * @property {string} to - Destination city name
 * @property {string|null} startDate - ISO date string
 * @property {string|null} endDate - ISO date string
 * @property {string|null} transportMode - e.g. 'flight', 'bus', 'ferry', 'car'
 * @property {boolean} [isContext] - True for home→first and last→home legs
 *
 * @param {Object} params
 * @param {Array<{ name: string, startDate?: string, endDate?: string, transportMode?: string }>} params.orderedCities - Cities in route order
 * @param {{ latitude: number, longitude: number }|null} params.homeLocation - User home coordinates
 * @param {string|null} params.homeCityName - Resolved name for home (e.g. from reverse geocode)
 * @param {string|null} params.returnTransportMode - Mode for last city → home leg
 * @param {string|null} [params.tripStartDate] - Trip-level start date (YYYY-MM-DD or ISO); fallback when city has no date
 * @param {string|null} [params.tripEndDate] - Trip-level end date (YYYY-MM-DD or ISO); fallback when city has no date
 * @returns {Leg[]}
 */
export function buildTransportLegs ({ orderedCities, homeLocation, homeCityName, returnTransportMode, tripStartDate = null, tripEndDate = null }) {
  const legs = []
  if (!orderedCities || orderedCities.length === 0) return legs

  const firstCity = orderedCities[0]
  const lastCity = orderedCities[orderedCities.length - 1]
  const hasHomeContext = homeLocation && homeCityName

  // Home → First City leg (context leg)
  if (hasHomeContext && firstCity) {
    legs.push({
      from: homeCityName,
      to: firstCity.name,
      startDate: firstCity.startDate || tripStartDate || null,
      endDate: null,
      transportMode: firstCity.transportMode || null,
      isContext: true
    })
  }

  // City-to-city legs
  for (let i = 1; i < orderedCities.length; i++) {
    const fromCity = orderedCities[i - 1]
    const toCity = orderedCities[i]
    legs.push({
      from: fromCity.name,
      to: toCity.name,
      startDate: fromCity.endDate || fromCity.startDate || tripStartDate || null,
      endDate: toCity.startDate || tripEndDate || null,
      transportMode: toCity.transportMode || null
    })
  }

  // Last City → Home leg (context leg)
  if (hasHomeContext && lastCity) {
    legs.push({
      from: lastCity.name,
      to: homeCityName,
      startDate: lastCity.endDate || lastCity.startDate || tripEndDate || null,
      endDate: null,
      transportMode: returnTransportMode || lastCity.transportMode || null,
      isContext: true
    })
  }

  return legs
}

export default buildTransportLegs
