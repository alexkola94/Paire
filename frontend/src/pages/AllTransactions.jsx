import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// react-window: import via shim (Vite alias uses ESM build)
import { FixedSizeList as List } from '../utils/reactWindow'
import { motion } from 'framer-motion'
import {
  FiTrendingUp,
  FiTrendingDown,
  FiArrowLeft,
  FiChevronLeft,
  FiChevronRight,
  FiEdit,
  FiTrash2,
  FiList,
  FiGitBranch
} from 'react-icons/fi'
import { transactionService } from '../services/api'
import { format } from 'date-fns'
import LogoLoader from '../components/LogoLoader'
import useSwipeGesture from '../hooks/useSwipeGesture'
import TransactionForm from '../components/TransactionForm'
import ConfirmationModal from '../components/ConfirmationModal'
import Modal from '../components/Modal'
import SuccessAnimation from '../components/SuccessAnimation'
import SearchInput from '../components/SearchInput'
import DateRangePicker from '../components/DateRangePicker'
import TransactionDetailModal from '../components/TransactionDetailModal'
import TransactionTimeline from '../components/TransactionTimeline'
import { usePrivacyMode } from '../context/PrivacyModeContext'
import './AllTransactions.css'

/**
 * All Transactions Page Component
 * Displays all transactions (income and expenses) merged together
 * Optimized with React.memo and useMemo for better performance
 */
