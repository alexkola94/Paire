import { memo, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RiPlaneLine } from 'react-icons/ri'
import './AirplaneTransition.css'

// Mapbox configuration
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''
const MAPBOX_STYLE = 'dark-v11' // Dark style matching travel app theme

/**
 * Generate Mapbox Static Image URL
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} zoom - Zoom level (0-22)
 * @param {number} width - Image width
 * @param {number} height - Image height
 */
const getMapboxStaticUrl = (lat, lon, zoom = 10, width = 1280, height = 720) => {
    if (!MAPBOX_TOKEN || !lat || !lon) return null

    // Use dark style for the travel app aesthetic
    return `https://api.mapbox.com/styles/v1/mapbox/${MAPBOX_STYLE}/static/${lon},${lat},${zoom},0,0/${width}x${height}@2x?access_token=${MAPBOX_TOKEN}`
}

/**
 * Airplane Transition Component
 * Full-screen overlay with realistic takeoff/landing animations
 * Background shows destination map from Mapbox
 * 
 * @param {boolean} isVisible - Whether the transition is active
 * @param {string} direction - 'takeoff' (ascend) or 'landing' (descend)
 * @param {function} onComplete - Callback when animation finishes
 * @param {Object} destination - Trip destination { latitude, longitude, name }
 */
