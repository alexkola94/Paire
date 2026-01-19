import React from 'react'
import { useTranslation } from 'react-i18next'
import { FiAlertTriangle, FiShield, FiInfo } from 'react-icons/fi'
import '../styles/TravelAdvisory.css'

/**
 * Map advisory level to display properties (color, label, icon).
 * Keeping this in a small helper makes it easy to tweak thresholds later.
 */
const getLevelConfig = (level, t) => {
  const normalized = (level || 'unknown').toLowerCase()

  switch (normalized) {
    case 'low':
      return {
        label: t('travel.advisory.riskLevel.low', 'Low risk'),
        className: 'advisory-level-low',
        icon: FiShield
      }
    case 'medium':
      return {
        label: t('travel.advisory.riskLevel.medium', 'Medium risk'),
        className: 'advisory-level-medium',
        icon: FiAlertTriangle
      }
    case 'high':
      return {
        label: t('travel.advisory.riskLevel.high', 'High risk'),
        className: 'advisory-level-high',
        icon: FiAlertTriangle
      }
    case 'critical':
      return {
        label: t('travel.advisory.riskLevel.critical', 'Critical risk'),
        className: 'advisory-level-critical',
        icon: FiAlertTriangle
      }
    default:
      return {
        label: t('travel.advisory.riskLevel.unknown', 'Risk level unknown'),
        className: 'advisory-level-unknown',
        icon: FiInfo
      }
  }
}

/**
 * TravelAdvisoryCard
 * -------------------
 * Calm, glassy card showing country risk score and a short advisory message.
 * Designed to be reusable on Travel Home, Documents, and Wizard screens.
 */
const TravelAdvisoryCard = ({ advisory, compact = false }) => {
  const { t } = useTranslation()

  if (!advisory) {
    return null
  }

  const { countryName, level, score, message, updated, sourcesActive } = advisory
  const levelConfig = getLevelConfig(level, t)
  const Icon = levelConfig.icon

  // Simple, friendly formatted updated time – keep logic readable.
  const formattedUpdated = React.useMemo(() => {
    if (!updated) return null
    try {
      const date = new Date(updated)
      if (Number.isNaN(date.getTime())) return null
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return null
    }
  }, [updated])

  return (
    <div
      className={`travel-advisory-card travel-glass-card ${compact ? 'travel-advisory-card-compact' : ''}`}
    >
      <div className="travel-advisory-header">
        <div className="travel-advisory-title">
          <Icon className={`travel-advisory-icon ${levelConfig.className}`} size={18} />
          <div className="travel-advisory-title-text">
            <span className="travel-advisory-country">
              {countryName || t('travel.advisory.unknownCountry', 'Unknown country')}
            </span>
            <span className={`travel-advisory-level-badge ${levelConfig.className}`}>
              {levelConfig.label}
            </span>
          </div>
        </div>
        {typeof score === 'number' && (
          <div className="travel-advisory-score-wrapper">
            <span className="travel-advisory-score-label">
              {t('travel.advisory.scoreLabel', 'Risk score')}
            </span>
            <div className="travel-advisory-score-pill">
              <span className="travel-advisory-score-value">
                {score.toFixed(1)}
              </span>
              <span className="travel-advisory-score-max">/ 5</span>
            </div>
          </div>
        )}
      </div>

      {!compact && (
        <div className="travel-advisory-body">
          <p className="travel-advisory-message">
            {message || t('travel.advisory.genericMessage', 'Check official guidance before you travel.')}
          </p>

          <div className="travel-advisory-meta">
            {formattedUpdated && (
              <span className="travel-advisory-updated">
                {t('travel.advisory.lastUpdated', 'Last updated {{date}}', {
                  date: formattedUpdated
                })}
              </span>
            )}
            {sourcesActive > 0 && (
              <span className="travel-advisory-sources">
                {t('travel.advisory.sources', '{{count}} advisory sources', {
                  count: sourcesActive
                })}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default TravelAdvisoryCard

