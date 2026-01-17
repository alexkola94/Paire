import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
    FiTrendingUp,
    FiTrendingDown,
    FiDollarSign,
    FiPieChart,
    FiTarget,
    FiCalendar,
    FiShoppingCart,
    FiUsers,
    FiBell,
    FiFileText,
    FiSettings,
    FiPlus,
    FiCheck,
    FiX,
    FiGlobe,
    FiAward
} from 'react-icons/fi'
import './QuickAccessWidget.css'

// Available routes for quick access
const AVAILABLE_ROUTES = [
    { path: '/expenses', icon: FiTrendingDown, labelKey: 'navigation.expenses', color: '#ef4444' },
    { path: '/income', icon: FiTrendingUp, labelKey: 'navigation.income', color: '#22c55e' },
    { path: '/analytics', icon: FiPieChart, labelKey: 'navigation.analytics', color: '#8b5cf6' },
    { path: '/budgets', icon: FiTarget, labelKey: 'navigation.budgets', color: '#f59e0b' },
    { path: '/savings-goals', icon: FiDollarSign, labelKey: 'navigation.savingsGoals', color: '#06b6d4' },
    { path: '/recurring-bills', icon: FiCalendar, labelKey: 'navigation.recurringBills', color: '#ec4899' },
    { path: '/loans', icon: FiDollarSign, labelKey: 'navigation.loans', color: '#14b8a6' },
    { path: '/shopping-lists', icon: FiShoppingCart, labelKey: 'navigation.shoppingLists', color: '#6366f1' },
    { path: '/partnership', icon: FiUsers, labelKey: 'navigation.partnership', color: '#f43f5e' },
    { path: '/reminders', icon: FiBell, labelKey: 'navigation.reminders', color: '#eab308' },
    { path: '/economic-news', icon: FiFileText, labelKey: 'navigation.economicNews', color: '#3b82f6' },
    { path: '/currency-calculator', icon: FiGlobe, labelKey: 'navigation.currencyCalculator', color: '#10b981' },
    { path: '/achievements', icon: FiAward, labelKey: 'navigation.achievements', color: '#f97316' },
    { path: '/profile', icon: FiSettings, labelKey: 'navigation.profile', color: '#64748b' }
]

const STORAGE_KEY = 'paire-quick-access-routes'
const DEFAULT_ROUTES = ['/currency-calculator', '/economic-news', '/analytics']
const MAX_SHORTCUTS = 8

/**
 * QuickAccessWidget - Customizable shortcuts to app pages
 */
export default function QuickAccessWidget({ editMode }) {
    const { t } = useTranslation()
    const [selectedRoutes, setSelectedRoutes] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            return saved ? JSON.parse(saved) : DEFAULT_ROUTES
        } catch {
            return DEFAULT_ROUTES
        }
    })
    const [showSelector, setShowSelector] = useState(false)

    // Persist to localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedRoutes))
    }, [selectedRoutes])

    const toggleRoute = useCallback((path) => {
        setSelectedRoutes(prev => {
            if (prev.includes(path)) {
                return prev.filter(p => p !== path)
            }
            if (prev.length >= MAX_SHORTCUTS) {
                return prev // Max reached
            }
            return [...prev, path]
        })
    }, [])

    const getRouteInfo = (path) => {
        return AVAILABLE_ROUTES.find(r => r.path === path)
    }

    return (
        <div className="quick-access-widget">
            {/* Shortcuts Grid */}
            <div className="shortcuts-grid">
                {selectedRoutes.map(path => {
                    const route = getRouteInfo(path)
                    if (!route) return null
                    const Icon = route.icon

                    return (
                        <Link
                            key={path}
                            to={path}
                            className="shortcut-btn"
                            style={{ '--accent-color': route.color }}
                        >
                            <div className="shortcut-icon">
                                <Icon size={20} />
                            </div>
                            <span className="shortcut-label">{t(route.labelKey)}</span>
                        </Link>
                    )
                })}

                {/* Add Shortcut Button (always visible in widget) */}
                <button
                    className="shortcut-btn add-shortcut-btn"
                    onClick={() => setShowSelector(true)}
                    aria-label={t('dashboard.addShortcut', 'Add Shortcut')}
                >
                    <div className="shortcut-icon">
                        {editMode ? <FiSettings size={20} /> : <FiPlus size={20} />}
                    </div>
                    <span className="shortcut-label">
                        {editMode ? t('common.edit') : t('common.add')}
                    </span>
                </button>
            </div>

            {/* Route Selector Modal */}
            {showSelector && (
                <div className="route-selector-overlay">
                    <div className="route-selector-modal" onClick={e => e.stopPropagation()}>
                        <div className="route-selector-header">
                            <h3>{t('dashboard.selectShortcuts', 'Select Shortcuts')}</h3>
                            <button className="close-btn" onClick={() => setShowSelector(false)}>
                                <FiX size={20} />
                            </button>
                        </div>

                        <p className="route-selector-hint">
                            {t('dashboard.shortcutHint', 'Choose up to {{max}} pages for quick access', { max: MAX_SHORTCUTS })}
                        </p>

                        <div className="route-list">
                            {AVAILABLE_ROUTES.map(route => {
                                const Icon = route.icon
                                const isSelected = selectedRoutes.includes(route.path)
                                const isDisabled = !isSelected && selectedRoutes.length >= MAX_SHORTCUTS

                                return (
                                    <button
                                        key={route.path}
                                        className={`route-option ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                                        onClick={() => !isDisabled && toggleRoute(route.path)}
                                        disabled={isDisabled}
                                        style={{ '--accent-color': route.color }}
                                    >
                                        <div className="route-icon">
                                            <Icon size={18} />
                                        </div>
                                        <span className="route-label">{t(route.labelKey)}</span>
                                        {isSelected && (
                                            <div className="route-check">
                                                <FiCheck size={16} />
                                            </div>
                                        )}
                                    </button>
                                )
                            })}
                        </div>

                        <div className="route-selector-footer">
                            <span className="selection-count">
                                {selectedRoutes.length} / {MAX_SHORTCUTS} {t('common.selected', 'selected')}
                            </span>
                            <button className="cancel-btn" onClick={() => setShowSelector(false)}>
                                {t('common.cancel')}
                            </button>
                            <button className="done-btn" onClick={() => setShowSelector(false)}>
                                {t('common.save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
