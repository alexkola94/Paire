import { getCached, setCached } from './travelDb'
import { DISCOVERY_POI_CATEGORIES, CACHE_TTL, DISCOVERY_MAP_CONFIG } from '../utils/travelConstants'

const OVERPASS_API = 'https://overpass-api.de/api/interpreter'
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''
const SERPAPI_KEY = import.meta.env.VITE_SERPAPI_API_KEY || ''

/**
 * Discovery Service
 * Handles POI fetching from Overpass API (OpenStreetMap), Mapbox Search, and SerpApi (Google Hotels)
 */

/**
 * Calculate zoom-based result settings
 * - Zoomed OUT (low zoom): fewer results, only best reviews
 * - Zoomed IN (high zoom): more results, include average reviews
 * 
 * @param {number} zoom - Current map zoom level (0-22)
 * @returns {{ limit: number, minRating: number }} Settings based on zoom
 */
export const getZoomBasedSettings = (zoom = 14) => {
  // Zoom thresholds
  // <= 10: Very zoomed out (city/region view)
  // 11-13: Medium zoom (neighborhood view)
  // >= 14: Zoomed in (street/block view)

  if (zoom <= 10) {
    // Very zoomed out: show only top 20 best-rated results
    return { limit: 20, minRating: 4.0 }
  } else if (zoom <= 12) {
    // Medium-low zoom: show top 40 with good ratings
    return { limit: 40, minRating: 3.5 }
  } else if (zoom <= 14) {
    // Medium zoom: show top 60 with average+ ratings
    return { limit: 60, minRating: 3.0 }
  } else {
    // Zoomed in: show all nearby (up to 100), include average ratings
    return { limit: 100, minRating: 2.5 }
  }
}

/**
 * Build Overpass query for a specific category
 * @param {string} categoryId - Category ID from DISCOVERY_POI_CATEGORIES
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} radius - Search radius in meters
 * @returns {string} Overpass QL query
 */
const buildOverpassQuery = (categoryId, lat, lon, radius = DISCOVERY_MAP_CONFIG.poiRadius) => {
  const category = DISCOVERY_POI_CATEGORIES.find(c => c.id === categoryId)
  if (!category) return null

  const osmTags = category.osmTags || []
  const tagQueries = osmTags.map(tag => {
    // Handle different tag types based on category
    if (['restaurant', 'cafe', 'bar', 'fast_food', 'pharmacy', 'hospital', 'clinic', 'atm', 'bank'].includes(tag)) {
      return `node["amenity"="${tag}"](around:${radius},${lat},${lon});`
    }
    if (['attraction', 'museum', 'artwork', 'viewpoint'].includes(tag)) {
      return `node["tourism"="${tag}"](around:${radius},${lat},${lon});`
    }
    if (['supermarket', 'mall', 'marketplace', 'convenience'].includes(tag)) {
      return `node["shop"="${tag}"](around:${radius},${lat},${lon});`
    }
    if (['bus_station', 'subway_entrance', 'tram_stop'].includes(tag)) {
      return `node["public_transport"="${tag}"](around:${radius},${lat},${lon});`
    }
    if (tag === 'taxi') {
      return `node["amenity"="taxi"](around:${radius},${lat},${lon});`
    }
    // Default amenity query
    return `node["amenity"="${tag}"](around:${radius},${lat},${lon});`
  }).join('\n')

  return `
    [out:json][timeout:25];
    (
      ${tagQueries}
    );
    out body;
  `
}

/**
 * Parse Overpass API response elements to normalized POI format
 * @param {Array} elements - Overpass response elements
 * @param {string} categoryId - Category for these POIs
 * @returns {Array} Normalized POI array
 */
