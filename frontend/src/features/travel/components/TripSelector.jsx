import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { FiChevronDown, FiMapPin, FiCalendar, FiCheck, FiPlus } from 'react-icons/fi'
import { useTravelMode } from '../context/TravelModeContext'
import '../styles/TripSelector.css'

/**
 * Trip Selector Component
 * Dropdown selector for switching between multiple trips
 * Matches Paire design system with glassmorphism and smooth transitions
 */
const TripSelector = () => {
  const { t } = useTranslation()
  const { trips, tripsLoading, activeTrip, selectTrip, loadTrips } = useTravelMode()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const buttonRef = useRef(null)
  const hasLoadedForOpenState = useRef(false)

  // Load trips when dropdown opens (only once per open state)
  useEffect(() => {
    if (isOpen && !tripsLoading && !hasLoadedForOpenState.current) {
      // Always refresh trips list when dropdown opens to ensure it's up to date
      hasLoadedForOpenState.current = true
      loadTrips()
    } else if (!isOpen) {
      // Reset the flag when dropdown closes
      hasLoadedForOpenState.current = false
    }
    // Only depend on isOpen - don't depend on tripsLoading or loadTrips to avoid infinite loop
  }, [isOpen, loadTrips])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen])

  // Format date range for display
  const formatDateRange = useCallback((trip) => {
    if (!trip?.startDate || !trip?.endDate) return null

    const start = new Date(trip.startDate)
    const end = new Date(trip.endDate)

    const options = { month: 'short', day: 'numeric' }
    const startStr = start.toLocaleDateString(undefined, options)
    const endStr = end.toLocaleDateString(undefined, options)

    return `${startStr} - ${endStr}`
  }, [])

  // Get trip status (upcoming/active/completed)
  const getTripStatus = useCallback((trip) => {
    if (!trip?.startDate || !trip?.endDate) return 'upcoming'

    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const start = new Date(trip.startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(trip.endDate)
    end.setHours(0, 0, 0, 0)

    if (now < start) {
      return 'upcoming'
    } else if (now <= end) {
      return 'active'
    } else {
      return 'completed'
    }
  }, [])

  // Handle trip selection
  const handleSelectTrip = useCallback((trip) => {
    selectTrip(trip)
    setIsOpen(false)
  }, [selectTrip])

  // Handle create new trip
  const handleCreateNew = useCallback(() => {
    setIsOpen(false)
    // Dispatch custom event that TravelHome can listen to
    window.dispatchEvent(new CustomEvent('travel:create-trip'))
  }, [])

  // Toggle dropdown
  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  // Display name for active trip
  const activeTripName = activeTrip?.name || activeTrip?.destination || t('travel.common.noTrip', 'No Trip Selected')
  const activeTripDateRange = activeTrip ? formatDateRange(activeTrip) : null

  return (
    <div className="trip-selector">
      {/* Selector Button */}
      <button
        ref={buttonRef}
        className="trip-selector-button"
        onClick={toggleDropdown}
        aria-label={t('travel.trips.selector.title', 'Select Trip')}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="trip-selector-button-content">
          <div className="trip-selector-button-main">
            <h1 className="trip-selector-name">{activeTripName}</h1>
            {activeTripDateRange && (
              <div className="trip-selector-meta">
                {activeTrip?.destination && (
                  <span className="trip-selector-destination">
                    <FiMapPin size={14} />
                    {activeTrip.destination}
                  </span>
                )}
                <span className="trip-selector-dates">
                  <FiCalendar size={14} />
                  {activeTripDateRange}
                </span>
              </div>
            )}
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <FiChevronDown size={18} className="trip-selector-chevron" />
          </motion.div>
        </div>
      </button>

      {/* Dropdown List */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            key="trip-selector-dropdown"
            ref={dropdownRef}
            className="trip-selector-dropdown"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {tripsLoading ? (
              <div className="trip-selector-loading">
                <div className="trip-selector-spinner"></div>
                <span>{t('common.loading', 'Loading...')}</span>
              </div>
            ) : trips.length === 0 ? (
              <>
                <div className="trip-selector-empty">
                  <p>{t('travel.trips.selector.noTrips', 'No trips yet')}</p>
                </div>
                {/* Create New Trip Button for empty state */}
                <div className="trip-selector-footer">
                  <button
                    className="trip-selector-create-btn"
                    onClick={handleCreateNew}
                  >
                    <FiPlus size={16} />
                    <span>{t('travel.trips.selector.createNew', 'Create New Trip')}</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <ul className="trip-selector-list" role="listbox">
                  {trips.map((trip) => {
                    const isActive = activeTrip?.id === trip.id
                    const status = getTripStatus(trip)
                    const dateRange = formatDateRange(trip)

                    return (
                      <li key={trip.id} role="option" aria-selected={isActive}>
                        <button
                          className={`trip-selector-item ${isActive ? 'active' : ''}`}
                          onClick={() => handleSelectTrip(trip)}
                        >
                          <div className="trip-selector-item-content">
                            <div className="trip-selector-item-header">
                              <span className="trip-selector-item-name">
                                {trip.name || trip.destination || t('travel.explore.unnamed', 'Unnamed')}
                              </span>
                              {isActive && (
                                <FiCheck size={16} className="trip-selector-item-check" />
                              )}
                            </div>
                            <div className="trip-selector-item-meta">
                              {trip.destination && (
                                <span className="trip-selector-item-destination">
                                  <FiMapPin size={12} />
                                  {trip.destination}
                                </span>
                              )}
                              {dateRange && (
                                <span className="trip-selector-item-dates">
                                  <FiCalendar size={12} />
                                  {dateRange}
                                </span>
                              )}
                              <span className={`trip-selector-item-status ${status}`}>
                                {status === 'upcoming' && t('travel.trips.status.upcoming', 'Upcoming')}
                                {status === 'active' && t('travel.trips.status.active', 'Active')}
                                {status === 'completed' && t('travel.trips.status.completed', 'Completed')}
                              </span>
                            </div>
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                {/* Create New Trip Button */}
                <div className="trip-selector-footer">
                  <button
                    className="trip-selector-create-btn"
                    onClick={handleCreateNew}
                  >
                    <FiPlus size={16} />
                    <span>{t('travel.trips.selector.createNew', 'Create New Trip')}</span>
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default TripSelector
