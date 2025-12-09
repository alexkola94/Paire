import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect, useMemo, useCallback, lazy, Suspense, memo } from 'react'
import { useTranslation } from 'react-i18next'
import PageTransition from './PageTransition'
import {
  FiHome,
  FiTrendingDown,
  FiTrendingUp,
  FiUser,
  FiMenu,
  FiX,
  FiLogOut,
  FiBarChart2,
  FiTarget,
  FiUsers,
  FiBell,
  FiShoppingCart,
  FiPieChart,
  FiMoreHorizontal,
  FiChevronDown,
  FiActivity,
  FiAward
} from 'react-icons/fi'

// Euro icon component to replace dollar sign - memoized to prevent re-renders
const EuroIcon = memo(({ size = 24, className = '', style = {} }) => {
  const iconSize = style?.width || style?.height || size
  return (
    <span
      className={`euro-icon ${className}`}
      style={{
        fontSize: typeof iconSize === 'string' ? iconSize : `${iconSize}px`,
        fontWeight: 'bold',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style
      }}
    >
      €
    </span>
  )
})
EuroIcon.displayName = 'EuroIcon'

import { authService } from '../services/auth'
import LogoLoader from './LogoLoader'
// Lazy load Chatbot - it's not critical for initial render
const Chatbot = lazy(() => import('./Chatbot'))
import './Layout.css'

/**
 * Layout Component
 * Provides consistent navigation and structure for all pages
 * Mobile-first approach with responsive navigation
 */