const parseOverpassResults = (elements, categoryId) => {
  return elements.map(element => ({
    id: `osm-${element.id}`,
    poiId: `osm-${element.id}`,
    name: element.tags?.name || element.tags?.['name:en'] || 'Unnamed',
    category: categoryId,
    latitude: element.lat,
    longitude: element.lon,
    address: formatAddress(element.tags),
    phone: element.tags?.phone || element.tags?.['contact:phone'] || '',
    website: element.tags?.website || element.tags?.['contact:website'] || '',
    openingHours: element.tags?.opening_hours || '',
    amenity: element.tags?.amenity || element.tags?.tourism || element.tags?.shop || '',
    source: 'overpass',
    tags: element.tags || {}
  })).filter(poi => poi.name !== 'Unnamed') // Filter out unnamed POIs
}

/**
 * Format address from OSM tags
 * @param {Object} tags - OSM tags object
 * @returns {string} Formatted address
 */
const formatAddress = (tags) => {
  if (!tags) return ''

  const parts = []
  if (tags['addr:housenumber']) parts.push(tags['addr:housenumber'])
  if (tags['addr:street']) parts.push(tags['addr:street'])
  if (tags['addr:city']) parts.push(tags['addr:city'])
  if (tags['addr:postcode']) parts.push(tags['addr:postcode'])

  return parts.join(', ')
}

/**
 * Fetch POIs from Overpass API for a specific category
 * @param {string} categoryId - Category ID
 * @param {number} lat - Latitude (map center, not user location)
 * @param {number} lon - Longitude (map center, not user location)
 * @param {number} radius - Search radius in meters
 * @param {number} limit - Maximum number of results (default 100)
 * @returns {Promise<Array>} Array of POIs sorted by distance from map center
 */
