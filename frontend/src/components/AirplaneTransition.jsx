import { memo, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { RiPlaneFill } from 'react-icons/ri'
import { useTheme } from '../context/ThemeContext'
import './AirplaneTransition.css'

// Mapbox configuration – per-theme styles so:
// - Dark mode keeps the cinematic dark map.
// - Light mode shows the map in its native colors (streets).
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''
const MAPBOX_STYLE_DARK = 'dark-v11'
const MAPBOX_STYLE_LIGHT = 'streets-v12'

const getMapboxStaticUrl = (lat, lon, zoom = 10, width = 1280, height = 720, style = MAPBOX_STYLE_DARK) => {
    if (!MAPBOX_TOKEN) return null
    // Fallback for missing coords
    const validLat = lat || 0
    const validLon = lon || 0

    // Mapbox Free/Standard tier limit is 1280x1280.
    return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${validLon},${validLat},${zoom},0,0/${width}x${height}@2x?access_token=${MAPBOX_TOKEN}`
}

const AirplaneTransition = memo(({
    isVisible,
    direction = 'takeoff',
    onComplete,
    destination = null
}) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const isLightTheme = theme === 'light'
    const isTakeoff = direction === 'takeoff'
    
    // Detect mobile screen size
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth <= 768
        }
        return false
    })

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768)
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Shorter duration on mobile for better UX
    const duration = isMobile ? 2.0 : 3.0
    const [orbitLoaded, setOrbitLoaded] = useState(false)
    const [localLoaded, setLocalLoaded] = useState(false)

    // Map Layers - Use smaller images on mobile for better performance
    // Orbit: Start Closer (Zoom 4) to bridge the gap to Zoom 11
    const hasCoords = destination?.latitude && destination?.longitude
    const mapWidth = isMobile ? 640 : 1280
    const mapHeight = isMobile ? 360 : 720

    const mapStyle = isLightTheme ? MAPBOX_STYLE_LIGHT : MAPBOX_STYLE_DARK

    const orbitUrl = getMapboxStaticUrl(
        hasCoords ? destination.latitude : 0,
        hasCoords ? destination.longitude : 0,
        4,
        mapWidth,
        mapHeight,
        mapStyle
    )

    const localUrl = hasCoords
        ? getMapboxStaticUrl(destination.latitude, destination.longitude, 11, mapWidth, mapHeight, mapStyle)
        : null

    // Smooth ease-in-out-cubic equivalent or custom bezier
    const smoothEase = [0.45, 0, 0.55, 1]

    const airplaneVariants = {
        initial: isTakeoff
            ? { x: '-20vw', y: '80vh', rotate: 0, scale: 0.6, opacity: 0 }
            : { x: '120vw', y: '10vh', rotate: -15, scale: 0.5, opacity: 0 },
        animate: isTakeoff
            ? {
                x: ['-20vw', '110vw'],
                y: ['80vh', '-20vh'],
                rotate: [0, -10, -25, -30],
                scale: [0.6, 1.1, 1.4, 1.2],
                opacity: [0, 1, 1, 0],
                transition: { duration, ease: [0.3, 0.0, 0.2, 1], times: [0, 1] }
            }
            : {
                x: ['120vw', '-20vw'],
                y: ['10vh', '80vh'],
                rotate: [-15, -10, 5, 0],
                scale: [0.5, 1.2, 1.0, 0.6],
                opacity: [0, 1, 1, 0],
                transition: { duration, ease: [0.1, 0.4, 0.2, 1] }
            },
        exit: { opacity: 0, transition: { duration: 0.2 } }
    }

    const shadowVariants = {
        animate: {
            x: 40,
            y: isTakeoff ? [20, 100] : [100, 20],
            opacity: isTakeoff ? [0.6, 0.2] : [0.2, 0.6],
            scale: isTakeoff ? [1, 0.5] : [0.5, 1],
            filter: isTakeoff ? ["blur(4px)", "blur(20px)"] : ["blur(20px)", "blur(4px)"],
            transition: { duration, ease: "easeInOut" }
        }
    }

    // SCALING MATH:
    // Orbit (Zoom 4) * 8 = Zoom 7 effective
    // Local (Zoom 11) * 0.125 = Zoom 8 effective (11 - 3 = 8)
    // Overlap: Zoom 7 meets Zoom 8. Close enough with blur.

    const orbitMapVariants = {
        initial: {
            scale: 1,
            opacity: 1,
            filter: "blur(0px)"
        },
        animate: {
            scale: 8,
            opacity: 0,
            filter: "blur(4px)", // Motion blur at speed
            transition: {
                duration: duration,
                ease: smoothEase,
                opacity: { duration: duration * 0.5, delay: duration * 0.4 } // Fade out later
            }
        }
    }

    const localMapVariants = {
        initial: {
            scale: 0.125, // 1/8th scale
            opacity: 0,
            filter: "blur(4px)"
        },
        animate: {
            scale: 1,
            opacity: 1,
            filter: "blur(0px)",
            transition: {
                duration: duration,
                ease: smoothEase,
                opacity: { duration: duration * 0.5, delay: duration * 0.2 } // Fade in earlier
            }
        }
    }

    const overlayVariants = {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.5 } },
        exit: { opacity: 0, transition: { duration: 0.5, delay: 0.1 } }
    }

    useEffect(() => {
        if (isVisible && onComplete) {
            const timer = setTimeout(() => onComplete(), duration * 1000)
            return () => clearTimeout(timer)
        }
    }, [isVisible, onComplete, duration])

    useEffect(() => {
        if (!isVisible) {
            setOrbitLoaded(false)
            setLocalLoaded(false)
        }
    }, [isVisible])

    const handleImageLoad = (setter) => () => setter(true)
    const handleImageError = (setter) => (e) => {
        console.warn("Map image failed to load", e)
        setter(true)
    }

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className={`airplane-transition-overlay ${isTakeoff ? 'takeoff' : 'landing'}`}
                    variants={overlayVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    style={{ background: '#0f071a' }}
                >
                    <div className="map-layers" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                        {/* Orbit Layer */}
                        {orbitUrl && (
                            <motion.div
                                className="map-layer orbit"
                                variants={orbitMapVariants}
                                style={{ position: 'absolute', inset: -100, zIndex: 1 }}
                            >
                                <img
                                    src={orbitUrl}
                                    className={`map-image ${orbitLoaded ? 'loaded' : ''}`}
                                    onLoad={handleImageLoad(setOrbitLoaded)}
                                    onError={handleImageError(setOrbitLoaded)}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                <div
                                    className="map-overlay"
                                    // In light mode, keep the overlay very subtle so the map
                                    // colors stay close to native; in dark mode use the
                                    // original rich purple tint.
                                    style={{ background: isLightTheme ? 'rgba(15, 7, 26, 0.18)' : 'rgba(15, 7, 26, 0.4)' }}
                                />
                            </motion.div>
                        )}

                        {/* Local Layer */}
                        {localUrl && (
                            <motion.div
                                className="map-layer local"
                                variants={localMapVariants}
                                style={{ position: 'absolute', inset: 0, zIndex: 2 }}
                            >
                                <img
                                    src={localUrl}
                                    className={`map-image ${localLoaded ? 'loaded' : ''}`}
                                    onLoad={handleImageLoad(setLocalLoaded)}
                                    onError={handleImageError(setLocalLoaded)}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                <div
                                    className="map-overlay"
                                    style={{ background: isLightTheme ? 'rgba(15, 7, 26, 0.18)' : undefined }}
                                />
                            </motion.div>
                        )}

                        {!orbitUrl && <div className="sky-gradient" />}
                    </div>

                    {/* Speed Lines - Fewer on mobile for better performance */}
                    <div className="speed-lines" style={{ zIndex: 3 }}>
                        {[...Array(isMobile ? 4 : 6)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="speed-line"
                                initial={{ x: isTakeoff ? -100 : window.innerWidth + 100, opacity: 0 }}
                                animate={{
                                    scaleX: [0, 2, 0],
                                    opacity: [0, 0.4, 0],
                                    x: isTakeoff ? [0, window.innerWidth] : [window.innerWidth, 0]
                                }}
                                transition={{
                                    duration: 0.6,
                                    delay: 0.3 + i * 0.1,
                                    repeat: Infinity,
                                    ease: "linear"
                                }}
                                style={{ top: `${15 + i * 15}%` }}
                            />
                        ))}
                    </div>

                    {/* Plane - Smaller on mobile */}
                    <motion.div
                        className={`airplane-icon-container ${isMobile ? 'mobile' : ''}`}
                        variants={airplaneVariants}
                        style={{ 
                            position: 'absolute', 
                            zIndex: 100, 
                            width: isMobile ? '80px' : '120px', 
                            height: isMobile ? '80px' : '120px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center' 
                        }}
                    >
                        <motion.div className="plane-shadow" variants={shadowVariants} style={{ position: 'absolute', zIndex: -1 }}>
                            <RiPlaneFill size={isMobile ? 50 : 80} style={{ color: 'rgba(0,0,0,0.5)', transform: 'rotate(45deg) scaleY(0.5)' }} />
                        </motion.div>

                        <motion.div className="plane-body" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>
                            <RiPlaneFill size={isMobile ? 50 : 80} style={{ color: 'white' }} />
                            <motion.div
                                className="engine-fire"
                                animate={{ opacity: [0.7, 1, 0.7], height: isMobile ? ['12px', '15px', '12px'] : ['20px', '25px', '20px'] }}
                                transition={{ duration: 0.1, repeat: Infinity }}
                                style={{
                                    position: 'absolute', 
                                    top: '50%', 
                                    left: isTakeoff ? (isMobile ? '-10px' : '-15px') : 'auto', 
                                    right: isTakeoff ? 'auto' : (isMobile ? '-10px' : '-15px'),
                                    width: isMobile ? '20px' : '30px', 
                                    background: 'cyan', 
                                    filter: 'blur(5px)', 
                                    borderRadius: '50%', 
                                    mixBlendMode: 'screen'
                                }}
                            />
                        </motion.div>
                    </motion.div>

                    {/* Text - Responsive sizing with improved mobile spacing */}
                    <motion.div
                        className={`transition-status ${isMobile ? 'mobile' : ''}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1, transition: { delay: 0.5, duration: 1 } }}
                        style={{
                            position: 'absolute', 
                            bottom: isMobile ? 'calc(20% + env(safe-area-inset-bottom, 0px))' : '15%', 
                            left: 0,
                            right: 0,
                            width: '100%', 
                            maxWidth: '100%',
                            textAlign: 'center',
                            zIndex: 50, 
                            color: 'white', 
                            textShadow: '0 4px 20px rgba(0, 0, 0, 0.8)',
                            paddingLeft: isMobile ? '24px' : '0',
                            paddingRight: isMobile ? '24px' : '0',
                            paddingBottom: isMobile ? 'calc(24px + env(safe-area-inset-bottom, 0px))' : '0',
                            boxSizing: 'border-box',
                            overflow: 'hidden',
                            overflowWrap: 'break-word',
                            transition: 'all 0.3s ease-in-out'
                        }}
                    >
                        <div style={{ 
                            fontSize: isMobile ? '0.9rem' : '2rem', 
                            fontWeight: 800, 
                            letterSpacing: isMobile ? '1px' : '8px', 
                            textTransform: 'uppercase',
                            lineHeight: 1.2,
                            marginBottom: destination?.name ? (isMobile ? '6px' : '8px') : '0',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            hyphens: 'auto',
                            maxWidth: '100%',
                            paddingLeft: isMobile ? '8px' : '0',
                            paddingRight: isMobile ? '8px' : '0',
                            boxSizing: 'border-box',
                            transition: 'all 0.3s ease-in-out'
                        }}>
                            {isTakeoff ? t('travel.common.ascending') : t('travel.common.descending')}
                        </div>
                        {destination?.name && (
                            <div style={{ 
                                fontSize: isMobile ? '0.7rem' : '1rem', 
                                fontWeight: 300, 
                                opacity: 0.85, 
                                letterSpacing: isMobile ? '1px' : '2px',
                                lineHeight: 1.4,
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word',
                                hyphens: 'auto',
                                maxWidth: '100%',
                                paddingLeft: isMobile ? '8px' : '0',
                                paddingRight: isMobile ? '8px' : '0',
                                boxSizing: 'border-box',
                                transition: 'all 0.3s ease-in-out'
                            }}>
                                {destination.name}
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
})

AirplaneTransition.displayName = 'AirplaneTransition'
export default AirplaneTransition
