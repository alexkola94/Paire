import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiPlus, FiEdit, FiTrash2, FiFileText, FiChevronLeft, FiChevronRight, FiZoomIn, FiDownload } from 'react-icons/fi'
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
import './Expenses.css'

function Expenses() {
  const { t } = useTranslation()
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
      console.log('--- handleCreate started ---')
      // Close form immediately and show full screen loader
      setShowForm(false)
      setShowLoadingProgress(true)

      console.log('Calling transactionService.create...')
      const createdExpense = await transactionService.create(expenseData)
      console.log('transactionService.create finished. Result:', createdExpense)

      // Phase 5: Success animation
      setShowLoadingProgress(false)
      setShowSuccessAnimation(true)

      showSuccess(t('expenses.createdSuccess'))
      announce(t('expenses.createdSuccess'))

      // Refresh list in background
      await loadExpenses(true)

      // Phase 5: Undo functionality
      performUndoableAction(
        async () => {
          await loadExpenses(true)
        },
        async () => {
          // Undo: delete the created expense
          try {
            await transactionService.delete(createdExpense.id)
            await loadExpenses(true)
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
      setShowForm(true) // Re-open form on error
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
      // Close form immediately and show full screen loader
      setShowForm(false)
      setShowLoadingProgress(true)

      // Save old data for undo
      const oldExpenseData = { ...editingExpense }

      await transactionService.update(editingExpense.id, expenseData)

      // Phase 5: Success animation
      setShowLoadingProgress(false)
      setShowSuccessAnimation(true)

      setEditingExpense(null)
      // Form is already closed

      showSuccess(t('expenses.updatedSuccess'))
      announce(t('expenses.updatedSuccess'))

      // Refresh list in background
      await loadExpenses(true)

      // Phase 5: Undo functionality
      performUndoableAction(
        async () => {
          await loadExpenses(true)
        },
        async () => {
          // Undo: restore old data
          try {
            await transactionService.update(editingExpense.id, oldExpenseData)
            await loadExpenses(true)
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
      // Removed intrusive full-screen loader to keep modal visible

      // Save expense data for undo
      const expenseToDelete = { ...expense }

      // Delete attachment if exists
      if (expense.attachment_path) {
        await storageService.deleteFile(expense.attachment_path)
      }

      await transactionService.delete(expense.id)

      // Refresh list in background - PREVENTS FLASH
      await loadExpenses(true)
      closeDeleteModal()

      // Phase 5: Undo functionality
      performUndoableAction(
        () => { },
        async () => {
          // Undo: restore deleted expense
          try {
            await transactionService.create(expenseToDelete)
            await loadExpenses(true)
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

      {/* Search and Filter Bar */}
      <div className="search-filter-container">
        <div className="search-wrapper flex-grow">
          <label className="filter-label">{t('common.search', 'Search')}</label>
          <SearchInput
            onSearch={handleSearch}
            placeholder={t('expenses.searchPlaceholder', 'Search expenses...')}
          />
        </div>

        <div className="date-filters">
          <DatePicker
            label={t('common.from', 'From')}
            selected={startDate}
            onChange={(date) => {
              setStartDate(date ? date.toISOString() : '')
              setPage(1)
            }}
            placeholder={t('common.startDate', 'Start Date')}
            className="date-picker-custom"
          />

          <DatePicker
            label={t('common.to', 'To')}
            selected={endDate}
            onChange={(date) => {
              setEndDate(date ? date.toISOString() : '')
              setPage(1)
            }}
            placeholder={t('common.endDate', 'End Date')}
            className="date-picker-custom"
          />

          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('')
                setEndDate('')
                setPage(1)
              }}
              className="btn-icon-clear"
              title={t('common.clearDates', 'Clear dates')}
            >
              <FiTrash2 />
            </button>
          )}
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
            <div key={expense.id} className="expense-card card">
              <div className="expense-header">
                <div className="expense-category">
                  {t(`categories.${(expense.category || '').toLowerCase()}`)}
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
                {expense.paidBy === 'Bank' || expense.isBankSynced ? (
                  <span className="added-by">
                    {' • ' + t('dashboard.bankConnection', 'Imported from Bank')}
                  </span>
                ) : expense.user_profiles && (
                  <span className="added-by">
                    {' • ' + t('dashboard.addedBy') + ' '}
                    {expense.user_profiles.display_name}
                  </span>
                )}
              </div>

              {expense.attachment_url && (
                <button
                  type="button"
                  onClick={() => setViewModal(expense)}
                  className="attachment-link-btn"
                >
                  <FiFileText size={16} />
                  {t('transaction.viewAttachment', 'View Receipt')}
                </button>
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
      {/* Image Viewer Modal */}
      {viewModal && (
        <div className="image-viewer-modal" onClick={() => setViewModal(null)} role="dialog" aria-modal="true">
          <div className="image-viewer-content" onClick={e => e.stopPropagation()}>
            {viewModal.attachment_url && viewModal.attachment_url.toLowerCase().endsWith('.pdf') ? (
              <iframe src={viewModal.attachment_url} title="Receipt PDF" width="100%" height="500px"></iframe>
            ) : (
              <img src={viewModal.attachment_url} alt="Full Receipt" />
            )}
            <button className="close-viewer" onClick={() => setViewModal(null)} aria-label={t('common.close')}>×</button>
            <a href={viewModal.attachment_url} download target="_blank" rel="noopener noreferrer" className="download-btn btn btn-primary">
              <FiDownload /> {t('common.download', 'Download')} {viewModal.user_profiles ? (t('dashboard.addedBy') + ' ' + viewModal.user_profiles.display_name) : ''}
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

export default Expenses