export const fetchPOIsByCategory = async (categoryId, lat, lon, radius = DISCOVERY_MAP_CONFIG.poiRadius, limit = 100) => {
  // Check cache first
  const cacheKey = `discovery-poi-${categoryId}-${lat.toFixed(3)}-${lon.toFixed(3)}`
  const cached = await getCached(cacheKey)
  if (cached) {
    // Apply limit to cached results too
    return cached.slice(0, limit)
  }

  const query = buildOverpassQuery(categoryId, lat, lon, radius)
  if (!query) {
    console.warn(`No query built for category: ${categoryId}`)
    return []
  }

  try {
    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      body: query,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`)
    }

    const data = await response.json()
    let pois = parseOverpassResults(data.elements || [], categoryId)

    // Calculate distance and sort by nearest first (best results)
    pois = pois.map(poi => ({
      ...poi,
      distance: calculateDistance(lat, lon, poi.latitude, poi.longitude)
    }))
      .sort((a, b) => (a.distance || 0) - (b.distance || 0))

    // Cache all results (before limiting)
    await setCached(cacheKey, pois, CACHE_TTL.poi)

    // Return limited results
    return pois.slice(0, limit)
  } catch (error) {
    console.error('Error fetching POIs from Overpass:', error)
    // Try to return cached data even if expired
    const expiredCache = await getCached(cacheKey)
    if (expiredCache) return expiredCache.slice(0, limit)
    return []
  }
}

/**
 * Fetch POIs for multiple categories sequentially to avoid Overpass 429/504 errors
 * @param {Array<string>} categoryIds - Array of category IDs
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Array>} Combined array of POIs
 */
export const fetchPOIsMultipleCategories = async (categoryIds, lat, lon) => {
  const results = []

  // Execute sequentially to be gentle on the API
  for (const id of categoryIds) {
    try {
      const categoryPOIs = await fetchPOIsByCategory(id, lat, lon)
      results.push(...categoryPOIs)

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 300))
    } catch (error) {
      console.warn(`Failed to fetch category ${id}:`, error)
      // Continue with other categories even if one fails
    }
  }

  return results
}

/**
 * Search POIs using Mapbox Search API (text search)
 * @param {string} query - Search query
 * @param {number} lat - Latitude (proximity center)
 * @param {number} lon - Longitude (proximity center)
 * @returns {Promise<Array>} Array of POIs
 */
export const searchPOIs = async (query, lat, lon) => {
  if (!query || query.trim().length < 2) {
    return []
  }

  if (!MAPBOX_TOKEN) {
    console.warn('Mapbox token not configured, falling back to Overpass')
    return searchPOIsOverpass(query, lat, lon)
  }

  try {
    // First try with POI types for better results
    const url = new URL('https://api.mapbox.com/geocoding/v5/mapbox.places/' + encodeURIComponent(query.trim()) + '.json')
    url.searchParams.append('access_token', MAPBOX_TOKEN)
    url.searchParams.append('proximity', `${lon},${lat}`)
    url.searchParams.append('types', 'poi,address,place')
    url.searchParams.append('limit', '15')

    const response = await fetch(url.toString())
    if (!response.ok) {
      throw new Error(`Mapbox Search API error: ${response.status}`)
    }

    const data = await response.json()
    const results = parseMapboxResults(data.features || [])

    // If we got results, return them
    if (results.length > 0) {
      return results
    }

    // If no POI results, try broader search without type restriction
    const broaderUrl = new URL('https://api.mapbox.com/geocoding/v5/mapbox.places/' + encodeURIComponent(query.trim()) + '.json')
    broaderUrl.searchParams.append('access_token', MAPBOX_TOKEN)
    broaderUrl.searchParams.append('proximity', `${lon},${lat}`)
    broaderUrl.searchParams.append('limit', '10')

    const broaderResponse = await fetch(broaderUrl.toString())
    if (!broaderResponse.ok) {
      throw new Error(`Mapbox Search API error: ${broaderResponse.status}`)
    }

    const broaderData = await broaderResponse.json()
    return parseMapboxResults(broaderData.features || [])
  } catch (error) {
    console.error('Error searching Mapbox:', error)
    // Fallback to Overpass
    return searchPOIsOverpass(query, lat, lon)
  }
}

/**
 * Parse Mapbox geocoding results to normalized POI format
 * @param {Array} features - Mapbox features
 * @returns {Array} Normalized POI array
 */
const parseMapboxResults = (features) => {
  return features
    .filter(feature => feature.center && feature.center.length >= 2) // Ensure valid coordinates
    .map(feature => ({
      id: `mapbox-${feature.id}`,
      poiId: `mapbox-${feature.id}`,
      name: feature.text || feature.place_name?.split(',')[0] || 'Unnamed',
      category: mapMapboxCategoryToId(feature.properties?.category),
      latitude: feature.center[1],
      longitude: feature.center[0],
      address: feature.place_name || '',
      phone: feature.properties?.phone || '',
      website: feature.properties?.website || '',
      openingHours: '',
      source: 'mapbox',
      properties: feature.properties || {}
    }))
    .filter(poi => poi.name !== 'Unnamed' && poi.latitude && poi.longitude) // Filter out invalid results
}

/**
 * Map Mapbox category to our category ID
 * @param {string} mapboxCategory - Mapbox category string
 * @returns {string} Our category ID
 */
const mapMapboxCategoryToId = (mapboxCategory) => {
  if (!mapboxCategory) return 'attraction'

  const categoryLower = mapboxCategory.toLowerCase()
  if (categoryLower.includes('restaurant') || categoryLower.includes('food') || categoryLower.includes('cafe')) {
    return 'restaurant'
  }
  if (categoryLower.includes('shop') || categoryLower.includes('store') || categoryLower.includes('mall')) {
    return 'shopping'
  }
  if (categoryLower.includes('transit') || categoryLower.includes('bus') || categoryLower.includes('train')) {
    return 'transit'
  }
  if (categoryLower.includes('atm') || categoryLower.includes('bank')) {
    return 'atm'
  }
  if (categoryLower.includes('pharmacy') || categoryLower.includes('hospital') || categoryLower.includes('medical')) {
    return 'pharmacy'
  }
  return 'attraction'
}

/**
 * Search POIs using Overpass API (fallback for text search)
 * @param {string} query - Search query
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Array>} Array of POIs
 */
const searchPOIsOverpass = async (query, lat, lon) => {
  if (!query || query.trim().length < 2) {
    return []
  }

  const radius = DISCOVERY_MAP_CONFIG.poiRadius
  // Escape special characters for Overpass regex
  const escapedQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const overpassQuery = `
    [out:json][timeout:25];
    (
      node["name"~"${escapedQuery}",i](around:${radius},${lat},${lon});
      way["name"~"${escapedQuery}",i](around:${radius},${lat},${lon});
      relation["name"~"${escapedQuery}",i](around:${radius},${lat},${lon});
    );
    out center;
  `

  try {
    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      body: overpassQuery,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    if (!response.ok) {
      throw new Error(`Overpass search error: ${response.status}`)
    }

    const data = await response.json()
    // Parse results and handle different element types (node, way, relation)
    const elements = (data.elements || []).map(element => {
      // For ways and relations, use center coordinates
      if (element.type === 'way' || element.type === 'relation') {
        return {
          ...element,
          lat: element.center?.lat || element.lat,
          lon: element.center?.lon || element.lon
        }
      }
      return element
    })

    return parseOverpassResults(elements, 'attraction')
  } catch (error) {
    console.error('Error searching Overpass:', error)
    return []
  }
}

/**
 * Get Google Maps directions URL for a POI
 * @param {Object} poi - POI object with latitude/longitude
 * @param {Object} origin - Optional origin coordinates { lat, lon }
 * @returns {string} Google Maps directions URL
 */
export const getDirectionsUrl = (poi, origin = null) => {
  const destination = `${poi.latitude},${poi.longitude}`
  let url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`

  if (origin) {
    url += `&origin=${origin.lat},${origin.lon}`
  }

  return url
}

/**
 * Get Google Maps place details URL for a POI
 * Goal: mimic what happens when a user types the place name in Google Maps,
 * so we get the left info panel + marker (with Popular times when available).
 *
 * @param {Object} poi - POI object with optional name/coordinates
 * @returns {string} Google Maps place details/search URL
 */
export const getPlaceDetailsUrl = (poi) => {
  if (!poi) return 'https://www.google.com/maps'

  // 1) Best case: search by name only (same as user typing it in Maps search bar)
  //    This is what typically opens the full place card with busy times.
  if (poi.name) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(poi.name)}`
  }

  // 2) Fallback: search by coordinates – will drop a pin but might not show full card
  if (poi.latitude && poi.longitude) {
    const query = `${poi.latitude},${poi.longitude}`
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
  }

  // 3) Safe default – plain Google Maps
  return 'https://www.google.com/maps'
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - First latitude
 * @param {number} lon1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lon2 - Second longitude
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Get route directions between two points using Mapbox Directions API.
 * Returns realistic route geometry (following roads) and distance in km.
 * Falls back to straight-line (Haversine) distance when Directions are unavailable.
 *
 * @param {number} lat1 - Origin latitude
 * @param {number} lon1 - Origin longitude
 * @param {number} lat2 - Destination latitude
 * @param {number} lon2 - Destination longitude
 * @param {'driving'|'walking'|'cycling'} profile - Mapbox routing profile
 * @returns {Promise<{ geometry: GeoJSON.LineString | null, distanceKm: number | null, usedFallback: boolean, includesFerry: boolean }>}
 */
export const getRouteDirections = async (lat1, lon1, lat2, lon2, profile = 'driving') => {
  // If Mapbox is not configured, gracefully fall back to Haversine distance.
  if (!MAPBOX_TOKEN) {
    const fallback = calculateDistance(lat1, lon1, lat2, lon2)
    return { geometry: null, distanceKm: fallback, usedFallback: true, includesFerry: false }
  }

  // Basic validation
  if (
    lat1 == null ||
    lon1 == null ||
    lat2 == null ||
    lon2 == null
  ) {
    return { geometry: null, distanceKm: null, usedFallback: true, includesFerry: false }
  }

  try {
    const keyParts = [
      'route',
      profile,
      lat1.toFixed(4),
      lon1.toFixed(4),
      lat2.toFixed(4),
      lon2.toFixed(4)
    ]
    const cacheKey = keyParts.join('-')

    // Try cache first to avoid repeated API calls
    const cached = await getCached(cacheKey)
    if (cached) {
      return cached
    }

    // Request steps to detect ferry segments in the route
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${lon1},${lat1};${lon2},${lat2}?geometries=geojson&overview=full&steps=true&access_token=${MAPBOX_TOKEN}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Mapbox Directions error: ${response.status}`)
    }

    const data = await response.json()
    const route = data.routes && data.routes[0]

    if (!route) {
      // No route found – still provide straight-line distance so UI can show something.
      const fallback = calculateDistance(lat1, lon1, lat2, lon2)
      const result = { geometry: null, distanceKm: fallback, usedFallback: true, includesFerry: false }
      return result
    }

    // Check if route includes ferry segments by examining step modes
    let includesFerry = false
    if (route.legs) {
      for (const leg of route.legs) {
        if (leg.steps) {
          for (const step of leg.steps) {
            // Mapbox uses 'ferry' mode for ferry segments
            if (step.mode === 'ferry' || step.maneuver?.type === 'ferry') {
              includesFerry = true
              break
            }
          }
        }
        if (includesFerry) break
      }
    }

    const result = {
      geometry: route.geometry || null,
      distanceKm: route.distance != null ? route.distance / 1000 : null,
      usedFallback: false,
      includesFerry
    }

    // Cache for several days – routes rarely change.
    await setCached(cacheKey, result, 7 * 24 * 60 * 60 * 1000)

    return result
  } catch (error) {
    console.error('Error fetching route directions from Mapbox:', error)
    const fallback = calculateDistance(lat1, lon1, lat2, lon2)
    return { geometry: null, distanceKm: fallback, usedFallback: true, includesFerry: false }
  }
}

