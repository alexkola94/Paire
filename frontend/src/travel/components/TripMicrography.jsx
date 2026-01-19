import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { FiMapPin, FiMaximize2, FiX, FiHome } from 'react-icons/fi'
import { Map, Marker, Source, Layer } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MAP_STYLES, DISCOVERY_MAP_CONFIG } from '../utils/travelConstants'
import { tripCityService } from '../services/travelApi'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''

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
        setLoading(false)
        return
      }

      try {
        const tripCities = await tripCityService.getByTrip(trip.id)
        setCities(tripCities || [])
        
        // Calculate initial view state to fit all cities + home location
        if (tripCities && tripCities.length > 0) {
          const validCities = tripCities.filter(c => c.latitude && c.longitude)
          if (validCities.length > 0) {
            // Build list of all points (cities + home if available)
            const allPoints = [...validCities]
            if (homeLocation) {
              allPoints.push({ latitude: homeLocation.latitude, longitude: homeLocation.longitude })
            }

            if (allPoints.length === 1) {
              setViewState({
                latitude: allPoints[0].latitude,
                longitude: allPoints[0].longitude,
                zoom: 10
              })
            } else {
              const bounds = allPoints.reduce(
                (acc, point) => {
                  return {
                    minLat: Math.min(acc.minLat, point.latitude),
                    maxLat: Math.max(acc.maxLat, point.latitude),
                    minLng: Math.min(acc.minLng, point.longitude),
                    maxLng: Math.max(acc.maxLng, point.longitude)
                  }
                },
                {
                  minLat: allPoints[0].latitude,
                  maxLat: allPoints[0].latitude,
                  minLng: allPoints[0].longitude,
                  maxLng: allPoints[0].longitude
                  }
              )

              const centerLat = (bounds.minLat + bounds.maxLat) / 2
              const centerLng = (bounds.minLng + bounds.maxLng) / 2
              const latDiff = bounds.maxLat - bounds.minLat
              const lngDiff = bounds.maxLng - bounds.minLng
              const maxDiff = Math.max(latDiff, lngDiff)
              
              let zoom = 3
              if (maxDiff < 0.1) zoom = 10
              else if (maxDiff < 0.5) zoom = 8
              else if (maxDiff < 1) zoom = 6
              else if (maxDiff < 5) zoom = 4

              setViewState({
                latitude: centerLat,
                longitude: centerLng,
                zoom: zoom
              })
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
    setViewState(evt.viewState)
  }, [])

  if (loading || cities.length === 0) {
    return null
  }

  if (!MAPBOX_TOKEN) {
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
        className="trip-micrography"
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
            onClick={() => setExpanded(true)}
            aria-label={t('travel.micrography.expand', 'Expand map')}
          >
            <FiMaximize2 size={16} />
          </button>
        </div>

        <div className="micrography-map-container">
          <Map
            {...defaultViewState}
            onMove={handleMove}
            mapboxAccessToken={MAPBOX_TOKEN}
            mapStyle={MAP_STYLES.detailed}
            style={{ width: '100%', height: '100%' }}
            minZoom={DISCOVERY_MAP_CONFIG.minZoom}
            maxZoom={DISCOVERY_MAP_CONFIG.maxZoom}
            attributionControl={false}
            interactive={false}
            reuseMaps
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

      {/* Expanded Full-Screen Map */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="micrography-expanded-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpanded(false)}
          >
            <motion.div
              className="micrography-expanded-map"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="micrography-expanded-header">
                <h3>{t('travel.micrography.expandedTitle', 'Trip Route')}</h3>
                <button
                  className="micrography-close"
                  onClick={() => setExpanded(false)}
                  aria-label={t('common.close', 'Close')}
                >
                  <FiX size={24} />
                </button>
              </div>

              <div className="micrography-expanded-map-container">
                <Map
                  {...defaultViewState}
                  onMove={handleMove}
                  mapboxAccessToken={MAPBOX_TOKEN}
                  mapStyle={MAP_STYLES.detailed}
                  style={{ width: '100%', height: '100%' }}
                  minZoom={DISCOVERY_MAP_CONFIG.minZoom}
                  maxZoom={DISCOVERY_MAP_CONFIG.maxZoom}
                  attributionControl={false}
                  reuseMaps
                  scrollWheelZoom={true}
                >
                  {/* Route line */}
                  {routeCoordinates.length > 1 && (
                    <Source
                      id="route-expanded"
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
                        id="route-line-expanded"
                        type="line"
                        paint={{
                          'line-color': '#8B5CF6',
                          'line-width': 3,
                          'line-opacity': 0.7
                        }}
                      />
                      <Layer
                        id="route-line-outline-expanded"
                        type="line"
                        paint={{
                          'line-color': '#ffffff',
                          'line-width': 5,
                          'line-opacity': 0.3
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
                        <FiHome size={16} />
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
                          <div className="city-marker">
                            <div className="city-marker-number">{index + 1}</div>
                            <div className="city-marker-pulse" />
                            <div className="city-marker-dot" />
                          </div>
                        </Marker>
                      )
                    })}
                </Map>
              </div>

              {/* Cities list in expanded view */}
              <div className="micrography-expanded-cities">
                {cities
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((city, index) => (
                    <div key={city.id || index} className="micrography-expanded-city">
                      <div className="micrography-expanded-city-number">{index + 1}</div>
                      <div className="micrography-expanded-city-info">
                        <span className="micrography-expanded-city-name">{city.name}</span>
                        {city.country && (
                          <span className="micrography-expanded-city-country">{city.country}</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default TripMicrography
