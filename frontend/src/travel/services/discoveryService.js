import { getCached, setCached } from './travelDb'
import { DISCOVERY_POI_CATEGORIES, CACHE_TTL, DISCOVERY_MAP_CONFIG } from '../utils/travelConstants'

const OVERPASS_API = 'https://overpass-api.de/api/interpreter'
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''

/**
 * Discovery Service
 * Handles POI fetching from Overpass API (OpenStreetMap) and Mapbox Search
 */

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
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} radius - Search radius in meters
 * @returns {Promise<Array>} Array of POIs
 */
export const fetchPOIsByCategory = async (categoryId, lat, lon, radius = DISCOVERY_MAP_CONFIG.poiRadius) => {
  // Check cache first
  const cacheKey = `discovery-poi-${categoryId}-${lat.toFixed(3)}-${lon.toFixed(3)}`
  const cached = await getCached(cacheKey)
  if (cached) {
    return cached
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
    const pois = parseOverpassResults(data.elements || [], categoryId)

    // Cache results
    await setCached(cacheKey, pois, CACHE_TTL.poi)

    return pois
  } catch (error) {
    console.error('Error fetching POIs from Overpass:', error)
    // Try to return cached data even if expired
    const expiredCache = await getCached(cacheKey)
    if (expiredCache) return expiredCache
    return []
  }
}

/**
 * Fetch POIs for multiple categories
 * @param {Array<string>} categoryIds - Array of category IDs
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Array>} Combined array of POIs
 */
export const fetchPOIsMultipleCategories = async (categoryIds, lat, lon) => {
  const promises = categoryIds.map(id => fetchPOIsByCategory(id, lat, lon))
  const results = await Promise.all(promises)
  return results.flat()
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
 * Reverse geocode coordinates to get address/POI details
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} POI-like object or null
 */
export const reverseGeocode = async (lat, lon) => {
  if (!MAPBOX_TOKEN) return null

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?types=poi,address,place&limit=1&access_token=${MAPBOX_TOKEN}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Mapbox Reverse Geocoding error: ${response.status}`)
    }

    const data = await response.json()
    if (data.features && data.features.length > 0) {
      const feature = data.features[0]
      // Mapbox feature to simplified POI format
      return {
        id: `pinned-${Date.now()}`,
        poiId: `mapbox-${feature.id}`,
        name: feature.text || feature.place_name?.split(',')[0] || 'Unknown Location',
        address: feature.place_name,
        latitude: lat,
        longitude: lon,
        category: 'attraction', // Default category for dropped pins
        source: 'pinned'
      }
    }
    return null
  } catch (error) {
    console.error('Error reverse geocoding:', error)
    return null
  }
}

export default {
  fetchPOIsByCategory,
  fetchPOIsMultipleCategories,
  searchPOIs,
  reverseGeocode,
  getDirectionsUrl,
  calculateDistance,
  formatDistance
}
