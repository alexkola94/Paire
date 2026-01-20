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
  routesLoading
}) => {
  const { t } = useTranslation()

  if (!orderedCities || orderedCities.length === 0) {
    return null
  }

  return (
    <div className="cities-distance-summary">
      {routesLoading && (
        <div className="route-loading-hint">
          {t(
            'travel.multiCity.step1.calculatingRoutes',
            'Calculating best routes...'
          )}
        </div>
      )}

      {/* Optional home legs summary when we know the user's location */}
      {(homeToFirstDistance > 0 || lastToHomeDistance > 0) && (
        <div className="home-legs-summary">
          {homeToFirstDistance > 0 && (
            <div className="home-leg-row">
              <span className="home-leg-label">
                {t('travel.home.homeToFirst', 'Home → First city')}
              </span>
              <span className="home-leg-distance">
                {Math.round(homeToFirstDistance).toLocaleString()} km
              </span>
            </div>
          )}
          {lastToHomeDistance > 0 && (
            <div className="home-leg-row">
              <span className="home-leg-label">
                {t('travel.home.lastToHome', 'Last city → Home')}
              </span>
              <span className="home-leg-distance">
                {Math.round(lastToHomeDistance).toLocaleString()} km
              </span>
            </div>
          )}
        </div>
      )}

      {/* Per‑leg rows */}
      {orderedCities.map((city, index) => {
        const isHomeLeg = index === 0

        // For the first city, we only show a leg when we know the user's
        // home location and have a computed distance.
        if (isHomeLeg) {
          if (!homeLocation || homeToFirstDistance <= 0) return null
        } else if (index === 0) {
          // Safety guard – there is no previous city to route from.
          return null
        }

        const prev = isHomeLeg ? null : orderedCities[index - 1]
        const key = !isHomeLeg && prev ? `${prev.id}-${city.id}` : null
        const legMeta = key ? routeLegMeta[key] : null

        const rawKm = isHomeLeg
          ? homeToFirstDistance
          : (legMeta?.distanceKm ??
             routeDistances[key] ??
             getDistanceKm(prev, city))

        if (!rawKm) return null
        const rounded = Math.round(rawKm)

        // If routing fell back to straight-line for a longer leg, we treat it
        // as a \"sea-like\" leg and restrict options to flight / ferry.
        const isSeaLikeLeg = !isHomeLeg && !!legMeta?.usedFallback && rawKm > 20
        const baseSuggestions = getTransportSuggestions({ distanceKm: rawKm })
        const restrictedModes = isSeaLikeLeg ? ['flight', 'ferry'] : baseSuggestions
        const suggestions = restrictedModes.length > 0 ? restrictedModes : baseSuggestions
        const allowedModes = suggestions.length > 0 ? suggestions : TRANSPORT_MODES
        const currentMode =
          city.transportMode && allowedModes.includes(city.transportMode)
            ? city.transportMode
            : allowedModes[0] || TRANSPORT_MODES[0]

        const handleModeChange = (mode) => {
          onCityTransportChange?.(city.id, mode)
        }

        const itemKey = isHomeLeg
          ? `home-${city.id || index}`
          : `${prev.id}-${city.id}`

        return (
          <div key={itemKey} className="city-distance-item">
            <div className="distance-main">
              <div className="distance-route">
                <span className="distance-step">
                  {isHomeLeg ? 'H' : index}
                </span>
                <span className="distance-arrow">→</span>
                <span className="distance-step">{index + 1}</span>
              </div>
              <div className="distance-cities">
                <span className="distance-city-from">
                  {isHomeLeg ? 'Home' : prev.name}
                </span>
                <span className="distance-arrow-small">→</span>
                <span className="distance-city-to">{city.name}</span>
              </div>
              <div className="distance-value">{rounded} km</div>
            </div>

            {/* Transport suggestion + selector */}
            <div className="transport-leg-row">
              <div className="transport-mode-pill">
                <span className="transport-label">
                  {t('travel.multiCity.step1.transportLabel', 'Transport')}
                </span>
                <span className="transport-current-mode">
                  {t(`transport.mode.${currentMode}`, currentMode)}
                </span>
              </div>
              <div className="transport-select-wrapper">
                <select
                  className="transport-mode-select"
                  value={currentMode}
                  onChange={(e) => handleModeChange(e.target.value)}
                >
                  {allowedModes.map(mode => (
                    <option key={mode} value={mode}>
                      {t(`transport.mode.${mode}`, mode)}
                    </option>
                  ))}
                  {/* Fallback: if user had a mode not in suggestions, keep it visible */}
                  {!suggestions.includes(currentMode) && (
                    <option value={currentMode}>
                      {t(`transport.mode.${currentMode}`, currentMode)}
                    </option>
                  )}
                </select>
                <span className="transport-suggestion-text">
                  {t(
                    'travel.multiCity.step1.transportSuggested',
                    'Suggested: {{mode}}',
                    {
                      mode: t(
                        `transport.mode.${suggestions[0] || currentMode}`,
                        suggestions[0] || currentMode
                      )
                    }
                  )}
                </span>
                {isSeaLikeLeg && (
                  <span className="transport-suggestion-text">
                    {t(
                      'travel.multiCity.step1.transportSeaHint',
                      'This leg looks like open water, so only flight or ferry are available.'
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {/* Total trip distance */}
      {(() => {
        // Base: sum all city-to-city legs
        let totalKm = orderedCities.reduce((total, city, index) => {
          if (index === 0) return total
          const prev = orderedCities[index - 1]
          const key = `${prev.id}-${city.id}`
          const km =
            routeDistances[key] ??
            getDistanceKm(prev, city)
          return total + (km || 0)
        }, 0)

        // Include optional legs to and from home when available
        if (homeToFirstDistance > 0) totalKm += homeToFirstDistance
        if (lastToHomeDistance > 0) totalKm += lastToHomeDistance

        const roundedTotal = Math.round(totalKm)
        if (roundedTotal > 0) {
          return (
            <div className="trip-total-distance">
              <div className="total-distance-label">
                {t(
                  'travel.multiCity.step1.totalDistance',
                  'Total Trip Distance'
                )}
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

