import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiPieChart, FiArrowRight, FiTrendingUp, FiTrendingDown } from 'react-icons/fi'
import useCurrencyFormatter from '../hooks/useCurrencyFormatter'
import './SummaryWidget.css'

/**
 * AnalyticsSummaryWidget - Shows key financial insights
 */
export default function AnalyticsSummaryWidget({ transactions = [], dateRange }) {
    const { t } = useTranslation()
    const formatCurrency = useCurrencyFormatter()

    const summary = useMemo(() => {
        const monthTx = transactions.filter(tx =>
            new Date(tx.date) >= dateRange?.startOfMonth &&
            new Date(tx.date) <= dateRange?.endOfMonth
        )

        const income = monthTx.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0)
        const expenses = monthTx.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0)
        const savings = income - expenses
        const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(0) : 0

        return {
            income,
            expenses,
            savings,
            savingsRate
        }
    }, [transactions, dateRange])

    const isSaving = summary.savings >= 0

    return (
        <div className="summary-widget analytics-summary">
            <div className="summary-main">
                <div className="summary-icon analytics-icon">
                    <FiPieChart size={24} />
                </div>
                <div className="summary-data">
                    <span className="summary-label">{t('analytics.monthlyBalance', 'Monthly Balance')}</span>
                    <span className="summary-value" style={{ color: isSaving ? '#22c55e' : '#ef4444' }}>
                        {isSaving ? '+' : ''}{formatCurrency(summary.savings)}
                    </span>
                </div>
            </div>

            <div className="summary-stats">
                <div className="stat-item">
                    <span className="stat-value" style={{ color: '#22c55e' }}>
                        <FiTrendingUp size={14} style={{ marginRight: '4px' }} />
                        {formatCurrency(summary.income)}
                    </span>
                    <span className="stat-label">{t('common.income')}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-value" style={{ color: '#ef4444' }}>
                        <FiTrendingDown size={14} style={{ marginRight: '4px' }} />
                        {formatCurrency(summary.expenses)}
                    </span>
                    <span className="stat-label">{t('common.expenses')}</span>
                </div>
            </div>

            <Link to="/analytics" className="summary-link">
                {t('analytics.viewDetails', 'View Analytics')}
                <FiArrowRight size={16} />
            </Link>
        </div>
    )
}
