import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiCalendar, FiArrowRight, FiAlertCircle } from 'react-icons/fi'
import useCurrencyFormatter from '../hooks/useCurrencyFormatter'
import './SummaryWidget.css'

/**
 * RecurringBillsSummaryWidget - Shows upcoming bills summary
 */
export default function RecurringBillsSummaryWidget({ bills = [] }) {
    const { t } = useTranslation()
    const formatCurrency = useCurrencyFormatter()

    const summary = useMemo(() => {
        const now = new Date()
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

        const upcoming = bills.filter(bill => {
            const nextDue = new Date(bill.nextDueDate)
            return nextDue <= endOfMonth && !bill.isPaid
        })

        const overdue = bills.filter(bill => {
            const nextDue = new Date(bill.nextDueDate)
            return nextDue < now && !bill.isPaid
        })

        const totalDue = upcoming.reduce((sum, bill) => sum + bill.amount, 0)

        return {
            upcomingCount: upcoming.length,
            overdueCount: overdue.length,
            totalDue
        }
    }, [bills])

    return (
        <div className="summary-widget recurring-summary">
            <div className="summary-main">
                <div className={`summary-icon ${summary.overdueCount > 0 ? 'overdue-icon' : 'bill-icon'}`}>
                    {summary.overdueCount > 0 ? <FiAlertCircle size={24} /> : <FiCalendar size={24} />}
                </div>
                <div className="summary-data">
                    <span className="summary-label">{t('recurringBills.dueThisMonth', 'Due This Month')}</span>
                    <span className="summary-value" style={{ color: summary.overdueCount > 0 ? '#ef4444' : '#ec4899' }}>
                        {formatCurrency(summary.totalDue)}
                    </span>
                </div>
            </div>

            <div className="summary-stats">
                <div className="stat-item">
                    <span className="stat-value">{summary.upcomingCount}</span>
                    <span className="stat-label">{t('recurringBills.upcoming', 'Upcoming')}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-value" style={{ color: summary.overdueCount > 0 ? '#ef4444' : 'inherit' }}>
                        {summary.overdueCount}
                    </span>
                    <span className="stat-label">{t('recurringBills.overdue', 'Overdue')}</span>
                </div>
            </div>

            <Link to="/recurring-bills" className="summary-link">
                {t('common.viewAll')}
                <FiArrowRight size={16} />
            </Link>
        </div>
    )
}
