import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useModalRegistration } from '../../context/ModalContext'
import {
  FiPlus,
  FiCalendar,
  FiClock,
  FiMapPin,
  FiX,
  FiTrash2,
  FiEdit2,
  FiNavigation,
  FiHome,
  FiStar,
  FiCoffee,
  FiTruck
} from 'react-icons/fi'
import { RiFlightTakeoffLine, RiPlaneLine } from 'react-icons/ri'
import { itineraryService } from '../services/travelApi'
import { ITINERARY_TYPES } from '../utils/travelConstants'
import '../styles/Itinerary.css'
import FlightStatus from '../components/FlightStatus'

// Event type icons mapping
const eventIcons = {
  flight: RiFlightTakeoffLine,
  hotel: FiHome,
  activity: FiStar,
  restaurant: FiCoffee,
  transit: FiTruck
}

/**
 * Itinerary Page Component
 * Timeline view of trip events organized by day
 */
const ItineraryPage = ({ trip }) => {
  const { t } = useTranslation()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)

  // Load itinerary events
  useEffect(() => {
    const loadEvents = async () => {
      if (!trip?.id) {
        setLoading(false)
        return
      }

      try {
        const data = await itineraryService.getByTrip(trip.id)
        setEvents(data || [])
      } catch (error) {
        console.error('Error loading itinerary:', error)
      } finally {
        setLoading(false)
      }
    }

    loadEvents()
  }, [trip?.id])

  // Generate date range for trip
  const generateDateRange = () => {
    if (!trip?.startDate || !trip?.endDate) return []

    const dates = []
    const start = new Date(trip.startDate)
    const end = new Date(trip.endDate)

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d).toISOString().split('T')[0])
    }

    return dates
  }

  const tripDates = generateDateRange()

  // Group events by date
  const groupedEvents = events.reduce((acc, event) => {
    // Normalize date to YYYY-MM-DD format (backend may return full ISO datetime)
    const rawDate = event.date
    const date = rawDate ? (rawDate.includes('T') ? rawDate.split('T')[0] : rawDate) : null
    if (!date) return acc

    if (!acc[date]) acc[date] = []
    acc[date].push(event)
    // Sort by time
    acc[date].sort((a, b) => {
      if (!a.startTime) return 1
      if (!b.startTime) return -1
      return a.startTime.localeCompare(b.startTime)
    })
    return acc
  }, {})

  // Add event
  const handleAddEvent = async (eventData) => {
    try {
      const newEvent = await itineraryService.create(trip.id, eventData)
      setEvents(prev => [...prev, newEvent])
      setShowAddModal(false)
      setEditingEvent(null)
    } catch (error) {
      console.error('Error adding event:', error)
    }
  }

  // Update event
  const handleUpdateEvent = async (eventData) => {
    try {
      const updated = await itineraryService.update(trip.id, editingEvent.id, eventData)
      setEvents(prev => prev.map(e => e.id === editingEvent.id ? { ...e, ...eventData } : e))
      setShowAddModal(false)
      setEditingEvent(null)
    } catch (error) {
      console.error('Error updating event:', error)
    }
  }

  // Delete event
  const handleDeleteEvent = async (eventId) => {
    try {
      await itineraryService.delete(trip.id, eventId)
      setEvents(prev => prev.filter(e => e.id !== eventId))
    } catch (error) {
      console.error('Error deleting event:', error)
    }
  }

  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const options = { weekday: 'short', month: 'short', day: 'numeric' }
    return date.toLocaleDateString(undefined, options)
  }

  // Get day label (Day 1, Day 2, etc.)
  const getDayLabel = (dateStr) => {
    const index = tripDates.indexOf(dateStr)
    return index >= 0 ? `${t('travel.itinerary.day', 'Day')} ${index + 1}` : ''
  }

  if (!trip) {
    return (
      <div className="itinerary-page empty-state">
        <FiCalendar size={48} />
        <h3>{t('travel.itinerary.noTrip', 'No Trip Selected')}</h3>
        <p>{t('travel.itinerary.createTripFirst', 'Create a trip to start planning your itinerary')}</p>
      </div>
    )
  }

  return (
    <div className="itinerary-page">
      {/* Header */}
      <div className="itinerary-header">
        <h2 className="section-title">{t('travel.itinerary.title', 'Itinerary')}</h2>
        <button className="add-btn" onClick={() => setShowAddModal(true)}>
          <FiPlus size={20} />
        </button>
      </div>

      {/* Timeline */}
      <div className="itinerary-timeline">
        {tripDates.map((date, dateIndex) => {
          const dayEvents = groupedEvents[date] || []
          const isToday = new Date().toISOString().split('T')[0] === date

          return (
            <motion.div
              key={date}
              className={`timeline-day ${isToday ? 'today' : ''}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: dateIndex * 0.05 }}
            >
              {/* Day header */}
              <div className="day-header">
                <div className="day-marker">
                  <span className="day-number">{dateIndex + 1}</span>
                </div>
                <div className="day-info">
                  <span className="day-label">{getDayLabel(date)}</span>
                  <span className="day-date">{formatDate(date)}</span>
                  {isToday && (
                    <span className="today-badge">{t('travel.itinerary.today', 'Today')}</span>
                  )}
                </div>
                <button
                  className="add-day-event"
                  onClick={() => {
                    setSelectedDate(date)
                    setShowAddModal(true)
                  }}
                >
                  <FiPlus size={16} />
                </button>
              </div>

              {/* Events for this day */}
              <div className="day-events">
                {dayEvents.length > 0 ? (
                  dayEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onEdit={() => {
                        setEditingEvent(event)
                        setShowAddModal(true)
                      }}
                      onDelete={() => handleDeleteEvent(event.id)}
                    />
                  ))
                ) : (
                  <div className="no-events">
                    <span>{t('travel.itinerary.noEvents', 'No events planned')}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Empty State */}
      {tripDates.length === 0 && !loading && (
        <div className="itinerary-empty">
          <FiCalendar size={48} />
          <h3>{t('travel.itinerary.emptyTitle', 'Plan your trip')}</h3>
          <p>{t('travel.itinerary.emptyDescription', 'Add flights, hotels, activities and more')}</p>
          <button className="travel-btn" onClick={() => setShowAddModal(true)}>
            <FiPlus size={18} />
            {t('travel.itinerary.addEvent', 'Add Event')}
          </button>
        </div>
      )}

      {/* Add/Edit Event Modal */}
      <AnimatePresence>
        {showAddModal && (
          <EventFormModal
            trip={trip}
            event={editingEvent}
            defaultDate={selectedDate}
            onClose={() => {
              setShowAddModal(false)
              setEditingEvent(null)
              setSelectedDate(null)
            }}
            onSave={editingEvent ? handleUpdateEvent : handleAddEvent}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Event Card Component
const EventCard = ({ event, onEdit, onDelete }) => {
  const { t } = useTranslation()
  const Icon = eventIcons[event.type] || FiStar
  const typeConfig = ITINERARY_TYPES[event.type] || ITINERARY_TYPES.activity

  return (
    <motion.div
      className={`event-card ${event.type}`}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="event-timeline-dot" style={{ background: typeConfig.color }} />

      <div className="event-content">
        <div className="event-header">
          <div className="event-icon" style={{ color: typeConfig.color }}>
            <Icon size={18} />
          </div>
          <span className="event-type">{t(typeConfig.label)}</span>
          {event.startTime && (
            <span className="event-time">
              <FiClock size={12} />
              {event.startTime}
              {event.endTime && ` - ${event.endTime}`}
            </span>
          )}
        </div>

        <h4 className="event-name">{event.name}</h4>

        {event.location && (
          <div className="event-location">
            <FiMapPin size={14} />
            <span>{event.location}</span>
          </div>
        )}

        {/* Flight-specific info */}
        {event.type === 'flight' && event.flightNumber && (
          <>
            <div className="event-details flight-details">
              <span className="flight-number">{event.flightNumber}</span>
              {event.departureAirport && event.arrivalAirport && (
                <span className="flight-route">
                  {event.departureAirport} <FiNavigation size={12} /> {event.arrivalAirport}
                </span>
              )}
            </div>
            {/* Real-time Flight Status */}
            <FlightStatus
              flightNumber={event.flightNumber}
              date={event.date?.split('T')[0] || event.date}
              compact
            />
          </>
        )}

        {/* Hotel-specific info */}
        {event.type === 'hotel' && event.checkInTime && (
          <div className="event-details hotel-details">
            <span>Check-in: {event.checkInTime}</span>
            {event.checkOutTime && <span>Check-out: {event.checkOutTime}</span>}
          </div>
        )}

        {event.confirmationNumber && (
          <div className="event-confirmation">
            <span className="confirmation-label">{t('travel.itinerary.confirmation', 'Ref')}:</span>
            <span className="confirmation-number">{event.confirmationNumber}</span>
          </div>
        )}

        <div className="event-actions">
          <button className="event-action-btn" onClick={onEdit}>
            <FiEdit2 size={14} />
          </button>
          <button className="event-action-btn delete" onClick={onDelete}>
            <FiTrash2 size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// Event Form Modal Component
const EventFormModal = ({ trip, event, defaultDate, onClose, onSave }) => {
  const { t } = useTranslation()

  // Register modal to hide bottom navigation
  useModalRegistration(true)

  const [formData, setFormData] = useState({
    type: event?.type || 'activity',
    name: event?.name || '',
    date: event?.date || defaultDate || trip.startDate,
    startTime: event?.startTime || '',
    endTime: event?.endTime || '',
    location: event?.location || '',
    confirmationNumber: event?.confirmationNumber || '',
    // Flight-specific
    flightNumber: event?.flightNumber || '',
    airline: event?.airline || '',
    departureAirport: event?.departureAirport || '',
    arrivalAirport: event?.arrivalAirport || '',
    // Hotel-specific
    checkInTime: event?.checkInTime || '',
    checkOutTime: event?.checkOutTime || '',
    notes: event?.notes || ''
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setSaving(true)
    await onSave(formData)
    setSaving(false)
  }

  return createPortal(
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="event-form-modal"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{event ? t('travel.itinerary.editEvent', 'Edit Event') : t('travel.itinerary.addEvent', 'Add Event')}</h3>
          <button className="modal-close" onClick={onClose}>
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Event Type Selector */}
          <div className="form-group">
            <label>{t('travel.itinerary.eventType', 'Event Type')}</label>
            <div className="type-selector">
              {Object.entries(ITINERARY_TYPES).map(([key, type]) => {
                const Icon = eventIcons[key] || FiStar
                return (
                  <button
                    key={key}
                    type="button"
                    className={`type-option ${formData.type === key ? 'selected' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, type: key }))}
                    style={{ '--type-color': type.color }}
                  >
                    <Icon size={20} />
                    <span>{t(type.label)}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Name */}
          <div className="form-group">
            <label>{t('travel.itinerary.eventName', 'Name')}</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={t('travel.itinerary.eventNamePlaceholder', 'e.g., Visit the Louvre')}
              autoFocus
              required
            />
          </div>

          {/* Date and Time */}
          <div className="form-row">
            <div className="form-group">
              <label>{t('travel.itinerary.date', 'Date')}</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                min={trip.startDate}
                max={trip.endDate}
              />
            </div>
            <div className="form-group">
              <label>{t('travel.itinerary.startTime', 'Start Time')}</label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
              />
            </div>
          </div>

          {/* Location */}
          <div className="form-group">
            <label>{t('travel.itinerary.location', 'Location')}</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder={t('travel.itinerary.locationPlaceholder', 'Address or place name')}
            />
          </div>

          {/* Flight-specific fields */}
          {formData.type === 'flight' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('travel.itinerary.flightNumber', 'Flight Number')}</label>
                  <input
                    type="text"
                    value={formData.flightNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, flightNumber: e.target.value.toUpperCase() }))}
                    placeholder="e.g., BA123"
                  />
                </div>
                <div className="form-group">
                  <label>{t('travel.itinerary.airline', 'Airline')}</label>
                  <input
                    type="text"
                    value={formData.airline}
                    onChange={(e) => setFormData(prev => ({ ...prev, airline: e.target.value }))}
                    placeholder="e.g., British Airways"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('travel.itinerary.departure', 'From')}</label>
                  <input
                    type="text"
                    value={formData.departureAirport}
                    onChange={(e) => setFormData(prev => ({ ...prev, departureAirport: e.target.value.toUpperCase() }))}
                    placeholder="e.g., LHR"
                  />
                </div>
                <div className="form-group">
                  <label>{t('travel.itinerary.arrival', 'To')}</label>
                  <input
                    type="text"
                    value={formData.arrivalAirport}
                    onChange={(e) => setFormData(prev => ({ ...prev, arrivalAirport: e.target.value.toUpperCase() }))}
                    placeholder="e.g., CDG"
                  />
                </div>
              </div>
            </>
          )}

          {/* Hotel-specific fields */}
          {formData.type === 'hotel' && (
            <div className="form-row">
              <div className="form-group">
                <label>{t('travel.itinerary.checkIn', 'Check-in')}</label>
                <input
                  type="time"
                  value={formData.checkInTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, checkInTime: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>{t('travel.itinerary.checkOut', 'Check-out')}</label>
                <input
                  type="time"
                  value={formData.checkOutTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, checkOutTime: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* Confirmation Number */}
          <div className="form-group">
            <label>{t('travel.itinerary.confirmationNumber', 'Confirmation Number')}</label>
            <input
              type="text"
              value={formData.confirmationNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmationNumber: e.target.value }))}
              placeholder={t('travel.itinerary.confirmationPlaceholder', 'Optional booking reference')}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="cancel-btn" onClick={onClose}>
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="submit" className="travel-btn" disabled={saving}>
              {saving ? t('common.saving', 'Saving...') : (event ? t('common.save', 'Save') : t('common.add', 'Add'))}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>,
    document.body
  )
}

export default ItineraryPage
