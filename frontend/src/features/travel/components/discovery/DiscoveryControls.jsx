import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { FiPlus, FiMinus, FiNavigation, FiCrosshair } from 'react-icons/fi'
import { useTravelMode } from '../../context/TravelModeContext'
import '../../styles/Discovery.css'

/**
 * DiscoveryControls Component
 * Floating map controls for zoom, compass, and centering
 */
const DiscoveryControls = memo(({ onCenterOnTrip, onCenterOnUser }) => {
  const { t } = useTranslation()
  const { mapViewState, updateMapViewState } = useTravelMode()

  /**
   * Zoom in
   */
  const handleZoomIn = useCallback(() => {
    if (!mapViewState) return

    updateMapViewState({
      ...mapViewState,
      zoom: Math.min(mapViewState.zoom + 1, 20)
    })
  }, [mapViewState, updateMapViewState])

  /**
   * Zoom out
   */
  const handleZoomOut = useCallback(() => {
    if (!mapViewState) return

    updateMapViewState({
      ...mapViewState,
      zoom: Math.max(mapViewState.zoom - 1, 3)
    })
  }, [mapViewState, updateMapViewState])

  /**
   * Reset compass (bearing to 0)
   */
  const handleResetCompass = useCallback(() => {
    if (!mapViewState) return

    updateMapViewState({
      ...mapViewState,
      bearing: 0,
      pitch: 0
    })
  }, [mapViewState, updateMapViewState])

  /**
   * Center on trip location
   */
  const handleCenterOnTrip = useCallback(() => {
    if (onCenterOnTrip) {
      onCenterOnTrip()
    }
  }, [onCenterOnTrip])

  /**
   * Try to get user location and center
   */
  const handleCenterOnUser = useCallback(() => {
    if (onCenterOnUser) {
      onCenterOnUser()
      return
    }

    // Fallback: use browser geolocation
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateMapViewState({
            ...mapViewState,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            zoom: 15
          })
        },
        (error) => {
          console.error('Geolocation error:', error)
        }
      )
    }
  }, [onCenterOnUser, mapViewState, updateMapViewState])

  // Animation variants for the controls container
  const containerVariants = {
    initial: { x: 100, opacity: 0 },
    animate: {
      x: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 25,
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    },
    exit: {
      x: 100,
      opacity: 0,
      transition: { duration: 0.2 }
    }
  }

  const buttonVariants = {
    initial: { scale: 0, opacity: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      transition: { type: 'spring', stiffness: 400, damping: 20 }
    }
  }

  // Calculate compass rotation from bearing
  const compassRotation = mapViewState?.bearing || 0

  return (
    <motion.div
      className="discovery-controls"
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Zoom controls */}
      <div className="discovery-controls-group">
        <motion.button
          className="discovery-control-btn"
          variants={buttonVariants}
          onClick={handleZoomIn}
          title={t('travel.discovery.zoomIn', 'Zoom in')}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <FiPlus size={18} />
        </motion.button>
        <motion.button
          className="discovery-control-btn"
          variants={buttonVariants}
          onClick={handleZoomOut}
          title={t('travel.discovery.zoomOut', 'Zoom out')}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <FiMinus size={18} />
        </motion.button>
      </div>

      {/* Navigation controls */}
      <div className="discovery-controls-group">
        <motion.button
          className={`discovery-control-btn compass-btn ${compassRotation !== 0 ? 'rotated' : ''}`}
          variants={buttonVariants}
          onClick={handleResetCompass}
          title={t('travel.discovery.resetCompass', 'Reset compass')}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <FiNavigation
            size={18}
            style={{ transform: `rotate(${-compassRotation}deg)` }}
          />
        </motion.button>
        <motion.button
          className="discovery-control-btn"
          variants={buttonVariants}
          onClick={handleCenterOnTrip}
          title={t('travel.discovery.centerOnTrip', 'Center on trip')}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <FiCrosshair size={18} />
        </motion.button>
      </div>
    </motion.div>
  )
})

DiscoveryControls.displayName = 'DiscoveryControls'

export default DiscoveryControls
