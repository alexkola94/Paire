import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiX,
  FiMapPin,
  FiCalendar,
  FiDollarSign,
  FiCheck,
  FiChevronRight,
  FiChevronLeft,
  FiCreditCard,
  FiList
} from 'react-icons/fi'
import { tripService, budgetService } from '../services/travelApi'
import { createTrip } from '../services/travelDb'
import { TRAVEL_CURRENCIES } from '../utils/travelConstants'
import '../styles/TripSetupWizard.css'

// Geocoding service using Nominatim (OpenStreetMap)
const geocodeDestination = async (query) => {
  if (!query || query.length < 3) return []

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'TravelCommandCenter/1.0'
        }
      }
    )

    if (!response.ok) return []

    const results = await response.json()
    return results.map(r => ({
      name: r.display_name.split(',')[0],
      fullName: r.display_name,
      country: r.address?.country || '',
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon)
    }))
  } catch (error) {
    console.error('Geocoding error:', error)
    return []
  }
}

/**
 * Trip Setup Wizard Component
 * Multi-step form for creating/editing trips
 */
const TripSetupWizard = ({ trip, onClose, onSave }) => {
  const { t } = useTranslation()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Budget selection state
  const [availableBudgets, setAvailableBudgets] = useState([])
  const [budgetMode, setBudgetMode] = useState('new') // 'new' or 'existing'
  const [selectedBudgetId, setSelectedBudgetId] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    name: trip?.name || '',
    destination: trip?.destination || '',
    country: trip?.country || '',
    latitude: trip?.latitude || null,
    longitude: trip?.longitude || null,
    startDate: trip?.startDate || '',
    endDate: trip?.endDate || '',
    budget: trip?.budget || '',
    budgetCategory: trip?.name || '', // Name for new budget
    budgetCurrency: trip?.budgetCurrency || 'EUR'
  })

  // Destination search state
  const [searchQuery, setSearchQuery] = useState(trip?.destination || '')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  // Load existing budgets on mount
  useEffect(() => {
    const loadBudgets = async () => {
      try {
        const budgets = await budgetService.getAll()
        setAvailableBudgets(budgets || [])
      } catch (err) {
        console.error('Error loading budgets:', err)
      }
    }
    loadBudgets()
  }, [])

  // Auto-fill budget category name with trip name
  useEffect(() => {
    if (budgetMode === 'new' && !formData.budgetCategory && formData.name) {
      setFormData(prev => ({ ...prev, budgetCategory: formData.name }))
    }
  }, [formData.name, budgetMode])

  // Debounced destination search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 3 && searchQuery !== formData.destination) {
        setSearching(true)
        const results = await geocodeDestination(searchQuery)
        setSearchResults(results)
        setSearching(false)
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, formData.destination])

  // Handle destination selection
  const selectDestination = (result) => {
    setFormData(prev => ({
      ...prev,
      destination: result.name,
      country: result.country,
      latitude: result.latitude,
      longitude: result.longitude
    }))
    setSearchQuery(result.name)
    setSearchResults([])
  }

  // Handle form input changes
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  // Validate current step
  const validateStep = () => {
    switch (step) {
      case 1:
        if (!formData.destination) {
          setError(t('travel.setup.errors.destinationRequired', 'Please enter a destination'))
          return false
        }
        break
      case 2:
        if (!formData.startDate || !formData.endDate) {
          setError(t('travel.setup.errors.datesRequired', 'Please select travel dates'))
          return false
        }
        if (new Date(formData.endDate) < new Date(formData.startDate)) {
          setError(t('travel.setup.errors.invalidDates', 'End date must be after start date'))
          return false
        }
        break
      case 3:
        if (budgetMode === 'new' && formData.budget && !formData.budgetCategory) {
          setError(t('travel.setup.errors.budgetCategoryRequired', 'Please name your budget'))
          return false
        }
        if (budgetMode === 'existing' && !selectedBudgetId) {
          setError(t('wizard.selectBudget', 'Please select a budget'))
          return false
        }
        break
      default:
        break
    }
    return true
  }

  // Handle next step
  const nextStep = () => {
    if (validateStep()) {
      setStep(prev => prev + 1)
    }
  }

  // Handle previous step
  const prevStep = () => {
    setStep(prev => prev - 1)
    setError(null)
  }

  // Handle save
  const handleSave = async () => {
    if (!validateStep()) return

    setSaving(true)
    setError(null)

    try {
      let finalBudget = parseFloat(formData.budget) || 0
      let linkedBudgetId = null

      // Handle Budget Creation/Selection
      if (budgetMode === 'new' && finalBudget > 0) {
        // Create new budget via API
        try {
          const newBudget = await budgetService.create({
            category: formData.budgetCategory || formData.name || formData.destination,
            amount: finalBudget,
            startDate: formData.startDate,
            endDate: formData.endDate,
            period: 'monthly' // Default for trips usually falls within months
          })
          linkedBudgetId = newBudget.id
        } catch (err) {
          console.error('Failed to create linked budget:', err)
          // Continue without linking, but warn? For now, we proceed.
        }
      } else if (budgetMode === 'existing' && selectedBudgetId) {
        // Link to existing budget
        const selectedBudget = availableBudgets.find(b => b.id === selectedBudgetId)
        if (selectedBudget) {
          finalBudget = selectedBudget.amount // Update trip budget to match selected
          linkedBudgetId = selectedBudget.id
        }
      }

      const tripData = {
        ...formData,
        name: formData.name || formData.destination,
        budget: finalBudget,
        linkedBudgetId // Optional field if your backend supports it, otherwise just budget amount
      }

      let savedTrip
      if (trip?.id) {
        savedTrip = await tripService.update(trip.id, tripData)
      } else {
        savedTrip = await tripService.create(tripData)
      }

      onSave(savedTrip)
    } catch (err) {
      console.error('Error saving trip:', err)
      setError(t('travel.setup.errors.saveFailed', 'Failed to save trip. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  // Step content
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="wizard-step">
            <h3>{t('travel.setup.step1.title', 'Where are you going?')}</h3>
            <p className="step-description">
              {t('travel.setup.step1.description', 'Search for your destination city or country')}
            </p>

            <div className="form-group">
              <label>{t('travel.trip.destination', 'Destination')}</label>
              <div className="destination-search">
                <FiMapPin className="search-icon" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('travel.setup.step1.placeholder', 'e.g., Paris, Tokyo, New York')}
                  autoFocus
                />
                {searching && <span className="searching">{t('common.searching', 'Searching...')}</span>}
              </div>

              {searchResults.length > 0 && (
                <ul className="search-results">
                  {searchResults.map((result, index) => (
                    <li key={index} onClick={() => selectDestination(result)}>
                      <FiMapPin />
                      <div className="result-text">
                        <span className="result-name">{result.name}</span>
                        <span className="result-country">{result.country}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="form-group">
              <label>{t('travel.setup.step1.tripName', 'Trip Name (optional)')}</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder={t('travel.setup.step1.namePlaceholder', 'e.g., Summer Vacation 2024')}
              />
            </div>
          </div>
        )

      case 2:
        return (
          <div className="wizard-step">
            <h3>{t('travel.setup.step2.title', 'When are you traveling?')}</h3>
            <p className="step-description">
              {t('travel.setup.step2.description', 'Select your departure and return dates')}
            </p>

            <div className="dates-row">
              <div className="form-group">
                <label>{t('travel.trip.startDate', 'Departure')}</label>
                <div className="date-input">
                  <FiCalendar />
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleChange('startDate', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>{t('travel.trip.endDate', 'Return')}</label>
                <div className="date-input">
                  <FiCalendar />
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleChange('endDate', e.target.value)}
                    min={formData.startDate || new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            </div>

            {formData.startDate && formData.endDate && (
              <div className="trip-duration">
                {(() => {
                  const start = new Date(formData.startDate)
                  const end = new Date(formData.endDate)
                  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
                  return t('travel.setup.step2.duration', '{{days}} days', { days })
                })()}
              </div>
            )}
          </div>
        )

      case 3:
        return (
          <div className="wizard-step">
            <h3>{t('travel.setup.step3.title', 'Set your budget')}</h3>
            <p className="step-description">
              {t('travel.setup.step3.description', 'Link an existing budget or create a new one')}
            </p>

            {/* Budget Mode Toggle */}
            <div className="budget-mode-toggle">
              <button
                className={`mode-btn ${budgetMode === 'new' ? 'active' : ''}`}
                onClick={() => setBudgetMode('new')}
              >
                <FiDollarSign /> {t('wizard.newBudget', 'Create New')}
              </button>
              <button
                className={`mode-btn ${budgetMode === 'existing' ? 'active' : ''}`}
                onClick={() => setBudgetMode('existing')}
              >
                <FiList /> {t('wizard.existingBudget', 'Use Existing')}
              </button>
            </div>

            {budgetMode === 'new' ? (
              <div className="budget-form-section">
                <div className="budget-row">
                  <div className="form-group budget-input-group">
                    <label>{t('wizard.budgetAmount', 'Total Budget')}</label>
                    <div className="budget-input">
                      <FiDollarSign />
                      <input
                        type="number"
                        value={formData.budget}
                        onChange={(e) => handleChange('budget', e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div className="form-group currency-group">
                    <label>{t('travel.trip.currency', 'Currency')}</label>
                    <select
                      value={formData.budgetCurrency}
                      onChange={(e) => handleChange('budgetCurrency', e.target.value)}
                    >
                      {TRAVEL_CURRENCIES.map(currency => (
                        <option key={currency.code} value={currency.code}>
                          {currency.code} ({currency.symbol})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>{t('wizard.createBudgetCategory', 'Budget Name')}</label>
                  <div className="input-with-icon">
                    <FiCreditCard className="input-icon" />
                    <input
                      type="text"
                      value={formData.budgetCategory}
                      onChange={(e) => handleChange('budgetCategory', e.target.value)}
                      placeholder={t('travel.setup.step1.namePlaceholder', 'e.g., Summer Trip')}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="budget-selection-section">
                <div className="form-group">
                  <label>{t('wizard.selectBudget', 'Select a Budget')}</label>
                  <div className="budget-list">
                    {availableBudgets.length === 0 ? (
                      <div className="no-budgets-msg">No existing budgets found.</div>
                    ) : (
                      <select
                        value={selectedBudgetId}
                        onChange={(e) => setSelectedBudgetId(e.target.value)}
                        className="budget-select"
                      >
                        <option value="">-- {t('wizard.selectBudget', 'Select a Budget')} --</option>
                        {availableBudgets.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.category} ({new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(b.amount)})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="skip-hint">
              {t('travel.setup.step3.skipHint', 'You can skip this step and set a budget later')}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="wizard-overlay" onClick={onClose}>
      <motion.div
        className="wizard-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="wizard-header">
          <h2>
            {trip ? t('travel.common.editTrip', 'Edit Trip') : t('travel.common.createTrip', 'Create Trip')}
          </h2>
          <button className="wizard-close" onClick={onClose} aria-label="Close">
            <FiX size={24} />
          </button>
        </div>

        {/* Progress indicator */}
        <div className="wizard-progress">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`progress-step ${s === step ? 'active' : ''} ${s < step ? 'completed' : ''}`}
            >
              {s < step ? <FiCheck size={14} /> : s}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="wizard-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>

          {error && (
            <div className="wizard-error">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="wizard-footer">
          {step > 1 ? (
            <button className="wizard-btn secondary" onClick={prevStep} disabled={saving}>
              <FiChevronLeft />
              {t('common.back', 'Back')}
            </button>
          ) : (
            <button className="wizard-btn secondary" onClick={onClose} disabled={saving}>
              {t('common.cancel', 'Cancel')}
            </button>
          )}

          {step < 3 ? (
            <button className="wizard-btn primary" onClick={nextStep}>
              {t('common.next', 'Next')}
              <FiChevronRight />
            </button>
          ) : (
            <button
              className="wizard-btn primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
              {!saving && <FiCheck />}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default TripSetupWizard