/**
 * Format distance for display
 * @param {number} distanceKm - Distance in kilometers
 * @returns {string} Formatted distance string
 */
export const formatDistance = (distanceKm) => {
  if (distanceKm === null || distanceKm === undefined) return ''
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`
  }
  return `${distanceKm.toFixed(1)}km`
}

/**
 * Reverse geocode coordinates to get a **city / area level** label.
 *
 * For the multi‑city planner we don't want street names like "Via Roma 10",
 * we want broader locations such as "Rome" or "Athens". This helper therefore
 * prioritises Mapbox `place` / `locality` / `region` when choosing the name.
 *
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} POI-like object or null
 */
export const reverseGeocode = async (lat, lon) => {
  if (!MAPBOX_TOKEN) return null

  try {
    // Ask Mapbox specifically for place-level results (city, town, locality, region, country)
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?types=place,locality,region,country&limit=1&access_token=${MAPBOX_TOKEN}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Mapbox Reverse Geocoding error: ${response.status}`)
    }

    const data = await response.json()
    const feature = data.features && data.features[0]
    if (!feature) return null

    const context = feature.context || []

    // Prefer city / town / locality level first
    const placeContext =
      context.find(c => typeof c.id === 'string' && c.id.startsWith('place.')) ||
      context.find(c => typeof c.id === 'string' && c.id.startsWith('locality.')) ||
      null

    // Then region (state / prefecture)
    const regionContext =
      context.find(c => typeof c.id === 'string' && c.id.startsWith('region.')) || null

    // Country entry
    const countryContext =
      context.find(c => typeof c.id === 'string' && c.id.startsWith('country.')) || null

    const cityName =
      placeContext?.text ||
      feature.text || // Fallback to feature text if needed
      feature.place_name?.split(',')[0] ||
      'Unknown Location'

    // Build a clean, high-level address like "Rome, Italy"
    const addressParts = []
    if (placeContext?.text) addressParts.push(placeContext.text)
    else if (feature.text) addressParts.push(feature.text)
    if (regionContext?.text && regionContext.text !== placeContext?.text) {
      addressParts.push(regionContext.text)
    }
    if (countryContext?.text) addressParts.push(countryContext.text)

    const address =
      addressParts.length > 0 ? addressParts.join(', ') : feature.place_name || cityName

    return {
      id: `pinned-${Date.now()}`,
      poiId: `mapbox-${feature.id}`,
      name: cityName,
      address,
      latitude: lat,
      longitude: lon,
      category: 'attraction', // Default category for dropped pins
      source: 'pinned',
      countryName: countryContext?.text || null
    }
  } catch (error) {
    console.error('Error reverse geocoding:', error)
    return null
  }
}

