import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiBell, FiArrowRight, FiClock } from 'react-icons/fi'
import './SummaryWidget.css'

/**
 * RemindersSummaryWidget - Shows pending reminders summary
 */
export default function RemindersSummaryWidget({ reminders = [] }) {
    const { t } = useTranslation()

    const pendingCount = reminders.filter(r => !r.isCompleted).length
    const todayCount = reminders.filter(r => {
        const today = new Date()
        const reminderDate = new Date(r.date)
        return !r.isCompleted &&
            reminderDate.toDateString() === today.toDateString()
    }).length

    return (
        <div className="summary-widget reminders-summary">
            <div className="summary-main">
                <div className="summary-icon reminder-icon">
                    <FiBell size={24} />
                </div>
                <div className="summary-data">
                    <span className="summary-label">{t('reminders.pending', 'Pending')}</span>
                    <span className="summary-value" style={{ color: '#eab308' }}>
                        {pendingCount}
                    </span>
                </div>
            </div>

            <div className="summary-stats">
                <div className="stat-item">
                    <span className="stat-value">{todayCount}</span>
                    <span className="stat-label">{t('reminders.today', 'Today')}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-value">
                        <FiClock size={14} style={{ marginRight: '4px' }} />
                        {pendingCount > 0 ? t('common.active') : t('common.none')}
                    </span>
                    <span className="stat-label">{t('common.status')}</span>
                </div>
            </div>

            <Link to="/reminders" className="summary-link">
                {t('reminders.manage', 'Manage Reminders')}
                <FiArrowRight size={16} />
            </Link>
        </div>
    )
}
