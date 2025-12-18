import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, useRef, Suspense } from 'react'
import { lazyWithRetry } from './utils/lazyWithRetry'
import { authService } from './services/auth'
import { sessionManager } from './services/sessionManager'
import { isTokenExpired } from './utils/tokenUtils'
import { ThemeProvider } from './context/ThemeContext'
import { AccessibilityProvider } from './context/AccessibilityContext'
import LogoLoader from './components/LogoLoader'
import { ToastProvider } from './components/Toast'

// Lazy load pages for code splitting and faster initial load
// Only load components when they're actually needed
const Login = lazyWithRetry(() => import('./pages/Login'))
const ForgotPassword = lazyWithRetry(() => import('./pages/ForgotPassword'))
const EmailConfirmation = lazyWithRetry(() => import('./pages/EmailConfirmation'))
const ResetPassword = lazyWithRetry(() => import('./pages/ResetPassword'))
const AcceptInvitation = lazyWithRetry(() => import('./pages/AcceptInvitation'))
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'))
const Expenses = lazyWithRetry(() => import('./pages/Expenses'))
const Income = lazyWithRetry(() => import('./pages/Income'))
const AllTransactions = lazyWithRetry(() => import('./pages/AllTransactions'))
const Loans = lazyWithRetry(() => import('./pages/Loans'))
const Profile = lazyWithRetry(() => import('./pages/Profile'))
const Analytics = lazyWithRetry(() => import('./pages/Analytics'))
const Partnership = lazyWithRetry(() => import('./pages/Partnership'))
const Budgets = lazyWithRetry(() => import('./pages/Budgets'))
const ReminderSettings = lazyWithRetry(() => import('./pages/ReminderSettings'))
const SavingsGoals = lazyWithRetry(() => import('./pages/SavingsGoals'))
const Receipts = lazyWithRetry(() => import('./pages/Receipts'))
const RecurringBills = lazyWithRetry(() => import('./pages/RecurringBills'))
const ShoppingLists = lazyWithRetry(() => import('./pages/ShoppingLists'))
const EconomicNews = lazyWithRetry(() => import('./pages/EconomicNews'))
const BankCallback = lazyWithRetry(() => import('./pages/BankCallback'))
const Achievements = lazyWithRetry(() => import('./pages/Achievements'))
const CurrencyCalculator = lazyWithRetry(() => import('./pages/CurrencyCalculator'))
const PrivacyPolicy = lazyWithRetry(() => import('./pages/PrivacyPolicy'))


