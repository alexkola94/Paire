import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiUsers, FiArrowRight, FiHeart } from 'react-icons/fi'
import './SummaryWidget.css'

/**
 * PartnershipSummaryWidget - Shows partnership status
 */
export default function PartnershipSummaryWidget({ partner }) {
    const { t } = useTranslation()

    const hasPartner = !!partner

    return (
        <div className="summary-widget partnership-summary">
            <div className="summary-main">
                <div className="summary-icon partner-icon">
                    {hasPartner ? <FiHeart size={24} /> : <FiUsers size={24} />}
                </div>
                <div className="summary-data">
                    <span className="summary-label">{t('partnership.partner', 'Partner')}</span>
                    <span className="summary-value" style={{ color: '#f43f5e' }}>
                        {hasPartner ? partner.name || partner.email : t('partnership.noPartner', 'Not linked')}
                    </span>
                </div>
            </div>

            <div className="summary-stats">
                <div className="stat-item">
                    <span className="stat-value">{hasPartner ? '✓' : '—'}</span>
                    <span className="stat-label">{t('partnership.status', 'Status')}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-value">{hasPartner ? t('partnership.linked') : t('partnership.pending', 'Pending')}</span>
                    <span className="stat-label">{t('partnership.connection', 'Connection')}</span>
                </div>
            </div>

            <Link to="/partnership" className="summary-link">
                {hasPartner ? t('common.manage') : t('partnership.linkPartner', 'Link Partner')}
                <FiArrowRight size={16} />
            </Link>
        </div>
    )
}
