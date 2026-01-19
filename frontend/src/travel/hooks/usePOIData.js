import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTravelMode } from '../context/TravelModeContext'
import {
  fetchPOIsByCategory,
  fetchPOIsMultipleCategories,
  searchPOIs,
  calculateDistance,
  getZoomBasedSettings
} from '../services/discoveryService'
import { getPinnedPOIs, addPinnedPOI, removePinnedPOI, isPOIPinned } from '../services/travelDb'
import { DISCOVERY_POI_CATEGORIES } from '../utils/travelConstants'

/**
 * Hook for managing POI data in Discovery Mode
 * Handles fetching, caching, filtering, and pinning POIs
 */
const usePOIData = () => {
  const { activeTrip, mapViewState, isOnline } = useTravelMode()

  // POI data state
  const [pois, setPois] = useState([])
  const [pinnedPOIs, setPinnedPOIs] = useState([])
  const [searchResults, setSearchResults] = useState([])

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeCategories, setActiveCategories] = useState([])
  const [searchQuery, setSearchQuery] = useState('')

  // Load pinned POIs on mount and trip change
  useEffect(() => {
    const loadPinnedPOIs = async () => {
      if (!activeTrip?.id) return

      try {
        const pinned = await getPinnedPOIs(activeTrip.id)
        setPinnedPOIs(pinned)
      } catch (err) {
        console.error('Error loading pinned POIs:', err)
      }
    }

    loadPinnedPOIs()
  }, [activeTrip?.id])

  /**
   * Fetch POIs for selected categories
   * Uses current map view center (like Google Maps), not fixed trip location
   * Applies zoom-based filtering: zoomed out = fewer best results, zoomed in = more results
   */
  const fetchPOIs = useCallback(async (categories = activeCategories) => {
    // Use map view center if available, otherwise fall back to trip location
    const lat = mapViewState?.latitude || activeTrip?.latitude
    const lon = mapViewState?.longitude || activeTrip?.longitude
    const zoom = mapViewState?.zoom || 14

    if (!lat || !lon) {
      setError('No location available')
      return
    }

    if (categories.length === 0) {
      setPois([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const results = await fetchPOIsMultipleCategories(
        categories,
        lat,
        lon
      )

      // Add distance from map center to each POI
      let poisWithDistance = results.map(poi => ({
        ...poi,
        distance: calculateDistance(
          lat,
          lon,
          poi.latitude,
          poi.longitude
        )
      }))

      // Sort by distance from map center
      poisWithDistance.sort((a, b) => a.distance - b.distance)

      // Default limit of ~50 per category is handled in service, 
      // but we don't apply strict zoom-based clipping here to avoid hiding pins

      setPois(poisWithDistance)
    } catch (err) {
      console.error('Error fetching POIs:', err)
      setError('Failed to load places. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [mapViewState?.latitude, mapViewState?.longitude, mapViewState?.zoom, activeTrip?.latitude, activeTrip?.longitude, activeCategories])

  /**
   * Toggle a category filter
   */
  const toggleCategory = useCallback((categoryId) => {
    setActiveCategories(prev => {
      const newCategories = prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]

      // Fetch POIs with new categories
      fetchPOIs(newCategories)
      return newCategories
    })
  }, [fetchPOIs])

  /**
   * Set all active categories at once
   */
  const setCategories = useCallback((categories) => {
    setActiveCategories(categories)
    fetchPOIs(categories)
  }, [fetchPOIs])

  /**
   * Clear all category filters
   */
  const clearCategories = useCallback(() => {
    setActiveCategories([])
    setPois([])
  }, [])

  /**
   * Search for POIs by text query
   * Uses current map view center (like Google Maps)
   */
  const search = useCallback(async (query) => {
    setSearchQuery(query)

    // Clear results if query is empty or too short
    if (!query || query.trim().length < 2) {
      setSearchResults([])
      setLoading(false)
      return
    }

    // Use map view center if available, otherwise fall back to trip location
    const lat = mapViewState?.latitude || activeTrip?.latitude
    const lon = mapViewState?.longitude || activeTrip?.longitude

    if (!lat || !lon) {
      console.warn('Cannot search: No location available')
      setSearchResults([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const results = await searchPOIs(
        query.trim(),
        lat,
        lon
      )

      // Add distance from map center to each result
      const resultsWithDistance = results.map(poi => ({
        ...poi,
        distance: calculateDistance(
          lat,
          lon,
          poi.latitude,
          poi.longitude
        )
      }))

      // Sort by distance from map center
      resultsWithDistance.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))

      console.log(`Search for "${query}" returned ${resultsWithDistance.length} results`)
      setSearchResults(resultsWithDistance)
    } catch (err) {
      console.error('Error searching POIs:', err)
      setError('Search failed. Please try again.')
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }, [mapViewState?.latitude, mapViewState?.longitude, activeTrip?.latitude, activeTrip?.longitude])

  /**
   * Clear search results
   */
  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setSearchResults([])
  }, [])

  /**
   * Pin a POI to the trip
   */
  const pinPOI = useCallback(async (poi) => {
    if (!activeTrip?.id) return false

    try {
      const id = await addPinnedPOI({
        ...poi,
        tripId: activeTrip.id
      })

      // Update local state
      setPinnedPOIs(prev => [...prev, { ...poi, id, tripId: activeTrip.id }])
      return true
    } catch (err) {
      console.error('Error pinning POI:', err)
      return false
    }
  }, [activeTrip?.id])

  /**
   * Unpin a POI from the trip
   */
  const unpinPOI = useCallback(async (poiId) => {
    try {
      // Find the pinned POI by its poiId (external ID) or id (internal ID)
      const pinned = pinnedPOIs.find(p => p.poiId === poiId || p.id === poiId)
      if (!pinned) return false

      await removePinnedPOI(pinned.id)

      // Update local state
      setPinnedPOIs(prev => prev.filter(p => p.id !== pinned.id))
      return true
    } catch (err) {
      console.error('Error unpinning POI:', err)
      return false
    }
  }, [pinnedPOIs])

  /**
   * Check if a POI is pinned
   */
  const checkIsPinned = useCallback((poiId) => {
    return pinnedPOIs.some(p => p.poiId === poiId)
  }, [pinnedPOIs])

  /**
   * Get all displayed POIs (search results take priority, then category results)
   */
  const displayedPOIs = useMemo(() => {
    if (searchQuery && searchResults.length > 0) {
      return searchResults
    }
    return pois
  }, [searchQuery, searchResults, pois])

  /**
   * Get all POIs including pinned ones
   */
  const allPOIs = useMemo(() => {
    const displayed = displayedPOIs
    const pinnedIds = new Set(pinnedPOIs.map(p => p.poiId))

    // Combine displayed and pinned, avoiding duplicates
    const combined = [...displayed]
    pinnedPOIs.forEach(pinned => {
      if (!displayed.some(p => p.poiId === pinned.poiId)) {
        combined.push({
          ...pinned,
          isPinned: true,
          distance: activeTrip?.latitude && activeTrip?.longitude
            ? calculateDistance(
              activeTrip.latitude,
              activeTrip.longitude,
              pinned.latitude,
              pinned.longitude
            )
            : null
        })
      }
    })

    // Mark pinned POIs
    return combined.map(poi => ({
      ...poi,
      isPinned: pinnedIds.has(poi.poiId)
    }))
  }, [displayedPOIs, pinnedPOIs, activeTrip?.latitude, activeTrip?.longitude])

  /**
   * Get category info
   */
  const getCategoryInfo = useCallback((categoryId) => {
    return DISCOVERY_POI_CATEGORIES.find(c => c.id === categoryId)
  }, [])

  /**
   * Refresh POI data
   */
  const refresh = useCallback(() => {
    if (activeCategories.length > 0) {
      fetchPOIs(activeCategories)
    }
    if (searchQuery) {
      search(searchQuery)
    }
  }, [activeCategories, searchQuery, fetchPOIs, search])

  return {
    // Data
    pois: displayedPOIs,
    allPOIs,
    pinnedPOIs,
    searchResults,

    // State
    loading,
    error,
    activeCategories,
    searchQuery,
    isOnline,

    // Actions
    fetchPOIs,
    toggleCategory,
    setCategories,
    clearCategories,
    search,
    clearSearch,
    pinPOI,
    unpinPOI,
    checkIsPinned,
    refresh,

    // Utilities
    getCategoryInfo,
    categories: DISCOVERY_POI_CATEGORIES
  }
}

export default usePOIData