function AllTransactions() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { isPrivate } = usePrivacyMode()

  // Data State (server-side pagination: only current page items)
  const [displayedTransactions, setDisplayedTransactions] = useState([])

  // View Mode State
  const [viewMode, setViewMode] = useState('list') // 'list' or 'timeline'

  // Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Edit/Delete State
  const [showForm, setShowForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, transactionId: null })
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [detailModal, setDetailModal] = useState(null) // For viewing transaction details

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const PAGE_SIZE = 6

  // React Query: transactions with server-side pagination and filters
  const { data, isLoading: loading } = useQuery({
    queryKey: ['transactions', 'all', page, searchQuery, startDate, endDate],
    queryFn: async () => {
      const res = await transactionService.getAll({
        page,
        pageSize: PAGE_SIZE,
        search: searchQuery.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      })
      return res
    }
  })

  // Derive displayed list and pagination from query result
  useEffect(() => {
    if (!data) return
    const items = Array.isArray(data) ? data : (data.items || [])
    const total = Array.isArray(data) ? data.length : (data.totalCount ?? items.length)
    const pages = Array.isArray(data) ? 1 : (data.totalPages ?? 1)
    setDisplayedTransactions(items)
    setTotalItems(total)
    setTotalPages(pages)
  }, [data])

  // Mutations: invalidate transactions cache on update/delete
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => transactionService.update(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] })
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => transactionService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] })
  })

  /**
   * Handle search input (resets to first page)
   */
  const handleSearch = (query) => {
    setSearchQuery(query)
    setPage(1)
  }

  /**
   * Handle updating transaction (React Query mutation invalidates cache)
   */
  const handleUpdate = async (transactionData) => {
    try {
      setFormLoading(true)
      setShowForm(false)

      await updateMutation.mutateAsync({ id: editingTransaction.id, updates: transactionData })

      setShowSuccessAnimation(true)
      setEditingTransaction(null)
    } catch (error) {
      console.error('Error updating transaction:', error)
      alert(t('common.error'))
    } finally {
      setFormLoading(false)
    }
  }

  /**
   * Handle deleting transaction (React Query mutation invalidates cache)
   */
  const handleDelete = async () => {
    const { transactionId } = deleteModal
    if (!transactionId) return

    try {
      setFormLoading(true)

      await deleteMutation.mutateAsync(transactionId)
      setDeleteModal({ isOpen: false, transactionId: null })
    } catch (error) {
      console.error('Error deleting transaction:', error)
      alert(t('common.error'))
    } finally {
      setFormLoading(false)
    }
  }

  const openEditForm = (transaction) => {
    setEditingTransaction(transaction)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingTransaction(null)
  }

  const openDeleteModal = (transactionId) => {
    setDeleteModal({ isOpen: true, transactionId })
  }

  /**
   * Format currency for display
   * Memoized to avoid creating new formatter on every render
   */
  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }, [])

  if (loading) {
    return (
      <div className="page-loading">
        <LogoLoader size="medium" />
      </div>
    )
  }

  return (
    <div className="all-transactions-page">
      {/* Breadcrumbs */}
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <ol className="breadcrumb-list">
          <li className="breadcrumb-item">
            <Link to="/dashboard" className="breadcrumb-link">
              {t('navigation.dashboard')}
            </Link>
          </li>
          <li className="breadcrumb-separator" aria-hidden="true">
            <FiChevronRight size={16} />
          </li>
          <li className="breadcrumb-item breadcrumb-current" aria-current="page">
            {t('allTransactions.title')}
          </li>
        </ol>
      </nav>

      {/* Page Header with Back Button */}
      <div className="page-header">
        <div className="page-header-top">
          <button
            onClick={() => navigate('/dashboard')}
            className="back-button"
            aria-label={t('common.back')}
            title={t('common.back')}
          >
            <FiArrowLeft size={20} />
            <span>{t('common.back')}</span>
          </button>
          <div className="header-actions">
            <div className="view-toggle" role="tablist" aria-label="View mode">
              <button
                className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                aria-selected={viewMode === 'list'}
                role="tab"
                title={t('common.listView', 'List View')}
              >
                <FiList size={18} />
              </button>
              <button
                className={`view-toggle-btn ${viewMode === 'timeline' ? 'active' : ''}`}
                onClick={() => setViewMode('timeline')}
                aria-selected={viewMode === 'timeline'}
                role="tab"
                title={t('timeline.title', 'Timeline View')}
              >
                <FiGitBranch size={18} />
              </button>
            </div>
          </div>
        </div>
        <div className="page-header-content">
          <h1>{t('allTransactions.title')}</h1>
          <p className="page-subtitle">
            {t('allTransactions.totalCount', { count: totalItems })}
          </p>
        </div>
      </div>

      {/* Search and Filter Bar – mobile-first: stacked on small, row on tablet+ */}
      <div className="search-filter-container">
        <div className="search-wrapper">
          <SearchInput
            onSearch={handleSearch}
            placeholder={t('common.search', 'Search...')}
          />
        </div>

        <div className="date-filters">
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

      {/* Transactions Display */}
      {totalItems === 0 && !loading ? (
        <div className="card empty-state">
          <p>{t('allTransactions.noTransactions')}</p>
        </div>
      ) : viewMode === 'timeline' ? (
        /* Timeline View (current page only with server-side pagination) */
        <div className="card timeline-view-container">
          <TransactionTimeline
            transactions={displayedTransactions}
            maxHeight="70vh"
            showRelativeDates={true}
          />
        </div>
      ) : displayedTransactions.length === 0 && !loading ? (
        <div className="card empty-state">
          <p>{t('common.noResults', 'No transactions found matching your search.')}</p>
        </div>
      ) : (
        /* List View */
        <motion.div 
          className="card transactions-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="transactions-list" style={{ minHeight: Math.min(displayedTransactions.length * 88, 480) }}>
            {List ? (
              <List
                height={Math.min(displayedTransactions.length * 88, 480)}
                itemCount={displayedTransactions.length}
                itemSize={88}
                width="100%"
                itemData={{
                  transactions: displayedTransactions,
                  formatCurrency,
                  t,
                  openEditForm,
                  openDeleteModal,
                  setDetailModal,
                  isPrivate
                }}
              >
                {TransactionRow}
              </List>
            ) : (
              <div style={{ overflow: 'auto' }}>
                {displayedTransactions.map((_, index) => (
                  <TransactionRow
                    key={displayedTransactions[index].id}
                    index={index}
                    style={{}}
                    data={{
                      transactions: displayedTransactions,
                      formatCurrency,
                      t,
                      openEditForm,
                      openDeleteModal,
                      setDetailModal,
                      isPrivate
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination-controls" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-secondary pagination-btn"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
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
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {t('common.next')}
                <FiChevronRight />
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Edit Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={closeForm}
        title={t('common.edit')}
      >
        <TransactionForm
          transaction={editingTransaction}
          type={editingTransaction?.type || 'expense'}
          onSubmit={handleUpdate}
          onCancel={closeForm}
          loading={formLoading}
        />
      </Modal>

      {/* Delete Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, transactionId: null })}
        onConfirm={handleDelete}
        title={t('common.delete')}
        message={t('messages.confirmDelete')}
        confirmText={t('common.delete')}
        variant="danger"
        loading={formLoading}
      />

      <SuccessAnimation
        show={showSuccessAnimation}
        onComplete={() => setShowSuccessAnimation(false)}
        message={t('common.success')}
      />

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        transaction={detailModal}
        isOpen={!!detailModal}
        onClose={() => setDetailModal(null)}
      />
    </div>
  )
}


/**
 * Row renderer for react-window virtualized list
 */
const TransactionRow = memo(({ index, style, data }) => {
  const { transactions, formatCurrency, t, openEditForm, openDeleteModal, setDetailModal, isPrivate } = data
  const transaction = transactions[index]
  if (!transaction) return null
  return (
    <div style={style}>
      <TransactionItem
        transaction={transaction}
        formatCurrency={formatCurrency}
        t={t}
        onEdit={() => openEditForm(transaction)}
        onDelete={() => openDeleteModal(transaction.id)}
        onClick={() => setDetailModal(transaction)}
        isPrivate={isPrivate}
      />
    </div>
  )
})
TransactionRow.displayName = 'TransactionRow'

/**
 * Transaction Item Component
 */
const TransactionItem = ({ transaction, formatCurrency, t, onEdit, onDelete, onClick, isPrivate }) => {
  const formattedDate = useMemo(() => {
    return format(new Date(transaction.date), 'MMM dd, yyyy')
  }, [transaction.date])

  /* Swipe Integration */
  const { handleTouchStart, handleTouchMove, handleTouchEnd, getSwipeProps } = useSwipeGesture({
    onSwipeLeft: onDelete,
    onSwipeRight: onEdit,
    threshold: 80
  })

  const swipeProps = getSwipeProps(transaction.id)
  const offset = swipeProps.offset || 0
  const isSwipeRight = offset > 0
  const isSwipeLeft = offset < 0
  const swipeProgress = Math.min(100, (Math.abs(offset) / 80) * 100)

  return (
    <div
      className={`transaction-item ${transaction.type} ${swipeProps.className || ''} clickable`}
      style={{ ...swipeProps.style, position: 'relative' }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      onTouchStart={(e) => handleTouchStart(transaction.id, e)}
      onTouchMove={(e) => handleTouchMove(transaction.id, e)}
      onTouchEnd={(e) => handleTouchEnd(transaction.id, e)}
    >
      {/* Swipe Indicators */}
      {isSwipeRight && (
        <div
          className="swipe-indicator swipe-check-indicator"
          style={{
            opacity: Math.min(1, swipeProgress / 50),
            transform: `translate(${-offset + 16}px, -50%) scale(${Math.min(1, swipeProgress / 60)})`,
            left: 0,
            background: 'var(--primary)' // Edit icon color
          }}
        >
          <FiEdit size={24} />
        </div>
      )}
      {isSwipeLeft && (
        <div
          className="swipe-indicator swipe-delete-indicator"
          style={{
            opacity: Math.min(1, swipeProgress / 50),
            transform: `translate(${-offset - 16}px, -50%) scale(${Math.min(1, swipeProgress / 60)})`,
            right: 0
          }}
        >
          <FiTrash2 size={24} />
        </div>
      )}

      <div className="transaction-icon">
        {transaction.type === 'income' ? (
          <FiTrendingUp size={20} />
        ) : (
          <FiTrendingDown size={20} />
        )}
      </div>
      <div className="transaction-details">
        <h4>{transaction.description || transaction.category}</h4>
        <p className="transaction-date">
          {formattedDate}
          {transaction.user_profiles && (
            <span className="added-by" style={{ display: 'inline-flex', alignItems: 'center' }}>
              {' • '}
              {(transaction.user_profiles.avatar_url || transaction.user_profiles.avatarUrl) && (
                <img
                  src={transaction.user_profiles.avatar_url || transaction.user_profiles.avatarUrl}
                  alt={transaction.user_profiles.display_name}
                  className="tag-avatar"
                  onError={(e) => e.target.style.display = 'none'}
                />
              )}
              {t('dashboard.addedBy') + ' '}
              {transaction.user_profiles.display_name}
            </span>
          )}
        </p>
      </div>
      <div className={`transaction-amount ${transaction.type} ${isPrivate ? 'masked-number' : ''}`}>
        {transaction.type === 'income' ? '+' : '-'}
        {formatCurrency(Math.abs(transaction.amount))}
      </div>
    </div>
  )
}

export default AllTransactions

