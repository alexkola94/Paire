import { memo, useCallback, useRef, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { FiMapPin, FiX, FiHome, FiSearch } from 'react-icons/fi'
import { Map, Marker, Source, Layer } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
// Use travel utilities and discovery services from the travel module
import { MAP_STYLES, DISCOVERY_MAP_CONFIG } from '../utils/travelConstants'
import { reverseGeocode, getCountryFromPlaceName, getRouteDirections } from '../services/discoveryService'
import { getTransportSuggestions } from '../utils/transportSuggestion'
import { geocodingService } from '../services/travelApi'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''

// Transport mode colors - chosen to contrast with typical map backgrounds
// (greens, blues, browns, grays) and be distinct from each other
const TRANSPORT_COLORS = {
  flight: '#ec4899',   // Hot pink - stands out for air travel
  train: '#f97316',    // Orange - classic rail association
  car: '#84cc16',      // Lime green - distinct and visible
  bus: '#eab308',      // Amber/Gold - visible on most backgrounds
  ferry: '#14b8a6',    // Teal - water-related but distinct from map ocean
  walking: '#a855f7',  // Purple - soft but visible
  driving: '#84cc16',  // Same as car (fallback)
  default: '#64748b'   // Slate gray - fallback
}

// Outline colors (lighter versions for contrast)
const TRANSPORT_OUTLINE_COLORS = {
  flight: '#fce7f3',   // Light pink
  train: '#ffedd5',    // Light orange
  car: '#ecfccb',      // Light lime
  bus: '#fef3c7',      // Light amber
  ferry: '#ccfbf1',    // Light teal
  walking: '#f3e8ff',  // Light purple
  driving: '#ecfccb',  // Same as car
  default: '#f1f5f9'   // Light slate
}

// City marker colors - gradient from first to last
const MARKER_COLORS = {
  start: { r: 16, g: 185, b: 129 },   // Emerald green (#10b981)
  end: { r: 244, g: 63, b: 94 }       // Rose red (#f43f5e)
}

/**
 * Interpolate between start and end marker colors based on position
 * @param {number} index - Current city index (0-based)
 * @param {number} total - Total number of cities
 * @returns {string} - Hex color string
 */
const getMarkerColor = (index, total) => {
  // Single city: use start color
  if (total <= 1) {
    const { r, g, b } = MARKER_COLORS.start
    return `rgb(${r}, ${g}, ${b})`
  }

  // Calculate interpolation factor (0 = first, 1 = last)
  const t = index / (total - 1)

  // Linear interpolation between start and end colors
  const r = Math.round(MARKER_COLORS.start.r + t * (MARKER_COLORS.end.r - MARKER_COLORS.start.r))
  const g = Math.round(MARKER_COLORS.start.g + t * (MARKER_COLORS.end.g - MARKER_COLORS.start.g))
  const b = Math.round(MARKER_COLORS.start.b + t * (MARKER_COLORS.end.b - MARKER_COLORS.start.b))

  return `rgb(${r}, ${g}, ${b})`
}

/**
 * Get a slightly darker shade for gradient effect
 */
const getDarkerShade = (index, total) => {
  if (total <= 1) {
    const { r, g, b } = MARKER_COLORS.start
    return `rgb(${Math.round(r * 0.7)}, ${Math.round(g * 0.7)}, ${Math.round(b * 0.7)})`
  }

  const t = index / (total - 1)

  const r = Math.round((MARKER_COLORS.start.r + t * (MARKER_COLORS.end.r - MARKER_COLORS.start.r)) * 0.7)
  const g = Math.round((MARKER_COLORS.start.g + t * (MARKER_COLORS.end.g - MARKER_COLORS.start.g)) * 0.7)
  const b = Math.round((MARKER_COLORS.start.b + t * (MARKER_COLORS.end.b - MARKER_COLORS.start.b)) * 0.7)

  return `rgb(${r}, ${g}, ${b})`
}

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
  homeLocation, // Now passed from parent
  returnTransportMode, // Now passed from parent
  initialViewState = null,
  showInstructions = true
}) => {
  const { t } = useTranslation()
  const mapRef = useRef(null)
  const [viewState, setViewState] = useState(initialViewState || {
    latitude: 40.7128,
    longitude: -74.006,
    zoom: 3,
    pitch: 0,
    bearing: 0
  })
  const [isAdding, setIsAdding] = useState(false)
  // homeLocation is now a prop
  const [routeGeojson, setRouteGeojson] = useState(null)
  const [routesLoading, setRoutesLoading] = useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  // Marker delete interaction state
  const [deleteCandidateId, setDeleteCandidateId] = useState(null)

  // On first load, try to center map on the user's current location
  useEffect(() => {
    if (!('geolocation' in navigator)) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        // We only set view state here; homeLocation data comes via props now
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
              mode: returnTransportMode || last.transportMode || 'driving' // Use user selection or fallback to last-leg mode
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

        // Create a FeatureCollection to hold all route segments
        const features = []

        segments.forEach((seg, index) => {
          const result = results[index]
          const mode = seg.inferredMode || seg.mode
          // Normalize mode for checking
          const m = (mode || '').toLowerCase()

          // 1. Flight / Ferry: Always allowed as straight line
          if (m === 'flight' || m === 'ferry') {
            features.push({
              type: 'Feature',
              properties: { mode: m },
              geometry: {
                type: 'LineString',
                coordinates: [
                  [seg.lon1, seg.lat1],
                  [seg.lon2, seg.lat2]
                ]
              }
            })
            return
          }

          // 2. Land Transport: ONLY draw if we have a valid route geometry.
          // The user explicitly stated: "we cannot draw routes on the sea we haft to draw routes by land"
          // So if Mapbox falls back or gives us nothing, we render NOTHING for this segment (a gap).
          if (result?.geometry?.coordinates?.length > 1) {
            features.push({
              type: 'Feature',
              properties: { mode: m },
              geometry: result.geometry
            })
          }
          // Else: Gap in the line. Do NOT fall back to straight line for land transport.
        })

        if (!cancelled) {
          // Even if features is empty, we return a valid collection (clears the map)
          setRouteGeojson({
            type: 'FeatureCollection',
            features: features
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
  }, [homeLocation, cities, returnTransportMode])

  /**
   * Handle map click to add city
   */
  const handleMapClick = useCallback(async (evt) => {
    // If we have a delete candidate active, clicking elsewhere dismisses it
    if (deleteCandidateId) {
      setDeleteCandidateId(null)
      return
    }

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

  // Handle search input change
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 3) {
        setIsSearching(true)
        try {
          const results = await geocodingService.search(searchQuery, 5)
          setSearchResults(results.map(r => ({
            name: r.name || r.fullName?.split(',')[0] || '',
            fullName: r.fullName || r.name || '',
            country: r.country || '',
            latitude: r.latitude || 0,
            longitude: r.longitude || 0
          })))
        } catch (error) {
          console.error('Search error:', error)
          setSearchResults([])
        } finally {
          setIsSearching(false)
        }
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Handle search result selection
  const handleSearchSelect = (result) => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [result.longitude, result.latitude],
        zoom: 12,
        duration: 2000
      })
    }
    setSearchQuery('')
    setSearchResults([])
  }

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
      {/* Search Bar Overlay */}
      <div className="map-search-overlay">
        <div className="map-search-input-wrapper">
          <input
            type="text"
            className="map-search-input"
            placeholder={t('travel.citySelection.searchPlaceholder', 'Search places...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="map-search-clear"
              onClick={() => { setSearchQuery(''); setSearchResults([]); }}
            >
              <FiX />
            </button>
          )}
        </div>

        <AnimatePresence>
          {searchResults.length > 0 && (
            <motion.div
              className="map-search-results"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ul>
                {searchResults.map((result, index) => (
                  <li key={index} onClick={() => handleSearchSelect(result)}>
                    <FiMapPin className="result-icon" />
                    <div className="result-info">
                      <span className="result-name">{result.name}</span>
                      <span className="result-country">{result.country}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Map uses Streets style for consistent native colors regardless of app dark/light theme */}
      <Map
        ref={mapRef}
        {...viewState}
        onMove={handleMove}
        onClick={handleMapClick}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={MAP_STYLES.streets}
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
            data={routeGeojson || {
              // Fallback for initial load (straight lines) before API returns
              // Note: This might briefly show straight lines for cars, but will be replaced
              // by routeGeojson (with gaps) once loaded.
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: routeCoordinates
              }
            }}
          >
            {/* Outline layer (rendered first, behind main line) */}
            <Layer
              id="route-line-outline"
              type="line"
              paint={{
                // Data-driven outline color based on transport mode
                'line-color': [
                  'match',
                  ['get', 'mode'],
                  'flight', TRANSPORT_OUTLINE_COLORS.flight,
                  'train', TRANSPORT_OUTLINE_COLORS.train,
                  'car', TRANSPORT_OUTLINE_COLORS.car,
                  'bus', TRANSPORT_OUTLINE_COLORS.bus,
                  'ferry', TRANSPORT_OUTLINE_COLORS.ferry,
                  'walking', TRANSPORT_OUTLINE_COLORS.walking,
                  'driving', TRANSPORT_OUTLINE_COLORS.driving,
                  TRANSPORT_OUTLINE_COLORS.default
                ],
                'line-width': 6,
                'line-opacity': 0.7
              }}
            />
            {/* Main route line with transport-specific colors */}
            <Layer
              id="route-line"
              type="line"
              paint={{
                // Data-driven color based on transport mode
                'line-color': [
                  'match',
                  ['get', 'mode'],
                  'flight', TRANSPORT_COLORS.flight,
                  'train', TRANSPORT_COLORS.train,
                  'car', TRANSPORT_COLORS.car,
                  'bus', TRANSPORT_COLORS.bus,
                  'ferry', TRANSPORT_COLORS.ferry,
                  'walking', TRANSPORT_COLORS.walking,
                  'driving', TRANSPORT_COLORS.driving,
                  TRANSPORT_COLORS.default
                ],
                'line-width': 3.5,
                'line-opacity': 0.9
              }}
            />
            {/* Dashed overlay for flights */}
            <Layer
              id="route-line-flight-dash"
              type="line"
              filter={['==', ['get', 'mode'], 'flight']}
              paint={{
                'line-color': '#ffffff',
                'line-width': 1.5,
                'line-opacity': 0.6,
                'line-dasharray': [2, 4]
              }}
            />
            {/* Dashed overlay for ferry */}
            <Layer
              id="route-line-ferry-dash"
              type="line"
              filter={['==', ['get', 'mode'], 'ferry']}
              paint={{
                'line-color': '#ffffff',
                'line-width': 1.5,
                'line-opacity': 0.5,
                'line-dasharray': [4, 3]
              }}
            />
          </Source>
        )}

        {/* City markers – color gradient from first (green) to last (red) */}
        {orderedCities.map((city, index) => {
          if (!city.latitude || !city.longitude) return null

          const markerColor = getMarkerColor(index, orderedCities.length)
          const darkerColor = getDarkerShade(index, orderedCities.length)
          const isFirst = index === 0
          const isLast = index === orderedCities.length - 1

          const isCandidate = deleteCandidateId === city.id

          return (
            <Marker
              key={city.id || `city-${index}`}
              latitude={city.latitude}
              longitude={city.longitude}
              anchor="bottom"
              style={{ zIndex: isCandidate ? 50 : 'auto' }} // Bring candidate to front
            >
              <div
                className={`city-marker-pin ${isFirst ? 'city-marker-first' : ''} ${isLast ? 'city-marker-last' : ''}`}
                style={{
                  background: `linear-gradient(145deg, ${markerColor} 0%, ${darkerColor} 100%)`,
                  transform: isCandidate ? 'scale(1.15) translateY(-2px)' : undefined
                }}
                onContextMenu={(e) => {
                  // Prevent context menu on long press on mobile
                  e.preventDefault()
                }}
                // Long Press Handlers
                onTouchStart={(e) => {
                  // e.stopPropagation() // Don't stop propagation immediately, let map handle gestures, but we start a timer
                  const timer = setTimeout(() => {
                    setDeleteCandidateId(city.id)
                    // Haptic feedback if available
                    if (navigator.vibrate) navigator.vibrate(50)
                  }, 600)
                  e.target.dataset.longPressTimer = timer
                }}
                onTouchEnd={(e) => {
                  const timer = parseInt(e.target.dataset.longPressTimer)
                  if (timer) clearTimeout(timer)
                }}
                onTouchMove={(e) => {
                  // If user scrolls/drags, cancel the long press
                  const timer = parseInt(e.target.dataset.longPressTimer)
                  if (timer) clearTimeout(timer)
                }}
                // Mouse handlers for desktop testing
                onMouseDown={(e) => {
                  const timer = setTimeout(() => {
                    setDeleteCandidateId(city.id)
                  }, 600)
                  e.target.dataset.longPressTimer = timer
                }}
                onMouseUp={(e) => {
                  const timer = parseInt(e.target.dataset.longPressTimer)
                  if (timer) clearTimeout(timer)
                }}
                onMouseLeave={(e) => {
                  const timer = parseInt(e.target.dataset.longPressTimer)
                  if (timer) clearTimeout(timer)
                }}
                // Clean up any double click handlers from before
                onDoubleClick={(e) => {
                  e.stopPropagation()
                }}
              >
                <span className="city-marker-number">{index + 1}</span>

                {/* Delete Button Overlay */}
                <AnimatePresence>
                  {isCandidate && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      className="marker-delete-action"
                      style={{
                        position: 'absolute',
                        top: -12,
                        right: -12,
                        width: 24,
                        height: 24,
                        background: '#EF4444',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                        cursor: 'pointer',
                        zIndex: 60
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (onCityRemove) onCityRemove(city.id)
                        setDeleteCandidateId(null)
                      }}
                    >
                      <FiX size={14} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Marker>
          )
        })}
      </Map>

      {/* Instructions overlay - pushed down if search bar is present, or positioned bottom-center */}
      {showInstructions && cities.length === 0 && (
        <div className="city-selection-instructions" style={{ top: 'auto', bottom: '2rem' }}>
          <FiMapPin size={24} />
          <p>Click on the map to add cities to your trip</p>
        </div>
      )}

      {/* Route color legend - shows when there are routes */}
      {orderedCities.length >= 2 && (
        <div className="route-legend">
          <div className="route-legend-title">Transport</div>
          <div className="route-legend-items">
            <div className="route-legend-item">
              <span className="route-legend-line" style={{ backgroundColor: TRANSPORT_COLORS.car }} />
              <span className="route-legend-label">Car</span>
            </div>
            <div className="route-legend-item">
              <span className="route-legend-line" style={{ backgroundColor: TRANSPORT_COLORS.train }} />
              <span className="route-legend-label">Train</span>
            </div>
            <div className="route-legend-item">
              <span className="route-legend-line route-legend-line--dashed" style={{ backgroundColor: TRANSPORT_COLORS.flight }} />
              <span className="route-legend-label">Flight</span>
            </div>
            <div className="route-legend-item">
              <span className="route-legend-line" style={{ backgroundColor: TRANSPORT_COLORS.bus }} />
              <span className="route-legend-label">Bus</span>
            </div>
            <div className="route-legend-item">
              <span className="route-legend-line route-legend-line--dashed" style={{ backgroundColor: TRANSPORT_COLORS.ferry }} />
              <span className="route-legend-label">Ferry</span>
            </div>
            <div className="route-legend-item">
              <span className="route-legend-line" style={{ backgroundColor: TRANSPORT_COLORS.walking }} />
              <span className="route-legend-label">Walk</span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
})

CitySelectionMap.displayName = 'CitySelectionMap'

export default CitySelectionMap