/**
 * Resolve a free‑text place name (e.g. city) to its country using Mapbox Geocoding.
 * Keeps the response very small and only returns basic country info.
 * @param {string} placeName - City or place name, e.g. "Milan" or "Milan, Lombardy"
 * @returns {Promise<{ countryName: string, countryCode?: string } | null>}
 */
export const getCountryFromPlaceName = async (placeName) => {
  if (!MAPBOX_TOKEN || !placeName || !placeName.trim()) {
    return null
  }

  try {
    const query = encodeURIComponent(placeName.trim())
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?types=place,region,country&limit=1&access_token=${MAPBOX_TOKEN}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Mapbox place->country error: ${response.status}`)
    }

    const data = await response.json()
    const feature = data.features?.[0]
    if (!feature) return null

    // Mapbox usually adds the country as a context entry (e.g. "country.1234").
    const context = feature.context || []
    const countryContext = context.find(c => typeof c.id === 'string' && c.id.startsWith('country.'))

    const countryName = countryContext?.text || feature.place_name?.split(',').pop()?.trim()
    if (!countryName) return null

    const code = countryContext?.short_code
      ? String(countryContext.short_code).toUpperCase()
      : undefined

    return {
      countryName,
      countryCode: code
    }
  } catch (error) {
    console.error('Error resolving country from place name:', error)
    return null
  }
}

/**
 * Get city name from coordinates for broad caching
 * Requests only 'place' and 'locality' types from Mapbox to ensure we get general area 
 * instead of specific street addresses
 */
export const getCityName = async (lat, lon) => {
  if (!MAPBOX_TOKEN) return null

  try {
    // Only ask for place (city) and locality
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?types=place,locality&limit=1&access_token=${MAPBOX_TOKEN}`
    const response = await fetch(url)

    if (!response.ok) return null

    const data = await response.json()
    if (data.features && data.features.length > 0) {
      // Return just the text name (e.g., "Milan", "New York")
      return data.features[0].text
    }
    return null
  } catch (error) {
    console.error('Error getting city name:', error)
    return null
  }
}

