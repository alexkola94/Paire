import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiPlus,
  FiMapPin,
  FiDollarSign,
  FiCheckSquare,
  FiChevronDown,
  FiChevronUp,
  FiEdit3
} from 'react-icons/fi'
import { useTravelMode } from '../context/TravelModeContext'
import { travelExpenseService, packingService, itineraryService } from '../services/travelApi'
import TripSetupWizard from '../components/TripSetupWizard'
import ConfirmationModal from '../../components/ConfirmationModal'
import '../styles/TravelHome.css'

// Gentle animation variants - slower, smoother for calm feeling
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      staggerChildren: 0.15
    }
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1]
    }
  }
}

/**
 * Travel Home Page - Calm, minimal dashboard
 * Shows just what travelers need: countdown, simple status, and easy navigation
 */
const TravelHome = ({ trip, onNavigate }) => {
  const { t } = useTranslation()
  const { selectTrip, loadTrips } = useTravelMode()
  const [showSetup, setShowSetup] = useState(false)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [budgetSummary, setBudgetSummary] = useState(null)
  const [packingProgress, setPackingProgress] = useState(null)
  const [upcomingCount, setUpcomingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [newTrip, setNewTrip] = useState(null)
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false)

  // Listen for create trip event from TripSelector
  useEffect(() => {
    const handleCreateTrip = () => {
      setIsCreatingNew(true)
      setShowSetup(true)
    }

    window.addEventListener('travel:create-trip', handleCreateTrip)
    return () => {
      window.removeEventListener('travel:create-trip', handleCreateTrip)
    }
  }, [])

  // Get time-based greeting
  const getGreeting = useCallback(() => {
    const hour = new Date().getHours()
    if (hour < 12) return t('travel.home.greetingMorning', 'Good morning')
    if (hour < 18) return t('travel.home.greetingAfternoon', 'Good afternoon')
    return t('travel.home.greetingEvening', 'Good evening')
  }, [t])

  // Load minimal trip data - only what's needed for summary
  useEffect(() => {
    const loadTripData = async () => {
      if (!trip?.id) {
        setLoading(false)
        return
      }

      try {
        // Load data in parallel
        const [expenses, packingItems, events] = await Promise.all([
          travelExpenseService.getSummary(trip.id).catch(() => null),
          packingService.getByTrip(trip.id).catch(() => []),
          itineraryService.getByTrip(trip.id).catch(() => [])
        ])

        setBudgetSummary(expenses)

        // Calculate packing progress
        if (packingItems.length > 0) {
          const checked = packingItems.filter(item => item.isChecked).length
          setPackingProgress({
            total: packingItems.length,
            checked,
            percentage: Math.round((checked / packingItems.length) * 100)
          })
        }

        // Just count upcoming events, don't show details
        const today = new Date().toISOString().split('T')[0]
        const upcoming = events.filter(e => e.date >= today)
        setUpcomingCount(upcoming.length)
      } catch (error) {
        console.error('Error loading trip data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTripData()
  }, [trip?.id])

  // Calculate days countdown
  const getDaysCountdown = () => {
    if (!trip?.startDate) return null

    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const start = new Date(trip.startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(trip.endDate)
    end.setHours(0, 0, 0, 0)

    if (now < start) {
      const days = Math.ceil((start - now) / (1000 * 60 * 60 * 24))
      return { type: 'countdown', days, label: t('travel.home.daysToGo', '{{days}} days to go', { days }) }
    } else if (now <= end) {
      const days = Math.ceil((end - now) / (1000 * 60 * 60 * 24)) + 1
      return { type: 'active', days, label: t('travel.home.daysRemaining', '{{days}} days remaining', { days }) }
    }
    return { type: 'completed', days: 0, label: t('travel.home.tripCompleted', 'Trip completed') }
  }

  const countdown = getDaysCountdown()

  // Handle trip creation
  const handleTripCreated = async (createdTrip) => {
    setShowSetup(false)
    setIsCreatingNew(false)
    
    // Refresh trips list to include the new trip
    await loadTrips()
    
    // If there's already an active trip, ask user if they want to switch
    if (trip?.id) {
      setNewTrip(createdTrip)
      setShowSwitchConfirm(true)
    } else {
      // No active trip, automatically switch to the new one
      selectTrip(createdTrip)
    }
  }

  // Handle switch confirmation
  const handleSwitchToNewTrip = useCallback(() => {
    if (newTrip) {
      selectTrip(newTrip)
    }
    setNewTrip(null)
    setShowSwitchConfirm(false)
  }, [newTrip, selectTrip])

  // Handle keep current trip
  const handleKeepCurrentTrip = useCallback(() => {
    // Ensure we keep the current trip active and refresh trips list
    setNewTrip(null)
    setShowSwitchConfirm(false)
    // Refresh trips list to ensure it includes the new trip
    loadTrips().catch(err => console.error('Error refreshing trips:', err))
  }, [loadTrips])

  // If no trip, show a calming create trip prompt
  if (!trip && !loading) {
    return (
      <div className="travel-home no-trip">
        <motion.div
          className="no-trip-content"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div className="no-trip-icon">
            <FiMapPin size={40} />
          </div>
          <h2>{t('travel.home.noTripTitle', 'Where to next?')}</h2>
          <p>{t('travel.home.noTripDescription', 'Start planning your journey')}</p>
          <motion.button
            className="travel-btn calm-btn"
            onClick={() => {
              setIsCreatingNew(true)
              setShowSetup(true)
            }}
            whileTap={{ scale: 0.98 }}
          >
            <FiPlus size={18} />
            {t('travel.common.createTrip', 'Create Trip')}
          </motion.button>
        </motion.div>

        {showSetup && (
          <TripSetupWizard
            onClose={() => setShowSetup(false)}
            onSave={handleTripCreated}
          />
        )}
      </div>
    )
  }

  return (
    <motion.div
      className="travel-home"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Greeting - calm, personal touch */}
      <motion.div className="greeting-section" variants={cardVariants}>
        <span className="greeting-text">{getGreeting()}</span>
        <div className="greeting-actions">
          <button
            className="create-trip-btn"
            onClick={() => {
              setIsCreatingNew(true)
              setShowSetup(true)
            }}
            aria-label={t('travel.trips.selector.createNew', 'Create New Trip')}
            title={t('travel.trips.selector.createNew', 'Create New Trip')}
          >
            <FiPlus size={16} />
          </button>
          <button
            className="edit-trip-btn"
            onClick={() => {
              setIsCreatingNew(false)
              setShowSetup(true)
            }}
            aria-label={t('travel.home.editTrip', 'Edit Trip')}
            title={t('travel.home.editTrip', 'Edit Trip')}
          >
            <FiEdit3 size={16} />
          </button>
        </div>
      </motion.div>

      {/* Main Focus: Countdown - simple, centered */}
      {countdown && (
        <motion.div
          className="travel-glass-card countdown-card calm-card"
          variants={cardVariants}
        >
          <div className={`countdown-content ${countdown.type}`}>
            {countdown.type !== 'completed' && (
              <div className="countdown-number">{countdown.days}</div>
            )}
            <div className="countdown-label">{countdown.label}</div>
          </div>
          {trip?.destination && (
            <div className="countdown-destination">
              <FiMapPin size={14} />
              <span>{trip.destination}</span>
            </div>
          )}
        </motion.div>
      )}

      {/* Simple Status Summary - collapsed by default */}
      <motion.div className="status-summary" variants={cardVariants}>
        <button
          className="status-toggle"
          onClick={() => setShowDetails(!showDetails)}
          aria-expanded={showDetails}
        >
          <span className="status-mini">
            {packingProgress && (
              <span className="mini-stat">
                <FiCheckSquare size={14} />
                {packingProgress.percentage}%
              </span>
            )}
            {upcomingCount > 0 && (
              <span className="mini-stat">
                {upcomingCount} {t('travel.home.eventsPlanned', 'events')}
              </span>
            )}
            {budgetSummary && trip?.budget && (
              <span className="mini-stat">
                <FiDollarSign size={14} />
                {Math.round((budgetSummary.total / trip.budget) * 100)}%
              </span>
            )}
          </span>
          {showDetails ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
        </button>

        {/* Expandable details */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              className="status-details"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {/* Packing */}
              <button
                className="status-detail-card"
                onClick={() => onNavigate('packing')}
              >
                <div className="detail-icon packing">
                  <FiCheckSquare size={20} />
                </div>
                <div className="detail-content">
                  <span className="detail-label">{t('travel.home.packing', 'Packing')}</span>
                  {packingProgress ? (
                    <span className="detail-value">
                      {packingProgress.checked}/{packingProgress.total} {t('travel.home.itemsPacked', 'packed')}
                    </span>
                  ) : (
                    <span className="detail-value">{t('travel.home.startPacking', 'Start your list')}</span>
                  )}
                </div>
                {packingProgress && (
                  <div className="detail-progress">
                    <div
                      className="progress-fill"
                      style={{ width: `${packingProgress.percentage}%` }}
                    />
                  </div>
                )}
              </button>

              {/* Budget */}
              <button
                className="status-detail-card"
                onClick={() => onNavigate('budget')}
              >
                <div className="detail-icon budget">
                  <FiDollarSign size={20} />
                </div>
                <div className="detail-content">
                  <span className="detail-label">{t('travel.home.budget', 'Budget')}</span>
                  {budgetSummary && trip?.budget ? (
                    <span className="detail-value">
                      {new Intl.NumberFormat(undefined, {
                        style: 'currency',
                        currency: trip?.budgetCurrency || 'EUR',
                        maximumFractionDigits: 0
                      }).format(trip.budget - budgetSummary.total)} {t('travel.home.remaining', 'remaining')}
                    </span>
                  ) : (
                    <span className="detail-value">{t('travel.home.setBudget', 'Set your budget')}</span>
                  )}
                </div>
              </button>

              {/* Itinerary */}
              <button
                className="status-detail-card"
                onClick={() => onNavigate('itinerary')}
              >
                <div className="detail-icon itinerary">
                  <FiMapPin size={20} />
                </div>
                <div className="detail-content">
                  <span className="detail-label">{t('travel.home.itinerary', 'Itinerary')}</span>
                  {upcomingCount > 0 ? (
                    <span className="detail-value">
                      {upcomingCount} {t('travel.home.eventsPlanned', 'events planned')}
                    </span>
                  ) : (
                    <span className="detail-value">{t('travel.home.planActivities', 'Plan your activities')}</span>
                  )}
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Encouraging message - changes based on trip status */}
      <motion.p className="encouragement" variants={cardVariants}>
        {countdown?.type === 'countdown' && t('travel.home.encourageCountdown', 'Take your time preparing. You\'ve got this.')}
        {countdown?.type === 'active' && t('travel.home.encourageActive', 'Enjoy every moment of your journey.')}
        {countdown?.type === 'completed' && t('travel.home.encourageCompleted', 'Hope you had a wonderful trip!')}
      </motion.p>

      {/* Trip Setup Wizard Modal */}
      {showSetup && (
        <TripSetupWizard
          trip={isCreatingNew ? null : trip}
          onClose={() => {
            setShowSetup(false)
            setIsCreatingNew(false)
          }}
          onSave={handleTripCreated}
        />
      )}

      {/* Switch Trip Confirmation Modal */}
      <ConfirmationModal
        isOpen={showSwitchConfirm}
        onClose={handleKeepCurrentTrip}
        onConfirm={handleSwitchToNewTrip}
        title={t('travel.trips.switchConfirm.title', 'Trip Created')}
        message={t('travel.trips.switchConfirm.message', 'Switch to this trip now?')}
        confirmText={t('travel.trips.switchConfirm.switch', 'Switch')}
        cancelText={t('travel.trips.switchConfirm.keepCurrent', 'Keep Current')}
        variant="default"
      />
    </motion.div>
  )
}

export default TravelHome
