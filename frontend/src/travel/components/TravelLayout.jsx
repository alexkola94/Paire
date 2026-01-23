import { useTranslation } from 'react-i18next'
import { memo, useState, useEffect, Suspense, lazy, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTravelMode } from '../context/TravelModeContext'
import { useTheme } from '../../context/ThemeContext'
import { useModal } from '../../context/ModalContext'
import TravelHeader from './TravelHeader'
import TravelNavigation from './TravelNavigation'
import OfflineIndicator from './common/OfflineIndicator'
import usePOIData from '../hooks/usePOIData'
import useDebounce from '../hooks/useDebounce'
import { fetchStays, getZoomBasedSettings } from '../services/discoveryService'
import { FiEye, FiMap, FiX } from 'react-icons/fi'
import '../styles/TravelLayout.css'
import '../styles/TravelLightTheme.css'
import TravelBackgroundMap from './TravelBackgroundMap'

// Lazy load Discovery components
const DiscoveryMap = lazy(() => import('./discovery/DiscoveryMap'))
const DiscoverySearch = lazy(() => import('./discovery/DiscoverySearch'))
const DiscoveryControls = lazy(() => import('./discovery/DiscoveryControls'))
const POISheet = lazy(() => import('./discovery/POISheet'))
const StayDetailsSheet = lazy(() => import('./discovery/StayDetailsSheet'))
const DistanceOverlay = lazy(() => import('./discovery/DistanceOverlay'))

// Mapbox configuration for static map fallback
// Dark theme keeps the original dark style, light theme uses a neutral streets style
// so the map appears in its native colors without extra tint.
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''
const MAPBOX_STYLE_DARK = 'dark-v11'
const MAPBOX_STYLE_LIGHT = 'streets-v12'

