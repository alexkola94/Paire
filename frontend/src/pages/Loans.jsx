import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiPlus, FiEdit, FiTrash2, FiCheckCircle, FiClock } from 'react-icons/fi'
import { loanService } from '../services/api'
import { format } from 'date-fns'
import './Loans.css'

/**
 * Loans Page Component
 * Manage loans (given and received)
 */
function Loans() {
  const { t } = useTranslation()
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingLoan, setEditingLoan] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const [formData, setFormData] = useState({
    type: 'given', // 'given' or 'received'
    party_name: '',
    total_amount: '',
    remaining_amount: '',
    due_date: '',
    description: '',
    status: 'active'
  })

  /**
   * Load loans on mount
   */
  useEffect(() => {
    loadLoans()
  }, [])

  /**
   * Fetch loans from API
   */
  const loadLoans = async () => {
    try {
      setLoading(true)
      const data = await loanService.getAll()
      setLoans(data)
    } catch (error) {
      console.error('Error loading loans:', error)
    } finally {
      setLoading(false)
    }
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
      setFormLoading(true)
      const loanData = {
        ...formData,
        total_amount: parseFloat(formData.total_amount),
        remaining_amount: parseFloat(formData.remaining_amount)
      }

      if (editingLoan) {
        await loanService.update(editingLoan.id, loanData)
      } else {
        await loanService.create(loanData)
      }

      await loadLoans()
      closeForm()
    } catch (error) {
      console.error('Error saving loan:', error)
    } finally {
      setFormLoading(false)
    }
  }

  /**
   * Handle deleting loan
   */
  const handleDelete = async (loan) => {
    if (!window.confirm(t('messages.confirmDelete'))) return

    try {
      await loanService.delete(loan.id)
      await loadLoans()
    } catch (error) {
      console.error('Error deleting loan:', error)
    }
  }

  /**
   * Open edit form
   */
  const openEditForm = (loan) => {
    setEditingLoan(loan)
    setFormData({
      type: loan.type,
      party_name: loan.party_name,
      total_amount: loan.total_amount,
      remaining_amount: loan.remaining_amount,
      due_date: loan.due_date ? loan.due_date.split('T')[0] : '',
      description: loan.description || '',
      status: loan.status
    })
    setShowForm(true)
  }

  /**
   * Close form and reset
   */
  const closeForm = () => {
    setShowForm(false)
    setEditingLoan(null)
    setFormData({
      type: 'given',
      party_name: '',
      total_amount: '',
      remaining_amount: '',
      due_date: '',
      description: '',
      status: 'active'
    })
  }

  /**
   * Format currency
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
    <div className="loans-page">
      {/* Page Header */}
      <div className="page-header flex-between">
        <div>
          <h1>{t('loans.title')}</h1>
          <p className="page-subtitle">
            Total: {loans.length} {loans.length === 1 ? 'loan' : 'loans'}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
          >
            <FiPlus size={20} />
            {t('loans.addLoan')}
          </button>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="form-modal">
          <div className="card form-card">
            <div className="card-header">
              <h2>
                {editingLoan 
                  ? t('loans.editLoan')
                  : t('loans.addLoan')
                }
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="loan-form">
              {/* Loan Type */}
              <div className="form-group">
                <label>{t('loans.type')}</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="type"
                      value="given"
                      checked={formData.type === 'given'}
                      onChange={handleChange}
                    />
                    <span>Money Lent (Given)</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="type"
                      value="received"
                      checked={formData.type === 'received'}
                      onChange={handleChange}
                    />
                    <span>Money Borrowed (Received)</span>
                  </label>
                </div>
              </div>

              {/* Party Name */}
              <div className="form-group">
                <label htmlFor="party_name">
                  {formData.type === 'given' ? t('loans.borrower') : t('loans.lender')} *
                </label>
                <input
                  type="text"
                  id="party_name"
                  name="party_name"
                  value={formData.party_name}
                  onChange={handleChange}
                  placeholder="Enter name"
                  required
                />
              </div>

              {/* Total Amount */}
              <div className="form-group">
                <label htmlFor="total_amount">{t('loans.totalAmount')} *</label>
                <input
                  type="number"
                  id="total_amount"
                  name="total_amount"
                  value={formData.total_amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              {/* Remaining Amount */}
              <div className="form-group">
                <label htmlFor="remaining_amount">{t('loans.remainingAmount')} *</label>
                <input
                  type="number"
                  id="remaining_amount"
                  name="remaining_amount"
                  value={formData.remaining_amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              {/* Due Date */}
              <div className="form-group">
                <label htmlFor="due_date">{t('loans.dueDate')}</label>
                <input
                  type="date"
                  id="due_date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleChange}
                />
              </div>

              {/* Status */}
              <div className="form-group">
                <label htmlFor="status">{t('loans.status')}</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Description */}
              <div className="form-group">
                <label htmlFor="description">{t('transaction.description')}</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Additional notes..."
                  rows="3"
                />
              </div>

              {/* Form Actions */}
              <div className="form-actions">
                <button
                  type="button"
                  onClick={closeForm}
                  className="btn btn-secondary"
                  disabled={formLoading}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={formLoading}
                >
                  {formLoading ? t('common.loading') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loans List */}
      {loans.length === 0 ? (
        <div className="card empty-state">
          <p>{t('loans.noLoans')}</p>
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
          >
            <FiPlus size={20} />
            {t('loans.addLoan')}
          </button>
        </div>
      ) : (
        <div className="loans-grid">
          {loans.map((loan) => (
            <div key={loan.id} className={`loan-card card ${loan.type}`}>
              <div className="loan-header">
                <div className="loan-type-badge">
                  {loan.type === 'given' ? 'Money Lent' : 'Money Borrowed'}
                </div>
                <div className={`loan-status ${loan.status}`}>
                  {loan.status === 'completed' ? (
                    <FiCheckCircle size={20} />
                  ) : (
                    <FiClock size={20} />
                  )}
                </div>
              </div>

              <h3 className="loan-party">{loan.party_name}</h3>

              <div className="loan-amounts">
                <div className="amount-item">
                  <span className="amount-label">{t('loans.totalAmount')}</span>
                  <span className="amount-value">
                    {formatCurrency(loan.total_amount)}
                  </span>
                </div>
                <div className="amount-item">
                  <span className="amount-label">{t('loans.remainingAmount')}</span>
                  <span className="amount-value remaining">
                    {formatCurrency(loan.remaining_amount)}
                  </span>
                </div>
              </div>

              {loan.due_date && (
                <div className="loan-due-date">
                  <strong>{t('loans.dueDate')}:</strong>{' '}
                  {format(new Date(loan.due_date), 'MMM dd, yyyy')}
                </div>
              )}

              {loan.description && (
                <p className="loan-description">{loan.description}</p>
              )}

              <div className="loan-actions">
                <button
                  onClick={() => openEditForm(loan)}
                  className="btn-icon"
                  aria-label="Edit"
                >
                  <FiEdit size={18} />
                </button>
                <button
                  onClick={() => handleDelete(loan)}
                  className="btn-icon delete"
                  aria-label="Delete"
                >
                  <FiTrash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Loans

