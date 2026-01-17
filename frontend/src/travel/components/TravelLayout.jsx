import { useTranslation } from 'react-i18next'
import { memo, useState, useEffect, Suspense, lazy, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTravelMode } from '../context/TravelModeContext'
import { useTheme } from '../../context/ThemeContext'
import { useModal } from '../../context/ModalContext'
import TravelHeader from './TravelHeader'
import TravelNavigation from './TravelNavigation'
import OfflineIndicator from './common/OfflineIndicator'
import usePOIData from '../hooks/usePOIData'
import { FiEye, FiMap, FiX } from 'react-icons/fi'
import '../styles/TravelLayout.css'
import '../styles/TravelLightTheme.css'

// Lazy load Discovery components
const DiscoveryMap = lazy(() => import('./discovery/DiscoveryMap'))
const DiscoverySearch = lazy(() => import('./discovery/DiscoverySearch'))
const DiscoveryControls = lazy(() => import('./discovery/DiscoveryControls'))
const POISheet = lazy(() => import('./discovery/POISheet'))
const DistanceOverlay = lazy(() => import('./discovery/DistanceOverlay'))

// Mapbox configuration for static map fallback
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''
const MAPBOX_STYLE = 'dark-v11'

const getMapboxStaticUrl = (lat, lon, zoom = 10) => {
  if (!MAPBOX_TOKEN || !lat || !lon) return null
  return `https://api.mapbox.com/styles/v1/mapbox/${MAPBOX_STYLE}/static/${lon},${lat},${zoom},0,0/1280x720?access_token=${MAPBOX_TOKEN}`
}

// Static map fallback component
const StaticMapFallback = memo(({ trip, showOverlay = true }) => {
  const [mapLoaded, setMapLoaded] = useState(false)
  const mapUrl = trip?.latitude && trip?.longitude
    ? getMapboxStaticUrl(trip.latitude, trip.longitude, 10)
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
const TravelLayout = memo(({ children, activePage, onNavigate }) => {
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
    updateMapViewState
  } = useTravelMode()

  // POI data hook
  const {
    allPOIs,
    loading: poisLoading,
    activeCategories,
    toggleCategory,
    search,
    pinPOI,
    unpinPOI,
    checkIsPinned
  } = usePOIData()

  const [mapLoaded, setMapLoaded] = useState(false)

  // Static map URL for non-discovery mode
  const staticMapUrl = activeTrip?.latitude && activeTrip?.longitude
    ? getMapboxStaticUrl(activeTrip.latitude, activeTrip.longitude, 10)
    : null

  // Reset map loaded state when trip changes
  useEffect(() => {
    setMapLoaded(false)
  }, [activeTrip?.id])

  /**
   * Handle toggle button click
   */
  const handleToggleClick = useCallback(() => {
    if (isDiscoveryMode) {
      exitDiscoveryMode()
    } else {
      enterDiscoveryMode()
    }
  }, [isDiscoveryMode, enterDiscoveryMode, exitDiscoveryMode])

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
            onPOIClick={handlePOIClick}
            selectedPOIId={selectedPOI?.id || selectedPOI?.poiId}
            showTripMarker
            mapStyle="detailed"
          />
        </Suspense>
      ) : (
        staticMapUrl && (
          <div className="travel-map-container">
            <img
              src={staticMapUrl}
              alt="Trip destination map"
              className={`map-bg-image ${mapLoaded ? 'loaded' : ''}`}
              onLoad={() => setMapLoaded(true)}
            />
            <div className="map-bg-overlay" />
          </div>
        )
      )}

      {/* Header - Always visible */}
      <TravelHeader trip={activeTrip} syncStatus={syncStatus} />

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
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Discovery Mode Toggle Button - Fixed Position (Home Only or Active Mode) */}
      {canEnterDiscovery && !selectedPOI && (activePage === 'home' || isDiscoveryMode) && !hasOpenModals && (
        <motion.button
          className={`immersive-toggle ${isDiscoveryMode ? 'active' : ''}`}
          onClick={handleToggleClick}
          title={isDiscoveryMode ? t('travel.discovery.exitMap', 'Exit Discovery Mode') : t('travel.discovery.enter', 'Enter Discovery Mode')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isDiscoveryMode ? (
            <>
              <FiX size={20} />
              <span className="toggle-label">{t('travel.discovery.exitMap', 'Exit Map')}</span>
            </>
          ) : (
            <>
              <FiMap size={20} />
              <span className="toggle-label">{t('travel.discovery.explore', 'Explore')}</span>
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
              {canEnterDiscovery && activePage !== 'home' && !hasOpenModals && (
                <div className="static-explore-container">
                  <motion.button
                    className="immersive-toggle static"
                    onClick={handleToggleClick}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FiMap size={20} />
                    <span className="toggle-label">{t('travel.discovery.explore', 'Explore Map')}</span>
                  </motion.button>
                </div>
              )}
            </div>
          </motion.main>
        )}
      </AnimatePresence>

      {/* Bottom Navigation - Hidden in Discovery Mode */}
      {!isDiscoveryMode && (
        <TravelNavigation activePage={activePage} onNavigate={onNavigate} />
      )}
    </div>
  )
})

TravelLayout.displayName = 'TravelLayout'

export default TravelLayout
