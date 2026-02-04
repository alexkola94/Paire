import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiNavigation, FiExternalLink } from 'react-icons/fi'
import { generateTransportLink } from '../utils/transportLinks'
import { transportBookingService } from '../../services/api'
import { searchFlights as kiwiSearchFlights } from '../services/kiwiTequilaService'
import { searchFlights as skyscannerSearchFlights, resolveToIata } from '../services/skyscannerService'
import { searchRoutesByPlaces } from '../services/tripGoService'
import TransportSearchResults from './TransportSearchResults'
import '../styles/TransportBookingStep.css'

// Transport type icons (inline SVG-like via emoji for simplicity and zero-dep)
const TRANSPORT_ICONS = {
  flight: '\u2708\uFE0F',  // airplane
  bus: '\uD83D\uDE8C',      // bus
  ferry: '\u26F4\uFE0F'     // ferry
}

/**
 * TransportBookingStep
 *
 * Shared step component used by TripSetupWizard (single-destination)
 * and MultiCityTripWizard (multi-city legs).
 *
 * Props (single-destination mode):
 *   origin, destination, startDate, endDate, originLoading
 *
 * Props (multi-city mode):
 *   legs: [{ from, to, startDate, endDate, transportMode }]
 */
const TransportBookingStep = ({
  // Single-destination props
  origin,
  destination,
  startDate,
  endDate,
  originLoading,
  // Multi-city props
  legs
}) => {
  const { t } = useTranslation()
  const [selectedType, setSelectedType] = useState(null)
  // Which transport APIs are configured on the backend (controls "Search prices" visibility)
  const [providers, setProviders] = useState({ kiwi: false, skyscanner: false, tripGo: false })
  // In-app search: which provider's results we show, and data
  const [searchProvider, setSearchProvider] = useState(null)
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')

  const isMultiCity = Array.isArray(legs) && legs.length > 0

  // Fetch which providers are configured so we can show/hide "Search prices" buttons
  useEffect(() => {
    transportBookingService.getProviders().then(setProviders).catch(() => setProviders({ kiwi: false, skyscanner: false, tripGo: false }))
  }, [])

  const runFlightSearch = useCallback(async (provider) => {
    setSearchProvider(provider)
    setSearchLoading(true)
    setSearchError('')
    setSearchResults([])
    try {
      if (provider === 'kiwi') {
        const list = await kiwiSearchFlights({
          flyFrom: origin || '',
          flyTo: destination || '',
          dateFrom: startDate || '',
          dateTo: startDate || endDate || '',
          returnFrom: endDate || undefined,
          returnTo: endDate || undefined,
          adults: 1
        })
        setSearchResults(list || [])
      } else if (provider === 'skyscanner') {
        const originIata = resolveToIata(origin || '')
        const destIata = resolveToIata(destination || '')
        if (!originIata || !destIata) {
          setSearchError(t('travel.transportBooking.errorOriginDest', 'Could not resolve origin or destination for Skyscanner.'))
          return
        }
        const list = await skyscannerSearchFlights({
          originIata,
          destinationIata,
          outboundDate: startDate || endDate || '',
          returnDate: endDate || undefined,
          adults: 1
        })
        setSearchResults(list || [])
      }
    } catch (err) {
      setSearchError(err?.message || String(err))
    } finally {
      setSearchLoading(false)
    }
  }, [origin, destination, startDate, endDate, t])

  const runBusSearch = useCallback(async () => {
    setSearchProvider('tripgo')
    setSearchLoading(true)
    setSearchError('')
    setSearchResults([])
    try {
      const list = await searchRoutesByPlaces({
        fromPlace: origin || destination || '',
        toPlace: destination || origin || '',
        departAfter: startDate ? Math.floor(new Date(startDate).getTime() / 1000) : undefined
      })
      setSearchResults(list || [])
    } catch (err) {
      setSearchError(err?.message || String(err))
    } finally {
      setSearchLoading(false)
    }
  }, [origin, destination, startDate])

  const handleBook = useCallback((url) => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }, [])

  // --- Single-destination mode ---
  if (!isMultiCity) {
    const transportTypes = ['flight', 'bus', 'ferry']
    const providerLinks = selectedType
      ? generateTransportLink(selectedType, { origin, destination, startDate, endDate })
      : []

    const showSearchResultsFor = selectedType === 'flight' ? (searchProvider === 'kiwi' || searchProvider === 'skyscanner') : (selectedType === 'bus' && searchProvider === 'tripgo')

    return (
      <div className="wizard-step">
        <h3>{t('travel.transportBooking.title', 'Book Transport')}</h3>
        <p className="step-description">
          {t('travel.transportBooking.description', 'Choose a transport type and find tickets from top providers')}
        </p>

        <div className="transport-origin-status">
          <FiNavigation size={14} />
          {originLoading ? (
            <>
              <span className="transport-origin-spinner" />
              <span>{t('travel.transportBooking.originDetecting', 'Detecting your location...')}</span>
            </>
          ) : origin ? (
            <span>
              {t('travel.transportBooking.originFrom', 'From')}{' '}
              <span className="origin-name">{origin}</span>
            </span>
          ) : (
            <span>{t('travel.transportBooking.originUnknown', 'Origin not detected — providers will show search')}</span>
          )}
        </div>

        <div className="transport-type-selector">
          {transportTypes.map((type) => (
            <button
              key={type}
              className={`transport-type-btn ${selectedType === type ? 'active' : ''}`}
              onClick={() => {
                setSelectedType(selectedType === type ? null : type)
                setSearchProvider(null)
                setSearchError('')
                setSearchResults([])
              }}
            >
              <span>{TRANSPORT_ICONS[type]}</span>
              <span>{t(`travel.transportBooking.${type}`, type.charAt(0).toUpperCase() + type.slice(1))}</span>
            </button>
          ))}
        </div>

        {providerLinks.length > 0 && (
          <div className="transport-cta-list">
            {providerLinks.map((link) => {
              const canSearchPrices = selectedType === 'flight' && ((link.provider === 'kiwi' && providers.kiwi) || (link.provider === 'skyscanner' && providers.skyscanner))
              return (
                <div key={link.provider} className="transport-cta-card">
                  <div className="transport-cta-card-info">
                    <span className="transport-cta-provider">{link.label}</span>
                    <span className="transport-cta-route">
                      {origin ? `${origin} → ${destination}` : destination}
                    </span>
                  </div>
                  <div className="transport-cta-actions">
                    {canSearchPrices && (
                      <button
                        type="button"
                        className="transport-cta-link transport-cta-search-prices"
                        disabled={searchLoading}
                        onClick={() => {
                          if (link.provider === 'kiwi') runFlightSearch('kiwi')
                          else if (link.provider === 'skyscanner') runFlightSearch('skyscanner')
                        }}
                      >
                        {t('travel.transportBooking.searchPrices', 'Search prices')}
                      </button>
                    )}
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transport-cta-link"
                    >
                      {t('travel.transportBooking.openInNewTab', 'Search')}
                      <FiExternalLink size={14} />
                    </a>
                  </div>
                </div>
              )
            })}
            {selectedType === 'bus' && providers.tripGo && !providerLinks.some((l) => l.provider === 'tripgo') && (
              <div className="transport-cta-card">
                <div className="transport-cta-card-info">
                  <span className="transport-cta-provider">TripGo</span>
                  <span className="transport-cta-route">{origin ? `${origin} → ${destination}` : destination}</span>
                </div>
                <div className="transport-cta-actions">
                  <button
                    type="button"
                    className="transport-cta-link transport-cta-search-prices"
                    disabled={searchLoading}
                    onClick={runBusSearch}
                  >
                    {t('travel.transportBooking.searchPrices', 'Search prices')}
                  </button>
                  <a
                    href={providerLinks[0]?.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transport-cta-link"
                  >
                    {t('travel.transportBooking.openInNewTab', 'Search')}
                    <FiExternalLink size={14} />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {showSearchResultsFor && (
          <TransportSearchResults
            results={searchResults}
            loading={searchLoading}
            error={searchError}
            onBook={handleBook}
          />
        )}

        <div className="transport-skip-hint">
          {t('travel.transportBooking.skipHint', 'This step is optional — you can book transport later')}
        </div>
      </div>
    )
  }

  // --- Multi-city mode ---
  const bookableTypes = ['flight', 'bus', 'ferry']
  const [legSearchKey, setLegSearchKey] = useState(null) // e.g. "0-kiwi" or "1-tripgo"
  const [legSearchResults, setLegSearchResults] = useState([])
  const [legSearchLoading, setLegSearchLoading] = useState(false)
  const [legSearchError, setLegSearchError] = useState('')

  const runLegFlightSearch = useCallback(async (legIndex, provider) => {
    const leg = legs[legIndex]
    if (!leg) return
    setLegSearchKey(`${legIndex}-${provider}`)
    setLegSearchLoading(true)
    setLegSearchError('')
    setLegSearchResults([])
    try {
      if (provider === 'kiwi') {
        const list = await kiwiSearchFlights({
          flyFrom: leg.from,
          flyTo: leg.to,
          dateFrom: leg.startDate || '',
          dateTo: leg.startDate || leg.endDate || '',
          returnFrom: leg.endDate || undefined,
          returnTo: leg.endDate || undefined,
          adults: 1
        })
        setLegSearchResults(list || [])
      } else if (provider === 'skyscanner') {
        const originIata = resolveToIata(leg.from || '')
        const destIata = resolveToIata(leg.to || '')
        if (!originIata || !destIata) {
          setLegSearchError(t('travel.transportBooking.errorOriginDest', 'Could not resolve origin or destination.'))
          return
        }
        const list = await skyscannerSearchFlights({
          originIata,
          destinationIata,
          outboundDate: leg.startDate || leg.endDate || '',
          returnDate: leg.endDate || undefined,
          adults: 1
        })
        setLegSearchResults(list || [])
      }
    } catch (err) {
      setLegSearchError(err?.message || String(err))
    } finally {
      setLegSearchLoading(false)
    }
  }, [legs, t])

  const runLegBusSearch = useCallback(async (legIndex) => {
    const leg = legs[legIndex]
    if (!leg) return
    setLegSearchKey(`${legIndex}-tripgo`)
    setLegSearchLoading(true)
    setLegSearchError('')
    setLegSearchResults([])
    try {
      const list = await searchRoutesByPlaces({
        fromPlace: leg.from || leg.to || '',
        toPlace: leg.to || leg.from || '',
        departAfter: leg.startDate ? Math.floor(new Date(leg.startDate).getTime() / 1000) : undefined
      })
      setLegSearchResults(list || [])
    } catch (err) {
      setLegSearchError(err?.message || String(err))
    } finally {
      setLegSearchLoading(false)
    }
  }, [legs])

  const handleLegBook = useCallback((url) => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }, [])

  return (
    <div className="wizard-step">
      <h3>{t('travel.transportBooking.title', 'Book Transport')}</h3>
      <p className="step-description">
        {t('travel.transportBooking.multiCityDescription', 'Find booking links for each leg of your trip')}
      </p>

      <div className="transport-leg-list">
        {legs.map((leg, index) => {
          const isBookable = bookableTypes.includes(leg.transportMode)
          const links = isBookable
            ? generateTransportLink(leg.transportMode, {
                origin: leg.from,
                destination: leg.to,
                startDate: leg.startDate,
                endDate: leg.endDate
              })
            : []
          const legKey = `${index}-`
          const showResults = legSearchKey != null && legSearchKey.startsWith(legKey)
          const isFlight = leg.transportMode === 'flight'
          const isBus = leg.transportMode === 'bus'

          return (
            <div key={index} className="transport-leg-card">
              <div className="transport-leg-header">
                <span className="transport-leg-number">{index + 1}</span>
                <span className="transport-leg-route">
                  {leg.from} → {leg.to}
                </span>
                <span className="transport-leg-mode">
                  {TRANSPORT_ICONS[leg.transportMode] || ''} {leg.transportMode || '—'}
                </span>
              </div>

              {isBookable && links.length > 0 ? (
                <>
                  <div className="transport-leg-ctas">
                    {isFlight && links.find((l) => l.provider === 'kiwi') && providers.kiwi && (
                      <button
                        type="button"
                        className="transport-cta-link transport-cta-search-prices"
                        disabled={legSearchLoading}
                        onClick={() => runLegFlightSearch(index, 'kiwi')}
                      >
                        {t('travel.transportBooking.searchPrices', 'Search prices')} – Kiwi
                      </button>
                    )}
                    {isFlight && links.find((l) => l.provider === 'skyscanner') && providers.skyscanner && (
                      <button
                        type="button"
                        className="transport-cta-link transport-cta-search-prices"
                        disabled={legSearchLoading}
                        onClick={() => runLegFlightSearch(index, 'skyscanner')}
                      >
                        {t('travel.transportBooking.searchPrices', 'Search prices')} – Skyscanner
                      </button>
                    )}
                    {isBus && providers.tripGo && (
                      <button
                        type="button"
                        className="transport-cta-link transport-cta-search-prices"
                        disabled={legSearchLoading}
                        onClick={() => runLegBusSearch(index)}
                      >
                        {t('travel.transportBooking.searchPrices', 'Search prices')} – TripGo
                      </button>
                    )}
                    {links.map((link) => (
                      <a
                        key={link.provider}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transport-cta-link"
                      >
                        {link.label}
                        <FiExternalLink size={12} />
                      </a>
                    ))}
                  </div>
                  {showResults && (
                    <TransportSearchResults
                      results={legSearchResults}
                      loading={legSearchLoading}
                      error={legSearchError}
                      onBook={handleLegBook}
                    />
                  )}
                </>
              ) : (
                <span className="transport-leg-no-link">
                  {t('travel.transportBooking.noBookingLink', 'No booking link for this transport mode')}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className="transport-skip-hint">
        {t('travel.transportBooking.skipHint', 'This step is optional — you can book transport later')}
      </div>
    </div>
  )
}

export default TransportBookingStep
