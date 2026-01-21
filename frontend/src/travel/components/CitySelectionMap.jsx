import { memo, useCallback, useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FiMapPin, FiX, FiHome } from 'react-icons/fi'
import { Map, Marker, Source, Layer } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
// Use travel utilities and discovery services from the travel module
import { MAP_STYLES, DISCOVERY_MAP_CONFIG } from '../utils/travelConstants'
import { reverseGeocode, getCountryFromPlaceName, getRouteDirections } from '../services/discoveryService'
import { getTransportSuggestions } from '../utils/transportSuggestion'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''

/**
 * CitySelectionMap Component
 * Interactive map for selecting cities in multi-city trip planning
 * Features: Click to add cities, reverse geocoding, route preview
 */
const CitySelectionMap = memo(({
  cities = [],
  onCityAdd,
  onCityRemove,
  onCityReorder,
  initialViewState = null
}) => {
  const mapRef = useRef(null)
  const [viewState, setViewState] = useState(initialViewState || {
    latitude: 40.7128,
    longitude: -74.006,
    zoom: 3,
    pitch: 0,
    bearing: 0
  })
  const [isAdding, setIsAdding] = useState(false)
  const [homeLocation, setHomeLocation] = useState(null)
  const [routeGeojson, setRouteGeojson] = useState(null)
  const [routesLoading, setRoutesLoading] = useState(false)

  // On first load, try to center map on the user's current location
  useEffect(() => {
    if (!('geolocation' in navigator)) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setHomeLocation({ latitude, longitude })
        setViewState((prev) => ({
          ...prev,
          latitude,
          longitude,
          zoom: 10
        }))
      },
      (error) => {
        // Fail silently – fall back to default viewState
        console.warn('Geolocation unavailable for CitySelectionMap:', error)
      }
    )
  }, [])

  // Ordered cities for consistent numbering and routing
  const orderedCities = [...cities].sort((a, b) => (a.order || 0) - (b.order || 0))

  /**
   * Helper: build the list of route coordinates based on the selected transport mode
   * for each leg. We keep a single polyline but simplify legs that are not
   * travelled by car/train/bus (e.g. flights / ferries) into straight segments.
   * Includes: Home → first city, all city-to-city legs, and last city → Home.
   */
  const buildRouteCoordinates = () => {
    const coords = []

    if (orderedCities.length === 0) {
      return coords
    }

    const first = orderedCities[0]
    const last = orderedCities[orderedCities.length - 1]

    // Home → first city leg
    if (homeLocation && first.latitude && first.longitude) {
      coords.push([homeLocation.longitude, homeLocation.latitude])
      coords.push([first.longitude, first.latitude])
    } else if (first.latitude && first.longitude) {
      coords.push([first.longitude, first.latitude])
    }

    // City-to-city legs (append in order)
    for (let i = 0; i < orderedCities.length - 1; i++) {
      const from = orderedCities[i]
      const to = orderedCities[i + 1]
      if (!from.latitude || !from.longitude || !to.latitude || !to.longitude) continue

      coords.push([from.longitude, from.latitude])
      coords.push([to.longitude, to.latitude])
    }

    // Last city → Home leg
    if (homeLocation && last.latitude && last.longitude) {
      coords.push([last.longitude, last.latitude])
      coords.push([homeLocation.longitude, homeLocation.latitude])
    }

    return coords
  }

  // Calculate route line coordinates from Home (if available) through all cities
  const routeCoordinates = buildRouteCoordinates()

  // Helper: Haversine distance for transport inference
  const getDistanceKm = (lat1, lon1, lat2, lon2) => {
    if ([lat1, lon1, lat2, lon2].some(c => c == null)) return 0
    const toRad = (v) => (v * Math.PI) / 180
    const R = 6371 // km
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  /**
   * Fetch realistic route geometry from Mapbox Directions API.
   * We build one continuous LineString going from Home → City 1 → City 2 → ...
   * For legs where the incoming transport mode is "flight", we intentionally keep
   * the geometry clean and straight instead of following roads.
   * Falls back to simple straight-line coordinates when Directions are not available.
   */
  useEffect(() => {
    // No route if we don't have at least two points
    if (routeCoordinates.length < 2) {
      setRouteGeojson(null)
      return
    }

    let cancelled = false

    const fetchRoutes = async () => {
      try {
        setRoutesLoading(true)

        // Build list of segment pairs (origin/destination) with optional transport mode
        const segments = []

        if (orderedCities.length > 0) {
          const first = orderedCities[0]
          const last = orderedCities[orderedCities.length - 1]

          // Home → first city leg. We align the visual routing mode with the
          // incoming transport mode of the first city so that choosing
          // "flight" or "ferry" turns this segment into a clean straight line
          // instead of a road-following path.
          if (homeLocation && first.latitude && first.longitude) {
            const firstMode = first.transportMode || 'driving'
            segments.push({
              lat1: homeLocation.latitude,
              lon1: homeLocation.longitude,
              lat2: first.latitude,
              lon2: first.longitude,
              mode: firstMode
            })
          }

          // City-to-city legs; transportMode is stored on the incoming city
          for (let i = 0; i < orderedCities.length - 1; i++) {
            const from = orderedCities[i]
            const to = orderedCities[i + 1]
            if (!from.latitude || !from.longitude || !to.latitude || !to.longitude) continue

            segments.push({
              lat1: from.latitude,
              lon1: from.longitude,
              lat2: to.latitude,
              lon2: to.longitude,
              mode: to.transportMode || 'driving'
            })
          }

          // Last city → Home leg.
          // Mirror the outgoing transport mode from the last city so that
          // setting it to "flight" or "ferry" also turns this return leg into
          // a simple straight segment instead of a road-following route.
          if (homeLocation && last.latitude && last.longitude) {
            segments.push({
              lat1: last.latitude,
              lon1: last.longitude,
              lat2: homeLocation.latitude,
              lon2: homeLocation.longitude,
              mode: last.transportMode || 'driving'
            })
          }
        }

        const results = await Promise.all(
          segments.map(seg => {
            // Infer mode if not explicitly set (or default 'driving')
            let mode = seg.mode

            // If defaulting to driving, check if distance suggests flight/ferry
            if (!mode || mode === 'driving') {
              const dist = getDistanceKm(seg.lat1, seg.lon1, seg.lat2, seg.lon2)
              const suggestions = getTransportSuggestions({ distanceKm: dist })
              // If flight is the top suggestion, use it
              if (suggestions[0] === 'flight') {
                mode = 'flight'
              }
            }

            // Update segment mode for later use in geometry selection
            seg.inferredMode = mode

            // For flights or ferries we skip road routing and keep a clean straight segment.
            if (mode === 'flight' || mode === 'ferry') {
              return Promise.resolve(null)
            }
            return getRouteDirections(seg.lat1, seg.lon1, seg.lat2, seg.lon2, 'driving')
          })
        )

        // Concatenate all segment geometries into a single LineString
        const allCoords = []
        segments.forEach((seg, index) => {
          const result = results[index]
          const mode = seg.inferredMode || seg.mode

          // For flight legs or missing geometry, fall back to a simple straight line
          if (mode === 'flight' || !(result?.geometry?.coordinates?.length > 1)) {
            allCoords.push(
              [seg.lon1, seg.lat1],
              [seg.lon2, seg.lat2]
            )
          } else {
            // Append route geometry coordinates
            allCoords.push(...result.geometry.coordinates)
          }
        })

        if (!cancelled && allCoords.length > 1) {
          setRouteGeojson({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: allCoords
            }
          })
        }
      } catch (error) {
        console.error('Error building multi-city route geometry:', error)
        if (!cancelled) {
          setRouteGeojson(null)
        }
      } finally {
        if (!cancelled) {
          setRoutesLoading(false)
        }
      }
    }

    fetchRoutes()

    return () => {
      cancelled = true
    }
    // We intentionally depend on the full cities array so that changing transportMode
    // for a leg recomputes the rendered route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeLocation, cities])

  /**
   * Handle map click to add city
   */
  const handleMapClick = useCallback(async (evt) => {
    if (isAdding) return

    setIsAdding(true)
    const { lat, lng } = evt.lngLat

    try {
      // Reverse geocode to get city name and country
      const geocodeResult = await reverseGeocode(lat, lng)

      let cityName = 'Unknown City'
      let country = ''

      if (geocodeResult) {
        cityName = geocodeResult.name || geocodeResult.address?.split(',')[0] || 'Unknown City'
        // Try to extract country from address
        if (geocodeResult.address) {
          const parts = geocodeResult.address.split(',')
          country = parts[parts.length - 1]?.trim() || ''
        }
      }

      // If country not found, try to get it from place name
      if (!country && cityName !== 'Unknown City') {
        const countryInfo = await getCountryFromPlaceName(cityName)
        if (countryInfo) {
          country = countryInfo.countryName
        }
      }

      // Create new city object
      const newCity = {
        name: cityName,
        country: country,
        latitude: lat,
        longitude: lng,
        order: cities.length,
        startDate: null,
        endDate: null
      }

      if (onCityAdd) {
        onCityAdd(newCity)
      }
    } catch (error) {
      console.error('Error adding city:', error)
    } finally {
      setIsAdding(false)
    }
  }, [cities.length, isAdding, onCityAdd])

  /**
   * Handle map move/zoom
   */
  const handleMove = useCallback((evt) => {
    setViewState(evt.viewState)
  }, [])

  if (!MAPBOX_TOKEN) {
    return (
      <div className="city-selection-map-error">
        <p>Map not available. Mapbox token not configured.</p>
      </div>
    )
  }

  return (
    <motion.div
      className="city-selection-map-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Map
        ref={mapRef}
        {...viewState}
        onMove={handleMove}
        onClick={handleMapClick}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={MAP_STYLES.detailed}
        style={{ width: '100%', height: '100%' }}
        minZoom={DISCOVERY_MAP_CONFIG.minZoom}
        maxZoom={DISCOVERY_MAP_CONFIG.maxZoom}
        attributionControl={false}
        reuseMaps
        cursor={isAdding ? 'wait' : 'crosshair'}
        // Limit scroll-wheel zoom so normal page scrolling doesn't break the map.
        // Users can still zoom with Ctrl+scroll, pinch, double‑click, or UI controls.
        scrollZoom={{ around: 'center', ctrlKeyOnly: true }}
        dragPan={true}
        dragRotate={true}
        doubleClickZoom={true}
        touchZoom={true}
        touchRotate={true}
      >
        {/* Home marker (user's current location) */}
        {homeLocation && (
          <Marker
            latitude={homeLocation.latitude}
            longitude={homeLocation.longitude}
            anchor="center"
          >
            <div className="home-marker">
              {/* Home indicator stays a compact house icon */}
              <FiHome size={16} />
            </div>
          </Marker>
        )}

        {/* Route line connecting cities (realistic route when available) */}
        {routeCoordinates.length > 1 && (
          <Source
            id="route"
            type="geojson"
            data={{
              // Prefer detailed route geometry from Directions API,
              // otherwise fall back to simple straight line coordinates.
              type: 'Feature',
              geometry: routeGeojson?.geometry || {
                type: 'LineString',
                coordinates: routeCoordinates
              }
            }}
          >
            <Layer
              id="route-line"
              type="line"
              paint={{
                // Neutral but standout cyan for the route so it remains visible
                // on top of satellite/terrain in both themes
                'line-color': '#0ea5e9',
                'line-width': 3.5,
                'line-opacity': 0.8
              }}
            />
            <Layer
              id="route-line-outline"
              type="line"
              paint={{
                // Soft light outline to improve contrast without feeling heavy
                'line-color': '#e0f2fe',
                'line-width': 5.5,
                'line-opacity': 0.65
              }}
            />
          </Source>
        )}

        {/* City markers – neutral pins so they are clearly distinct from Home */}
        {orderedCities.map((city, index) => {
          if (!city.latitude || !city.longitude) return null

          return (
            <Marker
              key={city.id || `city-${index}`}
              latitude={city.latitude}
              longitude={city.longitude}
              anchor="bottom"
            >
              <div className="city-marker-pin">
                <FiMapPin size={16} />
              </div>
            </Marker>
          )
        })}
      </Map>

      {/* Instructions overlay */}
      {cities.length === 0 && (
        <div className="city-selection-instructions">
          <FiMapPin size={24} />
          <p>Click on the map to add cities to your trip</p>
        </div>
      )}
    </motion.div>
  )
})

CitySelectionMap.displayName = 'CitySelectionMap'

export default CitySelectionMap
