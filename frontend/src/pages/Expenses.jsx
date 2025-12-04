import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiPlus, FiEdit, FiTrash2, FiFileText } from 'react-icons/fi'
import { transactionService, storageService } from '../services/api'
import { format } from 'date-fns'
import TransactionForm from '../components/TransactionForm'
import './Expenses.css'

/**
 * Expenses Page Component
 * Manage expense transactions
 */
function Expenses() {
  const { t } = useTranslation()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [formLoading, setFormLoading] = useState(false)

  /**
   * Load expenses on mount
   */
  useEffect(() => {
    loadExpenses()
  }, [])

  /**
   * Fetch expenses from API
   */
  const loadExpenses = async () => {
    try {
      setLoading(true)
      const data = await transactionService.getAll({ type: 'expense' })
      setExpenses(data)
    } catch (error) {
      console.error('Error loading expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle creating new expense
   */
  const handleCreate = async (expenseData) => {
    try {
      setFormLoading(true)
      await transactionService.create(expenseData)
      await loadExpenses()
      setShowForm(false)
    } catch (error) {
      console.error('Error creating expense:', error)
      throw error
    } finally {
      setFormLoading(false)
    }
  }

  /**
   * Handle updating expense
   */
  const handleUpdate = async (expenseData) => {
    try {
      setFormLoading(true)
      await transactionService.update(editingExpense.id, expenseData)
      await loadExpenses()
      setEditingExpense(null)
      setShowForm(false)
    } catch (error) {
      console.error('Error updating expense:', error)
      throw error
    } finally {
      setFormLoading(false)
    }
  }

  /**
   * Handle deleting expense
   */
  const handleDelete = async (expense) => {
    if (!window.confirm(t('messages.confirmDelete'))) return

    try {
      // Delete attachment if exists
      if (expense.attachment_path) {
        await storageService.deleteFile(expense.attachment_path)
      }
      
      await transactionService.delete(expense.id)
      await loadExpenses()
    } catch (error) {
      console.error('Error deleting expense:', error)
    }
  }

  /**
   * Open edit form
   */
  const openEditForm = (expense) => {
    setEditingExpense(expense)
    setShowForm(true)
  }

  /**
   * Close form
   */
  const closeForm = () => {
    setShowForm(false)
    setEditingExpense(null)
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
    <div className="expenses-page">
      {/* Page Header */}
      <div className="page-header flex-between">
        <div>
          <h1>{t('expenses.title')}</h1>
          <p className="page-subtitle">
            {t('expenses.totalCount', { count: expenses.length })}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
          >
            <FiPlus size={20} />
            {t('expenses.addExpense')}
          </button>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="form-modal">
          <div className="card form-card">
            <div className="card-header">
              <h2>
                {editingExpense 
                  ? t('expenses.editExpense')
                  : t('expenses.addExpense')
                }
              </h2>
            </div>
            <TransactionForm
              transaction={editingExpense}
              type="expense"
              onSubmit={editingExpense ? handleUpdate : handleCreate}
              onCancel={closeForm}
              loading={formLoading}
            />
          </div>
        </div>
      )}

      {/* Expenses List */}
      {expenses.length === 0 ? (
        <div className="card empty-state">
          <p>{t('expenses.noExpenses')}</p>
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
          >
            <FiPlus size={20} />
            {t('expenses.addExpense')}
          </button>
        </div>
      ) : (
        <div className="expenses-grid">
          {expenses.map((expense) => (
            <div key={expense.id} className="expense-card card">
              <div className="expense-header">
                <div className="expense-category">
                  {t(`categories.${expense.category}`)}
                </div>
                <div className="expense-amount">
                  {formatCurrency(expense.amount)}
                </div>
              </div>

              {expense.description && (
                <p className="expense-description">
                  {expense.description}
                </p>
              )}

              <div className="expense-date">
                {format(new Date(expense.date), 'MMMM dd, yyyy')}
                {expense.user_profiles && (
                  <span className="added-by">
                    {' • Added by '}
                    {expense.user_profiles.display_name}
                    {expense.user_profiles.email && (
                      <span className="added-by-email"> ({expense.user_profiles.email})</span>
                    )}
                  </span>
                )}
              </div>

              {expense.attachment_url && (
                <a
                  href={expense.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="attachment-link"
                >
                  <FiFileText size={16} />
                  {t('transaction.viewAttachment')}
                </a>
              )}

              <div className="expense-actions">
                <button
                  onClick={() => openEditForm(expense)}
                  className="btn-icon"
                  aria-label="Edit"
                >
                  <FiEdit size={18} />
                </button>
                <button
                  onClick={() => handleDelete(expense)}
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

export default Expenses

