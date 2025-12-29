import { memo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { FiCalendar, FiAlertCircle, FiCheck, FiArrowRight, FiClock } from 'react-icons/fi'
import { recurringBillService } from '../services/api'
import { format, differenceInDays, startOfDay } from 'date-fns'
import Skeleton from './Skeleton'
import './UpcomingBillsWidget.css'

/**
 * Upcoming Bills Widget
 * Displays the next 3-5 bills due with countdown and quick actions
 */
const UpcomingBillsWidget = memo(function UpcomingBillsWidget({
    maxItems = 4,
    formatCurrency
}) {
    const { t } = useTranslation()

    // Fetch upcoming bills using React Query
    const { data: bills = [], isLoading } = useQuery({
        queryKey: ['upcomingBills', 14], // 14 days ahead
        queryFn: () => recurringBillService.getUpcoming(14),
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false
    })

    // Calculate days until due
    const getDaysUntil = (dueDate) => {
        const today = startOfDay(new Date())
        const due = startOfDay(new Date(dueDate))
        return differenceInDays(due, today)
    }

    // Filter active bills and sort by due date
    const upcomingBills = bills
        .filter(b => (b.isActive ?? b.is_active) !== false)
        .sort((a, b) => {
            const dateA = new Date(a.nextDueDate || a.next_due_date)
            const dateB = new Date(b.nextDueDate || b.next_due_date)
            return dateA - dateB
        })
        .slice(0, maxItems)

    // Count overdue bills
    const overdueCount = bills.filter(b => {
        const dueDate = new Date(b.nextDueDate || b.next_due_date)
        return getDaysUntil(dueDate) < 0 && (b.isActive ?? b.is_active) !== false
    }).length

    if (isLoading) {
        return (
            <div className="upcoming-bills-widget">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bill-item-skeleton">
                        <Skeleton type="circular" width="40px" height="40px" />
                        <div style={{ flex: 1 }}>
                            <Skeleton height="16px" width="60%" style={{ marginBottom: '4px' }} />
                            <Skeleton height="12px" width="40%" />
                        </div>
                        <Skeleton height="20px" width="60px" />
                    </div>
                ))}
            </div>
        )
    }

    if (upcomingBills.length === 0) {
        return (
            <div className="upcoming-bills-widget empty">
                <FiCalendar size={32} className="empty-icon" />
                <p>{t('recurringBills.noBillsUpcoming') || 'No bills due soon'}</p>
                <Link to="/recurring-bills" className="btn btn-sm btn-outline">
                    {t('recurringBills.addBill') || 'Add Bill'}
                </Link>
            </div>
        )
    }

    return (
        <div className="upcoming-bills-widget">
            {/* Overdue Alert */}
            {overdueCount > 0 && (
                <div className="overdue-alert">
                    <FiAlertCircle size={16} />
                    <span>
                        {overdueCount} {t('recurringBills.overdue') || 'overdue'}
                    </span>
                </div>
            )}

            {/* Bills List */}
            <div className="bills-list">
                {upcomingBills.map(bill => {
                    const dueDate = new Date(bill.nextDueDate || bill.next_due_date)
                    const daysUntil = getDaysUntil(dueDate)
                    const isOverdue = daysUntil < 0
                    const isDueSoon = daysUntil >= 0 && daysUntil <= 3

                    return (
                        <div
                            key={bill.id}
                            className={`bill-item ${isOverdue ? 'overdue' : ''} ${isDueSoon ? 'due-soon' : ''}`}
                        >
                            <div className="bill-countdown">
                                {isOverdue ? (
                                    <FiAlertCircle size={20} className="overdue-icon" />
                                ) : daysUntil === 0 ? (
                                    <span className="countdown-today">{t('recurringBills.today') || 'Today'}</span>
                                ) : (
                                    <>
                                        <span className="countdown-number">{daysUntil}</span>
                                        <span className="countdown-label">{t('recurringBills.days') || 'days'}</span>
                                    </>
                                )}
                            </div>

                            <div className="bill-info">
                                <span className="bill-name">{bill.name}</span>
                                <span className="bill-date">
                                    <FiClock size={12} />
                                    {format(dueDate, 'MMM d')}
                                </span>
                            </div>

                            <div className="bill-amount">
                                {formatCurrency(bill.amount)}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* View All Link */}
            <Link to="/recurring-bills" className="view-all-link" style={{ marginTop: '0.75rem' }}>
                {t('common.viewAll') || 'View All'}
                <FiArrowRight size={14} />
            </Link>
        </div>
    )
})

export default UpcomingBillsWidget
