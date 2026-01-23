import { memo, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { FiRefreshCw, FiMapPin, FiCalendar, FiSun, FiMoon } from 'react-icons/fi'
import { RiPlaneLine } from 'react-icons/ri'
import { useTravelMode } from '../context/TravelModeContext'
import { useTheme } from '../../context/ThemeContext'
import { useModal } from '../../context/ModalContext'
import { useNotifications } from '../context/NotificationContext'
import TripSelector from './TripSelector'
import NotificationBadge from './NotificationBadge'
import NotificationCenter from './NotificationCenter'
import '../styles/TravelLayout.css'

/**
 * Travel Header Component
 * Shows trip info, sync status, and exit button
 * Partially hides in Discovery Mode, expands on hover
 */
const TravelHeader = memo(({ trip, syncStatus, isDiscoveryMode = false, onNavigate }) => {
  const { t } = useTranslation()
  const { exitTravelMode } = useTravelMode()
  const { theme, toggleTheme } = useTheme()
  // When any modal is open (e.g. "Ask AI" or "Add Document"),
  // hide the travel header so it doesn't visually cut into the dialog.
  // This mirrors the behavior used for the bottom navigation.
  const { hasOpenModals } = useModal()
  const { unreadCount } = useNotifications()
  const [isHovered, setIsHovered] = useState(false)
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false)

  // Handle opening notification settings page
  const handleOpenNotificationSettings = useCallback(() => {
    setIsNotificationCenterOpen(false)
    if (onNavigate) {
      onNavigate('notifications')
    }
  }, [onNavigate])

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

  const [isExiting, setIsExiting] = useState(false)

  const handleExit = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      exitTravelMode()
    }, 800)
  }, [exitTravelMode])

  // ... (existing helper functions)

  const tripStatus = getTripStatus()
  const dateRange = formatDateRange()

  // Do not render header while a modal is open.
  // Keeps overlays clean on mobile/tablet and prevents clipping.
  if (hasOpenModals) {
    return null
  }

  return (
    <header
      className={`travel-header ${isDiscoveryMode ? 'discovery-collapsed' : ''} ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="travel-header-content">
        {/* Exit button */}
        <motion.button
          className="travel-exit-btn"
          onClick={handleExit}
          aria-label={t('travel.common.exitTravelMode', 'Exit Travel Mode')}
          layout
        >
          <motion.div
            style={{ display: 'inline-flex', zIndex: 10, position: 'relative' }}
            initial={{ x: -250, y: -80, scale: 0.5, opacity: 0 }}
            animate={isExiting ? {
              x: -400,
              y: -150,
              opacity: 0,
              scale: 0.5,
              rotate: -25,
              transition: { duration: 1.0, ease: "easeInOut" }
            } : {
              x: 0,
              y: 0,
              opacity: 1,
              scale: 1,
              rotate: 0,
              transition: { type: "spring", stiffness: 100, damping: 15, delay: 0.3 }
            }}
          >
            <motion.div
              animate={isExiting ? { rotateY: 180 } : { rotateY: 0 }}
              style={{ display: 'inline-flex' }}
            >
              <RiPlaneLine size={22} className="airplane-in-flight" />
            </motion.div>
          </motion.div>

          <motion.span
            className="exit-text"
            animate={isExiting ? { opacity: 0, maxWidth: 0, marginLeft: 0 } : { opacity: 1, maxWidth: 100, marginLeft: 8 }}
            style={{ overflow: 'hidden', whiteSpace: 'nowrap', display: 'inline-block' }}
            transition={{ duration: 0.4 }}
          >
            {t('travel.common.exitTravelMode', 'Exit')}
          </motion.span>
        </motion.button>

        {/* Trip selector - center */}
        <div className="travel-header-info">
          <TripSelector />
        </div>

        {/* Sync status indicator */}
        <div className="travel-header-actions">
          {/* Notification Bell */}
          <div style={{ position: 'relative', marginRight: '8px' }}>
            <NotificationBadge
              count={unreadCount}
              onClick={() => setIsNotificationCenterOpen(!isNotificationCenterOpen)}
            />
            <NotificationCenter
              isOpen={isNotificationCenterOpen}
              onClose={() => setIsNotificationCenterOpen(false)}
              onOpenSettings={handleOpenNotificationSettings}
            />
          </div>

          <motion.button
            className="travel-icon-btn theme-toggle"
            onClick={toggleTheme}
            whileHover={{ scale: 1.1, rotate: 15 }}
            whileTap={{ scale: 0.9 }}
            title={theme === 'dark' ? t('travel.theme.lightMode', 'Light Mode') : t('travel.theme.darkMode', 'Dark Mode')}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '12px',
              padding: '8px'
            }}
          >
            {theme === 'dark' ? <FiSun size={20} /> : <FiMoon size={20} />}
          </motion.button>

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
