import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiAlertTriangle, FiShield, FiInfo, FiChevronRight, FiX } from 'react-icons/fi'
import { AnimatePresence, motion } from 'framer-motion'
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
const TravelAdvisoryCard = ({ advisory, advisories, compact = false }) => {
  const { t } = useTranslation()
  const [showDetails, setShowDetails] = useState(false)
  // Track which advisory is visible in the mini carousel
  const [currentIndex, setCurrentIndex] = useState(0)
  // Track direction for a more intuitive slide animation (-1 = left, 1 = right)
  const [slideDirection, setSlideDirection] = useState(1)

  const advisoryList = Array.isArray(advisories) && advisories.length > 0
    ? advisories
    : advisory
      ? [advisory]
      : []

  const current = advisoryList[currentIndex] || advisoryList[0]

  // Simple helpers so we keep the onClick handlers small & readable.
  const handlePrev = () => {
    if (advisoryList.length === 0) return

    setSlideDirection(-1)
    setCurrentIndex((prev) => (prev - 1 + advisoryList.length) % advisoryList.length)
  }

  const handleNext = () => {
    if (advisoryList.length === 0) return

    setSlideDirection(1)
    setCurrentIndex((prev) => (prev + 1) % advisoryList.length)
  }

  if (!current) {
    return null
  }

  const {
    countryName,
    level,
    score,
    message,
    updated,
    sourcesActive,
    advisoryText,
    advisoryLongDescription,
    climateSummary,
    entryExitSummary,
    healthSummary,
    safetySummary,
    recentUpdates,
    hasAdvisoryWarning,
    hasRegionalAdvisory,
    climateHighlights = [],
    entryExitHighlights = [],
    healthHighlights = [],
    safetyHighlights = []
  } = current
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

  const hasAnyHighlights =
    climateHighlights.length > 0 ||
    entryExitHighlights.length > 0 ||
    healthHighlights.length > 0 ||
    safetyHighlights.length > 0

  const hasAnySummaries =
    !!advisoryLongDescription ||
    !!climateSummary ||
    !!entryExitSummary ||
    !!healthSummary ||
    !!safetySummary ||
    !!recentUpdates

  const hasAnyDetails = hasAnyHighlights || hasAnySummaries || !!advisoryText

  return (
    <>
      <div
        className={`travel-advisory-card travel-glass-card ${compact ? 'travel-advisory-card-compact' : ''}`}
      >
        {/* Navigation arrows stay fixed so only the content slides */}
        {advisoryList.length > 1 && (
          <div className="travel-advisory-nav">
            <motion.button
              type="button"
              className="travel-advisory-nav-btn"
              onClick={handlePrev}
              aria-label={t('travel.advisory.prevCountry', 'Previous country')}
              whileTap={{ scale: 0.9 }}
              whileHover={{ y: -1 }}
              transition={{ duration: 0.15 }}
            >
              ‹
            </motion.button>
            <span className="travel-advisory-nav-indicator">
              {currentIndex + 1} / {advisoryList.length}
            </span>
            <motion.button
              type="button"
              className="travel-advisory-nav-btn"
              onClick={handleNext}
              aria-label={t('travel.advisory.nextCountry', 'Next country')}
              whileTap={{ scale: 0.9 }}
              whileHover={{ y: -1 }}
              transition={{ duration: 0.15 }}
            >
              ›
            </motion.button>
          </div>
        )}

        {/* AnimatePresence + motion.div give us a soft slide effect between advisories */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentIndex}
            className="travel-advisory-slide"
            initial={{ opacity: 0, x: slideDirection === 1 ? 32 : -32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: slideDirection === 1 ? -32 : 32 }}
            transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
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
              {/* Compact strips (e.g. Explore, Documents) don't render the meta row,
                so we offer a small inline "Details" trigger in the header. */}
              {compact && hasAnyDetails && (
                <button
                  type="button"
                  className="travel-advisory-header-more"
                  onClick={() => setShowDetails(true)}
                >
                  <span>{t('travel.advisory.details', 'Details')}</span>
                  <FiChevronRight size={12} />
                </button>
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

                  {hasAnyDetails && (
                    <button
                      type="button"
                      className="travel-advisory-more-btn"
                      onClick={() => setShowDetails(true)}
                    >
                      <span>
                        {t('travel.advisory.moreDetails', 'More safety & entry info')}
                      </span>
                      <FiChevronRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

      </div>

      {/* Details modal – rendered in a portal so it sits above all other
          travel overlays (route sheets, maps, etc.) just like the Add Event modal. */}
      {typeof window !== 'undefined' &&
        createPortal(
          (
            <AnimatePresence>
              {showDetails && hasAnyDetails && (
                <motion.div
                  className="travel-advisory-modal-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowDetails(false)}
                >
                  <motion.div
                    className="travel-advisory-modal"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.25 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="travel-advisory-modal-header">
                      <div className="travel-advisory-modal-title">
                        <span className="travel-advisory-modal-country">
                          {countryName || t('travel.advisory.unknownCountry', 'Unknown country')}
                        </span>
                        <span className={`travel-advisory-level-badge ${levelConfig.className}`}>
                          {levelConfig.label}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="travel-advisory-modal-close"
                        onClick={() => setShowDetails(false)}
                        aria-label={t('common.close', 'Close')}
                      >
                        <FiX size={18} />
                      </button>
                    </div>

                    <div className="travel-advisory-modal-body">
                      {(advisoryText || advisoryLongDescription) && (
                        <section className="advisory-section-block advisory-section-overview">
                          {advisoryText && (
                            <p className="advisory-overview-title">{advisoryText}</p>
                          )}
                          {advisoryLongDescription && (
                            <p className="advisory-overview-text">{advisoryLongDescription}</p>
                          )}
                        </section>
                      )}

                      {(hasAdvisoryWarning || hasRegionalAdvisory) && (
                        <section className="advisory-section-block advisory-section-flags">
                          <div className="advisory-flags-row">
                            {hasAdvisoryWarning && (
                              <span className="advisory-flag-chip warning">
                                {t('travel.advisory.flagWarning', 'Official warning in place')}
                              </span>
                            )}
                            {hasRegionalAdvisory && (
                              <span className="advisory-flag-chip regional">
                                {t('travel.advisory.flagRegional', 'Includes regional advisories')}
                              </span>
                            )}
                          </div>
                        </section>
                      )}

                      {entryExitHighlights.length > 0 && (
                        <section className="advisory-section-block">
                          <h4>{t('travel.advisory.entryExitTitle', 'Entry & exit')}</h4>
                          {entryExitSummary && (
                            <p className="advisory-section-summary">{entryExitSummary}</p>
                          )}
                          <ul>
                            {entryExitHighlights.map((text, idx) => (
                              <li key={idx}>{text}</li>
                            ))}
                          </ul>
                        </section>
                      )}

                      {healthHighlights.length > 0 && (
                        <section className="advisory-section-block">
                          <h4>{t('travel.advisory.healthTitle', 'Health & vaccines')}</h4>
                          {healthSummary && (
                            <p className="advisory-section-summary">{healthSummary}</p>
                          )}
                          <ul>
                            {healthHighlights.map((text, idx) => (
                              <li key={idx}>{text}</li>
                            ))}
                          </ul>
                        </section>
                      )}

                      {safetyHighlights.length > 0 && (
                        <section className="advisory-section-block">
                          <h4>{t('travel.advisory.safetyTitle', 'Safety & security')}</h4>
                          {safetySummary && (
                            <p className="advisory-section-summary">{safetySummary}</p>
                          )}
                          <ul>
                            {safetyHighlights.map((text, idx) => (
                              <li key={idx}>{text}</li>
                            ))}
                          </ul>
                        </section>
                      )}

                      {climateHighlights.length > 0 && (
                        <section className="advisory-section-block">
                          <h4>{t('travel.advisory.climateTitle', 'Climate & weather')}</h4>
                          {climateSummary && (
                            <p className="advisory-section-summary">{climateSummary}</p>
                          )}
                          <ul>
                            {climateHighlights.map((text, idx) => (
                              <li key={idx}>{text}</li>
                            ))}
                          </ul>
                        </section>
                      )}

                      {recentUpdates && (
                        <section className="advisory-section-block advisory-section-updates">
                          <h4>{t('travel.advisory.recentUpdatesTitle', 'Recent updates')}</h4>
                          <p>{recentUpdates}</p>
                        </section>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          ),
          document.body
        )}
    </>
  )
}

export default TravelAdvisoryCard
