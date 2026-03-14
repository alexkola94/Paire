import { useCallback, useEffect, useRef } from 'react'
import { useTravelMode } from '../context/TravelModeContext'

/**
 * Hook for Discovery Mode functionality
 * Provides convenient access to discovery state and utilities
 */
const useDiscoveryMode = () => {
  const {
    isDiscoveryMode,
    enterDiscoveryMode,
    exitDiscoveryMode,
    selectedPOI,
    selectPOI,
    clearSelectedPOI,
    mapViewState,
    updateMapViewState,
    activeTrip,
    isOnline
  } = useTravelMode()

  // Track if map is ready for interactions
  const mapReadyRef = useRef(false)

  /**
   * Toggle discovery mode on/off
   */
  const toggleDiscoveryMode = useCallback(() => {
    if (isDiscoveryMode) {
      exitDiscoveryMode()
    } else {
      enterDiscoveryMode()
    }
  }, [isDiscoveryMode, enterDiscoveryMode, exitDiscoveryMode])

  /**
   * Check if discovery mode can be entered
   * Requires active trip with coordinates
   */
  const canEnterDiscoveryMode = Boolean(
    activeTrip?.latitude && activeTrip?.longitude
  )

  /**
   * Center map on active trip location
   */
  const centerOnTrip = useCallback(() => {
    if (activeTrip?.latitude && activeTrip?.longitude) {
      updateMapViewState({
        ...mapViewState,
        latitude: activeTrip.latitude,
        longitude: activeTrip.longitude,
        zoom: 14,
        transitionDuration: 500
      })
    }
  }, [activeTrip, mapViewState, updateMapViewState])

  /**
   * Center map on a specific POI
   */
  const centerOnPOI = useCallback((poi) => {
    if (poi?.latitude && poi?.longitude) {
      updateMapViewState({
        ...mapViewState,
        latitude: poi.latitude,
        longitude: poi.longitude,
        zoom: 16,
        transitionDuration: 500
      })
    }
  }, [mapViewState, updateMapViewState])

  /**
   * Set map ready state
   */
  const setMapReady = useCallback((ready) => {
    mapReadyRef.current = ready
  }, [])

  /**
   * Check if map is ready
   */
  const isMapReady = () => mapReadyRef.current

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }, [])

  /**
   * Get distance from trip center to current map center
   */
  const getDistanceFromTrip = useCallback(() => {
    if (!activeTrip?.latitude || !activeTrip?.longitude || !mapViewState) {
      return null
    }
    return calculateDistance(
      activeTrip.latitude,
      activeTrip.longitude,
      mapViewState.latitude,
      mapViewState.longitude
    )
  }, [activeTrip, mapViewState, calculateDistance])

  /**
   * Format distance for display
   */
  const formatDistance = useCallback((distanceKm) => {
    if (distanceKm === null || distanceKm === undefined) return ''
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m`
    }
    return `${distanceKm.toFixed(1)}km`
  }, [])

  // Clean up when unmounting in discovery mode
  useEffect(() => {
    return () => {
      if (isDiscoveryMode) {
        // Preserve state on unmount but clear POI selection
        clearSelectedPOI()
      }
    }
  }, [isDiscoveryMode, clearSelectedPOI])

  return {
    // State
    isDiscoveryMode,
    selectedPOI,
    mapViewState,
    canEnterDiscoveryMode,
    isOnline,

    // Actions
    enterDiscoveryMode,
    exitDiscoveryMode,
    toggleDiscoveryMode,
    selectPOI,
    clearSelectedPOI,
    updateMapViewState,
    centerOnTrip,
    centerOnPOI,
    setMapReady,
    isMapReady,

    // Utilities
    calculateDistance,
    getDistanceFromTrip,
    formatDistance,

    // Trip data
    activeTrip
  }
}

export default useDiscoveryMode
