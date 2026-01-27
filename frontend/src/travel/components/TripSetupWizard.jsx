import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useModalRegistration } from '../../context/ModalContext'
import {
  FiX,
  FiMapPin,
  FiDollarSign,
  FiCheck,
  FiChevronRight,
  FiChevronLeft,
  FiCreditCard,
  FiList
} from 'react-icons/fi'
import { tripService, geocodingService } from '../services/travelApi'
import { budgetService, savingsGoalService } from '../../services/api'
import { createTrip } from '../services/travelDb'
import { TRAVEL_CURRENCIES } from '../utils/travelConstants'
import { getAdvisory } from '../services/travelAdvisoryService'
import TravelAdvisoryCard from './TravelAdvisoryCard'
import DatePicker from './DatePicker'
import DateRangePicker from './DateRangePicker'
import '../styles/TripSetupWizard.css'

// Geocoding service using backend proxy to avoid CORS issues
const geocodeDestination = async (query) => {
  if (!query || query.length < 3) return []

  try {
    const results = await geocodingService.search(query, 5)
    return results.map(r => ({
      name: r.name || r.fullName?.split(',')[0] || '',
      fullName: r.fullName || r.name || '',
      country: r.country || '',
      latitude: r.latitude || 0,
      longitude: r.longitude || 0
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

  // Register modal to hide bottom navigation and explore button
  useModalRegistration(true)

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
  const [advisory, setAdvisory] = useState(null)

  // Load existing budgets and saving goals on mount
  // Uses the same fetching pattern as SavingsGoals.jsx
  useEffect(() => {
    const loadBudgets = async () => {
      try {
        // Fetch both budgets and saving goals in parallel (same pattern as SavingsGoals.jsx)
        const [budgets, savingGoals] = await Promise.all([
          budgetService.getAll().catch(() => []),
          savingsGoalService.getAll().catch(() => [])
        ])

        // Normalize budgets (already in correct format)
        const normalizedBudgets = (budgets || []).map(b => ({
          id: b.id,
          category: b.category,
          amount: b.amount,
          period: b.period,
          type: 'budget' // Mark as budget
        }))

        // Normalize saving goals - preserve all original properties from SavingsGoals.jsx
        const normalizedGoals = (savingGoals || []).map(goal => ({
          // Preserve all original saving goal properties
          ...goal,
          // Add normalized fields for compatibility with budget structure
          category: goal.name, // Use name as category for display
          amount: goal.targetAmount, // Use targetAmount as the budget amount
          period: 'one-time', // Saving goals are typically one-time
          type: 'savingGoal' // Mark as saving goal
        }))

        // Merge budgets and saving goals, sort by category name
        const merged = [...normalizedBudgets, ...normalizedGoals].sort((a, b) =>
          a.category.localeCompare(b.category)
        )

        setAvailableBudgets(merged)
      } catch (err) {
        console.error('Error loading budgets and saving goals:', err)
        setAvailableBudgets([])
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

    // Fetch advisory for the selected country
    if (result.country) {
      // clear previous
      setAdvisory(null)
      getAdvisory(result.country).then(data => {
        if (data) setAdvisory(data)
      }).catch(console.error)
    }
  }

  // Handle form input changes
  const handleChange = (field, value) => {
    let newFormData = { ...formData }

    // Check if field is actually an object from DateRangePicker
    if (typeof field === 'object' && field !== null) {
      // field is result object e.g. {startDate, endDate}
      const changes = field
      if (changes.startDate !== undefined) newFormData.startDate = changes.startDate
      if (changes.endDate !== undefined) newFormData.endDate = changes.endDate
    } else {
      // Standard field/value
      newFormData[field] = value
    }

    // Smart Date Logic: If startDate is set and endDate is not set or is before startDate,
    // auto-suggest endDate (+4 days from startDate).
    // This logic applies after any changes have been made to newFormData.
    if (newFormData.startDate && (!newFormData.endDate || new Date(newFormData.endDate) < new Date(newFormData.startDate))) {
      const d = new Date(newFormData.startDate)
      d.setDate(d.getDate() + 4)
      newFormData.endDate = d.toISOString().split('T')[0]
    }

    setFormData(newFormData)
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
        // Link to existing budget or saving goal
        const selectedBudget = availableBudgets.find(b => b.id === selectedBudgetId)
        if (selectedBudget) {
          // Use targetAmount for saving goals, amount for budgets
          finalBudget = selectedBudget.targetAmount || selectedBudget.amount
          linkedBudgetId = selectedBudget.id
          // Note: If it's a saving goal, we're just using its target amount as the trip budget
          // The backend may need to handle this differently, but for now we treat them the same
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
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('travel.setup.step1.placeholder', 'e.g., Paris, Tokyo, New York')}
                  autoFocus
                />
                {searching && <span className="searching">{t('common.searching', 'Searching...')}</span>}
              </div>

              {/* Travel Advisory Banner - Only showing if advisory is present (after selection) */}
              {advisory && (
                <div className="wizard-advisory-banner" style={{ marginTop: '0.75rem' }}>
                  <TravelAdvisoryCard
                    advisory={advisory}
                    compact={true}
                    onClose={() => setAdvisory(null)}
                    showDetailsButton={false}
                  />
                </div>
              )}

              {searchResults.length > 0 && (
                <ul className="search-results" role="listbox">
                  {searchResults.map((result, index) => (
                    <li
                      key={index}
                      onClick={() => selectDestination(result)}
                      onTouchStart={(e) => {
                        // Prevent double-tap zoom on mobile
                        e.currentTarget.style.backgroundColor = 'rgba(142, 68, 173, 0.1)'
                      }}
                      onTouchEnd={(e) => {
                        e.currentTarget.style.backgroundColor = ''
                        selectDestination(result)
                      }}
                      role="option"
                    >
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
            <h3>{t('travel.setup.step2.title', 'When are you going?')}</h3>
            <p className="step-description">
              {t('travel.setup.step2.description', 'Select your travel dates')}
            </p>

            <div className="date-selection-container">
              <DateRangePicker
                startDate={formData.startDate}
                endDate={formData.endDate}
                onChange={(range) => handleChange(range)}
                minDate={new Date().toISOString().split('T')[0]}
                placeholder={t('travel.setup.step2.selectDates', 'Select travel dates')}
              />
            </div>
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
                <FiDollarSign /> <span>{t('wizard.newBudget', 'Create New')}</span>
              </button>
              <button
                className={`mode-btn ${budgetMode === 'existing' ? 'active' : ''}`}
                onClick={() => setBudgetMode('existing')}
              >
                <FiList /> <span>{t('wizard.existingBudget', 'Use Existing')}</span>
              </button>
            </div>

            {budgetMode === 'new' ? (
              <div className="budget-form-section">
                <div className="budget-row">
                  <div className="form-group budget-input-group">
                    <label>{t('wizard.budgetAmount', 'Total Budget')}</label>
                    <div className="budget-input">
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
                      <div className="no-budgets-msg">{t('wizard.noBudgets', 'No existing budgets or saving goals found.')}</div>
                    ) : (
                      <select
                        value={selectedBudgetId}
                        onChange={(e) => setSelectedBudgetId(e.target.value)}
                        className="budget-select"
                      >
                        <option value="">-- {t('wizard.selectBudget', 'Select a Budget')} --</option>
                        {availableBudgets.map(b => {
                          const displayName = b.type === 'savingGoal'
                            ? `${b.icon || '🎯'} ${b.category}`
                            : b.category
                          const amount = b.amount || b.targetAmount || 0
                          return (
                            <option key={b.id} value={b.id}>
                              {displayName} ({new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(amount)})
                            </option>
                          )
                        })}
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
    <div className="wizard-overlay">
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

          {/* Progress indicator - moved into header */}
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

          <button className="wizard-close" onClick={onClose} aria-label={t('common.close', 'Close')}>
            <FiX size={24} />
          </button>
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
              <span>{t('common.next', 'Next')}</span>
              <FiChevronRight />
            </button>
          ) : (
            <button
              className="wizard-btn primary"
              onClick={handleSave}
              disabled={saving}
            >
              <span>{saving ? t('common.saving', 'Saving...') : t('common.save', 'Save')}</span>
              {!saving && <FiCheck />}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default TripSetupWizard
