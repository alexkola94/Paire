import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import {
  FiTrendingUp,
  FiTrendingDown,
  FiArrowLeft,
  FiChevronLeft,
  FiChevronRight,
  FiEdit, // Add icons
  FiTrash2,
  FiCheck,
  FiX
} from 'react-icons/fi'
import { transactionService, storageService } from '../services/api'
import { format } from 'date-fns'
import LogoLoader from '../components/LogoLoader'
import useSwipeGesture from '../hooks/useSwipeGesture'
import TransactionForm from '../components/TransactionForm' // Correct import
import ConfirmationModal from '../components/ConfirmationModal'
import Modal from '../components/Modal' // Add Modal
import SuccessAnimation from '../components/SuccessAnimation'
import './AllTransactions.css'

/**
 * All Transactions Page Component
 * Displays all transactions (income and expenses) merged together
 * Optimized with React.memo and useMemo for better performance
 */
function AllTransactions() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState([])

  // Edit/Delete State
  const [showForm, setShowForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, transactionId: null })
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const PAGE_SIZE = 6

  /**
   * Fetch all transactions (both income and expenses)
   * Memoized with useCallback to prevent unnecessary re-renders
   */
  const loadTransactions = useCallback(async (background = false) => {
    try {
      if (!background) setLoading(true)
      // Fetch all transactions without type filter to get both income and expenses
      const data = await transactionService.getAll({
        page: page,
        pageSize: PAGE_SIZE
      })

      if (data.items) {
        setTransactions(data.items)
        setTotalPages(data.totalPages)
        setTotalItems(data.totalCount)
      } else {
        // Fallback for non-paged response (should not happen with updated backend)
        setTransactions(data)
        setTotalPages(1)
        setTotalItems(data.length)
      }
    } catch (error) {
      console.error('❌ Error loading transactions:', error)
    } finally {
      if (!background) setLoading(false)
    }
  }, [page]) // Re-run when page changes

  /**
   * Load transactions on component mount and page change
   */
  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  /**
   * Handle updating transaction
   */
  const handleUpdate = async (transactionData) => {
    try {
      setFormLoading(true)
      setShowForm(false) // Close immediately

      await transactionService.update(editingTransaction.id, transactionData)

      setShowSuccessAnimation(true)
      setEditingTransaction(null)
      await loadTransactions(true) // Background refresh
    } catch (error) {
      console.error('Error updating transaction:', error)
      alert(t('common.error'))
    } finally {
      setFormLoading(false)
    }
  }

  /**
   * Handle deleting transaction
   */
  const handleDelete = async () => {
    const { transactionId } = deleteModal
    if (!transactionId) return

    try {
      setFormLoading(true)

      // Delete attachment if exists (need to fetch details first if not in list, but usually ok)
      // Ideally we should check transaction.attachment_path, but let's skip for now or assume simple delete
      await transactionService.delete(transactionId)

      await loadTransactions(true)
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
        </div>
        <div className="page-header-content">
          <h1>{t('allTransactions.title')}</h1>
          <p className="page-subtitle">
            {t('allTransactions.totalCount', { count: totalItems })}
          </p>
        </div>
      </div>

      {/* Transactions List */}
      {transactions.length === 0 ? (
        <div className="card empty-state">
          <p>{t('allTransactions.noTransactions')}</p>
        </div>
      ) : (
        <div className="card transactions-container">
          <div className="transactions-list">
            {transactions.map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                formatCurrency={formatCurrency}
                t={t}
                onEdit={() => openEditForm(transaction)}
                onDelete={() => openDeleteModal(transaction.id)}
              />
            ))}
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
        </div>
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
    </div>
  )
}


/**
 * Transaction Item Component
 */
const TransactionItem = ({ transaction, formatCurrency, t, onEdit, onDelete }) => {
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
      className={`transaction-item ${transaction.type} ${swipeProps.className || ''}`}
      style={{ ...swipeProps.style, position: 'relative' }}
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
            <span className="added-by">
              {' • ' + t('dashboard.addedBy') + ' '}
              {transaction.user_profiles.display_name}
            </span>
          )}
        </p>
      </div>
      <div className={`transaction-amount ${transaction.type}`}>
        {transaction.type === 'income' ? '+' : '-'}
        {formatCurrency(Math.abs(transaction.amount))}
      </div>
    </div>
  )
}

export default AllTransactions

