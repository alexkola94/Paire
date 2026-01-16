import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  FiTarget, FiPlus, FiEdit, FiTrash2, FiTrendingUp,
  FiCalendar, FiCheckCircle, FiArrowUp, FiArrowDown
} from 'react-icons/fi'
import { savingsGoalService } from '../services/api'
import ConfirmationModal from '../components/ConfirmationModal'
import Modal from '../components/Modal'
import CurrencyInput from '../components/CurrencyInput'
import DateInput from '../components/DateInput'
import CategorySelector from '../components/CategorySelector'
import FormSection from '../components/FormSection'
import SuccessAnimation from '../components/SuccessAnimation'
import LoadingProgress from '../components/LoadingProgress'
import useCurrencyFormatter from '../hooks/useCurrencyFormatter'
import { usePrivacyMode } from '../context/PrivacyModeContext'
import './SavingsGoals.css'

/**
 * Savings Goals Page Component
 * Track and manage financial savings goals with visual progress
 */
function SavingsGoals() {
  const { t } = useTranslation()
  const formatCurrency = useCurrencyFormatter()
  const { isPrivate } = usePrivacyMode() // Privacy mode for hiding amounts
  const [loading, setLoading] = useState(true)
  const [goals, setGoals] = useState([])
  const [summary, setSummary] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)
  const [showDepositForm, setShowDepositForm] = useState(null)
  const [depositAmount, setDepositAmount] = useState('')
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, goalId: null })
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [showLoadingProgress, setShowLoadingProgress] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    targetDate: '',
    priority: 'medium',
    category: '',
    icon: '🎯',
    color: '#6366f1',
    notes: ''
  })

  // Goal categories with corresponding icons
  const categories = [
    { value: 'emergency', label: t('savingsGoals.categories.emergency'), icon: '🚨' },
    { value: 'vacation', label: t('savingsGoals.categories.vacation'), icon: '✈️' },
    { value: 'house', label: t('savingsGoals.categories.house'), icon: '🏠' },
    { value: 'car', label: t('savingsGoals.categories.car'), icon: '🚗' },
    { value: 'education', label: t('savingsGoals.categories.education'), icon: '🎓' },
    { value: 'wedding', label: t('savingsGoals.categories.wedding'), icon: '💍' },
    { value: 'retirement', label: t('savingsGoals.categories.retirement'), icon: '🌴' },
    { value: 'investment', label: t('savingsGoals.categories.investment'), icon: '📈' },
    { value: 'other', label: t('savingsGoals.categories.other'), icon: '💰' }
  ]

  const priorities = [
    { value: 'low', label: t('savingsGoals.priorities.low'), color: '#10b981' },
    { value: 'medium', label: t('savingsGoals.priorities.medium'), color: '#f59e0b' },
    { value: 'high', label: t('savingsGoals.priorities.high'), color: '#ef4444' }
  ]

  /**
   * Load goals and summary on mount
   */
  useEffect(() => {
    loadData()
  }, [])

  /**
   * Fetch goals and summary data
   */
  const loadData = async (background = false) => {
    try {
      if (!background) setLoading(true)
      const [goalsData, summaryData] = await Promise.all([
        savingsGoalService.getAll(),
        savingsGoalService.getSummary()
      ])
      setGoals(goalsData || [])
      setSummary(summaryData || null)
    } catch (error) {
      console.error('Error loading savings goals:', error)
    } finally {
      if (!background) setLoading(false)
    }
  }

  /**
   * Calculate progress percentage for a goal
   */
  const calculateProgress = (goal) => {
    if (goal.targetAmount === 0) return 0
    return Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
  }

  /**
   * Calculate days remaining until target date
   */
  const getDaysRemaining = (targetDate) => {
    if (!targetDate) return null
    const today = new Date()
    const target = new Date(targetDate)
    const diffTime = target - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  /**
   * Get priority badge color
   */
  const getPriorityColor = (priority) => {
    const found = priorities.find(p => p.value === priority)
    return found ? found.color : '#6366f1'
  }

  /**
   * Get category icon
   */
  const getCategoryIcon = (category) => {
    const found = categories.find(c => c.value === category)
    return found ? found.icon : '💰'
  }

  /**
   * Handle form input changes
   */
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  /**
   * Handle form submission (create/update)
   */
  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      setFormLoading(true)

      const goalData = {
        ...formData,
        targetAmount: parseFloat(formData.targetAmount),
        currentAmount: parseFloat(formData.currentAmount || 0),
        targetDate: formData.targetDate || null
      }

      let savedGoal = null
      if (editingGoal) {
        savedGoal = await savingsGoalService.update(editingGoal.id, goalData)
        // Ensure savedGoal has ID, usually returns updated object
        setGoals(prev => prev.map(g => g.id === editingGoal.id ? { ...g, ...savedGoal } : g))
      } else {
        savedGoal = await savingsGoalService.create(goalData)
        setGoals(prev => [savedGoal, ...prev])
      }

      // Show success animation
      setShowSuccessAnimation(true)
      resetForm() // Closes form

      // Refresh list in background
      loadData(true)

    } catch (error) {
      console.error('Error saving goal:', error)
      setShowForm(true) // Re-open form on error
      alert(t('savingsGoals.errorSaving'))
    } finally {
      setFormLoading(false)
    }
  }

  /**
   * Handle deposit to goal
   */
  const handleDeposit = async (goalId) => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      alert(t('savingsGoals.invalidAmount'))
      return
    }

    try {
      await savingsGoalService.addDeposit(goalId, parseFloat(depositAmount))
      await loadData()
      setShowDepositForm(null)
      setDepositAmount('')
    } catch (error) {
      console.error('Error adding deposit:', error)
      alert(t('savingsGoals.errorDeposit'))
    }
  }

  /**
   * Handle withdrawal from goal
   */
  const handleWithdraw = async (goalId) => {
    const amount = prompt(t('savingsGoals.withdrawPrompt'))
    if (!amount || parseFloat(amount) <= 0) return

    try {
      await savingsGoalService.withdraw(goalId, parseFloat(amount))
      await loadData()
    } catch (error) {
      console.error('Error withdrawing:', error)
      alert(t('savingsGoals.errorWithdraw'))
    }
  }

  /**
   * Handle edit goal
   */
  const handleEdit = (goal) => {
    setEditingGoal(goal)
    setFormData({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      currentAmount: goal.currentAmount.toString(),
      targetDate: goal.targetDate ? goal.targetDate.split('T')[0] : '',
      priority: goal.priority,
      category: goal.category || '',
      icon: goal.icon || '🎯',
      color: goal.color || '#6366f1',
      notes: goal.notes || ''
    })
    setShowForm(true)
  }

  /**
   * Open delete confirmation modal
   */
  const openDeleteModal = (goalId) => {
    setDeleteModal({ isOpen: true, goalId })
  }

  /**
   * Close delete confirmation modal
   */
  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, goalId: null })
  }

  /**
   * Handle delete goal
   */
  const handleDelete = async () => {
    const { goalId } = deleteModal
    if (!goalId) return

    try {
      setFormLoading(true)
      await savingsGoalService.delete(goalId)

      // Local Update
      setGoals(prev => prev.filter(g => g.id !== goalId))

      // Background Refresh
      loadData(true)

      closeDeleteModal()
    } catch (error) {
      console.error('Error deleting goal:', error)
      alert(t('savingsGoals.errorDeleting'))
    } finally {
      setFormLoading(false)
    }
  }

  /**
   * Reset form to initial state
   */
  const resetForm = () => {
    setShowForm(false)
    setEditingGoal(null)
    setFormData({
      name: '',
      targetAmount: '',
      currentAmount: '',
      targetDate: '',
      priority: 'medium',
      category: '',
      icon: '🎯',
      color: '#6366f1',
      notes: ''
    })
  }

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>
  }

  return (
    <div className="savings-goals-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <FiTarget className="page-icon" />
            {t('savingsGoals.title')}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <FiPlus /> {t('savingsGoals.addGoal')}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <motion.div 
          className="summary-grid"
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
        >
          <motion.div 
            className="summary-card"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { 
                opacity: 1, 
                y: 0,
                transition: {
                  duration: 0.5,
                  ease: [0.4, 0, 0.2, 1]
                }
              }
            }}
          >
            <div className="summary-icon total">
              <FiTarget />
            </div>
            <div className="summary-content">
              <h3>{t('savingsGoals.totalGoals')}</h3>
              <p className="summary-value">{summary.totalGoals}</p>
              <p className="summary-detail">
                {summary.activeGoals} {t('savingsGoals.active')} · {summary.achievedGoals} {t('savingsGoals.achieved')}
              </p>
            </div>
          </motion.div>

          <motion.div 
            className="summary-card"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { 
                opacity: 1, 
                y: 0,
                transition: {
                  duration: 0.5,
                  ease: [0.4, 0, 0.2, 1]
                }
              }
            }}
          >
            <div className="summary-icon saved">
              <span style={{ fontSize: '24px', fontWeight: 'bold' }}>€</span>
            </div>
            <div className="summary-content">
              <h3>{t('savingsGoals.totalSaved')}</h3>
              <p className={`summary-value ${isPrivate ? 'masked-number' : ''}`}>{formatCurrency(summary.totalCurrentAmount)}</p>
              <p className={`summary-detail ${isPrivate ? 'masked-number' : ''}`}>
                {t('savingsGoals.of')} {formatCurrency(summary.totalTargetAmount)}
              </p>
            </div>
          </motion.div>

          <motion.div 
            className="summary-card"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { 
                opacity: 1, 
                y: 0,
                transition: {
                  duration: 0.5,
                  ease: [0.4, 0, 0.2, 1]
                }
              }
            }}
          >
            <div className="summary-icon progress">
              <FiTrendingUp />
            </div>
            <div className="summary-content">
              <h3>{t('savingsGoals.overallProgress')}</h3>
              <p className="summary-value">{summary.overallProgress}%</p>
              <p className={`summary-detail ${isPrivate ? 'masked-number' : ''}`}>
                {formatCurrency(summary.totalRemaining)} {t('savingsGoals.remaining')}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Goals Grid */}
      <motion.div 
        className="goals-grid"
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
      >
        {goals.length === 0 ? (
          <div className="empty-state">
            <FiTarget size={64} />
            <h3>{t('savingsGoals.noGoals')}</h3>
            <p>{t('savingsGoals.noGoalsDescription')}</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <FiPlus /> {t('savingsGoals.createFirstGoal')}
            </button>
          </div>
        ) : (
          goals.map(goal => {
            const progress = calculateProgress(goal)
            const daysRemaining = getDaysRemaining(goal.targetDate)
            const priorityColor = getPriorityColor(goal.priority)
            const icon = goal.icon || getCategoryIcon(goal.category)

            return (
              <motion.div
                key={goal.id}
                className={`goal - card ${goal.isAchieved ? 'achieved' : ''} `}
                style={{ borderLeftColor: goal.color || priorityColor }}
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.95 },
                  visible: { 
                    opacity: 1, 
                    y: 0, 
                    scale: 1,
                    transition: {
                      duration: 0.5,
                      ease: [0.4, 0, 0.2, 1]
                    }
                  }
                }}
              >
                <div className="goal-header">
                  <div className="goal-icon" style={{ backgroundColor: `${goal.color} 20` }}>
                    {icon}
                  </div>
                  <div className="goal-info">
                    <h3>{goal.name}</h3>
                    <span className="goal-category">
                      {categories.find(c => c.value === goal.category)?.label || goal.category}
                    </span>
                  </div>
                  <div className="goal-actions">
                    <button
                      className="icon-btn"
                      onClick={() => handleEdit(goal)}
                      title={t('common.edit')}
                    >
                      <FiEdit />
                    </button>
                    <button
                      className="icon-btn danger"
                      onClick={() => openDeleteModal(goal.id)}
                      title={t('common.delete')}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>

                <div className="goal-amount">
                  <div className="current-amount">
                    <span className="label">{t('savingsGoals.current')}</span>
                    <span className={`value ${isPrivate ? 'masked-number' : ''}`}>{formatCurrency(goal.currentAmount)}</span>
                  </div>
                  <div className="target-amount">
                    <span className="label">{t('savingsGoals.target')}</span>
                    <span className={`value ${isPrivate ? 'masked-number' : ''}`}>{formatCurrency(goal.targetAmount)}</span>
                  </div>
                </div>

                <div className="progress-container">
                  <div className="progress-bar-wrapper">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${progress}% `,
                          backgroundColor: goal.color || priorityColor
                        }}
                      >
                        <span className="progress-euro">€</span>
                      </div>
                    </div>
                  </div>
                  <span className="progress-text">{progress.toFixed(1)}%</span>
                </div>

                <div className="goal-meta">
                  {goal.targetDate && (
                    <div className="meta-item">
                      <FiCalendar />
                      <span>
                        {daysRemaining !== null && daysRemaining >= 0
                          ? `${daysRemaining} ${t('savingsGoals.daysLeft')} `
                          : t('savingsGoals.overdue')
                        }
                      </span>
                    </div>
                  )}
                  <div className="meta-item">
                    <span
                      className="priority-badge"
                      style={{ backgroundColor: priorityColor }}
                    >
                      {priorities.find(p => p.value === goal.priority)?.label}
                    </span>
                  </div>
                  {goal.isAchieved && (
                    <div className="meta-item achieved-badge">
                      <FiCheckCircle />
                      <span>{t('savingsGoals.goalAchieved')}</span>
                    </div>
                  )}
                </div>

                {!goal.isAchieved && (
                  <div className="goal-quick-actions">
                    {showDepositForm === goal.id ? (
                      <div className="deposit-form">
                        <input
                          type="number"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          placeholder={t('savingsGoals.enterAmount')}
                          step="0.01"
                          min="0"
                          max="1000000"
                        />
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => handleDeposit(goal.id)}
                        >
                          {t('common.confirm')}
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => {
                            setShowDepositForm(null)
                            setDepositAmount('')
                          }}
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => setShowDepositForm(goal.id)}
                        >
                          <FiArrowUp /> {t('savingsGoals.addMoney')}
                        </button>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => handleWithdraw(goal.id)}
                        >
                          <FiArrowDown /> {t('savingsGoals.withdraw')}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {goal.notes && (
                  <div className="goal-notes">
                    <p>{goal.notes}</p>
                  </div>
                )}
              </motion.div>
            )
          })
        )}
      </motion.div>

      {/* Goal Form Modal (Portal) */}
      <Modal
        isOpen={showForm}
        onClose={resetForm}
        title={editingGoal ? t('savingsGoals.editGoal') : t('savingsGoals.addGoal')}
      >
        <form onSubmit={handleSubmit}>
          {/* Basic Information Section */}
          <FormSection title={t('transaction.formSections.basicInfo')}>
            <div className="form-group">
              <label>{t('savingsGoals.goalName')} *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder={t('savingsGoals.goalNamePlaceholder')}
              />
            </div>

            <div className="form-row">
              <CurrencyInput
                value={formData.targetAmount}
                onChange={handleChange}
                name="targetAmount"
                id="targetAmount"
                label={`${t('savingsGoals.targetAmount')} * `}
                required
                quickAmounts={[1000, 5000, 10000, 50000]}
              />

              <CurrencyInput
                value={formData.currentAmount}
                onChange={handleChange}
                name="currentAmount"
                id="currentAmount"
                label={t('savingsGoals.currentAmount')}
                quickAmounts={[]}
              />
            </div>

            {/* Category - Full width for better visibility */}
            <div className="form-layout-item-full">
              <CategorySelector
                value={formData.category}
                onChange={handleChange}
                name="category"
                categories={categories.map(c => c.value)}
                type="expense"
                label={t('savingsGoals.category')}
              />
            </div>

            <div className="form-group">
              <label>{t('savingsGoals.priority')}</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
              >
                {priorities.map(pri => (
                  <option key={pri.value} value={pri.value}>
                    {pri.label}
                  </option>
                ))}
              </select>
            </div>

            <DateInput
              value={formData.targetDate}
              onChange={handleChange}
              name="targetDate"
              id="targetDate"
              label={t('savingsGoals.targetDate')}
              required={false}
              showQuickButtons={true}
            />
          </FormSection>

          {/* Customization Section */}
          <FormSection title={t('transaction.formSections.additionalDetails')} collapsible={true} defaultExpanded={!!formData.icon || !!formData.notes}>

            <div className="form-row">
              <div className="form-group">
                <label>{t('savingsGoals.icon')}</label>
                <input
                  type="text"
                  name="icon"
                  value={formData.icon}
                  onChange={handleChange}
                  placeholder="🎯"
                  maxLength="2"
                />
              </div>

              <div className="form-group">
                <label>{t('savingsGoals.color')}</label>
                <input
                  type="color"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label>{t('savingsGoals.notes')}</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder={t('savingsGoals.notesPlaceholder')}
                rows={3}
              />
            </div>
          </FormSection>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={formLoading}>
              {formLoading ? t('common.saving') : (editingGoal ? t('common.update') : t('common.create'))}
            </button>
          </div>
        </form>
      </Modal>

      {/* Loading Progress Overlay */}
      <LoadingProgress show={showLoadingProgress} />

      {/* Success Animation */}
      <SuccessAnimation
        show={showSuccessAnimation}
        onComplete={() => setShowSuccessAnimation(false)}
        message={t('savingsGoals.savedSuccess')}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        title={t('savingsGoals.deleteGoal')}
        message={t('savingsGoals.confirmDelete')}
        confirmText={t('common.delete')}
        loading={formLoading}
        variant="danger"
      />
    </div>
  )
}

export default SavingsGoals

