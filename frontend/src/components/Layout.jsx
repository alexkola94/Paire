import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  FiHome, 
  FiTrendingDown, 
  FiTrendingUp, 
  FiDollarSign, 
  FiUser, 
  FiMenu, 
  FiX,
  FiLogOut,
  FiBarChart2,
  FiTarget,
  FiUsers,
  FiBell,
  FiSettings,
  FiShoppingCart,
  FiPieChart,
  FiMoreHorizontal,
  FiChevronDown
} from 'react-icons/fi'
import { authService } from '../services/supabase'
import Chatbot from './Chatbot'
import './Layout.css'

/**
 * Layout Component
 * Provides consistent navigation and structure for all pages
 * Mobile-first approach with responsive navigation
 */
function Layout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const userMenuRef = useRef(null)
  const moreMenuRef = useRef(null)

  // Primary navigation items (always visible on desktop)
  const mainNavItems = [
    { path: '/dashboard', icon: FiHome, label: t('navigation.dashboard') },
    { path: '/analytics', icon: FiBarChart2, label: t('navigation.analytics') },
    { path: '/expenses', icon: FiTrendingDown, label: t('navigation.expenses') },
    { path: '/income', icon: FiTrendingUp, label: t('navigation.income') },
    { path: '/budgets', icon: FiTarget, label: t('navigation.budgets') },
    { path: '/partnership', icon: FiUsers, label: t('navigation.partnership') },
  ]

  // Secondary navigation items (inside "More" dropdown on desktop)
  const moreNavItems = [
    { path: '/loans', icon: FiDollarSign, label: t('navigation.loans') },
    { path: '/savings-goals', icon: FiPieChart, label: t('navigation.savingsGoals') },
    { path: '/recurring-bills', icon: FiBell, label: t('navigation.recurringBills') },
    { path: '/shopping-lists', icon: FiShoppingCart, label: t('navigation.shoppingLists') },
  ]

  // All navigation items (for mobile menu)
  const allNavItems = [...mainNavItems, ...moreNavItems]

  // Handle logout
  const handleLogout = async () => {
    try {
      await authService.signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  // Toggle user menu
  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen)
  }

  // Close mobile menu when navigation link is clicked
  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  // Close user menu and more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false)
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setMoreMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Toggle more menu
  const toggleMoreMenu = () => {
    setMoreMenuOpen(!moreMenuOpen)
  }

  // Handle more menu navigation
  const handleMoreNavigation = (path) => {
    navigate(path)
    setMoreMenuOpen(false)
    closeMobileMenu()
  }

  // Navigate to profile or reminders
  const handleNavigation = (path) => {
    navigate(path)
    setUserMenuOpen(false)
    closeMobileMenu()
  }

  return (
    <div className="layout">
      {/* Header */}
      <header className="layout-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="app-title">{t('app.title')}</h1>
            <p className="app-tagline">{t('app.tagline')}</p>
          </div>
          
          {/* Header actions - right side */}
          <div className="header-actions">
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

            {/* User menu - desktop only */}
            <div className="user-menu desktop-only" ref={userMenuRef}>
              <span 
                className="user-menu-btn"
                onClick={toggleUserMenu}
                aria-label="User menu"
                role="button"
                tabIndex={0}
              >
                <FiUser size={22} />
              </span>
              
              {userMenuOpen && (
                <div className="user-menu-dropdown">
                  <button 
                    className="menu-item"
                    onClick={() => handleNavigation('/profile')}
                  >
                    <FiSettings style={{ width: '18px', height: '18px' }} />
                    <span>{t('navigation.profile')}</span>
                  </button>
                  <button 
                    className="menu-item"
                    onClick={() => handleNavigation('/reminders')}
                  >
                    <FiBell style={{ width: '18px', height: '18px' }} />
                    <span>{t('navigation.reminders')}</span>
                  </button>
                  <div className="menu-divider"></div>
                  <button 
                    className="menu-item logout"
                    onClick={handleLogout}
                  >
                    <FiLogOut style={{ width: '18px', height: '18px' }} />
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
        <Outlet />
      </main>

      {/* Overlay for mobile menu */}
      {mobileMenuOpen && (
        <div 
          className="mobile-overlay"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Floating Chatbot - Available on all pages */}
      <Chatbot />
    </div>
  )
}

export default Layout

