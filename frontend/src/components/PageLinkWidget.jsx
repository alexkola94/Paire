import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
    FiTrendingDown,
    FiTrendingUp,
    FiPieChart,
    FiDollarSign,
    FiShoppingCart,
    FiUsers,
    FiCalendar,
    FiBell,
    FiFileText,
    FiAward,
    FiGlobe,
    FiArrowRight
} from 'react-icons/fi'
import './PageLinkWidget.css'

// Map paths to icons
const PATH_ICONS = {
    '/expenses': FiTrendingDown,
    '/income': FiTrendingUp,
    '/analytics': FiPieChart,
    '/loans': FiDollarSign,
    '/shopping-lists': FiShoppingCart,
    '/partnership': FiUsers,
    '/recurring-bills': FiCalendar,
    '/reminders': FiBell,
    '/economic-news': FiFileText,
    '/achievements': FiAward,
    '/currency-calculator': FiGlobe
}

/**
 * PageLinkWidget - Quick navigation widget for a specific page
 */
export default function PageLinkWidget({ path, title }) {
    const { t } = useTranslation()
    const Icon = PATH_ICONS[path] || FiArrowRight

    return (
        <div className="page-link-widget">
            <Link to={path} className="page-link-card">
                <div className="page-link-icon">
                    <Icon size={32} />
                </div>
                <div className="page-link-content">
                    <p className="page-link-label">{t('common.goTo', 'Go to')}</p>
                    <h3 className="page-link-title">{t(title)}</h3>
                </div>
                <FiArrowRight className="page-link-arrow" size={24} />
            </Link>
        </div>
    )
}
