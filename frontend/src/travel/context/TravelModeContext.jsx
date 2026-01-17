import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import db from '../services/travelDb'
import { tripService, processSyncQueue } from '../services/travelApi'
import { sessionManager } from '../../services/sessionManager'

const TravelModeContext = createContext()

/**
 * Travel Mode Provider
 * Manages global travel mode state, active trip, discovery mode, and online/offline status
 */
export const TravelModeProvider = ({ children }) => {
  // Initialize travel mode from localStorage
  const [isTravelMode, setIsTravelMode] = useState(() => {
    return localStorage.getItem('travelMode') === 'true'
  })

  // Active trip state
  const [activeTrip, setActiveTrip] = useState(null)
  const [tripLoading, setTripLoading] = useState(true)

  // Trips list state
  const [trips, setTrips] = useState([])
  const [tripsLoading, setTripsLoading] = useState(false)

  // Online/offline status
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  // Sync status: 'idle' | 'syncing' | 'error'
  const [syncStatus, setSyncStatus] = useState('idle')

  // Transition animation state
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionDirection, setTransitionDirection] = useState('takeoff') // 'takeoff' | 'landing'
  const [pendingTrip, setPendingTrip] = useState(null)

  // Discovery Mode state
  const [isDiscoveryMode, setIsDiscoveryMode] = useState(() => {
    return localStorage.getItem('discoveryMode') === 'true'
  })
  const [selectedPOI, setSelectedPOI] = useState(null)
  const [mapViewState, setMapViewState] = useState(null)

  // Scroll positions preservation for Discovery Mode
  const scrollPositionsRef = useRef({})
  
  // Track previous session state to detect login
  const previousSessionRef = useRef(null)

  // Persist travel mode state to localStorage
  useEffect(() => {
    localStorage.setItem('travelMode', isTravelMode)
  }, [isTravelMode])

  // Reset travel mode to false when user logs in
  useEffect(() => {
    const handleAuthChange = () => {
      // Small delay to ensure sessionStorage is written
      setTimeout(() => {
        const token = sessionManager.getToken()
        const user = sessionManager.getCurrentUser()
        const hasSession = !!(token && user)
        const hadSession = previousSessionRef.current

        // If transitioning from no session to session (login), reset travel mode
        if (!hadSession && hasSession && isTravelMode) {
          setIsTravelMode(false)
          setIsDiscoveryMode(false)
        }

        // Update previous session state
        previousSessionRef.current = hasSession
      }, 100)
    }

    // Check initial session state
    const token = sessionManager.getToken()
    const user = sessionManager.getCurrentUser()
    previousSessionRef.current = !!(token && user)

    // Listen for auth changes (login/logout)
    window.addEventListener('auth-storage-change', handleAuthChange)

    return () => {
      window.removeEventListener('auth-storage-change', handleAuthChange)
    }
  }, [isTravelMode])

  // Persist discovery mode state to localStorage
  useEffect(() => {
    localStorage.setItem('discoveryMode', isDiscoveryMode)
  }, [isDiscoveryMode])

  /**
   * Load all trips for the current user
   * Fetches from API (online) or IndexedDB (offline)
   */
  const loadTrips = useCallback(async () => {
    setTripsLoading(true)
    try {
      if (navigator.onLine) {
        try {
          const allTrips = await tripService.getAll()
          if (Array.isArray(allTrips)) {
            setTrips(allTrips)
            return
          }
        } catch (apiError) {
          console.warn('Could not fetch trips from API, trying IndexedDB:', apiError)
        }
      }

      // Fallback to IndexedDB (offline mode or API failed)
      const cachedTrips = await db.trips.toArray()
      setTrips(cachedTrips || [])
    } catch (error) {
      console.error('Error loading trips:', error)
      setTrips([])
    } finally {
      setTripsLoading(false)
    }
  }, [])

  // Load active trip from API (online) or IndexedDB (offline) on mount
  useEffect(() => {
    const loadActiveTrip = async () => {
      try {
        // Load trips list first and get the result
        let allTrips = []
        if (navigator.onLine) {
          try {
            allTrips = await tripService.getAll()
            if (Array.isArray(allTrips)) {
              setTrips(allTrips)
            }
          } catch (apiError) {
            console.warn('Could not fetch trips from API, trying IndexedDB:', apiError)
            allTrips = await db.trips.toArray()
            setTrips(allTrips || [])
          }
        } else {
          allTrips = await db.trips.toArray()
          setTrips(allTrips || [])
        }

        const storedTripId = localStorage.getItem('activeTripId')
        if (storedTripId) {
          // Try to fetch from API first (if online)
          if (navigator.onLine) {
            try {
              const trip = await tripService.getById(storedTripId)
              if (trip) {
                setActiveTrip(trip)
                return
              }
            } catch (apiError) {
              console.warn('Could not fetch trip from API, trying IndexedDB:', apiError)
            }
          }

          // Fallback to IndexedDB (offline mode or API failed)
          // IndexedDB uses auto-increment integers, API uses GUIDs
          const numericId = parseInt(storedTripId)
          const trip = await db.trips.get(isNaN(numericId) ? storedTripId : numericId)
          if (trip) {
            setActiveTrip(trip)
          } else {
            // Trip was deleted, clear stored ID
            localStorage.removeItem('activeTripId')
            // Try to set most recent trip as active from trips list
            if (allTrips && allTrips.length > 0) {
              const latestTrip = allTrips[0]
              setActiveTrip(latestTrip)
              localStorage.setItem('activeTripId', latestTrip.id)
            }
          }
        } else {
          // No stored trip ID, use trips list to set most recent as active
          if (allTrips && allTrips.length > 0) {
            // Set the most recent trip as active (API returns ordered by StartDate desc)
            const latestTrip = allTrips[0]
            setActiveTrip(latestTrip)
            localStorage.setItem('activeTripId', latestTrip.id)
          }
        }
      } catch (error) {
        console.error('Error loading active trip:', error)
      } finally {
        setTripLoading(false)
      }
    }

    if (isTravelMode) {
      loadActiveTrip()
      // Also ensure trips list is loaded
      loadTrips()
    }
  }, [isTravelMode, loadTrips])

  // Online/offline event listeners with sync
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true)
      // Trigger sync when coming back online
      setSyncStatus('syncing')
      try {
        // Process any pending offline operations
        await processSyncQueue()
        // Refresh active trip data from server
        if (activeTrip?.id) {
          try {
            const refreshedTrip = await tripService.getById(activeTrip.id)
            if (refreshedTrip) {
              setActiveTrip(refreshedTrip)
            }
          } catch (err) {
            console.error('Error refreshing trip on reconnect:', err)
          }
        }
        // Refresh trips list
        await loadTrips()
        setSyncStatus('idle')
      } catch (error) {
        console.error('Sync error:', error)
        setSyncStatus('error')
        // Reset to idle after showing error briefly
        setTimeout(() => setSyncStatus('idle'), 3000)
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      setSyncStatus('idle')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [activeTrip?.id])

  /**
   * Complete the transition animation and apply mode change
   */
  const completeTransition = useCallback(() => {
    setIsTransitioning(false)

    if (transitionDirection === 'takeoff') {
      // Complete entering travel mode
      setIsTravelMode(true)
      if (pendingTrip) {
        setActiveTrip(pendingTrip)
        localStorage.setItem('activeTripId', pendingTrip.id)
        setPendingTrip(null)
      }
    } else {
      // Complete exiting travel mode
      setIsTravelMode(false)
    }
  }, [transitionDirection, pendingTrip])

  /**
   * Enter travel mode with animation
   * @param {Object|null} trip - Optional trip to set as active
   */
  const enterTravelMode = useCallback((trip = null) => {
    if (isTransitioning) return

    setTransitionDirection('takeoff')
    setPendingTrip(trip)
    setIsTransitioning(true)
    // Mode change happens in completeTransition after animation
  }, [isTransitioning])

  /**
   * Exit travel mode with animation
   */
  const exitTravelMode = useCallback(() => {
    if (isTransitioning) return

    setTransitionDirection('landing')
    setIsTransitioning(true)
    // Mode change happens in completeTransition after animation
  }, [isTransitioning])

  /**
   * Select a trip as the active trip
   * @param {Object} trip - Trip to set as active
   */
  const selectTrip = useCallback((trip) => {
    if (!trip) return
    setActiveTrip(trip)
    if (trip?.id) {
      localStorage.setItem('activeTripId', trip.id)
      // Refresh trips list to ensure it's up to date (don't await to avoid blocking)
      loadTrips().catch(err => console.error('Error refreshing trips after selection:', err))
    }
  }, [loadTrips])

  /**
   * Clear the active trip
   */
  const clearActiveTrip = useCallback(() => {
    setActiveTrip(null)
    localStorage.removeItem('activeTripId')
  }, [])

  /**
   * Refresh the active trip from database
   */
  const refreshActiveTrip = useCallback(async () => {
    if (!activeTrip?.id) return

    try {
      const trip = await db.trips.get(activeTrip.id)
      if (trip) {
        setActiveTrip(trip)
      } else {
        // Trip was deleted
        clearActiveTrip()
      }
    } catch (error) {
      console.error('Error refreshing active trip:', error)
    }
  }, [activeTrip?.id, clearActiveTrip])

  /**
   * Enter Discovery Mode
   * Preserves scroll positions and activates interactive map
   */
  const enterDiscoveryMode = useCallback(() => {
    // Preserve scroll positions before entering
    scrollPositionsRef.current = {
      main: document.querySelector('.travel-main')?.scrollTop || 0,
      content: document.querySelector('.travel-content')?.scrollTop || 0,
      window: window.scrollY
    }

    // Initialize map view state from active trip coordinates
    if (activeTrip?.latitude && activeTrip?.longitude) {
      setMapViewState({
        latitude: activeTrip.latitude,
        longitude: activeTrip.longitude,
        zoom: 13,
        pitch: 0,
        bearing: 0
      })
    }

    setIsDiscoveryMode(true)
  }, [activeTrip?.latitude, activeTrip?.longitude])

  /**
   * Exit Discovery Mode
   * Restores scroll positions and returns to standard UI
   */
  const exitDiscoveryMode = useCallback(() => {
    setIsDiscoveryMode(false)
    setSelectedPOI(null)

    // Restore scroll positions after a brief delay for DOM to update
    requestAnimationFrame(() => {
      const positions = scrollPositionsRef.current
      const mainEl = document.querySelector('.travel-main')
      const contentEl = document.querySelector('.travel-content')

      if (mainEl && positions.main) {
        mainEl.scrollTop = positions.main
      }
      if (contentEl && positions.content) {
        contentEl.scrollTop = positions.content
      }
      if (positions.window) {
        window.scrollTo(0, positions.window)
      }
    })
  }, [])

  /**
   * Select a POI to show in detail sheet
   */
  const selectPOI = useCallback((poi) => {
    setSelectedPOI(poi)
  }, [])

  /**
   * Clear selected POI
   */
  const clearSelectedPOI = useCallback(() => {
    setSelectedPOI(null)
  }, [])

  /**
   * Update map view state (from map interactions)
   */
  const updateMapViewState = useCallback((viewState) => {
    setMapViewState(viewState)
  }, [])

  const value = {
    // Travel mode state
    isTravelMode,
    enterTravelMode,
    exitTravelMode,

    // Transition animation
    isTransitioning,
    transitionDirection,
    completeTransition,

    // Active trip
    activeTrip,
    tripLoading,
    selectTrip,
    clearActiveTrip,
    refreshActiveTrip,

    // Trips list
    trips,
    tripsLoading,
    loadTrips,

    // Discovery mode
    isDiscoveryMode,
    enterDiscoveryMode,
    exitDiscoveryMode,
    selectedPOI,
    selectPOI,
    clearSelectedPOI,
    mapViewState,
    updateMapViewState,

    // Online status
    isOnline,

    // Sync status
    syncStatus,
    setSyncStatus
  }

  return (
    <TravelModeContext.Provider value={value}>
      {children}
    </TravelModeContext.Provider>
  )
}

/**
 * Hook to access travel mode context
 * @returns {Object} Travel mode context value
 */
export const useTravelMode = () => {
  const context = useContext(TravelModeContext)
  if (!context) {
    throw new Error('useTravelMode must be used within a TravelModeProvider')
  }
  return context
}

export default TravelModeContext
