import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { FiPlus, FiEdit, FiTrash2, FiCheckCircle, FiClock, FiList, FiTrendingDown, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { loanService, loanPaymentService } from '../services/api'
import { format } from 'date-fns'
import ConfirmationModal from '../components/ConfirmationModal'
import Modal from '../components/Modal'
import LogoLoader from '../components/LogoLoader'
import CurrencyInput from '../components/CurrencyInput'
import DateInput from '../components/DateInput'
import FormSection from '../components/FormSection'
import SuccessAnimation from '../components/SuccessAnimation'
import LoadingProgress from '../components/LoadingProgress'
import useCurrencyFormatter from '../hooks/useCurrencyFormatter'
import { usePrivacyMode } from '../context/PrivacyModeContext'
import './Loans.css'

/**
 * Loans Page Component
 * Manage loans (given and received)
 */
function Loans() {
  const { t } = useTranslation()
  const { isPrivate } = usePrivacyMode() // Privacy mode for hiding amounts
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingLoan, setEditingLoan] = useState(null)
  // const [formLoading, setFormLoading] = useState(false) - unused variable removed
  const [formLoading, setFormLoading] = useState(false)
  const [viewingPayments, setViewingPayments] = useState(null)
  const [paymentHistory, setPaymentHistory] = useState([])
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [deleteLoanModal, setDeleteLoanModal] = useState({ isOpen: false, loan: null })
  const [deletePaymentModal, setDeletePaymentModal] = useState({ isOpen: false, paymentId: null })
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [showLoadingProgress, setShowLoadingProgress] = useState(false)
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    principalAmount: '',
    interestAmount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: ''
  })
  /* Pagination State */
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 6
  const [formData, setFormData] = useState({
    type: 'given', // 'given' or 'received'
    lentBy: '',
    borrowedBy: '',
    amount: '',
    remainingAmount: '',
    dueDate: '',
    description: '',
    isSettled: false
  })

  /**
   * Load loans on mount
   */
  useEffect(() => {
    loadLoans()
  }, [])

  /* Reset page when loans change/filter changes if needed, but here loans are main list */
  useEffect(() => {
    setPage(1)
  }, [loans.length])

  /**
   * Fetch loans from API
   */
  const loadLoans = async (background = false) => {
    try {
      if (!background) setLoading(true)
      const data = await loanService.getAll()
      setLoans(data)
    } catch (error) {
      console.error('Error loading loans:', error)
    } finally {
      if (!background) setLoading(false)
    }
  }

  // Calculate pagination
  const totalPages = Math.ceil(loans.length / PAGE_SIZE)
  const displayedLoans = loans.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  /**
   * Handle form input changes
   */
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => {
      const updated = { ...prev, [name]: value }

      // Auto-update remainingAmount when amount changes for new loans
      if (name === 'amount' && !editingLoan && value) {
        updated.remainingAmount = value
      }

      return updated
    })
  }

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      setFormLoading(true)

      // Prepare loan data based on type
      // For new loans, remainingAmount should equal amount (no payments yet)
      // For editing, use the form value
      const loanAmount = parseFloat(formData.amount)
      const remainingAmount = editingLoan
        ? parseFloat(formData.remainingAmount || formData.amount)
        : loanAmount // For new loans, remaining = amount

      const loanData = {
        amount: loanAmount,
        remainingAmount: remainingAmount,
        lentBy: formData.type === 'given' ? 'Me' : formData.lentBy,
        borrowedBy: formData.type === 'given' ? formData.borrowedBy : 'Me',
        description: formData.description,
        dueDate: formData.dueDate || null,
        isSettled: formData.isSettled,
        date: new Date().toISOString()
      }

      let savedLoan = null
      if (editingLoan) {
        // Include the ID in the loan data for the update request
        loanData.id = editingLoan.id
        savedLoan = await loanService.update(editingLoan.id, loanData)

        // Use savedLoan or construct it
        // Local Update
        setLoans(prev => prev.map(l => l.id === editingLoan.id ? { ...l, ...loanData } : l))
      } else {
        savedLoan = await loanService.create(loanData)
        // Local Update
        setLoans(prev => [savedLoan, ...prev])
      }

      // Success
      setShowSuccessAnimation(true)
      closeForm() // Closes form

      // Background refresh
      loadLoans(true)
    } catch (error) {
      console.error('Error saving loan:', error)
      setShowForm(true) // Re-open form on error
      // Note: we can show an error toast here if available, or just console log
    } finally {
      setFormLoading(false)
    }
  }

  /**
   * Open delete loan confirmation modal
   */
  const openDeleteLoanModal = (loan) => {
    setDeleteLoanModal({ isOpen: true, loan })
  }

  /**
   * Close delete loan confirmation modal
   */
  const closeDeleteLoanModal = () => {
    setDeleteLoanModal({ isOpen: false, loan: null })
  }

  /**
   * Handle deleting loan
   */
  const handleDelete = async () => {
    const { loan } = deleteLoanModal
    if (!loan) return

    try {
      setFormLoading(true)
      await loanService.delete(loan.id)

      // Local Update
      setLoans(prev => prev.filter(l => l.id !== loan.id))

      // Background refresh
      loadLoans(true)

      closeDeleteLoanModal()
    } catch (error) {
      console.error('Error deleting loan:', error)
    } finally {
      setFormLoading(false)
    }
  }

  /**
   * Open edit form
   */
  const openEditForm = (loan) => {
    setEditingLoan(loan)
    // Determine type based on lentBy/borrowedBy
    const isGiven = loan.lentBy === 'Me'
    // Handle both camelCase and snake_case property names
    const loanData = {
      lentBy: loan.lentBy || loan.lent_by,
      borrowedBy: loan.borrowedBy || loan.borrowed_by,
      amount: loan.amount,
      remainingAmount: loan.remainingAmount ?? loan.remaining_amount ?? loan.amount,
      dueDate: (loan.dueDate || loan.due_date) ? (loan.dueDate || loan.due_date).split('T')[0] : '',
      description: loan.description || '',
      isSettled: loan.isSettled ?? loan.is_settled ?? false
    }

    setFormData({
      type: isGiven ? 'given' : 'received',
      ...loanData
    })
    setShowForm(true)
  }

  /**
   * Close form and reset
   */
  const closeForm = () => {
    setShowForm(false)
    setEditingLoan(null)
    setFormData({
      type: 'given',
      lentBy: '',
      borrowedBy: '',
      amount: '',
      remainingAmount: '',
      dueDate: '',
      description: '',
      isSettled: false
    })
  }

  /**
   * Load payment history for a loan
   */
  const loadPaymentHistory = async (loanId) => {
    try {
      const payments = await loanPaymentService.getByLoan(loanId)
      setPaymentHistory(payments || [])
      setViewingPayments(loanId)
    } catch (error) {
      console.error('Error loading payment history:', error)
    }
  }

  /**
   * Handle payment form changes
   */
  const handlePaymentChange = (e) => {
    const { name, value } = e.target
    setPaymentFormData(prev => ({ ...prev, [name]: value }))
  }

  /**
   * Handle adding a payment
   */
  const handleAddPayment = async (e) => {
    e.preventDefault()

    try {
      const paymentData = {
        loanId: viewingPayments,
        amount: parseFloat(paymentFormData.amount),
        principalAmount: parseFloat(paymentFormData.principalAmount || paymentFormData.amount),
        interestAmount: parseFloat(paymentFormData.interestAmount || 0),
        paymentDate: paymentFormData.paymentDate,
        notes: paymentFormData.notes
      }

      await loanPaymentService.create(paymentData)
      await loadLoans()
      await loadPaymentHistory(viewingPayments)
      setShowPaymentForm(false)
      setPaymentFormData({
        amount: '',
        principalAmount: '',
        interestAmount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        notes: ''
      })
    } catch (error) {
      console.error('Error adding payment:', error)
      alert('Failed to add payment')
    }
  }

  /**
   * Open delete payment confirmation modal
   */
  const openDeletePaymentModal = (paymentId) => {
    setDeletePaymentModal({ isOpen: true, paymentId })
  }

  /**
   * Close delete payment confirmation modal
   */
  const closeDeletePaymentModal = () => {
    setDeletePaymentModal({ isOpen: false, paymentId: null })
  }

  /**
   * Handle deleting a payment
   */
  const handleDeletePayment = async () => {
    const { paymentId } = deletePaymentModal
    if (!paymentId) return

    try {
      await loanPaymentService.delete(paymentId)
      await loadLoans()
      await loadPaymentHistory(viewingPayments)
      closeDeletePaymentModal()
    } catch (error) {
      console.error('Error deleting payment:', error)
    }
  }

  /**
   * Close payment history view
   */
  const closePaymentHistory = () => {
    setViewingPayments(null)
    setPaymentHistory([])
    setShowPaymentForm(false)
  }

  /**
   * Format currency with safety check for null/undefined/NaN values
   */
  /**
   * Format currency with safety check for null/undefined/NaN values
   */
  const formatBaseCurrency = useCurrencyFormatter()

  const formatCurrency = (amount) => {
    // Handle null, undefined, NaN, or invalid values
    if (amount == null || isNaN(amount) || amount === 'NaN') {
      return formatBaseCurrency(0)
    }

    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount

    if (isNaN(numAmount)) {
      return formatBaseCurrency(0)
    }

    return formatBaseCurrency(numAmount)
  }

  if (loading) {
    return (
      <div className="page-loading">
        <LogoLoader size="medium" />
      </div>
    )
  }

  return (
    <div className="loans-page">
      {/* Page Header */}
      <div className="page-header flex-between">
        <div>
          <h1>{t('loans.title')}</h1>
          <p className="page-subtitle">
            Total: {loans.length} {loans.length === 1 ? 'loan' : 'loans'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="btn btn-primary"
            >
              <FiPlus />
              {t('loans.addLoan')}
            </button>
          )}
        </div>
      </div>

      {/* Form Modal (Portal) */}
      <Modal
        isOpen={showForm}
        onClose={closeForm}
        title={editingLoan ? t('loans.editLoan') : t('loans.addLoan')}
      >
        <form onSubmit={handleSubmit} className="loan-form">
          {/* Basic Information Section */}
          <FormSection title={t('transaction.formSections.basicInfo')}>
            {/* Loan Type */}
            <div className="form-group">
              <label>{t('loans.type')}</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="type"
                    value="given"
                    checked={formData.type === 'given'}
                    onChange={handleChange}
                  />
                  <span>{t('loans.moneyLent')}</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="type"
                    value="received"
                    checked={formData.type === 'received'}
                    onChange={handleChange}
                  />
                  <span>{t('loans.moneyBorrowed')}</span>
                </label>
              </div>
            </div>

            {/* Party Name */}
            <div className="form-group">
              <label htmlFor={formData.type === 'given' ? 'borrowedBy' : 'lentBy'}>
                {formData.type === 'given' ? t('loans.borrower') : t('loans.lender')} *
              </label>
              <input
                type="text"
                id={formData.type === 'given' ? 'borrowedBy' : 'lentBy'}
                name={formData.type === 'given' ? 'borrowedBy' : 'lentBy'}
                value={formData.type === 'given' ? formData.borrowedBy : formData.lentBy}
                onChange={handleChange}
                placeholder={t('loans.enterName')}
                required
              />
            </div>

            {/* Total Amount */}
            <CurrencyInput
              value={formData.amount}
              onChange={handleChange}
              name="amount"
              id="amount"
              label={`${t('loans.totalAmount')} *`}
              required
              disabled={formLoading}
            />

            {/* Remaining Amount */}
            <div className="form-group">
              <CurrencyInput
                value={formData.remainingAmount}
                onChange={handleChange}
                name="remainingAmount"
                id="remainingAmount"
                label={`${t('loans.remainingAmount')} *`}
                required
                disabled={formLoading || !editingLoan}
                quickAmounts={[]}
              />
              {!editingLoan && (
                <small className="form-hint">
                  For new loans, remaining amount equals total amount
                </small>
              )}
            </div>

            {/* Due Date */}
            <DateInput
              value={formData.dueDate}
              onChange={handleChange}
              name="dueDate"
              id="dueDate"
              label={t('loans.dueDate')}
              required={false}
              disabled={formLoading}
              showQuickButtons={true}
            />
          </FormSection>

          {/* Additional Details Section */}
          <FormSection title={t('transaction.formSections.additionalDetails')} collapsible={true} defaultExpanded={!!formData.description || formData.isSettled}>
            {/* Status */}
            <div className="form-group">
              <label htmlFor="isSettled">{t('loans.status')}</label>
              <select
                id="isSettled"
                name="isSettled"
                value={formData.isSettled}
                onChange={(e) => setFormData(prev => ({ ...prev, isSettled: e.target.value === 'true' }))}
                disabled={formLoading}
              >
                <option value="false">Active</option>
                <option value="true">Settled</option>
              </select>
            </div>

            {/* Description */}
            <div className="form-group">
              <label htmlFor="description">{t('transaction.description')}</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder={t('loans.additionalNotes')}
                rows="3"
                disabled={formLoading}
              />
            </div>
          </FormSection>

          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="button"
              onClick={closeForm}
              className="btn btn-secondary"
              disabled={formLoading}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={formLoading}
            >
              {formLoading ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Loading Progress Overlay */}
      <LoadingProgress show={showLoadingProgress} />

      {/* Success Animation */}
      <SuccessAnimation
        show={showSuccessAnimation}
        onComplete={() => setShowSuccessAnimation(false)}
        message={t('loans.savedSuccess')}
      />

      {/* Loans List */}
      {loans.length === 0 ? (
        <div className="card empty-state">
          <p>{t('loans.noLoans')}</p>
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
          >
            <FiPlus />
            {t('loans.addLoan')}
          </button>
        </div>
      ) : (
        <motion.div 
          className="loans-grid"
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
        >
          {displayedLoans.map((loan) => {
            // Handle both camelCase and snake_case property names
            const isGiven = (loan.lentBy || loan.lent_by) === 'Me'
            const partyName = isGiven ? (loan.borrowedBy || loan.borrowed_by) : (loan.lentBy || loan.lent_by)

            return (
              <motion.div 
                key={loan.id} 
                className={`loan-card card ${isGiven ? 'given' : 'received'}`}
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
                <div className="loan-header">
                  <div className="loan-type-badge">
                    {isGiven ? t('loans.moneyLentShort') : t('loans.moneyBorrowedShort')}
                  </div>
                  <div className={`loan-status ${(loan.isSettled ?? loan.is_settled) ? 'completed' : 'active'}`}>
                    {(loan.isSettled ?? loan.is_settled) ? (
                      <FiCheckCircle size={20} />
                    ) : (
                      <FiClock size={20} />
                    )}
                  </div>
                </div>

                <h3 className="loan-party">{partyName}</h3>

                <div className="loan-amounts">
                  <div className="amount-item">
                    <span className="amount-label">{t('loans.totalAmount')}</span>
                    <span className={`amount-value ${isPrivate ? 'masked-number' : ''}`}>
                      {formatCurrency(loan.amount ?? 0)}
                    </span>
                  </div>
                  <div className="amount-item">
                    <span className="amount-label">{t('loans.remainingAmount')}</span>
                    <span className={`amount-value remaining ${isPrivate ? 'masked-number' : ''}`}>
                      {formatCurrency(loan.remainingAmount ?? loan.remaining_amount ?? 0)}
                    </span>
                  </div>
                </div>

                {(loan.dueDate || loan.due_date) && (
                  <div className="loan-due-date">
                    <strong>{t('loans.dueDate')}:</strong>{' '}
                    {format(new Date(loan.dueDate || loan.due_date), 'MMM dd, yyyy')}
                  </div>
                )}

                {loan.description && (
                  <p className="loan-description">{loan.description}</p>
                )}

                {loan.user_profiles && (
                  <div className="loan-added-by" style={{ display: 'flex', alignItems: 'center' }}>
                    Added by
                    {(loan.user_profiles.avatar_url || loan.user_profiles.avatarUrl) && (
                      <img
                        src={loan.user_profiles.avatar_url || loan.user_profiles.avatarUrl}
                        alt={loan.user_profiles.display_name}
                        className="tag-avatar"
                        style={{ marginLeft: '6px', marginRight: '6px' }}
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    )}
                    {!((loan.user_profiles.avatar_url || loan.user_profiles.avatarUrl)) && ' '}
                    {loan.user_profiles.display_name}
                  </div>
                )}

                <div className="loan-actions">
                  <button
                    onClick={() => loadPaymentHistory(loan.id)}
                    className="btn btn-sm btn-primary"
                    title="View Payment History"
                  >
                    <FiList size={16} />
                    Payments
                  </button>
                  <button
                    onClick={() => openEditForm(loan)}
                    className="btn-icon"
                    aria-label={t('common.edit')}
                  >
                    <FiEdit size={18} />
                  </button>
                  <button
                    onClick={() => openDeleteLoanModal(loan)}
                    className="btn-icon delete"
                    aria-label={t('common.delete')}
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

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

      {/* Payment History Modal (Portal) */}
      <Modal
        isOpen={!!viewingPayments}
        onClose={closePaymentHistory}
        title="Payment History"
      >

        {/* Loan Summary */}
        {loans.find(l => l.id === viewingPayments) && (
          <div className="payment-summary">
            <div className="summary-item">
              <span className="label">Total Loan:</span>
              <span className="value">{formatCurrency(loans.find(l => l.id === viewingPayments).amount)}</span>
            </div>
            <div className="summary-item">
              <span className="label">Total Paid:</span>
              <span className="value paid">{formatCurrency(loans.find(l => l.id === viewingPayments).totalPaid || 0)}</span>
            </div>
            <div className="summary-item">
              <span className="label">Remaining:</span>
              <span className="value remaining">{formatCurrency(loans.find(l => l.id === viewingPayments)?.remainingAmount ?? loans.find(l => l.id === viewingPayments)?.remaining_amount ?? 0)}</span>
            </div>
          </div>
        )}

        {/* Add Payment Button - Only show for non-settled loans */}
        {!showPaymentForm && !(loans.find(l => l.id === viewingPayments)?.isSettled ?? loans.find(l => l.id === viewingPayments)?.is_settled) && (
          <button
            className="btn btn-primary btn-block"
            onClick={() => setShowPaymentForm(true)}
          >
            <FiPlus /> Add Payment
          </button>
        )}

        {/* Payment Form */}
        {showPaymentForm && (
          <div className="payment-form-card">
            <h3>Add New Payment</h3>
            <form onSubmit={handleAddPayment}>
              <div className="form-group">
                <label>Payment Amount *</label>
                <input
                  type="number"
                  name="amount"
                  value={paymentFormData.amount}
                  onChange={handlePaymentChange}
                  required
                  step="0.01"
                  min="0"
                  max="1000000"
                  placeholder="0.00"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Principal Amount</label>
                  <input
                    type="number"
                    name="principalAmount"
                    value={paymentFormData.principalAmount}
                    onChange={handlePaymentChange}
                    step="0.01"
                    min="0"
                    max="1000000"
                    placeholder={t('common.optional')}
                  />
                </div>

                <div className="form-group">
                  <label>Interest Amount</label>
                  <input
                    type="number"
                    name="interestAmount"
                    value={paymentFormData.interestAmount}
                    onChange={handlePaymentChange}
                    step="0.01"
                    min="0"
                    max="1000000"
                    placeholder={t('common.optional')}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Payment Date *</label>
                <input
                  type="date"
                  name="paymentDate"
                  value={paymentFormData.paymentDate}
                  onChange={handlePaymentChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={paymentFormData.notes}
                  onChange={handlePaymentChange}
                  rows="2"
                  placeholder={t('loans.paymentNotesPlaceholder')}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowPaymentForm(false)
                    setPaymentFormData({
                      amount: '',
                      principalAmount: '',
                      interestAmount: '',
                      paymentDate: new Date().toISOString().split('T')[0],
                      notes: ''
                    })
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  <FiPlus /> Add Payment
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Payment History List */}
        <div className="payment-history">
          <h3>
            <FiList /> Payment History ({paymentHistory.length})
          </h3>

          {paymentHistory.length === 0 ? (
            <div className="empty-payments">
              <FiTrendingDown size={48} />
              <p>No payments recorded yet</p>
              <p className="hint">Add your first payment to track progress</p>
            </div>
          ) : (
            <div className="payments-list">
              {paymentHistory.map(payment => (
                <div key={payment.id} className="payment-item">
                  <div className="payment-date">
                    {format(new Date(payment.paymentDate), 'MMM dd, yyyy')}
                  </div>
                  <div className="payment-details">
                    <div className="payment-amount">
                      {formatCurrency(payment.amount)}
                    </div>
                    {(payment.principalAmount > 0 || payment.interestAmount > 0) && (
                      <div className="payment-breakdown">
                        {payment.principalAmount > 0 && (
                          <span className="principal">
                            Principal: {formatCurrency(payment.principalAmount)}
                          </span>
                        )}
                        {payment.interestAmount > 0 && (
                          <span className="interest">
                            Interest: {formatCurrency(payment.interestAmount)}
                          </span>
                        )}
                      </div>
                    )}
                    {payment.notes && (
                      <div className="payment-notes">{payment.notes}</div>
                    )}
                  </div>
                  <button
                    className="btn-icon delete"
                    onClick={() => openDeletePaymentModal(payment.id)}
                    aria-label="Delete Payment"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Loan Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteLoanModal.isOpen}
        onClose={closeDeleteLoanModal}
        onConfirm={handleDelete}
        title={t('loans.deleteLoan')}
        message={t('messages.confirmDelete')}
        confirmText={t('common.delete')}
        variant="danger"
      />

      {/* Delete Payment Confirmation Modal */}
      <ConfirmationModal
        isOpen={deletePaymentModal.isOpen}
        onClose={closeDeletePaymentModal}
        onConfirm={handleDeletePayment}
        title={t('loans.deletePayment')}
        message={t('loans.confirmDeletePayment')}
        confirmText={t('common.delete')}
        variant="danger"
      />
    </div >
  )
}

export default Loans

