import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiPlus,
  FiMapPin,
  FiDollarSign,
  FiCheckSquare,
  FiChevronDown,
  FiChevronUp,
  FiEdit3,
  FiTrash2,
  FiNavigation,
  FiCalendar,
  FiHome,
  FiLoader
} from 'react-icons/fi'
import { useTravelMode } from '../context/TravelModeContext'
import { travelExpenseService, packingService, itineraryService, tripCityService, tripService } from '../services/travelApi'
import { getCached, setCached } from '../services/travelDb'
import db from '../services/travelDb'
import { getRouteDirections } from '../services/discoveryService'
import { getAdvisoryForTrip } from '../services/travelAdvisoryService'
import TravelAdvisoryCard from '../components/TravelAdvisoryCard'
import { formatDate, formatDateRange as formatDateRangeUtil } from '../utils/dateFormatter'
import TripSetupWizard from '../components/TripSetupWizard'
import MultiCityTripWizard from '../components/MultiCityTripWizard'
import TripMicrography from '../components/TripMicrography'
import ConfirmationModal from '../../components/ConfirmationModal'
import '../styles/TravelHome.css'

// Gentle animation variants - slower, smoother for calm feeling
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      staggerChildren: 0.15
    }
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1]
    }
  }
}

/**
 * Travel Home Page - Calm, minimal dashboard
 * Shows just what travelers need: countdown, simple status, and easy navigation
 */