/**
 * Fetch hotels from SerpApi (Google Hotels)
 * Uses reverse geocoding to get city name, then queries Google Hotels
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} limit - Maximum results
 * @returns {Promise<Array>} Array of hotel objects
 */
const fetchHotelsFromSerpApi = async (lat, lon, limit = 20) => {
  if (!SERPAPI_KEY) {
    console.warn('SerpApi key not configured')
    return null
  }

  try {
    // Get broader city location to improve cache hits and reduce API calls
    const cityName = await getCityName(lat, lon)

    if (!cityName) {
      console.warn('Could not determine city name for hotel search')
      return null
    }

    // Cache key based on city name - extremely effective for "hotels in Milan" queries
    const cacheKey = `serpapi-hotels-${cityName.toLowerCase().replace(/\s+/g, '-')}`
    const cached = await getCached(cacheKey)
    if (cached) {
      console.log(`Using cached hotels for ${cityName}`)
      return cached.slice(0, limit)
    }

    // Calculate dates for valid hotel search (tomorrow check-in, +1 day check-out)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const checkIn = tomorrow.toISOString().split('T')[0]

    const dayAfter = new Date(tomorrow)
    dayAfter.setDate(dayAfter.getDate() + 1)
    const checkOut = dayAfter.toISOString().split('T')[0]

    // Call backend proxy to bypass CORS AND send dates
    const params = new URLSearchParams({
      q: `hotels in ${cityName}`,
      gl: 'us',
      hl: 'en',
      check_in_date: checkIn,
      check_out_date: checkOut
    })

    // Use local backend proxy
    const response = await fetch(`http://localhost:5038/api/SerpApi/hotels?${params}`)

    if (!response.ok) {
      throw new Error(`SerpApi error: ${response.status}`)
    }

    const data = await response.json()

    // Map SerpApi response to our stay format
    const hotels = (data.properties || []).map((hotel, index) => ({
      id: `serpapi-${hotel.name?.replace(/\s+/g, '-').toLowerCase() || index}`,
      name: hotel.name || 'Unknown Hotel',
      latitude: hotel.gps_coordinates?.latitude || lat + (Math.random() * 0.01 - 0.005),
      longitude: hotel.gps_coordinates?.longitude || lon + (Math.random() * 0.01 - 0.005),
      price: hotel.rate_per_night?.lowest
        ? { amount: parseFloat(hotel.rate_per_night.lowest.replace(/[^0-9.]/g, '')), currency: 'USD' }
        : null,
      rating: hotel.overall_rating || hotel.reviews_rating || 0,
      reviewCount: hotel.reviews || 0,
      image: hotel.images?.[0]?.thumbnail || hotel.thumbnail || null,
      amenities: hotel.amenities || [],
      address: hotel.address || cityName,
      provider: 'google',
      booking_url: hotel.link || `https://www.google.com/travel/hotels?q=${encodeURIComponent(hotel.name + ' ' + cityName)}`,
      category: 'accommodation',
      source: 'serpapi'
    }))

    // Cache for 1 hour
    await setCached(cacheKey, hotels, 3600000)

    return hotels.slice(0, limit)
  } catch (error) {
    console.error('Error fetching hotels from SerpApi:', error)
    return null
  }
}

