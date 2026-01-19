import { memo, useCallback, useState } from 'react'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
    FiX,
    FiNavigation,
    FiMapPin,
    FiStar,
    FiExternalLink,
    FiWifi,
    FiDroplet,
    FiCoffee,
    FiTruck,
    FiHome,
    FiWind
} from 'react-icons/fi'
import { getDirectionsUrl, formatDistance, openBookingUrl } from '../../services/discoveryService'
import '../../styles/StayDetailsSheet.css'

// Amenity icon mapping
const amenityIcons = {
    'WiFi': FiWifi,
    'Pool': FiDroplet,
    'Spa': FiDroplet,
    'Restaurant': FiCoffee,
    'Parking': FiTruck,
    'Kitchen': FiHome,
    'Washer': FiHome,
    'Air Conditioning': FiWind,
    'Beach Access': FiDroplet,
    'Gym': FiHome,
    'Rooftop Terrace': FiHome,
    'City View': FiHome,
    'Concierge': FiHome,
    'Shared Kitchen': FiCoffee,
    'Locker': FiHome
}

/**
 * StayDetailsSheet Component
 * Bottom sheet for displaying accommodation/hotel details with booking functionality
 */
const StayDetailsSheet = memo(({
    stay,
    onClose,
    tripLocation = null,
    cityName = ''
}) => {
    const { t } = useTranslation()
    const dragControls = useDragControls()
    const [imageLoaded, setImageLoaded] = useState(false)
    const [imageError, setImageError] = useState(false)

    /**
     * Handle Book Now button click
     */
    const handleBookNow = useCallback(() => {
        if (!stay) return
        openBookingUrl(stay, cityName)
    }, [stay, cityName])

    /**
     * Handle directions button click
     */
    const handleDirections = useCallback(() => {
        if (!stay) return
        const url = getDirectionsUrl(stay, tripLocation)
        window.open(url, '_blank', 'noopener,noreferrer')
    }, [stay, tripLocation])

    /**
     * Handle drag end - dismiss if dragged down far enough
     */
    const handleDragEnd = useCallback((_, info) => {
        if (info.offset.y > 100 || info.velocity.y > 500) {
            onClose()
        }
    }, [onClose])

    /**
     * Render star rating
     */
    const renderStars = (rating) => {
        const fullStars = Math.floor(rating)
        const hasHalfStar = rating % 1 >= 0.5
        const stars = []

        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars.push(<FiStar key={i} className="star filled" />)
            } else if (i === fullStars && hasHalfStar) {
                stars.push(<FiStar key={i} className="star half" />)
            } else {
                stars.push(<FiStar key={i} className="star empty" />)
            }
        }

        return stars
    }

    /**
     * Format price for display
     */
    const formatPrice = (price) => {
        if (!price) return ''
        const symbol = price.currency === 'EUR' ? '€' :
            price.currency === 'USD' ? '$' :
                price.currency === 'GBP' ? '£' : price.currency
        return `${symbol}${price.amount}`
    }

    if (!stay) return null

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
            {stay && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="stay-sheet-backdrop"
                        variants={backdropVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        onClick={onClose}
                    />

                    {/* Sheet */}
                    <motion.div
                        className="stay-sheet"
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
                            className="stay-sheet-handle"
                            onPointerDown={(e) => dragControls.start(e)}
                        >
                            <div className="handle-bar" />
                        </div>

                        {/* Close button */}
                        <button className="stay-sheet-close" onClick={onClose}>
                            <FiX size={20} />
                        </button>

                        {/* Image Hero */}
                        <div className="stay-image-container">
                            {!imageError && (
                                <img
                                    src={stay.image}
                                    alt={stay.name}
                                    className={`stay-image ${imageLoaded ? 'loaded' : ''}`}
                                    onLoad={() => setImageLoaded(true)}
                                    onError={() => setImageError(true)}
                                />
                            )}
                            {(!imageLoaded || imageError) && (
                                <div className="stay-image-placeholder">
                                    <FiHome size={40} />
                                </div>
                            )}
                            <div className="stay-image-overlay" />

                            {/* Price Badge */}
                            {stay.price && (
                                <div className="stay-price-badge">
                                    <span className="price-amount">{formatPrice(stay.price)}</span>
                                    <span className="price-label">/{t('travel.stays.perNight', 'night')}</span>
                                </div>
                            )}

                            {/* Provider Badge */}
                            <div className={`stay-provider-badge ${stay.provider}`}>
                                {stay.provider === 'airbnb' ? 'Airbnb' : 'Booking.com'}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="stay-sheet-content">
                            {/* Header */}
                            <div className="stay-sheet-header">
                                <h2 className="stay-sheet-name">{stay.name}</h2>

                                <div className="stay-rating">
                                    <div className="star-container">
                                        {renderStars(stay.rating)}
                                    </div>
                                    <span className="rating-value">{stay.rating?.toFixed(1)}</span>
                                </div>

                                {stay.distance !== undefined && (
                                    <span className="stay-sheet-distance">
                                        <FiMapPin size={12} />
                                        {formatDistance(stay.distance)} {t('travel.discovery.fromCenter', 'from trip')}
                                    </span>
                                )}
                            </div>

                            {/* Address */}
                            {stay.address && (
                                <div className="stay-address">
                                    <FiMapPin size={14} />
                                    <span>{stay.address}</span>
                                </div>
                            )}

                            {/* Amenities */}
                            {stay.amenities && stay.amenities.length > 0 && (
                                <div className="stay-amenities">
                                    {stay.amenities.slice(0, 6).map((amenity, index) => {
                                        const AmenityIcon = amenityIcons[amenity] || FiHome
                                        return (
                                            <div key={index} className="amenity-chip">
                                                <AmenityIcon size={12} />
                                                <span>{amenity}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="stay-sheet-actions">
                                <button
                                    className="stay-action-btn primary"
                                    onClick={handleBookNow}
                                >
                                    <FiExternalLink size={18} />
                                    <span>{t('travel.stays.bookNow', 'Book Now')}</span>
                                </button>

                                <button
                                    className="stay-action-btn secondary"
                                    onClick={handleDirections}
                                >
                                    <FiNavigation size={18} />
                                    <span>{t('travel.discovery.getDirections', 'Directions')}</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
})

StayDetailsSheet.displayName = 'StayDetailsSheet'

export default StayDetailsSheet
