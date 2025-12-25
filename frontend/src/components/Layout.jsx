import { useNavigate, Outlet, NavLink } from 'react-router-dom'
import { useState, useRef, useEffect, useCallback, lazy, Suspense, memo } from 'react'
import { useTranslation } from 'react-i18next'

import { useTheme } from '../context/ThemeContext'
import PageTransition from './PageTransition'
import {
  FiHome,
  FiTrendingDown,
  FiTrendingUp,
  FiTarget,
  FiUsers,
  FiBell,
  FiShoppingCart,
  FiPieChart,
  FiMoreHorizontal,
  FiChevronDown,
  FiAward,
  FiFileText,
  FiMenu,
  FiX,
  FiLogOut,
  FiBarChart2,
  FiSun,
  FiMoon,
  FiUser,
  FiType,
  FiCpu,
  FiImage
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
import { profileService } from '../services/api'
import LogoLoader from './LogoLoader'
// Lazy load Chatbot - it's not critical for initial render
const Chatbot = lazy(() => import('./Chatbot'))
import BottomNavigation from './BottomNavigation'
import AccessibilitySettings from './AccessibilitySettings'
import './Layout.css'

/**
 * Layout Component
 * Provides consistent navigation and structure for all pages
 * Mobile-first approach with responsive navigation
 */
function Layout() {
  const { t } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [avatarError, setAvatarError] = useState(false)

  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState(false)
  const moreMenuRef = useRef(null)
  const userMenuRef = useRef(null)

  // Primary navigation items (always visible on desktop)
  const mainNavItems = [
    { path: '/dashboard', icon: FiHome, label: t('navigation.dashboard') },
    { path: '/expenses', icon: FiTrendingDown, label: t('navigation.expenses') },
    { path: '/income', icon: FiTrendingUp, label: t('navigation.income') },
    { path: '/budgets', icon: FiTarget, label: t('navigation.budgets') },
    { path: '/recurring-bills', icon: FiBell, label: t('navigation.recurringBills') },
    { path: '/shopping-lists', icon: FiShoppingCart, label: t('navigation.shoppingLists') },
    { path: '/loans', icon: EuroIcon, label: t('navigation.loans') },
  ]

  // Secondary navigation items (inside "More" dropdown on desktop)
  const moreNavItems = [
    { path: '/analytics', icon: FiBarChart2, label: t('navigation.analytics') },
    { path: '/partnership', icon: FiUsers, label: t('navigation.partnership') },
    { path: '/savings-goals', icon: FiPieChart, label: t('navigation.savingsGoals') },
    { path: '/receipts', icon: FiImage, label: t('navigation.receipts', 'Receipts') },
    { path: '/achievements', icon: FiAward, label: t('navigation.achievements') },
  ]


  // All navigation items (for mobile menu)


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

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setMoreMenuOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleMoreMenu = useCallback(() => {
    setMoreMenuOpen(prev => !prev)
  }, [])

  // Fetch user profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await profileService.getMyProfile()
        // Check both casing formats (snake_case and camelCase)
        const url = profile.avatar_url || profile.avatarUrl || profile.AvatarUrl
        if (profile && url) {
          setAvatarUrl(url)
          setAvatarError(false)
        }
      } catch (error) {
        console.error('Error fetching profile for layout:', error)
      }
    }

    // Only fetch if authenticated
    if (authService.isAuthenticated()) {
      fetchProfile()
    }
  }, [])

  const toggleUserMenu = useCallback(() => {
    setUserMenuOpen(prev => !prev)
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
    setUserMenuOpen(false)
  }, [navigate, closeMobileMenu])

  return (
    <div className="layout">
      {/* Header */}
      <header className="layout-header">
        <div className="header-content">
          <div className="header-left">
            <div
              className="header-brand"
              onClick={() => navigate('/dashboard')}
              style={{ cursor: 'pointer' }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  navigate('/dashboard')
                }
              }}
            >
              <img
                src={`${import.meta.env.BASE_URL}paire-logo.svg`}
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

            {/* Economic News - desktop only (Quick Tools) */}
            <span
              className="header-icon-btn news-button desktop-only"
              onClick={() => handleNavigation('/economic-news')}
              aria-label={t('navigation.economicNews')}
              title={t('navigation.economicNews')}
              role="button"
              tabIndex={0}
            >
              <FiFileText size={22} />
            </span>

            {/* Currency Calculator - desktop only (Quick Tools) - New Icon */}
            <span
              className="header-icon-btn desktop-only"
              onClick={() => handleNavigation('/currency-calculator')}
              aria-label={t('navigation.currencyCalculator')}
              title={t('navigation.currencyCalculator')}
              role="button"
              tabIndex={0}
            >
              <FiCpu size={22} />
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

            {/* User Dropdown - Desktop Only */}
            <div className="user-menu desktop-only" ref={userMenuRef}>
              <span
                className={`user-menu-btn ${userMenuOpen ? 'active' : ''}`}
                onClick={toggleUserMenu}
                aria-label={t('navigation.profile')}
                title={t('navigation.profile')}
                role="button"
                tabIndex={0}
              >
                {avatarUrl && !avatarError ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="user-avatar"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <FiUser size={22} />
                )}
              </span>

              {userMenuOpen && (
                <div className="user-menu-dropdown">
                  <button className="menu-item" onClick={handleProfileNavigation}>
                    <FiUser size={18} />
                    <span>{t('navigation.profile')}</span>
                  </button>

                  <div className="menu-divider"></div>

                  <button className="menu-item" onClick={() => {
                    toggleTheme()
                    // Close menu not strictly required but cleaner
                  }}>
                    {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
                    <span>{theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}</span>
                  </button>

                  <button className="menu-item" onClick={() => {
                    setIsAccessibilityOpen(true)
                    setUserMenuOpen(false)
                  }}>
                    <FiType size={18} />
                    <span>{t('common.accessibility') || 'Accessibility'}</span>
                  </button>

                  <div className="menu-divider"></div>

                  <button className="menu-item logout" onClick={handleLogout}>
                    <FiLogOut size={18} />
                    <span>{t('auth.logout')}</span>
                  </button>
                </div>
              )}
            </div>

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
              to="/currency-calculator"
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
              onClick={closeMobileMenu}
            >
              <FiCpu style={{ width: '20px', height: '20px' }} className="nav-icon" />
              <span className="nav-label">{t('navigation.currencyCalculator')}</span>
            </NavLink>
          </li>
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


          {/* Mobile Theme Toggle */}
          <li className="mobile-only">
            <button
              className="nav-link"
              onClick={() => {
                toggleTheme()
                // Don't close menu, user might want to toggle back
              }}
            >
              {theme === 'dark' ? (
                <FiSun style={{ width: '20px', height: '20px' }} className="nav-icon" />
              ) : (
                <FiMoon style={{ width: '20px', height: '20px' }} className="nav-icon" />
              )}
              <span className="nav-label">
                {theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
              </span>
            </button>
          </li>

          <li className="mobile-only">
            <button
              className="nav-link"
              onClick={() => {
                setIsAccessibilityOpen(true)
                closeMobileMenu()
              }}
            >
              <FiType style={{ width: '20px', height: '20px' }} className="nav-icon" />
              <span className="nav-label">{t('common.accessibility')}</span>
            </button>
          </li>

          {/* Mobile Profile & Logout Section */}
          <li className="mobile-section-divider mobile-only"></li>

          <li className="mobile-only">
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
              onClick={closeMobileMenu}
            >
              {avatarUrl && !avatarError ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="user-avatar-mobile"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <FiUser style={{ width: '20px', height: '20px' }} className="nav-icon" />
              )}
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
      {
        mobileMenuOpen && (
          <div
            className="mobile-overlay"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
        )
      }

      {/* Floating Chatbot - Available on all pages - Lazy loaded */}
      <Suspense fallback={null}>
        <Chatbot />
      </Suspense>

      {/* Mobile Bottom Navigation */}
      <BottomNavigation />

      {/* Accessibility Settings Modal */}
      <AccessibilitySettings
        isOpen={isAccessibilityOpen}
        onClose={() => setIsAccessibilityOpen(false)}
      />
    </div >
  )
}

export default Layout

