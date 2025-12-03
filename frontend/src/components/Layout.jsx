import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  FiHome, 
  FiTrendingDown, 
  FiTrendingUp, 
  FiDollarSign, 
  FiUser, 
  FiMenu, 
  FiX,
  FiLogOut 
} from 'react-icons/fi'
import { authService } from '../services/supabase'
import './Layout.css'

/**
 * Layout Component
 * Provides consistent navigation and structure for all pages
 */
function Layout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Navigation items configuration
  const navItems = [
    { path: '/dashboard', icon: FiHome, label: t('navigation.dashboard') },
    { path: '/expenses', icon: FiTrendingDown, label: t('navigation.expenses') },
    { path: '/income', icon: FiTrendingUp, label: t('navigation.income') },
    { path: '/loans', icon: FiDollarSign, label: t('navigation.loans') },
    { path: '/profile', icon: FiUser, label: t('navigation.profile') },
  ]

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

  // Close mobile menu when navigation link is clicked
  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
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
          
          {/* Mobile menu toggle */}
          <button 
            className="mobile-menu-toggle"
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>

          {/* Desktop logout button */}
          <button 
            className="logout-btn desktop-only"
            onClick={handleLogout}
            aria-label="Logout"
          >
            <FiLogOut size={20} />
            <span>{t('auth.logout')}</span>
          </button>
        </div>
      </header>

      {/* Navigation */}
      <nav className={`layout-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <ul className="nav-list">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) => 
                  `nav-link ${isActive ? 'active' : ''}`
                }
                onClick={closeMobileMenu}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
          
          {/* Mobile logout button */}
          <li className="mobile-only">
            <button 
              className="nav-link logout-mobile"
              onClick={handleLogout}
            >
              <FiLogOut size={20} />
              <span>{t('auth.logout')}</span>
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
    </div>
  )
}

export default Layout

