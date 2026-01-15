import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiPlus, FiEdit, FiTrash2, FiFileText, FiChevronLeft, FiChevronRight, FiZoomIn, FiDownload, FiX } from 'react-icons/fi'
import { transactionService, storageService } from '../services/api'
import { format } from 'date-fns'
import TransactionForm from '../components/TransactionForm'
import ConfirmationModal from '../components/ConfirmationModal'
import Modal from '../components/Modal'
import SearchInput from '../components/SearchInput'
import DatePicker from '../components/DatePicker'

// import useSwipeGesture from '../hooks/useSwipeGesture'
// import useFocusTrap from '../hooks/useFocusTrap'
import useScreenReader from '../hooks/useScreenReader'
import useToast from '../hooks/useToast'
import useUndo from '../hooks/useUndo'
import ToastContainer from '../components/ToastContainer'
import SuccessAnimation from '../components/SuccessAnimation'
import LoadingProgress from '../components/LoadingProgress'
import Skeleton from '../components/Skeleton'
import useCurrencyFormatter from '../hooks/useCurrencyFormatter'
import TransactionDetailModal from '../components/TransactionDetailModal'
import { usePrivacyMode } from '../context/PrivacyModeContext'
import './Expenses.css'

function Expenses() {
  const { t } = useTranslation()
  const { isPrivate } = usePrivacyMode() // Privacy mode for hiding amounts
  // All expenses from API
  const [allExpenses, setAllExpenses] = useState([])
  // Expenses after search filter
  const [filteredExpenses, setFilteredExpenses] = useState([])
  // Expenses for current page
  const [displayedExpenses, setDisplayedExpenses] = useState([])

  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, expense: null })
  const [viewModal, setViewModal] = useState(null) // For viewing full receipt
  const [detailModal, setDetailModal] = useState(null) // For viewing transaction details

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  // Date filter state
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const PAGE_SIZE = 6

  // Deep linking
  const [searchParams, setSearchParams] = useSearchParams()

  // Phase 4: Mobile & Accessibility hooks
  const { announce } = useScreenReader()
  const { toasts, success: showSuccess, error: showError, removeToast } = useToast()

  // Phase 5: Polish & Advanced UX
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [showLoadingProgress, setShowLoadingProgress] = useState(false)
  const { performAction: performUndoableAction, undo, canUndo } = useUndo()

  /**
   * Load ALL expenses on mount
   */
  useEffect(() => {
    loadExpenses()

    // Check query params for actions
    if (searchParams.get('action') === 'add') {
      setShowForm(true)
      // Clear param to prevent reopening on refresh
      setSearchParams(params => {
        params.delete('action')
        return params
      }, { replace: true })
    }
  }, []) // Load once on mount

  /**
   * Handle Search & Pagination Effect
   * Runs whenever allExpenses, searchQuery, or page changes
   */
  useEffect(() => {
    // 1. Filter
    let result = allExpenses

    // Text Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(expense =>
        (expense.description && expense.description.toLowerCase().includes(query)) ||
        (expense.category && expense.category.toLowerCase().includes(query)) ||
        (expense.notes && expense.notes.toLowerCase().includes(query)) ||
        (expense.tags && expense.tags.some(tag => tag.toLowerCase().includes(query))) ||
        (expense.amount && expense.amount.toString().includes(query))
      )
    }

    // Date Filter
    if (startDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      result = result.filter(expense => new Date(expense.date) >= start)
    }

    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      result = result.filter(expense => new Date(expense.date) <= end)
    }

    setTotalItems(result.length)
    setTotalPages(Math.ceil(result.length / PAGE_SIZE))

    // 2. Paginate
    const startIndex = (page - 1) * PAGE_SIZE
    const paginated = result.slice(startIndex, startIndex + PAGE_SIZE)
    setDisplayedExpenses(paginated)

  }, [allExpenses, searchQuery, page, startDate, endDate])

  /**
   * Handle search input
   */
  const handleSearch = (query) => {
    setSearchQuery(query)
    setPage(1) // Reset to first page
  }

  /**
   * Fetch ALL expenses from API
   */
  const loadExpenses = async (background = false) => {
    try {
      if (!background) {
        setLoading(true)
      }
      // Fetch ALL expenses (no pagination params)
      const data = await transactionService.getAll({
        type: 'expense'
      })

      // Handle response (array or paged object fallback)
      const items = Array.isArray(data) ? data : (data.items || [])

      setAllExpenses(items)
      // Filter/Pagination will run via useEffect

    } catch (error) {
      console.error('Error loading expenses:', error)
      showError(t('expenses.loadError', 'Failed to load expenses'))
    } finally {
      if (!background) {
        setLoading(false)
      }
    }
  }

  /**
   * Handle creating new expense
   */
  const handleCreate = async (expenseData) => {
    try {
      setFormLoading(true)

      const createdExpense = await transactionService.create(expenseData)

      // Local Update
      setAllExpenses(prev => [createdExpense, ...prev])

      setShowSuccessAnimation(true)
      showSuccess(t('expenses.createdSuccess'))
      announce(t('expenses.createdSuccess'))

      setShowForm(false)

      // Refresh list in background
      loadExpenses(true)

      // Phase 5: Undo functionality
      performUndoableAction(
        async () => {
          loadExpenses(true)
        },
        async () => {
          // Undo: delete the created expense
          try {
            await transactionService.delete(createdExpense.id)
            setAllExpenses(prev => prev.filter(e => e.id !== createdExpense.id)) // Local Undo
            loadExpenses(true)
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
      setShowForm(true) // Re-open form
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

      // Save old data for undo
      const oldExpenseData = { ...editingExpense }

      await transactionService.update(editingExpense.id, expenseData)

      // Local Update
      setAllExpenses(prev => prev.map(e => e.id === editingExpense.id ? { ...e, ...expenseData } : e))

      setShowSuccessAnimation(true)

      setEditingExpense(null)
      setShowForm(false)

      showSuccess(t('expenses.updatedSuccess'))
      announce(t('expenses.updatedSuccess'))

      // Refresh list in background
      loadExpenses(true)

      // Phase 5: Undo functionality
      performUndoableAction(
        async () => {
          loadExpenses(true)
        },
        async () => {
          // Undo: restore old data
          try {
            await transactionService.update(editingExpense.id, oldExpenseData)
            // Local Undo
            setAllExpenses(prev => prev.map(e => e.id === editingExpense.id ? oldExpenseData : e))
            loadExpenses(true)
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
      setShowForm(true) // Re-open form on error
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

      // Save expense data for undo
      const expenseToDelete = { ...expense }

      // Delete attachment if exists
      if (expense.attachmentPath) {
        await storageService.deleteFile(expense.attachmentPath)
      }

      await transactionService.delete(expense.id)

      // Local Update
      setAllExpenses(prev => prev.filter(e => e.id !== expense.id))

      // Refresh list in background
      loadExpenses(true)

      closeDeleteModal()

      // Phase 5: Undo functionality
      performUndoableAction(
        () => { },
        async () => {
          // Undo: restore deleted expense
          try {
            await transactionService.create(expenseToDelete)
            // Local Undo
            setAllExpenses(prev => [expenseToDelete, ...prev])
            loadExpenses(true)
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
  }, [showForm]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Format currency
   */
  /**
   * Format currency
   */
  const formatCurrency = useCurrencyFormatter()

  if (loading) {
    return (
      <div className="expenses-page">
        <div className="page-header flex-between">
          <div>
            <Skeleton height="32px" width="150px" style={{ marginBottom: '8px' }} />
            <Skeleton height="20px" width="100px" />
          </div>
          <Skeleton height="40px" width="140px" style={{ borderRadius: '8px' }} />
        </div>
        <div className="expenses-grid">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="expense-card card" style={{ height: '200px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <Skeleton height="24px" width="120px" />
                <Skeleton height="24px" width="80px" />
              </div>
              <Skeleton height="16px" width="100%" style={{ marginBottom: '0.5rem' }} />
              <Skeleton height="16px" width="60%" style={{ marginBottom: '1.5rem' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: 'auto' }}>
                <Skeleton type="circular" width="32px" height="32px" />
                <Skeleton type="circular" width="32px" height="32px" />
              </div>
            </div>
          ))}
        </div>
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
            {t('expenses.totalCount', { count: totalItems })}
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

      {/* Search and Filter Bar - Grid Layout */}
        <div className="expenses-filters-grid">
        <div className="search-span-full" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <SearchInput
            onSearch={handleSearch}
            placeholder={t('expenses.searchPlaceholder')}
          />
        </div>

        <div className="filter-item">
          <DatePicker
            selected={startDate}
            onChange={(date) => {
              setStartDate(date ? date.toISOString() : '')
              setPage(1)
            }}
            placeholder={t('common.startDate')}
            className="form-control w-full"
          />
        </div>

        <div className="filter-item">
          <DatePicker
            selected={endDate}
            onChange={(date) => {
              setEndDate(date ? date.toISOString() : '')
              setPage(1)
            }}
            placeholder={t('common.endDate')}
            className="form-control w-full"
          />
        </div>
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
      {allExpenses.length === 0 && !loading ? (
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
      ) : displayedExpenses.length === 0 && !loading ? (
        <div className="card empty-state">
          <p>{t('common.noResults', 'No expenses found matching your search.')}</p>
        </div>
      ) : (
        <div className="expenses-grid">
          {displayedExpenses.map((expense) => (
            <div 
              key={expense.id} 
              className="expense-card card clickable"
              onClick={() => setDetailModal(expense)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setDetailModal(expense)}
            >
              <div className="expense-header">
                <div className="expense-category">
                  {t(`categories.${(expense.category || '').toLowerCase()}`)}
                </div>
                <div className={`expense-amount ${isPrivate ? 'masked-number' : ''}`}>
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
                {expense.paidBy === 'Bank' || expense.isBankSynced ? (
                  <span className="added-by">
                    {' • ' + t('dashboard.bankConnection', 'Imported from Bank')}
                  </span>
                ) : expense.user_profiles && (
                  <span className="added-by" style={{ display: 'inline-flex', alignItems: 'center' }}>
                    {' • '}
                    {(expense.user_profiles.avatar_url || expense.user_profiles.avatarUrl) && (
                      <img
                        src={expense.user_profiles.avatar_url || expense.user_profiles.avatarUrl}
                        alt={expense.user_profiles.display_name}
                        className="tag-avatar"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    )}
                    {t('dashboard.addedBy') + ' '}
                    {expense.user_profiles.display_name}
                  </span>
                )}
              </div>

              <div className="expense-actions" onClick={(e) => e.stopPropagation()}>
                {expense.attachmentUrl && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setViewModal(expense); }}
                    className="btn-icon"
                    aria-label={t('transaction.viewAttachment', 'View Receipt')}
                    title={t('transaction.viewAttachment', 'View Receipt')}
                  >
                    <FiFileText size={18} />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); openEditForm(expense); }}
                  className="btn-icon"
                  aria-label="Edit"
                >
                  <FiEdit size={18} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); openDeleteModal(expense); }}
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pagination-controls">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn btn-secondary pagination-btn"
          >
            <FiChevronLeft />
            {t('common.previous')}
          </button>

          <span className="pagination-info">
            {t('common.page')} {page} {t('common.of')} {totalPages}
          </span>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn btn-secondary pagination-btn"
          >
            {t('common.next')}
            <FiChevronRight />
          </button>
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
      {/* Image Viewer Modal via Portal */}
      <Modal
        isOpen={!!viewModal}
        onClose={() => setViewModal(null)}
        title={t('transaction.viewAttachment', 'View Receipt')}
        showCloseButton={true}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%' }}>
          {viewModal?.attachmentUrl && viewModal.attachmentUrl.toLowerCase().endsWith('.pdf') ? (
            <iframe
              src={viewModal.attachmentUrl}
              title="Receipt PDF"
              style={{ width: '100%', height: '60vh', border: 'none', borderRadius: '8px' }}
            />
          ) : (
            <img
              src={viewModal?.attachmentUrl}
              alt="Full Receipt"
              style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '8px', objectFit: 'contain' }}
            />
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <a
              href={viewModal?.attachmentUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <FiDownload size={18} />
              {t('common.download', 'Download')}
            </a>
          </div>
        </div>
      </Modal>

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        transaction={detailModal}
        isOpen={!!detailModal}
        onClose={() => setDetailModal(null)}
      />
    </div>
  )
}

export default Expenses

