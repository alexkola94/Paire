import { memo, useCallback, useState, useRef } from 'react'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  FiX,
  FiNavigation,
  FiBookmark,
  FiPhone,
  FiGlobe,
  FiClock,
  FiMapPin,
  FiCoffee,
  FiCamera,
  FiShoppingBag,
  FiDollarSign,
  FiHeart,
  FiExternalLink,
  FiCheck
} from 'react-icons/fi'
import { FaBus } from 'react-icons/fa'
import { DISCOVERY_POI_CATEGORIES } from '../../utils/travelConstants'
import { getDirectionsUrl, getPlaceDetailsUrl, formatDistance } from '../../services/discoveryService'
import '../../styles/POISheet.css'

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
 * POISheet Component
 * Bottom sheet for displaying POI details with drag-to-dismiss
 */
const POISheet = memo(({
  poi,
  onClose,
  onPin,
  isPinned = false,
  tripLocation = null
}) => {
  const { t } = useTranslation()
  const dragControls = useDragControls()
  const [isPinning, setIsPinning] = useState(false)
  const longPressRef = useRef(null)

  // Get category info
  const categoryInfo = DISCOVERY_POI_CATEGORIES.find(c => c.id === poi?.category)
  const CategoryIcon = categoryIcons[poi?.category] || FiMapPin
  const categoryColor = categoryInfo?.color || '#a855f7'

  /**
   * Handle directions button click
   */
  const handleDirections = useCallback(() => {
    if (!poi) return

    const url = getDirectionsUrl(poi, tripLocation)
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [poi, tripLocation])

  /**
   * Handle "See details" button click
   * Opens Google Maps place details in a new tab
   */
  const handleSeeDetails = useCallback(() => {
    if (!poi) return

    const url = getPlaceDetailsUrl(poi)
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [poi])

  /**
   * Handle pin button with long press
   */
  const handlePinStart = useCallback(() => {
    longPressRef.current = setTimeout(() => {
      if (onPin && !isPinned) {
        setIsPinning(true)
        onPin(poi)
        setTimeout(() => setIsPinning(false), 1000)
      }
    }, 500) // 500ms long press
  }, [onPin, poi, isPinned])

  const handlePinEnd = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current)
    }
  }, [])

  /**
   * Handle quick tap on pin (for pinned items, unpin)
   */
  const handlePinClick = useCallback(() => {
    if (isPinned && onPin) {
      onPin(poi)
    }
  }, [isPinned, onPin, poi])

  /**
   * Handle drag end - dismiss if dragged down far enough
   */
  const handleDragEnd = useCallback((_, info) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose()
    }
  }, [onClose])

  if (!poi) return null

  // Animation variants
  const sheetVariants = {
    initial: { y: '100%', opacity: 0 },
    animate: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30
      }
    },
    exit: {
      y: '100%',
      opacity: 0,
      transition: { duration: 0.2 }
    }
  }

  const backdropVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  }

  return (
    <AnimatePresence>
      {poi && (
        <>
          {/* Backdrop */}
          <motion.div
            className="poi-sheet-backdrop"
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="poi-sheet"
            variants={sheetVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.1, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
          >
            {/* Drag handle */}
            <div
              className="poi-sheet-handle"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="handle-bar" />
            </div>

            {/* Close button */}
            <button className="poi-sheet-close" onClick={onClose}>
              <FiX size={20} />
            </button>

            {/* Content */}
            <div className="poi-sheet-content">
              {/* Header */}
              <div className="poi-sheet-header">
                <div
                  className="poi-category-badge"
                  style={{ '--badge-color': categoryColor }}
                >
                  <CategoryIcon size={14} />
                  <span>
                    {t(categoryInfo?.label, categoryInfo?.fallbackLabel || poi.category)}
                  </span>
                </div>
                <h2 className="poi-sheet-name">{poi.name}</h2>
                {poi.distance !== undefined && (
                  <span className="poi-sheet-distance">
                    <FiMapPin size={12} />
                    {formatDistance(poi.distance)} {t('travel.discovery.fromCenter', 'from trip')}
                  </span>
                )}
              </div>

              {/* Details */}
              <div className="poi-sheet-details">
                {poi.address && (
                  <div className="poi-detail-row">
                    <FiMapPin size={16} />
                    <span>{poi.address}</span>
                  </div>
                )}
                {poi.phone && (
                  <a
                    href={`tel:${poi.phone}`}
                    className="poi-detail-row clickable"
                  >
                    <FiPhone size={16} />
                    <span>{poi.phone}</span>
                  </a>
                )}
                {poi.website && (
                  <a
                    href={poi.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="poi-detail-row clickable"
                  >
                    <FiGlobe size={16} />
                    <span>{poi.website}</span>
                    <FiExternalLink size={12} className="external-icon" />
                  </a>
                )}
                {poi.openingHours && (
                  <div className="poi-detail-row">
                    <FiClock size={16} />
                    <span>{poi.openingHours}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="poi-sheet-actions">
                <button
                  className="poi-action-btn primary"
                  onClick={handleDirections}
                >
                  <FiNavigation size={18} />
                  <span>{t('travel.discovery.getDirections', 'Get Directions')}</span>
                </button>

                <button
                  className="poi-action-btn secondary"
                  onClick={handleSeeDetails}
                >
                  <FiExternalLink size={18} />
                  <span>{t('travel.discovery.seeDetails', 'See details in Google Maps')}</span>
                </button>

                <button
                  className={`poi-action-btn secondary ${isPinned ? 'pinned' : ''} ${isPinning ? 'pinning' : ''}`}
                  onPointerDown={handlePinStart}
                  onPointerUp={handlePinEnd}
                  onPointerLeave={handlePinEnd}
                  onClick={handlePinClick}
                  disabled={isPinning}
                >
                  {isPinning ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500 }}
                    >
                      <FiCheck size={18} />
                    </motion.div>
                  ) : (
                    <FiBookmark size={18} />
                  )}
                  <span>
                    {isPinned
                      ? t('travel.discovery.unpinFromTrip', 'Pinned')
                      : isPinning
                        ? t('travel.discovery.pinning', 'Pinning...')
                        : t('travel.discovery.pinToTrip', 'Hold to Pin')
                    }
                  </span>
                </button>
              </div>

              {/* Pin hint */}
              {!isPinned && !isPinning && (
                <p className="poi-pin-hint">
                  {t('travel.discovery.pinHint', 'Long press "Hold to Pin" to add this place to your trip')}
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
})

POISheet.displayName = 'POISheet'

export default POISheet
