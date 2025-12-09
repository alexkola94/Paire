import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { FiPlus, FiEdit, FiTrash2, FiFileText, FiX } from 'react-icons/fi'
import { transactionService, storageService } from '../services/api'
import { format } from 'date-fns'
import TransactionForm from '../components/TransactionForm'
import ConfirmationModal from '../components/ConfirmationModal'
import Modal from '../components/Modal'
import LogoLoader from '../components/LogoLoader'
// import useSwipeGesture from '../hooks/useSwipeGesture'
// import useFocusTrap from '../hooks/useFocusTrap'
import useScreenReader from '../hooks/useScreenReader'
import useToast from '../hooks/useToast'
import useUndo from '../hooks/useUndo'
import ToastContainer from '../components/ToastContainer'
import SuccessAnimation from '../components/SuccessAnimation'
import LoadingProgress from '../components/LoadingProgress'
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
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, expense: null })

  // Phase 4: Mobile & Accessibility hooks
  const { announce } = useScreenReader()
  const { toasts, showSuccess, showError, removeToast } = useToast()

  // Phase 5: Polish & Advanced UX
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [showLoadingProgress, setShowLoadingProgress] = useState(false)
  const { performAction: performUndoableAction, undo, canUndo } = useUndo()

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
      setShowLoadingProgress(true)

      const createdExpense = await transactionService.create(expenseData)

      // Phase 5: Success animation
      setShowLoadingProgress(false)
      setShowForm(false)
      setShowSuccessAnimation(true)

      showSuccess(t('expenses.createdSuccess'))
      announce(t('expenses.createdSuccess'))

      // Phase 5: Undo functionality
      performUndoableAction(
        async () => {
          await loadExpenses()
        },
        async () => {
          // Undo: delete the created expense
          try {
            await transactionService.delete(createdExpense.id)
            await loadExpenses()
            showSuccess(t('expenses.undoSuccess'))
            announce(t('expenses.undoSuccess'))
          } catch (error) {
            console.error('Error undoing expense creation:', error)
            showError(t('expenses.undoError'))
          }
        },
        5000 // 5 seconds to undo
      )
    } catch (error) {
      console.error('Error creating expense:', error)
      setShowLoadingProgress(false)
      showError(t('expenses.createError'))
      announce(t('expenses.createError'), 'assertive')
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
      setShowLoadingProgress(true)

      // Save old data for undo
      const oldExpenseData = { ...editingExpense }

      await transactionService.update(editingExpense.id, expenseData)

      // Phase 5: Success animation
      setShowLoadingProgress(false)
      setEditingExpense(null)
      setShowForm(false)
      setShowSuccessAnimation(true)

      showSuccess(t('expenses.updatedSuccess'))
      announce(t('expenses.updatedSuccess'))

      // Phase 5: Undo functionality
      performUndoableAction(
        async () => {
          await loadExpenses()
        },
        async () => {
          // Undo: restore old data
          try {
            await transactionService.update(editingExpense.id, oldExpenseData)
            await loadExpenses()
            showSuccess(t('expenses.undoSuccess'))
            announce(t('expenses.undoSuccess'))
          } catch (error) {
            console.error('Error undoing expense update:', error)
            showError(t('expenses.undoError'))
          }
        },
        5000 // 5 seconds to undo
      )
    } catch (error) {
      console.error('Error updating expense:', error)
      setShowLoadingProgress(false)
      showError(t('expenses.updateError'))
      announce(t('expenses.updateError'), 'assertive')
      throw error
    } finally {
      setFormLoading(false)
    }
  }

  /**
   * Open delete confirmation modal
   */
  const openDeleteModal = (expense) => {
    setDeleteModal({ isOpen: true, expense })
  }

  /**
   * Close delete confirmation modal
   */
  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, expense: null })
  }

  /**
   * Handle deleting expense
   */
  const handleDelete = async () => {
    const { expense } = deleteModal
    if (!expense) return

    try {
      setFormLoading(true)
      setShowLoadingProgress(true)

      // Save expense data for undo
      const expenseToDelete = { ...expense }

      // Delete attachment if exists
      if (expense.attachment_path) {
        await storageService.deleteFile(expense.attachment_path)
      }

      await transactionService.delete(expense.id)

      setShowLoadingProgress(false)
      await loadExpenses()
      closeDeleteModal()

      // Phase 5: Undo functionality
      performUndoableAction(
        () => { },
        async () => {
          // Undo: restore deleted expense
          try {
            await transactionService.create(expenseToDelete)
            await loadExpenses()
            showSuccess(t('expenses.undoSuccess'))
            announce(t('expenses.undoSuccess'))
          } catch (error) {
            console.error('Error undoing expense deletion:', error)
            showError(t('expenses.undoError'))
          }
        },
        5000 // 5 seconds to undo
      )
    } catch (error) {
      console.error('Error deleting expense:', error)
      setShowLoadingProgress(false)
      showError(t('expenses.deleteError'))
    } finally {
      setFormLoading(false)
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
    announce(t('expenses.formClosed'))
  }

  /**
   * Handle keyboard shortcuts
   */
  useEffect(() => {
    if (!showForm) return

    const handleKeyDown = (e) => {
      // Esc to close form
      if (e.key === 'Escape') {
        closeForm()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showForm])

  /**
   * Format currency
   */
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="page-loading">
        <LogoLoader size="medium" />
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
            <FiPlus />
            {t('expenses.addExpense')}
          </button>
        )}
      </div>

      {/* Expense Form Modal (Portal) */}
      <Modal
        isOpen={showForm}
        onClose={closeForm}
        title={editingExpense ? t('expenses.editExpense') : t('expenses.addExpense')}
      >
        <TransactionForm
          transaction={editingExpense}
          type="expense"
          onSubmit={editingExpense ? handleUpdate : handleCreate}
          onCancel={closeForm}
          loading={formLoading}
        />
      </Modal>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Phase 5: Success Animation */}
      <SuccessAnimation
        show={showSuccessAnimation}
        onComplete={() => setShowSuccessAnimation(false)}
        message={t('expenses.savedSuccess')}
      />

      {/* Phase 5: Loading Progress */}
      {showLoadingProgress && (
        <LoadingProgress
          message={formLoading ? t('common.saving') : t('common.loading')}
        />
      )}

      {/* Phase 5: Undo Banner */}
      {canUndo && (
        <div className="undo-banner">
          <span>{t('expenses.undoAvailable')}</span>
          <button
            type="button"
            onClick={undo}
            className="btn btn-sm btn-undo"
          >
            {t('common.undo')}
          </button>
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
            <FiPlus />
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
                    {' • ' + t('dashboard.addedBy') + ' '}
                    {expense.user_profiles.display_name}
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
                  onClick={() => openDeleteModal(expense)}
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

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        title={t('expenses.deleteExpense')}
        message={t('messages.confirmDelete')}
        confirmText={t('common.delete')}
        loading={formLoading}
        variant="danger"
      />
    </div>
  )
}

export default Expenses

