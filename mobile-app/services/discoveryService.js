/**
 * Discovery Service (React Native)
 * POI search via Overpass API (OpenStreetMap), distance helpers.
 * No Mapbox token required; route directions use Haversine fallback.
 */

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

/** Default POI search radius in meters */
const DEFAULT_RADIUS_M = 2000;

/** POI category to OSM tag mapping for Overpass queries */
const POI_OSM_TAGS = {
  restaurant: [['amenity', 'restaurant']],
  cafe: [['amenity', 'cafe']],
  attraction: [['tourism', 'attraction'], ['tourism', 'museum'], ['tourism', 'viewpoint']],
  shopping: [['shop', 'supermarket'], ['shop', 'mall'], ['shop', 'convenience']],
  nature: [['leisure', 'park'], ['natural', 'wood']],
  hotel: [['tourism', 'hotel'], ['tourism', 'hostel'], ['tourism', 'guest_house']],
  hospital: [['amenity', 'hospital'], ['amenity', 'clinic']],
  pharmacy: [['amenity', 'pharmacy']],
  atm: [['amenity', 'atm'], ['amenity', 'bank']],
};

/**
 * Haversine distance between two points in km.
 * @param {number} lat1 - Latitude 1
 * @param {number} lon1 - Longitude 1
 * @param {number} lat2 - Latitude 2
 * @param {number} lon2 - Longitude 2
 * @returns {number} Distance in km
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Build Overpass QL query for a category around lat,lon.
 * @param {string} category - Category key from POI_OSM_TAGS
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} radius - Radius meters
 * @returns {string|null} Query or null
 */
function buildOverpassQuery(category, lat, lon, radius = DEFAULT_RADIUS_M) {
  const tags = POI_OSM_TAGS[category];
  if (!tags || tags.length === 0) return null;

  const nodeQueries = tags
    .map(([key, value]) => `node["${key}"="${value}"](around:${radius},${lat},${lon});`)
    .join('\n');

  return `
    [out:json][timeout:25];
    (
      ${nodeQueries}
    );
    out body;
  `;
}

/**
 * Format address from OSM tags.
 * @param {Object} tags - OSM tags
 * @returns {string}
 */
function formatAddress(tags) {
  if (!tags) return '';
  const parts = [];
  if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
  if (tags['addr:street']) parts.push(tags['addr:street']);
  if (tags['addr:city']) parts.push(tags['addr:city']);
  if (tags['addr:postcode']) parts.push(tags['addr:postcode']);
  return parts.join(', ');
}

/**
 * Normalize Overpass element to POI shape { id, name, lat, lng, address, type, ... }.
 * @param {Object} element - Overpass element
 * @param {string} category - Category id
 * @returns {Object}
 */
function parseElement(element, category) {
  const name =
    element.tags?.name || element.tags?.['name:en'] || 'Unnamed';
  return {
    id: `osm-${element.id}`,
    poiId: `osm-${element.id}`,
    name,
    type: category,
    category,
    lat: element.lat,
    lng: element.lon,
    latitude: element.lat,
    longitude: element.lon,
    address: formatAddress(element.tags),
    phone: element.tags?.phone || element.tags?.['contact:phone'] || '',
    website: element.tags?.website || element.tags?.['contact:website'] || '',
    openingHours: element.tags?.opening_hours || '',
    tags: element.tags || {},
  };
}

/**
 * Search POIs by category near lat,lng using Overpass API.
 * @param {number} lat - Latitude (map center)
 * @param {number} lng - Longitude (map center)
 * @param {string} category - Category key (restaurant, attraction, etc.)
 * @param {number} radiusKm - Radius in km (default 2)
 * @param {number} limit - Max results (default 30)
 * @returns {Promise<Array>} POIs with distance, sorted by distance
 */