const getMapboxStaticUrl = (lat, lon, zoom = 10, style = MAPBOX_STYLE_DARK) => {
  if (!MAPBOX_TOKEN || !lat || !lon) return null
  return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${lon},${lat},${zoom},0,0/1280x720?access_token=${MAPBOX_TOKEN}`
}

// Static map fallback component
const StaticMapFallback = memo(({ trip, showOverlay = true }) => {
  const { theme } = useTheme()
  const [mapLoaded, setMapLoaded] = useState(false)
  const mapStyle = theme === 'light' ? MAPBOX_STYLE_LIGHT : MAPBOX_STYLE_DARK
  const mapUrl = trip?.latitude && trip?.longitude
    ? getMapboxStaticUrl(trip.latitude, trip.longitude, 10, mapStyle)
    : null

  if (!mapUrl) return null

  return (
    <div className="static-map-fallback">
      <img
        src={mapUrl}
        alt="Trip destination map"
        className={`map-bg-image ${mapLoaded ? 'loaded' : ''}`}
        onLoad={() => setMapLoaded(true)}
      />
      {showOverlay && <div className="map-bg-overlay" />}
    </div>
  )
})

StaticMapFallback.displayName = 'StaticMapFallback'

// Animation variants for UI layers
const uiLayerVariants = {
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.8, 0.25, 1]
    }
  },
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.8, 0.25, 1]
    }
  }
}

const discoveryLayerVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.3,
      staggerChildren: 0.1
    }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 }
  }
}

/**
 * Travel Layout Component
 * Full-screen container for travel mode with Discovery Mode toggle
 */
const TravelLayout = memo(({ children, activePage, onNavigate, shouldHideNav }) => {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { hasOpenModals } = useModal()
  const {
    activeTrip,
    isOnline,
    syncStatus,
    isDiscoveryMode,
    enterDiscoveryMode,
    exitDiscoveryMode,
    selectedPOI,
    selectPOI,
    clearSelectedPOI,
    mapViewState,
    updateMapViewState,
    backgroundMapCities
  } = useTravelMode()

  // POI data hook
  const {
    allPOIs,
    loading: poisLoading,
    activeCategories,
    toggleCategory,
    clearCategories,
    search,
    clearSearch,
    pinPOI,
    unpinPOI,
    checkIsPinned
  } = usePOIData()

  const [mapLoaded, setMapLoaded] = useState(false)
  const [stays, setStays] = useState([])
  const [selectedStay, setSelectedStay] = useState(null)
  const [staysLoading, setStaysLoading] = useState(false)
  const [isExploreExpanded, setIsExploreExpanded] = useState(false)

  // Static map URL for non-discovery mode – pick style per theme so
  // dark mode keeps the original dark map and light mode shows native colors.
  const staticMapStyle = theme === 'light' ? MAPBOX_STYLE_LIGHT : MAPBOX_STYLE_DARK
  const staticMapUrl = activeTrip?.latitude && activeTrip?.longitude
    ? getMapboxStaticUrl(activeTrip.latitude, activeTrip.longitude, 10, staticMapStyle)
    : null

  // Reset map loaded state when trip changes
  useEffect(() => {
    setMapLoaded(false)
  }, [activeTrip?.id])

  // Debounce map view state to prevent excessive API calls (700ms delay)
  // This protects the SerpApi limit (250 req/month) while dragging/zooming
  const debouncedMapViewState = useDebounce(mapViewState, 700)

  // Fetch stays only when accommodation category is selected
  // Uses debounced map center to save API calls
  // Applies zoom-based filtering: zoomed out = fewer best results, zoomed in = more results
  useEffect(() => {
    const isAccommodationActive = activeCategories.includes('accommodation')

    if (!isAccommodationActive) {
      // Clear stays when accommodation is not selected
      setStays([])
      return
    }

    // Use debounced map view center if available, otherwise fall back to trip location
    const lat = debouncedMapViewState?.latitude || activeTrip?.latitude
    const lon = debouncedMapViewState?.longitude || activeTrip?.longitude
    const zoom = debouncedMapViewState?.zoom || 14

    // Get zoom-based settings for limit and min rating
    const { limit, minRating } = getZoomBasedSettings(zoom)

    const loadStays = async () => {
      if (isDiscoveryMode && lat && lon && isAccommodationActive) {
        setStaysLoading(true)
        try {
          // Pass zoom-based limit to API to minimize data transfer (though SerpApi paging handles it)
          const staysData = await fetchStays(lat, lon, undefined, limit)
          // Filter by minimum rating based on zoom level
          const filteredStays = staysData.filter(stay => (stay.rating || 0) >= minRating)
          setStays(filteredStays)
        } catch (error) {
          console.error('Error fetching stays:', error)
        } finally {
          setStaysLoading(false)
        }
      }
    }
    loadStays()
  }, [isDiscoveryMode, debouncedMapViewState, activeTrip?.latitude, activeTrip?.longitude, activeCategories])

  /**
   * Handle stay marker click
   */
  const handleStayClick = useCallback((stay) => {
    setSelectedStay(stay)
  }, [])

  /**
   * Handle stay sheet close
   */
  const handleStaySheetClose = useCallback(() => {
    setSelectedStay(null)
  }, [])

  /* Click outside to collapse Explore button */
  const exploreButtonRef = useRef(null)

  useEffect(() => {
    if (!isExploreExpanded) return

    const handleClickOutside = (event) => {
      if (exploreButtonRef.current && !exploreButtonRef.current.contains(event.target)) {
        setIsExploreExpanded(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isExploreExpanded])

  /**
   * Handle toggle button click
   */
  const handleToggleClick = useCallback(() => {
    if (isDiscoveryMode) {
      // Reset categories, search, and expansion state when exiting discovery mode
      clearCategories()
      clearSearch()
      setIsExploreExpanded(false)
      exitDiscoveryMode()
    } else {
      if (!isExploreExpanded) {
        // First click: Expand the button
        setIsExploreExpanded(true)
      } else {
        // Second click: Enter Discovery Mode
        enterDiscoveryMode()
      }
    }
  }, [isDiscoveryMode, isExploreExpanded, enterDiscoveryMode, exitDiscoveryMode, clearCategories, clearSearch])

  /**
   * Handle POI marker click
   */
  const handlePOIClick = useCallback((poi) => {
    selectPOI(poi)
  }, [selectPOI])

  /**
   * Handle POI sheet close
   */
  const handlePOISheetClose = useCallback(() => {
    clearSelectedPOI()
  }, [clearSelectedPOI])

  /**
   * Handle pin/unpin POI
   */
  const handlePinPOI = useCallback(async (poi) => {
    if (checkIsPinned(poi.poiId || poi.id)) {
      await unpinPOI(poi.poiId || poi.id)
    } else {
      await pinPOI(poi)
    }
  }, [checkIsPinned, pinPOI, unpinPOI])

  /**
   * Center map on trip location
   */
  const handleCenterOnTrip = useCallback(() => {
    if (activeTrip?.latitude && activeTrip?.longitude && updateMapViewState) {
      updateMapViewState({
        ...mapViewState,
        latitude: activeTrip.latitude,
        longitude: activeTrip.longitude,
        zoom: 14
      })
    }
  }, [activeTrip, mapViewState, updateMapViewState])

  // Can enter discovery mode?
  const canEnterDiscovery = Boolean(activeTrip?.latitude && activeTrip?.longitude)

  return (
    <div
      className="travel-layout"
      data-theme={theme}
      data-offline={!isOnline}
      data-discovery={isDiscoveryMode}
    >
      {/* Map Layer */}
      {isDiscoveryMode ? (
        <Suspense fallback={<StaticMapFallback trip={activeTrip} showOverlay={false} />}>
          <DiscoveryMap
            pois={allPOIs}
            stays={stays}
            onPOIClick={handlePOIClick}
            onStayClick={handleStayClick}
            selectedPOIId={selectedPOI?.id || selectedPOI?.poiId}
            selectedStayId={selectedStay?.id}
            showTripMarker
            mapStyle="detailed"
          />
        </Suspense>
      ) : (
        <TravelBackgroundMap
          trip={activeTrip}
          availableCities={backgroundMapCities}
        />
      )}

      {/* Header - Always visible, collapses in Discovery Mode */}
      {!shouldHideNav && (
        <TravelHeader trip={activeTrip} syncStatus={syncStatus} isDiscoveryMode={isDiscoveryMode} />
      )}

      {/* Discovery Mode UI Layer */}
      <AnimatePresence mode="wait">
        {isDiscoveryMode && (
          <motion.div
            className="discovery-ui-layer"
            variants={discoveryLayerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Suspense fallback={null}>
              <DiscoverySearch
                onSearch={search}
                onCategoryToggle={toggleCategory}
                activeCategories={activeCategories}
                loading={poisLoading}
              />
              <DiscoveryControls onCenterOnTrip={handleCenterOnTrip} />
              <DistanceOverlay />
              <POISheet
                poi={selectedPOI}
                onClose={handlePOISheetClose}
                onPin={handlePinPOI}
                isPinned={selectedPOI ? checkIsPinned(selectedPOI.poiId || selectedPOI.id) : false}
                tripLocation={activeTrip ? { lat: activeTrip.latitude, lon: activeTrip.longitude } : null}
              />
              <StayDetailsSheet
                stay={selectedStay}
                onClose={handleStaySheetClose}
                tripLocation={activeTrip ? { lat: activeTrip.latitude, lon: activeTrip.longitude } : null}
                cityName={activeTrip?.destination || ''}
              />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Discovery Mode Toggle Button - Fixed Position (Active Mode or All Pages) */}
      {canEnterDiscovery && !selectedPOI && !hasOpenModals && !shouldHideNav && (
        <motion.button
          ref={exploreButtonRef}
          className={`immersive-toggle ${isDiscoveryMode ? 'active' : ''} ${isExploreExpanded ? 'expanded' : ''}`}
          onClick={handleToggleClick}
          title={isDiscoveryMode ? t('travel.discovery.exitMap', 'Exit Discovery Mode') : (isExploreExpanded ? t('travel.discovery.enter', 'Enter Discovery Mode') : t('travel.discovery.expand', 'Show Explore'))}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={false}
          animate={{
            width: isDiscoveryMode || isExploreExpanded ? 'auto' : '48px',
            borderRadius: '24px'
          }}
        >
          {isDiscoveryMode ? (
            <>
              <FiX size={20} />
              <motion.span
                className="toggle-label"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
              >
                {t('travel.discovery.exitMap', 'Exit Map')}
              </motion.span>
            </>
          ) : (
            <>
              <FiMap size={20} />
              <AnimatePresence>
                {isExploreExpanded && (
                  <motion.span
                    className="toggle-label"
                    initial={{ opacity: 0, width: 0, display: 'none' }}
                    animate={{ opacity: 1, width: 'auto', display: 'block' }}
                    exit={{ opacity: 0, width: 0, display: 'none' }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden', whiteSpace: 'nowrap', marginLeft: '8px' }}
                  >
                    {t('travel.discovery.explore', 'Explore')}
                  </motion.span>
                )}
              </AnimatePresence>
            </>
          )}
        </motion.button>
      )}

      {/* Offline indicator bar */}
      {!isOnline && <OfflineIndicator />}

      {/* Main Content - Hidden in Discovery Mode */}
      <AnimatePresence mode="wait">
        {!isDiscoveryMode && (
          <motion.main
            className="travel-main"
            variants={uiLayerVariants}
            initial="visible"
            animate="visible"
            exit="hidden"
          >
            <div className="travel-content">
              {children}

              {/* Static Explore Button for non-home pages */}

            </div>
          </motion.main>
        )}
      </AnimatePresence>

      {/* Bottom Navigation - Hidden in Discovery Mode */}
      {!isDiscoveryMode && !shouldHideNav && (
        <TravelNavigation activePage={activePage} onNavigate={onNavigate} />
      )}
    </div>
  )
})

TravelLayout.displayName = 'TravelLayout'

export default TravelLayout
