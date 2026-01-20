import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { FiMapPin, FiMaximize2, FiX, FiHome } from 'react-icons/fi'
import { Map, Marker, Source, Layer } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MAP_STYLES, DISCOVERY_MAP_CONFIG } from '../utils/travelConstants'
import { tripCityService } from '../services/travelApi'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''

// Helper: compute a reasonable Mapbox viewState that fits all given points.
// Keeps logic in one place so both mini-map and expanded map can reuse it.
const getViewStateForPoints = (points) => {
  // Log how many points we try to fit (for debugging purposes)
  console.log('[TripMicrography] getViewStateForPoints - points count:', points?.length ?? 0)
  if (!points || points.length === 0) return null

  // Single point – center directly on it with a closer zoom
  if (points.length === 1) {
    return {
      latitude: points[0].latitude,
      longitude: points[0].longitude,
      zoom: 10
    }
  }

  // Multiple points – compute simple bounds and pick zoom based on spread
  const bounds = points.reduce(
    (acc, point) => ({
      minLat: Math.min(acc.minLat, point.latitude),
      maxLat: Math.max(acc.maxLat, point.latitude),
      minLng: Math.min(acc.minLng, point.longitude),
      maxLng: Math.max(acc.maxLng, point.longitude)
    }),
    {
      minLat: points[0].latitude,
      maxLat: points[0].latitude,
      minLng: points[0].longitude,
      maxLng: points[0].longitude
    }
  )

  const centerLat = (bounds.minLat + bounds.maxLat) / 2
  const centerLng = (bounds.minLng + bounds.maxLng) / 2
  const latDiff = bounds.maxLat - bounds.minLat
  const lngDiff = bounds.maxLng - bounds.minLng
  const maxDiff = Math.max(latDiff, lngDiff)

  // Simple heuristic zoom that keeps the whole trip in view
  let zoom = 3
  if (maxDiff < 0.1) zoom = 10
  else if (maxDiff < 0.5) zoom = 8
  else if (maxDiff < 1) zoom = 6
  else if (maxDiff < 5) zoom = 4

  return {
    latitude: centerLat,
    longitude: centerLng,
    zoom
  }
}

/**
 * TripMicrography Component
 * Mini map visualization showing multi-city trip route
 * Can expand to full-screen view
 */