/**
 * Placeholder stays data for fallback when API is unavailable
 * Replace with actual API integration (Booking.com, Airbnb, etc.)
 */
const PLACEHOLDER_STAYS = [
  {
    id: 'stay-1',
    name: 'Grand Hotel Palace',
    latitude: 0, // Will be set relative to search location
    longitude: 0,
    price: { amount: 150, currency: 'EUR' },
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
    amenities: ['WiFi', 'Pool', 'Spa', 'Restaurant', 'Parking'],
    address: 'Main Street 123',
    provider: 'booking' // 'booking' or 'airbnb'
  },
  {
    id: 'stay-2',
    name: 'Cozy Downtown Apartment',
    latitude: 0,
    longitude: 0,
    price: { amount: 85, currency: 'EUR' },
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400',
    amenities: ['WiFi', 'Kitchen', 'Washer', 'Air Conditioning'],
    address: 'Central Avenue 45',
    provider: 'airbnb'
  },
  {
    id: 'stay-3',
    name: 'Seaside Resort & Spa',
    latitude: 0,
    longitude: 0,
    price: { amount: 220, currency: 'EUR' },
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400',
    amenities: ['WiFi', 'Pool', 'Beach Access', 'Spa', 'Gym', 'Restaurant'],
    address: 'Beach Road 78',
    provider: 'booking'
  },
  {
    id: 'stay-4',
    name: 'Budget Hostel Central',
    latitude: 0,
    longitude: 0,
    price: { amount: 35, currency: 'EUR' },
    rating: 4.2,
    image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400',
    amenities: ['WiFi', 'Shared Kitchen', 'Locker'],
    address: 'Backpacker Lane 12',
    provider: 'booking'
  },
  {
    id: 'stay-5',
    name: 'Luxury Penthouse Suite',
    latitude: 0,
    longitude: 0,
    price: { amount: 350, currency: 'EUR' },
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400',
    amenities: ['WiFi', 'Rooftop Terrace', 'City View', 'Kitchen', 'Concierge'],
    address: 'Skyline Tower 500',
    provider: 'airbnb'
  }
]

