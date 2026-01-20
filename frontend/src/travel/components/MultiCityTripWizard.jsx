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
import { getAdvisories } from '../services/travelAdvisoryService'
import TravelAdvisoryBadge from './TravelAdvisoryBadge'
import { budgetService, savingsGoalService } from '../../services/api'
import { TRAVEL_CURRENCIES } from '../utils/travelConstants'
import CitySelectionMap from './CitySelectionMap'
import MultiCityDistanceSummary from './MultiCityDistanceSummary'
import { getRouteDirections } from '../services/discoveryService'
import DatePicker from './DatePicker'
import '../styles/TripSetupWizard.css'
import '../styles/MultiCityTripWizard.css'

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
  const handleCityAdd = (city) => {
    const newCity = {
      ...city,
      id: `temp-${Date.now()}`,
      order: cities.length,
      // Keep transport explicit on the incoming leg for this city.
      transportMode: city.transportMode || null
    }
    setCities([...cities, newCity])
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

  // Validate current step
  const validateStep = () => {
    switch (step) {
      case 1:
        if (cities.length < 2) {
          setError(t('travel.multiCity.errors.minCities', 'Please select at least 2 cities'))
          return false
        }
        break
      case 2:
        // Validate dates for each city
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
        // Optional summary fields so other views can easily show
        // a clear \"Start → End\" label without re-deriving.
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

      // Save cities: optimized for performance with ID-based matching
      if (savedTrip?.id) {
        if (trip?.id) {
          // Editing: fetch existing cities once
          const existingCities = await tripCityService.getByTrip(savedTrip.id)
          const existingIds = new Set(existingCities.map(c => c.id))
          
          // Separate cities by operation type using ID matching (fastest approach)
          const toUpdate = []
          const toCreate = []
          
          cities.forEach((city, index) => {
            // Check if city has a real ID (not temp) and exists in database
            const hasRealId = city.id && !city.id.startsWith('temp-') && existingIds.has(city.id)
            
            if (hasRealId) {
              // UPDATE: City exists, update it with new data and order
              toUpdate.push({
                id: city.id,
                data: {
                  ...city,
                  tripId: savedTrip.id,
                  order: index
                }
              })
            } else {
              // CREATE: New city (no ID or temp ID)
              toCreate.push({
                ...city,
                id: undefined, // Remove temp ID if present
                tripId: savedTrip.id,
                order: index
              })
            }
          })
          
          // Find cities to DELETE: existing cities not in new list
          const newRealIds = new Set(
            cities
              .filter(c => c.id && !c.id.startsWith('temp-'))
              .map(c => c.id)
          )
          const toDelete = existingCities
            .filter(city => !newRealIds.has(city.id))
            .map(city => city.id)
          
          // Execute all operations in parallel for maximum performance
          await Promise.all([
            // Update existing cities
            ...toUpdate.map(({ id, data }) => tripCityService.update(id, data)),
            // Create new cities
            ...toCreate.map(cityData => tripCityService.create(savedTrip.id, cityData)),
            // Delete removed cities
            ...toDelete.map(id => tripCityService.delete(id))
          ])
        } else {
          // Creating new trip: create all cities in parallel
          await Promise.all(
            cities.map((city, i) =>
              tripCityService.create(savedTrip.id, {
                ...city,
                id: undefined, // Remove any temp IDs
                order: i
              })
            )
          )
        }
      }

      // Call onSave callback first (this will trigger switch confirmation in TravelHome)
      if (onSave) {
        onSave(savedTrip)
      }
      
      // If editing existing trip, show success screen
      // If creating new trip, close wizard to show switch confirmation modal
      if (trip?.id) {
        // Editing: show success screen
        setSaveSuccess(true)
      } else {
        // Creating new: close wizard to show switch confirmation
        onClose()
      }
    } catch (err) {
      console.error('Error saving trip:', err)
      setError(t('travel.setup.errors.saveFailed', 'Failed to save trip. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTrip = async () => {
    // Check for trip id or trip object itself
    const tripId = trip?.id || trip
    if (!tripId || saving) return

    const confirmed = window.confirm(
      t(
        'travel.multiCity.confirmDelete',
        'Delete this trip and all its cities? This cannot be undone.'
      )
    )
    if (!confirmed) return

    try {
      setSaving(true)
      setError(null)
      await tripService.delete(tripId)
      if (onSave) {
        onSave(null)
      }
      onClose()
    } catch (err) {
      console.error('Error deleting trip:', err)
      setError(t('travel.multiCity.errors.deleteFailed', 'Failed to delete trip. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  // Helper: compute straight-line distance in km between two cities (haversine)
  // Used as a fallback when real route directions are not available.
  const getDistanceKm = (from, to) => {
    if (
      !from ||
      !to ||
      from.latitude == null ||
      from.longitude == null ||
      to.latitude == null ||
      to.longitude == null
    ) {
      return null
    }

    const toRad = (v) => (v * Math.PI) / 180
    const R = 6371 // km

    const dLat = toRad(to.latitude - from.latitude)
    const dLng = toRad(to.longitude - from.longitude)

    const lat1 = toRad(from.latitude)
    const lat2 = toRad(to.latitude)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Whenever cities change, pre-compute realistic route distances between consecutive cities
  // using Mapbox Directions. Results are stored by city-pair key for quick lookup.
  useEffect(() => {
    const ordered = getOrderedCities()
    if (ordered.length === 0) {
      setRouteDistances({})
      setRouteLegMeta({})
      setHomeToFirstDistance(0)
      setLastToHomeDistance(0)
      return
    }

    let cancelled = false

    const computeRoutes = async () => {
      try {
        setRoutesLoading(true)
        const distances = {}
        const meta = {}
        let homeToFirst = 0
        let lastToHome = 0

        const tasks = []
        for (let i = 0; i < ordered.length - 1; i++) {
          const from = ordered[i]
          const to = ordered[i + 1]

          if (
            from.latitude == null ||
            from.longitude == null ||
            to.latitude == null ||
            to.longitude == null
          ) {
            continue
          }

          const key = `${from.id}-${to.id}`
          tasks.push(
            getRouteDirections(from.latitude, from.longitude, to.latitude, to.longitude, 'driving')
              .then(result => {
                if (!cancelled && result) {
                  const distanceKm =
                    result.distanceKm != null ? result.distanceKm : getDistanceKm(from, to)
                  if (distanceKm != null) {
                    distances[key] = distanceKm
                    meta[key] = {
                      distanceKm,
                      usedFallback: !!result.usedFallback
                    }
                  }
                }
              })
              .catch(err => {
                console.error('Error computing route distance between cities:', err)
              })
          )
        }

        // Optional home legs: from Home → first city and last city → Home.
        // These are only used for the summary numbers (not for per-leg rows),
        // and they follow the same driving-profile routing used elsewhere.
        if (
          homeLocation &&
          homeLocation.latitude != null &&
          homeLocation.longitude != null &&
          ordered.length > 0
        ) {
          const firstCity = ordered[0]
          const lastCity = ordered[ordered.length - 1]

          const hasFirstCoords =
            firstCity?.latitude != null && firstCity?.longitude != null
          const hasLastCoords =
            lastCity?.latitude != null && lastCity?.longitude != null

          const addHomeLegTask = (fromLat, fromLng, toLat, toLng, assign) =>
            getRouteDirections(fromLat, fromLng, toLat, toLng, 'driving')
              .then(result => {
                if (!cancelled && result?.distanceKm != null) {
                  assign(result.distanceKm)
                }
              })
              .catch(err => {
                console.error('Error computing home leg distance in wizard:', err)
              })

          if (hasFirstCoords) {
            tasks.push(
              addHomeLegTask(
                homeLocation.latitude,
                homeLocation.longitude,
                firstCity.latitude,
                firstCity.longitude,
                (km) => { homeToFirst = km }
              )
            )
          }

          if (hasLastCoords) {
            tasks.push(
              addHomeLegTask(
                lastCity.latitude,
                lastCity.longitude,
                homeLocation.latitude,
                homeLocation.longitude,
                (km) => { lastToHome = km }
              )
            )
          }
        }

        await Promise.all(tasks)

        if (!cancelled) {
          setRouteDistances(distances)
          setRouteLegMeta(meta)
          setHomeToFirstDistance(homeToFirst)
          setLastToHomeDistance(lastToHome)
        }
      } finally {
        if (!cancelled) {
          setRoutesLoading(false)
        }
      }
    }

    computeRoutes()

    return () => {
      cancelled = true
    }
  }, [cities, homeLocation])

  // Centralised handler so distance summary stays dumb and reusable.
  const handleCityTransportChange = (cityId, mode) => {
    setCities(prevCities => {
      const next = [...prevCities]
      const idx = next.findIndex(c => c.id === cityId)
      if (idx === -1) return prevCities
      next[idx] = {
        ...next[idx],
        transportMode: mode
      }
      return next
    })
  }

  // Step content
  const renderStep = () => {
    switch (step) {
      case 1:
        // Ensure a stable ordering for UI + distance calculations
        const orderedCities = getOrderedCities()
        const startCity = orderedCities[0]
        const endCity = orderedCities[orderedCities.length - 1]

        return (
          <div className="wizard-step wizard-step-split">
            {/* Left column: details */}
            <div className="wizard-step-details">
              <h3>{t('travel.multiCity.step1.title', 'Select Cities')}</h3>
              <p className="step-description">
                {t('travel.multiCity.step1.description', 'Click on the map to add cities to your trip')}
              </p>

              {/* Route overview: high-level start/end points */}
              {orderedCities.length > 1 && (
                <div className="route-overview-card">
                  <div className="route-overview-header">
                    {t('travel.multiCity.step1.routeOverview', 'Route overview')}
                  </div>
                  <div className="route-overview-body">
                    <div className="route-endpoint">
                      <span className="endpoint-label">
                        {t('travel.multiCity.step1.startLabel', 'Start')}
                      </span>
                      <div className="endpoint-chip">
                        <span className="endpoint-number">1</span>
                        <div className="endpoint-text">
                          <span className="endpoint-city">{startCity?.name}</span>
                          {startCity?.country && (
                            <span className="endpoint-country">{startCity.country}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="route-arrow">
                      <span>→</span>
                    </div>
                    <div className="route-endpoint">
                      <span className="endpoint-label">
                        {t('travel.multiCity.step1.endLabel', 'End')}
                      </span>
                      <div className="endpoint-chip">
                        <span className="endpoint-number">
                          {orderedCities.length}
                        </span>
                        <div className="endpoint-text">
                          <span className="endpoint-city">{endCity?.name}</span>
                          {endCity?.country && (
                            <span className="endpoint-country">{endCity.country}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Selected cities section */}
              {orderedCities.length > 0 && (
                <div className="selected-cities-list">
                  <h4>{t('travel.multiCity.step1.selectedCities', 'Selected Cities')}</h4>
                  
                  {/* City tags - clean and minimal */}
                  <div className="selected-cities-tags">
                    {orderedCities.map((city, index) => (
                      <div key={city.id || index} className="city-tag">
                        <span className="city-tag-number">{index + 1}</span>
                        <div className="city-tag-info">
                          <span className="city-tag-name">{city.name}</span>
                          {city.country && (
                            <span className="city-tag-country">{city.country}</span>
                          )}
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

                  {/* Distance summary - clean route visualization */}
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

            {/* Right column: map */}
            <div className="wizard-step-map">
              <div className="city-selection-map-wrapper">
                <CitySelectionMap
                  cities={orderedCities}
                  onCityAdd={handleCityAdd}
                  onCityRemove={handleCityRemove}
                  onCityReorder={handleCityReorder}
                />
              </div>
            </div>
          </div>
        )

      case 2:
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
                )})}
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

      default:
        return null
    }
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
            {trip ? t('travel.multiCity.editTrip', 'Edit Multi-City Trip') : t('travel.multiCity.createTrip', 'Create Multi-City Trip')}
          </h2>
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
                >
                  {renderStep()}
                </motion.div>
              </AnimatePresence>

              {error && (
                <div className="wizard-error">{error}</div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!saveSuccess && (
          <div className="wizard-footer">
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

              {step < 3 ? (
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
        )}
      </motion.div>
    </div>
  )
}

export default MultiCityTripWizard
