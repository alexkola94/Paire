import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiPlus, FiEdit, FiTrash2, FiFileText, FiX } from 'react-icons/fi'
import { transactionService, storageService } from '../services/api'
import { format } from 'date-fns'
import TransactionForm from '../components/TransactionForm'
import ConfirmationModal from '../components/ConfirmationModal'
import Modal from '../components/Modal'
import LogoLoader from '../components/LogoLoader'
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

  /**
   * Load incomes on mount
   */
  useEffect(() => {
    loadIncomes()
  }, [])

  /**
   * Fetch incomes from API
   */
  const loadIncomes = async () => {
    try {
      setLoading(true)
      const data = await transactionService.getAll({ type: 'income' })
      setIncomes(data)
    } catch (error) {
      console.error('Error loading incomes:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle creating new income
   */
  const handleCreate = async (incomeData) => {
    try {
      setFormLoading(true)
      await transactionService.create(incomeData)
      await loadIncomes()
      setShowForm(false)
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
      await loadIncomes()
      setEditingIncome(null)
      setShowForm(false)
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
      if (income.attachment_path) {
        await storageService.deleteFile(income.attachment_path)
      }

      await transactionService.delete(income.id)
      await loadIncomes()
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
    <div className="income-page">
      {/* Page Header */}
      <div className="page-header flex-between">
        <div>
          <h1>{t('income.title')}</h1>
          <p className="page-subtitle">
            {t('income.totalCount', { count: incomes.length })}
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

