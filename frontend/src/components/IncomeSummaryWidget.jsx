import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiTrendingUp, FiArrowRight } from 'react-icons/fi'
import useCurrencyFormatter from '../hooks/useCurrencyFormatter'
import './SummaryWidget.css'

/**
 * IncomeSummaryWidget - Shows monthly income summary
 */
export default function IncomeSummaryWidget({ transactions = [], dateRange }) {
    const { t } = useTranslation()
    const formatCurrency = useCurrencyFormatter()

    const summary = useMemo(() => {
        const monthIncome = transactions.filter(tx =>
            tx.type === 'income' &&
            new Date(tx.date) >= dateRange?.startOfMonth &&
            new Date(tx.date) <= dateRange?.endOfMonth
        )

        const total = monthIncome.reduce((sum, tx) => sum + tx.amount, 0)
        const count = monthIncome.length

        // Top source
        const sourceTotals = {}
        monthIncome.forEach(tx => {
            sourceTotals[tx.category] = (sourceTotals[tx.category] || 0) + tx.amount
        })
        const topSource = Object.entries(sourceTotals)
            .sort((a, b) => b[1] - a[1])[0]

        return { total, count, topSource }
    }, [transactions, dateRange])

    return (
        <div className="summary-widget income-summary">
            <div className="summary-main">
                <div className="summary-icon income-icon">
                    <FiTrendingUp size={24} />
                </div>
                <div className="summary-data">
                    <span className="summary-label">{t('common.thisMonth')}</span>
                    <span className="summary-value income-value">
                        {formatCurrency(summary.total)}
                    </span>
                </div>
            </div>

            <div className="summary-stats">
                <div className="stat-item">
                    <span className="stat-value">{summary.count}</span>
                    <span className="stat-label">{t('common.transactions')}</span>
                </div>
                {summary.topSource && (
                    <div className="stat-item">
                        <span className="stat-value">{t(`categories.${summary.topSource[0]}`)}</span>
                        <span className="stat-label">{t('common.topSource', 'Top')}</span>
                    </div>
                )}
            </div>

            <Link to="/income" className="summary-link">
                {t('common.viewAll')}
                <FiArrowRight size={16} />
            </Link>
        </div>
    )
}
