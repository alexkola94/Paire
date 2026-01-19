import { memo, useCallback, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTravelMode } from '../../context/TravelModeContext'
import POIMarker from './POIMarker'
import { MAP_STYLES, DISCOVERY_MAP_CONFIG } from '../../utils/travelConstants'
import { reverseGeocode } from '../../services/discoveryService'

// react-map-gl v8 requires subpath imports for Mapbox
import { Map, Marker, GeolocateControl } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''

/**
 * DiscoveryMap Component
 * Interactive Mapbox GL map for Discovery Mode
 */
const DiscoveryMap = memo(({
  pois = [],
  stays = [],
  onPOIClick,
  onStayClick,
  selectedPOIId,
  selectedStayId,
  showTripMarker = true,
  mapStyle = 'detailed'
}) => {
  const { activeTrip, mapViewState, updateMapViewState } = useTravelMode()
  const mapRef = useRef(null)
  const longPressTimer = useRef(null)
  const isLongPress = useRef(false)
  const touchStartTime = useRef(0)

  // Initialize view state from trip location if not set
  useEffect(() => {
    if (!mapViewState && activeTrip?.latitude && activeTrip?.longitude) {
      updateMapViewState({
        latitude: activeTrip.latitude,
        longitude: activeTrip.longitude,
        zoom: DISCOVERY_MAP_CONFIG.defaultZoom,
        pitch: 0,
        bearing: 0
      })
    }
  }, [activeTrip, mapViewState, updateMapViewState])

  /**
   * Handle map move/zoom events
   */
  const handleMove = useCallback((evt) => {
    updateMapViewState(evt.viewState)
    // Cancel long press on move
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [updateMapViewState])

  /**
   * Handle map load
   */
  const handleLoad = useCallback(() => {
    if (mapRef.current) {
      // Map is ready
      console.log('Discovery Map loaded')
    }
  }, [])

  /**
   * Handle POI marker click
   */
  const handleMarkerClick = useCallback((poi) => {
    if (onPOIClick) {
      onPOIClick(poi)
    }
  }, [onPOIClick])

  /**
   * Handle Stay/Accommodation marker click
   */
  const handleStayClick = useCallback((stay) => {
    if (onStayClick) {
      onStayClick(stay)
    }
  }, [onStayClick])

  /**
   * Handle Map Click (Tap)
   * Detects clicks on map features (labels)
   */
  const handleMapClick = useCallback(async (evt) => {
    // If it was a long press, ignore click
    if (isLongPress.current) {
      isLongPress.current = false
      return
    }

    // Check for rendered features under cursor
    if (mapRef.current) {
      const features = mapRef.current.queryRenderedFeatures(evt.point)

      // Find POI labels
      const poiFeature = features.find(f =>
        f.layer.id.includes('poi-label') ||
        f.layer.id.includes('transit-label') ||
        f.layer.id.includes('airport-label')
      )

      if (poiFeature && onPOIClick) {
        // Construct temporary POI from feature
        const tempPOI = {
          id: `map-feature-${poiFeature.id || Date.now()}`,
          poiId: `mapbox-feature-${poiFeature.id || Date.now()}`,
          name: poiFeature.properties.name || poiFeature.properties.name_en || 'Unknown Place',
          latitude: evt.lngLat.lat,
          longitude: evt.lngLat.lng,
          category: 'attraction', // Default
          source: 'map_click',
          address: '' // Could reverse geocode if needed
        }
        onPOIClick(tempPOI)
      }
    }
  }, [onPOIClick])

  /**
   * Handle Long Press (Drop Pin)
   */
  const handleLongPress = useCallback(async (lngLat) => {
    isLongPress.current = true

    // Reverse geocode to get details
    const result = await reverseGeocode(lngLat.lat, lngLat.lng)

    if (result && onPOIClick) {
      // Add "Dropped Pin" label if name is generic
      if (!result.name || result.name === 'Unknown Location') {
        result.name = 'Dropped Pin'
      }
      onPOIClick(result)
    }
  }, [onPOIClick])

  const onMouseDown = useCallback((evt) => {
    longPressTimer.current = setTimeout(() => {
      handleLongPress(evt.lngLat)
    }, 500) // 500ms for long press
  }, [handleLongPress])

  const onMouseUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const onTouchStart = useCallback((evt) => {
    touchStartTime.current = Date.now()
    // Get touch coordinates (simplified)
    const touch = evt.points[0]
    longPressTimer.current = setTimeout(() => {
      handleLongPress(touch)
    }, 500)
  }, [handleLongPress])

  const onTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  // Don't render if no token or coordinates
  if (!MAPBOX_TOKEN) {
    return (
      <div className="discovery-map-error">
        <p>Map not available. Mapbox token not configured.</p>
      </div>
    )
  }

  if (!mapViewState && (!activeTrip?.latitude || !activeTrip?.longitude)) {
    return (
      <div className="discovery-map-error">
        <p>No location available for map.</p>
      </div>
    )
  }

  const viewState = mapViewState || {
    latitude: activeTrip?.latitude || 0,
    longitude: activeTrip?.longitude || 0,
    zoom: DISCOVERY_MAP_CONFIG.defaultZoom
  }

  return (
    <motion.div
      className="discovery-map-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Map
        ref={mapRef}
        {...viewState}
        onMove={handleMove}
        onLoad={handleLoad}
        onClick={handleMapClick}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={MAP_STYLES[mapStyle] || MAP_STYLES.detailed}
        style={{ width: '100%', height: '100%' }}
        minZoom={DISCOVERY_MAP_CONFIG.minZoom}
        maxZoom={DISCOVERY_MAP_CONFIG.maxZoom}
        attributionControl={false}
        reuseMaps
      >
        {/* Navigation controls (zoom buttons) - hidden, we use custom */}

        {/* Geolocate control */}
        <GeolocateControl
          position="bottom-right"
          trackUserLocation
          showAccuracyCircle={false}
          style={{ display: 'none' }} // Hidden, controlled by DiscoveryControls
        />

        {/* Trip center marker */}
        {showTripMarker && activeTrip?.latitude && activeTrip?.longitude && (
          <Marker
            latitude={activeTrip.latitude}
            longitude={activeTrip.longitude}
            anchor="center"
          >
            <div className="trip-center-marker">
              <div className="trip-marker-pulse" />
              <div className="trip-marker-dot" />
            </div>
          </Marker>
        )}

        {/* POI markers */}
        {pois.map((poi, index) => (
          <Marker
            key={poi.id || poi.poiId || index}
            latitude={poi.latitude}
            longitude={poi.longitude}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation()
              handleMarkerClick(poi)
            }}
          >
            <POIMarker
              poi={poi}
              isSelected={selectedPOIId === poi.id || selectedPOIId === poi.poiId}
              index={index}
            />
          </Marker>
        ))}

        {/* Accommodation/Stay markers */}
        {stays.map((stay, index) => (
          <Marker
            key={stay.id || `stay-${index}`}
            latitude={stay.latitude}
            longitude={stay.longitude}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation()
              handleStayClick(stay)
            }}
          >
            <div
              className={`stay-marker ${selectedStayId === stay.id ? 'selected' : ''}`}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: selectedStayId === stay.id
                  ? 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)'
                  : 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                border: selectedStayId === stay.id
                  ? '3px solid white'
                  : '2px solid rgba(255, 255, 255, 0.8)',
                boxShadow: selectedStayId === stay.id
                  ? '0 4px 16px rgba(155, 89, 182, 0.5)'
                  : '0 2px 8px rgba(0, 0, 0, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                transform: selectedStayId === stay.id ? 'scale(1.15)' : 'scale(1)'
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 7v11a2 2 0 002 2h14a2 2 0 002-2V7" />
                <path d="M21 7H3a2 2 0 01-2-2V4a2 2 0 012-2h18a2 2 0 012 2v1a2 2 0 01-2 2z" />
                <path d="M3 11h18" />
              </svg>
            </div>
          </Marker>
        ))}
      </Map>
    </motion.div>
  )
})

DiscoveryMap.displayName = 'DiscoveryMap'

export default DiscoveryMap
