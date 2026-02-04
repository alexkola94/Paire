import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiNavigation, FiExternalLink } from 'react-icons/fi'
import { generateTransportLink } from '../utils/transportLinks'
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

  const isMultiCity = Array.isArray(legs) && legs.length > 0

  // --- Single-destination mode ---
  if (!isMultiCity) {
    const transportTypes = ['flight', 'bus', 'ferry']

    const providerLinks = selectedType
      ? generateTransportLink(selectedType, { origin, destination, startDate, endDate })
      : []

    return (
      <div className="wizard-step">
        <h3>{t('travel.transportBooking.title', 'Book Transport')}</h3>
        <p className="step-description">
          {t('travel.transportBooking.description', 'Choose a transport type and find tickets from top providers')}
        </p>

        {/* Origin status */}
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

        {/* Transport type selector */}
        <div className="transport-type-selector">
          {transportTypes.map((type) => (
            <button
              key={type}
              className={`transport-type-btn ${selectedType === type ? 'active' : ''}`}
              onClick={() => setSelectedType(selectedType === type ? null : type)}
            >
              <span>{TRANSPORT_ICONS[type]}</span>
              <span>{t(`travel.transportBooking.${type}`, type.charAt(0).toUpperCase() + type.slice(1))}</span>
            </button>
          ))}
        </div>

        {/* Provider CTA cards */}
        {providerLinks.length > 0 && (
          <div className="transport-cta-list">
            {providerLinks.map((link) => (
              <div key={link.provider} className="transport-cta-card">
                <div className="transport-cta-card-info">
                  <span className="transport-cta-provider">{link.label}</span>
                  <span className="transport-cta-route">
                    {origin ? `${origin} → ${destination}` : destination}
                  </span>
                </div>
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
            ))}
          </div>
        )}

        <div className="transport-skip-hint">
          {t('travel.transportBooking.skipHint', 'This step is optional — you can book transport later')}
        </div>
      </div>
    )
  }

  // --- Multi-city mode ---
  const bookableTypes = ['flight', 'bus', 'ferry']

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
                <div className="transport-leg-ctas">
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
