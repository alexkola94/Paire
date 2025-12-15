import { NavLink } from 'react-router-dom'
import { createPortal } from 'react-dom'
import {
    FiHome,
    FiTrendingDown,
    FiTrendingUp,
    FiUser,
    FiPlus
} from 'react-icons/fi'
import { memo, useState, useEffect } from 'react'
import './BottomNavigation.css'
import { useTranslation } from 'react-i18next'

const BottomNavigation = () => {
    const { t } = useTranslation()
    const [showFabMenu, setShowFabMenu] = useState(false)

    return (
        <nav className="bottom-nav">
            <div className="bottom-nav-container">
                <NavLink to="/dashboard" className="nav-item">
                    <div className="icon-container">
                        <FiHome size={24} />
                    </div>
                    <span className="nav-label">{t('navigation.dashboard')}</span>
                </NavLink>

                <NavLink to="/expenses" className="nav-item">
                    <div className="icon-container">
                        <FiTrendingDown size={24} />
                    </div>
                    <span className="nav-label">{t('navigation.expenses')}</span>
                </NavLink>

                {/* Floating Action Button (FAB) replacement for middle item */}
                <div className="nav-item fab-container">
                    {/* FAB Menu - Rendered in Portal to sit above backdrop */}
                    {createPortal(
                        <div className={`fab-menu ${showFabMenu ? 'open' : ''}`}>
                            <NavLink
                                to="/income?action=add"
                                className="fab-menu-item income"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <FiTrendingUp size={20} />
                                <span>{t('income.addIncome')}</span>
                            </NavLink>
                            <NavLink
                                to="/expenses?action=add"
                                className="fab-menu-item expense"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <FiTrendingDown size={20} />
                                <span>{t('expenses.addExpense')}</span>
                            </NavLink>
                        </div>,
                        document.body
                    )}

                    <button
                        className={`fab-button ${showFabMenu ? 'active' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation()
                            setShowFabMenu(!showFabMenu)
                        }}
                        aria-label="Quick Add"
                        aria-expanded={showFabMenu}
                    >
                        <FiPlus size={28} />
                    </button>

                    {/* Backdrop to close menu when clicking outside - Rendered in Portal */}
                    {showFabMenu && createPortal(
                        <div
                            className="fab-backdrop"
                            onClick={(e) => {
                                e.stopPropagation()
                                setShowFabMenu(false)
                            }}
                        />,
                        document.body
                    )}
                </div>

                <NavLink to="/income" className="nav-item">
                    <div className="icon-container">
                        <FiTrendingUp size={24} />
                    </div>
                    <span className="nav-label">{t('navigation.income')}</span>
                </NavLink>

                <NavLink to="/profile" className="nav-item">
                    <div className="icon-container">
                        <FiUser size={24} />
                    </div>
                    <span className="nav-label">{t('navigation.profile')}</span>
                </NavLink>
            </div>
        </nav>
    )
}

export default memo(BottomNavigation)