const TravelHome = ({ trip, onNavigate }) => {
  const { t, i18n } = useTranslation()
  const { selectTrip, loadTrips } = useTravelMode()
  const [showSetup, setShowSetup] = useState(false)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [budgetSummary, setBudgetSummary] = useState(null)
  const [packingProgress, setPackingProgress] = useState(null)
  const [upcomingCount, setUpcomingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [newTrip, setNewTrip] = useState(null)
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false)
  const [isMultiCity, setIsMultiCity] = useState(false)
  const [showMultiCityWizard, setShowMultiCityWizard] = useState(false)
  const [tripCities, setTripCities] = useState([])
  const [routeDistances, setRouteDistances] = useState({})
  const [totalDistance, setTotalDistance] = useState(0)
  const [currentCityIndex, setCurrentCityIndex] = useState(-1)
  const [nextCityIndex, setNextCityIndex] = useState(-1)
  const [advisory, setAdvisory] = useState(null)

  // Listen for create trip event from TripSelector
  useEffect(() => {
    const handleCreateTrip = () => {
      setIsCreatingNew(true)
      setShowSetup(true)
    }

    window.addEventListener('travel:create-trip', handleCreateTrip)
    return () => {
      window.removeEventListener('travel:create-trip', handleCreateTrip)
    }
  }, [])

  // Get time-based greeting
  const getGreeting = useCallback(() => {
    const hour = new Date().getHours()
    if (hour < 12) return t('travel.home.greetingMorning', 'Good morning')
    if (hour < 18) return t('travel.home.greetingAfternoon', 'Good afternoon')
    return t('travel.home.greetingEvening', 'Good evening')
  }, [t])

  // Check if trip is multi-city and load cities
  useEffect(() => {
    const checkMultiCity = async () => {
      if (!trip?.id) {
        setIsMultiCity(false)
        setTripCities([])
        return
      }

      // Check tripType or cities count
      let cities = []
      if (trip.tripType === 'multi-city') {
        setIsMultiCity(true)
        try {
          cities = await tripCityService.getByTrip(trip.id)
          setTripCities(cities || [])
        } catch (error) {
          console.error('Error loading cities:', error)
          setTripCities([])
        }
      } else {
        // Fallback: check if trip has multiple cities
        try {
          cities = await tripCityService.getByTrip(trip.id)
          const isMulti = cities && cities.length > 1
          setIsMultiCity(isMulti)
          setTripCities(isMulti ? (cities || []) : [])
        } catch (error) {
          console.error('Error checking cities:', error)
          setIsMultiCity(false)
          setTripCities([])
        }
      }
    }

    checkMultiCity()
  }, [trip?.id, trip?.tripType])

  // Calculate route distances for multi-city trips
  useEffect(() => {
    if (!isMultiCity || tripCities.length < 2) {
      setRouteDistances({})
      setTotalDistance(0)
      return
    }

    let cancelled = false

    const computeDistances = async () => {
      try {
        const ordered = [...tripCities].sort((a, b) => (a.order || a.orderIndex || 0) - (b.order || b.orderIndex || 0))
        const distances = {}
        let total = 0

        const tasks = []
        for (let i = 0; i < ordered.length - 1; i++) {
          const from = ordered[i]
          const to = ordered[i + 1]

          if (
            from.latitude == null ||
            from.longitude == null ||
            to.latitude == null ||
            to.longitude == null
          ) {
            continue
          }

          const key = `${from.id}-${to.id}`
          tasks.push(
            getRouteDirections(from.latitude, from.longitude, to.latitude, to.longitude, 'driving')
              .then(result => {
                if (!cancelled && result?.distanceKm != null) {
                  distances[key] = result.distanceKm
                  total += result.distanceKm
                }
              })
              .catch(err => {
                console.error('Error computing route distance:', err)
              })
          )
        }

        await Promise.all(tasks)

        if (!cancelled) {
          setRouteDistances(distances)
          setTotalDistance(total)
        }
      } catch (error) {
        console.error('Error calculating route distances:', error)
      }
    }

    computeDistances()

    return () => {
      cancelled = true
    }
  }, [isMultiCity, tripCities])

  // Determine current and next city based on dates
  useEffect(() => {
    if (!isMultiCity || tripCities.length === 0) {
      setCurrentCityIndex(-1)
      setNextCityIndex(-1)
      return
    }

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const ordered = [...tripCities].sort((a, b) => (a.order || a.orderIndex || 0) - (b.order || b.orderIndex || 0))

    let currentIdx = -1
    let nextIdx = -1

    for (let i = 0; i < ordered.length; i++) {
      const city = ordered[i]
      if (!city.startDate) continue

      const startDate = new Date(city.startDate)
      startDate.setHours(0, 0, 0, 0)
      const endDate = city.endDate ? new Date(city.endDate) : startDate
      endDate.setHours(23, 59, 59, 999)

      if (now >= startDate && now <= endDate) {
        currentIdx = i
        if (i < ordered.length - 1) {
          nextIdx = i + 1
        }
        break
      } else if (now < startDate) {
        nextIdx = i
        break
      }
    }

    setCurrentCityIndex(currentIdx)
    setNextCityIndex(nextIdx)
  }, [isMultiCity, tripCities])

  // Load minimal trip data - only what's needed for summary
  // Uses caching to avoid API calls on every mount
  useEffect(() => {
    const loadTripData = async () => {
      if (!trip?.id) {
        setLoading(false)
        setAdvisory(null)
        return
      }

      const cacheKey = `trip-summary-${trip.id}`
      
      try {
        // Try to get cached data first
        const cachedData = await getCached(cacheKey)
        
        if (cachedData) {
          // Use cached data
          setBudgetSummary(cachedData.budgetSummary)
          setPackingProgress(cachedData.packingProgress)
          setUpcomingCount(cachedData.upcomingCount)
          setAdvisory(cachedData.advisory || null)
          setLoading(false)
          return
        }

        // No cache, fetch from API
        const [expenses, packingItems, events, tripAdvisory] = await Promise.all([
          travelExpenseService.getSummary(trip.id).catch(() => null),
          packingService.getByTrip(trip.id).catch(() => []),
          itineraryService.getByTrip(trip.id).catch(() => []),
          // Advisory is optional, so handle errors silently.
          getAdvisoryForTrip(trip).catch(() => null)
        ])

        setBudgetSummary(expenses)
        setAdvisory(tripAdvisory || null)

        // Calculate packing progress
        let packingProgressData = null
        if (packingItems.length > 0) {
          const checked = packingItems.filter(item => item.isChecked).length
          packingProgressData = {
            total: packingItems.length,
            checked,
            percentage: Math.round((checked / packingItems.length) * 100)
          }
          setPackingProgress(packingProgressData)
        }

        // Just count upcoming events, don't show details
        const today = new Date().toISOString().split('T')[0]
        const upcoming = events.filter(e => e.date >= today)
        const upcomingCountValue = upcoming.length
        setUpcomingCount(upcomingCountValue)

        // Cache the computed summary data (cache for 5 minutes)
        await setCached(cacheKey, {
          budgetSummary: expenses,
          packingProgress: packingProgressData,
          upcomingCount: upcomingCountValue,
          advisory: tripAdvisory || null
        }, 5 * 60 * 1000) // 5 minutes TTL
      } catch (error) {
        console.error('Error loading trip data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTripData()
  }, [trip?.id])

  // Listen for events when items are added to invalidate cache
  useEffect(() => {
    if (!trip?.id) return

    const handleItemAdded = async () => {
      // Invalidate cache when items are added
      const cacheKey = `trip-summary-${trip.id}`
      try {
        await db.apiCache.where('key').equals(cacheKey).delete()
      } catch (error) {
        console.error('Error invalidating cache:', error)
      }
      
      // Reload trip data
      const loadTripData = async () => {
        try {
          const [expenses, packingItems, events] = await Promise.all([
            travelExpenseService.getSummary(trip.id).catch(() => null),
            packingService.getByTrip(trip.id).catch(() => []),
            itineraryService.getByTrip(trip.id).catch(() => [])
          ])

          setBudgetSummary(expenses)

          if (packingItems.length > 0) {
            const checked = packingItems.filter(item => item.isChecked).length
            setPackingProgress({
              total: packingItems.length,
              checked,
              percentage: Math.round((checked / packingItems.length) * 100)
            })
          } else {
            setPackingProgress(null)
          }

          const today = new Date().toISOString().split('T')[0]
          const upcoming = events.filter(e => e.date >= today)
          setUpcomingCount(upcoming.length)

          // Update cache
          const cacheKey = `trip-summary-${trip.id}`
          await setCached(cacheKey, {
            budgetSummary: expenses,
            packingProgress: packingItems.length > 0 ? {
              total: packingItems.length,
              checked: packingItems.filter(item => item.isChecked).length,
              percentage: Math.round((packingItems.filter(item => item.isChecked).length / packingItems.length) * 100)
            } : null,
            upcomingCount: upcoming.length
          }, 5 * 60 * 1000)
        } catch (error) {
          console.error('Error reloading trip data:', error)
        }
      }
      
      loadTripData()
    }

    // Listen for item added events from other pages
    window.addEventListener('travel:item-added', handleItemAdded)
    window.addEventListener('travel:item-updated', handleItemAdded)
    window.addEventListener('travel:item-deleted', handleItemAdded)

    return () => {
      window.removeEventListener('travel:item-added', handleItemAdded)
      window.removeEventListener('travel:item-updated', handleItemAdded)
      window.removeEventListener('travel:item-deleted', handleItemAdded)
    }
  }, [trip?.id])

  // Helper: Get ordered cities
  const getOrderedCities = useCallback(() => {
    if (!tripCities || tripCities.length === 0) return []
    return [...tripCities].sort((a, b) => (a.order || a.orderIndex || 0) - (b.order || b.orderIndex || 0))
  }, [tripCities])

  // Helper: Format date range using locale-aware formatting
  const formatDateRange = useCallback((startDate, endDate) => {
    return formatDateRangeUtil(startDate, endDate, i18n.language)
  }, [i18n.language])

  // Helper: Get current/next city info for multi-city trips
  const getCityInfo = useCallback(() => {
    if (!isMultiCity || tripCities.length === 0) return null

    const ordered = getOrderedCities()
    const currentCity = currentCityIndex >= 0 ? ordered[currentCityIndex] : null
    const nextCity = nextCityIndex >= 0 ? ordered[nextCityIndex] : null

    return { currentCity, nextCity, currentIndex: currentCityIndex, nextIndex: nextCityIndex, total: ordered.length }
  }, [isMultiCity, tripCities, currentCityIndex, nextCityIndex, getOrderedCities])

  // Calculate days countdown
  const getDaysCountdown = useCallback(() => {
    if (!trip?.startDate) return null

    // For multi-city trips, use current/next city dates
    if (isMultiCity && tripCities.length > 0) {
      const cityInfo = getCityInfo()
      const now = new Date()
      now.setHours(0, 0, 0, 0)

      if (cityInfo?.currentCity) {
        // Currently in a city - show days remaining in this city
        const endDate = cityInfo.currentCity.endDate || cityInfo.currentCity.startDate
        const end = new Date(endDate)
        end.setHours(0, 0, 0, 0)
        
        if (now <= end) {
          const days = Math.ceil((end - now) / (1000 * 60 * 60 * 24)) + 1
          return {
            type: 'active',
            days,
            label: t('travel.home.daysRemaining', '{{days}} days remaining', { days }),
            cityInfo: cityInfo.currentCity,
            cityLabel: t('travel.home.inCity', 'in {{city}}', { city: cityInfo.currentCity.name })
          }
        }
      }

      if (cityInfo?.nextCity) {
        // Next city - show countdown to next city
        const startDate = cityInfo.nextCity.startDate
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        
        if (now < start) {
          const days = Math.ceil((start - now) / (1000 * 60 * 60 * 24))
          return {
            type: 'countdown',
            days,
            label: t('travel.home.daysToGo', '{{days}} days to go', { days }),
            cityInfo: cityInfo.nextCity,
            cityLabel: t('travel.home.nextCity', 'Next: {{city}}', { city: cityInfo.nextCity.name })
          }
        }
      }

      // Fallback to trip dates
      const start = new Date(trip.startDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(trip.endDate)
      end.setHours(0, 0, 0, 0)

      if (now < start) {
        const days = Math.ceil((start - now) / (1000 * 60 * 60 * 24))
        return { type: 'countdown', days, label: t('travel.home.daysToGo', '{{days}} days to go', { days }) }
      } else if (now <= end) {
        const days = Math.ceil((end - now) / (1000 * 60 * 60 * 24)) + 1
        return { type: 'active', days, label: t('travel.home.daysRemaining', '{{days}} days remaining', { days }) }
      }
      return { type: 'completed', days: 0, label: t('travel.home.tripCompleted', 'Trip completed') }
    }

    // Single city trip
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const start = new Date(trip.startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(trip.endDate)
    end.setHours(0, 0, 0, 0)

    if (now < start) {
      const days = Math.ceil((start - now) / (1000 * 60 * 60 * 24))
      return { type: 'countdown', days, label: t('travel.home.daysToGo', '{{days}} days to go', { days }) }
    } else if (now <= end) {
      const days = Math.ceil((end - now) / (1000 * 60 * 60 * 24)) + 1
      return { type: 'active', days, label: t('travel.home.daysRemaining', '{{days}} days remaining', { days }) }
    }
    return { type: 'completed', days: 0, label: t('travel.home.tripCompleted', 'Trip completed') }
  }, [trip, isMultiCity, tripCities, getCityInfo, t])

  const countdown = getDaysCountdown()

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDeleteCurrentTrip = useCallback(async () => {
    if (!trip?.id) return

    try {
      // Check if trip exists in IndexedDB (might be IndexedDB-only)
      const localTrip = await db.trips.get(trip.id)
      
      // Delete current trip (handles both API and IndexedDB)
      await tripService.delete(trip.id)

      // Reload trips list to refresh state
      await loadTrips()

      // Pick another trip if any exists (most recent)
      // Check both IndexedDB and wait a moment for state to update
      const remainingTrips = await db.trips.toArray()
      if (remainingTrips && remainingTrips.length > 0) {
        // Sort by updatedAt descending to get most recent
        const sorted = remainingTrips.sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.createdAt || 0)
          const dateB = new Date(b.updatedAt || b.createdAt || 0)
          return dateB - dateA
        })
        const nextTrip = sorted[0]
        selectTrip(nextTrip)
      } else {
        // No trips left
        selectTrip(null)
      }

      setShowDeleteConfirm(false)
    } catch (error) {
      console.error('Error deleting current trip:', error)
      // Even if there's an error, try to clean up IndexedDB if trip exists locally
      try {
        const localTrip = await db.trips.get(trip.id)
        if (localTrip) {
          // Force delete from IndexedDB
          await db.trips.delete(trip.id)
          await db.itineraryEvents.where('tripId').equals(trip.id).delete()
          await db.packingItems.where('tripId').equals(trip.id).delete()
          await db.documents.where('tripId').equals(trip.id).delete()
          await db.travelExpenses.where('tripId').equals(trip.id).delete()
          await db.tripCities.where('tripId').equals(trip.id).delete()
          
          // Reload and select next trip
          await loadTrips()
          const remainingTrips = await db.trips.toArray()
          if (remainingTrips && remainingTrips.length > 0) {
            const sorted = remainingTrips.sort((a, b) => {
              const dateA = new Date(a.updatedAt || a.createdAt || 0)
              const dateB = new Date(b.updatedAt || b.createdAt || 0)
              return dateB - dateA
            })
            selectTrip(sorted[0])
          } else {
            selectTrip(null)
          }
        }
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError)
      }
      setShowDeleteConfirm(false)
    }
  }, [trip?.id, loadTrips, selectTrip])

  // Handle trip creation or update
  const handleTripCreated = async (createdTrip) => {
    setShowSetup(false)
    setIsCreatingNew(false)
    
    // Refresh trips list to include the new or updated trip
    await loadTrips()

    // If this is an update of the currently active trip, refresh state immediately
    if (trip?.id && createdTrip?.id === trip.id) {
      selectTrip(createdTrip)
      return
    }
    
    // If there's already a different active trip, ask user if they want to switch
    if (trip?.id) {
      setNewTrip(createdTrip)
      setShowSwitchConfirm(true)
    } else {
      // No active trip, automatically switch to the new one
      selectTrip(createdTrip)
    }
  }

  // Handle switch confirmation
  const handleSwitchToNewTrip = useCallback(() => {
    if (newTrip) {
      selectTrip(newTrip)
    }
    setNewTrip(null)
    setShowSwitchConfirm(false)
  }, [newTrip, selectTrip])

  // Handle keep current trip
  const handleKeepCurrentTrip = useCallback(() => {
    // Ensure we keep the current trip active and refresh trips list
    setNewTrip(null)
    setShowSwitchConfirm(false)
    // Refresh trips list to ensure it includes the new trip
    loadTrips().catch(err => console.error('Error refreshing trips:', err))
  }, [loadTrips])

  // When a trip is selected and summary data is still loading,
  // show a calm loading card instead of partially rendered content.
  if (trip && loading) {
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

  // If no trip, show a calming create trip prompt
  if (!trip && !loading) {
    return (
      <div className="travel-home no-trip">
        <motion.div
          className="no-trip-content"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div className="no-trip-icon">
            <FiMapPin size={40} />
          </div>
          <h2>{t('travel.home.noTripTitle', 'Where to next?')}</h2>
          <p>{t('travel.home.noTripDescription', 'Start planning your journey')}</p>
          <motion.button
            className="travel-btn calm-btn"
            onClick={() => {
              setIsCreatingNew(true)
              setShowSetup(true)
            }}
            whileTap={{ scale: 0.98 }}
          >
            <FiPlus size={18} />
            {t('travel.common.createTrip', 'Create Trip')}
          </motion.button>
        </motion.div>

        {showSetup && (
          <TripSetupWizard
            onClose={() => setShowSetup(false)}
            onSave={handleTripCreated}
          />
        )}
      </div>
    )
  }

  return (
    <motion.div
      className="travel-home"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Greeting - calm, personal touch */}
      <motion.div className="greeting-section" variants={cardVariants}>
        <span className="greeting-text">{getGreeting()}</span>
        <div className="greeting-actions">
          <button
            className="create-trip-btn"
            onClick={() => {
              setIsCreatingNew(true)
              setShowSetup(true)
            }}
            aria-label={t('travel.trips.selector.createNew', 'Create New Trip')}
            title={t('travel.trips.selector.createNew', 'Create New Trip')}
          >
            <FiPlus size={16} />
          </button>
          <button
            className="create-trip-btn"
            onClick={() => {
              setIsCreatingNew(true)
              setShowMultiCityWizard(true)
            }}
            aria-label={t('travel.multiCity.createTrip', 'Create Multi-City Trip')}
            title={t('travel.multiCity.createTrip', 'Create Multi-City Trip')}
            style={{ marginLeft: '4px' }}
          >
            <FiMapPin size={16} />
          </button>
          <button
            className="edit-trip-btn"
            onClick={() => {
              // Edit behaviour depends on trip type:
              // - Single-destination trips use the classic TripSetupWizard.
              // - Multi-city trips open the MultiCityTripWizard with existing cities preloaded.
              setIsCreatingNew(false)
              if (isMultiCity) {
                setShowMultiCityWizard(true)
                setShowSetup(false)
              } else {
                setShowSetup(true)
                setShowMultiCityWizard(false)
              }
            }}
            aria-label={t('travel.home.editTrip', 'Edit Trip')}
            title={t('travel.home.editTrip', 'Edit Trip')}
          >
            <FiEdit3 size={16} />
          </button>
          {trip?.id && (
            <button
              className="edit-trip-btn delete-trip-btn"
              onClick={() => setShowDeleteConfirm(true)}
              aria-label={t('travel.home.deleteTrip', 'Delete Trip')}
              title={t('travel.home.deleteTrip', 'Delete Trip')}
            >
              <FiTrash2 size={16} />
            </button>
          )}
        </div>
      </motion.div>

      {/* Main Content Grid - Better use of horizontal space */}
      <div className="travel-home-grid">
        {/* Left Column - Main Focus: Countdown */}
        <div className="travel-home-main">
          {/* Main Focus: Countdown - simple, centered */}
          {countdown && (
            <motion.div
              className="travel-glass-card countdown-card calm-card"
              variants={cardVariants}
            >
              <div className={`countdown-content ${countdown.type}`}>
                {countdown.type !== 'completed' && (
                  <div className="countdown-number">{countdown.days}</div>
                )}
                <div className="countdown-label">{countdown.label}</div>
              </div>
              {/* Multi-city: Show current/next city info */}
              {isMultiCity && countdown.cityInfo && (
                <div className="countdown-destination multi-city-info">
                  <FiMapPin size={14} />
                  <span className="city-name">{countdown.cityInfo.name}</span>
                  {countdown.cityInfo.country && (
                    <span className="city-country">, {countdown.cityInfo.country}</span>
                  )}
                  {countdown.cityLabel && (
                    <span className="city-label">{countdown.cityLabel}</span>
                  )}
                  {countdown.cityInfo.startDate && (
                    <div className="city-dates">
                      <FiCalendar size={12} />
                      <span>{formatDateRange(countdown.cityInfo.startDate, countdown.cityInfo.endDate)}</span>
                    </div>
                  )}
                  {/* High-level route summary: Start → End */}
                  {tripCities.length > 1 && (() => {
                    const ordered = getOrderedCities()
                    const startCity = ordered[0]
                    const endCity = ordered[ordered.length - 1]
                    if (!startCity || !endCity) return null
                    return (
                      <div className="city-route-summary">
                        <span className="route-label">
                          {t('travel.home.routeLabel', 'Route')}
                        </span>
                        <span className="route-value">
                          {startCity.name} <span className="route-arrow">→</span> {endCity.name}
                        </span>
                      </div>
                    )
                  })()}
                </div>
              )}
              {/* Single city: Show destination */}
              {trip?.destination && !isMultiCity && (
                <div className="countdown-destination">
                  <FiMapPin size={14} />
                  <span>{trip.destination}</span>
                </div>
              )}
              {/* Multi-city progress indicator */}
              {isMultiCity && getCityInfo() && (
                <div className="city-progress-indicator">
                  <span className="progress-text">
                    {t('travel.home.cityProgress', 'City {{current}} of {{total}}', {
                      current: getCityInfo().currentIndex >= 0 ? getCityInfo().currentIndex + 1 : (getCityInfo().nextIndex >= 0 ? getCityInfo().nextIndex : 1),
                      total: getCityInfo().total
                    })}
                  </span>
                </div>
              )}
            </motion.div>
          )}

          {/* Multi-City Trip Micrography - Below countdown on left */}
          {isMultiCity && trip && (
            <motion.div variants={cardVariants}>
              <TripMicrography trip={trip} onNavigate={onNavigate} />
            </motion.div>
          )}

          {/* Encouraging message - changes based on trip status */}
          <motion.p className="encouragement" variants={cardVariants}>
            {countdown?.type === 'countdown' && t('travel.home.encourageCountdown', 'Take your time preparing. You\'ve got this.')}
            {countdown?.type === 'active' && t('travel.home.encourageActive', 'Enjoy every moment of your journey.')}
            {countdown?.type === 'completed' && t('travel.home.encourageCompleted', 'Hope you had a wonderful trip!')}
          </motion.p>
        </div>

        {/* Right Column - Sidebar Content */}
        <div className="travel-home-sidebar">
          {/* Country Advisory Card - gentle safety context */}
          {advisory && (
            <motion.div variants={cardVariants}>
              <TravelAdvisoryCard advisory={advisory} compact={false} />
            </motion.div>
          )}

          {/* Route Summary Card for Multi-City Trips */}
          {isMultiCity && tripCities.length > 0 && (
            <motion.div
              className="travel-glass-card route-summary-card"
              variants={cardVariants}
            >
              <div className="route-summary-content">
                <div className="route-stat">
                  <FiMapPin size={16} />
                  <span className="stat-value">{tripCities.length}</span>
                  <span className="stat-label">{t('travel.home.cities', 'cities')}</span>
                </div>
                {totalDistance > 0 && (
                  <div className="route-stat">
                    <FiNavigation size={16} />
                    <span className="stat-value">{Math.round(totalDistance)}</span>
                    <span className="stat-label">km</span>
                  </div>
                )}
                {trip?.startDate && trip?.endDate && (
                  <div className="route-stat">
                    <FiCalendar size={16} />
                    <span className="stat-value">
                      {Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24)) + 1}
                    </span>
                    <span className="stat-label">{t('travel.home.days', 'days')}</span>
                  </div>
                )}
              </div>

              {/* Compact strip: From [Start] to [End] */}
              {tripCities.length > 1 && (() => {
                const ordered = getOrderedCities()
                const startCity = ordered[0]
                const endCity = ordered[ordered.length - 1]
                if (!startCity || !endCity) return null
                return (
                  <div className="route-summary-strip">
                    <span className="strip-label">
                      {t('travel.home.routeShort', 'From')}
                    </span>
                    <span className="strip-value">
                      {startCity.name}
                    </span>
                    <span className="strip-arrow">→</span>
                    <span className="strip-value">
                      {endCity.name}
                    </span>
                    <span className="strip-meta">
                      · {tripCities.length} {t('travel.home.cities', 'cities')}
                      {totalDistance > 0 && (
                        <> · {Math.round(totalDistance).toLocaleString()} km</>
                      )}
                    </span>
                  </div>
                )
              })()}
            </motion.div>
          )}

          {/* City Timeline Preview for Multi-City Trips */}
          {isMultiCity && tripCities.length > 0 && (
            <motion.div
              className="travel-glass-card city-timeline-card"
              variants={cardVariants}
            >
              <div className="city-timeline-header">
                <h3 className="timeline-title">{t('travel.home.tripRoute', 'Trip Route')}</h3>
              </div>
              <div className="city-timeline-scroll">
                {getOrderedCities().map((city, index) => {
                  const isCurrent = index === currentCityIndex
                  const isNext = index === nextCityIndex
                  const isPast = currentCityIndex >= 0 && index < currentCityIndex
                  
                  return (
                    <div
                      key={city.id || `city-${index}`}
                      className={`city-timeline-item ${isCurrent ? 'current' : ''} ${isNext ? 'next' : ''} ${isPast ? 'past' : ''}`}
                    >
                      <div className="city-timeline-number">{index + 1}</div>
                      <div className="city-timeline-content">
                        <div className="city-timeline-name">{city.name}</div>
                        {city.country && (
                          <div className="city-timeline-country">{city.country}</div>
                        )}
                        {city.startDate && (
                          <div className="city-timeline-dates">
                            {formatDateRange(city.startDate, city.endDate)}
                          </div>
                        )}
                      </div>
                      {isCurrent && (
                        <div className="city-timeline-badge current-badge">
                          {t('travel.home.current', 'Current')}
                        </div>
                      )}
                      {isNext && !isCurrent && (
                        <div className="city-timeline-badge next-badge">
                          {t('travel.home.next', 'Next')}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Simple Status Summary - collapsed by default */}
          <motion.div className="status-summary" variants={cardVariants}>
            <button
              className="status-toggle"
              onClick={() => setShowDetails(!showDetails)}
              aria-expanded={showDetails}
            >
              <span className="status-mini">
                {packingProgress && (
                  <span className="mini-stat">
                    <FiCheckSquare size={14} />
                    {packingProgress.percentage}%
                  </span>
                )}
                {upcomingCount > 0 && (
                  <span className="mini-stat">
                    {upcomingCount} {t('travel.home.eventsPlanned', 'events')}
                  </span>
                )}
                {budgetSummary && trip?.budget && (
                  <span className="mini-stat">
                    <FiDollarSign size={14} />
                    {Math.round((budgetSummary.total / trip.budget) * 100)}%
                  </span>
                )}
              </span>
              {showDetails ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
            </button>

            {/* Expandable details */}
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  className="status-details"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  {/* Packing */}
                  <button
                    className="status-detail-card"
                    onClick={() => onNavigate('packing')}
                  >
                    <div className="detail-icon packing">
                      <FiCheckSquare size={20} />
                    </div>
                    <div className="detail-content">
                      <span className="detail-label">{t('travel.home.packing', 'Packing')}</span>
                      {packingProgress ? (
                        <span className="detail-value">
                          {packingProgress.checked}/{packingProgress.total} {t('travel.home.itemsPacked', 'packed')}
                        </span>
                      ) : (
                        <span className="detail-value">{t('travel.home.startPacking', 'Start your list')}</span>
                      )}
                    </div>
                    {packingProgress && (
                      <div className="detail-progress">
                        <div
                          className="progress-fill"
                          style={{ width: `${packingProgress.percentage}%` }}
                        />
                      </div>
                    )}
                  </button>

                  {/* Budget */}
                  <button
                    className="status-detail-card"
                    onClick={() => onNavigate('budget')}
                  >
                    <div className="detail-icon budget">
                      <FiDollarSign size={20} />
                    </div>
                    <div className="detail-content">
                      <span className="detail-label">{t('travel.home.budget', 'Budget')}</span>
                      {budgetSummary && trip?.budget ? (
                        <span className="detail-value">
                          {new Intl.NumberFormat(undefined, {
                            style: 'currency',
                            currency: trip?.budgetCurrency || 'EUR',
                            maximumFractionDigits: 0
                          }).format(trip.budget - budgetSummary.total)} {t('travel.home.remaining', 'remaining')}
                        </span>
                      ) : (
                        <span className="detail-value">{t('travel.home.setBudget', 'Set your budget')}</span>
                      )}
                    </div>
                  </button>

                  {/* Itinerary */}
                  <button
                    className="status-detail-card"
                    onClick={() => onNavigate('itinerary')}
                  >
                    <div className="detail-icon itinerary">
                      <FiMapPin size={20} />
                    </div>
                    <div className="detail-content">
                      <span className="detail-label">{t('travel.home.itinerary', 'Itinerary')}</span>
                      {upcomingCount > 0 ? (
                        <span className="detail-value">
                          {upcomingCount} {t('travel.home.eventsPlanned', 'events planned')}
                        </span>
                      ) : (
                        <span className="detail-value">{t('travel.home.planActivities', 'Plan your activities')}</span>
                      )}
                    </div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Trip Setup Wizard Modal */}
      {showSetup && !showMultiCityWizard && (
        <TripSetupWizard
          trip={isCreatingNew ? null : trip}
          onClose={() => {
            setShowSetup(false)
            setIsCreatingNew(false)
          }}
          onSave={handleTripCreated}
        />
      )}

      {/* Multi-City Trip Wizard Modal */}
      {showMultiCityWizard && (
        <MultiCityTripWizard
          trip={isCreatingNew ? null : trip}
          onClose={() => {
            setShowMultiCityWizard(false)
            setShowSetup(false)
            setIsCreatingNew(false)
          }}
          onSave={handleTripCreated}
        />
      )}

      {/* Switch Trip Confirmation Modal */}
      <ConfirmationModal
        isOpen={showSwitchConfirm}
        onClose={handleKeepCurrentTrip}
        onConfirm={handleSwitchToNewTrip}
        title={t('travel.trips.switchConfirm.title', 'Trip Created')}
        message={t('travel.trips.switchConfirm.message', 'Switch to this trip now?')}
        confirmText={t('travel.trips.switchConfirm.switch', 'Switch')}
        cancelText={t('travel.trips.switchConfirm.keepCurrent', 'Keep Current')}
        variant="default"
      />

      {/* Delete Trip Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteCurrentTrip}
        title={t('travel.home.deleteTripTitle', 'Delete this trip?')}
        message={t(
          'travel.home.deleteTripMessage',
          'This will permanently delete this trip and all related data.'
        )}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
        variant="danger"
      />
    </motion.div>
  )
}

export default TravelHome
