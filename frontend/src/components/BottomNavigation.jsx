import { NavLink } from 'react-router-dom'
import {
    FiHome,
    FiTrendingDown,
    FiTrendingUp,
    FiUser,
    FiPlus
} from 'react-icons/fi'
import { memo } from 'react'
import './BottomNavigation.css'
import { useTranslation } from 'react-i18next'

const BottomNavigation = () => {
    const { t } = useTranslation()

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
                    <NavLink to="/expenses" className="fab-button" aria-label="Quick Add">
                        <FiPlus size={28} />
                    </NavLink>
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