function Layout() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const moreMenuRef = useRef(null)

  // Memoize navigation items to prevent recreation on every render
  // Primary navigation items (always visible on desktop)
  // Include i18n.language in dependencies to update immediately when language changes
  const mainNavItems = useMemo(() => [
    { path: '/dashboard', icon: FiHome, label: t('navigation.dashboard') },
    { path: '/expenses', icon: FiTrendingDown, label: t('navigation.expenses') },
    { path: '/income', icon: FiTrendingUp, label: t('navigation.income') },
    { path: '/budgets', icon: FiTarget, label: t('navigation.budgets') },
    { path: '/recurring-bills', icon: FiBell, label: t('navigation.recurringBills') },
    { path: '/shopping-lists', icon: FiShoppingCart, label: t('navigation.shoppingLists') },
    { path: '/loans', icon: EuroIcon, label: t('navigation.loans') },
  ], [t, i18n.language])

  // Secondary navigation items (inside "More" dropdown on desktop)
  // Include i18n.language in dependencies to update immediately when language changes
  const moreNavItems = useMemo(() => [
    { path: '/analytics', icon: FiBarChart2, label: t('navigation.analytics') },
    { path: '/partnership', icon: FiUsers, label: t('navigation.partnership') },
    { path: '/savings-goals', icon: FiPieChart, label: t('navigation.savingsGoals') },
    { path: '/achievements', icon: FiAward, label: t('navigation.achievements') },
  ], [t, i18n.language])

  // All navigation items (for mobile menu) - memoized
  const allNavItems = useMemo(() => [...mainNavItems, ...moreNavItems], [mainNavItems, moreNavItems])

  // Memoize handlers with useCallback to prevent unnecessary re-renders
  const handleLogout = useCallback(async () => {
    try {
      await authService.signOut()
      // Force reload to update session state in App.jsx
      window.location.reload()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }, [])

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen(prev => !prev)
  }, [])

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false)
  }, [])

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setMoreMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleMoreMenu = useCallback(() => {
    setMoreMenuOpen(prev => !prev)
  }, [])

  const handleMoreNavigation = useCallback((path) => {
    navigate(path)
    setMoreMenuOpen(false)
    closeMobileMenu()
  }, [navigate, closeMobileMenu])

  const handleNavigation = useCallback((path) => {
    navigate(path)
    closeMobileMenu()
  }, [navigate, closeMobileMenu])

  const handleProfileNavigation = useCallback(() => {
    navigate('/profile')
    closeMobileMenu()
  }, [navigate, closeMobileMenu])

  return (
    <div className="layout">
      {/* Header */}
      <header className="layout-header">
        <div className="header-content">
          <div className="header-left">
            <div className="header-brand">
              <img
                src="/paire-logo.svg"
                alt="Paire"
                className="header-logo"
                width="36"
                height="36"
              />
              <div className="header-text">
                <h1 className="app-title">{t('app.title')}</h1>
                <p className="app-tagline">{t('app.tagline')}</p>
              </div>
            </div>
          </div>

          {/* Header actions - right side */}
          <div className="header-actions">
            {/* Economic News - desktop only */}
            <span
              className="header-icon-btn news-button desktop-only"
              onClick={() => handleNavigation('/economic-news')}
              aria-label={t('navigation.economicNews')}
              title={t('navigation.economicNews')}
              role="button"
              tabIndex={0}
            >
              <FiActivity size={22} />
            </span>

            {/* Notifications bell - desktop only */}
            <span
              className="header-icon-btn desktop-only"
              onClick={() => handleNavigation('/reminders')}
              aria-label={t('navigation.reminders')}
              title={t('navigation.reminders')}
              role="button"
              tabIndex={0}
            >
              <FiBell size={22} />
            </span>

            {/* Profile button - desktop only */}
            <span
              className="header-icon-btn desktop-only"
              onClick={handleProfileNavigation}
              aria-label={t('navigation.profile')}
              title={t('navigation.profile')}
              role="button"
              tabIndex={0}
            >
              <FiUser size={22} />
            </span>

            {/* Logout button - desktop only */}
            <span
              className="header-icon-btn desktop-only"
              onClick={handleLogout}
              aria-label={t('auth.logout')}
              title={t('auth.logout')}
              role="button"
              tabIndex={0}
            >
              <FiLogOut size={22} />
            </span>

            {/* Mobile menu toggle */}
            <span
              className="mobile-menu-toggle"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
              role="button"
              tabIndex={0}
            >
              {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </span>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className={`layout-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Mobile close button */}
        <div className="mobile-nav-header mobile-only">
          <button
            className="mobile-nav-close-btn"
            onClick={closeMobileMenu}
            aria-label={t('common.close')}
            title={t('common.close')}
          >
            <FiX size={24} />
            <span className="mobile-nav-close-text">{t('common.close')}</span>
          </button>
        </div>
        <ul className="nav-list">
          {/* Primary navigation items */}
          {mainNavItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'active' : ''}`
                }
                onClick={closeMobileMenu}
                title={item.label}
              >
                <item.icon style={{ width: '20px', height: '20px' }} className="nav-icon" />
                <span className="nav-label">{item.label}</span>
              </NavLink>
            </li>
          ))}

          {/* More dropdown - Desktop/Tablet */}
          <li className="more-menu-container desktop-only" ref={moreMenuRef}>
            <button
              className={`nav-link more-btn ${moreMenuOpen ? 'active' : ''}`}
              onClick={toggleMoreMenu}
              title={t('navigation.more')}
            >
              <FiMoreHorizontal style={{ width: '20px', height: '20px' }} className="nav-icon" />
              <span className="nav-label">{t('navigation.more')}</span>
              <FiChevronDown
                style={{ width: '16px', height: '16px' }}
                className={`more-chevron ${moreMenuOpen ? 'open' : ''}`}
              />
            </button>

            {moreMenuOpen && (
              <div className="more-dropdown">
                {moreNavItems.map((item) => (
                  <button
                    key={item.path}
                    className="more-dropdown-item"
                    onClick={() => handleMoreNavigation(item.path)}
                  >
                    <item.icon style={{ width: '18px', height: '18px' }} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </li>

          {/* Mobile section divider */}
          <li className="mobile-section-divider mobile-only">
            <span className="section-label">{t('navigation.more')}</span>
          </li>

          {/* Secondary navigation items - Mobile only (shown in More section) */}
          {moreNavItems.map((item) => (
            <li key={item.path} className="mobile-only">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'active' : ''}`
                }
                onClick={closeMobileMenu}
                title={item.label}
              >
                <item.icon style={{ width: '20px', height: '20px' }} className="nav-icon" />
                <span className="nav-label">{item.label}</span>
              </NavLink>
            </li>
          ))}

          {/* Mobile section divider for account */}
          <li className="mobile-section-divider mobile-only">
            <span className="section-label">{t('navigation.account')}</span>
          </li>

          {/* Mobile-only account items */}
          <li className="mobile-only">
            <NavLink
              to="/reminders"
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
              onClick={closeMobileMenu}
            >
              <FiBell style={{ width: '20px', height: '20px' }} className="nav-icon" />
              <span className="nav-label">{t('navigation.reminders')}</span>
            </NavLink>
          </li>
          <li className="mobile-only">
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
              onClick={closeMobileMenu}
            >
              <FiUser style={{ width: '20px', height: '20px' }} className="nav-icon" />
              <span className="nav-label">{t('navigation.profile')}</span>
            </NavLink>
          </li>

          {/* Mobile logout button */}
          <li className="mobile-only">
            <button
              className="nav-link logout-mobile"
              onClick={handleLogout}
            >
              <FiLogOut style={{ width: '20px', height: '20px' }} className="nav-icon" />
              <span className="nav-label">{t('auth.logout')}</span>
            </button>
          </li>
        </ul>
      </nav>



      {/* Main Content */}
      <main className="layout-main">
        <PageTransition>
          <Suspense fallback={<div className="h-full w-full flex items-center justify-center"><LogoLoader /></div>}>
            <Outlet />
          </Suspense>
        </PageTransition>
      </main>

      {/* Overlay for mobile menu */}
      {mobileMenuOpen && (
        <div
          className="mobile-overlay"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Floating Chatbot - Available on all pages - Lazy loaded */}
      <Suspense fallback={null}>
        <Chatbot />
      </Suspense>
    </div>
  )
}

export default memo(Layout)

