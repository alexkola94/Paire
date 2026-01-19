import { memo, useCallback, useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FiMapPin, FiX, FiHome } from 'react-icons/fi'
import { Map, Marker, Source, Layer } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
// Use travel utilities and discovery services from the travel module
import { MAP_STYLES, DISCOVERY_MAP_CONFIG } from '../utils/travelConstants'
import { reverseGeocode, getCountryFromPlaceName, getRouteDirections } from '../services/discoveryService'

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

  // Calculate route line coordinates from Home (if available) through all cities
  const routeCoordinates = [
    ...(homeLocation ? [[homeLocation.longitude, homeLocation.latitude]] : []),
    ...orderedCities
      .filter(city => city.latitude && city.longitude)
      .map(city => [city.longitude, city.latitude])
  ]

  /**
   * Fetch realistic route geometry from Mapbox Directions API.
   * We build one continuous LineString going from Home → City 1 → City 2 → ...
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

        // Build list of segment pairs (origin/destination)
        const segments = []
        for (let i = 0; i < routeCoordinates.length - 1; i++) {
          const [lon1, lat1] = routeCoordinates[i]
          const [lon2, lat2] = routeCoordinates[i + 1]
          segments.push({ lat1, lon1, lat2, lon2 })
        }

        const results = await Promise.all(
          segments.map(seg =>
            getRouteDirections(seg.lat1, seg.lon1, seg.lat2, seg.lon2, 'driving')
          )
        )

        // Concatenate all segment geometries into a single LineString
        const allCoords = []
        segments.forEach((seg, index) => {
          const result = results[index]
          if (result?.geometry?.coordinates?.length > 1) {
            // Append route geometry coordinates
            allCoords.push(...result.geometry.coordinates)
          } else {
            // Fallback: straight line for this segment
            allCoords.push(
              [seg.lon1, seg.lat1],
              [seg.lon2, seg.lat2]
            )
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeLocation, orderedCities.length])

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
        scrollWheelZoom={true}
        dragPan={true}
        dragRotate={true}
        doubleClickZoom={true}
        touchZoom={true}
        touchRotate={true}
        keyboard={true}
      >
        {/* Home marker (user's current location) */}
        {homeLocation && (
          <Marker
            latitude={homeLocation.latitude}
            longitude={homeLocation.longitude}
            anchor="center"
          >
            <div className="home-marker">
              <FiHome size={18} />
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
                'line-color': '#8B5CF6',
                'line-width': 3,
                'line-opacity': 0.7
              }}
            />
            <Layer
              id="route-line-outline"
              type="line"
              paint={{
                'line-color': '#ffffff',
                'line-width': 5,
                'line-opacity': 0.3
              }}
            />
          </Source>
        )}

        {/* City markers - simple dots only */}
        {orderedCities.map((city, index) => {
          if (!city.latitude || !city.longitude) return null

          return (
            <Marker
              key={city.id || `city-${index}`}
              latitude={city.latitude}
              longitude={city.longitude}
              anchor="center"
            >
              <div className="city-marker-simple">
                <div className="city-marker-dot" />
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
