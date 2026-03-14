import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiShoppingCart, FiArrowRight } from 'react-icons/fi'
import './SummaryWidget.css'

/**
 * ShoppingListsSummaryWidget - Shows shopping lists summary
 */
export default function ShoppingListsSummaryWidget({ shoppingLists = [] }) {
    const { t } = useTranslation()

    const summary = useMemo(() => {
        const activeLists = shoppingLists.filter(list => !list.isArchived)

        let totalItems = 0
        let completedItems = 0

        activeLists.forEach(list => {
            if (list.items) {
                totalItems += list.items.length
                completedItems += list.items.filter(item => item.isCompleted).length
            }
        })

        return {
            activeCount: activeLists.length,
            totalItems,
            pendingItems: totalItems - completedItems
        }
    }, [shoppingLists])

    return (
        <div className="summary-widget shopping-summary">
            <div className="summary-main">
                <div className="summary-icon shopping-icon">
                    <FiShoppingCart size={24} />
                </div>
                <div className="summary-data">
                    <span className="summary-label">{t('shoppingLists.activeLists', 'Active Lists')}</span>
                    <span className="summary-value" style={{ color: '#6366f1' }}>
                        {summary.activeCount}
                    </span>
                </div>
            </div>

            <div className="summary-stats">
                <div className="stat-item">
                    <span className="stat-value">{summary.totalItems}</span>
                    <span className="stat-label">{t('shoppingLists.totalItems', 'Total Items')}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-value" style={{ color: '#f59e0b' }}>
                        {summary.pendingItems}
                    </span>
                    <span className="stat-label">{t('shoppingLists.pending', 'To Buy')}</span>
                </div>
            </div>

            <Link to="/shopping-lists" className="summary-link">
                {t('common.viewAll')}
                <FiArrowRight size={16} />
            </Link>
        </div>
    )
}
