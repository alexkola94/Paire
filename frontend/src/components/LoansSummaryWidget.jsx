import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiDollarSign, FiArrowRight } from 'react-icons/fi'
import useCurrencyFormatter from '../hooks/useCurrencyFormatter'
import './SummaryWidget.css'

/**
 * LoansSummaryWidget - Shows active loans summary
 */
export default function LoansSummaryWidget({ loans = [] }) {
    const { t } = useTranslation()
    const formatCurrency = useCurrencyFormatter()

    const summary = useMemo(() => {
        const activeLoans = loans.filter(loan =>
            loan.status === 'active' || !loan.status
        )

        const given = activeLoans.filter(l => l.type === 'given')
        const received = activeLoans.filter(l => l.type === 'received')

        const totalGiven = given.reduce((sum, l) => sum + (l.remainingAmount || l.amount), 0)
        const totalReceived = received.reduce((sum, l) => sum + (l.remainingAmount || l.amount), 0)

        return {
            activeCount: activeLoans.length,
            givenCount: given.length,
            receivedCount: received.length,
            totalGiven,
            totalReceived,
            netBalance: totalGiven - totalReceived
        }
    }, [loans])

    return (
        <div className="summary-widget loans-summary">
            <div className="summary-main">
                <div className="summary-icon loan-icon">
                    <FiDollarSign size={24} />
                </div>
                <div className="summary-data">
                    <span className="summary-label">{t('loans.activeLoans', 'Active Loans')}</span>
                    <span className="summary-value loan-value">
                        {summary.activeCount}
                    </span>
                </div>
            </div>

            <div className="summary-stats">
                <div className="stat-item">
                    <span className="stat-value" style={{ color: '#22c55e' }}>
                        {formatCurrency(summary.totalGiven)}
                    </span>
                    <span className="stat-label">{t('loans.given', 'Lent')}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-value" style={{ color: '#ef4444' }}>
                        {formatCurrency(summary.totalReceived)}
                    </span>
                    <span className="stat-label">{t('loans.received', 'Borrowed')}</span>
                </div>
            </div>

            <Link to="/loans" className="summary-link">
                {t('common.viewAll')}
                <FiArrowRight size={16} />
            </Link>
        </div>
    )
}
