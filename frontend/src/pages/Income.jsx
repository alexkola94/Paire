import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiPlus, FiEdit, FiTrash2, FiFileText } from 'react-icons/fi'
import { transactionService, storageService } from '../services/api'
import { format } from 'date-fns'
import TransactionForm from '../components/TransactionForm'
import './Income.css'

/**
 * Income Page Component
 * Manage income transactions
 */
function Income() {
  const { t } = useTranslation()
  const [incomes, setIncomes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingIncome, setEditingIncome] = useState(null)
  const [formLoading, setFormLoading] = useState(false)

  /**
   * Load incomes on mount
   */
  useEffect(() => {
    loadIncomes()
  }, [])

  /**
   * Fetch incomes from API
   */
  const loadIncomes = async () => {
    try {
      setLoading(true)
      const data = await transactionService.getAll({ type: 'income' })
      setIncomes(data)
    } catch (error) {
      console.error('Error loading incomes:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle creating new income
   */
  const handleCreate = async (incomeData) => {
    try {
      setFormLoading(true)
      await transactionService.create(incomeData)
      await loadIncomes()
      setShowForm(false)
    } catch (error) {
      console.error('Error creating income:', error)
      throw error
    } finally {
      setFormLoading(false)
    }
  }

  /**
   * Handle updating income
   */
  const handleUpdate = async (incomeData) => {
    try {
      setFormLoading(true)
      await transactionService.update(editingIncome.id, incomeData)
      await loadIncomes()
      setEditingIncome(null)
      setShowForm(false)
    } catch (error) {
      console.error('Error updating income:', error)
      throw error
    } finally {
      setFormLoading(false)
    }
  }

  /**
   * Handle deleting income
   */
  const handleDelete = async (income) => {
    if (!window.confirm(t('messages.confirmDelete'))) return

    try {
      // Delete attachment if exists
      if (income.attachment_path) {
        await storageService.deleteFile(income.attachment_path)
      }
      
      await transactionService.delete(income.id)
      await loadIncomes()
    } catch (error) {
      console.error('Error deleting income:', error)
    }
  }

  /**
   * Open edit form
   */
  const openEditForm = (income) => {
    setEditingIncome(income)
    setShowForm(true)
  }

  /**
   * Close form
   */
  const closeForm = () => {
    setShowForm(false)
    setEditingIncome(null)
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
    <div className="income-page">
      {/* Page Header */}
      <div className="page-header flex-between">
        <div>
          <h1>{t('income.title')}</h1>
          <p className="page-subtitle">
            Total: {incomes.length} {incomes.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
          >
            <FiPlus size={20} />
            {t('income.addIncome')}
          </button>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="form-modal">
          <div className="card form-card">
            <div className="card-header">
              <h2>
                {editingIncome 
                  ? t('income.editIncome')
                  : t('income.addIncome')
                }
              </h2>
            </div>
            <TransactionForm
              transaction={editingIncome}
              type="income"
              onSubmit={editingIncome ? handleUpdate : handleCreate}
              onCancel={closeForm}
              loading={formLoading}
            />
          </div>
        </div>
      )}

      {/* Income List */}
      {incomes.length === 0 ? (
        <div className="card empty-state">
          <p>{t('income.noIncome')}</p>
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
          >
            <FiPlus size={20} />
            {t('income.addIncome')}
          </button>
        </div>
      ) : (
        <div className="income-grid">
          {incomes.map((income) => (
            <div key={income.id} className="income-card card">
              <div className="income-header">
                <div className="income-category">
                  {t(`categories.${income.category}`)}
                </div>
                <div className="income-amount">
                  +{formatCurrency(income.amount)}
                </div>
              </div>

              {income.description && (
                <p className="income-description">
                  {income.description}
                </p>
              )}

              <div className="income-date">
                {format(new Date(income.date), 'MMMM dd, yyyy')}
                {income.user_profiles && (
                  <span className="added-by">
                    {' • Added by '}
                    {income.user_profiles.display_name}
                    {income.user_profiles.email && (
                      <span className="added-by-email"> ({income.user_profiles.email})</span>
                    )}
                  </span>
                )}
              </div>

              {income.attachment_url && (
                <a
                  href={income.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="attachment-link"
                >
                  <FiFileText size={16} />
                  View Attachment
                </a>
              )}

              <div className="income-actions">
                <button
                  onClick={() => openEditForm(income)}
                  className="btn-icon"
                  aria-label="Edit"
                >
                  <FiEdit size={18} />
                </button>
                <button
                  onClick={() => handleDelete(income)}
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

export default Income

