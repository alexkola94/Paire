import { useState, useEffect, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiSun,
  FiCloud,
  FiCloudRain,
  FiCloudSnow,
  FiMapPin,
  FiRefreshCw,
  FiChevronDown,
  FiChevronUp,
  FiCoffee,
  FiShoppingBag,
  FiHeart,
  FiDollarSign,
  FiExternalLink,
  FiSearch,
  FiLoader
} from 'react-icons/fi'
import { WEATHER_CODES, POI_CATEGORIES } from '../utils/travelConstants'
import { getDestinationInfo } from '../utils/travelData'
import { tripCityService, savedPlaceService } from '../services/travelApi'
import useDiscoveryMode from '../hooks/useDiscoveryMode'
import EmergencyCard from '../components/explore/EmergencyCard'
import PhrasebookCard from '../components/explore/PhrasebookCard'
import { useTravelMode } from '../context/TravelModeContext'
import TravelAdvisoryCard from '../components/TravelAdvisoryCard'
import { getAdvisoryForTrip, getAdvisories } from '../services/travelAdvisoryService'
import '../styles/Explore.css'

// Weather icon mapping
const weatherIcons = {
  sunny: FiSun,
  cloudy: FiCloud,
  rainy: FiCloudRain,
  snowy: FiCloudSnow
}

// POI category icons
const poiIcons = {
  restaurant: FiCoffee,
  attraction: FiMapPin,
  shopping: FiShoppingBag,
  hospital: FiHeart,
  atm: FiDollarSign,
  pharmacy: FiHeart
}

// Gentle animation variants
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4 } }
}

/**
 * Explore Page - Calm, on-demand information
 * Shows weather when ready, POIs only when user asks
 * Memoized to re-render only when trip changes.
 */
