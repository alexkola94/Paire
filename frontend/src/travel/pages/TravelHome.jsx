import React, { useState, useEffect, useCallback, useRef } from 'react'
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
  FiLoader,
  FiExternalLink,
  FiSettings
} from 'react-icons/fi'
import { useTravelMode } from '../context/TravelModeContext'
import useDiscoveryMode from '../hooks/useDiscoveryMode'
import useScrollOnExpand from '../hooks/useScrollOnExpand'
import { travelExpenseService, packingService, itineraryService, tripCityService, tripService, savedPlaceService } from '../services/travelApi'
import { getCached, setCached } from '../services/travelDb'
import db from '../services/travelDb'
import { getRouteDirections } from '../services/discoveryService'
import { getAdvisoryForTrip, getAdvisories } from '../services/travelAdvisoryService'
import TravelAdvisoryCard from '../components/TravelAdvisoryCard'
import { formatDate, formatDateRange as formatDateRangeUtil } from '../utils/dateFormatter'
import TripSetupWizard from '../components/TripSetupWizard'
import MultiCityTripWizard from '../components/MultiCityTripWizard'
import TripMicrography from '../components/TripMicrography'
import LayoutSettingsModal from '../components/LayoutSettingsModal'
import ConfirmationModal from '../../components/ConfirmationModal'
import { useTripLayout } from '../hooks/useTripLayout'
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
const TravelHome = ({ trip, onNavigate, isLayoutSettingsOpen, setIsLayoutSettingsOpen }) => {
  const { t, i18n } = useTranslation()
  const { selectTrip, loadTrips, setBackgroundMapCities, refreshKey } = useTravelMode()
  const { enterDiscoveryMode, canEnterDiscoveryMode } = useDiscoveryMode()
  const [showSetup, setShowSetup] = useState(false)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  // Simple chooser so user can pick between single-destination and multi‑city
  // before we open any heavy wizard UI.
  const [showCreateTypePicker, setShowCreateTypePicker] = useState(false)
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
  const [homeLocation, setHomeLocation] = useState(null)
  const [homeToFirstDistance, setHomeToFirstDistance] = useState(0)
  const [lastToHomeDistance, setLastToHomeDistance] = useState(0)
  const [currentCityIndex, setCurrentCityIndex] = useState(-1)
  const [nextCityIndex, setNextCityIndex] = useState(-1)
  const [advisory, setAdvisory] = useState(null)
  const [advisories, setAdvisories] = useState([])
  const [isTripDeleted, setIsTripDeleted] = useState(false)
  const [savedPlaces, setSavedPlaces] = useState([])
  const [isExpanded, setIsExpanded] = useState(false);

  // Ref for auto-scrolling saved places when expanded
  const savedPlacesRef = useRef(null)
  useScrollOnExpand(isExpanded, savedPlacesRef)

  // Effective trip used by this page.
  // When the last trip is deleted we locally treat it as null so the UI
  // can immediately fall back to the calm empty state, even if parent
  // props/context update slightly later.
  const activeTrip = isTripDeleted ? null : trip

  // Layout customization hook - manages section visibility and ordering
  const {
    sections: layoutSections,
    preset: layoutPreset,
    presets: layoutPresets,
    isSaving: isLayoutSaving,
    hasChanges: hasLayoutChanges,
    saveLayout,
    applyPreset,
    toggleSection,
    reorderSections,
    updateColumnOrder,
    resetToDefaults,
    isSectionVisible
  } = useTripLayout(activeTrip?.id)

  // Listen for create trip event from TripSelector
  useEffect(() => {
    const handleCreateTrip = () => {
      setIsCreatingNew(true)
      // For any global "create trip" action (e.g. from TripSelector),
      // always start with the lightweight type picker so the user can
      // choose between a single‑destination or multi‑city flow.
      setShowCreateTypePicker(true)
      setShowSetup(false)
      setShowMultiCityWizard(false)
    }

    window.addEventListener('travel:create-trip', handleCreateTrip)
    return () => {
      window.removeEventListener('travel:create-trip', handleCreateTrip)
    }
  }, [])

  // Central handler for the main "create trip" button.
  // We first show a lightweight picker so the user can decide
  // between a simple trip and a multi‑city route.
  const handleOpenCreateTrip = useCallback(() => {
    setIsCreatingNew(true)
    setShowCreateTypePicker(true)
  }, [])

  // Get user's current location (Home) once – this is optional but lets us
  // include the legs from home → first city and last city → home in the
  // overall distance summary.
  useEffect(() => {
    if (!('geolocation' in navigator)) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setHomeLocation({ latitude, longitude })
      },
      (error) => {
        // Fail silently – if location is blocked, we simply don't add home legs.
        console.warn('Geolocation unavailable for TravelHome distance summary:', error)
      }
    )
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
      if (!activeTrip?.id) {
        setIsMultiCity(false)
        setTripCities([])
        return
      }

      // Check tripType or cities count
      let cities = []
      if (activeTrip.tripType === 'multi-city') {
        setIsMultiCity(true)
        try {
          cities = await tripCityService.getByTrip(activeTrip.id)
          setTripCities(cities || [])
        } catch (error) {
          console.error('Error loading cities:', error)
          setTripCities([])
        }
      } else {
        // Fallback: check if trip has multiple cities
        try {
          cities = await tripCityService.getByTrip(activeTrip.id)
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
  }, [activeTrip?.id, activeTrip?.tripType])

  // Calculate route distances for multi-city trips.
  // NOTE:
  // - `routeDistances` keeps only city-to-city legs (used for future UI),
  // - `totalDistance` includes:
  //     home → first city (if homeLocation known)
  //     + all city-to-city legs
  //     + last city → home (if homeLocation known)
  useEffect(() => {
    if (!isMultiCity || tripCities.length < 2) {
      setRouteDistances({})
      setTotalDistance(0)
      setHomeToFirstDistance(0)
      setLastToHomeDistance(0)
      return
    }

    let cancelled = false

    const computeDistances = async () => {
      try {
        const ordered = [...tripCities].sort((a, b) => (a.order || a.orderIndex || 0) - (b.order || b.orderIndex || 0))
        const distances = {}
        let total = 0
        let homeToFirst = 0
        let lastToHome = 0

        const tasks = []

        // 1) City-to-city legs
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

        // 2) Optional home legs: home → first city and last city → home
        if (
          homeLocation &&
          homeLocation.latitude != null &&
          homeLocation.longitude != null &&
          ordered.length > 0
        ) {
          const firstCity = ordered[0]
          const lastCity = ordered[ordered.length - 1]

          const hasFirstCoords =
            firstCity?.latitude != null &&
            firstCity?.longitude != null
          const hasLastCoords =
            lastCity?.latitude != null &&
            lastCity?.longitude != null

          const addLegTask = (fromLat, fromLng, toLat, toLng) =>
            getRouteDirections(fromLat, fromLng, toLat, toLng, 'driving')
              .then(result => {
                if (!cancelled && result?.distanceKm != null) {
                  // These home legs are only reflected in the total distance.
                  total += result.distanceKm
                  return result.distanceKm
                }
                return 0
              })
              .catch(err => {
                console.error('Error computing home leg distance:', err)
                return 0
              })

          // Home → first city
          if (hasFirstCoords) {
            tasks.push(
              addLegTask(
                homeLocation.latitude,
                homeLocation.longitude,
                firstCity.latitude,
                firstCity.longitude
              ).then(km => {
                if (!cancelled && km > 0) {
                  homeToFirst = km
                }
              })
            )
          }

          // Last city → home
          if (hasLastCoords) {
            tasks.push(
              addLegTask(
                lastCity.latitude,
                lastCity.longitude,
                homeLocation.latitude,
                homeLocation.longitude
              ).then(km => {
                if (!cancelled && km > 0) {
                  lastToHome = km
                }
              })
            )
          }
        }

        await Promise.all(tasks)

        if (!cancelled) {
          setRouteDistances(distances)
          setTotalDistance(total)
          setHomeToFirstDistance(homeToFirst)
          setLastToHomeDistance(lastToHome)
        }
      } catch (error) {
        console.error('Error calculating route distances:', error)
      }
    }

    computeDistances()

    return () => {
      cancelled = true
    }
  }, [isMultiCity, tripCities, homeLocation])

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
      // If there is no active trip (e.g. after deleting the last one),
      // clear summary state and fall back to the calm empty view.
      if (!activeTrip?.id || isTripDeleted) {
        setLoading(false)
        setAdvisory(null)
        setAdvisories([])
        setBudgetSummary(null)
        setPackingProgress(null)
        setUpcomingCount(0)
        setSavedPlaces([])
        return
      }

      const cacheKey = `trip-summary-${activeTrip.id}`

      try {
        // Try to get cached data first
        const cachedData = await getCached(cacheKey)

        if (cachedData) {
          // Use cached data
          setBudgetSummary(cachedData.budgetSummary)
          setPackingProgress(cachedData.packingProgress)
          setUpcomingCount(cachedData.upcomingCount)
          // Advisory is handled by a dedicated effect now so it can support
          // multi‑country trips without blocking the main summary view.
          setLoading(false)
          return
        }

        // No cache, fetch core summary data first (expenses / packing / events).
        // Travel advisory can be slow and is purely informational, so we load it
        // in a separate async step below to avoid blocking the main view.
        const [expenses, packingItems, events] = await Promise.all([
          travelExpenseService.getSummary(activeTrip.id).catch(() => null),
          packingService.getByTrip(activeTrip.id).catch(() => []),
          itineraryService.getByTrip(activeTrip.id).catch(() => [])
        ])

        setBudgetSummary(expenses)

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
        // Cache the computed summary data (excluding advisory which is loaded
        // via a dedicated, non‑blocking effect to support multi‑country trips).
        await setCached(
          cacheKey,
          {
            budgetSummary: expenses,
            packingProgress: packingProgressData,
            upcomingCount: upcomingCountValue
          },
          5 * 60 * 1000
        ) // 5 minutes TTL
      } catch (error) {
        console.error('Error loading trip data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTripData()
  }, [activeTrip?.id, isTripDeleted, refreshKey])

  // Load travel advisory / advisories in the background.
  // Supports both single‑destination and multi‑city trips.
  useEffect(() => {
    let cancelled = false

    const loadAdvisories = async () => {
      if (!activeTrip?.id || isTripDeleted) {
        setAdvisory(null)
        setAdvisories([])
        return
      }

      try {
        // Multi‑city: derive distinct countries from the trip cities and
        // fetch advisories for each one.
        if (isMultiCity && tripCities.length > 0) {
          const countries = Array.from(
            new Set(
              tripCities
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
        }

        // Fallback: single‑destination advisory based on the trip itself.
        const single = await getAdvisoryForTrip(activeTrip).catch(() => null)
        if (!cancelled) {
          setAdvisory(single || null)
          setAdvisories(single ? [single] : [])
        }
      } catch (error) {
        console.error('Error loading travel advisory for TravelHome:', error)
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
  }, [activeTrip?.id, isTripDeleted, isMultiCity, tripCities, activeTrip])

  // Load saved places (pinned POIs) for the active trip in a lightweight way.
  // We intentionally keep this separate from the main summary effect so that
  // the home view stays responsive even if Dexie is a bit slow on some devices.
  useEffect(() => {
    let cancelled = false

    const loadSavedPlaces = async () => {
      if (!activeTrip?.id || isTripDeleted) {
        setSavedPlaces([])
        return
      }

      try {
        const places = await savedPlaceService.getByTrip(activeTrip.id)
        if (!cancelled) {
          // Limit to a small number for the home sidebar so it stays calm.
          setSavedPlaces((places || []));
        }
      } catch (error) {
        console.error('Error loading saved places for trip:', error)
        if (!cancelled) {
          setSavedPlaces([])
        }
      }
    }

    loadSavedPlaces()

    return () => {
      cancelled = true
    }
  }, [activeTrip?.id, isTripDeleted])

  // Listen for events when items are added to invalidate cache
  useEffect(() => {
    if (!activeTrip?.id || isTripDeleted) return

    const handleItemAdded = async () => {
      // Invalidate cache when items are added
      const cacheKey = `trip-summary-${activeTrip.id}`
      try {
        await db.apiCache.where('key').equals(cacheKey).delete()
      } catch (error) {
        console.error('Error invalidating cache:', error)
      }

      // Reload trip data
      const loadTripData = async () => {
        try {
          const [expenses, packingItems, events] = await Promise.all([
            travelExpenseService.getSummary(activeTrip.id).catch(() => null),
            packingService.getByTrip(activeTrip.id).catch(() => []),
            itineraryService.getByTrip(activeTrip.id).catch(() => [])
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
          const cacheKey = `trip-summary-${activeTrip.id}`
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
  }, [activeTrip?.id, isTripDeleted])

  // Helper: Get ordered cities
  const getOrderedCities = useCallback(() => {
    if (!tripCities || tripCities.length === 0) return []
    return [...tripCities].sort((a, b) => (a.order || a.orderIndex || 0) - (b.order || b.orderIndex || 0))
  }, [tripCities])

  /**
   * TodayStrip
   * Small, always-visible strip directly under the countdown that surfaces
   * the most important trip stats for “right now”. This is tuned for mobile
   * first so users can see health of packing / budget / today’s plan at a glance.
   */
  const TodayStrip = ({
    countdownSnapshot,
    packingProgressSnapshot,
    upcomingCountSnapshot,
    budgetSummarySnapshot,
    activeTripSnapshot,
    onNavigateSnapshot
  }) => {
    if (!activeTripSnapshot) return null

    const chips = []
    const isActiveTrip = countdownSnapshot?.type === 'active'

    // For active trips, emphasise “today / next up” first so travellers
    // can quickly jump into today’s plan from the hero area.
    if (isActiveTrip) {
      if (upcomingCountSnapshot > 0) {
        chips.push({
          key: 'events',
          icon: <FiCalendar size={14} />,
          label: t('travel.home.upcomingEvents', 'Upcoming'),
          value: `${upcomingCountSnapshot} ${t('travel.home.eventsPlanned', 'events')}`,
          onClick: () => onNavigateSnapshot('itinerary')
        })
      }

      if (budgetSummarySnapshot && activeTripSnapshot?.budget) {
        const usedPercent = Math.round((budgetSummarySnapshot.total / activeTripSnapshot.budget) * 100)
        chips.push({
          key: 'budget',
          icon: <FiDollarSign size={14} />,
          label: t('travel.home.budgetUsed', 'Budget Used'),
          value: `${Math.min(usedPercent, 999)}%`,
          onClick: () => onNavigateSnapshot('budget')
        })
      }

      if (packingProgressSnapshot) {
        chips.push({
          key: 'packing',
          icon: <FiCheckSquare size={14} />,
          label: t('travel.home.packing', 'Packing'),
          value: `${packingProgressSnapshot.percentage}%`,
          onClick: () => onNavigateSnapshot('packing')
        })
      }
    } else {
      // During planning, invite the user to get ready (packing / budget)
      // before deep discovery content.
      if (packingProgressSnapshot) {
        chips.push({
          key: 'packing',
          icon: <FiCheckSquare size={14} />,
          label: t('travel.home.packing', 'Packing'),
          value: `${packingProgressSnapshot.percentage}%`,
          onClick: () => onNavigateSnapshot('packing')
        })
      }

      if (budgetSummarySnapshot && activeTripSnapshot?.budget) {
        const usedPercent = Math.round((budgetSummarySnapshot.total / activeTripSnapshot.budget) * 100)
        chips.push({
          key: 'budget',
          icon: <FiDollarSign size={14} />,
          label: t('travel.home.budgetUsed', 'Budget Used'),
          value: `${Math.min(usedPercent, 999)}%`,
          onClick: () => onNavigateSnapshot('budget')
        })
      }

      if (upcomingCountSnapshot > 0) {
        chips.push({
          key: 'events',
          icon: <FiCalendar size={14} />,
          label: t('travel.home.upcomingEvents', 'Upcoming'),
          value: `${upcomingCountSnapshot} ${t('travel.home.eventsPlanned', 'events')}`,
          onClick: () => onNavigateSnapshot('itinerary')
        })
      }
    }

    if (chips.length === 0) return null

    return (
      <div
        className="today-strip"
        aria-label={t('travel.home.quickStats', 'Quick Stats')}
      >
        {chips.map(chip => (
          <button
            key={chip.key}
            type="button"
            className="today-strip-chip"
            onClick={chip.onClick}
          >
            <span className="today-strip-chip-icon">
              {chip.icon}
            </span>
            <span className="today-strip-chip-text">
              <span className="today-strip-chip-label">{chip.label}</span>
              <span className="today-strip-chip-value">{chip.value}</span>
            </span>
          </button>
        ))}
      </div>
    )
  }

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
    if (!activeTrip?.startDate) return null

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
      const start = new Date(activeTrip.startDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(activeTrip.endDate)
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
    const start = new Date(activeTrip.startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(activeTrip.endDate)
    end.setHours(0, 0, 0, 0)

    if (now < start) {
      const days = Math.ceil((start - now) / (1000 * 60 * 60 * 24))
      return { type: 'countdown', days, label: t('travel.home.daysToGo', '{{days}} days to go', { days }) }
    } else if (now <= end) {
      const days = Math.ceil((end - now) / (1000 * 60 * 60 * 24)) + 1
      return { type: 'active', days, label: t('travel.home.daysRemaining', '{{days}} days remaining', { days }) }
    }
    return { type: 'completed', days: 0, label: t('travel.home.tripCompleted', 'Trip completed') }
  }, [activeTrip, isMultiCity, tripCities, getCityInfo, t])

  const countdown = getDaysCountdown()

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Open a saved place directly in Google Maps. We prefer precise
  // coordinates when available, and gracefully fall back to a text
  // search using name + address.
  const handleOpenSavedPlaceInMaps = useCallback((poi) => {
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
  }, [])

  // Open Google Maps directions with full trip route:
  // Home (if known) → all cities in order → Home (loop).
  const handleOpenGoogleDirections = useCallback(() => {
    if (!homeLocation || !tripCities || tripCities.length === 0) return

    const ordered = getOrderedCities().filter(
      c => c.latitude != null && c.longitude != null
    )
    if (ordered.length === 0) return

    const origin = `${homeLocation.latitude},${homeLocation.longitude}`
    const destination = `${homeLocation.latitude},${homeLocation.longitude}`
    const waypoints = ordered
      .map(city => `${city.latitude},${city.longitude}`)
      .join('|')

    const baseUrl = 'https://www.google.com/maps/dir/?api=1'
    const params = [
      `origin=${encodeURIComponent(origin)}`,
      `destination=${encodeURIComponent(destination)}`,
      waypoints ? `waypoints=${encodeURIComponent(waypoints)}` : '',
      'travelmode=driving'
    ]
      .filter(Boolean)
      .join('&')

    const url = `${baseUrl}&${params}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [homeLocation, tripCities, getOrderedCities])

  // Open Google Maps directions for an individual leg related to a city card.
  // Simple rule:
  // - First city: Home → First city (if home is known)
  // - Other cities: Previous city → This city
  const handleOpenLegDirections = useCallback(
    (cityIndex) => {
      if (!tripCities || tripCities.length === 0) return

      const ordered = getOrderedCities().filter(
        c => c.latitude != null && c.longitude != null
      )
      if (ordered.length === 0 || !ordered[cityIndex]) return

      let originLat = null
      let originLng = null
      let destLat = null
      let destLng = null

      if (cityIndex === 0) {
        // Home → First city (only if home location is available)
        if (!homeLocation || homeLocation.latitude == null || homeLocation.longitude == null) {
          return
        }
        originLat = homeLocation.latitude
        originLng = homeLocation.longitude
        destLat = ordered[0].latitude
        destLng = ordered[0].longitude
      } else {
        const prev = ordered[cityIndex - 1]
        const current = ordered[cityIndex]
        if (
          !prev ||
          prev.latitude == null ||
          prev.longitude == null ||
          current.latitude == null ||
          current.longitude == null
        ) {
          return
        }
        originLat = prev.latitude
        originLng = prev.longitude
        destLat = current.latitude
        destLng = current.longitude
      }

      const origin = `${originLat},${originLng}`
      const destination = `${destLat},${destLng}`

      const baseUrl = 'https://www.google.com/maps/dir/?api=1'
      const params = [
        `origin=${encodeURIComponent(origin)}`,
        `destination=${encodeURIComponent(destination)}`,
        'travelmode=driving'
      ].join('&')

      const url = `${baseUrl}&${params}`
      window.open(url, '_blank', 'noopener,noreferrer')
    },
    [tripCities, homeLocation, getOrderedCities]
  )

  const handleDeleteCurrentTrip = useCallback(async () => {
    if (!activeTrip?.id) return

    try {
      // Check if trip exists in IndexedDB (might be IndexedDB-only)
      const localTrip = await db.trips.get(activeTrip.id)

      // Delete current trip (handles both API and IndexedDB)
      await tripService.delete(activeTrip.id)

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
        // No trips left – reset view back to calm "no trip" state.
        selectTrip(null)
        setIsMultiCity(false)
        setTripCities([])
        setRouteDistances({})
        setTotalDistance(0)
        setHomeToFirstDistance(0)
        setLastToHomeDistance(0)
        setCurrentCityIndex(-1)
        setNextCityIndex(-1)
        setAdvisory(null)
        setLoading(false)
        // Mark that the last trip is gone so this page falls back to the
        // "Where to next?" empty state straight away.
        setIsTripDeleted(true)
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
            // No trips left – hard reset local state so UI falls back to
            // the empty "Where to next?" home prompt.
            selectTrip(null)
            setIsMultiCity(false)
            setTripCities([])
            setRouteDistances({})
            setTotalDistance(0)
            setHomeToFirstDistance(0)
            setLastToHomeDistance(0)
            setCurrentCityIndex(-1)
            setNextCityIndex(-1)
            setAdvisory(null)
            setLoading(false)
            setIsTripDeleted(true)
          }
        }
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError)
      }
      setShowDeleteConfirm(false)
    }
  }, [activeTrip?.id, loadTrips, selectTrip])

  // Handle trip creation or update
  const handleTripCreated = async (createdTrip) => {
    setShowSetup(false)
    setIsCreatingNew(false)
    // A new or updated trip means we are no longer in the "deleted" state.
    setIsTripDeleted(false)

    // Refresh trips list to include the new or updated trip
    await loadTrips()

    // If this is an update of the currently active trip, refresh state immediately
    if (activeTrip?.id && createdTrip?.id === activeTrip.id) {
      selectTrip(createdTrip)
      return
    }

    // If there's already a different active trip, ask user if they want to switch
    if (activeTrip?.id) {
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
  if (activeTrip && loading) {
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

  // When the user is in the calm empty state we still want to ask
  // whether they prefer a single‑destination or multi‑city trip
  if (!activeTrip && !loading) {
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
            onClick={handleOpenCreateTrip}
            whileTap={{ scale: 0.98 }}
          >
            <FiPlus size={18} />
            {t('travel.common.createTrip', 'Create Trip')}
          </motion.button>
        </motion.div>

        {/* When the user is in the calm empty state we still want to ask
            whether they prefer a single‑destination or multi‑city trip
            before showing any heavy wizard UI. */}
        <AnimatePresence>
          {showCreateTypePicker && (
            <motion.div
              className="create-trip-type-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              onClick={() => setShowCreateTypePicker(false)}
              aria-modal="true"
              role="dialog"
            >
              <motion.div
                className="create-trip-type-card travel-glass-card"
                initial={{ scale: 0.9, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 12 }}
                transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="create-trip-type-header">
                  <span className="create-trip-type-icon">
                    <FiPlus size={18} />
                  </span>
                  <div className="create-trip-type-text">
                    <h3>
                      {t('travel.home.createTripTypeTitle', 'What kind of trip?')}
                    </h3>
                    <p>
                      {t(
                        'travel.home.createTripTypeDescription',
                        'Choose between a simple destination or a multi-city route.'
                      )}
                    </p>
                  </div>
                </div>
                <div className="create-trip-type-actions">
                  <button
                    type="button"
                    className="create-trip-type-option single"
                    onClick={() => {
                      // Single‑destination flow: open classic TripSetupWizard.
                      setShowCreateTypePicker(false)
                      setShowMultiCityWizard(false)
                      setShowSetup(true)
                    }}
                  >
                    <div className="option-main">
                      <span className="option-icon">
                        <FiHome size={16} />
                      </span>
                      <div className="option-text">
                        <span className="option-title">
                          {t(
                            'travel.home.singleTripLabel',
                            'Single destination'
                          )}
                        </span>
                        <span className="option-subtitle">
                          {t(
                            'travel.home.singleTripSubtitle',
                            'One main place with simple dates.'
                          )}
                        </span>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="create-trip-type-option multi"
                    onClick={() => {
                      // Multi‑city flow: open the dedicated multi‑city wizard.
                      setShowCreateTypePicker(false)
                      setShowSetup(false)
                      setShowMultiCityWizard(true)
                    }}
                  >
                    <div className="option-main">
                      <span className="option-icon">
                        <FiMapPin size={16} />
                      </span>
                      <div className="option-text">
                        <span className="option-title">
                          {t(
                            'travel.home.multiCityTripLabel',
                            'Multi-city route'
                          )}
                        </span>
                        <span className="option-subtitle">
                          {t(
                            'travel.home.multiCityTripSubtitle',
                            'Several cities with a mapped route.'
                          )}
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {showSetup && (
          <TripSetupWizard
            trip={null}
            onClose={() => {
              setShowSetup(false)
              setIsCreatingNew(false)
            }}
            onSave={handleTripCreated}
          />
        )}

        {/* Multi‑city wizard also needs to work from the calm empty state.
            When the user picks "Multi‑city route" we create a fresh trip
            via the dedicated multi‑city flow. */}
        {showMultiCityWizard && (
          <MultiCityTripWizard
            trip={null}
            onClose={() => {
              setShowMultiCityWizard(false)
              setIsCreatingNew(false)
            }}
            onSave={handleTripCreated}
          />
        )}
      </div>
    )
  }

  // Calculate layout sections based on preset
  // ... (rest of logic) ...

  const renderSection = (key) => {
    switch (key) {
      case 'countdown':
        return countdown ? (
          <motion.div
            key="countdown"
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
                {/* High-level route summary: Start -> End */}
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
        ) : null

      case 'destinationSnapshot':
        return !isMultiCity && activeTrip ? (
          <React.Fragment key="destinationSnapshot">
            <motion.div
              className="travel-glass-card single-destination-card"
              variants={cardVariants}
            >
              <div className="single-destination-header">
                <div className="single-destination-icon">
                  <FiMapPin size={18} />
                </div>
                <div className="single-destination-heading">
                  <span className="single-destination-title">
                    {t('travel.home.destinationSnapshotTitle', 'Your destination')}
                  </span>
                  <span className="single-destination-name">
                    {activeTrip.destination || t('travel.home.destinationFallback', 'Trip destination')}
                  </span>
                  {activeTrip.country && (
                    <span className="single-destination-country">{activeTrip.country}</span>
                  )}
                </div>
              </div>

              {(activeTrip.startDate || activeTrip.endDate) && (
                <div className="single-destination-meta">
                  {activeTrip.startDate && activeTrip.endDate && (
                    <span className="single-destination-dates">
                      <FiCalendar size={14} />
                      <span>
                        {formatDateRange(activeTrip.startDate, activeTrip.endDate)}
                      </span>
                    </span>
                  )}
                  {activeTrip.startDate && activeTrip.endDate && (
                    <span className="single-destination-duration">
                      {(() => {
                        const start = new Date(activeTrip.startDate)
                        const end = new Date(activeTrip.endDate)
                        start.setHours(0, 0, 0, 0)
                        end.setHours(0, 0, 0, 0)
                        const days = Math.max(
                          1,
                          Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
                        )
                        return t(
                          'travel.home.tripDuration',
                          '{{days}} days in total',
                          { days }
                        )
                      })()}
                    </span>
                  )}
                </div>
              )}

              <p className="single-destination-base">
                {t(
                  'travel.home.destinationSnapshotBase',
                  'A calm base to organise this trip.'
                )}
              </p>
            </motion.div>

            {/* Today / trip status strip */}
            {countdown && (
              <div className="single-trip-status-strip">
                <span className="single-trip-status-label">
                  {t('travel.home.tripStatusLabel', 'Trip status')}
                </span>
                <span className={`single-trip-status-pill ${countdown.type}`}>
                  {countdown.type === 'active' &&
                    t('travel.home.tripStatusActive', 'On the trip')}
                  {countdown.type === 'countdown' &&
                    t('travel.home.tripStatusPreparing', 'Preparing')}
                  {countdown.type === 'completed' &&
                    t('travel.home.tripStatusCompleted', 'Back home')}
                </span>
                <span className="single-trip-status-detail">
                  {countdown.label}
                </span>
              </div>
            )}

            {/* Quick actions cluster */}
            <div className="single-trip-quick-actions">
              <span className="quick-actions-label">
                {t('travel.home.quickActionsTitle', 'Quick actions')}
              </span>
              <div className="quick-actions-buttons">
                <button
                  type="button"
                  className="quick-action-pill"
                  onClick={() => onNavigate('packing')}
                >
                  <span className="quick-action-icon">
                    <FiCheckSquare size={14} />
                  </span>
                  <span className="quick-action-text">
                    {t('travel.home.quickActionsPacking', 'Packing list')}
                  </span>
                </button>
                <button
                  type="button"
                  className="quick-action-pill"
                  onClick={() => onNavigate('budget')}
                >
                  <span className="quick-action-icon">
                    <FiDollarSign size={14} />
                  </span>
                  <span className="quick-action-text">
                    {t('travel.home.quickActionsBudget', 'Trip budget')}
                  </span>
                </button>
                <button
                  type="button"
                  className="quick-action-pill"
                  onClick={() => onNavigate('itinerary')}
                >
                  <span className="quick-action-icon">
                    <FiMapPin size={14} />
                  </span>
                  <span className="quick-action-text">
                    {t('travel.home.quickActionsItinerary', 'Itinerary')}
                  </span>
                </button>
              </div>
            </div>
          </React.Fragment>
        ) : null

      case 'todayStrip':
        return (
          <TodayStrip
            key="todayStrip"
            countdownSnapshot={countdown}
            packingProgressSnapshot={packingProgress}
            upcomingCountSnapshot={upcomingCount}
            budgetSummarySnapshot={budgetSummary}
            activeTripSnapshot={activeTrip}
            onNavigateSnapshot={onNavigate}
          />
        )

      case 'tripMicrography':
        return (isMultiCity && activeTrip) ? (
          <motion.div key="tripMicrography" variants={cardVariants}>
            <TripMicrography trip={activeTrip} onNavigate={onNavigate} />
          </motion.div>
        ) : null

      case 'encouragement':
        return (
          <motion.p key="encouragement" className="encouragement" variants={cardVariants}>
            {countdown?.type === 'countdown' && t('travel.home.encourageCountdown', 'Take your time preparing. You\'ve got this.')}
            {countdown?.type === 'active' && t('travel.home.encourageActive', 'Enjoy every moment of your journey.')}
            {countdown?.type === 'completed' && t('travel.home.encourageCompleted', 'Hope you had a wonderful trip!')}
          </motion.p>
        )

      case 'advisory':
        return advisory ? (
          <motion.div key="advisory" className="travel-home-sidebar-advisory" variants={cardVariants}>
            <TravelAdvisoryCard
              advisory={advisory}
              advisories={advisories}
              compact={false}
            />
          </motion.div>
        ) : null

      case 'routeSummary':
        return (isMultiCity && tripCities.length > 0) ? (
          <motion.div key="routeSummary" className="travel-glass-card route-summary-card" variants={cardVariants}>
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
              {activeTrip?.startDate && activeTrip?.endDate && (
                <div className="route-stat">
                  <FiCalendar size={16} />
                  <span className="stat-value">
                    {Math.ceil((new Date(activeTrip.endDate) - new Date(activeTrip.startDate)) / (1000 * 60 * 60 * 24)) + 1}
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
        ) : null

      case 'cityTimeline':
        return (isMultiCity && tripCities.length > 0) ? (
          <motion.div key="cityTimeline" className="travel-glass-card city-timeline-card" variants={cardVariants}>
            <div className="city-timeline-header">
              <h3 className="timeline-title">{t('travel.home.tripRoute', 'Trip Route')}</h3>
              {homeLocation && homeLocation.latitude != null && homeLocation.longitude != null && (
                <button
                  type="button"
                  className="trip-route-directions-btn"
                  onClick={handleOpenGoogleDirections}
                  title={t('travel.home.openDirections', 'Open route in Google Maps')}
                  aria-label={t('travel.home.openDirections', 'Open route in Google Maps')}
                >
                  <FiExternalLink size={14} />
                </button>
              )}
            </div>
            {/* Optional legs from home to first city and last city back home */}
            {(homeToFirstDistance > 0 || lastToHomeDistance > 0) && (
              <div className="home-legs-summary">
                {homeToFirstDistance > 0 && (
                  <div className="home-leg-row">
                    <span className="home-leg-label">
                      {t('travel.home.homeToFirst', 'Home → First city')}
                    </span>
                    <span className="home-leg-distance">
                      {Math.round(homeToFirstDistance).toLocaleString()} km
                    </span>
                  </div>
                )}
                {lastToHomeDistance > 0 && (
                  <div className="home-leg-row">
                    <span className="home-leg-label">
                      {t('travel.home.lastToHome', 'Last city → Home')}
                    </span>
                    <span className="home-leg-distance">
                      {Math.round(lastToHomeDistance).toLocaleString()} km
                    </span>
                  </div>
                )}
              </div>
            )}
            <div className="city-timeline-scroll">
              {getOrderedCities().map((city, index) => {
                const isCurrent = index === currentCityIndex
                const isNext = index === nextCityIndex
                const isPast = currentCityIndex >= 0 && index < currentCityIndex
                const canOpenLeg =
                  (index === 0 && homeLocation && homeLocation.latitude != null && homeLocation.longitude != null) ||
                  (index > 0)

                return (
                  <div
                    key={city.id || `city-${index}`}
                    className={`city-timeline-item ${isCurrent ? 'current' : ''} ${isNext ? 'next' : ''} ${isPast ? 'past' : ''}`}
                  >
                    <div className="city-timeline-number">{index + 1}</div>
                    <div className="city-timeline-content">
                      <div className="city-timeline-main">
                        <div className="city-timeline-text">
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
                        {canOpenLeg && (
                          <button
                            type="button"
                            className="city-timeline-leg-btn"
                            onClick={() => handleOpenLegDirections(index)}
                            title={t('travel.home.openLegDirections', 'Open directions for this segment')}
                            aria-label={t('travel.home.openLegDirections', 'Open directions for this segment')}
                          >
                            <FiNavigation size={12} />
                          </button>
                        )}
                      </div>
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
        ) : null

      case 'savedPlaces':
        return activeTrip?.id ? (
          <motion.div
            key="savedPlaces"
            ref={savedPlacesRef}
            className="travel-glass-card saved-places-card"
            variants={cardVariants}
          >
            <div className="saved-places-header">
              <h3 className="saved-places-title">
                {t('travel.home.savedPlacesTitle', 'Saved places')}
              </h3>
              <div className="saved-places-header-right">
                {savedPlaces.length > 0 && (
                  <span className="saved-places-count">
                    {t('travel.home.savedPlacesCount', '{{count}} saved', {
                      count: savedPlaces.length
                    })}
                  </span>
                )}
                {canEnterDiscoveryMode && (
                  <button
                    type="button"
                    className="saved-places-view-all-btn"
                    onClick={enterDiscoveryMode}
                  >
                    {t('travel.common.viewAll', 'View all')}
                  </button>
                )}
              </div>
            </div>

            {savedPlaces.length === 0 ? (
              <p className="saved-places-empty">
                {t(
                  'travel.home.savedPlacesEmpty',
                  'Pin favourite spots from the map to keep them close.'
                )}
              </p>
            ) : (
              <ul className="saved-places-list">
                {/* Only show first 4 items if not expanded */}
                {(isExpanded ? savedPlaces : savedPlaces.slice(0, 4)).map((poi) => (
                  <li key={poi.id || poi.poiId} className="saved-place-item">
                    <div className="saved-place-main">
                      <span className="saved-place-name">{poi.name}</span>
                      {poi.address && (
                        <span className="saved-place-address">{poi.address}</span>
                      )}
                    </div>
                    <div className="saved-place-meta">
                      {poi.category && (
                        <span className="saved-place-chip">
                          {t(`travel.explore.poi.${poi.category}`, poi.category)}
                        </span>
                      )}
                      <button
                        type="button"
                        className="saved-place-map-btn"
                        onClick={() => handleOpenSavedPlaceInMaps(poi)}
                        aria-label={t('travel.discovery.seeDetails', 'See details in Google Maps')}
                      >
                        <FiExternalLink size={12} />
                      </button>
                    </div>
                  </li>
                ))}

                {/* Show button only if list is longer than 4 */}
                {savedPlaces.length > 4 && (
                  <motion.div layout className="view-all-container">
                    <button
                      type="button"
                      className="view-all-btn"
                      onClick={() => setIsExpanded(!isExpanded)}
                    >
                      {isExpanded
                        ? t('travel.home.showLess', 'Show Less')
                        : t('travel.home.viewAll', `View All (${savedPlaces.length})`)}
                    </button>
                  </motion.div>
                )}
              </ul>
            )}
          </motion.div>
        ) : null

      case 'statusSummary':
        return (
          <motion.div key="statusSummary" className="status-summary" variants={cardVariants}>
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
                {budgetSummary && activeTrip?.budget && (
                  <span className="mini-stat">
                    <FiDollarSign size={14} />
                    {Math.round((budgetSummary.total / activeTrip.budget) * 100)}%
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
                      {budgetSummary && activeTrip?.budget ? (
                        <span className="detail-value">
                          {new Intl.NumberFormat(undefined, {
                            style: 'currency',
                            currency: activeTrip?.budgetCurrency || 'EUR',
                            maximumFractionDigits: 0
                          }).format(activeTrip.budget - budgetSummary.total)} {t('travel.home.remaining', 'remaining')}
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
        )

      default:
        return null
    }
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
            onClick={handleOpenCreateTrip}
            aria-label={t('travel.trips.selector.createNew', 'Create New Trip')}
            title={t('travel.trips.selector.createNew', 'Create New Trip')}
          >
            <FiPlus size={16} />
          </button>
          <button
            className="edit-trip-btn"
            onClick={() => setIsLayoutSettingsOpen(true)}
            aria-label={t('travel.home.customizeLayout', 'Customize Layout')}
            title={t('travel.home.customizeLayout', 'Customize Layout')}
          >
            <FiSettings size={16} />
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
          {activeTrip?.id && (
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

      {/* Compact advisory strip on mobile – keeps safety context close to the
          countdown without overwhelming the hero. The fuller card still lives
          in the sidebar on larger screens. */}
      {advisory && (
        <motion.div
          className="travel-home-top-advisory"
          variants={cardVariants}
        >
          <TravelAdvisoryCard
            advisory={advisory}
            advisories={advisories}
          />
        </motion.div>
      )}

      {/* Main Content Grid - Dynamic based on layout preferences */}
      <div className="travel-home-grid">
        {/* Left Column - Main Focus */}
        <div className="travel-home-main">
          {layoutSections.mainColumn.map(section =>
            section.visible && renderSection(section.key)
          )}
        </div>

        {/* Right Column - Sidebar Content */}
        <div className="travel-home-sidebar">
          {layoutSections.sidebarColumn.map(section =>
            section.visible && renderSection(section.key)
          )}
        </div>
      </div>

      {/* Trip Setup Wizard Modal */}
      {showSetup && !showMultiCityWizard && (
        <TripSetupWizard
          trip={isCreatingNew ? null : activeTrip}
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
          trip={isCreatingNew ? null : activeTrip}
          onClose={() => {
            setShowMultiCityWizard(false)
            setShowSetup(false)
            setIsCreatingNew(false)
          }}
          onSave={handleTripCreated}
        />
      )}

      {/* Create Trip Type Picker - lets user choose between single and multi‑city */}
      <AnimatePresence>
        {showCreateTypePicker && (
          <motion.div
            className="create-trip-type-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            onClick={() => setShowCreateTypePicker(false)}
            aria-modal="true"
            role="dialog"
          >
            <motion.div
              className="create-trip-type-card travel-glass-card"
              initial={{ scale: 0.9, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 12 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="create-trip-type-header">
                <span className="create-trip-type-icon">
                  <FiPlus size={18} />
                </span>
                <div className="create-trip-type-text">
                  <h3>
                    {t('travel.home.createTripTypeTitle', 'What kind of trip?')}
                  </h3>
                  <p>
                    {t(
                      'travel.home.createTripTypeDescription',
                      'Choose between a simple destination or a multi-city route.'
                    )}
                  </p>
                </div>
              </div>
              <div className="create-trip-type-actions">
                <button
                  type="button"
                  className="create-trip-type-option single"
                  onClick={() => {
                    // Single‑destination flow: open classic TripSetupWizard.
                    setShowCreateTypePicker(false)
                    setShowMultiCityWizard(false)
                    setShowSetup(true)
                  }}
                >
                  <div className="option-main">
                    <span className="option-icon">
                      <FiHome size={16} />
                    </span>
                    <div className="option-text">
                      <span className="option-title">
                        {t(
                          'travel.home.singleTripLabel',
                          'Single destination'
                        )}
                      </span>
                      <span className="option-subtitle">
                        {t(
                          'travel.home.singleTripSubtitle',
                          'One main place with simple dates.'
                        )}
                      </span>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  className="create-trip-type-option multi"
                  onClick={() => {
                    // Multi‑city flow: open the dedicated multi‑city wizard.
                    setShowCreateTypePicker(false)
                    setShowSetup(false)
                    setShowMultiCityWizard(true)
                  }}
                >
                  <div className="option-main">
                    <span className="option-icon">
                      <FiMapPin size={16} />
                    </span>
                    <div className="option-text">
                      <span className="option-title">
                        {t(
                          'travel.home.multiCityTripLabel',
                          'Multi-city route'
                        )}
                      </span>
                      <span className="option-subtitle">
                        {t(
                          'travel.home.multiCityTripSubtitle',
                          'Several cities with a mapped route.'
                        )}
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Layout Settings Modal */}
      <LayoutSettingsModal
        isOpen={isLayoutSettingsOpen}
        onClose={() => setIsLayoutSettingsOpen(false)}
        sections={layoutSections}
        preset={layoutPreset}
        presets={layoutPresets}
        isSaving={isLayoutSaving}
        hasChanges={hasLayoutChanges}
        onApplyPreset={applyPreset}
        onToggleSection={toggleSection}
        onReorderSections={reorderSections}
        onUpdateColumnOrder={updateColumnOrder}
        onReset={resetToDefaults}
        onSave={saveLayout}
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
