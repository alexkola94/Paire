import { memo, useState, useEffect } from 'react'
import { Map, Marker, NavigationControl } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useTravelMode } from '../context/TravelModeContext'
import TravelHeader from './TravelHeader'
import TravelNavigation from './TravelNavigation'
import OfflineIndicator from './common/OfflineIndicator'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import '../styles/TravelLayout.css'

// Mapbox configuration
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''
const MAPBOX_STYLE = 'mapbox://styles/mapbox/dark-v11' // Interactive style URL

/**
 * Travel Layout Component
 * Full-screen container with interactive Mapbox background
 * Features "Immersive Mode" toggle to hide UI and explore map
 */
const TravelLayout = memo(({ children, activePage, onNavigate }) => {
  const { activeTrip, isOnline, syncStatus } = useTravelMode()
  const [showUI, setShowUI] = useState(true)
  const [viewState, setViewState] = useState({
    longitude: -0.1278, // Default London
    latitude: 51.5074,
    zoom: 10
  })

  // Update map view when trip changes
  useEffect(() => {
    if (activeTrip?.latitude && activeTrip?.longitude) {
      setViewState(prev => ({
        ...prev,
        longitude: activeTrip.longitude,
        latitude: activeTrip.latitude,
        zoom: 10
      }))
    }
  }, [activeTrip?.id, activeTrip?.latitude, activeTrip?.longitude])

  return (
    <div className="travel-layout" data-offline={!isOnline}>
      {/* Interactive Map Background */}
      <div className={`travel-map-container ${!showUI ? 'interactive' : ''}`}>
        {MAPBOX_TOKEN && (
          <Map
            {...viewState}
            onMove={evt => setViewState(evt.viewState)}
            style={{ width: '100%', height: '100%' }}
            mapStyle={MAPBOX_STYLE}
            mapboxAccessToken={MAPBOX_TOKEN}
            // Disable interaction when UI is shown, enable when hidden
            scrollZoom={!showUI}
            dragPan={!showUI}
            doubleClickZoom={!showUI}
            touchZoomRotate={!showUI}
            attributionControl={!showUI} // Hide attribution in background mode for cleaner look
          >
            {/* Show trip marker */}
            {activeTrip?.latitude && activeTrip?.longitude && (
              <Marker
                longitude={activeTrip.longitude}
                latitude={activeTrip.latitude}
                anchor="bottom"
              >
                <div className="trip-marker-pin" />
              </Marker>
            )}

            {/* Controls only visible in immersive mode */}
            {!showUI && <NavigationControl position="top-right" />}
          </Map>
        )}

        {/* Theme overlay - fades out when exploring */}
        <div className={`map-bg-overlay ${!showUI ? 'hidden' : ''}`} />
      </div>

      {/* Immersive Mode Toggle */}
      <button
        className={`immersive-toggle ${!showUI ? 'active' : ''}`}
        onClick={() => setShowUI(!showUI)}
        title={showUI ? "Hide items & Explore Map" : "Show items"}
      >
        {showUI ? <FiEyeOff size={20} /> : <FiEye size={20} />}
        {!showUI && <span className="toggle-label">Show Items</span>}
      </button>

      {/* Offline indicator bar */}
      {!isOnline && <OfflineIndicator />}

      {/* UI Elements - Conditional rendering based on showUI */}
      <div className={`travel-ui-layer ${!showUI ? 'hidden' : ''}`}>
        <TravelHeader trip={activeTrip} syncStatus={syncStatus} />

        <main className="travel-main">
          <div className="travel-content">
            {children}
          </div>
        </main>

        <TravelNavigation activePage={activePage} onNavigate={onNavigate} />
      </div>
    </div>
  )
})

TravelLayout.displayName = 'TravelLayout'

export default TravelLayout
