import { memo } from 'react'
import { motion } from 'framer-motion'
import {
  FiCoffee,
  FiCamera,
  FiShoppingBag,
  FiDollarSign,
  FiHeart,
  FiMapPin
} from 'react-icons/fi'
import { FaBus } from 'react-icons/fa'
import { DISCOVERY_POI_CATEGORIES } from '../../utils/travelConstants'
import '../../styles/POIMarker.css'

// Icon mapping for categories
const categoryIcons = {
  restaurant: FiCoffee,
  attraction: FiCamera,
  shopping: FiShoppingBag,
  transit: FaBus,
  atm: FiDollarSign,
  pharmacy: FiHeart
}

/**
 * POIMarker Component
 * Custom styled map marker for POIs with category-based colors
 */
const POIMarker = memo(({ poi, isSelected = false, index = 0 }) => {
  // Get category info
  const categoryInfo = DISCOVERY_POI_CATEGORIES.find(c => c.id === poi.category)
  const Icon = categoryIcons[poi.category] || FiMapPin
  const color = categoryInfo?.color || '#a855f7'
  const gradient = categoryInfo?.gradient || 'linear-gradient(135deg, #a855f7 0%, #8b5cf6 100%)'

  // Animation variants
  const markerVariants = {
    initial: {
      scale: 0,
      opacity: 0
    },
    animate: {
      scale: 1,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 20,
        delay: index * 0.03 // Stagger animation
      }
    },
    selected: {
      scale: 1.2,
      transition: {
        type: 'spring',
        stiffness: 500,
        damping: 25
      }
    }
  }

  return (
    <motion.div
      className={`poi-marker-wrapper ${isSelected ? 'selected' : ''} ${poi.isPinned ? 'pinned' : ''}`}
      variants={markerVariants}
      initial="initial"
      animate={isSelected ? 'selected' : 'animate'}
      whileHover={{ scale: isSelected ? 1.2 : 1.1 }}
      style={{ '--marker-color': color }}
    >
      {/* Marker pin shape */}
      <div
        className="poi-marker-pin"
        style={{ background: gradient }}
      >
        <Icon size={16} className="poi-marker-icon" />
      </div>

      {/* Shadow */}
      <div className="poi-marker-shadow" />

      {/* Pinned indicator */}
      {poi.isPinned && (
        <div className="poi-pinned-badge" />
      )}

      {/* Selection pulse */}
      {isSelected && (
        <motion.div
          className="poi-marker-pulse"
          animate={{
            scale: [1, 1.8, 1],
            opacity: [0.6, 0, 0.6]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          style={{ background: color }}
        />
      )}
    </motion.div>
  )
})

POIMarker.displayName = 'POIMarker'

export default POIMarker
