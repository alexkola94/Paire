import { useState, useEffect } from 'react'
import { CATEGORIES } from '../constants/categories'
import { useTranslation } from 'react-i18next'
import {
  FiCalendar, FiPlus, FiEdit, FiTrash2, FiCheck,
  FiClock, FiAlertCircle, FiRepeat, FiLink, FiRotateCcw,
  FiGrid, FiList, FiChevronLeft, FiChevronRight
} from 'react-icons/fi'
import { addMonths, addYears, addWeeks, startOfMonth, endOfMonth, isSameMonth, isAfter } from 'date-fns'
import { recurringBillService, loanService, loanPaymentService } from '../services/api'
import useCurrencyFormatter from '../hooks/useCurrencyFormatter'
import ConfirmationModal from '../components/ConfirmationModal'
import Modal from '../components/Modal'
import CurrencyInput from '../components/CurrencyInput'
import CategorySelector from '../components/CategorySelector'
import FormSection from '../components/FormSection'
import SuccessAnimation from '../components/SuccessAnimation'
import LoadingProgress from '../components/LoadingProgress'
import Skeleton from '../components/Skeleton'
import useSwipeGesture from '../hooks/useSwipeGesture'
import CalendarView from '../components/CalendarView'
import './RecurringBills.css'

/**
 * Recurring Bills Page Component
 * Manage recurring bills and subscriptions with calendar view
 */
