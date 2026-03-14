import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiFileText, FiArrowRight, FiTrendingUp, FiTrendingDown } from 'react-icons/fi'
import './SummaryWidget.css'

/**
 * EconomicNewsSummaryWidget - Shows latest news summary
 */
export default function EconomicNewsSummaryWidget({ data }) {
    const { t } = useTranslation()

    // Default values if no data provided
    const indicators = data?.indicators || {}
    const cpi = data?.cpi || {}

    // Format change helper
    const renderChange = (change) => {
        if (!change && change !== 0) return null
        const isPositive = change >= 0
        const Icon = isPositive ? FiTrendingUp : FiTrendingDown
        const color = isPositive ? '#22c55e' : '#ef4444'
        return <Icon size={16} style={{ color }} />
    }

    return (
        <div className="summary-widget news-summary">
            <div className="summary-main">
                <div className="summary-icon news-icon">
                    <FiFileText size={24} />
                </div>
                <div className="summary-data">
                    <span className="summary-label">{t('economicNews.title', 'Economic News')}</span>
                    <span className="summary-value" style={{ color: '#3b82f6', fontSize: '1rem' }}>
                        {cpi.currentRate ? `${cpi.currentRate.toFixed(1)}% CPI` : t('economicNews.latestUpdates', 'Latest Updates')}
                    </span>
                </div>
            </div>

            <div className="summary-stats">
                <div className="stat-item">
                    <span className="stat-value">
                        {indicators.inflation?.value ? `${indicators.inflation.value}%` : '—'}
                        {renderChange(indicators.inflation?.change)}
                    </span>
                    <span className="stat-label">{t('economicNews.indicators.inflation', 'Inflation')}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-value">
                        {indicators.gdp?.value ? `${indicators.gdp.value}%` : '—'}
                        {renderChange(indicators.gdp?.change)}
                    </span>
                    <span className="stat-label">{t('economicNews.indicators.gdp', 'GDP')}</span>
                </div>
            </div>

            <Link to="/economic-news" className="summary-link">
                {t('economicNews.readMore', 'Read News')}
                <FiArrowRight size={16} />
            </Link>
        </div>
    )
}
