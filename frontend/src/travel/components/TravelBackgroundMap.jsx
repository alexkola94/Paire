import React, { useEffect, useState } from 'react'
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

        // Check if coordinates are valid numbers (0 is valid, but null/undefined/NaN are not)
        const isValidLat = (val) => typeof val === 'number' && !isNaN(val)
        const isValidLng = (val) => typeof val === 'number' && !isNaN(val)

        if (isValidLat(targetLat) && isValidLng(targetLng)) {
            setViewState(prev => {
                // Prevent redundant updates
                if (
                    Math.abs(prev.latitude - targetLat) < 0.00001 &&
                    Math.abs(prev.longitude - targetLng) < 0.00001 &&
                    Math.abs(prev.zoom - targetZoom) < 0.1
                ) {
                    return prev
                }

                return {
                    ...prev,
                    latitude: targetLat,
                    longitude: targetLng,
                    zoom: targetZoom,
                    transitionDuration: 2000 // Smooth fly-to effect
                }
            })
        }
    }, [trip, availableCities, userLocation])

    // Only render map if token exists
    if (!MAPBOX_TOKEN || !mounted) return null

    // Theme-based map style: dark = night style; light = full-color Streets (streetsNative for native look)
    const mapStyle = theme === 'dark' ? MAP_STYLES.midnight : MAP_STYLES.streetsNative

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
                opacity: 1 // Full visibility for the map itself
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
            {/* Overlay: dark theme = tint for readability; light theme = transparent so map shows native colors */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: theme === 'dark'
                        ? 'linear-gradient(to bottom, rgba(15, 23, 42, 0.28), rgba(15, 23, 42, 0.55))'
                        : 'transparent',
                    pointerEvents: 'none'
                }}
            />
        </div>
    )

    return mapContent
}

export default TravelBackgroundMap
