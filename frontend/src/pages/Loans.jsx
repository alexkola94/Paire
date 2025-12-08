import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiPlus, FiEdit, FiTrash2, FiCheckCircle, FiClock, FiList, FiTrendingDown, FiX } from 'react-icons/fi'
import { loanService, loanPaymentService } from '../services/api'
import { format } from 'date-fns'
import ConfirmationModal from '../components/ConfirmationModal'
import LogoLoader from '../components/LogoLoader'
import CurrencyInput from '../components/CurrencyInput'
import DateInput from '../components/DateInput'
import FormSection from '../components/FormSection'
import './Loans.css'

/**
 * Loans Page Component
 * Manage loans (given and received)
 */
function Loans() {
  const { t } = useTranslation()
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingLoan, setEditingLoan] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const [viewingPayments, setViewingPayments] = useState(null)
  const [paymentHistory, setPaymentHistory] = useState([])
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [deleteLoanModal, setDeleteLoanModal] = useState({ isOpen: false, loan: null })
  const [deletePaymentModal, setDeletePaymentModal] = useState({ isOpen: false, paymentId: null })
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    principalAmount: '',
    interestAmount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: ''
  })
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

  /**
   * Fetch loans from API
   */
  const loadLoans = async () => {
    try {
      setLoading(true)
      const data = await loanService.getAll()
      setLoans(data)
    } catch (error) {
      console.error('Error loading loans:', error)
    } finally {
      setLoading(false)
    }
  }

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

      if (editingLoan) {
        // Include the ID in the loan data for the update request
        loanData.id = editingLoan.id
        await loanService.update(editingLoan.id, loanData)
      } else {
        await loanService.create(loanData)
      }

      await loadLoans()
      closeForm()
    } catch (error) {
      console.error('Error saving loan:', error)
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
      await loanService.delete(loan.id)
      await loadLoans()
      closeDeleteLoanModal()
    } catch (error) {
      console.error('Error deleting loan:', error)
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
  const formatCurrency = (amount) => {
    // Handle null, undefined, NaN, or invalid values
    if (amount == null || isNaN(amount) || amount === 'NaN') {
      return '€0.00'
    }
    
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    
    if (isNaN(numAmount)) {
      return '€0.00'
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(numAmount)
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

      {/* Form Modal */}
      {showForm && (
        <div className="form-modal" onClick={(e) => e.target === e.currentTarget && closeForm()}>
          <div className="card form-card">
            <div className="card-header form-header">
              <h2>
                {editingLoan 
                  ? t('loans.editLoan')
                  : t('loans.addLoan')
                }
              </h2>
              <button
                className="form-close-btn"
                onClick={closeForm}
                aria-label={t('common.close')}
              >
                <FiX size={24} />
              </button>
            </div>
            
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
          </div>
        </div>
      )}

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
        <div className="loans-grid">
          {loans.map((loan) => {
            // Handle both camelCase and snake_case property names
            const isGiven = (loan.lentBy || loan.lent_by) === 'Me'
            const partyName = isGiven ? (loan.borrowedBy || loan.borrowed_by) : (loan.lentBy || loan.lent_by)
            
            return (
              <div key={loan.id} className={`loan-card card ${isGiven ? 'given' : 'received'}`}>
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
                    <span className="amount-value">
                      {formatCurrency(loan.amount ?? 0)}
                    </span>
                  </div>
                  <div className="amount-item">
                    <span className="amount-label">{t('loans.remainingAmount')}</span>
                    <span className="amount-value remaining">
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
                  <div className="loan-added-by">
                    Added by {loan.user_profiles.display_name}
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
              </div>
            )
          })}
        </div>
      )}

      {/* Payment History Modal */}
      {viewingPayments && (
        <div className="modal-overlay" onClick={closePaymentHistory}>
          <div className="modal-content payment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <span style={{ fontSize: '20px', fontWeight: 'bold', marginRight: '8px' }}>€</span> Payment History
              </h2>
              <button className="close-btn" onClick={closePaymentHistory}>&times;</button>
            </div>

            <div className="modal-body">
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
            </div>
          </div>
        </div>
      )}

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
    </div>
  )
}

export default Loans

