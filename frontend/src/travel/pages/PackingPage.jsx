import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiPlus,
  FiCheck,
  FiTrash2,
  FiPackage,
  FiX,
  FiZap
} from 'react-icons/fi'
import { packingService } from '../services/travelApi'
import { PACKING_CATEGORIES } from '../utils/travelConstants'
import { generatePackingSuggestions } from '../utils/packingSuggestions'
import '../styles/Packing.css'

/**
 * Packing Page Component
 * Smart packing checklist with categories
 */
const PackingPage = ({ trip }) => {
  const { t } = useTranslation()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeCategory, setActiveCategory] = useState(null)

  // Load packing items
  useEffect(() => {
    const loadItems = async () => {
      if (!trip?.id) {
        setLoading(false)
        return
      }

      try {
        const data = await packingService.getByTrip(trip.id)
        setItems(data || [])
      } catch (error) {
        console.error('Error loading packing items:', error)
      } finally {
        setLoading(false)
      }
    }

    loadItems()
  }, [trip?.id])

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
    try {
      const updated = await packingService.toggleChecked(trip.id, item.id, !item.isChecked)
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, isChecked: !i.isChecked } : i))
    } catch (error) {
      console.error('Error toggling item:', error)
    }
  }

  // Delete item
  const handleDeleteItem = async (itemId) => {
    try {
      await packingService.delete(trip.id, itemId)
      setItems(prev => prev.filter(i => i.id !== itemId))
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  // Add item
  const handleAddItem = async (itemData) => {
    try {
      const newItem = await packingService.create(trip.id, itemData)
      setItems(prev => [...prev, newItem])
      setShowAddModal(false)
    } catch (error) {
      console.error('Error adding item:', error)
    }
  }

  // Add suggested items
  const handleAddSuggestions = async () => {
    const suggestions = generatePackingSuggestions(trip)
    const existingNames = new Set(items.map(i => i.name.toLowerCase()))
    const newSuggestions = suggestions.filter(s => !existingNames.has(s.name.toLowerCase()))

    try {
      const created = await packingService.bulkCreate(trip.id, newSuggestions.slice(0, 20))
      setItems(prev => [...prev, ...created])
      setShowSuggestions(false)
    } catch (error) {
      console.error('Error adding suggestions:', error)
    }
  }

  if (!trip) {
    return (
      <div className="packing-page empty-state">
        <FiPackage size={48} />
        <h3>{t('travel.packing.noTrip', 'No Trip Selected')}</h3>
        <p>{t('travel.packing.createTripFirst', 'Create a trip to start your packing list')}</p>
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

      {/* Quick Actions */}
      <div className="packing-actions">
        <button className="action-btn primary" onClick={() => setShowAddModal(true)}>
          <FiPlus size={18} />
          {t('travel.packing.addItem', 'Add Item')}
        </button>
        {items.length === 0 && (
          <button className="action-btn secondary" onClick={handleAddSuggestions}>
            <FiZap size={18} />
            {t('travel.packing.addSuggestions', 'Smart Suggestions')}
          </button>
        )}
      </div>

      {/* Category Lists */}
      <div className="packing-categories">
        {Object.entries(PACKING_CATEGORIES).map(([key, category]) => {
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
                onClick={() => setActiveCategory(activeCategory === key ? null : key)}
              >
                <div className="category-info">
                  <span className="category-name" style={{ color: category.color }}>
                    {t(category.label)}
                  </span>
                  <span className="category-count">
                    {checkedCount}/{categoryItems.length}
                  </span>
                </div>
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
              </div>

              <AnimatePresence>
                {categoryItems.length > 0 && (
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

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return
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
