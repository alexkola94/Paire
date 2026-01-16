import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiPlus,
  FiDollarSign,
  FiHome,
  FiNavigation,
  FiCoffee,
  FiCamera,
  FiShoppingBag,
  FiMoreHorizontal,
  FiTrash2,
  FiX
} from 'react-icons/fi'
import { travelExpenseService } from '../services/travelApi'
import { BUDGET_CATEGORIES } from '../utils/travelConstants'
import '../styles/Budget.css'

// Category icons mapping
const categoryIcons = {
  accommodation: FiHome,
  transport: FiNavigation,
  food: FiCoffee,
  activities: FiCamera,
  shopping: FiShoppingBag,
  other: FiMoreHorizontal
}

/**
 * Budget Page Component
 * Expense tracking with category breakdown
 */
const BudgetPage = ({ trip }) => {
  const { t } = useTranslation()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)

  // Load expenses
  useEffect(() => {
    const loadExpenses = async () => {
      if (!trip?.id) {
        setLoading(false)
        return
      }

      try {
        const data = await travelExpenseService.getByTrip(trip.id)
        setExpenses(data || [])
      } catch (error) {
        console.error('Error loading expenses:', error)
      } finally {
        setLoading(false)
      }
    }

    loadExpenses()
  }, [trip?.id])

  // Calculate totals
  const calculateTotals = () => {
    const total = expenses.reduce((sum, e) => sum + (e.amountInBaseCurrency || e.amount), 0)
    const byCategory = {}

    Object.keys(BUDGET_CATEGORIES).forEach(cat => {
      byCategory[cat] = expenses
        .filter(e => e.category === cat)
        .reduce((sum, e) => sum + (e.amountInBaseCurrency || e.amount), 0)
    })

    return { total, byCategory }
  }

  const { total, byCategory } = calculateTotals()
  const budget = trip?.budget || 0
  const remaining = budget - total
  const percentUsed = budget > 0 ? Math.min(100, (total / budget) * 100) : 0

  // Handle add expense
  const handleAddExpense = async (expenseData) => {
    try {
      const newExpense = await travelExpenseService.create(trip.id, expenseData)
      setExpenses(prev => [...prev, newExpense])
      setShowAddModal(false)
    } catch (error) {
      console.error('Error adding expense:', error)
    }
  }

  // Handle delete expense
  const handleDeleteExpense = async (expenseId) => {
    try {
      await travelExpenseService.delete(trip.id, expenseId)
      setExpenses(prev => prev.filter(e => e.id !== expenseId))
    } catch (error) {
      console.error('Error deleting expense:', error)
    }
  }

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: trip?.budgetCurrency || 'EUR'
    }).format(amount)
  }

  if (!trip) {
    return (
      <div className="budget-page empty-state">
        <FiDollarSign size={48} />
        <h3>{t('travel.budget.noTrip', 'No Trip Selected')}</h3>
        <p>{t('travel.budget.createTripFirst', 'Create a trip to start tracking expenses')}</p>
      </div>
    )
  }

  return (
    <div className="budget-page">
      {/* Budget Overview Card */}
      <motion.div
        className="travel-glass-card budget-overview"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="budget-header">
          <div className="budget-spent">
            <span className="label">{t('travel.budget.spent', 'Spent')}</span>
            <span className="amount">{formatCurrency(total)}</span>
          </div>
          {budget > 0 && (
            <div className="budget-remaining">
              <span className="label">{t('travel.budget.remaining', 'Remaining')}</span>
              <span className={`amount ${remaining < 0 ? 'negative' : ''}`}>
                {formatCurrency(remaining)}
              </span>
            </div>
          )}
        </div>

        {budget > 0 && (
          <div className="budget-progress">
            <div className="progress-bar">
              <motion.div
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${percentUsed}%` }}
                transition={{ duration: 0.5, delay: 0.2 }}
                style={{
                  background: percentUsed > 90 ? 'var(--error)' : 'var(--primary-gradient)'
                }}
              />
            </div>
            <span className="progress-text">{Math.round(percentUsed)}% of {formatCurrency(budget)}</span>
          </div>
        )}
      </motion.div>

      {/* Category Breakdown */}
      <div className="budget-categories">
        <h3 className="section-title">{t('travel.budget.byCategory', 'By Category')}</h3>
        <div className="categories-grid">
          {Object.entries(BUDGET_CATEGORIES).map(([key, category]) => {
            const Icon = categoryIcons[key] || FiMoreHorizontal
            const amount = byCategory[key] || 0
            const catPercentage = total > 0 ? (amount / total) * 100 : 0

            return (
              <motion.div
                key={key}
                className="category-card travel-glass-card"
                onClick={() => setSelectedCategory(key)}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="category-icon" style={{ color: category.color }}>
                  <Icon size={20} />
                </div>
                <div className="category-info">
                  <span className="category-name">{t(category.label)}</span>
                  <span className="category-amount">{formatCurrency(amount)}</span>
                </div>
                <div className="category-bar">
                  <div
                    className="category-fill"
                    style={{
                      width: `${catPercentage}%`,
                      background: category.color
                    }}
                  />
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Recent Expenses */}
      <div className="recent-expenses">
        <div className="section-header">
          <h3 className="section-title">{t('travel.budget.recentExpenses', 'Recent Expenses')}</h3>
          <button className="add-btn" onClick={() => setShowAddModal(true)}>
            <FiPlus size={20} />
          </button>
        </div>

        {expenses.length > 0 ? (
          <div className="expenses-list">
            {expenses
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice(0, 10)
              .map((expense) => {
                const category = BUDGET_CATEGORIES[expense.category] || BUDGET_CATEGORIES.other
                const Icon = categoryIcons[expense.category] || FiMoreHorizontal

                return (
                  <motion.div
                    key={expense.id}
                    className="expense-item"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    layout
                  >
                    <div className="expense-icon" style={{ color: category.color }}>
                      <Icon size={18} />
                    </div>
                    <div className="expense-info">
                      <span className="expense-description">{expense.description}</span>
                      <span className="expense-date">
                        {new Date(expense.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="expense-amount">
                      {formatCurrency(expense.amountInBaseCurrency || expense.amount)}
                    </div>
                    <button
                      className="expense-delete"
                      onClick={() => handleDeleteExpense(expense.id)}
                      aria-label="Delete"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </motion.div>
                )
              })}
          </div>
        ) : (
          <div className="empty-expenses">
            <p>{t('travel.budget.noExpenses', 'No expenses yet')}</p>
            <button className="travel-btn" onClick={() => setShowAddModal(true)}>
              <FiPlus size={18} />
              {t('travel.budget.addExpense', 'Add Expense')}
            </button>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddExpenseModal
            trip={trip}
            onClose={() => setShowAddModal(false)}
            onSave={handleAddExpense}
            formatCurrency={formatCurrency}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Add Expense Modal Component
const AddExpenseModal = ({ trip, onClose, onSave, formatCurrency }) => {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    category: 'food',
    amount: '',
    currency: trip?.budgetCurrency || 'EUR',
    description: '',
    date: new Date().toISOString().split('T')[0]
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.amount || !formData.description) return

    setSaving(true)
    await onSave({
      ...formData,
      amount: parseFloat(formData.amount),
      amountInBaseCurrency: parseFloat(formData.amount) // TODO: Add currency conversion
    })
    setSaving(false)
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
        className="add-expense-modal"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{t('travel.budget.addExpense', 'Add Expense')}</h3>
          <button className="modal-close" onClick={onClose}>
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('travel.budget.category', 'Category')}</label>
            <div className="category-selector">
              {Object.entries(BUDGET_CATEGORIES).map(([key, cat]) => {
                const Icon = categoryIcons[key] || FiMoreHorizontal
                return (
                  <button
                    key={key}
                    type="button"
                    className={`category-option ${formData.category === key ? 'selected' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, category: key }))}
                  >
                    <Icon size={18} style={{ color: cat.color }} />
                    <span>{t(cat.label)}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group amount-group">
              <label>{t('travel.budget.amount', 'Amount')}</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                step="0.01"
                min="0"
                required
                autoFocus
              />
            </div>
            <div className="form-group currency-group">
              <label>{t('travel.budget.currency', 'Currency')}</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>{t('travel.budget.description', 'Description')}</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder={t('travel.budget.descriptionPlaceholder', 'What was this for?')}
              required
            />
          </div>

          <div className="form-group">
            <label>{t('travel.budget.date', 'Date')}</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="cancel-btn" onClick={onClose}>
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="submit" className="travel-btn" disabled={saving}>
              {saving ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

export default BudgetPage