function RecurringBills() {
  const { t } = useTranslation()
  const formatCurrency = useCurrencyFormatter()
  const [loading, setLoading] = useState(true)
  const [bills, setBills] = useState([])
  const [loans, setLoans] = useState([])
  const [summary, setSummary] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingBill, setEditingBill] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, billId: null })
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [showLoadingProgress, setShowLoadingProgress] = useState(false)
  const [viewMode, setViewMode] = useState('list') // 'list' or 'calendar'
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: '',
    frequency: 'monthly',
    dueDay: '',
    autoPay: false,
    reminderDays: '3',
    isActive: true,
    notes: '',
    loanId: ''
  })
  const [processingBillId, setProcessingBillId] = useState(null)
  // Unmark confirmation modal state
  const [unmarkModal, setUnmarkModal] = useState({ isOpen: false, bill: null })

  // Pagination State
  const [page, setPage] = useState(1)



  // Bill categories (using master list)
  const categories = CATEGORIES.EXPENSE.map(cat => ({
    value: cat,
    label: t(`categories.${cat}`) || t(`recurringBills.categories.${cat}`) || cat.charAt(0).toUpperCase() + cat.slice(1),
    icon: '📋' // Default icon, will be overridden by getCategoryIcon helper if needed or we can enhance this map later
  }))

  const frequencies = [
    { value: 'weekly', label: t('recurringBills.frequencies.weekly') },
    { value: 'monthly', label: t('recurringBills.frequencies.monthly') },
    { value: 'quarterly', label: t('recurringBills.frequencies.quarterly') },
    { value: 'yearly', label: t('recurringBills.frequencies.yearly') }
  ]

  /**
   * Load bills, loans and summary on mount
   */
  useEffect(() => {
    loadData()
  }, [])

  /**
   * Fetch bills, loans and summary data
   */
  const loadData = async (background = false) => {
    try {
      if (!background) setLoading(true)
      const [billsData, summaryData, loansData] = await Promise.all([
        recurringBillService.getAll(),
        recurringBillService.getSummary(),
        loanService.getAll()
      ])
      setBills(billsData || [])
      setLoans(loansData || [])
      setSummary(summaryData || null)
    } catch (error) {
      console.error('Error loading recurring bills data:', error)
    } finally {
      if (!background) setLoading(false)
    }
  }

  /**
   * Get days until due date
   */
  const getDaysUntil = (dueDate) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  /**
   * Check if bill is overdue
   */
  const isOverdue = (dueDate) => {
    return getDaysUntil(dueDate) < 0
  }

  /**
   * Check if bill is due soon (within 7 days)
   */
  const isDueSoon = (dueDate) => {
    const days = getDaysUntil(dueDate)
    return days >= 0 && days <= 7
  }

  /**
   * Get category icon
   */
  const getCategoryIcon = (category) => {
    const found = categories.find(c => c.value === category)
    return found ? found.icon : '📋'
  }

  /**
   * Handle form input changes
   */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  /**
   * Handle form submission (create/update)
   */
  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      // Close form immediately and show full screen loader
      setShowForm(false)
      setShowLoadingProgress(true)

      let notes = formData.notes || ''

      // Clean up any existing LOAN_REF tag first
      notes = notes.replace(/\[LOAN_REF:[^\]]+\]\s*/g, '').trim()

      // Append new loan reference if a loan is selected
      if (formData.category === 'loan' && formData.loanId) {
        notes = `${notes} [LOAN_REF:${formData.loanId}]`.trim()
      }

      const billData = {
        ...formData,
        notes, // Use updated notes
        amount: parseFloat(formData.amount),
        dueDay: parseInt(formData.dueDay),
        reminderDays: parseInt(formData.reminderDays)
      }

      // Remove loanId from payload as it's not in the schema (it's in notes)
      delete billData.loanId

      if (editingBill) {
        await recurringBillService.update(editingBill.id, billData)
      } else {
        await recurringBillService.create(billData)
      }

      // Refresh list in background
      await loadData(true)

      // Show success animation
      setShowLoadingProgress(false)
      setShowSuccessAnimation(true)

      resetForm()
    } catch (error) {
      console.error('Error saving bill:', error)
      setShowLoadingProgress(false)
      setShowForm(true) // Re-open form on error
      alert(t('recurringBills.errorSaving'))
    }
  }

  /**
   * Handle mark bill as paid
   */
  /**
   * Handle mark bill as paid with Optimistic UI
   */
  const handleMarkPaid = async (billId, billAmount, notes) => {
    if (processingBillId) return // Prevent double clicks

    // 1. Optimistic Update
    const billToUpdate = bills.find(b => b.id === billId)
    if (!billToUpdate) return

    // Store previous state for rollback
    const previousBills = [...bills]
    const previousSummary = summary ? { ...summary } : null

    // Calculate next due date locally
    const currentDueDate = new Date(billToUpdate.nextDueDate || billToUpdate.next_due_date)
    let nextDueDate = new Date(currentDueDate)

    if (billToUpdate.frequency === 'monthly') {
      nextDueDate = addMonths(currentDueDate, 1)
    } else if (billToUpdate.frequency === 'yearly') {
      nextDueDate = addYears(currentDueDate, 1)
    } else if (billToUpdate.frequency === 'weekly') {
      nextDueDate = addWeeks(currentDueDate, 1)
    } else if (billToUpdate.frequency === 'quarterly') {
      nextDueDate = addMonths(currentDueDate, 3)
    }

    // Update local state immediately
    const updatedBill = {
      ...billToUpdate,
      nextDueDate: nextDueDate.toISOString(),
      next_due_date: nextDueDate.toISOString() // Handle both casing
    }

    setBills(prevBills => prevBills.map(b => b.id === billId ? updatedBill : b))

    // Optimistically update summary (approximate)
    if (summary) {
      setSummary(prev => ({
        ...prev,
        overdueBills: isOverdue(currentDueDate) ? Math.max(0, prev.overdueBills - 1) : prev.overdueBills,
        upcomingBills: isDueSoon(currentDueDate) ? Math.max(0, prev.upcomingBills - 1) : prev.upcomingBills
        // Note: strictly we should also increment correct category, but this is enough for "instant feel"
      }))
    }

    try {
      setProcessingBillId(billId)

      // Check for loan reference in notes
      const loanRefMatch = notes && notes.match(/\[LOAN_REF:([^\]]+)\]/)

      if (loanRefMatch && loanRefMatch[1]) {
        const loanId = loanRefMatch[1]

        // Create loan payment
        const paymentData = {
          loanId: loanId,
          amount: parseFloat(billAmount),
          principalAmount: parseFloat(billAmount),
          interestAmount: 0,
          paymentDate: new Date().toISOString().split('T')[0],
          notes: `Auto-payment from Recurring Bill`
        }

        try {
          // This we can't fully optimistic update without complex logic, so we await
          await loanPaymentService.create(paymentData)
        } catch (paymentError) {
          console.error('Error creating loan payment:', paymentError)
          // Non-blocking error for the main action
        }
      }

      await recurringBillService.markPaid(billId)

      // Trigger background refresh to ensure data consistency
      await loadData(true)
    } catch (error) {
      console.error('Error marking bill as paid:', error)

      // Rollback on error
      setBills(previousBills)
      if (previousSummary) setSummary(previousSummary)

      alert(t('recurringBills.errorMarkingPaid'))
    } finally {
      setProcessingBillId(null)
    }
  }

  /**
   * Handle unmark bill as paid (Revert)
   */
  /**
   * Open unmark confirmation modal
   */
  const handleUnmarkPaid = (bill) => {
    setUnmarkModal({ isOpen: true, bill })
  }

  /**
   * Execute unmark action (Revert)
   */
  const confirmUnmark = async () => {
    const { bill } = unmarkModal
    if (!bill) return

    try {
      setProcessingBillId(bill.id)

      // 1. Revert Bill Status via API (Handles Date Revert + Expense Deletion)
      await recurringBillService.unmarkPaid(bill.id)

      // 2. Revert Loan Payment (if applicable)
      const loanRefMatch = bill.notes && bill.notes.match(/\[LOAN_REF:([^\]]+)\]/)
      if (loanRefMatch && loanRefMatch[1]) {
        const loanId = loanRefMatch[1]

        const payments = await loanPaymentService.getByLoan(loanId)

        const today = new Date().toISOString().split('T')[0]
        const paymentToDelete = payments.find(p => {
          const paymentDate = p.paymentDate.split('T')[0]
          const amountMatch = Math.abs(parseFloat(p.amount) - parseFloat(bill.amount)) < 0.01
          const isAutoPayment = p.notes && p.notes.includes('Auto-payment')
          return paymentDate === today && amountMatch && isAutoPayment
        })

        if (paymentToDelete) {
          await loanPaymentService.delete(paymentToDelete.id)
        }
      }

      await loadData()
      setUnmarkModal({ isOpen: false, bill: null })
      // Show success animation or toast instead of alert
      setShowSuccessAnimation(true)
      // alert(t('recurringBills.revertSuccess') || 'Bill payment reverted successfully')
    } catch (error) {
      console.error('Error unmarking bill:', error)
      alert(t('recurringBills.errorUnmarking') || 'Failed to revert bill status.')
    } finally {
      setProcessingBillId(null)
    }
  }

  /**
   * Handle edit bill
   */
  const handleEdit = (bill) => {
    setEditingBill(bill)

    // Check for loan reference in notes
    const loanRefMatch = bill.notes && bill.notes.match(/\[LOAN_REF:([^\]]+)\]/)
    const loanId = loanRefMatch ? loanRefMatch[1] : ''

    // Clean notes for display
    const displayNotes = bill.notes ? bill.notes.replace(/\[LOAN_REF:[^\]]+\]\s*/g, '').trim() : ''

    setFormData({
      name: bill.name,
      amount: bill.amount.toString(),
      category: bill.category,
      frequency: bill.frequency,
      // Handle both camelCase and snake_case property names
      dueDay: (bill.dueDay ?? bill.due_day ?? '').toString(),
      autoPay: bill.autoPay ?? bill.auto_pay ?? false,
      reminderDays: (bill.reminderDays ?? bill.reminder_days ?? '3').toString(),
      isActive: bill.isActive ?? bill.is_active ?? true,
      notes: displayNotes,
      loanId: loanId
    })
    setShowForm(true)
  }

  /**
   * Open delete confirmation modal
   */
  const openDeleteModal = (billId) => {
    setDeleteModal({ isOpen: true, billId })
  }

  /**
   * Close delete confirmation modal
   */
  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, billId: null })
  }

  /**
   * Handle delete bill
   */
  const handleDelete = async () => {
    const { billId } = deleteModal
    if (!billId) return

    try {
      await recurringBillService.delete(billId)
      await loadData()
      closeDeleteModal()
    } catch (error) {
      console.error('Error deleting bill:', error)
      alert(t('recurringBills.errorDeleting'))
    }
  }

  /**
   * Reset form to initial state
   */
  const resetForm = () => {
    setShowForm(false)
    setEditingBill(null)
    setFormData({
      name: '',
      amount: '',
      category: '',
      frequency: 'monthly',
      dueDay: '',
      autoPay: false,
      reminderDays: '3',
      isActive: true,
      notes: '',
      loanId: ''
    })
  }

  /**
   * Format due date display
   */
  const formatDueDate = (date) => {
    return new Date(date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Separate active and inactive bills (handle both camelCase and snake_case)
  const activeBills = bills.filter(b => (b.isActive ?? b.is_active) !== false)

  const today = new Date()
  const currentMonthEnd = endOfMonth(today)

  // 1. Overdue: Due date is strictly before today (and not paid)
  const overdueBills = activeBills.filter(b => isOverdue(b.nextDueDate || b.next_due_date))

  // 2. To Pay This Month: Due date is within current month (Today to EndOfMonth)
  // Exclude overdue (already handled)
  const dueThisMonthBills = activeBills.filter(b => {
    const dueDate = new Date(b.nextDueDate || b.next_due_date)
    return isSameMonth(dueDate, today) && !isOverdue(b.nextDueDate || b.next_due_date)
  })

  // 3. Paid This Month: 
  // Heuristic: Monthly bills where NextDueDate is in the future (Next Month)
  // This implies the bill for 'Current Month' has been processed.
  const paidThisMonthBills = activeBills.filter(b => {
    const dueDate = new Date(b.nextDueDate || b.next_due_date)
    // Only apply to Monthly/Weekly. Yearly is too sparse.
    if (b.frequency !== 'monthly' && b.frequency !== 'weekly') return false

    // If due date is after this month, it means this month is cleared
    // But we also want to verify it represents a "recent" payment, not just a future bill.
    // For now, "Next Month" is the best proxy for "Paid This Month".
    return isAfter(dueDate, currentMonthEnd) && !isAfter(dueDate, addMonths(currentMonthEnd, 1))
  })

  // 4. Upcoming / Future: Everything else (Active but not in above categories)
  const excludeIds = new Set([
    ...overdueBills.map(b => b.id),
    ...dueThisMonthBills.map(b => b.id),
    ...paidThisMonthBills.map(b => b.id)
  ])
  const futureBills = activeBills.filter(b => !excludeIds.has(b.id))

  // Update "laterBills" usage for pagination if needed, or just use futureBills
  const laterBills = futureBills
  // Reset pagination when list changes
  useEffect(() => {
    setPage(1)
  }, [laterBills.length])

  // Filter for active loans only for the dropdown
  const activeLoanOptions = loans.filter(l => !(l.isSettled ?? l.is_settled))

  if (loading) {
    return (
      <div className="recurring-bills-page">
        <div className="page-header flex-between">
          <div>
            <Skeleton height="32px" width="200px" style={{ marginBottom: '8px' }} />
            <Skeleton height="20px" width="120px" />
          </div>
          <Skeleton height="40px" width="120px" style={{ borderRadius: '8px' }} />
        </div>
        <div className="stats-grid">
          {[1, 2].map(i => (
            <div key={i} className="stats-card glass-card">
              <Skeleton height="24px" width="100px" style={{ marginBottom: '8px' }} />
              <Skeleton height="32px" width="80px" />
            </div>
          ))}
        </div>
        <div className="bills-section">
          <Skeleton height="24px" width="150px" style={{ marginBottom: '1rem' }} />
          {[1, 2, 3].map(i => (
            <div key={i} className="bill-card card" style={{ height: '140px', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <Skeleton type="circular" width="48px" height="48px" />
                <div style={{ flex: 1 }}>
                  <Skeleton height="20px" width="60%" style={{ marginBottom: '8px' }} />
                  <Skeleton height="16px" width="100px" />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Skeleton height="20px" width="120px" />
                <Skeleton height="24px" width="80px" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  // Pagination for Later Bills - Derived variables
  const PAGE_SIZE = 6
  const totalPages = Math.ceil(laterBills.length / PAGE_SIZE)
  const displayedLaterBills = laterBills.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="recurring-bills-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <FiCalendar className="page-icon" />
            {t('recurringBills.title')}
          </h1>
          <div className="header-actions-group" style={{ display: 'flex', gap: '1rem' }}>
            {/* View Toggle */}
            <div className="view-toggle glass-card" style={{ display: 'flex', padding: '4px', borderRadius: '8px', gap: '4px' }}>
              <button
                className={`btn-icon ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List View"
                style={{ background: viewMode === 'list' ? 'var(--primary)' : 'transparent', color: viewMode === 'list' ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}
              >
                <FiList size={20} />
              </button>
              <button
                className={`btn-icon ${viewMode === 'calendar' ? 'active' : ''}`}
                onClick={() => setViewMode('calendar')}
                title="Calendar View"
                style={{ background: viewMode === 'calendar' ? 'var(--primary)' : 'transparent', color: viewMode === 'calendar' ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}
              >
                <FiGrid size={20} />
              </button>
            </div>

            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <FiPlus /> <span className="mobile-hidden">{t('recurringBills.addBill')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="summary-grid">
          <div className="summary-card">
            <div className="summary-icon total">
              <FiRepeat />
            </div>
            <div className="summary-content">
              <h3>{t('recurringBills.totalBills')}</h3>
              <p className="summary-value">{summary.activeBills}</p>
              <p className="summary-detail">
                {summary.inactiveBills} {t('recurringBills.inactive')}
              </p>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon monthly">
              <span style={{ fontSize: '24px', fontWeight: 'bold' }}>€</span>
            </div>
            <div className="summary-content">
              <h3>{t('recurringBills.monthlyTotal')}</h3>
              <p className="summary-value">{formatCurrency(summary.totalMonthlyAmount)}</p>
              <p className="summary-detail">
                {formatCurrency(summary.totalYearlyAmount)} {t('recurringBills.perYear')}
              </p>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon upcoming">
              <FiClock />
            </div>
            <div className="summary-content">
              <h3>{t('recurringBills.upcoming')}</h3>
              <p className="summary-value">{summary.upcomingBills}</p>
              <p className="summary-detail">
                {summary.overdueBills} {t('recurringBills.overdue')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="fade-in">
          <CalendarView
            bills={activeBills}
            onEdit={handleEdit}
            onDelete={openDeleteModal}
            onMarkPaid={handleMarkPaid}
            t={t}
            formatCurrency={formatCurrency}
          />
        </div>
      )}

      {/* Bills Sections - List View */}
      <div className={`bills-container ${viewMode === 'calendar' ? 'hidden' : ''}`} style={viewMode === 'calendar' ? { display: 'none' } : {}}>

        {/* Overdue Bills */}
        {overdueBills.length > 0 && (
          <div className="bills-section overdue-section">
            <h2 className="section-title">
              <FiAlertCircle /> {t('recurringBills.overdueBills')} ({overdueBills.length})
            </h2>
            <div className="bills-grid">
              {overdueBills.map(bill => (
                <BillCard
                  key={bill.id}
                  bill={bill}
                  onEdit={handleEdit}
                  onDelete={openDeleteModal}
                  onMarkPaid={handleMarkPaid}
                  onUnmark={handleUnmarkPaid}
                  isProcessing={processingBillId === bill.id}
                  getCategoryIcon={getCategoryIcon}
                  formatDueDate={formatDueDate}
                  getDaysUntil={getDaysUntil}
                  t={t}
                  status="overdue"
                  formatCurrency={formatCurrency}
                />
              ))}
            </div>
          </div>
        )}

        {/* 2. Due This Month (To Pay) */}
        {dueThisMonthBills.length > 0 && (
          <div className="bills-section upcoming-section">
            <h2 className="section-title">
              <FiClock /> {t('recurringBills.dueThisMonth') || "Due This Month"} ({dueThisMonthBills.length})
            </h2>
            <div className="bills-grid">
              {dueThisMonthBills.map(bill => (
                <BillCard
                  key={bill.id}
                  bill={bill}
                  onEdit={handleEdit}
                  onDelete={openDeleteModal}
                  onMarkPaid={handleMarkPaid}
                  onUnmark={handleUnmarkPaid}
                  isProcessing={processingBillId === bill.id}
                  getCategoryIcon={getCategoryIcon}
                  formatDueDate={formatDueDate}
                  getDaysUntil={getDaysUntil}
                  t={t}
                  status="upcoming"
                  formatCurrency={formatCurrency}
                />
              ))}
            </div>
          </div>
        )}

        {/* 3. Paid This Month (Done) */}
        {paidThisMonthBills.length > 0 && (
          <div className="bills-section paid-section">
            <h2 className="section-title" style={{ color: 'var(--success-color)' }}>
              <FiCheck /> {t('recurringBills.paidThisMonth') || "Paid This Month"} ({paidThisMonthBills.length})
            </h2>
            <div className="bills-grid" style={{ opacity: 0.8 }}>
              {paidThisMonthBills.map(bill => (
                <BillCard
                  key={bill.id}
                  bill={bill}
                  onEdit={handleEdit}
                  onDelete={openDeleteModal}
                  onMarkPaid={handleMarkPaid}
                  onUnmark={handleUnmarkPaid}
                  isProcessing={processingBillId === bill.id}
                  getCategoryIcon={getCategoryIcon}
                  formatDueDate={formatDueDate}
                  getDaysUntil={getDaysUntil}
                  t={t}
                  status="paid"
                  formatCurrency={formatCurrency}
                />
              ))}
            </div>
          </div>
        )}

        {/* 4. Upcoming / Future Bills */}
        {futureBills.length > 0 && (
          <div className="bills-section">
            <h2 className="section-title">
              <FiCalendar /> {t('recurringBills.futureBills') || "Upcoming & Future"} ({futureBills.length})
            </h2>
            <div className="bills-grid">
              {displayedLaterBills.map(bill => (
                <BillCard
                  key={bill.id}
                  bill={bill}
                  onEdit={handleEdit}
                  onDelete={openDeleteModal}
                  onMarkPaid={handleMarkPaid}
                  onUnmark={handleUnmarkPaid}
                  isProcessing={processingBillId === bill.id}
                  getCategoryIcon={getCategoryIcon}
                  formatDueDate={formatDueDate}
                  getDaysUntil={getDaysUntil}
                  t={t}
                  status="later"
                  formatCurrency={formatCurrency}
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

        {/* Empty State */}
        {bills.length === 0 && (
          <div className="empty-state">
            <FiCalendar size={64} />
            <h3>{t('recurringBills.noBills')}</h3>
            <p>{t('recurringBills.noBillsDescription')}</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <FiPlus /> {t('recurringBills.createFirstBill')}
            </button>
          </div>
        )}
      </div>

      {/* Bill Form Modal */}
      {showForm && (
        <Modal
          isOpen={showForm}
          onClose={resetForm}
          title={editingBill ? t('recurringBills.editBill') : t('recurringBills.addBill')}
        >
          <form onSubmit={handleSubmit}>
            {/* Basic Information Section */}
            <FormSection title={t('transaction.formSections.basicInfo')}>
              <div className="form-group">
                <label>{t('recurringBills.billName')} *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder={t('recurringBills.billNamePlaceholder')}
                />
              </div>

              <CurrencyInput
                value={formData.amount}
                onChange={handleChange}
                name="amount"
                id="amount"
                label={`${t('recurringBills.amount')} *`}
                required
              />

              {/* Category - Full width for better visibility */}
              <div className="form-layout-item-full">
                <CategorySelector
                  value={formData.category}
                  onChange={handleChange}
                  name="category"
                  categories={categories.map(c => c.value)}
                  type="expense"
                  label={t('recurringBills.category')}
                />
              </div>

              {/* Loan Selection - ONLY if "Loan Payment" category is selected and we have active loans */}
              {formData.category === 'loan' && activeLoanOptions.length > 0 && (
                <div className="form-layout-item-full fade-in">
                  <div className="form-group">
                    <label style={{ color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FiLink /> Link to Loan
                    </label>
                    <select
                      name="loanId"
                      value={formData.loanId}
                      onChange={handleChange}
                      className="form-select"
                      style={{ borderColor: 'var(--primary-color)' }}
                    >
                      <option value="">-- Select a Loan (Optional) --</option>
                      {activeLoanOptions.map(loan => {
                        const isGiven = (loan.lentBy || loan.lent_by) === 'Me'
                        const partyName = isGiven ? (loan.borrowedBy || loan.borrowed_by) : (loan.lentBy || loan.lent_by)
                        const type = isGiven ? t('loans.moneyLentShort') : t('loans.moneyBorrowedShort')
                        const remaining = loan.remainingAmount ?? loan.remaining_amount ?? 0

                        return (
                          <option key={loan.id} value={loan.id}>
                            {partyName} ({type}) - {formatCurrency(remaining)} remaining
                          </option>
                        )
                      })}
                    </select>
                    <small className="form-hint">
                      Marking this bill as paid will automatically add a payment to this loan.
                    </small>
                  </div>
                </div>
              )}

            </FormSection>

            <div className="form-row">
              <div className="form-group">
                <label>{t('recurringBills.frequency')} *</label>
                <select
                  name="frequency"
                  value={formData.frequency}
                  onChange={handleChange}
                  required
                >
                  {frequencies.map(freq => (
                    <option key={freq.value} value={freq.value}>
                      {freq.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>{t('recurringBills.dueDay')} *</label>
                <input
                  type="number"
                  name="dueDay"
                  value={formData.dueDay}
                  onChange={handleChange}
                  required
                  min="1"
                  max="31"
                  placeholder="1-31"
                />
              </div>
            </div>

            <div className="form-group">
              <label>{t('recurringBills.reminderDays')}</label>
              <input
                type="number"
                name="reminderDays"
                value={formData.reminderDays}
                onChange={handleChange}
                min="0"
                max="30"
                placeholder="3"
              />
              <small>{t('recurringBills.reminderDaysHint')}</small>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="autoPay"
                  checked={formData.autoPay}
                  onChange={handleChange}
                />
                <span>{t('recurringBills.autoPay')}</span>
              </label>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                />
                <span>{t('recurringBills.isActive')}</span>
              </label>
            </div>

            <div className="form-group">
              <label>{t('recurringBills.notes')}</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                placeholder={t('recurringBills.notesPlaceholder')}
              />
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn btn-primary">
                {editingBill ? t('common.update') : t('common.create')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Loading Progress Overlay */}
      <LoadingProgress show={showLoadingProgress} />

      {/* Success Animation */}
      <SuccessAnimation
        show={showSuccessAnimation}
        onComplete={() => setShowSuccessAnimation(false)}
        message={t('recurringBills.savedSuccess')}
      />

      {/* Delete Payment Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        title={t('recurringBills.deleteBill')}
        message={t('recurringBills.confirmDelete')}
        confirmText={t('common.delete')}
        variant="danger"
      />

      {/* Unmark/Revert Confirmation Modal */}
      <ConfirmationModal
        isOpen={unmarkModal.isOpen}
        onClose={() => setUnmarkModal({ isOpen: false, bill: null })}
        onConfirm={confirmUnmark}
        title={t('recurringBills.confirmUnmarkTitle') || "Revert Payment?"}
        message={t('recurringBills.confirmUnmarkMessage') || "This will revert the due date to the previous cycle and remove any linked loan payment created today. Are you sure?"}
        confirmText={t('recurringBills.revert') || "Revert"}
        variant="warning"
        loading={processingBillId === unmarkModal.bill?.id}
      />
    </div>
  )
}

/**
 * Bill Card Component
 */
function BillCard({ bill, onEdit, onDelete, onMarkPaid, onUnmark, isProcessing, getCategoryIcon, formatDueDate, getDaysUntil, t, status, formatCurrency }) {
  /* Swipe Gesture Integration */
  const { handleTouchStart, handleTouchMove, handleTouchEnd, getSwipeProps } = useSwipeGesture({
    onSwipeLeft: () => onDelete(bill.id),
    onSwipeRight: () => onMarkPaid(bill.id, bill.amount, bill.notes),
    threshold: 80
  })

  const icon = getCategoryIcon(bill.category)
  const daysUntil = getDaysUntil(bill.nextDueDate || bill.next_due_date)
  const hasLoanLink = bill.notes && bill.notes.includes('[LOAN_REF:')

  const swipeProps = getSwipeProps(bill.id)
  const offset = swipeProps.offset || 0
  const isSwipeRight = offset > 0
  const isSwipeLeft = offset < 0
  const swipeProgress = Math.min(100, (Math.abs(offset) / 80) * 100)

  return (
    <div
      className={`bill-card ${status} ${swipeProps.className || ''}`}
      style={swipeProps.style}
      onTouchStart={(e) => handleTouchStart(bill.id, e)}
      onTouchMove={(e) => handleTouchMove(bill.id, e)}
      onTouchEnd={(e) => handleTouchEnd(bill.id, e)}
    >
      {/* Swipe Indicators */}
      {isSwipeRight && (
        <div
          className="swipe-indicator swipe-check-indicator"
          style={{
            opacity: Math.min(1, swipeProgress / 50),
            transform: `translate(${-offset + 16}px, -50%) scale(${Math.min(1, swipeProgress / 60)})`,
            left: 0
          }}
        >
          <FiCheck size={24} />
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

      <div className="bill-header">
        <div className="bill-icon">{icon}</div>
        <div className="bill-info">
          <h3>
            {bill.name}
            {hasLoanLink && <FiLink className="linked-icon" title="Linked to Loan" style={{ marginLeft: '6px', color: 'var(--primary-color)' }} />}
          </h3>
          <span className="bill-frequency">{t(`recurringBills.frequencies.${bill.frequency}`)}</span>
        </div>
        <div className="bill-actions">
          <button
            className="icon-btn"
            onClick={() => onEdit(bill)}
            title={t('common.edit')}
          >
            <FiEdit />
          </button>
          <button
            className="icon-btn danger"
            onClick={() => onDelete(bill.id)}
            title={t('common.delete')}
          >
            <FiTrash2 />
          </button>
        </div>
      </div>

      <div className="bill-amount">
        <span className="amount">{formatCurrency(bill.amount)}</span>
        {(bill.autoPay ?? bill.auto_pay) && <span className="auto-pay-badge">{t('recurringBills.autoPayEnabled')}</span>}
      </div>

      <div className="bill-due-date">
        <FiCalendar />
        <span>{t('recurringBills.dueOn')} {formatDueDate(bill.nextDueDate || bill.next_due_date)}</span>
        {daysUntil >= 0 ? (
          <span className="days-until">
            {daysUntil === 0 ? t('recurringBills.today') :
              daysUntil === 1 ? t('recurringBills.tomorrow') :
                `${daysUntil} ${t('recurringBills.daysLeft')}`}
          </span>
        ) : (
          <span className="days-overdue">
            {Math.abs(daysUntil)} {t('recurringBills.daysOverdue')}
          </span>
        )}
      </div>

      {bill.notes && (
        <div className="bill-notes">
          <p>{bill.notes.replace(/\[LOAN_REF:[^\]]+\]/, '').trim()}</p>
        </div>
      )}

      <div className="bill-footer" style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => onUnmark(bill)}
          title={t('recurringBills.unmarkPaid') || "Revert Last Payment"}
        >
          <FiRotateCcw />
        </button>
        <button
          className="btn btn-sm btn-success"
          onClick={() => onMarkPaid(bill.id, bill.amount, bill.notes)}
          style={{ flex: 1 }}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <><div className="spinner-small" style={{ width: '12px', height: '12px', marginRight: '5px' }}></div> {t('common.processing')}</>
          ) : (
            <><FiCheck /> {t('recurringBills.markPaid')}</>
          )}
        </button>
      </div>
    </div>
  )
}

export default RecurringBills

