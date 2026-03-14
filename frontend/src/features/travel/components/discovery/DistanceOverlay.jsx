import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { FiMapPin } from 'react-icons/fi'
import { useTravelMode } from '../../context/TravelModeContext'
import { calculateDistance, formatDistance } from '../../services/discoveryService'
import '../../styles/Discovery.css'

/**
 * DistanceOverlay Component
 * Shows distance from current map center to main trip event
 */
const DistanceOverlay = memo(() => {
  const { t } = useTranslation()
  const { activeTrip, mapViewState } = useTravelMode()

  // Calculate distance from trip center to current map center
  const distance = useMemo(() => {
    if (!activeTrip?.latitude || !activeTrip?.longitude || !mapViewState) {
      return null
    }

    return calculateDistance(
      activeTrip.latitude,
      activeTrip.longitude,
      mapViewState.latitude,
      mapViewState.longitude
    )
  }, [activeTrip, mapViewState])

  // Don't show if at trip center (within 50 meters)
  if (distance === null || distance < 0.05) {
    return null
  }

  // Animation variants
  const overlayVariants = {
    initial: { y: 50, opacity: 0 },
    animate: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 25,
        delay: 0.3
      }
    },
    exit: {
      y: 50,
      opacity: 0,
      transition: { duration: 0.2 }
    }
  }

  return (
    <motion.div
      className="distance-overlay"
      variants={overlayVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <FiMapPin size={14} className="distance-icon" />
      <span className="distance-text">
        {formatDistance(distance)} {t('travel.distance.from', 'from')} {activeTrip?.destination || t('travel.distance.tripCenter', 'trip center')}
      </span>
    </motion.div>
  )
})

DistanceOverlay.displayName = 'DistanceOverlay'

export default DistanceOverlay
