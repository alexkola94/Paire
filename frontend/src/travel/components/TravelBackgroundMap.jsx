import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { Map } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useTheme } from '../../context/ThemeContext'
import { MAP_STYLES } from '../utils/travelConstants'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''

const TravelBackgroundMap = ({ trip, availableCities = [] }) => {
    const { theme } = useTheme()
    const [viewState, setViewState] = useState({
        latitude: 46.0,
        longitude: 12.0,
        zoom: 8
    })
    const [mounted, setMounted] = useState(false)
    const [userLocation, setUserLocation] = useState(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Get user's current location for empty state fallback
    useEffect(() => {
        if (!('geolocation' in navigator)) return

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords
                setUserLocation({ latitude, longitude })
            },
            (error) => {
                // Fail silently – if location is blocked, we use the default fallback.
                console.warn('Geolocation unavailable for TravelBackgroundMap:', error)
            }
        )
    }, [])

    // Auto-focus on the first relevant destination, or user's location if no trip
    useEffect(() => {
        let targetLat = null
        let targetLng = null
        let targetZoom = 11 // Default zoom for specific destination

        if (trip) {
            // Priority 1: First city in the list (ordered)
            if (availableCities && availableCities.length > 0) {
                const sorted = [...availableCities].sort((a, b) => (a.order || 0) - (b.order || 0))
                const first = sorted[0]
                if (first.latitude && first.longitude) {
                    targetLat = first.latitude
                    targetLng = first.longitude
                }
            }

            // Priority 2: Trip object itself (single destination)
            if ((!targetLat || !targetLng) && trip.latitude && trip.longitude) {
                targetLat = trip.latitude
                targetLng = trip.longitude
            }
        } else if (userLocation) {
            // No trip – center on user's current location
            targetLat = userLocation.latitude
            targetLng = userLocation.longitude
            targetZoom = 12 // Slightly zoomed in for local context
        }

        if (targetLat && targetLng) {
            setViewState(prev => ({
                ...prev,
                latitude: targetLat,
                longitude: targetLng,
                zoom: targetZoom,
                transitionDuration: 2000 // Smooth fly-to effect
            }))
        }
    }, [trip, availableCities, userLocation])

    // Only render map if token exists
    if (!MAPBOX_TOKEN || !mounted) return null

    // Styles based on theme
    // Dark: Midnight (Navigation Night)
    // Light: Detailed (Streets) or Outdoors
    // Styles based on theme
    // Dark: Midnight (Navigation Night)
    // Light: Detailed (Streets) or Outdoors
    const mapStyle = theme === 'dark' ? MAP_STYLES.midnight : MAP_STYLES.detailed

    const mapContent = (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 0, // Behind content
                pointerEvents: 'none', // Don't steal clicks/scrolls
                opacity: theme === 'dark' ? 0.5 : 0.25 // More transparent in light mode to be subtle
            }}
        >
            <Map
                {...viewState}
                onMove={evt => setViewState(evt.viewState)}
                mapboxAccessToken={MAPBOX_TOKEN}
                mapStyle={mapStyle}
                attributionControl={false}
                interactive={false} // Static background
                reuseMaps
            />
            {/* Gradient Overlay for better text readability */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: theme === 'dark'
                        ? 'linear-gradient(to bottom, rgba(15, 23, 42, 0.4), rgba(15, 23, 42, 0.85))'
                        : 'linear-gradient(to bottom, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.9))',
                    pointerEvents: 'none'
                }}
            />
        </div>
    )

    // Use portal to break out of any transform/overflow containment (e.g. framer-motion in TravelLayout)
    // Try to find the specific layout portal root first, fallback to body
    const portalRoot = document.getElementById('travel-map-portal') || document.body
    return ReactDOM.createPortal(mapContent, portalRoot)
}

export default TravelBackgroundMap
