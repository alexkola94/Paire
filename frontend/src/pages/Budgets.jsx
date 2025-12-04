import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiTarget, FiPlus, FiEdit, FiTrash2, FiSave, FiX, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'
import { budgetService, transactionService } from '../services/api'
import './Budgets.css'

/**
 * Budgets Page Component
 * Manage monthly budgets by category
 */
function Budgets() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [budgets, setBudgets] = useState([])
  const [expenses, setExpenses] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingBudget, setEditingBudget] = useState(null)
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    period: 'monthly'
  })

  const categories = [
    'food', 'transportation', 'housing', 'utilities', 'entertainment',
    'healthcare', 'shopping', 'education', 'other'
  ]

  /**
   * Load budgets and expenses on mount
   */
  useEffect(() => {
    loadData()
  }, [])

  /**
   * Fetch budgets and expenses
   */
  const loadData = async () => {
    try {
      setLoading(true)
      
      // Get current month date range
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

      // Fetch budgets and expenses in parallel
      const [budgetData, expenseData] = await Promise.all([
        budgetService.getAll(),
        transactionService.getAll({
          type: 'expense',
          startDate: startOfMonth,
          endDate: endOfMonth
        })
      ])

      setBudgets(budgetData || [])
      setExpenses(expenseData || [])
    } catch (error) {
      console.error('Error loading budgets:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Calculate spent amount for a budget category
   */
  const calculateSpent = (category) => {
    return expenses
      .filter(e => e.category === category)
      .reduce((sum, e) => sum + e.amount, 0)
  }

  /**
   * Calculate budget progress percentage
   */
  const calculateProgress = (budget) => {
    const spent = calculateSpent(budget.category)
    return budget.amount > 0 ? (spent / budget.amount) * 100 : 0
  }

  /**
   * Handle form input changes
   */
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const budgetData = {
        ...formData,
        amount: parseFloat(formData.amount)
      }

      if (editingBudget) {
        await budgetService.update(editingBudget.id, budgetData)
      } else {
        await budgetService.create(budgetData)
      }

      await loadData()
      handleCancel()
    } catch (error) {
      console.error('Error saving budget:', error)
      alert(t('budgets.saveError'))
    }
  }

  /**
   * Handle delete budget
   */
  const handleDelete = async (id) => {
    if (!confirm(t('budgets.confirmDelete'))) {
      return
    }

    try {
      await budgetService.delete(id)
      await loadData()
    } catch (error) {
      console.error('Error deleting budget:', error)
      alert(t('budgets.deleteError'))
    }
  }

  /**
   * Handle edit budget
   */
  const handleEdit = (budget) => {
    setEditingBudget(budget)
    setFormData({
      category: budget.category,
      amount: budget.amount.toString(),
      period: budget.period || 'monthly'
    })
    setShowForm(true)
  }

  /**
   * Handle cancel form
   */
  const handleCancel = () => {
    setShowForm(false)
    setEditingBudget(null)
    setFormData({
      category: '',
      amount: '',
      period: 'monthly'
    })
  }

  /**
   * Format currency for display
   */
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="budgets-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>
            <FiTarget size={32} />
            {t('budgets.title')}
          </h1>
          <p className="page-subtitle">{t('budgets.subtitle')}</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
          >
            <FiPlus size={20} />
            {t('budgets.addBudget')}
          </button>
        )}
      </div>

      {/* Budget Form */}
      {showForm && (
        <div className="card budget-form-card">
          <div className="card-header">
            <h2>{editingBudget ? t('budgets.editBudget') : t('budgets.addBudget')}</h2>
          </div>

          <form onSubmit={handleSubmit} className="budget-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="category">{t('budgets.category')}</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                >
                  <option value="">{t('budgets.selectCategory')}</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {t(`categories.${cat}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="amount">{t('budgets.amount')}</label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="period">{t('budgets.period')}</label>
                <select
                  id="period"
                  name="period"
                  value={formData.period}
                  onChange={handleChange}
                >
                  <option value="monthly">{t('budgets.monthly')}</option>
                  <option value="yearly">{t('budgets.yearly')}</option>
                </select>
              </div>
            </div>


            <div className="form-actions">
              <button
                type="button"
                onClick={handleCancel}
                className="btn btn-secondary"
              >
                <FiX size={18} />
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                <FiSave size={18} />
                {t('common.save')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Budgets List */}
      {budgets.length === 0 ? (
        <div className="card empty-state">
          <FiTarget size={64} className="empty-icon" />
          <p>{t('budgets.noBudgets')}</p>
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
          >
            <FiPlus size={20} />
            {t('budgets.addFirstBudget')}
          </button>
        </div>
      ) : (
        <div className="budgets-grid">
          {budgets.map((budget) => {
            const spent = calculateSpent(budget.category)
            const remaining = budget.amount - spent
            const progress = calculateProgress(budget)
            const isOverBudget = spent > budget.amount

            return (
              <div key={budget.id} className={`budget-card card ${isOverBudget ? 'over-budget' : ''}`}>
                <div className="budget-header">
                  <div className="budget-category">
                    <h3>{t(`categories.${budget.category}`)}</h3>
                    <span className="budget-period">{t(`budgets.${budget.period}`)}</span>
                  </div>
                  <div className="budget-actions">
                    <button
                      onClick={() => handleEdit(budget)}
                      className="btn-icon"
                      title={t('common.edit')}
                    >
                      <FiEdit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(budget.id)}
                      className="btn-icon danger"
                      title={t('common.delete')}
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="budget-amounts">
                  <div className="amount-item">
                    <label>{t('budgets.budgeted')}</label>
                    <span className="amount">{formatCurrency(budget.amount)}</span>
                  </div>
                  <div className="amount-item">
                    <label>{t('budgets.spent')}</label>
                    <span className={`amount ${isOverBudget ? 'over' : ''}`}>
                      {formatCurrency(spent)}
                    </span>
                  </div>
                  <div className="amount-item">
                    <label>{t('budgets.remaining')}</label>
                    <span className={`amount ${remaining >= 0 ? 'positive' : 'negative'}`}>
                      {formatCurrency(remaining)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="progress-section">
                  <div className="progress-header">
                    <span>{progress.toFixed(1)}%</span>
                    {isOverBudget ? (
                      <span className="status over">
                        <FiAlertCircle size={16} />
                        {t('budgets.overBudget')}
                      </span>
                    ) : (
                      <span className="status on-track">
                        <FiCheckCircle size={16} />
                        {t('budgets.onTrack')}
                      </span>
                    )}
                  </div>
                  <div className="progress-bar">
                    <div
                      className={`progress-fill ${isOverBudget ? 'over' : ''}`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Budgets

