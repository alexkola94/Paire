import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useModalRegistration } from '../../context/ModalContext'
import { useTravelMode } from '../context/TravelModeContext'
import {
  FiPlus,
  FiCheck,
  FiTrash2,
  FiPackage,
  FiX,
  FiZap,
  FiChevronDown,
  FiChevronUp,
  FiLoader
} from 'react-icons/fi'
import { packingService, tripCityService } from '../services/travelApi'

import { PACKING_CATEGORIES } from '../utils/travelConstants'
import { generatePackingSuggestions } from '../utils/packingSuggestions'
import '../styles/Packing.css'
import db from '../services/travelDb'

/**
 * Packing Page Component
 * Smart packing checklist with categories
 */
const PackingPage = ({ trip }) => {
  const { t } = useTranslation()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeCategory, setActiveCategory] = useState(null)
  const [collapsedCategories, setCollapsedCategories] = useState(() => {
    const initial = {}
    Object.keys(PACKING_CATEGORIES).forEach(key => {
      initial[key] = true
    })
    return initial
  })
  const [tripCities, setTripCities] = useState([])
  const { setBackgroundMapCities, refreshKey } = useTravelMode()

  // Load cities for multi-city context (supports background map)
  useEffect(() => {
    const loadCities = async () => {
      if (!trip?.id) {
        setTripCities([])
        setBackgroundMapCities([])
        return
      }

      try {
        const cities = await tripCityService.getByTrip(trip.id)
        setTripCities(cities || [])
        setBackgroundMapCities(cities || [])
      } catch (error) {
        console.error('Error loading cities for PackingPage map:', error)
        setTripCities([])
        setBackgroundMapCities([])
      }
    }

    loadCities()
  }, [trip?.id])

  // Load packing items and weather
  useEffect(() => {
    const loadData = async () => {
      if (!trip?.id) {
        setLoading(false)
        return
      }

      try {
        // Load items
        const data = await packingService.getByTrip(trip.id)
        setItems(data || [])

        // Load weather for smart suggestions (if location set)
        if (trip.latitude && trip.longitude) {
          fetchWeather(trip)
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [trip?.id, trip?.latitude, trip?.longitude, refreshKey])

  // Fetch weather for suggestions
  const [weatherCondition, setWeatherCondition] = useState(null)

  const fetchWeather = async (tripData) => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${tripData.latitude}&longitude=${tripData.longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`
      )
      if (response.ok) {
        const data = await response.json()
        analyzeWeather(data)
      }
    } catch (err) {
      console.error('Weather fetch failed', err)
    }
  }

  const analyzeWeather = (data) => {
    if (!data.daily) return

    // Simple analysis
    const maxTemps = data.daily.temperature_2m_max
    const codes = data.daily.weathercode

    const avgMax = maxTemps.reduce((a, b) => a + b, 0) / maxTemps.length
    const hasRain = codes.some(c => c >= 51 && c <= 67 || c >= 80 && c <= 82)
    const hasSnow = codes.some(c => c >= 71 && c <= 77 || c >= 85 && c <= 86)

    if (hasSnow || avgMax < 5) setWeatherCondition('cold')
    else if (hasRain) setWeatherCondition('rainy')
    else if (avgMax > 28) setWeatherCondition('hot')
    else if (trip.destination?.toLowerCase().includes('beach')) setWeatherCondition('beach')
    else setWeatherCondition(null)
  }


  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    const category = item.category || 'other'
    if (!acc[category]) acc[category] = []
    acc[category].push(item)
    return acc
  }, {})

  // Calculate progress
  const totalItems = items.length
  const checkedItems = items.filter(i => i.isChecked).length
  const progress = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0

  // Toggle item checked
  const handleToggleItem = async (item) => {
    // Optimistic update
    const previousItems = [...items]
    const newItemState = { ...item, isChecked: !item.isChecked }

    // Update UI immediately
    setItems(prev => prev.map(i => i.id === item.id ? newItemState : i))

    try {
      // FIX: Send full object to prevent backend from nulling out other fields
      // The backend uses a full update strategy, so partial updates result in null fields
      const updatePayload = {
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        isEssential: item.isEssential,
        isChecked: !item.isChecked,
        notes: item.notes
      }

      await packingService.update(trip.id, item.id, updatePayload)

      // Invalidate TravelHome cache
      db.apiCache.where('key').equals(`trip-summary-${trip.id}`).delete().catch(() => { })

      // Dispatch event to invalidate cache in TravelHome (packing progress changes)
      window.dispatchEvent(new CustomEvent('travel:item-updated', { detail: { type: 'packing', tripId: trip.id } }))
    } catch (error) {
      console.error('Error toggling item:', error)
      // Revert on error
      setItems(previousItems)
    }
  }

  // Delete item
  const handleDeleteItem = async (itemId) => {
    const itemToDelete = items.find(i => i.id === itemId)
    if (!itemToDelete) return

    const previousItems = [...items]

    // Optimistic delete
    setItems(prev => prev.filter(i => i.id !== itemId))

    try {
      await packingService.delete(trip.id, itemId)

      // Invalidate TravelHome cache
      db.apiCache.where('key').equals(`trip-summary-${trip.id}`).delete().catch(() => { })

      // Dispatch event to invalidate cache in TravelHome
      window.dispatchEvent(new CustomEvent('travel:item-deleted', { detail: { type: 'packing', tripId: trip.id } }))
    } catch (error) {
      console.error('Error deleting item:', error)
      // Revert on error
      setItems(previousItems)
    }
  }

  // Add item with optimistic updates
  const handleAddItem = async (itemData) => {
    // Close modal immediately for optimistic UX
    setShowAddModal(false)

    // Create optimistic item with temporary ID
    const tempId = `temp-${Date.now()}`
    const optimisticItem = {
      id: tempId,
      tripId: trip.id,
      ...itemData,
      isChecked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _optimistic: true
    }

    // Add optimistic item to list immediately
    setItems(prev => [...prev, optimisticItem])
    setSaving(true)

    try {
      // Call API
      const createdItem = await packingService.create(trip.id, itemData)

      // Replace optimistic item with real item from server
      setItems(prev => prev.map(i => i.id === tempId ? createdItem : i))

      // Invalidate TravelHome cache
      db.apiCache.where('key').equals(`trip-summary-${trip.id}`).delete().catch(() => { })

      // Dispatch event to invalidate cache in TravelHome
      window.dispatchEvent(new CustomEvent('travel:item-added', { detail: { type: 'packing', tripId: trip.id } }))
    } catch (error) {
      console.error('Error adding item:', error)
      // Remove optimistic item on error
      setItems(prev => prev.filter(i => i.id !== tempId))
    } finally {
      setSaving(false)
    }
  }

  // Add suggested items
  const handleAddSuggestions = async (weatherOverride = null) => {
    const weather = weatherOverride || weatherCondition
    const suggestions = generatePackingSuggestions(trip, { weather })
    const existingNames = new Set(items.map(i => i.name.toLowerCase()))
    const newSuggestions = suggestions.filter(s => !existingNames.has(s.name.toLowerCase()))

    try {
      if (newSuggestions.length === 0) return

      const created = await packingService.bulkCreate(trip.id, newSuggestions.slice(0, 20))
      setItems(prev => [...prev, ...created])
      setShowSuggestions(false)
    } catch (error) {
      console.error('Error adding suggestions:', error)
    }
  }

  // Toggle category collapse... (keep existing)
  const toggleCategory = (categoryKey) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [categoryKey]: !prev[categoryKey]
    }))
  }

  if (!trip) {
    // ... (keep existing)
    return (
      <div className="packing-page empty-state">
        <FiPackage size={48} />
        <h3>{t('travel.packing.noTrip', 'No Trip Selected')}</h3>
        <p>{t('travel.packing.createTripFirst', 'Create a trip to start your packing list')}</p>
      </div>
    )
  }

  // Lazy-load the packing view while items are being fetched
  if (trip && loading) {
    return (
      <div className="travel-page-loading">
        <div className="travel-glass-card travel-page-loading-card">
          <FiLoader size={22} className="travel-spinner travel-page-loading-icon" />
          <p className="travel-page-loading-text">
            {t('travel.common.loadingTripView', 'Loading your trip view...')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="packing-page">
      {/* Progress Header */}
      <motion.div
        className="travel-glass-card packing-progress"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* ... (keep existing progress bar) */}
        <div className="progress-header">
          <div className="progress-info">
            <span className="progress-label">{t('travel.packing.progress', 'Packing Progress')}</span>
            <span className="progress-count">{checkedItems}/{totalItems} {t('travel.packing.items', 'items')}</span>
          </div>
          <div className="progress-percentage">{progress}%</div>
        </div>
        <div className="progress-bar">
          <motion.div
            className="progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </motion.div>

      {/* Weather Suggestion Card */}
      {weatherCondition && (
        <motion.div
          className="weather-suggestion-card"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          <div className="suggestion-icon">
            <FiZap />
          </div>
          <div className="suggestion-content">
            <h4>
              {weatherCondition === 'rainy' && t('travel.packing.rainWarn', 'Rain predicted! ☔')}
              {weatherCondition === 'cold' && t('travel.packing.coldWarn', 'It looks cold! ❄️')}
              {weatherCondition === 'hot' && t('travel.packing.hotWarn', 'Heatwave ahead! ☀️')}
              {weatherCondition === 'beach' && t('travel.packing.beachWarn', 'Beach time! 🏖️')}
            </h4>
            <p>{t('travel.packing.weatherTip', 'We found some essential items for this weather.')}</p>
          </div>
          <button
            className="add-suggestion-btn"
            onClick={() => handleAddSuggestions(weatherCondition)}
          >
            {t('travel.common.add', 'Add Items')}
          </button>
        </motion.div>
      )}

      {/* Quick Actions */}
      <div className="packing-actions">
        <div className="actions-left">
          {saving && (
            <span className="saving-indicator">
              <FiLoader size={14} className="spinning" />
              {t('travel.packing.adding', 'Adding item...')}
            </span>
          )}
        </div>
        <div className="actions-right">
          <button className="action-btn primary" onClick={() => setShowAddModal(true)}>
            <FiPlus size={18} />
            {t('travel.packing.addItem', 'Add Item')}
          </button>
          {items.length === 0 && (
            <button className="action-btn secondary" onClick={() => handleAddSuggestions()}>
              <FiZap size={18} />
              {t('travel.packing.addSuggestions', 'Smart Suggestions')}
            </button>
          )}
        </div>
      </div>

      {/* Category Lists */}
      <div className="packing-categories">
        {Object.entries(PACKING_CATEGORIES)
          .sort(([, a], [, b]) => t(a.label).localeCompare(t(b.label)))
          .map(([key, category]) => {
            const categoryItems = groupedItems[key] || []
            if (categoryItems.length === 0 && activeCategory !== key) return null

            const checkedCount = categoryItems.filter(i => i.isChecked).length

            return (
              <motion.div
                key={key}
                className="category-section"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div
                  className="category-header"
                  onClick={() => toggleCategory(key)}
                >
                  <div className="category-info">
                    <span className="category-name" style={{ color: category.color }}>
                      {t(category.label)}
                    </span>
                    <span className="category-count">
                      {checkedCount}/{categoryItems.length}
                    </span>
                  </div>
                  <div className="category-actions">
                    <div className="category-progress">
                      <div
                        className="category-progress-fill"
                        style={{
                          width: categoryItems.length > 0
                            ? `${(checkedCount / categoryItems.length) * 100}%`
                            : '0%',
                          background: category.color
                        }}
                      />
                    </div>
                    {collapsedCategories[key] ? <FiChevronUp /> : <FiChevronDown />}
                  </div>
                </div>

                <AnimatePresence>
                  {!collapsedCategories[key] && categoryItems.length > 0 && (
                    <motion.div
                      className="category-items"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      {categoryItems.map((item) => (
                        <motion.div
                          key={item.id}
                          className={`packing-item ${item.isChecked ? 'checked' : ''}`}
                          layout
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                        >
                          <button
                            className="check-btn"
                            onClick={() => handleToggleItem(item)}
                            style={{
                              borderColor: item.isChecked ? category.color : undefined,
                              background: item.isChecked ? category.color : undefined
                            }}
                          >
                            {item.isChecked && <FiCheck size={14} />}
                          </button>
                          <span className="item-name">{item.name}</span>
                          {item.quantity > 1 && (
                            <span className="item-qty">x{item.quantity}</span>
                          )}
                          {item.isEssential && (
                            <span className="essential-badge">!</span>
                          )}
                          <button
                            className="delete-btn"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
      </div>

      {/* Empty State */}
      {items.length === 0 && !loading && (
        <div className="packing-empty">
          <FiPackage size={48} />
          <h3>{t('travel.packing.emptyTitle', 'Your packing list is empty')}</h3>
          <p>{t('travel.packing.emptyDescription', 'Add items manually or use smart suggestions')}</p>
        </div>
      )}

      {/* Add Item Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddItemModal
            onClose={() => setShowAddModal(false)}
            onSave={handleAddItem}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Add Item Modal
const AddItemModal = ({ onClose, onSave }) => {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    name: '',
    category: 'clothing',
    quantity: 1,
    isEssential: false
  })

  // Register modal to hide bottom navigation
  useModalRegistration(true)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    // Close modal immediately for optimistic UX
    onClose()
    // Call onSave which will handle optimistic update
    onSave(formData)
  }

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="add-item-modal"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{t('travel.packing.addItem', 'Add Item')}</h3>
          <button className="modal-close" onClick={onClose}>
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('travel.packing.itemName', 'Item Name')}</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={t('travel.packing.itemNamePlaceholder', 'e.g., T-shirt, Toothbrush')}
              autoFocus
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{t('travel.packing.category', 'Category')}</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              >
                {Object.entries(PACKING_CATEGORIES).map(([key, cat]) => (
                  <option key={key} value={key}>{t(cat.label)}</option>
                ))}
              </select>
            </div>

            <div className="form-group quantity-group">
              <label>{t('travel.packing.quantity', 'Qty')}</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                min="1"
                max="99"
              />
            </div>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={formData.isEssential}
                onChange={(e) => setFormData(prev => ({ ...prev, isEssential: e.target.checked }))}
              />
              {t('travel.packing.markEssential', 'Mark as essential')}
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="cancel-btn" onClick={onClose}>
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="submit" className="travel-btn">
              {t('common.add', 'Add')}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

export default PackingPage