/**
 * Fetch accommodation/stays near a location
 * Uses SerpApi (Google Hotels) when available, falls back to placeholder data
 * @param {number} lat - Latitude (map center, not user location)
 * @param {number} lon - Longitude (map center, not user location)
 * @param {number} radius - Search radius in meters (default 2000m)
 * @param {number} limit - Maximum number of results (default 100)
 * @returns {Promise<Array>} Array of stay objects sorted by rating (best first)
 */
export const fetchStays = async (lat, lon, radius = DISCOVERY_MAP_CONFIG.poiRadius, limit = 100) => {
  // Try SerpApi first for real hotel data
  const serpApiResults = await fetchHotelsFromSerpApi(lat, lon, limit)

  if (serpApiResults && serpApiResults.length > 0) {
    // Calculate distance and sort by rating
    const staysWithDistance = serpApiResults.map(stay => ({
      ...stay,
      distance: calculateDistance(lat, lon, stay.latitude, stay.longitude)
    }))

    return staysWithDistance
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, limit)
  }

  // Fallback to placeholder data if API unavailable
  console.log('Using placeholder stays data (SerpApi unavailable or no results)')

  // Scatter placeholder stays around the search location
  const stays = PLACEHOLDER_STAYS.map((stay, index) => {
    // Create positions in a circle around the center
    const angle = (index / PLACEHOLDER_STAYS.length) * 2 * Math.PI
    const offsetLat = (Math.random() * 0.008 + 0.002) * Math.cos(angle)
    const offsetLon = (Math.random() * 0.008 + 0.002) * Math.sin(angle)

    return {
      ...stay,
      latitude: lat + offsetLat,
      longitude: lon + offsetLon,
      category: 'accommodation',
      source: 'placeholder',
      distance: calculateDistance(lat, lon, lat + offsetLat, lon + offsetLon)
    }
  })

  // Sort by rating (best first) and limit results
  return stays
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, limit)
}

/**
 * Open Airbnb search for a specific property/location
 * @param {string} propertyName - Property name
 * @param {string} city - City name for the search
 */
export const goToAirbnbBooking = (propertyName, city = '') => {
  const query = encodeURIComponent(`${propertyName} ${city}`.trim())
  window.open(`https://www.airbnb.com/s/${query}/homes`, '_blank')
}

/**
 * Open Booking.com search for a specific property
 * @param {string} propertyName - Property name
 */
export const goToBookingDotCom = (propertyName) => {
  const query = encodeURIComponent(propertyName)
  window.open(`https://www.booking.com/searchresults.html?ss=${query}`, '_blank')
}

/**
 * Open appropriate booking site based on provider
 * @param {Object} stay - Stay object with name and provider
 * @param {string} city - City name for Airbnb searches
 */
export const openBookingUrl = (stay, city = '') => {
  if (stay.provider === 'airbnb') {
    goToAirbnbBooking(stay.name, city)
  } else {
    goToBookingDotCom(stay.name)
  }
}

export default {
  fetchPOIsByCategory,
  fetchPOIsMultipleCategories,
  searchPOIs,
  reverseGeocode,
  getCountryFromPlaceName,
  getDirectionsUrl,
  getPlaceDetailsUrl,
  calculateDistance,
  formatDistance,
  fetchStays,
  goToAirbnbBooking,
  goToBookingDotCom,
  openBookingUrl
}

