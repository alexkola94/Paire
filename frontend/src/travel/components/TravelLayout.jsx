import { memo, useState, useEffect } from 'react'
import { useTravelMode } from '../context/TravelModeContext'
import TravelHeader from './TravelHeader'
import TravelNavigation from './TravelNavigation'
import OfflineIndicator from './common/OfflineIndicator'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import '../styles/TravelLayout.css'

// Mapbox configuration
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''
const MAPBOX_STYLE = 'dark-v11'

const getMapboxStaticUrl = (lat, lon, zoom = 10) => {
  if (!MAPBOX_TOKEN || !lat || !lon) return null
  // Max resolution for free tier is 1280x1280
  return `https://api.mapbox.com/styles/v1/mapbox/${MAPBOX_STYLE}/static/${lon},${lat},${zoom},0,0/1280x720?access_token=${MAPBOX_TOKEN}`
}

/**
 * Travel Layout Component
 * Full-screen container for travel mode with header and bottom navigation
 * Features "Immersive Mode" toggle to hide UI (Static Map Version)
 */
const TravelLayout = memo(({ children, activePage, onNavigate }) => {
  const { activeTrip, isOnline, syncStatus } = useTravelMode()
  const [showUI, setShowUI] = useState(true)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Generate map URL from trip coordinates
  const mapUrl = activeTrip?.latitude && activeTrip?.longitude
    ? getMapboxStaticUrl(activeTrip.latitude, activeTrip.longitude, 10)
    : null

  // Reset map loaded state when trip changes
  useEffect(() => {
    setMapLoaded(false)
  }, [activeTrip?.id])

  return (
    <div className="travel-layout" data-offline={!isOnline}>
      {/* Mapbox Background */}
      {mapUrl && (
        <div
          className={`travel-map-container ${!showUI ? 'interactive' : ''}`}
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: !showUI ? 100 : 0 }}
        >
          <img
            src={mapUrl}
            alt="Trip destination map"
            className={`map-bg-image ${mapLoaded ? 'loaded' : ''}`}
            onLoad={() => setMapLoaded(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              // Add subtle drift animation if immersive
              animation: !showUI ? 'mapDrift 60s ease-in-out infinite alternate' : 'none',
              transform: !showUI ? 'scale(1.1)' : 'scale(1)'
            }}
          />
          {/* Theme overlay - fades out when exploring */}
          <div className={`map-bg-overlay ${!showUI ? 'hidden' : ''}`} />
        </div>
      )}

      {/* Immersive Mode Toggle */}
      <button
        className={`immersive-toggle ${!showUI ? 'active' : ''}`}
        onClick={() => setShowUI(!showUI)}
        title={showUI ? "Show items" : "Hide items & See Map"}
      >
        {showUI ? <FiEye size={20} /> : <FiEyeOff size={20} />}
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
