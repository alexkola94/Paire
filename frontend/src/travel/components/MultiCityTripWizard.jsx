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
  FiList,
  FiTrash2
} from 'react-icons/fi'
import { tripService, geocodingService, tripCityService } from '../services/travelApi'
import { getAdvisories, getAdvisory } from '../services/travelAdvisoryService'
import TravelAdvisoryBadge from './TravelAdvisoryBadge'
import TravelAdvisoryCard from './TravelAdvisoryCard'
import { budgetService, savingsGoalService } from '../../services/api'
import { TRAVEL_CURRENCIES } from '../utils/travelConstants'
import CitySelectionMap from './CitySelectionMap'
import MultiCityDistanceSummary from './MultiCityDistanceSummary'
import { getRouteDirections, calculateDistance } from '../services/discoveryService'
import { getTransportSuggestions, TRANSPORT_MODES } from '../utils/transportSuggestion'
import DatePicker from './DatePicker'
import '../styles/TripSetupWizard.css'
import '../styles/MultiCityTripWizard.css'

// Helper to calculate distance between two location objects
const getDistanceKm = (loc1, loc2) => {
  if (!loc1 || !loc2 || !loc1.latitude || !loc1.longitude || !loc2.latitude || !loc2.longitude) {
    return null
  }
  return calculateDistance(loc1.latitude, loc1.longitude, loc2.latitude, loc2.longitude)
}

/**
 * MultiCityTripWizard Component
 * Step wizard for creating multi-city trips with map-based city selection
 */
