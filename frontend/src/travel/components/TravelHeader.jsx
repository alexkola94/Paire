import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { FiRefreshCw, FiMapPin, FiCalendar } from 'react-icons/fi'
import { RiPlaneLine } from 'react-icons/ri'
import { useTravelMode } from '../context/TravelModeContext'
import '../styles/TravelLayout.css'

/**
 * Travel Header Component
 * Shows trip info, sync status, and exit button
 */
const TravelHeader = memo(({ trip, syncStatus }) => {
  const { t } = useTranslation()
  const { exitTravelMode } = useTravelMode()

  // Format date range for display
  const formatDateRange = () => {
    if (!trip?.startDate || !trip?.endDate) return null

    const start = new Date(trip.startDate)
    const end = new Date(trip.endDate)

    const options = { month: 'short', day: 'numeric' }
    const startStr = start.toLocaleDateString(undefined, options)
    const endStr = end.toLocaleDateString(undefined, options)

    return `${startStr} - ${endStr}`
  }

  // Calculate days until trip or days remaining
  const getTripStatus = () => {
    if (!trip?.startDate || !trip?.endDate) return null

    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const start = new Date(trip.startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(trip.endDate)
    end.setHours(0, 0, 0, 0)

    if (now < start) {
      const daysUntil = Math.ceil((start - now) / (1000 * 60 * 60 * 24))
      return { type: 'upcoming', days: daysUntil }
    } else if (now <= end) {
      const daysRemaining = Math.ceil((end - now) / (1000 * 60 * 60 * 24)) + 1
      return { type: 'active', days: daysRemaining }
    } else {
      return { type: 'completed', days: 0 }
    }
  }

  const tripStatus = getTripStatus()
  const dateRange = formatDateRange()

  return (
    <header className="travel-header">
      <div className="travel-header-content">
        {/* Exit button */}
        <button
          className="travel-exit-btn"
          onClick={exitTravelMode}
          aria-label={t('travel.common.exitTravelMode', 'Exit Travel Mode')}
        >
          <RiPlaneLine size={22} className="airplane-in-flight" />
          <span className="exit-text">{t('travel.common.exitTravelMode', 'Exit')}</span>
        </button>

        {/* Trip info - center */}
        <div className="travel-header-info">
          {trip ? (
            <>
              <h1 className="trip-name">{trip.name || trip.destination}</h1>
              <div className="trip-meta">
                {trip.destination && (
                  <span className="trip-destination">
                    <FiMapPin size={14} />
                    {trip.destination}
                  </span>
                )}
                {dateRange && (
                  <span className="trip-dates">
                    <FiCalendar size={14} />
                    {dateRange}
                  </span>
                )}
              </div>
            </>
          ) : (
            <h1 className="trip-name">{t('travel.common.noTrip', 'No Trip Selected')}</h1>
          )}
        </div>

        {/* Sync status indicator */}
        <div className="travel-header-actions">
          {syncStatus === 'syncing' && (
            <motion.div
              className="sync-indicator syncing"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <FiRefreshCw size={18} />
            </motion.div>
          )}
          {tripStatus && (
            <div className={`trip-status-badge ${tripStatus.type}`}>
              {tripStatus.type === 'upcoming' && (
                <span>{t('travel.trip.daysUntil', '{{days}}d', { days: tripStatus.days })}</span>
              )}
              {tripStatus.type === 'active' && (
                <span>{t('travel.trip.daysLeft', '{{days}}d left', { days: tripStatus.days })}</span>
              )}
              {tripStatus.type === 'completed' && (
                <span>{t('travel.trip.completed', 'Done')}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
})

TravelHeader.displayName = 'TravelHeader'

export default TravelHeader
