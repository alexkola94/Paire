import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  FiCalendar, FiPlus, FiEdit, FiTrash2, FiCheck, 
  FiClock, FiDollarSign, FiAlertCircle, FiRepeat 
} from 'react-icons/fi'
import { recurringBillService } from '../services/api'
import { formatCurrency } from '../utils/formatCurrency'
import './RecurringBills.css'

/**
 * Recurring Bills Page Component
 * Manage recurring bills and subscriptions with calendar view
 */
function RecurringBills() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [bills, setBills] = useState([])
  const [summary, setSummary] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingBill, setEditingBill] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: '',
    frequency: 'monthly',
    dueDay: '',
    autoPay: false,
    reminderDays: '3',
    isActive: true,
    notes: ''
  })

  // Bill categories
  const categories = [
    { value: 'utilities', label: t('recurringBills.categories.utilities'), icon: '⚡' },
    { value: 'subscription', label: t('recurringBills.categories.subscription'), icon: '📺' },
    { value: 'insurance', label: t('recurringBills.categories.insurance'), icon: '🛡️' },
    { value: 'rent', label: t('recurringBills.categories.rent'), icon: '🏠' },
    { value: 'loan', label: t('recurringBills.categories.loan'), icon: '💳' },
    { value: 'internet', label: t('recurringBills.categories.internet'), icon: '🌐' },
    { value: 'phone', label: t('recurringBills.categories.phone'), icon: '📱' },
    { value: 'gym', label: t('recurringBills.categories.gym'), icon: '🏋️' },
    { value: 'other', label: t('recurringBills.categories.other'), icon: '📋' }
  ]

  const frequencies = [
    { value: 'weekly', label: t('recurringBills.frequencies.weekly') },
    { value: 'monthly', label: t('recurringBills.frequencies.monthly') },
    { value: 'quarterly', label: t('recurringBills.frequencies.quarterly') },
    { value: 'yearly', label: t('recurringBills.frequencies.yearly') }
  ]

  /**
   * Load bills and summary on mount
   */
  useEffect(() => {
    loadData()
  }, [])

  /**
   * Fetch bills and summary data
   */
  const loadData = async () => {
    try {
      setLoading(true)
      const [billsData, summaryData] = await Promise.all([
        recurringBillService.getAll(),
        recurringBillService.getSummary()
      ])
      setBills(billsData || [])
      setSummary(summaryData || null)
    } catch (error) {
      console.error('Error loading recurring bills:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Get days until due date
   */
  const getDaysUntil = (dueDate) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  /**
   * Check if bill is overdue
   */
  const isOverdue = (dueDate) => {
    return getDaysUntil(dueDate) < 0
  }

  /**
   * Check if bill is due soon (within 7 days)
   */
  const isDueSoon = (dueDate) => {
    const days = getDaysUntil(dueDate)
    return days >= 0 && days <= 7
  }

  /**
   * Get category icon
   */
  const getCategoryIcon = (category) => {
    const found = categories.find(c => c.value === category)
    return found ? found.icon : '📋'
  }

  /**
   * Handle form input changes
   */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  /**
   * Handle form submission (create/update)
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      const billData = {
        ...formData,
        amount: parseFloat(formData.amount),
        dueDay: parseInt(formData.dueDay),
        reminderDays: parseInt(formData.reminderDays)
      }

      if (editingBill) {
        await recurringBillService.update(editingBill.id, billData)
      } else {
        await recurringBillService.create(billData)
      }

      await loadData()
      resetForm()
    } catch (error) {
      console.error('Error saving bill:', error)
      alert(t('recurringBills.errorSaving'))
    }
  }

  /**
   * Handle mark bill as paid
   */
  const handleMarkPaid = async (billId) => {
    try {
      await recurringBillService.markPaid(billId)
      await loadData()
    } catch (error) {
      console.error('Error marking bill as paid:', error)
      alert(t('recurringBills.errorMarkingPaid'))
    }
  }

  /**
   * Handle edit bill
   */
  const handleEdit = (bill) => {
    setEditingBill(bill)
    setFormData({
      name: bill.name,
      amount: bill.amount.toString(),
      category: bill.category,
      frequency: bill.frequency,
      dueDay: bill.dueDay.toString(),
      autoPay: bill.autoPay,
      reminderDays: bill.reminderDays.toString(),
      isActive: bill.isActive,
      notes: bill.notes || ''
    })
    setShowForm(true)
  }

  /**
   * Handle delete bill
   */
  const handleDelete = async (id) => {
    if (!confirm(t('recurringBills.confirmDelete'))) return

    try {
      await recurringBillService.delete(id)
      await loadData()
    } catch (error) {
      console.error('Error deleting bill:', error)
      alert(t('recurringBills.errorDeleting'))
    }
  }

  /**
   * Reset form to initial state
   */
  const resetForm = () => {
    setShowForm(false)
    setEditingBill(null)
    setFormData({
      name: '',
      amount: '',
      category: '',
      frequency: 'monthly',
      dueDay: '',
      autoPay: false,
      reminderDays: '3',
      isActive: true,
      notes: ''
    })
  }

  /**
   * Format due date display
   */
  const formatDueDate = (date) => {
    return new Date(date).toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>
  }

  // Separate active and inactive bills
  const activeBills = bills.filter(b => b.isActive)
  const overdueBills = activeBills.filter(b => isOverdue(b.nextDueDate))
  const upcomingBills = activeBills.filter(b => isDueSoon(b.nextDueDate) && !isOverdue(b.nextDueDate))
  const laterBills = activeBills.filter(b => !isDueSoon(b.nextDueDate) && !isOverdue(b.nextDueDate))

  return (
    <div className="recurring-bills-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <FiCalendar className="page-icon" />
            {t('recurringBills.title')}
          </h1>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <FiPlus /> {t('recurringBills.addBill')}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="summary-grid">
          <div className="summary-card">
            <div className="summary-icon total">
              <FiRepeat />
            </div>
            <div className="summary-content">
              <h3>{t('recurringBills.totalBills')}</h3>
              <p className="summary-value">{summary.activeBills}</p>
              <p className="summary-detail">
                {summary.inactiveBills} {t('recurringBills.inactive')}
              </p>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon monthly">
              <FiDollarSign />
            </div>
            <div className="summary-content">
              <h3>{t('recurringBills.monthlyTotal')}</h3>
              <p className="summary-value">{formatCurrency(summary.totalMonthlyAmount)}</p>
              <p className="summary-detail">
                {formatCurrency(summary.totalYearlyAmount)} {t('recurringBills.perYear')}
              </p>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon upcoming">
              <FiClock />
            </div>
            <div className="summary-content">
              <h3>{t('recurringBills.upcoming')}</h3>
              <p className="summary-value">{summary.upcomingBills}</p>
              <p className="summary-detail">
                {summary.overdueBills} {t('recurringBills.overdue')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bills Sections */}
      <div className="bills-container">
        {/* Overdue Bills */}
        {overdueBills.length > 0 && (
          <div className="bills-section overdue-section">
            <h2 className="section-title">
              <FiAlertCircle /> {t('recurringBills.overdueBills')} ({overdueBills.length})
            </h2>
            <div className="bills-grid">
              {overdueBills.map(bill => (
                <BillCard 
                  key={bill.id}
                  bill={bill}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onMarkPaid={handleMarkPaid}
                  getCategoryIcon={getCategoryIcon}
                  formatDueDate={formatDueDate}
                  getDaysUntil={getDaysUntil}
                  t={t}
                  status="overdue"
                />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Bills (Due Soon) */}
        {upcomingBills.length > 0 && (
          <div className="bills-section upcoming-section">
            <h2 className="section-title">
              <FiClock /> {t('recurringBills.dueSoon')} ({upcomingBills.length})
            </h2>
            <div className="bills-grid">
              {upcomingBills.map(bill => (
                <BillCard 
                  key={bill.id}
                  bill={bill}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onMarkPaid={handleMarkPaid}
                  getCategoryIcon={getCategoryIcon}
                  formatDueDate={formatDueDate}
                  getDaysUntil={getDaysUntil}
                  t={t}
                  status="upcoming"
                />
              ))}
            </div>
          </div>
        )}

        {/* Later Bills */}
        {laterBills.length > 0 && (
          <div className="bills-section">
            <h2 className="section-title">
              <FiCalendar /> {t('recurringBills.allBills')} ({laterBills.length})
            </h2>
            <div className="bills-grid">
              {laterBills.map(bill => (
                <BillCard 
                  key={bill.id}
                  bill={bill}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onMarkPaid={handleMarkPaid}
                  getCategoryIcon={getCategoryIcon}
                  formatDueDate={formatDueDate}
                  getDaysUntil={getDaysUntil}
                  t={t}
                  status="later"
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {bills.length === 0 && (
          <div className="empty-state">
            <FiCalendar size={64} />
            <h3>{t('recurringBills.noBills')}</h3>
            <p>{t('recurringBills.noBillsDescription')}</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <FiPlus /> {t('recurringBills.createFirstBill')}
            </button>
          </div>
        )}
      </div>

      {/* Bill Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {editingBill ? t('recurringBills.editBill') : t('recurringBills.addBill')}
              </h2>
              <button className="close-btn" onClick={resetForm}>&times;</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>{t('recurringBills.billName')} *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder={t('recurringBills.billNamePlaceholder')}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{t('recurringBills.amount')} *</label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    required
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label>{t('recurringBills.category')}</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                  >
                    <option value="">{t('recurringBills.selectCategory')}</option>
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{t('recurringBills.frequency')} *</label>
                  <select
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleChange}
                    required
                  >
                    {frequencies.map(freq => (
                      <option key={freq.value} value={freq.value}>
                        {freq.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{t('recurringBills.dueDay')} *</label>
                  <input
                    type="number"
                    name="dueDay"
                    value={formData.dueDay}
                    onChange={handleChange}
                    required
                    min="1"
                    max="31"
                    placeholder="1-31"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>{t('recurringBills.reminderDays')}</label>
                <input
                  type="number"
                  name="reminderDays"
                  value={formData.reminderDays}
                  onChange={handleChange}
                  min="0"
                  max="30"
                  placeholder="3"
                />
                <small>{t('recurringBills.reminderDaysHint')}</small>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="autoPay"
                    checked={formData.autoPay}
                    onChange={handleChange}
                  />
                  <span>{t('recurringBills.autoPay')}</span>
                </label>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                  />
                  <span>{t('recurringBills.isActive')}</span>
                </label>
              </div>

              <div className="form-group">
                <label>{t('recurringBills.notes')}</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="3"
                  placeholder={t('recurringBills.notesPlaceholder')}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingBill ? t('common.update') : t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Bill Card Component
 */
function BillCard({ bill, onEdit, onDelete, onMarkPaid, getCategoryIcon, formatDueDate, getDaysUntil, t, status }) {
  const daysUntil = getDaysUntil(bill.nextDueDate)
  const icon = getCategoryIcon(bill.category)

  return (
    <div className={`bill-card ${status}`}>
      <div className="bill-header">
        <div className="bill-icon">{icon}</div>
        <div className="bill-info">
          <h3>{bill.name}</h3>
          <span className="bill-frequency">{t(`recurringBills.frequencies.${bill.frequency}`)}</span>
        </div>
        <div className="bill-actions">
          <button 
            className="icon-btn" 
            onClick={() => onEdit(bill)}
            title={t('common.edit')}
          >
            <FiEdit />
          </button>
          <button 
            className="icon-btn danger" 
            onClick={() => onDelete(bill.id)}
            title={t('common.delete')}
          >
            <FiTrash2 />
          </button>
        </div>
      </div>

      <div className="bill-amount">
        <span className="amount">{formatCurrency(bill.amount)}</span>
        {bill.autoPay && <span className="auto-pay-badge">{t('recurringBills.autoPayEnabled')}</span>}
      </div>

      <div className="bill-due-date">
        <FiCalendar />
        <span>{t('recurringBills.dueOn')} {formatDueDate(bill.nextDueDate)}</span>
        {daysUntil >= 0 ? (
          <span className="days-until">
            {daysUntil === 0 ? t('recurringBills.today') : 
             daysUntil === 1 ? t('recurringBills.tomorrow') :
             `${daysUntil} ${t('recurringBills.daysLeft')}`}
          </span>
        ) : (
          <span className="days-overdue">
            {Math.abs(daysUntil)} {t('recurringBills.daysOverdue')}
          </span>
        )}
      </div>

      {bill.notes && (
        <div className="bill-notes">
          <p>{bill.notes}</p>
        </div>
      )}

      <div className="bill-footer">
        <button 
          className="btn btn-sm btn-success" 
          onClick={() => onMarkPaid(bill.id)}
        >
          <FiCheck /> {t('recurringBills.markPaid')}
        </button>
      </div>
    </div>
  )
}

export default RecurringBills

