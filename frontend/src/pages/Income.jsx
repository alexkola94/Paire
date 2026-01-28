import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { FiPlus, FiEdit, FiTrash2, FiFileText, FiChevronLeft, FiChevronRight, FiX, FiDownload } from 'react-icons/fi'
import { transactionService, storageService } from '../services/api'
import { format } from 'date-fns'
import TransactionForm from '../components/TransactionForm'
import ConfirmationModal from '../components/ConfirmationModal'
import Modal from '../components/Modal'
import LogoLoader from '../components/LogoLoader'
import SuccessAnimation from '../components/SuccessAnimation'
import LoadingProgress from '../components/LoadingProgress'
import SearchInput from '../components/SearchInput'
import DateRangePicker from '../components/DateRangePicker'
import useCurrencyFormatter from '../hooks/useCurrencyFormatter'
import TransactionDetailModal from '../components/TransactionDetailModal'
import { usePrivacyMode } from '../context/PrivacyModeContext'
import useToast from '../hooks/useToast'
import AddToCalculatorButton from '../components/AddToCalculatorButton'
import './Income.css'
import '../styles/AddToCalculator.css'

/**
 * Income Page Component
 * Manage income transactions
 */
function Income() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { error: showError } = useToast()
  const { isPrivate } = usePrivacyMode() // Privacy mode for hiding amounts
  const [displayedIncomes, setDisplayedIncomes] = useState([])

  const [showForm, setShowForm] = useState(false)
  const [editingIncome, setEditingIncome] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, income: null })
  const [viewModal, setViewModal] = useState(null)
  const [detailModal, setDetailModal] = useState(null)
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [showLoadingProgress, setShowLoadingProgress] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const PAGE_SIZE = 6

  const [searchParams, setSearchParams] = useSearchParams()

  // React Query: incomes with server-side pagination and filters
  const { data: incomesData, isLoading: incomesLoading } = useQuery({
    queryKey: ['transactions', 'income', page, searchQuery, startDate, endDate],
    queryFn: () => transactionService.getAll({
      type: 'income',
      page,
      pageSize: PAGE_SIZE,
      search: searchQuery.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    })
  })

  useEffect(() => {
    if (incomesData === undefined) return
    const items = Array.isArray(incomesData) ? incomesData : (incomesData.items || [])
    const total = Array.isArray(incomesData) ? incomesData.length : (incomesData.totalCount ?? items.length)
    const pages = Array.isArray(incomesData) ? 1 : (incomesData.totalPages ?? 1)
    setDisplayedIncomes(items)
    setTotalItems(total)
    setTotalPages(pages)
  }, [incomesData])

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

  const loading = incomesLoading || formLoading

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setShowForm(true)
      setSearchParams(params => {
        params.delete('action')
        return params
      }, { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (query) => {
    setSearchQuery(query)
    setPage(1)
  }

  const handleCreate = async (incomeData) => {
    try {
      setFormLoading(true)
      await createMutation.mutateAsync(incomeData)
      setShowSuccessAnimation(true)
      setShowForm(false)
    } catch (error) {
      console.error('Error creating income:', error)
      showError(t('income.createError', 'Failed to create income'))
      throw error
    } finally {
      setFormLoading(false)
    }
  }

  const handleUpdate = async (incomeData) => {
    try {
      setFormLoading(true)
      await updateMutation.mutateAsync({ id: editingIncome.id, updates: incomeData })
      setShowSuccessAnimation(true)
      setEditingIncome(null)
      setShowForm(false)
    } catch (error) {
      console.error('Error updating income:', error)
      showError(t('income.updateError', 'Failed to update income'))
      throw error
    } finally {
      setFormLoading(false)
    }
  }

  const openDeleteModal = (income) => {
    setDeleteModal({ isOpen: true, income })
  }

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, income: null })
  }

  const handleDelete = async () => {
    const { income } = deleteModal
    if (!income) return

    try {
      setFormLoading(true)
      if (income.attachmentPath) {
        await storageService.deleteFile(income.attachmentPath)
      }
      await deleteMutation.mutateAsync(income.id)
      closeDeleteModal()
    } catch (error) {
      console.error('Error deleting income:', error)
      showError(t('income.deleteError', 'Failed to delete income'))
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

      {/* Search and Filters - Redesigned Grid Layout */}
      <div className="income-filters-grid">
        <div className="search-span-full" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <SearchInput
            onSearch={handleSearch}
            placeholder={t('income.searchPlaceholder')}
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
      {totalItems === 0 && !loading ? (
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
      ) : displayedIncomes.length === 0 && !loading ? (
        <div className="card empty-state">
          <p>{t('common.noResults', 'No income found matching your search.')}</p>
        </div>
      ) : (
        <motion.div 
          className="data-cards-grid"
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.08
              }
            }
          }}
        >
          {displayedIncomes.map((income) => (
            <motion.div 
              key={income.id} 
              className="income-card card clickable data-card"
              onClick={() => setDetailModal(income)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setDetailModal(income)}
              variants={{
                hidden: { opacity: 0, y: 20, scale: 0.95 },
                visible: { 
                  opacity: 1, 
                  y: 0, 
                  scale: 1,
                  transition: {
                    duration: 0.5,
                    ease: [0.4, 0, 0.2, 1]
                  }
                }
              }}
            >
              <div className="income-header data-card-header">
                <div className="income-category">
                  {t(`categories.${(income.category || '').toLowerCase()}`)}
                </div>
                <div className="income-amount-row add-to-calc-row">
                  <span className={`income-amount ${isPrivate ? 'masked-number' : ''}`}>
                    +{formatCurrency(income.amount)}
                  </span>
                  <AddToCalculatorButton value={income.amount} isPrivate={isPrivate} size={16} />
                </div>
              </div>

              <div className="data-card-body">
                {income.description ? (
                  <p className="income-description">
                    {income.description}
                  </p>
                ) : null}
              </div>

              <div className="income-date data-card-meta">
                {format(new Date(income.date), 'MMMM dd, yyyy')}
                {income.paidBy === 'Bank' || income.isBankSynced ? (
                  <span className="added-by">
                    {' • ' + t('dashboard.bankConnection', 'Imported from Bank')}
                  </span>
                ) : income.user_profiles && (
                  <span className="added-by" style={{ display: 'inline-flex', alignItems: 'center' }}>
                    {' • '}
                    {(income.user_profiles.avatar_url || income.user_profiles.avatarUrl) && (
                      <img
                        src={income.user_profiles.avatar_url || income.user_profiles.avatarUrl}
                        alt={income.user_profiles.display_name}
                        className="tag-avatar"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    )}
                    {t('dashboard.addedBy') + ' '}
                    {income.user_profiles.display_name}
                  </span>
                )}
              </div>

              <div className="income-actions data-card-actions" onClick={(e) => e.stopPropagation()}>
                {income.attachmentUrl && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setViewModal(income); }}
                    className="btn-icon"
                    aria-label={t('transaction.viewAttachment', 'View Receipt')}
                    title={t('transaction.viewAttachment', 'View Receipt')}
                  >
                    <FiFileText size={18} />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); openEditForm(income); }}
                  className="btn-icon"
                  aria-label="Edit"
                >
                  <FiEdit size={18} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); openDeleteModal(income); }}
                  className="btn-icon delete"
                  aria-label="Delete"
                >
                  <FiTrash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
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

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        transaction={detailModal}
        isOpen={!!detailModal}
        onClose={() => setDetailModal(null)}
      />
    </div>
  )
}

export default Income
