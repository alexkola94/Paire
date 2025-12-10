import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiPlus, FiEdit, FiTrash2, FiFileText, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { transactionService, storageService } from '../services/api'
import { format } from 'date-fns'
import TransactionForm from '../components/TransactionForm'
import ConfirmationModal from '../components/ConfirmationModal'
import Modal from '../components/Modal'
import LogoLoader from '../components/LogoLoader'
import SuccessAnimation from '../components/SuccessAnimation'
import LoadingProgress from '../components/LoadingProgress'
import useCurrencyFormatter from '../hooks/useCurrencyFormatter'
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
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, income: null })
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [showLoadingProgress, setShowLoadingProgress] = useState(false)

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const PAGE_SIZE = 6

  /**
   * Load incomes on mount
   */
  useEffect(() => {
    loadIncomes()
  }, [page])

  /**
   * Fetch incomes from API
   */
  const loadIncomes = async (background = false) => {
    try {
      if (!background) {
        setLoading(true)
      }
      const data = await transactionService.getAll({
        type: 'income',
        page: page,
        pageSize: PAGE_SIZE
      })

      if (data.items) {
        setIncomes(data.items)
        setTotalPages(data.totalPages)
        setTotalItems(data.totalCount)
      } else {
        setIncomes(data)
        setTotalPages(1)
        setTotalItems(data.length)
      }
    } catch (error) {
      console.error('Error loading incomes:', error)
    } finally {
      if (!background) {
        setLoading(false)
      }
    }
  }

  /**
   * Handle creating new income
   */
  const handleCreate = async (incomeData) => {
    try {
      setFormLoading(true)
      // Close form immediately and show full screen loader
      setShowForm(false)
      setShowLoadingProgress(true)

      const createdIncome = await transactionService.create(incomeData)

      // Phase 5: Success animation
      setShowLoadingProgress(false)
      setShowSuccessAnimation(true)

      // showSuccess(t('income.createdSuccess'))
      // announce(t('income.createdSuccess'))

      // Refresh list in background - PREVENTS FLASH
      await loadIncomes(true)

    } catch (error) {
      console.error('Error creating income:', error)
      setShowLoadingProgress(false)
      setShowForm(true) // Re-open form on error
      // showError(t('income.createError'))
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
      // Close form immediately and show full screen loader
      setShowForm(false)
      setShowLoadingProgress(true)

      // Save old data for undo
      const oldIncomeData = { ...editingIncome }

      await transactionService.update(editingIncome.id, incomeData)

      // Phase 5: Success animation
      setShowLoadingProgress(false)
      setShowSuccessAnimation(true)

      setEditingIncome(null)
      // Form is already closed

      // showSuccess(t('income.updatedSuccess'))
      // announce(t('income.updatedSuccess'))

      // Refresh list in background - PREVENTS FLASH
      await loadIncomes(true)

    } catch (error) {
      console.error('Error updating income:', error)
      setShowLoadingProgress(false)
      setShowForm(true) // Re-open form on error
      // showError(t('income.updateError'))
      throw error
    } finally {
      setFormLoading(false)
    }
  }

  /**
   * Open delete confirmation modal
   */
  const openDeleteModal = (income) => {
    setDeleteModal({ isOpen: true, income })
  }

  /**
   * Close delete confirmation modal
   */
  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, income: null })
  }

  /**
   * Handle deleting income
   */
  const handleDelete = async () => {
    const { income } = deleteModal
    if (!income) return

    try {
      setFormLoading(true)
      // Note: For delete, we typically keep the confirmation modal open with spinner? 
      // User asked for "Save" flow specifically. 
      // I'll leave delete as-is (spinner in button) to avoid UX jarring on small actions, or should I apply it?
      // "when we press save we should remove immediately the form" -> Implies Create/Update.

      const incomeToDelete = { ...income }

      // Delete attachment if exists
      if (income.attachment_path) {
        await storageService.deleteFile(income.attachment_path)
      }

      await transactionService.delete(income.id)

      // Refresh list in background - PREVENTS FLASH
      await loadIncomes(true)

      closeDeleteModal()

    } catch (error) {
      console.error('Error deleting income:', error)
      // showError(t('income.deleteError'))
    } finally {
      setFormLoading(false)
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
  const formatCurrency = useCurrencyFormatter()

  if (loading) {
    return (
      <div className="page-loading">
        <LogoLoader size="medium" />
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
            {t('income.totalCount', { count: totalItems })}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
          >
            <FiPlus />
            {t('income.addIncome')}
          </button>
        )}
      </div>

      {/* Income Form Modal (Portal) */}
      <Modal
        isOpen={showForm}
        onClose={closeForm}
        title={editingIncome ? t('income.editIncome') : t('income.addIncome')}
      >
        <TransactionForm
          transaction={editingIncome}
          type="income"
          onSubmit={editingIncome ? handleUpdate : handleCreate}
          onCancel={closeForm}
          loading={formLoading}
        />
      </Modal>

      {/* Success Animation */}
      <SuccessAnimation
        show={showSuccessAnimation}
        onComplete={() => setShowSuccessAnimation(false)}
        message={t('income.savedSuccess')}
      />

      {/* Phase 5: Loading Progress */}
      {showLoadingProgress && (
        <LoadingProgress
          message={formLoading ? t('common.saving') : t('common.loading')}
        />
      )}

      {/* Income List */}
      {incomes.length === 0 ? (
        <div className="card empty-state">
          <p>{t('income.noIncome')}</p>
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
          >
            <FiPlus />
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
                    {' • ' + t('dashboard.addedBy') + ' '}
                    {income.user_profiles.display_name}
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
                  {t('transaction.viewAttachment')}
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
                  onClick={() => openDeleteModal(income)}
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
        title={t('income.deleteIncome')}
        message={t('messages.confirmDelete')}
        confirmText={t('common.delete')}
        loading={formLoading}
        variant="danger"
      />
    </div>
  )
}

export default Income
