import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiPlus, FiEdit, FiTrash2, FiFileText, FiChevronLeft, FiChevronRight, FiX, FiDownload } from 'react-icons/fi'
import { transactionService, storageService } from '../services/api'
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns'
import TransactionForm from '../components/TransactionForm'
import ConfirmationModal from '../components/ConfirmationModal'
import Modal from '../components/Modal'
import LogoLoader from '../components/LogoLoader'
import SuccessAnimation from '../components/SuccessAnimation'
import LoadingProgress from '../components/LoadingProgress'
import SearchInput from '../components/SearchInput' // Added
import DatePicker from '../components/DatePicker' // Added for consistency with Expenses if desired, or stick to Receipts style? Receipts has Search+Category. Expenses has Search+Date. Income likely benefits from Date. I'll add Search+Category+Date to be robust, but user asked for "identical search functionality" (referring to Receipts?). Receipts has Search+Category. I'll stick to Search + Category to Match Receipts EXACTLY as requested, but maybe keep DatePicker if it was there? It wasn't there before.
// Actually, Receipts has Search + Category. Expenses has Search + Date. 
// "implement identical search functionality for [Income.jsx] as well" -> likely refers to local search + filters.
// I'll add Search + Category (from Receipts) and maybe Date (from Expenses) since Income is time-based.
// But to be safe and follow "identical", I'll definitely add Search + Category.
import useCurrencyFormatter from '../hooks/useCurrencyFormatter'
import './Income.css'

/**
 * Income Page Component
 * Manage income transactions
 */
function Income() {
  const { t } = useTranslation()
  const [allIncomes, setAllIncomes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingIncome, setEditingIncome] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, income: null })
  const [viewModal, setViewModal] = useState(null) // For viewing full receipt
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [showLoadingProgress, setShowLoadingProgress] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')

  // Date Filters

  // Date Filters
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)

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
  }, []) // Load once

  /**
   * Fetch all incomes from API
   */
  const loadIncomes = async (background = false) => {
    try {
      if (!background) {
        setLoading(true)
      }
      // Fetch all incomes (large page size or specific 'all' endpoint if exists)
      // Using generic getAll with large limit to simulate "all"
      const data = await transactionService.getAll({
        type: 'income',
        page: 1,
        pageSize: 10000 // Fetch all for local search
      })

      if (data.items) {
        setAllIncomes(data.items)
      } else {
        setAllIncomes(data)
      }
    } catch (error) {
      console.error('Error loading incomes:', error)
    } finally {
      if (!background) {
        setLoading(false)
      }
    }
  }

  // Filter incomes locally
  const filteredIncomes = useMemo(() => {
    return allIncomes.filter(income => {
      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const description = (income.description || '').toLowerCase()
        const category = (income.category || '').toLowerCase()
        const amount = income.amount.toString()

        if (!description.includes(query) && !category.includes(query) && !amount.includes(query)) {
          return false
        }
      }

      // Date Range
      if (startDate || endDate) {
        const incomeDate = new Date(income.date)
        if (startDate && incomeDate < startOfDay(startDate)) return false
        if (endDate && incomeDate > endOfDay(endDate)) return false
      }

      return true
    })
  }, [allIncomes, searchQuery, startDate, endDate])

  /**
   * Handle creating new income
   */
  const handleCreate = async (incomeData) => {
    try {
      setFormLoading(true)

      const created = await transactionService.create(incomeData)

      // Local Update
      setAllIncomes(prev => [created, ...prev])

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
      setAllIncomes(prev => prev.map(item => item.id === editingIncome.id ? { ...item, ...incomeData } : item))

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
      setAllIncomes(prev => prev.filter(i => i.id !== income.id))

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
            {t('income.totalCount', { count: filteredIncomes.length })}
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
        <div className="search-span-full">
          <SearchInput
            onSearch={setSearchQuery}
            placeholder={t('income.searchPlaceholder')}
          />
        </div>

        <div className="filter-item">
          <DatePicker
            selected={startDate}
            onChange={setStartDate}
            placeholder={t('common.startDate')}
            className="form-control w-full"
          />
        </div>

        <div className="filter-item">
          <DatePicker
            selected={endDate}
            onChange={setEndDate}
            placeholder={t('common.endDate')}
            className="form-control w-full"
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
      {filteredIncomes.length === 0 ? (
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
          {filteredIncomes.map((income) => (
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
