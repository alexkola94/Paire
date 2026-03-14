import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiAward, FiArrowRight, FiStar } from 'react-icons/fi'
import './SummaryWidget.css'

/**
 * AchievementsSummaryWidget - Shows achievements progress
 */
export default function AchievementsSummaryWidget({ achievements = [] }) {
    const { t } = useTranslation()

    const unlockedCount = achievements.filter(a => a.isUnlocked).length
    const totalCount = achievements.length || 10 // Default placeholder
    const progress = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0

    return (
        <div className="summary-widget achievements-summary">
            <div className="summary-main">
                <div className="summary-icon achievement-icon">
                    <FiAward size={24} />
                </div>
                <div className="summary-data">
                    <span className="summary-label">{t('achievements.unlocked', 'Unlocked')}</span>
                    <span className="summary-value" style={{ color: '#f59e0b' }}>
                        {unlockedCount} / {totalCount}
                    </span>
                </div>
            </div>

            <div className="summary-stats">
                <div className="stat-item">
                    <span className="stat-value">{progress}%</span>
                    <span className="stat-label">{t('achievements.progress', 'Progress')}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-value">
                        <FiStar size={14} style={{ marginRight: '4px', color: '#f59e0b' }} />
                        {unlockedCount > 0 ? t('common.active') : t('common.start', 'Start!')}
                    </span>
                    <span className="stat-label">{t('common.status')}</span>
                </div>
            </div>

            <Link to="/achievements" className="summary-link">
                {t('achievements.viewAll', 'View Achievements')}
                <FiArrowRight size={16} />
            </Link>
        </div>
    )
}
