import { useState, useEffect, useCallback, memo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// react-window: import via shim (Vite alias uses ESM build)
import { FixedSizeList as List } from '../utils/reactWindow'
import { motion } from 'framer-motion'
import { FiPlus, FiEdit, FiTrash2, FiFileText, FiChevronLeft, FiChevronRight, FiZoomIn, FiDownload, FiX } from 'react-icons/fi'
import { transactionService, storageService } from '../services/api'
import { format } from 'date-fns'
import TransactionForm from '../components/TransactionForm'
import ConfirmationModal from '../components/ConfirmationModal'
import Modal from '../components/Modal'
import SearchInput from '../components/SearchInput'
import DateRangePicker from '../components/DateRangePicker'

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
import AddToCalculatorButton from '../components/AddToCalculatorButton'
import './Expenses.css'

/** Row renderer for react-window virtualized expense list */
const ExpenseRow = memo(({ index, style, data }) => {
  const { expenses, formatCurrency, t, setDetailModal, openEditForm, openDeleteModal, setViewModal, isPrivate } = data
  const expense = expenses[index]
  if (!expense) return null
  return (
    <div style={style}>
      <div
        className="expense-card card clickable data-card"
        onClick={() => setDetailModal(expense)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setDetailModal(expense)}
      >
        <div className="expense-header data-card-header">
          <div className="expense-category">
            {t(`categories.${(expense.category || '').toLowerCase()}`)}
          </div>
          <div className="expense-amount-row">
            <span className={`expense-amount ${isPrivate ? 'masked-number' : ''}`}>
              {formatCurrency(expense.amount)}
            </span>
            <AddToCalculatorButton
              value={expense.amount}
              isPrivate={isPrivate}
              size={18}
              className="expense-add-to-calc-btn"
            />
          </div>
        </div>
        <div className="data-card-body">
          {expense.description ? (
            <p className="expense-description">{expense.description}</p>
          ) : null}
        </div>
        <div className="expense-date data-card-meta">
          {format(new Date(expense.date), 'MMMM dd, yyyy')}
          {expense.paidBy === 'Bank' || expense.isBankSynced ? (
            <span className="added-by">{' • ' + t('dashboard.bankConnection', 'Imported from Bank')}</span>
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
        <div className="expense-actions data-card-actions" onClick={(e) => e.stopPropagation()}>
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
    </div>
  )
})
ExpenseRow.displayName = 'ExpenseRow'

function Expenses() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { isPrivate } = usePrivacyMode() // Privacy mode for hiding amounts
  // Server-side pagination: only current page items
  const [displayedExpenses, setDisplayedExpenses] = useState([])

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

  // React Query: expenses with server-side pagination and filters
  const { data: expensesData, isLoading: expensesLoading } = useQuery({
    queryKey: ['transactions', 'expense', page, searchQuery, startDate, endDate],
    queryFn: () => transactionService.getAll({
      type: 'expense',
      page,
      pageSize: PAGE_SIZE,
      search: searchQuery.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    })
  })

  // Derive displayed list and pagination from query result
  useEffect(() => {
    if (expensesData === undefined) return
    const items = Array.isArray(expensesData) ? expensesData : (expensesData.items || [])
    const total = Array.isArray(expensesData) ? expensesData.length : (expensesData.totalCount ?? items.length)
    const pages = Array.isArray(expensesData) ? 1 : (expensesData.totalPages ?? 1)
    setDisplayedExpenses(items)
    setTotalItems(total)
    setTotalPages(pages)
  }, [expensesData])

  // Mutations: invalidate transactions cache on create/update/delete
  const createMutation = useMutation({
    mutationFn: (body) => transactionService.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] })
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => transactionService.update(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] })
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => transactionService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] })
  })

  // Loading state: query loading or form/mutation loading
  const loading = expensesLoading || formLoading

  /**
   * Deep link: open add form when ?action=add
   */
  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setShowForm(true)
      setSearchParams(params => {
        params.delete('action')
        return params
      }, { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Handle search input (resets to first page)
   */
  const handleSearch = (query) => {
    setSearchQuery(query)
    setPage(1)
  }

  /**
   * Handle creating new expense (React Query mutation invalidates cache)
   */
  const handleCreate = async (expenseData) => {
    try {
      setFormLoading(true)

      // Create the expense and capture the returned object for undo (if available)
      const createdExpense = await createMutation.mutateAsync(expenseData)
      const createdExpenseId = createdExpense?.id || createdExpense?.transactionId || null

      setShowSuccessAnimation(true)
      showSuccess(t('expenses.createdSuccess'))
      announce(t('expenses.createdSuccess'))

      setShowForm(false)

      // Phase 5: Undo functionality
      // Only register an undo action if backend returned a valid ID for the created expense
      if (createdExpenseId) {
        performUndoableAction(
          // Redo/confirm action: ensure cache is in sync
          () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
          // Undo: delete the created expense and refresh
          async () => {
            try {
              await transactionService.delete(createdExpenseId)
              await queryClient.invalidateQueries({ queryKey: ['transactions'] })
              showSuccess(t('expenses.undoSuccess'))
              announce(t('expenses.undoSuccess'))
            } catch (error) {
              console.error('Error undoing expense creation:', error)
              showError(t('expenses.undoError'))
            }
          },
          5000 // 5 seconds to undo
        )
      }
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

      await updateMutation.mutateAsync({ id: editingExpense.id, updates: expenseData })

      setShowSuccessAnimation(true)
      setEditingExpense(null)
      setShowForm(false)

      showSuccess(t('expenses.updatedSuccess'))
      announce(t('expenses.updatedSuccess'))

      // Undo: restore old data then invalidate (refetch)
      performUndoableAction(
        () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        async () => {
          try {
            await transactionService.update(editingExpense.id, oldExpenseData)
            queryClient.invalidateQueries({ queryKey: ['transactions'] })
            showSuccess(t('expenses.undoSuccess'))
            announce(t('expenses.undoSuccess'))
          } catch (error) {
            console.error('Error undoing expense update:', error)
            showError(t('expenses.undoError'))
          }
        },
        5000
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

      await deleteMutation.mutateAsync(expense.id)

      closeDeleteModal()

      // Undo: restore deleted expense then invalidate (refetch)
      performUndoableAction(
        () => { },
        async () => {
          try {
            await transactionService.create(expenseToDelete)
            queryClient.invalidateQueries({ queryKey: ['transactions'] })
            showSuccess(t('expenses.undoSuccess'))
            announce(t('expenses.undoSuccess'))
          } catch (error) {
            console.error('Error undoing expense deletion:', error)
            showError(t('expenses.undoError'))
          }
        },
        5000
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
        <div className="data-cards-grid">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="expense-card card data-card skeleton-card">
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
          <DateRangePicker
            startDate={startDate || null}
            endDate={endDate || null}
            onChange={({ startDate: s, endDate: e }) => {
              setStartDate(s || '')
              setEndDate(e || '')
              setPage(1)
            }}
            placeholder={t('common.selectDateRange', 'Select date range')}
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
      {totalItems === 0 && !loading ? (
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
      ) : List ? (
        <div className="data-cards-grid" style={{ minHeight: Math.min(displayedExpenses.length * 180, 540) }}>
          <List
            height={Math.min(displayedExpenses.length * 180, 540)}
            itemCount={displayedExpenses.length}
            itemSize={180}
            width="100%"
            itemData={{
              expenses: displayedExpenses,
              formatCurrency,
              t,
              setDetailModal,
              openEditForm,
              openDeleteModal,
              setViewModal,
              isPrivate
            }}
          >
            {ExpenseRow}
          </List>
        </div>
      ) : (
        <div className="data-cards-grid" style={{ minHeight: Math.min(displayedExpenses.length * 180, 540), overflow: 'auto' }}>
          {displayedExpenses.map((expense, index) => (
            <ExpenseRow
              key={expense.id}
              index={index}
              style={{}}
              data={{
                expenses: displayedExpenses,
                formatCurrency,
                t,
                setDetailModal,
                openEditForm,
                openDeleteModal,
                setViewModal,
                isPrivate
              }}
            />
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

