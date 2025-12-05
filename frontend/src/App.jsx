import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { authService } from './services/auth'

// Pages
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import EmailConfirmation from './pages/EmailConfirmation'
import ResetPassword from './pages/ResetPassword'
import AcceptInvitation from './pages/AcceptInvitation'
import Dashboard from './pages/Dashboard'
import Expenses from './pages/Expenses'
import Income from './pages/Income'
import Loans from './pages/Loans'
import Profile from './pages/Profile'
import Analytics from './pages/Analytics'
import Partnership from './pages/Partnership'
import Budgets from './pages/Budgets'
import ReminderSettings from './pages/ReminderSettings'
import SavingsGoals from './pages/SavingsGoals'
import RecurringBills from './pages/RecurringBills'
import ShoppingLists from './pages/ShoppingLists'

// Layout
import Layout from './components/Layout'

/**
 * GitHub Pages Redirect Handler Component
 * Handles redirects from 404.html for SPA routing
 * Note: We don't automatically process redirect query params here
 * to avoid interfering with normal navigation. Individual pages handle their own redirects.
 */
function RedirectHandler() {
  // This component is kept for potential future use with GitHub Pages 404.html
  // but doesn't automatically redirect to prevent conflicts with normal navigation
  return null
}

/**
 * Main Application Component
 * Handles routing and authentication state
 */
function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session on mount
    const checkSession = async () => {
      try {
        const session = await authService.getSession()
        setSession(session)
      } catch (error) {
        console.error('Session check error:', error)
        setSession(null)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Listen for storage changes (logout in another tab, or login in same tab)
    const handleStorageChange = async (e) => {
      // Handle both StorageEvent (cross-tab) and CustomEvent (same-tab)
      const key = e.key || e.detail?.key
      const newValue = e.newValue || e.detail?.newValue
      
      if (key === 'auth_token') {
        if (!newValue) {
          // Token removed - logout
          setSession(null)
        } else {
          // Token added or updated - refresh session
          try {
            const session = await authService.getSession()
            setSession(session)
          } catch (error) {
            console.error('Session refresh error:', error)
            setSession(null)
          }
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    // Also listen for custom storage events (for same-tab updates)
    window.addEventListener('auth-storage-change', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('auth-storage-change', handleStorageChange)
    }
  }, [])

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  // Use basename only in production (GitHub Pages)
  const basename = import.meta.env.MODE === 'production' ? '/Paire' : ''

  return (
    <Router basename={basename}>
      {/* Handle GitHub Pages redirects */}
      <RedirectHandler />
      
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={!session ? <Login /> : <Navigate to="/dashboard" />}
        />
        <Route
          path="/forgot-password"
          element={!session ? <ForgotPassword /> : <Navigate to="/dashboard" />}
        />
        <Route
          path="/confirm-email"
          element={<EmailConfirmation />}
        />
        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />
        <Route
          path="/accept-invitation"
          element={<AcceptInvitation />}
        />

        {/* Protected routes - Require authentication */}
        <Route
          path="/"
          element={session ? <Layout /> : <Navigate to="/login" />}
        >
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="income" element={<Income />} />
          <Route path="loans" element={<Loans />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="budgets" element={<Budgets />} />
          <Route path="savings-goals" element={<SavingsGoals />} />
          <Route path="recurring-bills" element={<RecurringBills />} />
          <Route path="shopping-lists" element={<ShoppingLists />} />
          <Route path="partnership" element={<Partnership />} />
          <Route path="reminders" element={<ReminderSettings />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Catch all - redirect to login or dashboard */}
        <Route
          path="*"
          element={<Navigate to={session ? "/dashboard" : "/login"} />}
        />
      </Routes>
    </Router>
  )
}

export default App

