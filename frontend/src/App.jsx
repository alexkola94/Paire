import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './services/supabase'

// Pages
import Login from './pages/Login'
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
 * Main Application Component
 * Handles routing and authentication state
 */
function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        {/* Public route - Login */}
        <Route
          path="/login"
          element={!session ? <Login /> : <Navigate to="/dashboard" />}
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