export async function searchPOIs(lat, lng, category, radiusKm = 2, limit = 30) {
  const radius = Math.min(Math.round(radiusKm * 1000), 5000);
  const query = buildOverpassQuery(category, lat, lng, radius);
  if (!query) return [];

  try {
    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      body: query,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    if (!response.ok) throw new Error(`Overpass error: ${response.status}`);

    const data = await response.json();
    const elements = data.elements || [];
    let pois = elements
      .map((el) => parseElement(el, category))
      .filter((p) => p.name !== 'Unnamed');

    pois = pois.map((p) => ({
      ...p,
      distance: calculateDistance(lat, lng, p.latitude, p.longitude),
    }));
    pois.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    return pois.slice(0, limit);
  } catch (err) {
    console.warn('Discovery searchPOIs error:', err);
    return [];
  }
}

/**
 * Text search for POIs: uses Overpass with a generic query (name match).
 * Simpler than Mapbox; good enough for mobile when no token.
 * @param {string} query - Search text
 * @param {number} lat - Latitude (proximity)
 * @param {number} lng - Longitude (proximity)
 * @param {number} limit - Max results
 * @returns {Promise<Array>} POIs
 */
export async function textSearch(query, lat, lng, limit = 15) {
  const q = String(query).trim();
  if (q.length < 2) return [];

  const radius = 3000; // 3 km
  // Escape for Overpass: avoid breaking regex; use literal substring
  const safe = q.replace(/[\\"[\]]/g, '').trim();
  if (safe.length < 2) return [];
  const overpassQuery = `
    [out:json][timeout:15];
    node["name"~"${safe}",i](around:${radius},${lat},${lng});
    out body;
  `;

  try {
    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      body: overpassQuery,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    if (!response.ok) return [];

    const data = await response.json();
    const elements = data.elements || [];
    const pois = [];
    for (const el of elements) {
      const latEl = el.lat;
      const lonEl = el.lon;
      if (latEl == null || lonEl == null) continue;
      const name = el.tags?.name || el.tags?.['name:en'] || 'Unnamed';
      pois.push({
        id: `osm-${el.id}`,
        poiId: `osm-${el.id}`,
        name,
        type: 'place',
        category: 'place',
        lat: latEl,
        lng: lonEl,
        latitude: latEl,
        longitude: lonEl,
        address: formatAddress(el.tags),
        distance: calculateDistance(lat, lng, latEl, lonEl),
        tags: el.tags || {},
      });
    }
    pois.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    return pois.slice(0, limit);
  } catch (err) {
    console.warn('Discovery textSearch error:', err);
    return [];
  }
}

/**
 * Get route info between two points. Mobile uses Haversine only (no Mapbox).
 * Caller can open Google Maps URL for actual directions.
 * @param {number} fromLat - From latitude
 * @param {number} fromLng - From longitude
 * @param {number} toLat - To latitude
 * @param {number} toLng - To longitude
 * @param {string} _profile - Ignored (driving/train etc.); kept for API compatibility
 * @returns {Promise<{ distanceKm: number, usedFallback: boolean }>}
 */
export async function getRouteDirections(fromLat, fromLng, toLat, toLng, _profile = 'driving') {
  const distanceKm = calculateDistance(fromLat, fromLng, toLat, toLng);
  return { distanceKm, usedFallback: true };
}

/** Nominatim base URL for reverse geocoding (OpenStreetMap) */
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';

/**
 * Reverse geocode: get place name and country from lat/lng.
 * Uses Nominatim (OSM); respects usage policy with User-Agent.
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{ name: string, country: string } | null>}
 */
export async function reverseGeocode(lat, lng) {
  if (lat == null || lng == null) return null;
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'json',
    addressdetails: '1',
  });
  try {
    const res = await fetch(`${NOMINATIM_REVERSE}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'YouAndMeExpenses-Mobile/1.0',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const address = data.address || {};
    // Prefer region-level name (city/town/village) over street (display_name first part)
    const regionName =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.county ||
      address.state ||
      '';
    const country = address.country || '';
    const name =
      regionName ||
      (data.display_name ? data.display_name.split(',')[0].trim() : '') ||
      (country ? 'Unknown' : 'Unknown place');
    return {
      name: name || 'Unknown place',
      country: country || '',
    };
  } catch (err) {
    console.warn('Reverse geocode error:', err);
    return null;
  }
}
