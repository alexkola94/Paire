import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiTrendingDown, FiArrowRight } from 'react-icons/fi'
import useCurrencyFormatter from '../hooks/useCurrencyFormatter'
import './SummaryWidget.css'

/**
 * ExpensesSummaryWidget - Shows monthly expenses summary
 */
export default function ExpensesSummaryWidget({ transactions = [], dateRange }) {
    const { t } = useTranslation()
    const formatCurrency = useCurrencyFormatter()

    const summary = useMemo(() => {
        const monthExpenses = transactions.filter(tx =>
            tx.type === 'expense' &&
            new Date(tx.date) >= dateRange?.startOfMonth &&
            new Date(tx.date) <= dateRange?.endOfMonth
        )

        const total = monthExpenses.reduce((sum, tx) => sum + tx.amount, 0)
        const count = monthExpenses.length

        // Top category
        const categoryTotals = {}
        monthExpenses.forEach(tx => {
            categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount
        })
        const topCategory = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])[0]

        return { total, count, topCategory }
    }, [transactions, dateRange])

    return (
        <div className="summary-widget expenses-summary">
            <div className="summary-main">
                <div className="summary-icon expense-icon">
                    <FiTrendingDown size={24} />
                </div>
                <div className="summary-data">
                    <span className="summary-label">{t('common.thisMonth')}</span>
                    <span className="summary-value expense-value">
                        {formatCurrency(summary.total)}
                    </span>
                </div>
            </div>

            <div className="summary-stats">
                <div className="stat-item">
                    <span className="stat-value">{summary.count}</span>
                    <span className="stat-label">{t('common.transactions')}</span>
                </div>
                {summary.topCategory && (
                    <div className="stat-item">
                        <span className="stat-value">{t(`categories.${summary.topCategory[0]}`)}</span>
                        <span className="stat-label">{t('common.topCategory', 'Top')}</span>
                    </div>
                )}
            </div>

            <Link to="/expenses" className="summary-link">
                {t('common.viewAll')}
                <FiArrowRight size={16} />
            </Link>
        </div>
    )
}