const MultiCityTripWizard = ({ trip, onClose, onSave }) => {
  const { t } = useTranslation()

  // Register modal to hide bottom navigation and explore button
  useModalRegistration(true)

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Advisory modal state
  const [isAdvisoryBannerOpen, setIsAdvisoryBannerOpen] = useState(false)

  // Budget selection state
  const [availableBudgets, setAvailableBudgets] = useState([])
  const [budgetMode, setBudgetMode] = useState('new') // 'new' or 'existing'
  const [selectedBudgetId, setSelectedBudgetId] = useState('')

  // Cities state
  const [cities, setCities] = useState([])
  const [routeDistances, setRouteDistances] = useState({})
  // Store per-leg metadata so we can adapt UI based on routing availability (e.g. sea legs)
  const [routeLegMeta, setRouteLegMeta] = useState({})
  const [routesLoading, setRoutesLoading] = useState(false)
  const [cityAdvisories, setCityAdvisories] = useState({})
  // Home location + optional distances from home → first city and last city → home.
  // This mirrors the behaviour in TravelHome and TripMicrography so users see
  // a consistent \"door-to-door\" distance picture.
  const [homeLocation, setHomeLocation] = useState(null)
  const [homeToFirstDistance, setHomeToFirstDistance] = useState(0)
  const [lastToHomeDistance, setLastToHomeDistance] = useState(0)
  // Transport selection for the return leg (Last City → Home)
  const [returnTransportMode, setReturnTransportMode] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    name: trip?.name || '',
    budget: trip?.budget || '',
    budgetCategory: trip?.name || '',
    budgetCurrency: trip?.budgetCurrency || 'EUR'
  })

  // Try to detect the user's home location once, using the browser's geolocation.
  // If permission is denied or unavailable we simply omit the home legs from
  // the distance summary – the rest of the wizard continues to work normally.
  useEffect(() => {
    if (!('geolocation' in navigator)) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setHomeLocation({ latitude, longitude })
      },
      (error) => {
        // Keep logic simple and fail silently to avoid blocking the flow.
        console.warn('Geolocation unavailable for MultiCityTripWizard:', error)
      }
    )
  }, [])

  // Load existing budgets and saving goals on mount
  useEffect(() => {
    const loadBudgets = async () => {
      try {
        const [budgets, savingGoals] = await Promise.all([
          budgetService.getAll().catch(() => []),
          savingsGoalService.getAll().catch(() => [])
        ])

        const normalizedBudgets = (budgets || []).map(b => ({
          id: b.id,
          category: b.category,
          amount: b.amount,
          period: b.period,
          type: 'budget'
        }))

        const normalizedGoals = (savingGoals || []).map(goal => ({
          ...goal,
          category: goal.name,
          amount: goal.targetAmount,
          period: 'one-time',
          type: 'savingGoal'
        }))

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

  // Load existing cities if editing
  useEffect(() => {
    const loadCities = async () => {
      if (trip?.id) {
        try {
          const tripCities = await tripCityService.getByTrip(trip.id)
          setCities(tripCities || [])
        } catch (err) {
          console.error('Error loading cities:', err)
        }
      }
    }
    loadCities()
  }, [trip?.id])

  // Handle city addition
  const handleCityAdd = async (city) => {
    // Determine the "from" location for this new leg
    const prevLocation = cities.length > 0 ? cities[cities.length - 1] : homeLocation

    // Default mode is null (which usually implies 'driving'), but we can infer smart default.
    let initialMode = city.transportMode || null

    if (!initialMode && prevLocation && prevLocation.latitude && prevLocation.longitude) {
      // Inference check
      const dist = getDistanceKm(prevLocation, city)
      if (dist != null) {
        const suggestions = getTransportSuggestions({ distanceKm: dist })
        // Use the top suggestion (e.g., flight for long distance, train for regional)
        if (suggestions.length > 0) {
          initialMode = suggestions[0]
        }
      }
    }

    // console.log('[Wizard] Adding city:', city.name, 'Initial Mode:', initialMode)

    const newCity = {
      ...city,
      id: `temp-${Date.now()}`,
      order: cities.length,
      // Keep transport explicit on the incoming leg for this city.
      transportMode: initialMode
    }
    setCities([...cities, newCity])

    // Fetch and show advisory if country is available
    if (newCity.country) {
      try {
        const advisory = await getAdvisory(newCity.country)
        if (advisory && advisory.countryCode) {
          // Update local cache so it's available immediately
          setCityAdvisories(prev => ({
            ...prev,
            [advisory.countryCode.toLowerCase()]: advisory
          }))
          setIsAdvisoryBannerOpen(true)
        }
      } catch (err) {
        console.error('Failed to load advisory on map click:', err)
      }
    }
  }

  // Handle city removal
  const handleCityRemove = (cityId) => {
    setCities(
      cities
        .filter(c => c.id !== cityId)
        .map((c, idx) => ({
          ...c,
          order: idx
        }))
    )
  }

  // Handle city reorder (drag and drop would go here, simplified for now)
  const handleCityReorder = (fromIndex, toIndex) => {
    const newCities = [...cities]
    const [moved] = newCities.splice(fromIndex, 1)
    newCities.splice(toIndex, 0, moved)
    setCities(newCities.map((c, idx) => ({ ...c, order: idx })))
  }

  // Handle transport change
  const handleCityTransportChange = (cityId, newMode) => {
    setCities(cities.map(city =>
      city.id === cityId ? { ...city, transportMode: newMode } : city
    ))
  }

  // Load advisories whenever the ordered list of city countries changes.
  useEffect(() => {
    const loadAdvisories = async () => {
      if (!cities || cities.length === 0) {
        setCityAdvisories({})
        return
      }

      // Collect country names/codes from cities, keeping it simple.
      const countryCodes = cities
        .map(city => city.country)
        .filter(Boolean)

      if (countryCodes.length === 0) {
        setCityAdvisories({})
        return
      }

      try {
        const advisories = await getAdvisories(countryCodes)
        const map = {}
        advisories.forEach(a => {
          if (a && a.countryCode) {
            map[a.countryCode.toLowerCase()] = a
          }
        })

        setCityAdvisories(map)
      } catch (error) {
        console.error('Error loading advisories for cities:', error)
      }
    }

    loadAdvisories()
    // We deliberately only depend on cities so the effect runs when user edits route.
  }, [cities])

  // Handle form input changes
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  // Helper: always work with cities in a stable route order
  const getOrderedCities = () => {
    // Keep logic simple and explicit so it's easy to reason about.
    // Order is driven by the `order` field; fallback to array index.
    return [...cities].sort((a, b) => (a.order || 0) - (b.order || 0))
  }

  // Detect mobile viewport
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1024)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Step configuration
  // Desktop: 1 (Map+List), 2 (Dates), 3 (Budget)
  // Mobile: 1 (Map Only), 2 (List/Transport), 3 (Dates), 4 (Budget)
  const MAX_STEPS = isMobile ? 4 : 3

  // Validate current step
  const validateStep = (currentStep = step) => {
    // Map Mobile Step 1 -> Desktop 1 Logic
    // Mobile Step 2 -> Desktop 1 Logic
    // Mobile Step 3 -> Desktop 2 Logic
    // Mobile Step 4 -> Desktop 3 Logic

    if (isMobile) {
      switch (currentStep) {
        case 1: // Mobile Map
          if (cities.length < 2) {
            setError(t('travel.multiCity.errors.minCities', 'Please select at least 2 cities'))
            return false
          }
          break
        case 2: // Mobile List/Review
          // Same validation as map (min cities) + Name check if needed
          if (cities.length < 2) {
            setError(t('travel.multiCity.errors.minCities', 'Please select at least 2 cities'))
            return false
          }
          break
        case 3: // Dates
          // Validate dates for each city (Same as Desktop Step 2)
          for (let i = 0; i < cities.length; i++) {
            const city = cities[i]
            if (!city.startDate) {
              setError(t('travel.multiCity.errors.cityDateRequired', 'Please set arrival date for {{city}}', { city: city.name }))
              return false
            }
            if (i > 0) {
              const prevCity = cities[i - 1]
              if (new Date(city.startDate) < new Date(prevCity.endDate || prevCity.startDate)) {
                setError(t('travel.multiCity.errors.dateOrder', 'City dates must be in order'))
                return false
              }
            }
          }
          break
        case 4: // Budget
          if (budgetMode === 'new' && formData.budget && !formData.budgetCategory) {
            setError(t('travel.setup.errors.budgetCategoryRequired', 'Please name your budget'))
            return false
          }
          if (budgetMode === 'existing' && !selectedBudgetId) {
            setError(t('wizard.selectBudget', 'Please select a budget'))
            return false
          }
          break
      }
    } else {
      // Desktop Validation (Original)
      switch (currentStep) {
        case 1:
          if (cities.length < 2) {
            setError(t('travel.multiCity.errors.minCities', 'Please select at least 2 cities'))
            return false
          }
          break
        case 2:
          // Validate dates
          for (let i = 0; i < cities.length; i++) {
            const city = cities[i]
            if (!city.startDate) {
              setError(t('travel.multiCity.errors.cityDateRequired', 'Please set arrival date for {{city}}', { city: city.name }))
              return false
            }
            if (i > 0) {
              const prevCity = cities[i - 1]
              if (new Date(city.startDate) < new Date(prevCity.endDate || prevCity.startDate)) {
                setError(t('travel.multiCity.errors.dateOrder', 'City dates must be in order'))
                return false
              }
            }
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
      }
    }
    return true
  }

  // Handle next step
  const nextStep = () => {
    if (validateStep()) {
      setError(null)
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

      // Determine canonical start/end cities based on route order
      const ordered = getOrderedCities()
      const startCity = ordered[0]
      const endCity = ordered[ordered.length - 1]

      // Handle Budget Creation/Selection
      if (budgetMode === 'new' && finalBudget > 0) {
        try {
          const newBudget = await budgetService.create({
            category: formData.budgetCategory || formData.name || 'Multi-City Trip',
            amount: finalBudget,
            startDate: startCity?.startDate,
            endDate: endCity?.endDate,
            period: 'monthly'
          })
          linkedBudgetId = newBudget.id
        } catch (err) {
          console.error('Failed to create linked budget:', err)
        }
      } else if (budgetMode === 'existing' && selectedBudgetId) {
        const selectedBudget = availableBudgets.find(b => b.id === selectedBudgetId)
        if (selectedBudget) {
          finalBudget = selectedBudget.targetAmount || selectedBudget.amount
          linkedBudgetId = selectedBudget.id
        }
      }

      // Create or update trip
      const tripData = {
        name: formData.name || ordered.map(c => c.name).join(' → '),
        destination: startCity?.name || '',
        country: startCity?.country || '',
        latitude: startCity?.latitude || null,
        longitude: startCity?.longitude || null,
        startDate: startCity?.startDate || null,
        endDate: endCity?.endDate || null,
        budget: finalBudget,
        budgetCurrency: formData.budgetCurrency,
        tripType: 'multi-city',
        linkedBudgetId,
        // Optional summary fields
        startCityName: startCity?.name || '',
        startCountry: startCity?.country || '',
        endCityName: endCity?.name || '',
        endCountry: endCity?.country || ''
      }

      let savedTrip
      if (trip?.id) {
        savedTrip = await tripService.update(trip.id, tripData)
      } else {
        savedTrip = await tripService.create(tripData)
      }

      // Save cities logic (unchanged)
      if (savedTrip?.id) {
        if (trip?.id) {
          const existingCities = await tripCityService.getByTrip(savedTrip.id)
          const existingIds = new Set(existingCities.map(c => c.id))
          const toUpdate = []
          const toCreate = []

          cities.forEach((city, index) => {
            const hasRealId = city.id && !city.id.startsWith('temp-') && existingIds.has(city.id)
            if (hasRealId) {
              toUpdate.push({ id: city.id, data: { ...city, tripId: savedTrip.id, order: index } })
            } else {
              toCreate.push({ ...city, id: undefined, tripId: savedTrip.id, order: index })
            }
          })

          const newRealIds = new Set(cities.filter(c => c.id && !c.id.startsWith('temp-')).map(c => c.id))
          const toDelete = existingCities.filter(city => !newRealIds.has(city.id)).map(city => city.id)

          await Promise.all([
            ...toUpdate.map(({ id, data }) => tripCityService.update(id, data)),
            ...toCreate.map(cityData => tripCityService.create(savedTrip.id, cityData)),
            ...toDelete.map(id => tripCityService.delete(id))
          ])
        } else {
          await Promise.all(cities.map((city, i) =>
            tripCityService.create(savedTrip.id, { ...city, id: undefined, order: i })
          ))
        }
      }

      if (onSave) onSave(savedTrip)

      if (trip?.id) {
        setSaveSuccess(true)
      } else {
        onClose()
      }
    } catch (err) {
      console.error('Error saving trip:', err)
      setError(t('travel.setup.errors.saveFailed', 'Failed to save trip. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  // --- Render Helpers ---

  const renderMapSection = (orderedCities) => (
    <div className="wizard-step-map" style={isMobile ? { height: '100%' } : {}}>
      <div className="city-selection-map-wrapper">
        <CitySelectionMap
          cities={orderedCities}
          onCityAdd={handleCityAdd}
          onCityRemove={handleCityRemove}
          onCityReorder={handleCityReorder}
          homeLocation={homeLocation}
          returnTransportMode={returnTransportMode}
        />
      </div>
    </div>
  )

  const renderListSection = (orderedCities, startCity, endCity, advisoriesList) => (
    <div className="wizard-step-details">
      <h3>{isMobile ? t('travel.multiCity.step2.manageRoute', 'Review Route') : t('travel.multiCity.step1.title', 'Select Cities')}</h3>
      <p className="step-description">
        {isMobile
          ? t('travel.multiCity.step2.manageDescription', 'Arrange your stops and choose transport.')
          : t('travel.multiCity.step1.description', 'Click on the map to add cities to your trip')
        }
      </p>

      {/* Advisory Banner */}
      {isAdvisoryBannerOpen && advisoriesList.length > 0 && (
        <div className="wizard-advisory-banner" style={{ marginBottom: '1rem' }}>
          <TravelAdvisoryCard
            advisories={advisoriesList}
            compact={true}
            onClose={() => setIsAdvisoryBannerOpen(false)}
            showDetailsButton={false}
          />
        </div>
      )}

      {/* Route overview */}
      {orderedCities.length > 1 && (
        <div className="route-overview-card">
          <div className="route-overview-header">
            {t('travel.multiCity.step1.routeOverview', 'Route overview')}
          </div>
          <div className="route-overview-body">
            <div className="route-endpoint">
              <span className="endpoint-label">{t('travel.multiCity.step1.startLabel', 'Start')}</span>
              <div className="endpoint-chip">
                <span className="endpoint-number">1</span>
                <div className="endpoint-text">
                  <span className="endpoint-city">{startCity?.name}</span>
                  {startCity?.country && <span className="endpoint-country">{startCity.country}</span>}
                </div>
              </div>
            </div>
            <div className="route-arrow"><span>→</span></div>
            <div className="route-endpoint">
              <span className="endpoint-label">{t('travel.multiCity.step1.endLabel', 'End')}</span>
              <div className="endpoint-chip">
                <span className="endpoint-number">{orderedCities.length}</span>
                <div className="endpoint-text">
                  <span className="endpoint-city">{endCity?.name}</span>
                  {endCity?.country && <span className="endpoint-country">{endCity.country}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected cities list */}
      {orderedCities.length > 0 && (
        <div className="selected-cities-list">
          <h4>{t('travel.multiCity.step1.selectedCities', 'Selected Cities')}</h4>
          <div className="selected-cities-tags">
            {orderedCities.map((city, index) => (
              <div key={city.id || index} className="city-tag">
                <span className="city-tag-number">{index + 1}</span>
                <div className="city-tag-info">
                  <span className="city-tag-name">{city.name}</span>
                  {city.country && <span className="city-tag-country">{city.country}</span>}
                </div>
                <button
                  className="city-tag-remove"
                  onClick={() => handleCityRemove(city.id)}
                  aria-label={t('common.remove', 'Remove')}
                >
                  <FiX size={12} />
                </button>
              </div>
            ))}
          </div>

          <MultiCityDistanceSummary
            cities={cities}
            orderedCities={orderedCities}
            routeDistances={routeDistances}
            routeLegMeta={routeLegMeta}
            homeLocation={homeLocation}
            homeToFirstDistance={homeToFirstDistance}
            lastToHomeDistance={lastToHomeDistance}
            getDistanceKm={getDistanceKm}
            onCityTransportChange={handleCityTransportChange}
            returnTransportMode={returnTransportMode}
            onReturnTransportChange={setReturnTransportMode}
            routesLoading={routesLoading}
          />
        </div>
      )}

      <div className="form-group">
        <label>{t('travel.multiCity.step1.tripName', 'Trip Name (optional)')}</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder={t('travel.multiCity.step1.namePlaceholder', 'e.g., European Adventure')}
        />
      </div>
    </div>
  )

  // Step content
  const renderStep = () => {
    // Shared Data
    const orderedCities = getOrderedCities()
    const startCity = orderedCities[0]
    const endCity = orderedCities[orderedCities.length - 1]
    const uniqueCountries = [...new Set(cities.map(c => c.country).filter(Boolean))]
    const advisoriesList = uniqueCountries.reverse().map(cName =>
      Object.values(cityAdvisories).find(a =>
        (a.countryName || a.name || '').toLowerCase() === cName.toLowerCase()
      )
    ).filter(Boolean)

    // Mobile Logic (4 Steps)
    if (isMobile) {
      switch (step) {
        case 1: // Mobile Map Only
          <div className="wizard-step mobile-map-step" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="city-selection-map-wrapper" style={{ margin: '-0.75rem', width: 'calc(100% + 1.5rem)', height: 'calc(100% + 1.5rem)', borderRadius: 0 }}>
              <CitySelectionMap
                cities={orderedCities}
                onCityAdd={handleCityAdd}
                onCityRemove={handleCityRemove}
                onCityReorder={handleCityReorder}
                homeLocation={homeLocation}
                returnTransportMode={returnTransportMode}
              />

              {/* Floating City Counter Overlay */}
              <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(8px)',
                padding: '6px 16px',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: '600',
                color: 'var(--text-primary)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                pointerEvents: 'none',
                zIndex: 10,
                whiteSpace: 'nowrap'
              }}>
                {orderedCities.length} {t('travel.multiCity.selectedCount', 'cities selected')}
              </div>
            </div>
          </div>
        case 2: // Mobile List Review
          return (
            <div className="wizard-step">
              {renderListSection(orderedCities, startCity, endCity, advisoriesList)}
            </div>
          )
        // Cases 3 & 4 map to standard logic below via shared variable or direct return
        case 3: // Dates
          // Fall through to shared logic? No, easier to copy standard logic for clarity or extract it.
          // Let's extract the Date/Budget steps as they are identical.
          break
        case 4: // Budget
          break
      }
    } else {
      // Desktop Logic (3 Steps)
      if (step === 1) {
        return (
          <div className="wizard-step wizard-step-split">
            {renderListSection(orderedCities, startCity, endCity, advisoriesList)}
            {renderMapSection(orderedCities)}
          </div>
        )
      }
    }

    // Shared Step renderers (Dates & Budget)
    // Mobile Step 3 = Desktop Step 2 (Dates)
    // Mobile Step 4 = Desktop Step 3 (Budget)
    const isDateStep = (isMobile && step === 3) || (!isMobile && step === 2)
    const isBudgetStep = (isMobile && step === 4) || (!isMobile && step === 3)

    if (isDateStep) {
      return (
        <div className="wizard-step">
          <h3>{t('travel.multiCity.step2.title', 'Set Dates')}</h3>
          <p className="step-description">
            {t('travel.multiCity.step2.description', 'Set arrival and departure dates for each city')}
          </p>

          <div className="city-dates-list">
            {cities
              .sort((a, b) => (a.order || 0) - (b.order || 0))
              .map((city, index) => {
                const advisoryKey = (city.country || '').toLowerCase()
                const advisory = cityAdvisories[advisoryKey]

                return (
                  <div key={city.id || index} className="city-date-card">
                    <div className="city-date-header">
                      <div className="city-date-number">{index + 1}</div>
                      <div className="city-date-info">
                        <span className="city-date-name">{city.name}</span>
                        {city.country && (
                          <span className="city-date-country">
                            {city.country}
                            {advisory && (
                              <span className="city-advisory-inline">
                                <TravelAdvisoryBadge advisory={advisory} />
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="city-date-inputs">
                      <div className="form-group">
                        <DatePicker
                          label={t('travel.multiCity.step2.arrival', 'Arrival')}
                          value={city.startDate || ''}
                          onChange={(newValue) => {
                            const newCities = [...cities]
                            newCities[index] = { ...city, startDate: newValue }
                            setCities(newCities)
                          }}
                          min={index > 0 ? cities[index - 1]?.endDate || cities[index - 1]?.startDate : new Date().toISOString().split('T')[0]}
                          placeholder={t('travel.multiCity.step2.selectArrival', 'Select arrival date')}
                        />
                      </div>
                      <div className="form-group">
                        <DatePicker
                          label={t('travel.multiCity.step2.departure', 'Departure')}
                          value={city.endDate || ''}
                          onChange={(newValue) => {
                            const newCities = [...cities]
                            newCities[index] = { ...city, endDate: newValue }
                            setCities(newCities)
                          }}
                          min={city.startDate || new Date().toISOString().split('T')[0]}
                          placeholder={t('travel.multiCity.step2.selectDeparture', 'Select departure date')}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>

          {cities.length > 0 && cities[0]?.startDate && cities[cities.length - 1]?.endDate && (
            <div className="trip-duration">
              {(() => {
                const start = new Date(cities[0].startDate)
                const end = new Date(cities[cities.length - 1].endDate)
                const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
                return t('travel.setup.step2.duration', '{{days}} days', { days })
              })()}
            </div>
          )}
        </div>
      )
    }

    if (isBudgetStep) {
      return (
        <div className="wizard-step">
          <h3>{t('travel.setup.step3.title', 'Set your budget')}</h3>
          <p className="step-description">
            {t('travel.setup.step3.description', 'Link an existing budget or create a new one')}
          </p>

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
    }

    return null
  }

  return (
    <div className="wizard-overlay">
      <motion.div
        className="wizard-modal multi-city-wizard"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="wizard-header">
          <h2>
            {trip ? t('travel.multiCity.editTrip', 'Edit Trip') : t('travel.multiCity.createTrip', 'Create Trip')}
          </h2>

          {/* Progress indicator - dynamic based on mobile/desktop */}
          <div className="wizard-progress">
            {Array.from({ length: MAX_STEPS }).map((_, i) => {
              const s = i + 1
              return (
                <div
                  key={s}
                  className={`progress-step ${s === step ? 'active' : ''} ${s < step ? 'completed' : ''}`}
                >
                  {s < step ? <FiCheck size={14} /> : s}
                </div>
              )
            })}
          </div>

          <div className="wizard-header-actions">
            {trip && (
              <button
                type="button"
                className="wizard-header-delete"
                onClick={handleDeleteTrip}
                disabled={saving}
                title={t('travel.multiCity.deleteTrip', 'Delete Trip')}
              >
                <FiTrash2 size={20} />
              </button>
            )}
            <button className="wizard-close" onClick={onClose} aria-label="Close">
              <FiX size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="wizard-content">
          {saveSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="wizard-success"
            >
              <div className="success-icon">
                <FiCheck size={48} />
              </div>
              <h3>{t('travel.multiCity.saveSuccess.title', 'Trip Saved Successfully!')}</h3>
              <p>{t('travel.multiCity.saveSuccess.message', 'Your multi-city trip has been saved.')}</p>
              <div className="success-actions">
                <button
                  className="wizard-btn secondary"
                  onClick={() => {
                    setSaveSuccess(false)
                    setStep(1)
                  }}
                >
                  {t('travel.multiCity.saveSuccess.editMore', 'Edit More')}
                </button>
                <button
                  className="wizard-btn primary"
                  onClick={onClose}
                >
                  {t('common.done', 'Done')}
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  style={{ height: '100%' }} // Ensure full height for map step
                >
                  {renderStep()}
                </motion.div>
              </AnimatePresence>
            </>
          )}
        </div>

        {/* Footer */}
        {
          !saveSuccess && (
            <div className="wizard-footer">
              <div className="wizard-footer-error" style={{ flex: 1, marginRight: '1rem' }}>
                {error && <div className="wizard-error" style={{ margin: 0, padding: '0.5rem', fontSize: '0.85rem' }}>{error}</div>}
              </div>
              <div className="wizard-footer-right">
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

                {step < MAX_STEPS ? (
                  <button className="wizard-btn primary" onClick={nextStep} disabled={saving}>
                    <span>{t('common.next', 'Next')}</span>
                    <FiChevronRight />
                  </button>
                ) : (
                  <button
                    className="wizard-btn primary"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner" />
                        <span>{t('common.saving', 'Saving...')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('common.save', 'Save')}</span>
                        <FiCheck />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )
        }
      </motion.div >
    </div >
  )
}

export default MultiCityTripWizard