// Layout - Keep synchronous as it's always needed
import Layout from './components/Layout'
import CookieConsent from './components/CookieConsent'

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
  // Refs to prevent multiple redirects and track session state
  const redirectingRef = useRef(false)
  const sessionRef = useRef(session)

  // Keep sessionRef in sync with session state
  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    // Check for existing session on mount
    // Note: New tabs will not have a session (sessionStorage is per-tab)
    // This ensures users must log in again in new tabs
    const checkSession = async () => {
      try {
        const session = await authService.getSession()
        setSession(session)
        sessionRef.current = session
      } catch (error) {
        console.error('Session check error:', error)
        setSession(null)
        sessionRef.current = null
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Periodic token expiration checker
    // Check token expiration every 5 minutes
    const tokenExpirationChecker = setInterval(() => {
      const token = sessionManager.getToken()
      if (token && isTokenExpired(token)) {
        console.warn('Token expired detected by periodic checker')
        sessionManager.clearSession(false) // Don't broadcast - this is automatic expiration
        window.dispatchEvent(new CustomEvent('session-invalidated', {
          detail: { reason: 'Session expired' }
        }))
      }
    }, 5 * 60 * 1000) // Check every 5 minutes (300000 milliseconds)

    // Listen for session invalidation events (cross-tab logout, same user login in another tab, expiration)
    const handleSessionInvalidated = (e) => {
      // Prevent multiple calls - check if already redirecting
      if (redirectingRef.current) {
        return
      }

      // Only handle if we actually had a session
      if (!sessionRef.current) {
        return
      }

      redirectingRef.current = true
      console.log('Session invalidated:', e.detail?.reason)
      setSession(null)
      sessionRef.current = null

      // Redirect to login if not already there
      const currentPath = window.location.pathname
      const basename = import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL
      const loginPath = `${basename}/login`

      if (currentPath !== loginPath && !currentPath.endsWith('/login')) {
        // Use replace to prevent back button issues and stop the loop
        window.location.replace(loginPath)
      } else {
        // Already on login page, just reset flag after a delay
        setTimeout(() => {
          redirectingRef.current = false
        }, 1000)
      }
    }

    // Listen for session changes in the same tab
    const handleSessionChange = async () => {
      try {
        // Small delay to ensure sessionStorage is written
        await new Promise(resolve => setTimeout(resolve, 50))
        const session = await authService.getSession()
        setSession(session)
        sessionRef.current = session
      } catch (error) {
        console.error('Session refresh error:', error)
        setSession(null)
        sessionRef.current = null
      }
    }

    window.addEventListener('session-invalidated', handleSessionInvalidated)
    window.addEventListener('auth-storage-change', handleSessionChange)

    return () => {
      window.removeEventListener('session-invalidated', handleSessionInvalidated)
      window.removeEventListener('auth-storage-change', handleSessionChange)
      clearInterval(tokenExpirationChecker)
    }
  }, []) // Empty dependencies - only run once on mount

  if (loading) {
    return <LogoLoader size="large" fullScreen />
  }
  // Loading fallback component for Suspense
  const LoadingFallback = () => (
    <LogoLoader size="large" fullScreen />
  )

  return (
    <ThemeProvider>
      <AccessibilityProvider>
        <ToastProvider>
          <Router basename={import.meta.env.BASE_URL}>
            {/* Handle GitHub Pages redirects */}
            <RedirectHandler />
            <CookieConsent />

            <Suspense fallback={<LoadingFallback />}>
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
                <Route
                  path="/bank-callback"
                  element={<BankCallback />}
                />
                <Route
                  path="/privacy"
                  element={<PrivacyPolicy />}
                />

                {/* Protected routes - Require authentication */}
                {/* Check both session state and sessionStorage to avoid race conditions after login */}
                <Route
                  path="/"
                  element={
                    (() => {
                      // Check session state first
                      if (session) return <Layout />
                      // Fallback: check sessionStorage directly (for race condition after login)
                      const token = sessionManager.getToken()
                      const user = sessionManager.getCurrentUser()
                      if (token && user) {
                        // Session exists in storage but state hasn't updated yet
                        // Trigger state update and allow access
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent('auth-storage-change'))
                        }, 0)
                        return <Layout />
                      }
                      return <Navigate to="/login" />
                    })()
                  }
                >
                  <Route index element={<Navigate to="/dashboard" />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="expenses" element={<Expenses />} />
                  <Route path="income" element={<Income />} />
                  <Route path="transactions" element={<AllTransactions />} />
                  <Route path="loans" element={<Loans />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="budgets" element={<Budgets />} />
                  <Route path="savings-goals" element={<SavingsGoals />} />
                  <Route path="receipts" element={<Receipts />} />
                  <Route path="recurring-bills" element={<RecurringBills />} />
                  <Route path="shopping-lists" element={<ShoppingLists />} />
                  <Route path="economic-news" element={<EconomicNews />} />
                  <Route path="achievements" element={<Achievements />} />
                  <Route path="partnership" element={<Partnership />} />
                  <Route path="reminders" element={<ReminderSettings />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="currency-calculator" element={<CurrencyCalculator />} />
                </Route>

                {/* Catch all - redirect to login or dashboard */}
                <Route
                  path="*"
                  element={<Navigate to={session ? "/dashboard" : "/login"} />}
                />
              </Routes>
            </Suspense>
          </Router>
        </ToastProvider>
      </AccessibilityProvider>
    </ThemeProvider>
  )
}

export default App