const TripMicrography = ({ trip, onNavigate }) => {
  const { t } = useTranslation()
  const [cities, setCities] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [viewState, setViewState] = useState(null)
  const [homeLocation, setHomeLocation] = useState(null)

  // Get user's current location (Home) on mount
  useEffect(() => {
    console.log('[TripMicrography] mount - MAPBOX token present:', Boolean(MAPBOX_TOKEN))
    console.log('[TripMicrography] mount - trip id:', trip?.id)

    if (!('geolocation' in navigator)) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setHomeLocation({ latitude, longitude })
      },
      (error) => {
        // Fail silently – home location is optional
        console.warn('Geolocation unavailable for TripMicrography:', error)
      }
    )
  }, [])

  // Load cities for the trip
  useEffect(() => {
    const loadCities = async () => {
      if (!trip?.id) {
        console.log('[TripMicrography] loadCities - no trip id, skipping')
        setLoading(false)
        return
      }

      try {
        const tripCities = await tripCityService.getByTrip(trip.id)
        setCities(tripCities || [])
        console.log(
          '[TripMicrography] loadCities - fetched cities:',
          (tripCities || []).map(c => ({
            id: c.id,
            name: c.name,
            lat: c.latitude,
            lng: c.longitude
          }))
        )

        // Calculate initial view state to fit all cities + optional home location
        if (tripCities && tripCities.length > 0) {
          const validCities = tripCities.filter(c => c.latitude && c.longitude)
          console.log('[TripMicrography] loadCities - validCities count:', validCities.length)
          if (validCities.length > 0) {
            const allPoints = [
              ...validCities,
              ...(homeLocation
                ? [{ latitude: homeLocation.latitude, longitude: homeLocation.longitude }]
                : [])
            ]

            const nextViewState = getViewStateForPoints(allPoints)
            if (nextViewState) {
              console.log('[TripMicrography] loadCities - setting initial viewState:', nextViewState)
              setViewState(nextViewState)
            }
          }
        }
      } catch (error) {
        console.error('Error loading cities:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCities()
  }, [trip?.id, homeLocation])

  // Ensure we can quickly re-fit the map to show the whole trip (home + all cities)
  // when the user expands the view.
  const fitToRoute = useCallback(() => {
    const validCities = cities.filter(c => c.latitude && c.longitude)
    console.log('[TripMicrography] fitToRoute - validCities count:', validCities.length, 'homeLocation:', homeLocation)
    if (validCities.length === 0 && !homeLocation) {
      console.warn('[TripMicrography] fitToRoute - no coordinates available to fit')
      return
    }

    const allPoints = [
      ...validCities,
      ...(homeLocation
        ? [{ latitude: homeLocation.latitude, longitude: homeLocation.longitude }]
        : [])
    ]

    const nextViewState = getViewStateForPoints(allPoints)
    if (nextViewState) {
      console.log('[TripMicrography] fitToRoute - applying viewState:', nextViewState)
      setViewState(nextViewState)
    }
  }, [cities, homeLocation])

  // Calculate route line coordinates: Home → City 1 → City 2 → ...
  const routeCoordinates = [
    ...(homeLocation ? [[homeLocation.longitude, homeLocation.latitude]] : []),
    ...cities
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .filter(city => city.latitude && city.longitude)
      .map(city => [city.longitude, city.latitude])
  ]

  // Handle map move
  const handleMove = useCallback((evt) => {
    // Keep view state in sync while user moves the map (expanded)
    setViewState(evt.viewState)
  }, [])

  if (loading || cities.length === 0) {
    return null
  }

  if (!MAPBOX_TOKEN) {
    console.warn('[TripMicrography] render guard - missing MAPBOX_TOKEN, map will not render')
    return null
  }

  const defaultViewState = viewState || {
    latitude: cities[0]?.latitude || 0,
    longitude: cities[0]?.longitude || 0,
    zoom: 3
  }

  return (
    <>
      {/* Mini Map Card */}
      <motion.div
        className={`trip-micrography ${expanded ? 'expanded' : ''}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="micrography-header">
          <div className="micrography-title">
            <FiMapPin size={18} />
            <span>{t('travel.micrography.title', 'Trip Route')}</span>
          </div>
          {cities.length > 1 && (
            <div className="micrography-route-label">
              {(() => {
                const ordered = [...cities].sort((a, b) => (a.order || 0) - (b.order || 0))
                const startCity = ordered[0]
                const endCity = ordered[ordered.length - 1]
                if (!startCity || !endCity) {
                  return t('travel.micrography.subtitle', 'See the flow of your journey at a glance')
                }
                return t(
                  'travel.micrography.routeLabel',
                  'From {{start}} to {{end}}',
                  { start: startCity?.name || '', end: endCity?.name || '' }
                )
              })()}
            </div>
          )}
          <button
            className="micrography-expand"
            onClick={() => {
              // Toggle expanded state and re-fit the route when opening
              if (!expanded) {
                fitToRoute()
              }
              setExpanded(prev => !prev)
            }}
            aria-label={
              expanded
                ? t('travel.micrography.collapse', 'Collapse map')
                : t('travel.micrography.expand', 'Expand map')
            }
          >
            {expanded ? <FiX size={16} /> : <FiMaximize2 size={16} />}
          </button>
        </div>

        <div className={`micrography-map-container ${expanded ? 'expanded' : ''}`}>
          {/* Single Map instance that smoothly grows/shrinks with the card */}
          <Map
            {...defaultViewState}
            onMove={handleMove}
            mapboxAccessToken={MAPBOX_TOKEN}
            mapStyle={MAP_STYLES.detailed}
            style={{ width: '100%', height: '100%' }}
            minZoom={DISCOVERY_MAP_CONFIG.minZoom}
            maxZoom={DISCOVERY_MAP_CONFIG.maxZoom}
            attributionControl={false}
            // Always allow basic interactivity (drag); enable scroll zoom only when expanded
            interactive={true}
            scrollZoom={expanded}
          >
            {/* Route line */}
            {routeCoordinates.length > 1 && (
              <Source
                id="route"
                type="geojson"
                data={{
                  type: 'Feature',
                  geometry: {
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
                    'line-width': 2,
                    'line-opacity': 0.7
                  }}
                />
              </Source>
            )}

            {/* Home marker (starting point) */}
            {homeLocation && (
              <Marker
                latitude={homeLocation.latitude}
                longitude={homeLocation.longitude}
                anchor="center"
              >
                <div className="micrography-home-marker">
                  <FiHome size={14} />
                </div>
              </Marker>
            )}

            {/* City markers */}
            {cities
              .sort((a, b) => (a.order || 0) - (b.order || 0))
              .map((city, index) => {
                if (!city.latitude || !city.longitude) return null

                return (
                  <Marker
                    key={city.id || `city-${index}`}
                    latitude={city.latitude}
                    longitude={city.longitude}
                    anchor="center"
                  >
                    <div className="micrography-marker">
                      <div className="micrography-marker-number">{index + 1}</div>
                    </div>
                  </Marker>
                )
              })}
          </Map>
        </div>

        {/* Cities list */}
        <div className="micrography-cities">
          {cities
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .slice(0, 3)
            .map((city, index) => (
              <div key={city.id || index} className="micrography-city-item">
                <span className="micrography-city-number">{index + 1}</span>
                <span className="micrography-city-name">{city.name}</span>
              </div>
            ))}
          {cities.length > 3 && (
            <div className="micrography-city-more">
              +{cities.length - 3} {t('travel.micrography.more', 'more')}
            </div>
          )}
        </div>
      </motion.div>

    </>
  )
}

export default TripMicrography
