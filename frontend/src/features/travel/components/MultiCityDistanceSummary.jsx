import { useTranslation } from 'react-i18next'
import { getTransportSuggestions, TRANSPORT_MODES } from '../utils/transportSuggestion'

/**
 * MultiCityDistanceSummary
 * ------------------------
 * Extracted distance panel for Step 1 of the multi‑city wizard.
 *
 * Responsibilities:
 * - Show optional legs: Home → first city, last city → Home (read‑only summary).
 * - Show each leg between consecutive cities with:
 *   - distance in km
 *   - per‑leg transport selector
 *   - \"sea‑like\" hint when routing falls back to straight line over water.
 * - Compute the total trip distance, including optional home legs.
 *
 * Keeping this logic in a dedicated component makes the main wizard layout
 * lighter and easier to scroll, and keeps the distance / transport behaviour
 * reusable for future views.
 */
const MultiCityDistanceSummary = ({
  cities,
  orderedCities,
  routeDistances,
  routeLegMeta,
  homeLocation,
  homeToFirstDistance,
  lastToHomeDistance,
  getDistanceKm,
  onCityTransportChange,
  returnTransportMode,
  onReturnTransportChange,
  routesLoading
}) => {
  const { t } = useTranslation()

  if (!orderedCities || orderedCities.length === 0) {
    return null
  }

  // Pre-calculate suggestions for return leg
  const returnLegSuggestions = getTransportSuggestions({ distanceKm: lastToHomeDistance })
  const returnLegAllowedModes = returnLegSuggestions.length > 0 ? returnLegSuggestions : TRANSPORT_MODES

  const lastCityMode = orderedCities.length > 0 ? orderedCities[orderedCities.length - 1].transportMode : null

  const returnLegMode =
    returnTransportMode && returnLegAllowedModes.includes(returnTransportMode)
      ? returnTransportMode
      : (lastCityMode && returnLegAllowedModes.includes(lastCityMode))
        ? lastCityMode
        : returnLegAllowedModes[0] || TRANSPORT_MODES[0]

  // Helper to render a single leg item (reusable for context & main legs)
  const renderLegItem = ({
    key,
    stepFrom,
    stepTo,
    cityFrom,
    cityTo,
    distanceKm,
    currentMode,
    onModeChange,
    isContext = false
  }) => {
    if (!distanceKm) return null

    // Calculate suggestions based on distance
    const suggestions = getTransportSuggestions({ distanceKm })
    // If it's a "sea-like" leg (long distance over water fallback), restrict content
    // Note: We'd need the "meta" to know if it's strictly sea-like, but for context 
    // legs we might just use distance heuristics or pass a flag.
    // For now, simple heuristic: if > 20km and strictly context, we assume standard options.
    // Ideally we pass "isSeaLike" if we have that metadata.

    const baseSuggestions = suggestions.length > 0 ? suggestions : TRANSPORT_MODES
    // Ensure current mode is valid, else fallback
    const validMode = currentMode && baseSuggestions.includes(currentMode)
      ? currentMode
      : (baseSuggestions[0] || 'driving')

    // Common styles for context vs main
    const containerStyle = isContext ? {
      opacity: 0.85,
      borderStyle: 'dashed',
      backgroundColor: 'rgba(128, 128, 128, 0.05)'
    } : {}

    return (
      <div key={key} className="city-distance-item" style={containerStyle}>
        <div className="distance-main">
          <div className="distance-route">
            <span className="distance-step" style={isContext ? { background: '#64748b' } : {}}>
              {stepFrom}
            </span>
            <span className="distance-arrow">→</span>
            <span className="distance-step" style={isContext ? { background: '#64748b' } : {}}>
              {stepTo}
            </span>
          </div>
          <div className="distance-cities">
            <span className="distance-city-from">{cityFrom}</span>
            <span className="distance-arrow-small">→</span>
            <span className="distance-city-to">{cityTo}</span>
          </div>
          <div className="distance-value">{Math.round(distanceKm).toLocaleString()} km</div>
        </div>

        {/* Transport selector */}
        <div className="transport-leg-row">
          <div className="transport-mode-pill" style={isContext ? { background: 'transparent', borderColor: 'rgba(148, 163, 184, 0.3)' } : {}}>
            <span className="transport-label">{t('travel.multiCity.step1.transportLabel', 'Transport')}</span>
            <span className="transport-current-mode">{t(`transport.mode.${validMode}`, validMode)}</span>
          </div>
          <div className="transport-select-wrapper">
            <select
              className="transport-mode-select"
              value={validMode}
              onChange={(e) => onModeChange && onModeChange(e.target.value)}
              disabled={!onModeChange}
            >
              {TRANSPORT_MODES.map(mode => (
                <option key={mode} value={mode}>
                  {t(`transport.mode.${mode}`, mode)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="cities-distance-summary">
      {routesLoading && (
        <div className="route-loading-hint">
          {t('travel.multiCity.step1.calculatingRoutes', 'Calculating best routes...')}
        </div>
      )}

      {/* START CONTEXT: Home -> First City */}
      {homeToFirstDistance > 0 && homeLocation && orderedCities.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-secondary)',
            marginBottom: '0.5rem',
            paddingLeft: '0.5rem'
          }}>
            {t('travel.multiCity.context.start', 'Getting There')}
          </div>
          {renderLegItem({
            key: 'home-start',
            stepFrom: 'H',
            stepTo: 1,
            cityFrom: 'Home',
            cityTo: orderedCities[0].name,
            distanceKm: homeToFirstDistance,
            currentMode: orderedCities[0].transportMode, // Use first city's arrival mode
            onModeChange: (mode) => onCityTransportChange(orderedCities[0].id, mode),
            isContext: true
          })}
        </div>
      )}

      {/* MAIN TRIP: City -> City */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text-secondary)',
          marginBottom: '0.5rem',
          paddingLeft: '0.5rem'
        }}>
          {t('travel.multiCity.context.main', 'Trip Itinerary')}
        </div>

        {orderedCities.map((city, index) => {
          if (index === 0) return null // Skip first city (it has no "previous" city in the chain)

          const prev = orderedCities[index - 1]
          const key = `${prev.id}-${city.id}`
          const legMeta = routeLegMeta[key]
          const distance = routeDistances[key] ?? getDistanceKm(prev, city)

          return renderLegItem({
            key: key,
            stepFrom: index, // 1-based index (prev city is at index-1, but displayed as index)
            stepTo: index + 1,
            cityFrom: prev.name,
            cityTo: city.name,
            distanceKm: distance,
            currentMode: city.transportMode,
            onModeChange: (mode) => onCityTransportChange(city.id, mode),
            isContext: false
          })
        })}
      </div>

      {/* END CONTEXT: Last City -> Home */}
      {lastToHomeDistance > 0 && homeLocation && orderedCities.length > 0 && (
        <div>
          <div style={{
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-secondary)',
            marginBottom: '0.5rem',
            paddingLeft: '0.5rem'
          }}>
            {t('travel.multiCity.context.end', 'Return Home')}
          </div>
          {renderLegItem({
            key: 'end-home',
            stepFrom: orderedCities.length,
            stepTo: 'H',
            cityFrom: orderedCities[orderedCities.length - 1].name,
            cityTo: 'Home',
            distanceKm: lastToHomeDistance,
            currentMode: returnLegMode,
            onModeChange: onReturnTransportChange,
            isContext: true
          })}
        </div>
      )}

      {/* Total trip distance */}
      {(() => {
        let totalKm = orderedCities.reduce((total, city, index) => {
          if (index === 0) return total
          const prev = orderedCities[index - 1]
          const key = `${prev.id}-${city.id}`
          const km = routeDistances[key] ?? getDistanceKm(prev, city)
          return total + (km || 0)
        }, 0)

        // Include optional legs
        if (homeToFirstDistance > 0) totalKm += homeToFirstDistance
        if (lastToHomeDistance > 0) totalKm += lastToHomeDistance

        const roundedTotal = Math.round(totalKm)
        if (roundedTotal > 0) {
          return (
            <div className="trip-total-distance">
              <div className="total-distance-label">
                {t('travel.multiCity.step1.totalDistance', 'Total Trip Distance')}
              </div>
              <div className="total-distance-value">
                {roundedTotal.toLocaleString()} km
              </div>
            </div>
          )
        }
        return null
      })()}
    </div>
  )

}

export default MultiCityDistanceSummary