const ExplorePage = memo(({ trip }) => {
  const { t } = useTranslation()
  const [weather, setWeather] = useState(null)
  const [pois, setPois] = useState([])
  const [loadingWeather, setLoadingWeather] = useState(true)
  const [loadingPois, setLoadingPois] = useState(false)
  const [showFullForecast, setShowFullForecast] = useState(false)
  const [showPOISearch, setShowPOISearch] = useState(true) // Show categories by default
  const [selectedPoiCategory, setSelectedPoiCategory] = useState(null)
  const [weatherError, setWeatherError] = useState(null)
  const [advisory, setAdvisory] = useState(null)
  const [advisories, setAdvisories] = useState([])
  const [savedPlaces, setSavedPlaces] = useState([])
  const [tripCities, setTripCities] = useState([])
  const { enterDiscoveryMode, canEnterDiscoveryMode } = useDiscoveryMode()
  const { setBackgroundMapCities } = useTravelMode()

  // Fetch weather data
  useEffect(() => {
    const fetchWeather = async () => {
      if (!trip?.latitude || !trip?.longitude) {
        setLoadingWeather(false)
        return
      }

      try {
        setWeatherError(null)
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${trip.latitude}&longitude=${trip.longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`
        )

        if (!response.ok) throw new Error('Weather API failed')

        const data = await response.json()
        setWeather(data)
      } catch (error) {
        console.error('Error fetching weather:', error)
        setWeatherError(t('travel.explore.weatherError', 'Unable to load weather'))
      } finally {
        setLoadingWeather(false)
      }
    }

    fetchWeather()
  }, [trip?.latitude, trip?.longitude, t])

  // Load saved places (pinned POIs) for the current trip so the explore
  // view can surface a gentle snapshot of favourites discovered on the map.
  useEffect(() => {
    let cancelled = false

    const loadSavedPlaces = async () => {
      if (!trip?.id) {
        setSavedPlaces([])
        return
      }

      try {
        const places = await savedPlaceService.getByTrip(trip.id)
        if (!cancelled) {
          // Keep this list intentionally small so the section stays calm.
          setSavedPlaces((places || []).slice(0, 5))
        }
      } catch (error) {
        console.error('Error loading saved places for Explore page:', error)
        if (!cancelled) {
          setSavedPlaces([])
        }
      }
    }

    loadSavedPlaces()

    return () => {
      cancelled = true
    }
  }, [trip?.id])

  // Fetch country‑level travel advisory/advisories in the background so it
  // never blocks the main explore view. Supports multi‑city trips.
  useEffect(() => {
    let cancelled = false

    const loadAdvisories = async () => {
      if (!trip) {
        setAdvisory(null)
        setAdvisories([])
        setBackgroundMapCities([])
        return
      }

      try {
        // Multi‑city: resolve distinct destination countries from trip cities
        // and request advisories for each.
        // Multi‑city: resolve distinct destination countries from trip cities
        // and request advisories for each.
        if (trip.tripType === 'multi-city' && trip.id) {
          try {
            const cities = await tripCityService.getByTrip(trip.id)
            setTripCities(cities || [])
            setBackgroundMapCities(cities || [])
            const countries = Array.from(
              new Set(
                (cities || [])
                  .map(c => c.country && String(c.country).trim())
                  .filter(Boolean)
              )
            )

            if (countries.length > 0) {
              const results = await getAdvisories(countries).catch(() => [])
              if (!cancelled) {
                setAdvisories(results || [])
                setAdvisory(results && results.length > 0 ? results[0] : null)
              }
              return
            }
          } catch (cityError) {
            console.error('Error resolving cities for Explore advisory:', cityError)
          }
        }

        // Fallback: single‑destination advisory based on the trip itself.
        const single = await getAdvisoryForTrip(trip).catch(() => null)
        if (!cancelled) {
          setAdvisory(single || null)
          setAdvisories(single ? [single] : [])
        }
      } catch (error) {
        console.error('Error loading explore advisory:', error)
        if (!cancelled) {
          setAdvisory(null)
          setAdvisories([])
        }
      }
    }

    loadAdvisories()

    return () => {
      cancelled = true
    }
  }, [trip])

  // Fetch POIs - only when user requests
  const fetchPois = async (category) => {
    if (!trip?.latitude || !trip?.longitude) return

    setLoadingPois(true)
    setSelectedPoiCategory(category)

    try {
      const categoryConfig = POI_CATEGORIES[category]
      if (!categoryConfig) return

      const query = `
        [out:json][timeout:25];
        (
          node["amenity"="${categoryConfig.osmTag}"](around:2000,${trip.latitude},${trip.longitude});
          node["tourism"="${categoryConfig.osmTag}"](around:2000,${trip.latitude},${trip.longitude});
        );
        out body;
      `

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query
      })

      if (!response.ok) throw new Error('POI API failed')

      const data = await response.json()
      setPois(data.elements?.slice(0, 6) || []) // Limit to 6 results
    } catch (error) {
      console.error('Error fetching POIs:', error)
      setPois([])
    } finally {
      setLoadingPois(false)
    }
  }

  // Get weather icon based on code
  const getWeatherIcon = (code) => {
    const weatherType = WEATHER_CODES[code] || 'cloudy'
    return weatherIcons[weatherType] || FiCloud
  }

  // Get simple weather description
  const getWeatherDescription = (code) => {
    const weatherType = WEATHER_CODES[code] || 'cloudy'
    const descriptions = {
      sunny: t('travel.explore.weather.sunny', 'Sunny'),
      cloudy: t('travel.explore.weather.cloudy', 'Cloudy'),
      rainy: t('travel.explore.weather.rainy', 'Rainy'),
      snowy: t('travel.explore.weather.snowy', 'Snowy')
    }
    return descriptions[weatherType] || t('travel.explore.weather.cloudy', 'Cloudy')
  }

  // Format day name
  const formatDayName = (dateStr, index) => {
    if (index === 0) return t('travel.explore.today', 'Today')
    if (index === 1) return t('travel.explore.tomorrow', 'Tomorrow')

    const date = new Date(dateStr)
    return date.toLocaleDateString(undefined, { weekday: 'short' })
  }

  // Calculate distance
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Open a saved place directly in Google Maps. Prefer coordinates when
  // available and gracefully fall back to a text search with name/address.
  const openSavedPlaceInMaps = (poi) => {
    if (!poi) return

    const hasCoords =
      poi.latitude != null &&
      poi.longitude != null

    const url = hasCoords
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${poi.latitude},${poi.longitude}`
      )}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        [poi.name, poi.address].filter(Boolean).join(' ')
      )}`

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (!trip) {
    return (
      <motion.div
        className="explore-page empty-state calm-empty"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
      >
        <FiMapPin size={40} />
        <h3>{t('travel.explore.noTrip', 'No Trip Selected')}</h3>
        <p>{t('travel.explore.createTripFirst', 'Create a trip to explore your destination')}</p>
      </motion.div>
    )
  }

  if (!trip.latitude || !trip.longitude) {
    return (
      <motion.div
        className="explore-page empty-state calm-empty"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
      >
        <FiMapPin size={40} />
        <h3>{t('travel.explore.noLocation', 'Location Not Set')}</h3>
        <p>{t('travel.explore.setLocation', 'Set your destination to see weather and places')}</p>
      </motion.div>
    )
  }

  // Lazy-load the explore view until the first weather payload arrives,
  // so the hero card doesn't pop in half-baked after a trip switch.
  if (trip && loadingWeather && !weather && !weatherError) {
    return (
      <div className="travel-page-loading">
        <div className="travel-glass-card travel-page-loading-card">
          <FiLoader size={22} className="travel-spinner travel-page-loading-icon" />
          <p className="travel-page-loading-text">
            {t('travel.common.loadingTripView', 'Loading your trip view...')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="explore-page calm-explore"
      initial="hidden"
      animate="visible"
      variants={fadeIn}
    >

      {/* Country advisory strip – calm, contextual risk snapshot */}
      {advisory && (
        <section className="explore-section advisory-section">
          <TravelAdvisoryCard advisory={advisory} advisories={advisories} />
        </section>
      )}

      {/* Weather Section - Today's weather prominent, forecast expandable */}
      <section className="explore-section weather-section">
        {loadingWeather ? (
          <div className="loading-state calm-loading">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <FiRefreshCw size={20} />
            </motion.div>
          </div>
        ) : weatherError ? (
          <div className="error-state calm-error">
            <FiCloud size={24} />
            <span>{weatherError}</span>
          </div>
        ) : weather ? (
          <>
            {/* Today's weather - main focus */}
            <div className="today-weather">
              {(() => {
                const WeatherIcon = getWeatherIcon(weather.daily.weathercode[0])
                const tempMax = Math.round(weather.daily.temperature_2m_max[0])
                const tempMin = Math.round(weather.daily.temperature_2m_min[0])

                return (
                  <>
                    <div className="today-weather-main">
                      <WeatherIcon size={48} className="today-icon" />
                      <div className="today-temp">
                        <span className="temp-high">{tempMax}°</span>
                        <span className="temp-low">{tempMin}°</span>
                      </div>
                    </div>
                    <div className="today-desc">
                      {getWeatherDescription(weather.daily.weathercode[0])}
                    </div>
                    <div className="today-location">
                      <FiMapPin size={12} />
                      {trip.destination}
                    </div>
                  </>
                )
              })()}
            </div>

            {/* Expandable forecast */}
            <button
              className="forecast-toggle"
              onClick={() => setShowFullForecast(!showFullForecast)}
            >
              <span>{showFullForecast
                ? t('travel.explore.hideForecast', 'Hide forecast')
                : t('travel.explore.showForecast', 'See 7-day forecast')
              }</span>
              {showFullForecast ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
            </button>

            <AnimatePresence>
              {showFullForecast && (
                <motion.div
                  className="forecast-expanded"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {weather.daily?.time?.slice(1).map((date, index) => {
                    const WeatherIcon = getWeatherIcon(weather.daily.weathercode[index + 1])
                    const tempMax = Math.round(weather.daily.temperature_2m_max[index + 1])
                    const tempMin = Math.round(weather.daily.temperature_2m_min[index + 1])

                    return (
                      <div key={date} className="forecast-day">
                        <span className="day-name">{formatDayName(date, index + 1)}</span>
                        <WeatherIcon size={18} />
                        <span className="forecast-temps">
                          <span className="temp-high">{tempMax}°</span>
                          <span className="temp-low">{tempMin}°</span>
                        </span>
                      </div>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : null}
      </section>

      {/* Travel Essentials - Emergency & Lingo */}
      {
        trip?.destination && (
          <section className="explore-section essentials-section">
            <div className="section-header">
              <h3>{t('travel.explore.essentials', 'Travel Essentials')}</h3>
            </div>
            <div className="essentials-grid">
              <EmergencyCard data={getDestinationInfo(trip.destination)} />
              <PhrasebookCard data={getDestinationInfo(trip.destination)} />
            </div>
          </section>
        )
      }

      {/* POI Section - On-demand, not overwhelming */}
      <section className="explore-section poi-section">
        {!showPOISearch ? (
          <button
            className="poi-search-trigger"
            onClick={() => setShowPOISearch(true)}
          >
            <FiSearch size={20} />
            <span>{t('travel.explore.findPlaces', 'Find nearby places')}</span>
          </button>
        ) : (
          <>
            {/* Saved Places snapshot – calm row of favourite pins from Discovery Mode */}
            {savedPlaces.length > 0 && (
              <div className="saved-places-explore">
                <div className="saved-places-explore-header">
                  <h3 className="saved-places-explore-title">
                    {t('travel.explore.savedPlacesTitle', 'Saved places nearby')}
                  </h3>
                  <div className="saved-places-explore-header-right">
                    <span className="saved-places-explore-count">
                      {t(
                        'travel.explore.savedPlacesCount',
                        '{{count}} pinned',
                        { count: savedPlaces.length }
                      )}
                    </span>
                    {canEnterDiscoveryMode && (
                      <button
                        type="button"
                        className="saved-places-explore-view-all-btn"
                        onClick={enterDiscoveryMode}
                      >
                        {t('travel.common.viewAll', 'View all')}
                      </button>
                    )}
                  </div>
                </div>
                <div className="saved-places-explore-list">
                  {savedPlaces.map((poi) => (
                    <div
                      key={poi.id || poi.poiId}
                      className="saved-place-explore-pill"
                    >
                      <div className="saved-place-explore-main">
                        <span className="saved-place-explore-name">
                          {poi.name}
                        </span>
                        {poi.address && (
                          <span className="saved-place-explore-address">
                            {poi.address}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="saved-place-explore-map-btn"
                        onClick={() => openSavedPlaceInMaps(poi)}
                        aria-label={t(
                          'travel.discovery.seeDetails',
                          'See details in Google Maps'
                        )}
                        title={t(
                          'travel.discovery.seeDetails',
                          'See details in Google Maps'
                        )}
                      >
                        <FiExternalLink size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="poi-header">
              <h3>
                {t(
                  'travel.explore.placesForTripTitle',
                  'Places for this trip'
                )}
              </h3>
            </div>

            {/* Simple category buttons */}
            <div className="poi-categories calm-categories">
              {Object.entries(POI_CATEGORIES).slice(0, 4).map(([key, category]) => {
                const Icon = poiIcons[key] || FiMapPin
                return (
                  <button
                    key={key}
                    className={`poi-category-btn ${selectedPoiCategory === key ? 'active' : ''}`}
                    onClick={() => fetchPois(key)}
                  >
                    <Icon size={20} />
                    <span>{t(category.label)}</span>
                  </button>
                )
              })}
            </div>

            {/* POI Results */}
            <AnimatePresence mode="wait">
              {loadingPois ? (
                <motion.div
                  key="loading"
                  className="loading-state calm-loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <FiRefreshCw size={20} />
                  </motion.div>
                </motion.div>
              ) : pois.length > 0 ? (
                <motion.div
                  key="results"
                  className="poi-list calm-list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {pois.map((poi) => {
                    const distance = calculateDistance(
                      trip.latitude,
                      trip.longitude,
                      poi.lat,
                      poi.lon
                    )

                    return (
                      <a
                        key={poi.id}
                        href={`https://www.google.com/maps/search/?api=1&query=${poi.lat},${poi.lon}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="poi-card calm-card"
                      >
                        <div className="poi-info">
                          <span className="poi-name">{poi.tags?.name || t('travel.explore.unnamed', 'Unnamed')}</span>
                          <span className="poi-distance">
                            {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
                          </span>
                        </div>
                        <FiExternalLink size={14} className="poi-link-icon" />
                      </a>
                    )
                  })}
                </motion.div>
              ) : selectedPoiCategory ? (
                <motion.div
                  key="empty"
                  className="empty-pois calm-empty-small"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <p>{t('travel.explore.noPois', 'No places found nearby')}</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </>
        )}
      </section>
    </motion.div >
  )
})

ExplorePage.displayName = 'ExplorePage'

export default ExplorePage