const AirplaneTransition = memo(({
    isVisible,
    direction = 'takeoff',
    onComplete,
    destination = null
}) => {
    const isTakeoff = direction === 'takeoff'
    const duration = 2.2 // Total animation duration
    const [mapLoaded, setMapLoaded] = useState(false)

    // Generate map URL for destination
    const mapUrl = destination?.latitude && destination?.longitude
        ? getMapboxStaticUrl(
            destination.latitude,
            destination.longitude,
            isTakeoff ? 6 : 10, // Zoom out on takeoff, zoom in on landing
            1920,
            1080
        )
        : null

    // TAKEOFF: Start on runway (bottom-left), accelerate, lift off, climb into sky (top-right)
    // LANDING: Descend from sky (top-right), approach, touch down, slow on runway (bottom-left)
    const airplaneVariants = {
        initial: isTakeoff
            ? {
                x: '-15vw',
                y: '75vh',
                rotate: 0,
                scale: 0.6,
                opacity: 0
            }
            : {
                x: '115vw',
                y: '15vh',
                rotate: -10,
                scale: 0.4,
                opacity: 0
            },
        animate: isTakeoff
            ? {
                x: ['-15vw', '10vw', '35vw', '70vw', '115vw'],
                y: ['75vh', '72vh', '55vh', '30vh', '-10vh'],
                rotate: [0, 0, -15, -25, -35],
                scale: [0.6, 0.8, 1.2, 1.4, 1.0],
                opacity: [0, 1, 1, 1, 0],
                transition: {
                    duration,
                    ease: [0.25, 0.1, 0.25, 1],
                    times: [0, 0.15, 0.4, 0.7, 1]
                }
            }
            : {
                x: ['115vw', '80vw', '50vw', '20vw', '-15vw'],
                y: ['15vh', '35vh', '55vh', '70vh', '75vh'],
                rotate: [-10, -5, 5, 8, 0],
                scale: [0.4, 0.8, 1.3, 1.1, 0.6],
                opacity: [0, 1, 1, 1, 0],
                transition: {
                    duration,
                    ease: [0.25, 0.1, 0.25, 1],
                    times: [0, 0.2, 0.5, 0.8, 1]
                }
            },
        exit: {
            opacity: 0,
            transition: { duration: 0.2 }
        }
    }

    // Map zoom animation
    const mapVariants = {
        initial: {
            scale: isTakeoff ? 1 : 1.5,
            opacity: 0
        },
        animate: {
            scale: isTakeoff ? 1.5 : 1, // Zoom out on takeoff, zoom in on landing
            opacity: 1,
            transition: {
                duration: duration * 0.9,
                ease: [0.25, 0.1, 0.25, 1]
            }
        },
        exit: {
            opacity: 0,
            transition: { duration: 0.3 }
        }
    }

    // Overlay animation
    const overlayVariants = {
        initial: { opacity: 0 },
        animate: {
            opacity: 1,
            transition: { duration: 0.4 }
        },
        exit: {
            opacity: 0,
            transition: { duration: 0.3, delay: 0.1 }
        }
    }

    // Trigger completion callback
    useEffect(() => {
        if (isVisible && onComplete) {
            const timer = setTimeout(() => {
                onComplete()
            }, duration * 1000)
            return () => clearTimeout(timer)
        }
    }, [isVisible, onComplete, duration])

    // Reset map loaded state when visibility changes
    useEffect(() => {
        if (!isVisible) setMapLoaded(false)
    }, [isVisible])

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className={`airplane-transition-overlay ${isTakeoff ? 'takeoff' : 'landing'}`}
                    variants={overlayVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                >
                    {/* Map Background */}
                    {mapUrl ? (
                        <motion.div
                            className="map-background"
                            variants={mapVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                        >
                            <img
                                src={mapUrl}
                                alt="Destination map"
                                className={`map-image ${mapLoaded ? 'loaded' : ''}`}
                                onLoad={() => setMapLoaded(true)}
                            />
                            {/* Purple overlay to match theme */}
                            <div className="map-overlay" />
                        </motion.div>
                    ) : (
                        /* Fallback gradient if no map */
                        <motion.div
                            className="sky-gradient"
                            animate={{
                                backgroundPosition: isTakeoff ? ['0% 100%', '0% 0%'] : ['0% 0%', '0% 100%']
                            }}
                            transition={{ duration: duration * 0.8 }}
                        />
                    )}

                    {/* Destination name */}
                    {destination?.name && (
                        <motion.div
                            className="destination-label"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{
                                opacity: [0, 1, 1, 0.7],
                                scale: [0.8, 1, 1.1, 1.2],
                                y: isTakeoff ? [0, 0, -20, -50] : [50, 20, 0, 0]
                            }}
                            transition={{ duration: duration * 0.8, times: [0, 0.3, 0.7, 1] }}
                        >
                            {destination.name}
                        </motion.div>
                    )}

                    {/* Decorative clouds */}
                    <div className="transition-clouds">
                        <motion.div
                            className="cloud cloud-1"
                            animate={{
                                x: isTakeoff ? [0, -100] : [0, 100],
                                opacity: [0.3, 0.5, 0.3]
                            }}
                            transition={{ duration: duration * 0.7 }}
                        />
                        <motion.div
                            className="cloud cloud-2"
                            animate={{
                                x: isTakeoff ? [0, -150] : [0, 150],
                                opacity: [0.2, 0.4, 0.2]
                            }}
                            transition={{ duration: duration * 0.8 }}
                        />
                        <motion.div
                            className="cloud cloud-3"
                            animate={{
                                x: isTakeoff ? [0, -80] : [0, 80],
                                opacity: [0.15, 0.3, 0.15]
                            }}
                            transition={{ duration: duration * 0.9 }}
                        />
                    </div>

                    {/* Speed lines */}
                    <div className="speed-lines">
                        {[...Array(5)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="speed-line"
                                initial={{ scaleX: 0, opacity: 0 }}
                                animate={{
                                    scaleX: [0, 1.5, 0],
                                    opacity: [0, 0.6, 0],
                                    x: isTakeoff ? [0, 200, 400] : [0, -200, -400]
                                }}
                                transition={{
                                    duration: 0.8,
                                    delay: 0.3 + i * 0.1,
                                    ease: 'easeOut'
                                }}
                                style={{
                                    top: `${30 + i * 10}%`,
                                    left: isTakeoff ? '20%' : '60%'
                                }}
                            />
                        ))}
                    </div>

                    {/* Airplane */}
                    <motion.div
                        className="airplane-icon-container"
                        variants={airplaneVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                    >
                        <RiPlaneLine
                            className={`airplane-icon ${isTakeoff ? 'takeoff' : 'landing'}`}
                        />
                        <motion.div
                            className="airplane-glow"
                            animate={{
                                scale: [1, 1.3, 1],
                                opacity: [0.5, 0.8, 0.5]
                            }}
                            transition={{
                                duration: 0.6,
                                repeat: Infinity,
                                ease: 'easeInOut'
                            }}
                        />
                        <motion.div
                            className="engine-glow"
                            animate={{
                                opacity: [0.6, 1, 0.6],
                                scale: [0.8, 1.2, 0.8]
                            }}
                            transition={{
                                duration: 0.3,
                                repeat: Infinity,
                                ease: 'easeInOut'
                            }}
                        />
                    </motion.div>

                    {/* Status text */}
                    <motion.div
                        className="transition-status"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0, transition: { delay: 0.4 } }}
                        exit={{ opacity: 0 }}
                    >
                        <span className="status-text">
                            {isTakeoff ? '✈️ Entering Travel Mode' : '🏠 Returning Home'}
                        </span>
                        <motion.span
                            className="status-dots"
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 1, repeat: Infinity }}
                        >
                            ...
                        </motion.span>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
})

AirplaneTransition.displayName = 'AirplaneTransition'

export default AirplaneTransition
