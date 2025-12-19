import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiPlus, FiEdit, FiTrash2, FiFileText, FiChevronLeft, FiChevronRight, FiX, FiDownload } from 'react-icons/fi'
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
  const [viewModal, setViewModal] = useState(null) // For viewing full receipt
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [showLoadingProgress, setShowLoadingProgress] = useState(false)

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const PAGE_SIZE = 6

  // Deep linking
  const [searchParams, setSearchParams] = useSearchParams()

  /**
   * Load incomes on mount
   */
  useEffect(() => {
    loadIncomes()

    // Check query params for actions
    if (searchParams.get('action') === 'add') {
      setShowForm(true)
      // Clear param to prevent reopening on refresh
      setSearchParams(params => {
        params.delete('action')
        return params
      }, { replace: true })
    }
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

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

      const created = await transactionService.create(incomeData)

      // Local Update (Optimistic-ish, assuming user is on page 1 or just for feedback)
      // Actually, if we just reload background, it's fast enough.
      // But user specifically asked for "no reload page state".
      // Updating local list:
      setIncomes(prev => {
        const newList = [created, ...prev]
        // If we strictly enforce page size:
        return newList.slice(0, PAGE_SIZE)
        // Note: This might make the last item disappear, which is expected pagination behavior.
      })
      setTotalItems(prev => prev + 1)

      setShowSuccessAnimation(true)
      setShowForm(false)

      // Refresh list in background
      loadIncomes(true)
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

      // Local Update
      setIncomes(prev => prev.map(item => item.id === editingIncome.id ? { ...item, ...incomeData } : item))

      setShowSuccessAnimation(true)
      setEditingIncome(null)
      setShowForm(false)

      // Refresh list in background
      loadIncomes(true)
    } catch (error) {
      console.error('Error updating income:', error)
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

      // Delete attachment if exists
      if (income.attachmentPath) {
        await storageService.deleteFile(income.attachmentPath)
      }

      await transactionService.delete(income.id)

      // Local Update
      setIncomes(prev => prev.filter(i => i.id !== income.id))
      setTotalItems(prev => Math.max(0, prev - 1))

      // Refresh list in background
      loadIncomes(true)

      closeDeleteModal()

    } catch (error) {
      console.error('Error deleting income:', error)
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
                  {t(`categories.${(income.category || '').toLowerCase()}`)}
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
                {income.paidBy === 'Bank' || income.isBankSynced ? (
                  <span className="added-by">
                    {' • ' + t('dashboard.bankConnection', 'Imported from Bank')}
                  </span>
                ) : income.user_profiles && (
                  <span className="added-by">
                    {' • ' + t('dashboard.addedBy') + ' '}
                    {income.user_profiles.display_name}
                  </span>
                )}
              </div>

              <div className="income-actions">
                {income.attachmentUrl && (
                  <button
                    onClick={() => setViewModal(income)}
                    className="btn-icon"
                    aria-label={t('transaction.viewAttachment', 'View Receipt')}
                    title={t('transaction.viewAttachment', 'View Receipt')}
                  >
                    <FiFileText size={18} />
                  </button>
                )}
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
    </div>
  )
}

export default Income
