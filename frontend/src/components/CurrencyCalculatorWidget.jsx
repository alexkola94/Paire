import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiGlobe, FiArrowRight, FiRefreshCw } from 'react-icons/fi'
import useCurrencyFormatter from '../hooks/useCurrencyFormatter'
import './SummaryWidget.css'

/**
 * CurrencyCalculatorWidget - Quick currency conversion
 */
export default function CurrencyCalculatorWidget() {
    const { t } = useTranslation()
    const formatCurrency = useCurrencyFormatter()
    const [amount] = useState(100)

    // Placeholder rates (would normally come from API)
    const rate = 1.08 // EUR to USD rate

    return (
        <div className="summary-widget currency-summary">
            <div className="summary-main">
                <div className="summary-icon currency-icon">
                    <FiGlobe size={24} />
                </div>
                <div className="summary-data">
                    <span className="summary-label">EUR → USD</span>
                    <span className="summary-value" style={{ color: '#14b8a6' }}>
                        {formatCurrency(amount)} = ${(amount * rate).toFixed(2)}
                    </span>
                </div>
            </div>

            <div className="summary-stats">
                <div className="stat-item">
                    <span className="stat-value">1.08</span>
                    <span className="stat-label">{t('currency.rate', 'Rate')}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-value">
                        <FiRefreshCw size={14} style={{ marginRight: '4px' }} />
                        {t('common.live', 'Live')}
                    </span>
                    <span className="stat-label">{t('common.status')}</span>
                </div>
            </div>

            <Link to="/currency-calculator" className="summary-link">
                {t('currency.convert', 'Convert Currency')}
                <FiArrowRight size={16} />
            </Link>
        </div>
    )
}
