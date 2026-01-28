import React, { useState, useEffect } from 'react'
import { CATEGORIES } from '../constants/categories'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  FiCalendar, FiPlus, FiEdit, FiTrash2, FiCheck,
  FiClock, FiAlertCircle, FiRepeat, FiLink, FiRotateCcw,
  FiGrid, FiList, FiChevronLeft, FiChevronRight, FiPaperclip, FiDownload, FiX, FiFileText, FiTarget
} from 'react-icons/fi'
import {
  addMonths, addYears, addWeeks, startOfMonth, endOfMonth, isSameMonth,
  isAfter, isBefore, startOfDay, endOfDay, eachDayOfInterval, getDay
} from 'date-fns'
import { recurringBillService, loanService, loanPaymentService, savingsGoalService } from '../services/api'
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
import { usePrivacyMode } from '../context/PrivacyModeContext'
import AddToCalculatorButton from '../components/AddToCalculatorButton'
import './RecurringBills.css'
import '../styles/AddToCalculator.css'

/**
 * Recurring Bills Page Component
 * Manage recurring bills and subscriptions with calendar view
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

function RecurringBills() {
  const { t } = useTranslation()
  const formatCurrency = useCurrencyFormatter()
  const queryClient = useQueryClient()
  const { isPrivate } = usePrivacyMode()

  // Queries
  const { data: bills = [], isLoading: billsLoading } = useQuery({
    queryKey: ['recurringBills'],
    queryFn: recurringBillService.getAll
  })

  // Loans stored in a separate query if needed, or fetched together.
  // Assuming separate for now as per original code.
  const { data: loans = [] } = useQuery({
    queryKey: ['loans'],
    queryFn: loanService.getAll
  })

  // Savings Goals for linking bills to automatic deposits
  const { data: savingsGoals = [] } = useQuery({
    queryKey: ['savingsGoals'],
    queryFn: savingsGoalService.getAll
  })

  const { data: summary } = useQuery({
    queryKey: ['recurringBillsSummary'],
    queryFn: recurringBillService.getSummary
  })

  // Combined Loading State
  const loading = billsLoading

  // UI State
  const [showForm, setShowForm] = useState(false)
  const [editingBill, setEditingBill] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, billId: null })
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [showLoadingProgress, setShowLoadingProgress] = useState(false)
  const [viewMode, setViewMode] = useState('list')
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
    loanId: '',
    savingsGoalId: ''
  })
  const [processingBillId, setProcessingBillId] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const [unmarkModal, setUnmarkModal] = useState({ isOpen: false, bill: null })
  const [attachmentsModal, setAttachmentsModal] = useState({ isOpen: false, bill: null })
  const [deleteAttachmentModal, setDeleteAttachmentModal] = useState({ isOpen: false, attachmentId: null, bill: null })
  const [pendingAttachments, setPendingAttachments] = useState([])
  const [animatingBill, setAnimatingBill] = useState({ id: null, type: null })

  // Pagination State
  const [page, setPage] = useState(1)

  // Mutations
  const createBillMutation = useMutation({
    mutationFn: recurringBillService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringBills'] })
      queryClient.invalidateQueries({ queryKey: ['recurringBillsSummary'] })
    }
  })

  const updateBillMutation = useMutation({
    mutationFn: ({ id, data }) => recurringBillService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringBills'] })
      queryClient.invalidateQueries({ queryKey: ['recurringBillsSummary'] })
    }
  })

  const deleteBillMutation = useMutation({
    mutationFn: recurringBillService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringBills'] })
      queryClient.invalidateQueries({ queryKey: ['recurringBillsSummary'] })
    }
  })

  const markPaidMutation = useMutation({
    mutationFn: recurringBillService.markPaid,
    // Optimistic update handled manually in handleMarkPaid
    onSuccess: () => {
      // Silently refresh in background to sync with server
      queryClient.invalidateQueries({ queryKey: ['recurringBills'] })
      queryClient.invalidateQueries({ queryKey: ['recurringBillsSummary'] })
    },
    onError: (error, billId) => {
      // Restore the bill on error - refetch from server
      queryClient.invalidateQueries({ queryKey: ['recurringBills'] })
      queryClient.invalidateQueries({ queryKey: ['recurringBillsSummary'] })
    }
  })

  const unmarkPaidMutation = useMutation({
    mutationFn: recurringBillService.unmarkPaid,
    // Optimistic update handled manually in confirmUnmark
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringBills'] })
      queryClient.invalidateQueries({ queryKey: ['recurringBillsSummary'] })
    },
    onError: (error, billId) => {
      // Restore on error - refetch from server
      queryClient.invalidateQueries({ queryKey: ['recurringBills'] })
      queryClient.invalidateQueries({ queryKey: ['recurringBillsSummary'] })
    }
  })


  /* --- HELPERS --- */
  const getDaysUntil = (dueDate) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const isOverdue = (dueDate) => {
    const todayStart = startOfDay(new Date())
    const due = new Date(dueDate)
    return isBefore(due, todayStart)
  }

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
  /* --- MUTATED HANDLERS --- */

  // Bill categories (using master list)
  const categories = CATEGORIES.EXPENSE.map(cat => ({
    value: cat,
    label: t(`categories.${cat}`) || t(`recurringBills.categories.${cat}`) || cat.charAt(0).toUpperCase() + cat.slice(1),
    icon: '📋'
  }))

  const frequencies = [
    { value: 'weekly', label: t('recurringBills.frequencies.weekly') },
    { value: 'monthly', label: t('recurringBills.frequencies.monthly') },
    { value: 'quarterly', label: t('recurringBills.frequencies.quarterly') },
    { value: 'yearly', label: t('recurringBills.frequencies.yearly') }
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      setFormLoading(true)

      let notes = formData.notes || ''
      // Clean existing references
      notes = notes.replace(/\[LOAN_REF:[^\]]+\]\s*/g, '').trim()
      notes = notes.replace(/\[SAVINGS_REF:[^\]]+\]\s*/g, '').trim()

      // Add loan reference if applicable
      if (formData.category === 'loan' && formData.loanId) {
        notes = `${notes} [LOAN_REF:${formData.loanId}]`.trim()
      }
      // Add savings goal reference if applicable
      if (formData.category === 'savings' && formData.savingsGoalId) {
        notes = `${notes} [SAVINGS_REF:${formData.savingsGoalId}]`.trim()
      }

      const billData = {
        ...formData,
        notes,
        amount: parseFloat(formData.amount),
        dueDay: parseInt(formData.dueDay),
        reminderDays: parseInt(formData.reminderDays)
      }
      delete billData.loanId

      if (editingBill) {
        await updateBillMutation.mutateAsync({ id: editingBill.id, data: billData })
      } else {
        const savedBill = await createBillMutation.mutateAsync(billData)

        // Handle Pending Attachments (Only for new bills for now, similar to before)
        if (pendingAttachments.length > 0 && savedBill) {
          const billId = savedBill.id || savedBill.Id
          if (billId) {
            for (const file of pendingAttachments) {
              try {
                await recurringBillService.uploadAttachment(billId, file)
              } catch (e) { console.error(e) }
            }
          }
        }
      }

      setShowSuccessAnimation(true)
      resetForm()
    } catch (error) {
      console.error('Error saving bill:', error)
      setShowForm(true)
      alert(t('recurringBills.errorSaving'))
    } finally {
      setFormLoading(false)
    }
  }

  /**
   * Handle mark bill as paid
   */
  /* --- MARK PAID / UNMARK PAID --- */

  const handleMarkPaid = async (billId, billAmount, notes) => {
    if (processingBillId || animatingBill.id) return

    // Keep local references for loan and savings logic
    const loanRefMatch = notes && notes.match(/\[LOAN_REF:([^\]]+)\]/)
    const savingsRefMatch = notes && notes.match(/\[SAVINGS_REF:([^\]]+)\]/)

    // Phase 1: Start checkmark animation
    setAnimatingBill({ id: billId, type: 'marking-paid' })

    // Phase 2: After checkmark shows, trigger exit animation AND optimistically remove from cache
    setTimeout(() => {
      setAnimatingBill({ id: billId, type: 'marking-paid-exit' })
      
      // OPTIMISTIC UPDATE: Remove bill from cache immediately so it never comes back
      queryClient.setQueryData(['recurringBills'], (oldBills) => {
        if (!oldBills) return oldBills
        // We don't actually remove it - we mark it as "processing" by moving nextDueDate forward
        // The server will calculate the new nextDueDate, so we just hide it from current view
        return oldBills.filter(b => b.id !== billId)
      })
    }, 700)

    // Phase 3: After exit animation, make API call (card is already gone from view)
    setTimeout(async () => {
      try {
        setProcessingBillId(billId)
        
        // Mark Paid Mutation - this will refresh the data with correct nextDueDate
        await markPaidMutation.mutateAsync(billId)

        // Additional Logic: Loan Payment Creation (Manual for now as it was before)
        if (loanRefMatch && loanRefMatch[1]) {
          const loanId = loanRefMatch[1]
          try {
            await loanPaymentService.create({
              loanId: loanId,
              amount: parseFloat(billAmount),
              principalAmount: parseFloat(billAmount),
              interestAmount: 0,
              paymentDate: new Date().toISOString().split('T')[0],
              notes: `Auto-payment from Recurring Bill`
            })
            // Invalidate loans to refresh balance
            queryClient.invalidateQueries({ queryKey: ['loans'] })
          } catch (e) { console.error(e) }
        }

        // Additional Logic: Savings Goal Deposit
        if (savingsRefMatch && savingsRefMatch[1]) {
          const goalId = savingsRefMatch[1]
          try {
            await savingsGoalService.addDeposit(goalId, parseFloat(billAmount))
            queryClient.invalidateQueries({ queryKey: ['savingsGoals'] })
          } catch (e) { console.error('Error adding savings deposit:', e) }
        }

      } catch (error) {
        console.error('Error marking bill as paid:', error)
        alert(t('recurringBills.errorMarkingPaid'))
        // On error, refetch to restore the bill
        queryClient.invalidateQueries({ queryKey: ['recurringBills'] })
      } finally {
        setProcessingBillId(null)
        setAnimatingBill({ id: null, type: null })
      }
    }, 1050) // 700ms (checkmark) + 350ms (exit animation)
  }

  const handleUnmarkPaid = (bill) => {
    setUnmarkModal({ isOpen: true, bill })
  }

  const confirmUnmark = async () => {
    const { bill } = unmarkModal
    if (!bill) return

    setUnmarkModal({ isOpen: false, bill: null })
    
    // Phase 1: Start revert animation with icon
    setAnimatingBill({ id: bill.id, type: 'reverting' })

    // Phase 2: After icon shows, trigger exit animation AND optimistically remove from cache
    setTimeout(() => {
      setAnimatingBill({ id: bill.id, type: 'reverting-exit' })
      
      // OPTIMISTIC UPDATE: Remove bill from cache immediately so it never comes back
      queryClient.setQueryData(['recurringBills'], (oldBills) => {
        if (!oldBills) return oldBills
        return oldBills.filter(b => b.id !== bill.id)
      })
    }, 700)

    // Phase 3: After exit animation, make API call (card is already gone from view)
    setTimeout(async () => {
      try {
        setProcessingBillId(bill.id)
        await unmarkPaidMutation.mutateAsync(bill.id)

        // Loan Revert Logic
        const loanRefMatch = bill.notes && bill.notes.match(/\[LOAN_REF:([^\]]+)\]/)
        if (loanRefMatch && loanRefMatch[1]) {
          const loanId = loanRefMatch[1]
          const payments = await loanPaymentService.getByLoan(loanId)
          // Find payment logic... (same as before)
          const today = new Date().toISOString().split('T')[0]
          const paymentToDelete = payments.find(p => {
            const paymentDate = p.paymentDate.split('T')[0]
            const amountMatch = Math.abs(parseFloat(p.amount) - parseFloat(bill.amount)) < 0.01
            const isAutoPayment = p.notes && p.notes.includes('Auto-payment')
            return paymentDate === today && amountMatch && isAutoPayment
          })
          if (paymentToDelete) {
            await loanPaymentService.delete(paymentToDelete.id)
            queryClient.invalidateQueries({ queryKey: ['loans'] })
          }
        }

        // Savings Goal Withdrawal Logic
        const savingsRefMatch = bill.notes && bill.notes.match(/\[SAVINGS_REF:([^\]]+)\]/)
        if (savingsRefMatch && savingsRefMatch[1]) {
          const goalId = savingsRefMatch[1]
          try {
            await savingsGoalService.withdraw(goalId, parseFloat(bill.amount))
            queryClient.invalidateQueries({ queryKey: ['savingsGoals'] })
          } catch (e) { console.error('Error withdrawing from savings:', e) }
        }

      } catch (error) {
        console.error('Error unmarking bill:', error)
        alert(t('recurringBills.errorUnmarking'))
        // On error, refetch to restore the bill
        queryClient.invalidateQueries({ queryKey: ['recurringBills'] })
      } finally {
        setProcessingBillId(null)
        setAnimatingBill({ id: null, type: null })
      }
    }, 1050) // 700ms (icon) + 350ms (exit animation)
  }

  /**
   * Handle edit bill
   */
  const handleEdit = (bill) => {
    setEditingBill(bill)

    // Check for loan reference in notes
    const loanRefMatch = bill.notes && bill.notes.match(/\[LOAN_REF:([^\]]+)\]/)
    const loanId = loanRefMatch ? loanRefMatch[1] : ''

    // Check for savings goal reference in notes
    const savingsRefMatch = bill.notes && bill.notes.match(/\[SAVINGS_REF:([^\]]+)\]/)
    const savingsGoalId = savingsRefMatch ? savingsRefMatch[1] : ''

    // Clean notes for display
    let displayNotes = bill.notes ? bill.notes.replace(/\[LOAN_REF:[^\]]+\]\s*/g, '').trim() : ''
    displayNotes = displayNotes.replace(/\[SAVINGS_REF:[^\]]+\]\s*/g, '').trim()

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
      loanId: loanId,
      savingsGoalId: savingsGoalId
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
      setFormLoading(true)
      await deleteBillMutation.mutateAsync(billId)

      closeDeleteModal()
    } catch (error) {
      console.error('Error deleting bill:', error)
      alert(t('recurringBills.errorDeleting'))
    } finally {
      setFormLoading(false)
    }
  }

  /* --- Attachment Handlers --- */

  const handleAttachments = (bill) => {
    setAttachmentsModal({ isOpen: true, bill })
  }

  const handleUploadAttachment = async (file) => {
    const { bill } = attachmentsModal
    if (!bill || !file) return

    try {
      // 1. Upload
      const uploaded = await recurringBillService.uploadAttachment(bill.id, file)

      // 2. Update Local State (Modal Bill)
      // Needs to handle if bill.attachments is undefined/null initially
      const currentAttachments = bill.attachments || []
      const updatedAttachments = [...currentAttachments, uploaded]

      const updatedBill = { ...bill, attachments: updatedAttachments }

      setAttachmentsModal(prev => ({ ...prev, bill: updatedBill }))

      // 3. Update React Query cache optimistically
      queryClient.setQueryData(['recurringBills'], (oldBills) => {
        if (!oldBills) return oldBills
        return oldBills.map(b => b.id === bill.id ? updatedBill : b)
      })

    } catch (error) {
      console.error('Error uploading attachment:', error)
      alert(t('recurringBills.errorUploading') || 'Failed to upload attachment')
    }
  }

  const handleDeleteAttachment = (attachmentId) => {
    const { bill } = attachmentsModal
    if (!bill) return

    // Open confirmation modal
    setDeleteAttachmentModal({ isOpen: true, attachmentId, bill })
  }

  const confirmDeleteAttachment = async () => {
    const { attachmentId, bill } = deleteAttachmentModal
    if (!bill || !attachmentId) return

    try {
      await recurringBillService.deleteAttachment(bill.id, attachmentId)

      // Update Local State
      const updatedAttachments = bill.attachments.filter(a => a.id !== attachmentId)
      const updatedBill = { ...bill, attachments: updatedAttachments }

      setAttachmentsModal(prev => ({ ...prev, bill: updatedBill }))

      // Update React Query cache optimistically
      queryClient.setQueryData(['recurringBills'], (oldBills) => {
        if (!oldBills) return oldBills
        return oldBills.map(b => b.id === bill.id ? updatedBill : b)
      })

      // Close modal
      setDeleteAttachmentModal({ isOpen: false, attachmentId: null, bill: null })

    } catch (error) {
      console.error('Error deleting attachment:', error)
      alert(t('recurringBills.errorDeletingAttachment') || 'Failed to delete attachment')
    }
  }

  /**
   * Reset form to initial state
   */
  const resetForm = () => {
    setShowForm(false)
    setEditingBill(null)
    setPendingAttachments([])
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
      loanId: '',
      savingsGoalId: ''
    })
  }

  const handlePendingFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setPendingAttachments(prev => [...prev, ...Array.from(e.target.files)])
    }
  }

  const removePendingAttachment = (index) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index))
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

  // --- NEW CALCULATION LOGIC ---

  /**
   * Calculate total of unpaid bills for the current month (including overdue)
   */
  const calculateCurrentMonthUnpaid = () => {
    // 1. Overdue bills are always unpaid "obligations" for now
    const overdueTotal = activeBills
      .filter(b => isOverdue(b.nextDueDate || b.next_due_date))
      .reduce((sum, b) => sum + parseFloat(b.amount), 0)

    // 2. Bills due effectively "this month" (start of today until end of month)
    const dueThisMonthTotal = activeBills
      .filter(b => {
        const dueDate = new Date(b.nextDueDate || b.next_due_date)
        // Must be in current month AND not overdue (future in current month)
        // We use isSameMonth to bound it to this month
        return isSameMonth(dueDate, today) && !isOverdue(b.nextDueDate || b.next_due_date)
      })
      .reduce((sum, b) => sum + parseFloat(b.amount), 0)

    return overdueTotal + dueThisMonthTotal
  }

  /**
   * Calculate projected total for NEXT month
   */
  const calculateNextMonthTotal = () => {
    const nextMonthDate = addMonths(today, 1)
    const startOfNext = startOfMonth(nextMonthDate)
    const endOfNext = endOfMonth(nextMonthDate)

    let total = 0

    activeBills.forEach(bill => {
      const amount = parseFloat(bill.amount)
      const freq = (bill.frequency || 'monthly').toLowerCase()
      const dueDay = parseInt(bill.dueDay || bill.due_day || 1)
      const nextDueDate = new Date(bill.nextDueDate || bill.next_due_date)

      // Strategy: Project occurrences from the CURRENT nextDueDate
      // and sum valid ones that fall into [startOfNext, endOfNext]

      let pointer = new Date(nextDueDate)
      // Safety break to prevent infinite loops if something is wrong
      let itemsChecked = 0

      // If pointer is ALREADY after end of next month, this bill has no contribution
      if (isAfter(pointer, endOfNext)) return

      // While pointer is before or within next month...
      while ((isBefore(pointer, endOfNext) || isSameMonth(pointer, endOfNext)) && itemsChecked < 52) {
        itemsChecked++

        // If pointer is WITHIN next month, add amount
        if (isSameMonth(pointer, nextMonthDate)) {
          total += amount
        }

        // Advance pointer
        if (freq === 'weekly') {
          pointer = addWeeks(pointer, 1)
        } else if (freq === 'monthly') {
          pointer = addMonths(pointer, 1)
        } else if (freq === 'quarterly') {
          pointer = addMonths(pointer, 3)
        } else if (freq === 'yearly') {
          pointer = addYears(pointer, 1)
        } else {
          pointer = addMonths(pointer, 1) // default
        }
      }
    })

    return total
  }

  const currentMonthUnpaidAmount = calculateCurrentMonthUnpaid()
  const nextMonthProjectedAmount = calculateNextMonthTotal()

  // --- END CALCULATION LOGIC ---

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

  // Filter for active (non-achieved) savings goals for the dropdown
  const activeSavingsGoals = savingsGoals.filter(g => !(g.isAchieved ?? g.is_achieved))

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
          <div className="data-cards-grid">
            {[1, 2, 3].map(i => (
              <div key={i} className="bill-card card data-card skeleton-card">
                <div className="data-card-header" style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                  <Skeleton type="circular" width="48px" height="48px" />
                  <div style={{ flex: 1 }}>
                    <Skeleton height="20px" width="60%" style={{ marginBottom: '8px' }} />
                    <Skeleton height="16px" width="100px" />
                  </div>
                </div>
                <div className="data-card-body" style={{ minHeight: '3rem' }} />
                <div className="data-card-meta">
                  <Skeleton height="20px" width="120px" />
                </div>
                <div className="data-card-actions" style={{ display: 'flex', gap: '8px' }}>
                  <Skeleton height="32px" width="80px" />
                  <Skeleton height="32px" width="100px" />
                </div>
              </div>
            ))}
          </div>
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
          <div className="header-actions-group" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
        <motion.div 
          className="summary-grid"
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
          <motion.div 
            className="summary-card"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { 
                opacity: 1, 
                y: 0,
                transition: {
                  duration: 0.5,
                  ease: [0.4, 0, 0.2, 1]
                }
              }
            }}
          >
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
          </motion.div>

          <motion.div 
            className="summary-card"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { 
                opacity: 1, 
                y: 0,
                transition: {
                  duration: 0.5,
                  ease: [0.4, 0, 0.2, 1]
                }
              }
            }}
          >
            <div className="summary-icon monthly">
              <span style={{ fontSize: '24px', fontWeight: 'bold' }}>€</span>
            </div>
            <div className="summary-content">
              <h3>{t('recurringBills.remainingThisMonth') || "Remaining (Unpaid)"}</h3>
              <p className={`summary-value ${isPrivate ? 'masked-number' : ''}`} style={{ color: 'var(--warning-color)' }}>
                {formatCurrency(currentMonthUnpaidAmount)}
              </p>
              <p className={`summary-detail ${isPrivate ? 'masked-number' : ''}`}>
                {t('recurringBills.monthlyTotal')}: {formatCurrency(summary.totalMonthlyAmount)}
              </p>
            </div>
          </motion.div>

          <motion.div 
            className="summary-card"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { 
                opacity: 1, 
                y: 0,
                transition: {
                  duration: 0.5,
                  ease: [0.4, 0, 0.2, 1]
                }
              }
            }}
          >
            <div className="summary-icon upcoming" style={{ background: 'var(--info-color-light)', color: 'var(--info-color)' }}>
              <FiCalendar />
            </div>
            <div className="summary-content">
              <h3>{t('recurringBills.nextMonthTotal') || "Next Month (Est.)"}</h3>
              <p className={`summary-value ${isPrivate ? 'masked-number' : ''}`}>{formatCurrency(nextMonthProjectedAmount)}</p>
              <p className="summary-detail">
                {t('recurringBills.forecast') || "Projected"}
              </p>
            </div>
          </motion.div>

          <motion.div 
            className="summary-card"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { 
                opacity: 1, 
                y: 0,
                transition: {
                  duration: 0.5,
                  ease: [0.4, 0, 0.2, 1]
                }
              }
            }}
          >
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
          </motion.div>
        </motion.div>
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
            <motion.div 
              className="data-cards-grid"
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.05
                  }
                }
              }}
            >
              {overdueBills.map(bill => (
                <motion.div
                  key={bill.id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { 
                      opacity: 1, 
                      y: 0,
                      transition: {
                        duration: 0.4,
                        ease: [0.4, 0, 0.2, 1]
                      }
                    }
                  }}
                >
                  <BillCard
                  bill={bill}
                  onEdit={handleEdit}
                  onDelete={openDeleteModal}
                  onMarkPaid={handleMarkPaid}
                  onUnmark={handleUnmarkPaid}
                  onAttachments={handleAttachments}
                  isProcessing={processingBillId === bill.id}
                  getCategoryIcon={getCategoryIcon}
                  formatDueDate={formatDueDate}
                  getDaysUntil={getDaysUntil}
                  t={t}
                  status="overdue"
                  formatCurrency={formatCurrency}
                  animationClass={animatingBill.id === bill.id ? animatingBill.type : ''}
                  isPrivate={isPrivate}
                />
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}

        {/* 2. Due This Month (To Pay) */}
        {dueThisMonthBills.length > 0 && (
          <div className="bills-section upcoming-section">
            <h2 className="section-title">
              <FiClock /> {t('recurringBills.dueThisMonth') || "Due This Month"} ({dueThisMonthBills.length})
            </h2>
            <motion.div 
              className="data-cards-grid"
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.05
                  }
                }
              }}
            >
              {dueThisMonthBills.map(bill => (
                <motion.div
                  key={bill.id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { 
                      opacity: 1, 
                      y: 0,
                      transition: {
                        duration: 0.4,
                        ease: [0.4, 0, 0.2, 1]
                      }
                    }
                  }}
                >
                  <BillCard
                  bill={bill}
                  onEdit={handleEdit}
                  onDelete={openDeleteModal}
                  onMarkPaid={handleMarkPaid}
                  onUnmark={handleUnmarkPaid}
                  onAttachments={handleAttachments}
                  isProcessing={processingBillId === bill.id}
                  getCategoryIcon={getCategoryIcon}
                  formatDueDate={formatDueDate}
                  getDaysUntil={getDaysUntil}
                  t={t}
                  status="upcoming"
                  formatCurrency={formatCurrency}
                  animationClass={animatingBill.id === bill.id ? animatingBill.type : ''}
                  isPrivate={isPrivate}
                />
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}

        {/* 3. Paid This Month (Done) */}
        {paidThisMonthBills.length > 0 && (
          <div className="bills-section paid-section">
            <h2 className="section-title" style={{ color: 'var(--success-color)' }}>
              <FiCheck /> {t('recurringBills.paidThisMonth') || "Paid This Month"} ({paidThisMonthBills.length})
            </h2>
            <motion.div 
              className="data-cards-grid" 
              style={{ opacity: 0.8 }}
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.05
                  }
                }
              }}
            >
              {paidThisMonthBills.map(bill => (
                <motion.div
                  key={bill.id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { 
                      opacity: 1, 
                      y: 0,
                      transition: {
                        duration: 0.4,
                        ease: [0.4, 0, 0.2, 1]
                      }
                    }
                  }}
                >
                  <BillCard
                  bill={bill}
                  onEdit={handleEdit}
                  onDelete={openDeleteModal}
                  onMarkPaid={handleMarkPaid}
                  onUnmark={handleUnmarkPaid}
                  onAttachments={handleAttachments}
                  isProcessing={processingBillId === bill.id}
                  getCategoryIcon={getCategoryIcon}
                  formatDueDate={formatDueDate}
                  getDaysUntil={getDaysUntil}
                  t={t}
                  status="paid"
                  formatCurrency={formatCurrency}
                  animationClass={animatingBill.id === bill.id ? animatingBill.type : ''}
                  isPrivate={isPrivate}
                />
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}

        {/* 4. Upcoming / Future Bills */}
        {futureBills.length > 0 && (
          <div className="bills-section">
            <h2 className="section-title">
              <FiCalendar /> {t('recurringBills.futureBills') || "Upcoming & Future"} ({futureBills.length})
            </h2>
            <motion.div 
              className="data-cards-grid"
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.05
                  }
                }
              }}
            >
              {displayedLaterBills.map(bill => (
                <motion.div
                  key={bill.id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { 
                      opacity: 1, 
                      y: 0,
                      transition: {
                        duration: 0.4,
                        ease: [0.4, 0, 0.2, 1]
                      }
                    }
                  }}
                >
                  <BillCard
                  bill={bill}
                  onEdit={handleEdit}
                  onDelete={openDeleteModal}
                  onMarkPaid={handleMarkPaid}
                  onUnmark={handleUnmarkPaid}
                  onAttachments={handleAttachments}
                  isProcessing={processingBillId === bill.id}
                  getCategoryIcon={getCategoryIcon}
                  formatDueDate={formatDueDate}
                  getDaysUntil={getDaysUntil}
                  t={t}
                  status="later"
                  formatCurrency={formatCurrency}
                  animationClass={animatingBill.id === bill.id ? animatingBill.type : ''}
                  isPrivate={isPrivate}
                />
                </motion.div>
              ))}
            </motion.div>

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

              {/* Savings Goal Selection - ONLY if "Savings" category is selected and we have active goals */}
              {formData.category === 'savings' && activeSavingsGoals.length > 0 && (
                <div className="form-layout-item-full fade-in">
                  <div className="form-group">
                    <label style={{ color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FiTarget /> {t('recurringBills.linkToSavingsGoal') || 'Link to Savings Goal'}
                    </label>
                    <select
                      name="savingsGoalId"
                      value={formData.savingsGoalId}
                      onChange={handleChange}
                      className="form-select"
                      style={{ borderColor: 'var(--success-color)' }}
                    >
                      <option value="">-- {t('recurringBills.selectSavingsGoal') || 'Select a Savings Goal (Optional)'} --</option>
                      {activeSavingsGoals.map(goal => {
                        const currentAmount = goal.currentAmount ?? goal.current_amount ?? 0
                        const targetAmount = goal.targetAmount ?? goal.target_amount ?? 0

                        return (
                          <option key={goal.id} value={goal.id}>
                            {goal.name} - {formatCurrency(currentAmount)} / {formatCurrency(targetAmount)}
                          </option>
                        )
                      })}
                    </select>
                    <small className="form-hint">
                      {t('recurringBills.savingsGoalHint') || 'Marking this bill as paid will automatically add money to this savings goal.'}
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

            {/* File Upload Section for New Bill */}
            <FormSection title={t('recurringBills.attachments') || "Attachments"}>
              <div style={{ padding: '0 0.5rem' }}>
                <input
                  type="file"
                  multiple
                  onChange={handlePendingFileChange}
                  style={{ display: 'none' }}
                  id="form-attachment-upload"
                />
                <label htmlFor="form-attachment-upload" className="btn btn-secondary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', cursor: 'pointer', marginBottom: '1rem' }}>
                  <FiPlus /> {t('common.addAttachment') || "Add Attachment"}
                </label>

                {/* List pending files */}
                {pendingAttachments.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {pendingAttachments.map((file, idx) => (
                      <div key={idx} className="glass-card" style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                          {file.name}
                        </span>
                        <button type="button" onClick={() => removePendingAttachment(idx)} style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer' }}>
                          <FiX />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* For editing, show info about existing files */}
                {editingBill && editingBill.attachments && editingBill.attachments.length > 0 && (
                  <div style={{ marginTop: '1rem', padding: '8px', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '0.85rem' }}>
                    <FiAlertCircle style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                    {editingBill.attachments.length} existing attachments. Manage them from the bill card view.
                  </div>
                )}
              </div>
            </FormSection>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn btn-primary" disabled={formLoading}>
                {formLoading ? (
                  <><div className="spinner-small" style={{ marginRight: '8px' }}></div> {t('common.saving') || "Saving..."}</>
                ) : (
                  editingBill ? t('common.update') : t('common.create')
                )}
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
        loading={formLoading}
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

      {/* Delete Attachment Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteAttachmentModal.isOpen}
        onClose={() => setDeleteAttachmentModal({ isOpen: false, attachmentId: null, bill: null })}
        onConfirm={confirmDeleteAttachment}
        title={t('recurringBills.deleteAttachment') || "Delete Attachment?"}
        message={t('recurringBills.confirmDeleteAttachment') || "Are you sure you want to delete this attachment? This action cannot be undone."}
        confirmText={t('common.delete')}
        variant="danger"
      />

      {/* Attachments Modal */}
      {attachmentsModal.isOpen && (
        <InternalBillAttachmentsModal
          isOpen={attachmentsModal.isOpen}
          onClose={() => setAttachmentsModal({ isOpen: false, bill: null })}
          bill={attachmentsModal.bill}
          onUpload={handleUploadAttachment}
          onDelete={handleDeleteAttachment}
          t={t}
          formatDueDate={formatDueDate}
        />
      )}
    </div>
  )
}

/**
 * Internal Attachments Modal Component
 */
function InternalBillAttachmentsModal({ isOpen, onClose, bill, onUpload, onDelete, t, formatDueDate }) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = React.useRef(null)

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    await onUpload(file)
    setUploading(false)

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const attachments = bill?.attachments || []

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('recurringBills.attachments') || "Attachments"}
    >
      <div className="attachments-modal-content">
        <div className="upload-section">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
            id="attachment-upload"
          />
          <label htmlFor="attachment-upload" className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', cursor: uploading ? 'wait' : 'pointer' }}>
            {uploading ? (
              <><div className="spinner-small"></div> {t('common.uploading') || "Uploading..."}</>
            ) : (
              <><FiPlus /> {t('common.addAttachment') || "Add Attachment"}</>
            )}
          </label>
        </div>

        <div className="attachments-list" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {attachments.length === 0 ? (
            <div className="empty-attachments" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
              <FiPaperclip size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
              <p>{t('recurringBills.noAttachments') || "No attachments yet"}</p>
            </div>
          ) : (
            attachments.map(att => (
              <div key={att.id} className="attachment-item glass-card" style={{ display: 'flex', alignItems: 'center', padding: '10px', gap: '10px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                  <div className="file-icon" style={{ background: 'var(--primary-light)', padding: '8px', borderRadius: '50%', color: 'var(--primary)' }}>
                    <FiFileText />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <span className="file-name" style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={att.fileName}>
                      {att.fileName}
                    </span>
                    <span className="file-date" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {new Date(att.uploadedAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="file-actions" style={{ display: 'flex', gap: '4px' }}>
                  <a
                    href={att.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="icon-btn"
                    title={t('common.download')}
                    style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <FiDownload />
                  </a>
                  <button
                    className="icon-btn danger"
                    onClick={() => onDelete(att.id)}
                    title={t('common.delete')}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  )
}

/**
 * Bill Card Component
 */
function BillCard({ bill, onEdit, onDelete, onMarkPaid, onUnmark, onAttachments, isProcessing, getCategoryIcon, formatDueDate, getDaysUntil, t, status, formatCurrency, animationClass, isPrivate }) {
  /* Swipe Gesture Integration */
  const { handleTouchStart, handleTouchMove, handleTouchEnd, getSwipeProps } = useSwipeGesture({
    onSwipeLeft: () => onDelete(bill.id),
    onSwipeRight: () => onMarkPaid(bill.id, bill.amount, bill.notes),
    threshold: 80
  })

  const icon = getCategoryIcon(bill.category)
  const daysUntil = getDaysUntil(bill.nextDueDate || bill.next_due_date)
  const hasLoanLink = bill.notes && bill.notes.includes('[LOAN_REF:')
  const hasSavingsLink = bill.notes && bill.notes.includes('[SAVINGS_REF:')

  const swipeProps = getSwipeProps(bill.id)
  const offset = swipeProps.offset || 0
  const isSwipeRight = offset > 0
  const isSwipeLeft = offset < 0
  const swipeProgress = Math.min(100, (Math.abs(offset) / 80) * 100)

  const displayNotes = bill.notes
    ? bill.notes.replace(/\[LOAN_REF:[^\]]+\]/g, '').replace(/\[SAVINGS_REF:[^\]]+\]/g, '').trim()
    : ''

  return (
    <div
      className={`bill-card data-card ${status} ${animationClass || ''} ${swipeProps.className || ''}`}
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

      {/* Header: name, frequency, amount */}
      <div className="data-card-header">
        <div className="bill-header">
          <div className="bill-icon">{icon}</div>
          <div className="bill-info">
            <h3>
              {bill.name}
              {hasLoanLink && <FiLink className="linked-icon" title="Linked to Loan" style={{ marginLeft: '6px', color: 'var(--primary-color)' }} />}
              {hasSavingsLink && <FiTarget className="linked-icon" title="Linked to Savings Goal" style={{ marginLeft: '6px', color: 'var(--success-color)' }} />}
            </h3>
            <span className="bill-frequency">{t(`recurringBills.frequencies.${bill.frequency}`)}</span>
          </div>
        </div>
        <div className="bill-amount">
          <div className="add-to-calc-row">
            <span className={`amount ${isPrivate ? 'masked-number' : ''}`}>{formatCurrency(bill.amount)}</span>
            {(bill.autoPay ?? bill.auto_pay) && <span className="auto-pay-badge">{t('recurringBills.autoPayEnabled')}</span>}
            <AddToCalculatorButton value={bill.amount} isPrivate={isPrivate} size={16} />
          </div>
        </div>
      </div>

      {/* Body: notes with line-clamp */}
      <div className="data-card-body">
        {displayNotes ? (
          <div className="bill-notes">
            <p>{displayNotes}</p>
          </div>
        ) : null}
      </div>

      {/* Meta: due date and attachments link */}
      <div className="data-card-meta">
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
        <div className="bill-extras" style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button
            type="button"
            className="btn-text-icon"
            onClick={(e) => { e.stopPropagation(); onAttachments(bill); }}
            onTouchEnd={(e) => { e.stopPropagation(); }}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'transparent', border: 'none', padding: '4px 0', cursor: 'pointer' }}
          >
            <FiPaperclip />
            {bill.attachments?.length > 0 ? (
              <span>{bill.attachments.length} {t('recurringBills.attachments') || "Attachments"}</span>
            ) : (
              <span>{t('common.addAttachment') || "Add Attachment"}</span>
            )}
          </button>
        </div>
      </div>

      {/* Actions: edit, delete, unmark, mark paid */}
      <div className="data-card-actions bill-actions-row">
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="icon-btn"
            onClick={() => onEdit(bill)}
            title={t('common.edit')}
          >
            <FiEdit />
          </button>
          <button
            type="button"
            className="icon-btn danger"
            onClick={() => onDelete(bill.id)}
            title={t('common.delete')}
          >
            <FiTrash2 />
          </button>
        </div>
        <div className="bill-footer" style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flex: 1, minWidth: 0 }}>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => onUnmark(bill)}
            title={t('recurringBills.unmarkPaid') || "Revert Last Payment"}
          >
            <FiRotateCcw />
          </button>
          <button
            type="button"
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
    </div>
  )
}

export default RecurringBills

